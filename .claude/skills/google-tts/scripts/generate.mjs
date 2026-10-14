#!/usr/bin/env node

/**
 * generate.mjs — Google Gemini TTS (Google AI Studio) CLI helper.
 *
 * Calls the Gemini API Interactions endpoint for text-to-speech and writes
 * a WAV file (dependency-free) or MP3 (requires ffmpeg for conversion).
 *
 * Docs: https://ai.google.dev/gemini-api/docs/speech-generation
 */

import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_MODEL = "gemini-3.8-flash-tts";
const DEFAULT_VOICE = "Kore";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

// CLI-chosen safety limits (not verified API token limits).
const MAX_TEXT_CHARS = 20000;
const MAX_BODY_BYTES = 1_000_000;

// ---------- CLI parsing ----------

function parseArgs(argv) {
  const opts = {
    text: null,
    input: null,
    out: "speech.wav",
    format: "wav",
    model: DEFAULT_MODEL,
    voice: DEFAULT_VOICE,
    style: null,
    timeoutMs: 60000,
    maxRetries: 4,
    stdin: false,
  };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    switch (a) {
      case "--text":
      case "-t":
        opts.text = requireValue(args, ++i, a);
        break;
      case "--input":
      case "-i":
        opts.input = requireValue(args, ++i, a);
        break;
      case "--out":
      case "-o":
        opts.out = requireValue(args, ++i, a);
        opts._outExplicit = true;
        break;
      case "--format":
        opts.format = requireValue(args, ++i, a).toLowerCase();
        opts._formatExplicit = true;
        break;
      case "--model":
      case "-m":
        opts.model = requireValue(args, ++i, a);
        break;
      case "--voice":
      case "-v":
        opts.voice = requireValue(args, ++i, a);
        break;
      case "--style":
        opts.style = requireValue(args, ++i, a);
        break;
      case "--timeout-ms":
        opts.timeoutMs = parsePositiveInt(requireValue(args, ++i, a), a);
        break;
      case "--max-retries":
        opts.maxRetries = parseNonNegativeInt(requireValue(args, ++i, a), a);
        break;
      case "--stdin":
        opts.stdin = true;
        break;
      case "--help":
      case "-h":
        opts.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${a}`);
    }
  }
  return opts;
}

function requireValue(args, i, flag) {
  if (i >= args.length) throw new Error(`${flag} requires a value`);
  return args[i];
}

function parsePositiveInt(v, flag) {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0)
    throw new Error(`${flag} must be a positive integer, got: ${v}`);
  return n;
}

function parseNonNegativeInt(v, flag) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0)
    throw new Error(`${flag} must be a nonnegative integer, got: ${v}`);
  return n;
}

// ---------- Input validation ----------

function readInput(opts) {
  const sources = [];
  if (opts.text !== null) sources.push("--text");
  if (opts.input !== null) sources.push("--input");
  if (opts.stdin) sources.push("--stdin");
  if (sources.length === 0) throw new Error("Provide text via --text, --input <file>, or --stdin");
  if (sources.length > 1)
    throw new Error(`Conflicting inputs: ${sources.join(", ")}. Use only one.`);

  let text;
  if (opts.text !== null) {
    text = opts.text;
  } else if (opts.input !== null) {
    try {
      text = fs.readFileSync(path.resolve(opts.input), "utf8");
    } catch (e) {
      throw new Error(`Cannot read input file ${opts.input}: ${e.message}`);
    }
  } else {
    // Read directly from fd 0 rather than /dev/stdin (which fails with ENXIO
    // when stdin is a non-tty, e.g. a pipe from a parent process).
    text = fs.readFileSync(0, "utf8");
  }

  text = text.trim();
  if (!text) throw new Error("Input text is empty");
  // Local safety ceiling; the API's own limits vary by model and account tier.
  if (text.length > MAX_TEXT_CHARS) {
    throw new Error(
      `Input text is ${text.length} characters (this CLI's safety ceiling: ${MAX_TEXT_CHARS}). Split into shorter segments and run separately; this tool does not auto-truncate.`,
    );
  }
  return text;
}

// ---------- API request ----------

