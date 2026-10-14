#!/usr/bin/env node

/**
 * generate.test.mjs — unit tests for scripts/generate.mjs using mocked fetch.
 * Run: node tests/generate.test.mjs
 * No API key, network, or ffmpeg needed for the API-mock tests; MP3 tests use
 * the system ffmpeg if present and are skipped otherwise.
 */

import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const here = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(here, "..");
const scriptPath = path.join(ROOT, "scripts/generate.mjs");
const preloadPath = path.join(ROOT, "tests", "mock-fetch.cjs");

process.env.GEMINI_API_KEY = "test-key-123";

const mod = await import(scriptPath);
const {
  parseArgs,
  readInput,
  buildBody,
  extractAudio,
  computeBackoffMs,
  parseRetryAfter,
  toMp3,
  writeWavAtomic,
  findFfmpeg,
  setFfmpegResolverForTesting,
  resolveFormat,
  defaultOutPathForFormat,
  main,
} = mod;

let passed = 0,
  failed = 0,
  skipped = 0;
const SKIP_SENTINEL = Symbol("skip");

async function test(name, fn) {
  try {
    const r = await fn();
    if (r === SKIP_SENTINEL) {
      skipped++;
      console.log(`skip ${name}`);
      return;
    }
    passed++;
    console.log(`ok   ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${name}: ${e.message}`);
  }
}

function skipTest(why) {
  console.log(`skip reason: ${why}`);
  return SKIP_SENTINEL;
}

// ---------- Helpers ----------

function tmpDir(prefix) {
  return fs.mkdtempSync(path.join(ROOT, "tests", `_${prefix}-`));
}

function rmRf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Run the CLI in a real child process with the mock-fetch preload installed.
 * `env` and `stdinData` are optional. Returns { code, stdout, stderr, apiCalls }.
 */
function runCliWithMock(args, { env = {}, stdinData = null, mode = "ok" } = {}) {
  return new Promise((resolve) => {
    const logPath = path.join(ROOT, "tests", `_mocklog-${process.pid}-${Date.now()}.json`);
    const child = spawn("node", ["--require", preloadPath, scriptPath, ...args], {
      env: {
        ...process.env,
        ...env,
        MOCK_TTS_MODE: mode,
        MOCK_TTS_LOG: logPath,
      },
      stdio: stdinData === null ? "inherit" : ["pipe", "inherit", "inherit"],
    });
    if (stdinData !== null) {
      child.stdin.write(stdinData);
      child.stdin.end();
    }
    child.on("exit", (code) => {
      let apiCalls = [];
      try {
        apiCalls = JSON.parse(fs.readFileSync(logPath, "utf8"));
      } catch {
        /* no log */
      }
      fs.rmSync(logPath, { force: true });
      resolve({ code, apiCalls });
    });
  });
}

/**
 * Build a proper WAV: RIFF/WAVE, fmt chunk (PCM, mono, 16-bit, given rate),
 * data chunk with correct byte count at offset 40.
 */
function makeWavBytes(seconds = 1, sampleRate = 24000) {
  const numSamples = Math.round(sampleRate * seconds);
  const dataLen = numSamples * 2; // mono, 16-bit
  const buf = Buffer.alloc(44 + dataLen);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + dataLen, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(dataLen, 40); // correct data chunk size at offset 40
  for (let i = 0; i < numSamples; i++) {
    buf.writeInt16LE(Math.floor(Math.sin((i / sampleRate) * 2 * Math.PI * 440) * 8000), 44 + i * 2);
  }
  return buf;
}

function makeAudioResponse(wavBytes) {
  return {
    steps: [
      {
        type: "model_output",
        content: [
          { type: "text", text: "(assistant turn)" },
          { type: "audio", data: wavBytes.toString("base64") },
        ],
      },
    ],
  };
}

// ---------- Argument parsing ----------

