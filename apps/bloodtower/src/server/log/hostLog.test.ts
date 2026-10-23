import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createHostLogger,
  debugEnabledFromEnv,
  type HostLogger,
  handleLogIngest,
  LOG_RETENTION_DAYS,
} from "./hostLog.ts";

const dirs: string[] = [];
const servers: Array<{ close: () => Promise<void> }> = [];

afterEach(async () => {
  for (const server of servers) await server.close();
  servers.length = 0;
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  dirs.length = 0;
});

const makeDir = () => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-log-"));
  dirs.push(dir);
  return dir;
};

interface StoredLine {
  time: string;
  level: string;
  source: string;
  device: string | null;
  session: string | null;
  screen: string | null;
  code: string;
  message: string;
}

const readLines = (dataDir: string, day: string): StoredLine[] => {
  const file = join(dataDir, "logs", `${day}.jsonl`);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as StoredLine);
};

const listen = async (log: HostLogger) => {
  const server = createServer((req, res) => {
    void handleLogIngest(req, res, log).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        res.end(message);
      } else res.destroy();
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("port");
  const close = () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  servers.push({ close });
  return `http://127.0.0.1:${address.port}`;
};

describe("host error log", () => {
  it("writes one JSON line with the decision 0003 fields", () => {
    const dataDir = makeDir();
    const log = createHostLogger({
      dataDir,
      mirror: false,
      now: () => new Date("2026-10-23T12:00:00.000Z"),
    });
    log.setSession("session-abc");
    log.error("tower-command-failed", "Sound command bt-sound-1 failed.");
    log.error("page-error", "Shown on a device.", {
      source: "device",
      device: "ipad-1",
      session: null,
      screen: "join",
    });
    log.info("host-start", "one\ntwo");

    const raw = readFileSync(join(dataDir, "logs", "2026-10-23.jsonl"), "utf8");
    expect(raw.endsWith("\n")).toBe(true);
    const lines = raw.trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[2] ?? "{}")).toMatchObject({ message: "one\ntwo" });
    expect(readLines(dataDir, "2026-10-23")).toEqual([
      {
        time: "2026-10-23T12:00:00.000Z",
        level: "error",
        source: "server",
        device: null,
        session: "session-abc",
        screen: null,
        code: "tower-command-failed",
        message: "Sound command bt-sound-1 failed.",
      },
      {
        time: "2026-10-23T12:00:00.000Z",
        level: "error",
        source: "device",
        device: "ipad-1",
        session: null,
        screen: "join",
        code: "page-error",
        message: "Shown on a device.",
      },
      {
        time: "2026-10-23T12:00:00.000Z",
        level: "info",
        source: "server",
        device: null,
        session: "session-abc",
        screen: null,
        code: "host-start",
        message: "one\ntwo",
      },
    ]);
    expect(debugEnabledFromEnv({})).toBe(false);
    expect(debugEnabledFromEnv({ BLOODTOWER_LOG_DEBUG: "1" })).toBe(true);
    expect(LOG_RETENTION_DAYS).toBe(30);
  });

  it("names the file for the UTC day and starts a new file after midnight", () => {
    const dataDir = makeDir();
    let current = new Date("2026-10-23T23:59:59.000Z");
    const log = createHostLogger({ dataDir, mirror: false, now: () => current });
    log.error("host-start", "before midnight");
    current = new Date("2026-10-24T00:00:01.000Z");
    log.warn("pack-asset", "after midnight");

    expect(readLines(dataDir, "2026-10-23")).toEqual([
      expect.objectContaining({
        time: "2026-10-23T23:59:59.000Z",
        level: "error",
        message: "before midnight",
      }),
    ]);
    expect(readLines(dataDir, "2026-10-24")).toEqual([
      expect.objectContaining({
        time: "2026-10-24T00:00:01.000Z",
        level: "warn",
        code: "pack-asset",
        message: "after midnight",
      }),
    ]);
  });

  it("drops a daily file more than 30 days old when the host logger starts", () => {
    const dataDir = makeDir();
    const logs = join(dataDir, "logs");
    mkdirSync(logs);
    const expired = join(logs, "2026-09-22.jsonl");
    const edge = join(logs, "2026-09-23.jsonl");
    const today = join(logs, "2026-10-23.jsonl");
    const diag = join(logs, "diag.jsonl");
    const invalid = join(logs, "2026-02-31.jsonl");
    writeFileSync(expired, '{"old":true}\n');
    writeFileSync(edge, '{"edge":true}\n');
    writeFileSync(today, '{"today":true}\n');
    writeFileSync(diag, '{"at":"x","dir":"in","type":"hello"}\n');
    writeFileSync(invalid, '{"skip":true}\n');
    const recent = new Date("2026-10-23T00:00:00.000Z");
    utimesSync(expired, recent, recent);
    utimesSync(today, new Date("2020-01-01T00:00:00.000Z"), new Date("2020-01-01T00:00:00.000Z"));

    const log = createHostLogger({
      dataDir,
      mirror: false,
      now: () => new Date("2026-10-23T15:04:05.000Z"),
    });
    log.error("host-start", "started");

    expect(existsSync(expired)).toBe(false);
    expect(readFileSync(edge, "utf8")).toContain("edge");
    expect(readFileSync(diag, "utf8")).toContain("hello");
    expect(readFileSync(invalid, "utf8")).toContain("skip");
    const lines = readFileSync(today, "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[1] ?? "{}")).toMatchObject({ code: "host-start", message: "started" });
  });

  it("writes a debug line only when debug is switched on", () => {
    const quietDir = makeDir();
    const quiet = createHostLogger({
      dataDir: quietDir,
      mirror: false,
      now: () => new Date("2026-10-23T12:00:00.000Z"),
    });
    quiet.debug("host-start", "hidden");
    quiet.error("host-start", "kept");
    expect(readLines(quietDir, "2026-10-23").map((line) => line.level)).toEqual(["error"]);

    const loudDir = makeDir();
    const loud = createHostLogger({
      dataDir: loudDir,
      mirror: false,
      debug: true,
      now: () => new Date("2026-10-23T12:00:00.000Z"),
    });
    loud.debug("host-start", "shown");
    expect(readLines(loudDir, "2026-10-23")).toEqual([
      expect.objectContaining({ level: "debug", code: "host-start", message: "shown" }),
    ]);
  });

  it("accepts POST /log and refuses a body that carries raw bytes", async () => {
    const dataDir = makeDir();
    const log = createHostLogger({
      dataDir,
      mirror: false,
      now: () => new Date("2026-10-23T12:00:00.000Z"),
    });
    log.setSession("session-host");
    const base = await listen(log);
    const posted = await fetch(`${base}/log`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        level: "warn",
        source: "device",
        device: "ipad-2",
        screen: "play",
        code: "page-error",
        message: "The page reported a warning.",
      }),
    });
    expect(posted.status).toBe(204);
    expect(readLines(dataDir, "2026-10-23")).toEqual([
      {
        time: "2026-10-23T12:00:00.000Z",
        level: "warn",
        source: "device",
        device: "ipad-2",
        session: null,
        screen: "play",
        code: "page-error",
        message: "The page reported a warning.",
      },
    ]);

    const secret = "raw-byte-payload";
    const refused = await fetch(`${base}/log`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        level: "error",
        source: "device",
        code: "page-error",
        message: "no",
        bytes: secret,
      }),
    });
    expect(refused.status).toBe(400);
    const raw = readFileSync(join(dataDir, "logs", "2026-10-23.jsonl"), "utf8");
    expect(raw).not.toContain(secret);
    expect(raw).toContain("unknown field bytes");

    const debug = await fetch(`${base}/log`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        level: "debug",
        source: "board",
        code: "page-debug",
        message: "not stored",
      }),
    });
    expect(debug.status).toBe(204);
    expect(readLines(dataDir, "2026-10-23").some((line) => line.level === "debug")).toBe(false);

    const huge = await fetch(`${base}/log`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        level: "error",
        source: "device",
        code: "page-error",
        message: "x".repeat(9000),
      }),
    });
    expect(huge.status).toBe(413);
    expect(readFileSync(join(dataDir, "logs", "2026-10-23.jsonl"), "utf8")).not.toContain("xxxx");

    const get = await fetch(`${base}/log`);
    expect(get.status).toBe(405);
  });
});