function buildBody(opts, text) {
  const annotations = [];
  if (opts.style) {
    annotations.push({ type: "speech_metadata", style: opts.style });
  }
  const content = { type: "text", text };
  if (annotations.length) content.annotations = annotations;
  return {
    model: opts.model,
    input: [{ type: "user_input", content: [content] }],
    response_format: { type: "audio" },
    generation_config: {
      speech_config: [{ voice: opts.voice }],
    },
  };
}

function extractAudio(json) {
  if (!json || !Array.isArray(json.steps)) {
    throw new Error("Unexpected response shape: missing steps array");
  }
  let audio = null;
  for (const step of json.steps) {
    if (step.type !== "model_output") continue;
    const parts = Array.isArray(step.content) ? step.content : [];
    for (const p of parts) {
      if (p.type === "audio" && p.data) audio = p;
    }
  }
  if (!audio) throw new Error("Response contained no audio data");
  const bytes = Buffer.from(audio.data, "base64");
  if (bytes.length < 44) throw new Error("Audio payload is too small to be a valid file");
  if (
    bytes.length < 12 ||
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new Error(
      "Unexpected audio bytes: not RIFF/WAVE. Check the model supports audio output and the request used response_format audio.",
    );
  }
  if (bytes.toString("ascii", 12, 16) !== "fmt " || bytes.toString("ascii", 36, 40) !== "data") {
    throw new Error("Audio payload is missing fmt or data chunks; not a complete WAV file");
  }
  return bytes;
}

const RETRYABLE_STATUS = new Set([429, 408, 500, 502, 503, 504]);
const CLIENT_FATAL_STATUS = new Set([400, 401, 402, 403, 404, 409, 413]);

function redact(body, key) {
  if (!key) return body;
  return body.split(key).join("[REDACTED]");
}

/** Print an error to stderr with the API key redacted. */
function printError(prefix, message) {
  process.stderr.write(`${prefix}: ${redact(message, process.env.GEMINI_API_KEY)}\n`);
}

async function callApi(opts, text) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not set. Get one at https://aistudio.google.com/apikey and export it: export GEMINI_API_KEY=...",
    );
  }
  const body = JSON.stringify(buildBody(opts, text));
  // Local safety ceiling (not a verified server token limit).
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    throw new Error(
      `Request payload is ${Buffer.byteLength(body)} bytes (this CLI's safety ceiling: ${MAX_BODY_BYTES}). Shorten or split the text.`,
    );
  }

  let attempt = 0;
  while (true) {
    // Whole-attempt deadline: connect, send, and reading the body all share
    // one timeoutMs budget. fetch's AbortSignal covers the request, and a body
    // watchdog consumes only the remaining budget so the total deadline holds.
    const deadline = Date.now() + opts.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
    let res;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });
      const resText = await readBodyWithTimeout(res, deadline);
      clearTimeout(timer);

      if (res.status === 200) {
        let json;
        try {
          json = JSON.parse(resText);
        } catch (e) {
          throw new Error(`Malformed JSON response: ${redact(e.message, key)}`);
        }
        return extractAudio(json);
      }

      let errJson = null;
      try {
        errJson = JSON.parse(resText);
      } catch {
        /* keep raw body */
      }
      const apiStatus = errJson?.error?.status || "";

      if (res.status === 413) {
        throw new Error(
          `Request payload too large (413). Shorten the text or split it into multiple runs. ${redact(resText, key)}`,
        );
      }
      if (RETRYABLE_STATUS.has(res.status) && attempt < opts.maxRetries) {
        const delay = computeBackoffMs(attempt, res.headers.get("retry-after"), res.status);
        process.stderr.write(
          `Retrying after ${(delay / 1000).toFixed(1)}s (attempt ${attempt + 1}/${opts.maxRetries} retries, status ${res.status})…\n`,
        );
        await sleep(delay);
        attempt++;
        continue;
      }
      if (res.status === 429) {
        if (apiStatus === "RESOURCE_EXHAUSTED") {
          throw new Error(
            `Rate limit (429 RESOURCE_EXHAUSTED) and retries exhausted. Some rate limits reset at midnight Pacific time; check yours at https://aistudio.google.com/rate-limits. ${redact(resText, key)}`,
          );
        }
        throw new Error(`Rate limit (429) and retries exhausted. ${redact(resText, key)}`);
      }
      if (CLIENT_FATAL_STATUS.has(res.status)) {
        throw new Error(
          `API rejected request (HTTP ${res.status}${apiStatus ? ` ${apiStatus}` : ""}). Not retried. ${redact(resText, key)}`,
        );
      }
      throw new Error(`API error (HTTP ${res.status}). ${redact(resText, key)}`);
    } catch (e) {
      clearTimeout(timer);
      if (e.name === "AbortError") {
        throw new Error(`Request timed out after ${opts.timeoutMs} ms`);
      }
      if (
        e.name === "FetchError" ||
        e.cause?.code === "ENOTFOUND" ||
        e.cause?.code === "ECONNREFUSED"
      ) {
        throw new Error(`Network failure: ${redact(e.message, key)}`);
      }
      throw e;
    }
  }
}