await test("parseArgs: defaults", () => {
  const o = parseArgs(["node", "x"]);
  assert.equal(o.model, "gemini-3.8-flash-tts");
  assert.equal(o.voice, "Kore");
  assert.equal(o.format, "wav");
  assert.equal(o.maxRetries, 4);
  assert.equal(o.timeoutMs, 60000);
  assert.equal(o._formatExplicit, undefined);
  assert.equal(o._outExplicit, undefined);
});

await test("parseArgs: unknown flag throws", async () => {
  await assert.rejects(async () => parseArgs(["node", "x", "--bogus"]), /Unknown argument/);
});

await test("parseArgs: flag missing value throws", async () => {
  await assert.rejects(async () => parseArgs(["node", "x", "--voice"]), /requires a value/);
});

await test("parseArgs: --timeout-ms rejects non-positive", async () => {
  await assert.rejects(
    async () => parseArgs(["node", "x", "--timeout-ms", "0"]),
    /positive integer/,
  );
  await assert.rejects(
    async () => parseArgs(["node", "x", "--timeout-ms", "abc"]),
    /positive integer/,
  );
  await assert.rejects(
    async () => parseArgs(["node", "x", "--timeout-ms", "1.5"]),
    /positive integer/,
  );
});

await test("parseArgs: --max-retries rejects negative", async () => {
  await assert.rejects(
    async () => parseArgs(["node", "x", "--max-retries", "-1"]),
    /nonnegative integer/,
  );
  await assert.rejects(
    async () => parseArgs(["node", "x", "--max-retries", "x"]),
    /nonnegative integer/,
  );
});

await test("parseArgs: tracks explicit --format and --out", () => {
  const o = parseArgs(["node", "x", "--format", "mp3", "--out", "a.wav"]);
  assert.equal(o._formatExplicit, true);
  assert.equal(o._outExplicit, true);
});

// ---------- Input handling ----------

await test("readInput: no source throws", async () => {
  await assert.rejects(async () => readInput(parseArgs(["node", "x"])), /Provide text/);
});

await test("readInput: conflicting sources throw", async () => {
  const o = parseArgs(["node", "x", "--text", "hi", "--stdin"]);
  await assert.rejects(async () => readInput(o), /Conflicting/);
});

await test("readInput: empty text throws", async () => {
  const o = parseArgs(["node", "x", "--text", "   "]);
  await assert.rejects(async () => readInput(o), /empty/);
});

await test("readInput: oversize text rejected locally", async () => {
  const o = parseArgs(["node", "x", "--text", "a".repeat(20001)]);
  await assert.rejects(async () => readInput(o), /characters/);
});

await test("readInput: reads from file", async () => {
  const tmp = path.join(ROOT, "tests", "_tmp-input.txt");
  fs.writeFileSync(tmp, "hello from file");
  const o = parseArgs(["node", "x", "--input", tmp]);
  const t = readInput(o);
  assert.equal(t, "hello from file");
  fs.rmSync(tmp);
});

// ---------- Request body ----------

await test("buildBody: defaults", () => {
  const b = buildBody(parseArgs(["node", "x"]), "hi there");
  assert.equal(b.model, "gemini-3.8-flash-tts");
  assert.equal(b.input[0].content[0].text, "hi there");
  assert.deepEqual(b.response_format, { type: "audio" });
  assert.equal(b.generation_config.speech_config[0].voice, "Kore");
  assert.equal(b.input[0].content[0].annotations, undefined);
});

await test("buildBody: style annotation", () => {
  const b = buildBody(parseArgs(["node", "x", "--style", "cheerful"]), "hi");
  assert.deepEqual(b.input[0].content[0].annotations, [
    { type: "speech_metadata", style: "cheerful" },
  ]);
});

// ---------- Response parsing ----------

await test("extractAudio: returns WAV bytes for valid response", () => {
  const wav = makeWavBytes(0.1);
  const bytes = extractAudio(makeAudioResponse(wav));
  assert.equal(bytes.length, wav.length);
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  assert.equal(bytes.readUInt32LE(40), wav.length - 44); // data chunk size correct
});

