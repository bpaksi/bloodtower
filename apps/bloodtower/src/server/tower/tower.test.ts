import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WebSocketServer } from "ws";
import { createMockTower } from "./mock.ts";
import { runTowerPress } from "./port.ts";
import { createSidecarTower, DEFAULT_SIDECAR_URL, diagLogPathFromEnv } from "./sidecar.ts";
import { mapBattery, mapCalibration, mapConnection, mapFirmware } from "./snapshot.ts";

const waitFor = async (ready: () => boolean) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (ready()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("timed out");
};

describe("tower snapshot", () => {
  it("keeps an unknown battery unavailable, and keeps a known zero", () => {
    expect(mapConnection("connected")).toBe("connected");
    expect(mapConnection("scanning")).toBe("connecting");
    expect(mapConnection("bluetooth-unavailable")).toBe("unavailable");
    expect(mapConnection(undefined)).toBe("unavailable");
    expect(mapCalibration("calibrated")).toEqual({ state: "known", calibrated: true });
    expect(mapCalibration("uncalibrated")).toEqual({ state: "known", calibrated: false });
    expect(mapCalibration(undefined)).toEqual({ state: "unavailable" });
    expect(mapBattery(undefined)).toEqual({ state: "unavailable" });
    expect(mapBattery({ freshness: "unavailable", origin: "unknown" })).toEqual({
      state: "unavailable",
    });
    expect(mapBattery({ freshness: "current", value: { percent: "0" } })).toEqual({
      state: "unavailable",
    });
    expect(mapBattery({ freshness: "current", value: { percent: 0 } })).toEqual({
      state: "known",
      percent: 0,
    });
    expect(mapBattery({ freshness: "stale", value: { percent: 0 } })).toEqual({
      state: "unavailable",
    });
    expect(mapBattery({ freshness: "stale", value: { percent: 40 } })).toEqual({
      state: "unavailable",
    });
  });
});

describe("mock tower", () => {
  it("connects and calibrates only when asked, and never records a cue", () => {
    const tower = createMockTower();
    expect(tower.snapshot().connection).toBe("unavailable");
    expect(tower.snapshot().battery).toEqual({ state: "unavailable" });
    runTowerPress({ ok: true, winner: true, action: "continue" }, tower);
    runTowerPress({ ok: true, winner: false, action: "tower-connect" }, tower);
    expect(tower.sent()).toEqual([]);
    tower.calibrate();
    expect(tower.sent()).toEqual([]);
    runTowerPress({ ok: true, winner: true, action: "tower-connect" }, tower);
    tower.connect();
    expect(tower.sent().map((item) => item.type)).toEqual(["connect"]);
    expect(tower.snapshot().battery).toEqual({ state: "unavailable" });
    tower.setBattery(0);
    expect(tower.snapshot().battery).toEqual({ state: "known", percent: 0 });
    runTowerPress({ ok: true, winner: true, action: "tower-calibrate" }, tower);
    expect(tower.sent().map((item) => item.type)).toEqual(["connect", "calibrate"]);
    expect(tower.snapshot().calibrated).toEqual({ state: "known", calibrated: true });
    expect(tower.sent().some((item) => item.type === "command")).toBe(false);
  });
});

