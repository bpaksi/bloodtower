import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocketServer } from "ws";
import { createHostLogger, type HostLogger } from "../log/hostLog.ts";
import { createMockTower } from "./mock.ts";
import { createSidecarTower } from "./sidecar.ts";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  dirs.length = 0;
});

const makeDir = () => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-cmd-"));
  dirs.push(dir);
  return dir;
};

interface StoredLine {
  level: string;
  source: string;
  device: string | null;
  session: string | null;
  screen: string | null;
  code: string;
  message: string;
}

const readLines = (log: HostLogger): StoredLine[] => {
  const day = "2026-10-23";
  const file = join(log.dir, `${day}.jsonl`);
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as StoredLine);
};

const logger = () =>
  createHostLogger({
    dataDir: makeDir(),
    mirror: false,
    now: () => new Date("2026-10-23T08:00:00.000Z"),
  });

const waitFor = async (ready: () => boolean) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (ready()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("timed out");
};

interface FakeTower {
  url: string;
  commands: string[];
  stop: () => Promise<void>;
  closeClients: () => void;
}

const fakeTower = async (
  onCommand: "timeout" | "failed" | "timed-out" | "written" | "close",
): Promise<FakeTower> => {
  const server = new WebSocketServer({ port: 0, host: "127.0.0.1" });
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("port");
  const commands: string[] = [];
  server.on("connection", (socket) => {
    socket.on("message", (raw) => {
      const message = JSON.parse(String(raw)) as { type?: string; id?: string };
      if (message.type === "hello") {
        socket.send(JSON.stringify({ v: 1, type: "welcome", payload: {} }));
        socket.send(
          JSON.stringify({ v: 1, type: "connection", payload: { state: "disconnected" } }),
        );
      }
      if (message.type === "connect") {
        socket.send(
          JSON.stringify({
            v: 1,
            type: "connection",
            payload: { state: "connected", calibration: "calibrated" },
          }),
        );
      }
      if (message.type === "command" && message.id) {
        commands.push(message.id);
        if (onCommand === "close") {
          socket.close();
          return;
        }
        socket.send(
          JSON.stringify({
            v: 1,
            type: "command.lifecycle",
            payload: {
              commandId: message.id,
              capabilityId: "sound.play-stateful",
              stage: "queued",
            },
          }),
        );
        if (onCommand === "timeout") return;
        socket.send(
          JSON.stringify({
            v: 1,
            type: "command.lifecycle",
            payload: {
              commandId: message.id,
              capabilityId: "sound.play-stateful",
              stage:
                onCommand === "failed"
                  ? "failed"
                  : onCommand === "timed-out"
                    ? "timed-out"
                    : "write-completed",
            },
          }),
        );
      }
    });
  });
  return {
    url: `ws://127.0.0.1:${address.port}`,
    commands,
    closeClients: () => {
      for (const client of server.clients) client.close();
    },
    stop: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
      }),
  };
};

const diagLines = (path: string) =>
  readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as { at?: string; dir?: string; type?: string });