await test("extractAudio: rejects missing steps", async () => {
  await assert.rejects(async () => extractAudio({}), /missing steps/);
});

await test("extractAudio: rejects no audio content", async () => {
  await assert.rejects(
    async () =>
      extractAudio({
        steps: [{ type: "model_output", content: [{ type: "text", text: "no audio" }] }],
      }),
    /no audio data/,
  );
});

await test("extractAudio: rejects non-RIFF bytes", async () => {
  const fake = Buffer.alloc(100, 65); // 100 'A's — no RIFF/WAVE signature
  await assert.rejects(async () => extractAudio(makeAudioResponse(fake)), /not RIFF\/WAVE/);
});

await test("extractAudio: rejects too-small audio", async () => {
  const tiny = Buffer.alloc(10);
  await assert.rejects(async () => extractAudio(makeAudioResponse(tiny)), /too small/);
});

await test("extractAudio: rejects WAV missing data chunk", async () => {
  // RIFF/WAVE present, fmt present, but no data chunk at 36.
  const buf = Buffer.alloc(100);
  buf.write("RIFF", 0, "ascii");
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  await assert.rejects(async () => extractAudio(makeAudioResponse(buf)), /missing fmt or data/);
});

// ---------- Backoff ----------

await test("computeBackoffMs: honors Retry-After header", () => {
  const ms = computeBackoffMs(0, "5", 429);
  assert.equal(ms, 5000);
});

await test("computeBackoffMs: grows with attempt and is capped near 30s", () => {
  const a0 = computeBackoffMs(0, null, 429);
  const a3 = computeBackoffMs(3, null, 429);
  const a10 = computeBackoffMs(10, null, 429);
  assert.ok(a0 >= 1000 && a0 < 1300, `a0=${a0}`);
  assert.ok(a3 >= 8000 && a3 < 10500, `a3=${a3}`);
  assert.ok(a10 >= 30000 && a10 <= 37500, `a10=${a10}`); // exp cap 30s + up to 25% jitter
});

await test("computeBackoffMs: never exceeds 37.5s", () => {
  for (let i = 0; i < 20; i++) {
    const ms = computeBackoffMs(i, null, 429);
    assert.ok(ms <= 37500, `attempt ${i}: ${ms}`);
  }
});

await test("computeBackoffMs: an honored Retry-After can exceed the fallback cap", () => {
  const ms = computeBackoffMs(0, "120", 429); // server says wait 2 minutes
  assert.equal(ms, 120000);
});

await test("parseRetryAfter: numeric seconds and HTTP dates", () => {
  assert.equal(parseRetryAfter("5"), 5);
  assert.equal(parseRetryAfter("2.5"), 2.5);
  const future = new Date(Date.now() + 60000).toUTCString();
  const s = parseRetryAfter(future);
  assert.ok(s !== null && s > 50 && s < 70, `parsed date as ${s}s`);
  const past = new Date(Date.now() - 60000).toUTCString();
  assert.equal(parseRetryAfter(past), 0);
  assert.equal(parseRetryAfter("garbage"), null);
});

// ---------- Format resolution ----------

await test("resolveFormat: invalid --format rejected", async () => {
  await assert.rejects(
    async () => resolveFormat(parseArgs(["node", "x", "--format", "bogus"])),
    /--format must be one of/,
  );
});

await test("resolveFormat: explicit flag with mismatched explicit out is a conflict", async () => {
  const o = parseArgs(["node", "x", "--format", "mp3", "--out", "a.wav"]);
  await assert.rejects(async () => resolveFormat(o), /Conflict/);
});

await test("resolveFormat: explicit flag wins over default out extension", () => {
  // Default out is speech.wav, but --out was not explicitly passed.
  const o = parseArgs(["node", "x", "--format", "mp3"]);
  assert.equal(resolveFormat(o), "mp3");
});

await test("resolveFormat: extension fills in when flag omitted", () => {
  const o = parseArgs(["node", "x", "--out", "a.mp3"]);
  assert.equal(resolveFormat(o), "mp3");
});