function computeBackoffMs(attempt, retryAfterHeader, status) {
  if (retryAfterHeader) {
    const seconds = parseRetryAfter(retryAfterHeader);
    if (seconds !== null) return seconds * 1000;
  }
  const base = status === 429 ? 1000 : 500;
  const exp = Math.min(base * 2 ** attempt, 30000);
  const jitter = Math.random() * exp * 0.25;
  return Math.min(exp + jitter, 37500);
}

function parseRetryAfter(v) {
  const trimmed = String(v).trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) return parseFloat(trimmed);
  const asDate = Date.parse(trimmed);
  if (!Number.isNaN(asDate)) {
    const seconds = (asDate - Date.now()) / 1000;
    return seconds > 0 ? seconds : 0;
  }
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Read the response body under the remaining budget of a whole-attempt deadline. */
function readBodyWithTimeout(res, deadlineMs) {
  const remaining = deadlineMs - Date.now();
  if (remaining <= 0) {
    return Promise.reject(new Error("Request timed out (deadline reached before body read)"));
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            "Request timed out while reading the response body (whole-attempt deadline reached)",
          ),
        ),
      remaining,
    );
    res.text().then(
      (t) => {
        clearTimeout(timer);
        resolve(t);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

// ---------- ffmpeg ----------

let _ffmpegResolver = null;
async function findFfmpeg() {
  if (typeof _ffmpegResolver === "function") {
    return _ffmpegResolver();
  }
  const candidates = [
    "/opt/homebrew/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/usr/bin/ffmpeg",
    "ffmpeg",
  ];
  for (const c of candidates) {
    try {
      // Execute the binary rather than only checking existence — a path can
      // exist but be unusable.
      await execFileAsync(c, ["-version"], { stdio: "ignore" });
      return c;
    } catch {}
  }
  return null;
}

async function toMp3(wavBytes, outPath) {
  const ffmpeg = await findFfmpeg();
  if (!ffmpeg) {
    throw new Error(
      "ffmpeg is required for MP3 output (brew install ffmpeg). Use --format wav to skip.",
    );
  }
  const tmp = `${outPath}.tmp-${process.pid}-${Date.now()}.wav`;
  const target = `${outPath}.tmp-${process.pid}-${Date.now()}.mp3`;
  try {
    fs.writeFileSync(tmp, wavBytes);
    await execFileAsync(
      ffmpeg,
      ["-y", "-i", tmp, "-codec:a", "libmp3lame", "-b:a", "128k", target],
      {
        maxBuffer: 50 * 1024 * 1024,
      },
    );
    if (!fs.existsSync(target) || fs.statSync(target).size === 0) {
      throw new Error("ffmpeg produced no output");
    }
    fs.renameSync(target, outPath);
  } finally {
    fs.rmSync(tmp, { force: true });
    if (fs.existsSync(target) && target !== outPath) fs.rmSync(target, { force: true });
  }
}

function writeWavAtomic(wavBytes, outPath) {
  const tmp = `${outPath}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(tmp, wavBytes);
    fs.renameSync(tmp, outPath);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

// ---------- Main ----------

function printHelp() {
  process.stdout.write(`Usage: generate.mjs [options]

Options:
  --text, -t <string>   Inline text to synthesize (exclusive with --input/--stdin)
  --input, -i <file>     Read text from a file
  --stdin                Read text from stdin
  --out, -o <path>       Output path (default: speech.wav)
  --format wav|mp3       Audio format (default: wav; mp3 requires ffmpeg)
  --model, -m <id>       Model ID (default: ${DEFAULT_MODEL})
  --voice, -v <name>     Voice name (default: ${DEFAULT_VOICE})
  --style <desc>         Optional speech style, e.g. "cheerful and friendly"
  --timeout-ms <ms>      Request timeout (default: 60000)
  --max-retries <n>      Max retries for transient errors (default: 4)
  --help, -h             Show this help

Environment: GEMINI_API_KEY (required).

Exit codes: 0 success, 1 argument error, 2 input error, 3 API error, 4 write/convert error.
`);
}

function inferFormat(outPath) {
  const ext = path.extname(outPath).toLowerCase();
  if (ext === ".wav") return "wav";
  if (ext === ".mp3") return "mp3";
  return null;
}

function resolveFormat(opts) {
  const valid = ["wav", "mp3"];
  if (!valid.includes(opts.format)) {
    throw new Error(`--format must be one of: ${valid.join(", ")} (got: ${opts.format})`);
  }
  const inferred = inferFormat(path.resolve(opts.out));
  // Explicit --format wins when both are supplied. When the out-path extension
  // disagrees and --out was explicitly passed, that's a conflict. When --out is
  // the CLI default (speech.wav), rewrite it later to match the format.
  if (opts._formatExplicit) {
    if (inferred !== null && inferred !== opts.format && opts._outExplicit) {
      throw new Error(
        `Conflict: --format ${opts.format} does not match the .${inferred} extension on the out path. Pass --out without an audio extension, or match them.`,
      );
    }
    return opts.format;
  }
  if (inferred) return inferred;
  return opts.format;
}

function defaultOutPathForFormat(outPath, format) {
  // Only applies when the user left --out at its default (speech.wav): pick a
  // sensible default matching the format instead of silently mislabeling.
  const ext = path.extname(outPath);
  return path.join(path.dirname(outPath), `${path.basename(outPath, ext)}.${format}`);
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv);
  } catch (e) {
    printError("Error", e.message);
    return 1;
  }
  if (opts.help) {
    printHelp();
    return 0;
  }

  let text;
  try {
    text = readInput(opts);
  } catch (e) {
    printError("Input error", e.message);
    return 2;
  }

  let format;
  try {
    format = resolveFormat(opts);
  } catch (e) {
    printError("Error", e.message);
    return 1;
  }
  // resolveFormat already rejects explicit format/extension conflicts. The out
  // path is only rewritten when --out was left at the CLI default (speech.wav)
  // and the format disagrees — an explicit destination is always preserved
  // exactly as the user typed it.
  let outPath;
  if (opts._outExplicit) {
    outPath = path.resolve(opts.out);
  } else {
    outPath = path.resolve(`speech.${format}`);
  }

  // Check ffmpeg before making a billable API request.
  if (format === "mp3") {
    const ffmpeg = await findFfmpeg();
    if (!ffmpeg) {
      printError(
        "Error",
        "ffmpeg is required for MP3 output (brew install ffmpeg). Use --format wav to skip.",
      );
      return 4;
    }
  }

  let wavBytes;
  try {
    wavBytes = await callApi(opts, text);
  } catch (e) {
    printError("API error", e.message);
    return 3;
  }

  try {
    if (format === "wav") {
      writeWavAtomic(wavBytes, outPath);
    } else {
      await toMp3(wavBytes, outPath);
    }
  } catch (e) {
    printError("Write/convert error", e.message);
    return 4;
  }

  const kb = (wavBytes.length / 1024).toFixed(1);
  process.stdout.write(
    `Wrote ${outPath} (${kb} KiB WAV, voice=${opts.voice}, model=${opts.model})\n`,
  );
  return 0;
}

async function run() {
  const code = await main();
  if (code !== 0) process.exit(code);
}

const entry = path.resolve(process.argv[1]);
const self = fileURLToPath(import.meta.url);
if (entry === self) {
  run();
}

export {
  buildBody,
  callApi,
  computeBackoffMs,
  defaultOutPathForFormat,
  extractAudio,
  findFfmpeg,
  main,
  parseArgs,
  parseRetryAfter,
  readInput,
  resolveFormat,
  setFfmpegResolverForTesting,
  toMp3,
  writeWavAtomic,
};

function setFfmpegResolverForTesting(fn) {
  _ffmpegResolver = fn;
}