describe("sidecar", () => {
  it("does not open a socket until connect, and does not import the tower library", () => {
    const tower = createSidecarTower({ url: DEFAULT_SIDECAR_URL });
    expect(tower.snapshot().connection).toBe("unavailable");
    expect(tower.sent()).toEqual([]);
    tower.close();
    const sources = readdirSync(import.meta.dirname)
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
      .map((name) => readFileSync(join(import.meta.dirname, name), "utf8"))
      .join("\n");
    expect(sources).not.toContain("ultimatedarktower");
    expect(sources).not.toContain("@stoprocent/noble");
    expect(sources).not.toContain('type: "command"');
    expect(sources).not.toContain("type: 'command'");
    // The one command the sidecar sends is a sound with a volume. No lights, no other capability.
    expect(sources.match(/capabilityId/g)?.length).toBe(1);
    expect(sources).toContain('SOUND_CAPABILITY = "sound.play-stateful"');
    expect(sources).not.toMatch(/lighting\.|mechanics\.|seals\./);
  });

  it("sends hello and connect, reads battery without turning unknown into zero, and does not reconnect", async () => {
    const received: string[] = [];
    let live: import("ws").WebSocket | undefined;
    const server = new WebSocketServer({ port: 0, host: "127.0.0.1" });
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("port");
    const dir = mkdtempSync(join(tmpdir(), "bloodtower-diag-"));
    const diag = join(dir, "diag.jsonl");
    server.on("connection", (socket) => {
      live = socket;
      socket.on("message", (raw) => {
        const message = JSON.parse(String(raw)) as { type?: string };
        received.push(message.type ?? "");
        if (message.type === "hello") {
          // tower-poc's reply to hello: welcome, where the tower stands, then state.
          socket.send(JSON.stringify({ v: 1, type: "welcome", payload: {} }));
          socket.send(
            JSON.stringify({ v: 1, type: "connection", payload: { state: "disconnected" } }),
          );
          socket.send(JSON.stringify({ v: 1, type: "state", payload: { snapshot: {} } }));
        }
        if (message.type === "connect") {
          socket.send(
            JSON.stringify({
              v: 1,
              type: "connection",
              payload: { state: "connected", calibration: "uncalibrated" },
            }),
          );
        }
        if (message.type === "calibrate") {
          socket.send(
            JSON.stringify({
              v: 1,
              type: "connection",
              payload: { state: "connected", calibration: "calibrated" },
            }),
          );
        }
      });
    });
    const tower = createSidecarTower({
      url: `ws://127.0.0.1:${address.port}`,
      diagLogPath: diag,
    });
    try {
      tower.connect();
      await tower.settled();
      await waitFor(() => tower.snapshot().connection === "connected");
      expect(received).toEqual(["hello", "connect"]);
      expect(tower.snapshot().battery).toEqual({ state: "unavailable" });
      expect(tower.snapshot().calibrated).toEqual({ state: "known", calibrated: false });
      live?.send(
        JSON.stringify({
          v: 1,
          type: "state",
          payload: {
            snapshot: {
              "battery.level": {
                freshness: "current",
                value: { millivolts: 0, percent: 0 },
                origin: "device-reported",
                updatedAt: 1,
              },
            },
          },
        }),
      );
      await waitFor(() => tower.snapshot().battery.state === "known");
      expect(tower.snapshot().battery).toEqual({ state: "known", percent: 0 });
      tower.calibrate();
      await waitFor(
        () => JSON.stringify(tower.snapshot().calibrated) === '{"state":"known","calibrated":true}',
      );
      expect(received).toEqual(["hello", "connect", "calibrate"]);
      for (const client of server.clients) client.close();
      await waitFor(() => tower.snapshot().connection === "disconnected");
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(received.filter((type) => type === "hello")).toEqual(["hello"]);
      tower.connect();
      await waitFor(() => received.filter((type) => type === "hello").length === 2);
      expect(received).not.toContain("command");
      const log = readFileSync(diag, "utf8");
      expect(log).toContain("connect");
      expect(log).not.toContain("command");
      expect(log).not.toContain("bytes");
      expect(diagLogPathFromEnv({})).toBeUndefined();
      expect(diagLogPathFromEnv({ DIAG_LOG: diag })).toBe(diag);
      expect(diagLogPathFromEnv({ DIAG_LOG: "" })).toBeUndefined();
    } finally {
      tower.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      rmSync(dir, { recursive: true, force: true });
    }
  });

  const fakeTowerPoc = async (
    hello: { state: string },
    onConnect: (socket: import("ws").WebSocket) => void,
  ) => {
    const received: string[] = [];
    const server = new WebSocketServer({ port: 0, host: "127.0.0.1" });
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("port");
    server.on("connection", (socket) => {
      socket.on("message", (raw) => {
        const message = JSON.parse(String(raw)) as { type?: string };
        received.push(message.type ?? "");
        if (message.type === "hello") {
          socket.send(JSON.stringify({ v: 1, type: "welcome", payload: {} }));
          socket.send(JSON.stringify({ v: 1, type: "connection", payload: hello }));
          socket.send(
            JSON.stringify({
              v: 1,
              type: "state",
              payload: {
                snapshot: {
                  "battery.level": { freshness: "current", value: { percent: 80 } },
                },
              },
            }),
          );
        }
        if (message.type === "connect") onConnect(socket);
      });
    });
    const stop = () => new Promise<void>((resolve) => server.close(() => resolve()));
    return { received, url: `ws://127.0.0.1:${address.port}`, server, stop };
  };

  it("stays connecting through tower-poc's hello reply until the connect is answered", async () => {
    let answer: (() => void) | undefined;
    const fake = await fakeTowerPoc({ state: "disconnected" }, (socket) => {
      answer = () =>
        socket.send(JSON.stringify({ v: 1, type: "connection", payload: { state: "connected" } }));
    });
    const tower = createSidecarTower({ url: fake.url });
    const trace: string[] = [];
    try {
      tower.connect();
      await waitFor(() => {
        const connection = tower.snapshot().connection;
        if (trace.at(-1) !== connection) trace.push(connection);
        return tower.snapshot().battery.state === "known" && fake.received.includes("connect");
      });
      expect(tower.snapshot().connection).toBe("connecting");
      answer?.();
      await waitFor(() => {
        const connection = tower.snapshot().connection;
        if (trace.at(-1) !== connection) trace.push(connection);
        return connection === "connected";
      });
      expect(trace).not.toContain("disconnected");
      expect(fake.received).toEqual(["hello", "connect"]);
    } finally {
      tower.close();
      await fake.stop();
    }
  });

  it("keeps connecting through a broadcast that is not the answer to its connect", async () => {
    const frame = (state: string) =>
      JSON.stringify({ v: 1, type: "connection", payload: { state } });
    let next: ((state: string) => void) | undefined;
    // Another client's disconnect lands after our connect is sent, before tower-poc reads it.
    const fake = await fakeTowerPoc({ state: "disconnected" }, (socket) => {
      next = (state) => socket.send(frame(state));
      socket.send(frame("disconnected"));
    });
    const tower = createSidecarTower({ url: fake.url });
    const trace: string[] = [];
    const watch = (until: () => boolean) =>
      waitFor(() => {
        const connection = tower.snapshot().connection;
        if (trace.at(-1) !== connection) trace.push(connection);
        return until();
      });
    try {
      tower.connect();
      await watch(() => fake.received.includes("connect"));
      await new Promise((resolve) => setTimeout(resolve, 30));
      await watch(() => true);
      expect(tower.snapshot().connection).toBe("connecting");
      next?.("connecting");
      next?.("connected");
      await watch(() => tower.snapshot().connection === "connected");
      expect(trace).not.toContain("disconnected");
      // Once answered, a later drop is reported as usual.
      next?.("disconnected");
      await watch(() => tower.snapshot().connection === "disconnected");
    } finally {
      tower.close();
      await fake.stop();
    }
  });

  it("does not send connect when tower-poc already has the tower", async () => {
    const fake = await fakeTowerPoc({ state: "connected" }, () => undefined);
    const tower = createSidecarTower({ url: fake.url });
    try {
      tower.connect();
      await waitFor(() => tower.snapshot().connection === "connected");
      await waitFor(() => tower.snapshot().battery.state === "known");
      expect(fake.received).toEqual(["hello"]);
    } finally {
      tower.close();
      await fake.stop();
    }
  });

  it("returns to the reported reading when tower-poc refuses the connect", async () => {
    const fake = await fakeTowerPoc({ state: "disconnected" }, (socket) => {
      socket.send(
        JSON.stringify({
          v: 1,
          type: "error",
          payload: { code: "invalid-state", message: "Busy." },
        }),
      );
    });
    const tower = createSidecarTower({ url: fake.url });
    try {
      tower.connect();
      await waitFor(() => fake.received.includes("connect"));
      await waitFor(() => tower.snapshot().connection === "disconnected");
      expect(fake.received).toEqual(["hello", "connect"]);
    } finally {
      tower.close();
      await fake.stop();
    }
  });
});