await test("resolveFormat: no extension, no flag → wav default", () => {
  const o = parseArgs(["node", "x", "--out", "a.txt"]);
  assert.equal(resolveFormat(o), "wav");
});

await test("defaultOutPathForFormat: rewrites extension", () => {
  assert.equal(defaultOutPathForFormat("/tmp/speech.wav", "mp3"), "/tmp/speech.mp3");
  assert.equal(defaultOutPathForFormat("/tmp/foo", "mp3"), "/tmp/foo.mp3");
});

// ---------- End-to-end with mocked fetch (in-process) ----------

const realFetch = globalThis.fetch;
function withFetch(mock) {
  globalThis.fetch = mock;
}
function restoreFetch() {
  globalThis.fetch = realFetch;
}

await test("e2e (callApi): returns WAV bytes on 200", async () => {
  const wav = makeWavBytes(0.5);
  const calls = [];
  withFetch(async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(makeAudioResponse(wav)), { status: 200 });
  });
  try {
    const opts = parseArgs(["node", "x", "--text", "hi"]);
    const bytes = await mod.callApi(opts, "hi");
    assert.equal(bytes.length, wav.length);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init.headers["x-goog-api-key"], "test-key-123");
    assert.ok(calls[0].init.body.includes('"response_format"'));
  } finally {
    restoreFetch();
  }
});

await test("e2e (callApi): retries 429 then succeeds", async () => {
  const wav = makeWavBytes(0.1);
  let n = 0;
  withFetch(async () => {
    n++;
    if (n === 1) {
      return new Response(
        JSON.stringify({
          error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Rate limit" },
        }),
        { status: 429, headers: { "retry-after": "0.01" } },
      );
    }
    return new Response(JSON.stringify(makeAudioResponse(wav)), { status: 200 });
  });
  try {
    const opts = parseArgs(["node", "x", "--text", "hi"]);
    const bytes = await mod.callApi(opts, "hi");
    assert.equal(n, 2);
    assert.equal(bytes.length, wav.length);
  } finally {
    restoreFetch();
  }
});

await test("e2e (callApi): exhausts retries on persistent 429 (initial + max_retries)", async () => {
  let n = 0;
  withFetch(async () => {
    n++;
    return new Response(JSON.stringify({ error: { code: 429, status: "RESOURCE_EXHAUSTED" } }), {
      status: 429,
      headers: { "retry-after": "0.01" },
    });
  });
  try {
    const opts = parseArgs(["node", "x", "--text", "hi", "--max-retries", "2"]);
    await assert.rejects(async () => mod.callApi(opts, "hi"), /RESOURCE_EXHAUSTED|Rate limit/);
    assert.equal(n, 3); // 1 initial + 2 retries
  } finally {
    restoreFetch();
  }
});

await test("e2e (callApi): does not retry 403", async () => {
  let n = 0;
  withFetch(async () => {
    n++;
    return new Response(JSON.stringify({ error: { code: 403, message: "Permission denied" } }), {
      status: 403,
    });
  });
  try {
    const opts = parseArgs(["node", "x", "--text", "hi"]);
    await assert.rejects(async () => mod.callApi(opts, "hi"), /HTTP 403/);
    assert.equal(n, 1);
  } finally {
    restoreFetch();
  }
});

await test("e2e (callApi): 413 payload error is not retried", async () => {
  let n = 0;
  withFetch(async () => {
    n++;
    return new Response(JSON.stringify({ error: { code: 413 } }), { status: 413 });
  });
  try {
    const opts = parseArgs(["node", "x", "--text", "hi"]);
    await assert.rejects(async () => mod.callApi(opts, "hi"), /413|payload too large/i);
    assert.equal(n, 1);
  } finally {
    restoreFetch();
  }
});

await test("e2e (callApi): rejects malformed JSON on 200", async () => {
  withFetch(async () => new Response("not json", { status: 200 }));
  try {
    const opts = parseArgs(["node", "x", "--text", "hi"]);
    await assert.rejects(async () => mod.callApi(opts, "hi"), /Malformed JSON/);
  } finally {
    restoreFetch();
  }
});

