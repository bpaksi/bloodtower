/**
 * mock-fetch.cjs — test-only CommonJS preload.
 * Install mocked globalThis.fetch before the CLI loads via:
 *   node --require <this file> scripts/generate.mjs ...
 * Reads configuration from the MOCK_TTS_* environment variables.
 */

const fs = require("node:fs");

// Where to record each request (URL, body) for assertions.
const logPath = process.env.MOCK_TTS_LOG || "/tmp/mock-tts-log.json";

function makeWavBytes(seconds = 0.5, sampleRate = 24000) {
  const numSamples = Math.round(sampleRate * seconds);
  const dataLen = numSamples * 2;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + dataLen, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(dataLen, 40);
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

const mode = process.env.MOCK_TTS_MODE || "ok";
const calls = [];

globalThis.fetch = async (url, init) => {
  calls.push({
    url: String(url),
    body: init ? init.body : null,
    headers: init ? init.headers : null,
  });

  if (mode === "stall-body") {
    // Return headers, then never yield the body — drives the timeout path.
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([0x7b])); // '{'
          // never close
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
  if (mode === "throw-with-key") {
    const e = new Error(`Fetch failed for key ${process.env.GEMINI_API_KEY}`);
    e.name = "FetchError";
    throw e;
  }
  if (mode === "delay-then-stall-body") {
    // Simulate a server that takes a while to return headers, then stalls
    // reading the body. The whole-attempt deadline should trip either way.
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    await sleep(600);
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([0x7b])); // '{'
          // never close
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const wav = makeWavBytes(0.5);
  return new Response(JSON.stringify(makeAudioResponse(wav)), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

// Flush the request log when the process exits so tests can assert on it.
process.on("exit", () => {
  try {
    fs.writeFileSync(logPath, JSON.stringify(calls, null, 2));
  } catch {
    /* best-effort */
  }
});