describe("tower sound", () => {
  it("reads the firmware revision, and keeps a missing or blank one unavailable", () => {
    expect(mapFirmware({ firmwareRevision: "1.2.3" })).toEqual({
      state: "known",
      version: "1.2.3",
    });
    expect(mapFirmware({ firmwareRevision: "" })).toEqual({ state: "unavailable" });
    expect(mapFirmware({ firmwareRevision: "  " })).toEqual({ state: "unavailable" });
    expect(mapFirmware({ firmwareRevision: null })).toEqual({ state: "unavailable" });
    expect(mapFirmware(undefined)).toEqual({ state: "unavailable" });
  });

  it("records a sound and fails while no tower is connected, and fails once on request", async () => {
    const tower = createMockTower();
    expect(await tower.playSound(58, 0)).toBe("failed");
    expect(tower.sent()).toEqual([]);
    tower.connect();
    expect(await tower.playSound(58, 1)).toBe("written");
    tower.failNextSound();
    expect(await tower.playSound(58, 2)).toBe("failed");
    expect(await tower.playSound(58, 2)).toBe("written");
    expect(tower.sent().filter((item) => item.type === "sound")).toEqual([
      { type: "sound", soundIndex: 58, volume: 1 },
      { type: "sound", soundIndex: 58, volume: 2 },
    ]);
  });

  it("sends sound.play-stateful as a command with an id, resolves on write-completed, and reads the firmware", async () => {
    const commands: Array<{ id?: string; payload?: unknown }> = [];
    const server = new WebSocketServer({ port: 0, host: "127.0.0.1" });
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("port");
    let outcome: "write-completed" | "failed" | "unwritten" = "write-completed";
    server.on("connection", (socket) => {
      socket.on("message", (raw) => {
        const message = JSON.parse(String(raw)) as {
          type?: string;
          id?: string;
          payload?: unknown;
        };
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
              payload: {
                state: "connected",
                calibration: "calibrated",
                device: { firmwareRevision: "2.0.1" },
              },
            }),
          );
        }
        if (message.type === "command") {
          commands.push({ id: message.id, payload: message.payload });
          // A queued frame does not end the wait; the stage after it does.
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
          socket.send(
            JSON.stringify({
              v: 1,
              type: "command.lifecycle",
              payload: {
                commandId: message.id,
                capabilityId: "sound.play-stateful",
                stage: outcome === "unwritten" ? "indeterminate" : outcome,
                ...(outcome === "unwritten" ? { written: false } : {}),
              },
            }),
          );
        }
      });
    });
    const tower = createSidecarTower({ url: `ws://127.0.0.1:${address.port}` });
    try {
      // No tower yet: nothing is sent.
      expect(await tower.playSound(58, 0)).toBe("failed");
      expect(commands).toEqual([]);
      tower.connect();
      await tower.settled();
      await waitFor(() => tower.snapshot().connection === "connected");
      expect(tower.snapshot().firmware).toEqual({ state: "known", version: "2.0.1" });

      expect(await tower.playSound(58, 2)).toBe("written");
      expect(commands).toEqual([
        {
          id: "bt-sound-1",
          payload: { capabilityId: "sound.play-stateful", params: { soundIndex: 58, volume: 2 } },
        },
      ]);
      outcome = "failed";
      expect(await tower.playSound(58, 1)).toBe("failed");
      // A command tower-poc never wrote is not a sound that played.
      outcome = "unwritten";
      expect(await tower.playSound(58, 0)).toBe("failed");
      // A failed sound is not sent again by the sidecar.
      expect(commands).toHaveLength(3);
      expect(tower.sent().map((item) => item.type)).toEqual([
        "hello",
        "connect",
        "sound",
        "sound",
        "sound",
      ]);
    } finally {
      tower.close();
      server.close();
    }
  });
});