await test("e2e (callApi): missing GEMINI_API_KEY fails fast", async () => {
  const saved = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const opts = parseArgs(["node", "x", "--text", "hi"]);
    await assert.rejects(async () => mod.callApi(opts, "hi"), /GEMINI_API_KEY is not set/);
  } finally {
    process.env.GEMINI_API_KEY = saved;
  }
});

await test("e2e (callApi): API key is redacted from error text", async () => {
  withFetch(async () => {
    return new Response(
      JSON.stringify({ error: { code: 403, message: `key test-key-123 leaked` } }),
      { status: 403 },
    );
  });
  try {
    const opts = parseArgs(["node", "x", "--text", "hi"]);
    try {
      await mod.callApi(opts, "hi");
      assert.fail("should have thrown");
    } catch (e) {
      assert.ok(!e.message.includes("test-key-123"), `key leaked: ${e.message}`);
      assert.ok(e.message.includes("[REDACTED]"));
    }
  } finally {
    restoreFetch();
  }
});

await test("e2e (callApi): local payload ceiling rejects oversized body before network", async () => {
  const opts = parseArgs(["node", "x", "--text", "x"]);
  const big = "a".repeat(1_000_000);
  await assert.rejects(async () => mod.callApi(opts, big), /safety ceiling|bytes/);
});

await test("e2e (callApi): thrown fetch error containing key is redacted", async () => {
  withFetch(async () => {
    const e = new Error(`connect failed with key test-key-123`);
    e.name = "FetchError";
    throw e;
  });
  try {
    const opts = parseArgs(["node", "x", "--text", "hi"]);
    try {
      await mod.callApi(opts, "hi");
      assert.fail("should have thrown");
    } catch (e) {
      assert.ok(!e.message.includes("test-key-123"), `key leaked: ${e.message}`);
    }
  } finally {
    restoreFetch();
  }
});

await test("e2e (callApi): malformed JSON error text is redacted of the API key", async () => {
  // Body is invalid JSON that contains the test key, so the parse error
  // message can include raw body text containing the key.
  withFetch(async () => new Response(`{"key": "test-key-123", bad json`, { status: 200 }));
  try {
    const opts = parseArgs(["node", "x", "--text", "hi"]);
    try {
      await mod.callApi(opts, "hi");
      assert.fail("should have thrown");
    } catch (e) {
      assert.ok(!e.message.includes("test-key-123"), `key leaked: ${e.message}`);
    }
  } finally {
    restoreFetch();
  }
});

// ---------- Atomic write / cleanup ----------

await test("writeWavAtomic: writes correct WAV and leaves no temp file", () => {
  const dir = tmpDir("atomic-ok");
  try {
    const wav = makeWavBytes(0.5);
    const out = path.join(dir, "out.wav");
    writeWavAtomic(wav, out);
    assert.ok(fs.existsSync(out));
    const onDisk = fs.readFileSync(out);
    assert.equal(onDisk.length, wav.length);
    assert.deepEqual(onDisk, wav);
    assert.equal(fs.readdirSync(dir).length, 1); // no temp leftovers
  } finally {
    rmRf(dir);
  }
});

await test("writeWavAtomic: cleans up partial temp file and preserves existing output on write failure", () => {
  const dir = tmpDir("atomic-write-fail");
  try {
    const out = path.join(dir, "out.wav");
    const preExisting = makeWavBytes(0.1);
    fs.writeFileSync(out, preExisting);

    const realWrite = fs.writeFileSync.bind(fs);
    let n = 0;
    fs.writeFileSync = (p, d, ...rest) => {
      n++;
      if (n === 1) {
        // Partial write: emit a short prefix via the real writer, then throw.
        realWrite(p, Buffer.from(d).subarray(0, 16), ...rest);
        throw new Error("disk full mid-write");
      }
      return realWrite(p, d, ...rest);
    };
    try {
      assert.throws(() => writeWavAtomic(makeWavBytes(0.2), out));
    } finally {
      fs.writeFileSync = realWrite;
    }
    // Existing output untouched (byte-for-byte), and no temp files left behind.
    const onDisk = fs.readFileSync(out);
    assert.deepEqual(onDisk, preExisting);
    assert.equal(fs.readdirSync(dir).length, 1);
  } finally {
    rmRf(dir);
  }
});

