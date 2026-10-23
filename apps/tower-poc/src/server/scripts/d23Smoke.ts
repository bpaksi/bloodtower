// M2 step 11, D23 on the tower. Bob runs this at the Mac, with the service running on the real
// tower and the tower in sight:
//
//   pnpm -F tower-poc-server d23-smoke
//
// It goes through the service like any client, over /ws, so the executor and its clearing write
// are what is tested. It asks before every step, never retries, and disconnects at the end if it
// connected the tower itself. After
// each step it asks what Bob saw and heard; his answers and every lifecycle go to a JSONL file
// under research/tower/smoke/ (`d23-*.jsonl`, ignored by git: rename one to keep it).
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { PROTOCOL_VERSION, SILENT_LIGHT_SEQUENCES } from "@dark-tower/tower";
import WebSocket from "ws";

const URL = process.env.SERVICE_URL || "ws://localhost:4747/ws";
const TEST_SOUND = 1;
const LOG = resolve(
  import.meta.dirname,
  "../../../../../research/tower/smoke",
  `d23-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`,
);

if (!stdin.isTTY) {
  console.error("Run this in a terminal: it asks before every step.");
  process.exit(1);
}

mkdirSync(dirname(LOG), { recursive: true });
const record = (entry: object) =>
  appendFileSync(LOG, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);

const rl = createInterface({ input: stdin, output: stdout });
const socket = new WebSocket(URL);
let connection: { state: string; calibration: string } | undefined;
let connectedByUs = false;
const waiters: Array<() => void> = [];

// A socket error after opening must not end the script before it disconnects.
socket.on("error", (error) => {
  console.error(`Socket error: ${error.message}`);
  record({ source: "socket-error", message: error.message });
});

socket.on("message", (data) => {
  const message = JSON.parse(String(data));
  if (message.type === "connection") {
    connection = message.payload;
    console.log(`  connection: ${message.payload.state}, ${message.payload.calibration}`);
    record({ source: "connection", status: message.payload });
  } else if (message.type === "command.lifecycle") {
    const { capabilityId, stage, reason } = message.payload;
    console.log(`  ${capabilityId}: ${stage}${reason ? ` (${reason})` : ""}`);
    record({ source: "command", lifecycle: message.payload });
  } else if (message.type === "error") {
    console.log(`  error: ${message.payload.code}: ${message.payload.message}`);
    record({ source: "error", error: message.payload });
  }
  for (const wake of waiters.splice(0)) wake();
});

const send = (type: string, payload: object, id?: string) =>
  socket.send(JSON.stringify({ v: PROTOCOL_VERSION, type, ...(id ? { id } : {}), payload }));

const until = async (done: () => boolean, ms: number, what: string) => {
  const end = Date.now() + ms;
  while (!done()) {
    if (Date.now() > end) throw new Error(`Gave up waiting for ${what} after ${ms / 1000} s.`);
    await new Promise<void>((wake) => {
      waiters.push(wake);
      setTimeout(wake, 500);
    });
  }
};

/** Asks before a step; anything but "y" skips it. */
const ask = async (question: string) =>
  (await rl.question(`\n${question} [y/N] `)).trim().toLowerCase() === "y";
const observe = async (step: string) => {
  const seen = await rl.question("What did you see and hear? ");
  record({ source: "observation", step, seen });
};

let commandCount = 0;
const command = (capabilityId: string, params: object) => {
  commandCount += 1;
  const id = `d23-${commandCount}`;
  record({ source: "sent", id, capabilityId, params });
  send("command", { capabilityId, params }, id);
};

try {
  await new Promise((ok, fail) => {
    if (socket.readyState === WebSocket.OPEN) ok(undefined);
    socket.once("open", ok).once("error", fail);
  });
  send("hello", { clientLabel: "d23-smoke" });
  await until(() => connection !== undefined, 5_000, "the service's connection state");
  console.log(`Connected to the service at ${URL}. Log: ${LOG}`);

  if (connection?.state !== "connected") {
    if (!(await ask("Connect to the tower?"))) throw new Error("Stopped before connecting.");
    send("connect", {});
    connectedByUs = true;
    await until(() => connection?.state === "connected", 60_000, "the tower to connect");
  }
  if (connection?.calibration !== "calibrated") {
    if (!(await ask("Calibrate? The drums will turn for about 20 s.")))
      throw new Error("Stopped: the silent sequences are sent only to a calibrated tower.");
    send("calibrate", {});
    await until(() => connection?.calibration === "calibrated", 40_000, "calibration to end");
  }

  for (const sequence of SILENT_LIGHT_SEQUENCES) {
    if (!(await ask(`Play ${sequence}? Watch the lights and the drums.`))) continue;
    command("lighting.sequence", { sequence });
    await observe(`${sequence}: lights and drums`);
    if (!(await ask("Now play the test sound? Watch whether the sequence stops or replays.")))
      continue;
    command("sound.play", { soundIndex: TEST_SOUND });
    await observe(`${sequence}: then sound.play`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  record({ source: "stopped", reason: String(error) });
} finally {
  if (connectedByUs && connection?.state === "connected") {
    console.log("Disconnecting.");
    send("disconnect", {});
    await until(() => connection?.state === "disconnected", 10_000, "the disconnect").catch(
      () => undefined,
    );
  }
  rl.close();
  socket.close();
  console.log(`Log: ${LOG}`);
}