describe("tower command errors", () => {
  it("writes an error line when a command times out, and leaves DIAG_LOG separate", async () => {
    const log = logger();
    log.setSession("session-1");
    const diag = join(log.dir, "..", "diag.jsonl");
    const fake = await fakeTower("timeout");
    const tower = createSidecarTower({
      url: fake.url,
      diagLogPath: diag,
      commandTimeoutMs: 80,
      log,
    });
    try {
      tower.connect();
      await tower.settled();
      await waitFor(() => tower.snapshot().connection === "connected");
      expect(await tower.playSound(58, 1)).toBe("failed");
      const lines = readLines(log);
      expect(lines).toEqual([
        expect.objectContaining({
          level: "error",
          source: "server",
          device: null,
          session: "session-1",
          screen: null,
          code: "tower-command-timeout",
        }),
      ]);
      expect(lines[0]?.message).toContain("bt-sound-1");
      const diagRecords = diagLines(diag);
      expect(diagRecords.some((record) => record.type === "command" && record.dir === "out")).toBe(
        true,
      );
      expect(
        diagRecords.every((record) => Object.keys(record).sort().join() === "at,dir,type"),
      ).toBe(true);
      const errorText = readFileSync(join(log.dir, "2026-10-23.jsonl"), "utf8");
      expect(errorText).not.toContain('"dir"');
      expect(readFileSync(diag, "utf8")).not.toContain("tower-command-timeout");
    } finally {
      tower.close();
      await fake.stop();
    }
  });

  it("writes an error line when a command fails, and a written command stays out of the log", async () => {
    const log = logger();
    const diag = join(log.dir, "..", "diag.jsonl");
    const written = await fakeTower("written");
    const first = createSidecarTower({
      url: written.url,
      diagLogPath: diag,
      commandTimeoutMs: 1000,
      log,
    });
    try {
      first.connect();
      await first.settled();
      await waitFor(() => first.snapshot().connection === "connected");
      expect(await first.playSound(58, 2)).toBe("written");
      expect(existsSync(join(log.dir, "2026-10-23.jsonl"))).toBe(false);
    } finally {
      first.close();
      await written.stop();
    }

    const failing = await fakeTower("failed");
    const second = createSidecarTower({
      url: failing.url,
      diagLogPath: diag,
      commandTimeoutMs: 1000,
      log,
    });
    try {
      second.connect();
      await second.settled();
      await waitFor(() => second.snapshot().connection === "connected");
      expect(await second.playSound(58, 0)).toBe("failed");
      const commandErrors = readLines(log).filter((line) => line.code.startsWith("tower-command"));
      expect(commandErrors).toEqual([
        expect.objectContaining({
          level: "error",
          source: "server",
          code: "tower-command-failed",
          device: null,
          session: null,
          screen: null,
        }),
      ]);
      expect(readFileSync(diag, "utf8")).not.toContain("tower-command-failed");
    } finally {
      second.close();
      await failing.stop();
    }
  });

  it("writes a timeout line when tower-poc ends the command timed-out", async () => {
    const log = logger();
    const fake = await fakeTower("timed-out");
    const tower = createSidecarTower({ url: fake.url, commandTimeoutMs: 1000, log });
    try {
      tower.connect();
      await tower.settled();
      await waitFor(() => tower.snapshot().connection === "connected");
      expect(await tower.playSound(58, 1)).toBe("failed");
      expect(readLines(log).map((line) => line.code)).toEqual(["tower-command-timeout"]);
    } finally {
      tower.close();
      await fake.stop();
    }
  });

  it("writes an error line when a command gets no answer", async () => {
    const log = logger();
    const fake = await fakeTower("close");
    const tower = createSidecarTower({
      url: fake.url,
      commandTimeoutMs: 1000,
      log,
    });
    try {
      tower.connect();
      await tower.settled();
      await waitFor(() => tower.snapshot().connection === "connected");
      expect(await tower.playSound(58, 1)).toBe("failed");
      const codes = readLines(log).map((line) => line.code);
      expect(codes).toContain("tower-command-no-answer");
      expect(codes).not.toContain("tower-command-timeout");
    } finally {
      tower.close();
      await fake.stop();
    }
  });

  it("writes an error line when the mock refuses a sound", async () => {
    const log = logger();
    const tower = createMockTower({ log });
    expect(await tower.playSound(58, 0)).toBe("failed");
    tower.connect();
    expect(await tower.playSound(58, 1)).toBe("written");
    tower.failNextSound();
    expect(await tower.playSound(58, 2)).toBe("failed");
    expect(readLines(log).map((line) => line.code)).toEqual([
      "tower-command-failed",
      "tower-command-failed",
    ]);
    expect(readLines(log).every((line) => line.level === "error" && line.source === "server")).toBe(
      true,
    );
  });
});