await test("writeWavAtomic: cleans up temp file on rename failure and preserves existing output", () => {
  const dir = tmpDir("atomic-rename-fail");
  try {
    const out = path.join(dir, "out.wav");
    const preExisting = makeWavBytes(0.1);
    fs.writeFileSync(out, preExisting);

    const realRename = fs.renameSync.bind(fs);
    fs.renameSync = () => {
      throw new Error("simulated rename failure (e.g. cross-device or permission)");
    };
    try {
      assert.throws(() => writeWavAtomic(makeWavBytes(0.2), out));
    } finally {
      fs.renameSync = realRename;
    }
    // Existing output untouched, and no temp files left behind.
    assert.deepEqual(fs.readFileSync(out), preExisting);
    assert.equal(fs.readdirSync(dir).length, 1);
  } finally {
    rmRf(dir);
  }
});

// ---------- Public CLI end-to-end (real child processes) ----------

await test("cli: --help exits 0 without any API call", async () => {
  const r = await runCliWithMock(["--help"]);
  assert.equal(r.code, 0);
  assert.equal(r.apiCalls.length, 0);
});

await test("cli: documented WAV command writes a valid WAV file via real subprocess", async () => {
  const dir = tmpDir("cli-wav");
  try {
    const out = path.join(dir, "hello.wav");
    const r = await runCliWithMock(["--text", "hello there", "--out", out]);
    assert.equal(r.code, 0);
    assert.equal(r.apiCalls.length, 1);
    assert.ok(fs.existsSync(out));
    const onDisk = fs.readFileSync(out);
    assert.equal(onDisk.toString("ascii", 0, 4), "RIFF");
    assert.equal(onDisk.toString("ascii", 8, 12), "WAVE");
    assert.ok(onDisk.readUInt32LE(40) > 0); // valid data chunk size
    assert.equal(fs.readdirSync(dir).length, 1);
  } finally {
    rmRf(dir);
  }
});

await test("cli: documented MP3 command writes an MP3 via real subprocess", async () => {
  const ffmpeg = await findFfmpeg();
  if (!ffmpeg) return skipTest("ffmpeg not installed");

  const dir = tmpDir("cli-mp3");
  try {
    const out = path.join(dir, "article.mp3");
    const r = await runCliWithMock(["--text", "hello there", "--out", out]);
    assert.equal(r.code, 0);
    assert.equal(r.apiCalls.length, 1);
    assert.ok(fs.existsSync(out));
    // Verify codec via ffprobe.
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "stream=codec_name",
      "-of",
      "csv=p=0",
      out,
    ]);
    assert.equal(stdout.trim(), "mp3");
    assert.equal(fs.readdirSync(dir).length, 1);
  } finally {
    rmRf(dir);
  }
});

await test("cli: --format mp3 with no --out defaults to speech.mp3", async () => {
  const ffmpeg = await findFfmpeg();
  if (!ffmpeg) return skipTest("ffmpeg not installed");

  const dir = tmpDir("cli-mp3-default");
  const savedCwd = process.cwd();
  process.chdir(dir);
  try {
    const r = await runCliWithMock(["--text", "hi", "--format", "mp3"]);
    assert.equal(r.code, 0);
    assert.ok(fs.existsSync(path.join(dir, "speech.mp3")), "expected speech.mp3");
    assert.equal(fs.readdirSync(dir).length, 1);
  } finally {
    process.chdir(savedCwd);
    rmRf(dir);
  }
});

await test("cli: stdin input works via real subprocess", async () => {
  const dir = tmpDir("cli-stdin");
  try {
    const out = path.join(dir, "stdin.wav");
    const r = await runCliWithMock(["--stdin", "--out", out], { stdinData: "piped text here" });
    assert.equal(r.code, 0);
    assert.equal(r.apiCalls.length, 1);
    // Assert the request body contains the piped text.
    const body = JSON.parse(r.apiCalls[0].body);
    assert.equal(body.input[0].content[0].text, "piped text here");
    assert.ok(fs.existsSync(out));
    assert.equal(fs.readdirSync(dir).length, 1);
  } finally {
    rmRf(dir);
  }
});

await test("cli: --format bogus rejected before any API call", async () => {
  const r = await runCliWithMock(["--text", "hi", "--format", "bogus"]);
  assert.equal(r.code, 1);
  assert.equal(r.apiCalls.length, 0);
});

await test("cli: explicit --format mp3 with .wav out is rejected as a conflict", async () => {
  const dir = tmpDir("cli-conflict");
  try {
    const out = path.join(dir, "speech.wav");
    const r = await runCliWithMock(["--text", "hi", "--format", "mp3", "--out", out]);
    assert.equal(r.code, 1);
    assert.equal(r.apiCalls.length, 0);
    assert.ok(!fs.existsSync(out)); // nothing written
  } finally {
    rmRf(dir);
  }
});

await test("cli: stalls in body-reading hit the timeout and exit 3", async () => {
  const dir = tmpDir("cli-stall");
  try {
    const out = path.join(dir, "stall.wav");
    const r = await runCliWithMock(["--text", "hi", "--out", out, "--timeout-ms", "1500"], {
      mode: "stall-body",
    });
    assert.equal(r.code, 3);
    assert.ok(!fs.existsSync(out)); // no partial output on timeout
  } finally {
    rmRf(dir);
  }
});

await test("cli: whole-attempt deadline covers delayed headers + stalled body", async () => {
  const dir = tmpDir("cli-stall-delayed");
  try {
    const out = path.join(dir, "stall.wav");
    // The mock takes ~600ms to return headers, then stalls reading the body.
    // The whole-attempt deadline is 1500ms, so the body watchdog should trip
    // with ~900ms left, not start a fresh 1500ms budget after headers arrive.
    const t0 = Date.now();
    const r = await runCliWithMock(["--text", "hi", "--out", out, "--timeout-ms", "1500"], {
      mode: "delay-then-stall-body",
    });
    const elapsed = Date.now() - t0;
    assert.equal(r.code, 3);
    assert.ok(!fs.existsSync(out));
    // The whole attempt should end near the 1500ms deadline, not near 600+1500ms.
    assert.ok(elapsed < 2500, `elapsed=${elapsed}ms — deadline budget not shared`);
  } finally {
    rmRf(dir);
  }
});

await test("cli: explicit extensionless out destination is preserved exactly", async () => {
  const ffmpeg = await findFfmpeg();
  if (!ffmpeg) return skipTest("ffmpeg not installed");

  const dir = tmpDir("cli-extless");
  try {
    const out = path.join(dir, "narration");
    const r = await runCliWithMock(["--text", "hi", "--out", out, "--format", "mp3"]);
    assert.equal(r.code, 0);
    // The explicit extensionless destination is preserved — no alternate file created.
    assert.ok(fs.existsSync(out));
    assert.equal(fs.readdirSync(dir).length, 1);
    // Verify it is actually MP3 data.
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "stream=codec_name",
      "-of",
      "csv=p=0",
      out,
    ]);
    assert.equal(stdout.trim(), "mp3");
  } finally {
    rmRf(dir);
  }
});

await test("cli: missing ffmpeg preflight fails before any API call", async () => {
  // Inject a ffmpeg resolver that reports none available, then drive main().
  setFfmpegResolverForTesting(async () => null);
  let apiCalled = 0;
  withFetch(async () => {
    apiCalled++;
    return new Response("{}", { status: 200 });
  });
  const dir = tmpDir("cli-no-ffmpeg");
  const savedArgv = process.argv;
  const savedCwd = process.cwd();
  process.chdir(dir);
  process.argv = ["node", scriptPath, "--text", "hi", "--format", "mp3"];
  const code = await main();
  process.argv = savedArgv;
  process.chdir(savedCwd);
  restoreFetch();
  setFfmpegResolverForTesting(null);
  try {
    assert.equal(code, 4);
    assert.equal(apiCalled, 0); // API never called
    assert.equal(fs.readdirSync(dir).length, 0); // nothing written
  } finally {
    rmRf(dir);
  }
});

await test("cli: full main() run with mocked fetch writes wav and exits 0", async () => {
  const wav = makeWavBytes(0.5);
  withFetch(async () => new Response(JSON.stringify(makeAudioResponse(wav)), { status: 200 }));
  const dir = tmpDir("cli-full");
  const savedArgv = process.argv;
  const savedCwd = process.cwd();
  process.chdir(dir); // default out is relative to cwd
  process.argv = ["node", scriptPath, "--text", "hello there"];
  const code = await main();
  process.argv = savedArgv;
  process.chdir(savedCwd);
  try {
    assert.equal(code, 0);
    const out = path.join(dir, "speech.wav");
    assert.ok(fs.existsSync(out));
    const onDisk = fs.readFileSync(out);
    assert.equal(onDisk.length, wav.length);
    assert.deepEqual(onDisk, wav);
    assert.equal(fs.readdirSync(dir).length, 1);
  } finally {
    restoreFetch();
    rmRf(dir);
  }
});

// ---------- ffmpeg validation ----------

await test("cli: findFfmpeg validates by executing, not just path existence", async () => {
  const ffmpeg = await findFfmpeg();
  if (!ffmpeg) return skipTest("ffmpeg not installed");
  // The resolver returns something runnable; verify it can actually produce -version output.
  const { stdout } = await execFileAsync(ffmpeg, ["-version"]);
  assert.ok(stdout.includes("ffmpeg version"));
});

await test("cli: real ffmpeg MP3 conversion (valid codec + duration)", async () => {
  const ffmpeg = await findFfmpeg();
  if (!ffmpeg) return skipTest("ffmpeg not installed");

  const dir = tmpDir("mp3-convert");
  try {
    const wav = makeWavBytes(2, 24000); // 2 seconds, 24 kHz mono 16-bit
    const mp3 = path.join(dir, "out.mp3");
    await toMp3(wav, mp3);
    assert.ok(fs.existsSync(mp3));
    assert.ok(fs.statSync(mp3).size > 0);
    const { stdout } = await execFileAsync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "stream=codec_name",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        mp3,
      ],
      { maxBuffer: 10 * 1024 * 1024 },
    );
    const info = JSON.parse(stdout);
    assert.equal(info.streams[0].codec_name, "mp3");
    const dur = parseFloat(info.format.duration);
    assert.ok(dur > 1.8 && dur < 2.2, `duration=${dur}`);
    assert.equal(fs.readdirSync(dir).length, 1); // no temp leftovers
  } finally {
    rmRf(dir);
  }
});

await test("cli: toMp3 cleans up temp files when conversion fails", async () => {
  const ffmpeg = await findFfmpeg();
  if (!ffmpeg) return skipTest("ffmpeg not installed");

  const dir = tmpDir("mp3-fail");
  try {
    // Garbage WAV bytes — ffmpeg should fail to convert.
    const bad = Buffer.alloc(200, 1);
    bad.write("RIFF", 0, "ascii");
    bad.write("WAVE", 8, "ascii");
    await assert.rejects(async () => toMp3(bad, path.join(dir, "out.mp3")));
    assert.equal(fs.readdirSync(dir).length, 0); // no temp leftovers, no partial output
  } finally {
    rmRf(dir);
  }
});

// ---------- Summary ----------

console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed === 0 ? 0 : 1);
