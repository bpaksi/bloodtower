import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROTOCOL_VERSION, type ServerMessage, serverMessageSchema } from "bloodtower-protocols";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";
import { OPENING_MOMENTS, openingPromptId } from "../../protocols/opening.ts";
import { loadConfig } from "../config.ts";
import { openDatabase } from "../db/client.ts";
import { autosave } from "../db/schema.ts";
import { createSessionStore } from "../db/store.ts";
import { createEventStore } from "../events/store.ts";
import { createHostLogger, type HostLogger } from "../log/hostLog.ts";
import type { BloodtowerTower } from "../tower/host.ts";
import { createMockTower } from "../tower/mock.ts";
import { bloodtowerTowerFromMock } from "../tower/testAdapter.ts";
import { type SessionHost, startSessionHost } from "./host.ts";

const dirs: string[] = [];
const hosts: SessionHost[] = [];
const sockets: WebSocket[] = [];

afterEach(async () => {
  for (const socket of sockets) socket.close();
  sockets.length = 0;
  for (const host of hosts) await host.close();
  hosts.length = 0;
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  dirs.length = 0;
});

const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-hub-"));
  dirs.push(dir);
  return dir;
};

const start = async (extra?: { devOrigins?: string[]; packsDir?: string; log?: HostLogger }) => {
  const root = tempDir();
  writeFileSync(join(root, "index.html"), "<h1>Bloodtower</h1>");
  const host = await startSessionHost({
    port: 0,
    host: "127.0.0.1",
    webRoot: root,
    packsDir: extra?.packsDir ?? loadConfig().packsDir,
    databasePath: join(tempDir(), "session.sqlite"),
    tower: bloodtowerTowerFromMock(createMockTower()),
    towerWatchMs: 0,
    devOrigins: extra?.devOrigins,
    log: extra?.log,
  });
  hosts.push(host);
  return host;
};

class Inbox {
  private queue: ServerMessage[] = [];
  private waiters: Array<(message: ServerMessage) => void> = [];

  push(message: ServerMessage) {
    const waiter = this.waiters.shift();
    if (waiter) waiter(message);
    else this.queue.push(message);
  }

  next(): Promise<ServerMessage> {
    const queued = this.queue.shift();
    if (queued) return Promise.resolve(queued);
    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }
}

const track = (socket: WebSocket) => {
  const log: ServerMessage[] = [];
  const inbox = new Inbox();
  socket.on("message", (raw) => {
    const message = serverMessageSchema.parse(JSON.parse(String(raw)));
    log.push(message);
    inbox.push(message);
  });
  return { log, inbox };
};

const until = async (
  inbox: Inbox,
  log: ServerMessage[],
  ready: (messages: ServerMessage[]) => boolean,
) => {
  const startMs = Date.now();
  while (!ready(log)) {
    if (Date.now() - startMs > 5000) throw new Error(`timed out after ${log.length} messages`);
    await inbox.next();
  }
};

const connect = async (port: number, origin?: string) => {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`, origin ? { origin } : {});
  sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once("open", () => resolve());
    socket.once("error", reject);
  });
  return { socket, ...track(socket) };
};

const send = (socket: WebSocket, type: string, payload: unknown, id?: string) => {
  socket.send(JSON.stringify({ v: PROTOCOL_VERSION, type, ...(id ? { id } : {}), payload }));
};

const helloBoard = async (port: number) => {
  const client = await connect(port);
  send(client.socket, "hello", {
    role: "storyboard",
    clientLabel: "Story board",
    formFactor: "mac",
  });
  await until(client.inbox, client.log, (messages) =>
    messages.some((message) => message.type === "boardView"),
  );
  return client;
};

const helloDevice = async (
  port: number,
  payload: { formFactor: "ipad" | "phone"; joinCode?: string; token?: string },
) => {
  const client = await connect(port);
  send(client.socket, "hello", {
    role: "device",
    clientLabel: payload.formFactor === "phone" ? "Phone" : "iPad",
    ...payload,
  });
  await until(client.inbox, client.log, (messages) =>
    messages.some((message) => message.type === "welcome"),
  );
  return client;
};

const act = async (
  client: ReturnType<typeof track> & { socket: WebSocket },
  promptId: string,
  actionId: string,
  args: Record<string, unknown> = {},
) => {
  send(client.socket, "act", { promptId, actionId, args });
};

describe("session hub (core)", () => {
  it("serves static pages and v2 health", async () => {
    const host = await start();
    const page = await fetch(`http://127.0.0.1:${host.port}/`);
    expect(page.status).toBe(200);
    const health = await fetch(`http://127.0.0.1:${host.port}/health`);
    expect(await health.json()).toEqual({
      protocol: 2,
      tower: "connection-and-sound",
      effects: "sound-only",
    });
    await expect(connect(host.port, "https://evil.example")).rejects.toThrow(/403/);
  });

  it("broadcasts boardView and deviceView on v2", async () => {
    const host = await start();
    const board = await helloBoard(host.port);
    const latestBoard = [...board.log].reverse().find((m) => m.type === "boardView");
    expect(latestBoard?.type).toBe("boardView");
    expect(latestBoard?.v).toBe(2);
    expect(latestBoard?.payload.levels[0]?.shows).toContain(host.joinCode);

    const device = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    await until(device.inbox, device.log, (messages) =>
      messages.some((m) => m.type === "deviceView"),
    );
    const latestDevice = [...device.log].reverse().find((m) => m.type === "deviceView");
    expect(latestDevice?.payload.screen).toBe("base-board");
  });

  it("refuses control from the story board", async () => {
    const host = await start();
    const board = await helloBoard(host.port);
    send(board.socket, "act", { promptId: "session-new-game", actionId: "new-game", args: {} });
    await until(board.inbox, board.log, (messages) =>
      messages.some((m) => m.type === "error" && m.payload.code === "storyboard-control"),
    );
  });

  it("writes POST /log from an allowed dev origin", async () => {
    const dataDir = tempDir();
    const log = createHostLogger({
      dataDir,
      mirror: false,
      now: () => new Date("2026-10-23T12:00:00.000Z"),
    });
    const host = await start({ log, devOrigins: ["http://127.0.0.1:3000"] });
    const url = `http://127.0.0.1:${host.port}/log`;
    const posted = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://127.0.0.1:3000" },
      body: JSON.stringify({
        level: "error",
        source: "board",
        device: null,
        session: null,
        screen: "board",
        code: "test-log",
        message: "A page line.",
      }),
    });
    expect(posted.status).toBe(204);
    const day = "2026-10-23";
    const lines = readFileSync(join(dataDir, "logs", `${day}.jsonl`), "utf8")
      .trim()
      .split("\n");
    expect(lines.length).toBeGreaterThan(0);
    expect(JSON.parse(lines.at(-1) ?? "{}")).toMatchObject({ code: "test-log" });
  });

  it("applies hero-hold through act on claim-heroes", async () => {
    const host = await start();
    const board = await helloBoard(host.port);
    const device = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    await act(device, "base-board-done", "board-set-up");
    await act(device, "play-without-tower", "play-without-tower");
    await act(device, "continue-pick-story-test", "continue");
    await act(device, "continue-game-settings", "continue");
    await act(device, "hero-hold", "take", { heroId: "hero-a" });
    await new Promise((resolve) => setTimeout(resolve, 200));
    await until(board.inbox, board.log, (messages) => {
      const view = [...messages].reverse().find((m) => m.type === "boardView");
      return (
        view?.type === "boardView" &&
        view.payload.screen === "claim-heroes" &&
        view.payload.heroes.some((hero) => hero.id === "hero-a" && hero.held)
      );
    });
  });

  it("steps a device from the Enter to pick-story with act", async () => {
    const host = await start();
    await helloBoard(host.port);
    const device = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    await act(device, "base-board-done", "board-set-up");
    await act(device, "play-without-tower", "play-without-tower");
    await until(device.inbox, device.log, (messages) => {
      const state = [...messages].reverse().find((m) => m.type === "deviceView");
      return state?.type === "deviceView" && state.payload.screen === "pick-story";
    });
  });
});

// C3-01 EV-07: a save from before pack v2 (no `format`, or `format: 1`) is kept and ignored.
const OLD_GAME = "game-old";
// The play-through tests walk the whole setup over a socket.
vi.setConfig({ testTimeout: 30_000 });

const withDatabase = <T>(
  databasePath: string,
  use: (opened: ReturnType<typeof openDatabase>) => T,
): T => {
  const opened = openDatabase(databasePath);
  try {
    return use(opened);
  } finally {
    opened.close();
  }
};

const seedAutosave = (databasePath: string, format: number | null) =>
  withDatabase(databasePath, (opened) => {
    createSessionStore(opened.db).saveRoster({
      sessionId: "session-old",
      packId: "test",
      packVersion: "0.1.0",
      startedWall: "2026-10-30T00:00:00.000Z",
      joinCode: "000000",
      devices: [],
      holdings: [],
    });
    createEventStore(opened.db).setAutosave({
      gameId: OLD_GAME,
      sessionId: "session-old",
      packId: "test",
    });
    // setAutosave writes the current format, so the old row is made by overwriting it.
    opened.db.update(autosave).set({ format }).run();
  });

const readAutosave = (databasePath: string) =>
  withDatabase(databasePath, (opened) => createEventStore(opened.db).getAutosave());

const warnSpy = () => {
  const calls: Array<{ code: string; message: string }> = [];
  const real = createHostLogger({ dataDir: tempDir(), mirror: false });
  const log: HostLogger = {
    ...real,
    warn: (code, message, fields) => {
      calls.push({ code, message });
      real.warn(code, message, fields);
    },
  };
  return { log, calls };
};

const startAt = async (databasePath: string, log: HostLogger) => {
  const root = tempDir();
  writeFileSync(join(root, "index.html"), "<h1>Bloodtower</h1>");
  const host = await startSessionHost({
    port: 0,
    host: "127.0.0.1",
    webRoot: root,
    packsDir: loadConfig().packsDir,
    databasePath,
    tower: bloodtowerTowerFromMock(createMockTower()),
    towerWatchMs: 0,
    log,
  });
  hosts.push(host);
  return host;
};

type Device = Awaited<ReturnType<typeof helloDevice>>;

const offered = (device: Device) => {
  const view = [...device.log].reverse().find((m) => m.type === "deviceView");
  return view?.type === "deviceView" ? view.payload.actions : [];
};

const whenOffered = async (device: Device, promptId: string) => {
  const startMs = Date.now();
  while (!offered(device).some((a) => a.promptId === promptId)) {
    if (Date.now() - startMs > 4000) {
      const seen = offered(device)
        .map((a) => a.promptId)
        .join(", ");
      throw new Error(`${promptId} was never offered (offered: ${seen})`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

const press = async (
  device: Device,
  promptId: string,
  actionId: string,
  args: Record<string, unknown> = {},
) => {
  await whenOffered(device, promptId);
  await act(device, promptId, actionId, args);
  await new Promise((resolve) => setTimeout(resolve, 60));
};

/** Enter, Pick story, settings, heroes, setup and Begin: the first autosave is written there. */
const playToBegin = async (device: Device) => {
  await press(device, "base-board-done", "board-set-up");
  await press(device, "play-without-tower", "play-without-tower");
  await press(device, "continue-pick-story-test", "continue");
  await press(device, "continue-game-settings", "continue");
  for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
    // Hero holds are not listed as offered actions, so they are sent without waiting.
    await act(device, "hero-hold", "take", { heroId });
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
  await press(device, "continue-claim-heroes", "continue");
  for (let step = 0; step < 12; step += 1) {
    const spin = offered(device).find((a) => a.promptId.startsWith("spin-setup-"));
    if (spin) {
      await press(device, spin.promptId, "spin");
      continue;
    }
    const next = offered(device).find((a) => a.promptId.startsWith("continue-setup-"));
    if (!next) break;
    await press(device, next.promptId, "continue");
  }
  await press(device, "continue-begin", "continue");
};

const waitForNewAutosave = async (databasePath: string) => {
  const startMs = Date.now();
  for (;;) {
    const row = readAutosave(databasePath);
    if (row && row.gameId !== OLD_GAME && row.format === 3) return row;
    if (Date.now() - startMs > 5000) throw new Error("no new format 3 autosave was written");
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

describe.each([
  { label: "no format", format: null, version: "none" },
  { label: "format: 1", format: 1, version: "1" },
  { label: "format: 2 (a C3 save)", format: 2, version: "2" },
])("a pre-C4 autosave with $label (C3-01 EV-07, C4-01 EV-06)", ({ format, version }) => {
  const era = format === 2 ? "pre-C4" : "pre-C3";
  it("warns once, keeps the row unchanged, offers no Continue, and starts fresh", async () => {
    const databasePath = join(tempDir(), "session.sqlite");
    seedAutosave(databasePath, format);
    const before = readAutosave(databasePath);
    expect(before).toEqual({
      gameId: OLD_GAME,
      sessionId: "session-old",
      packId: "test",
      format,
    });

    const { log, calls } = warnSpy();
    const host = await startAt(databasePath, log);
    expect(calls).toEqual([
      { code: "save-skipped", message: `save skipped: ${era} format ${version} (pack test)` },
    ]);
    expect(readAutosave(databasePath)).toEqual(before);

    const device = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    await press(device, "base-board-done", "board-set-up");
    await press(device, "play-without-tower", "play-without-tower");
    await whenOffered(device, "continue-pick-story-test");
    expect(offered(device).some((a) => a.promptId === "continue-saved-game")).toBe(false);
    expect(calls).toHaveLength(1);
    expect(readAutosave(databasePath)).toEqual(before);
  });

  it("names pack test in its one skipped log line and matches no other pack (C3-03 EV-08)", async () => {
    const databasePath = join(tempDir(), "session.sqlite");
    seedAutosave(databasePath, format);
    const before = readAutosave(databasePath);
    const { log, calls } = warnSpy();
    const host = await startAt(databasePath, log);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.message).toMatch(
      new RegExp(`^save skipped: ${era} format .* \\(pack test\\)$`),
    );
    expect(readAutosave(databasePath)).toEqual(before);
    const device = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    await press(device, "base-board-done", "board-set-up");
    await press(device, "play-without-tower", "play-without-tower");
    await whenOffered(device, "continue-pick-story-test");
    expect(offered(device).some((a) => a.promptId === "continue-saved-game")).toBe(false);
  });

  it("lets a New game run clean and replaces the old row with a format 3 save", async () => {
    const databasePath = join(tempDir(), "session.sqlite");
    seedAutosave(databasePath, format);
    const { log, calls } = warnSpy();
    const host = await startAt(databasePath, log);
    await helloBoard(host.port);
    const device = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    await playToBegin(device);
    const row = await waitForNewAutosave(databasePath);
    expect(row.format).toBe(3);
    expect(calls.filter((call) => call.code === "save-skipped")).toHaveLength(1);
  });
});

describe("a format 3 autosave (C3-01 EV-07)", () => {
  it("is written as format 3 and Continue restores it after a restart", async () => {
    const databasePath = join(tempDir(), "session.sqlite");
    const first = warnSpy();
    const host = await startAt(databasePath, first.log);
    await helloBoard(host.port);
    const device = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    await playToBegin(device);
    const written = await waitForNewAutosave(databasePath);
    expect(written.format).toBe(3);
    for (const socket of sockets.splice(0)) socket.close();
    await host.close();
    hosts.splice(hosts.indexOf(host), 1);

    const second = warnSpy();
    const again = await startAt(databasePath, second.log);
    expect(second.calls.filter((call) => call.code === "save-skipped")).toEqual([]);
    const pad = await helloDevice(again.port, { formFactor: "ipad", joinCode: again.joinCode });
    // The restart resumes tonight's Enter, so Pick story offers Continue straight away.
    await press(pad, "continue-saved-game", "continue");
    await until(pad.inbox, pad.log, () => {
      const view = [...pad.log].reverse().find((m) => m.type === "deviceView");
      return view?.type === "deviceView" && view.payload.screen !== "pick-story";
    });
    expect(readAutosave(databasePath)?.format).toBe(3);
  });
});

const deviceViews = (client: Device) =>
  client.log.filter(
    (m): m is Extract<ServerMessage, { type: "deviceView" }> => m.type === "deviceView",
  );

const boardViews = (client: ReturnType<typeof track> & { socket: WebSocket }) =>
  client.log.filter(
    (m): m is Extract<ServerMessage, { type: "boardView" }> => m.type === "boardView",
  );

describe("CU17 seq and acked on deviceView (EV-01 to EV-05)", () => {
  it("CU17 EV-01: every device view carries integer seq (1, 2, 3...) and acked", async () => {
    const host = await start();
    const device = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    await whenOffered(device, "base-board-done");
    await act(device, "base-board-done", "board-set-up");
    await until(device.inbox, device.log, () =>
      deviceViews(device).some((frame) => frame.payload.acked === 1),
    );

    const views = deviceViews(device);
    expect(views.length).toBeGreaterThanOrEqual(2);
    for (let index = 0; index < views.length; index += 1) {
      const payload = views[index]?.payload;
      expect(Number.isInteger(payload?.seq)).toBe(true);
      expect(Number.isInteger(payload?.acked)).toBe(true);
      expect(payload?.seq).toBe(index + 1);
    }
    const last = views.at(-1)?.payload;
    expect(last?.acked).toBe(1);
    expect(last?.screen).toBe("tower-choice");
  });

  it("CU17 EV-02: acked rises only after apply finishes, not on a timer broadcast while held", async () => {
    const root = tempDir();
    writeFileSync(join(root, "index.html"), "<h1>Bloodtower</h1>");
    const mock = createMockTower();
    const base = bloodtowerTowerFromMock(mock);
    let holdCalibrate = false;
    let enteredResolve = () => {};
    const calibrateEntered = new Promise<void>((resolve) => {
      enteredResolve = resolve;
    });
    let releaseCalibrate = () => {};
    const calibrateGate = new Promise<void>((resolve) => {
      releaseCalibrate = resolve;
    });
    let triggerWatchDiff = false;
    const tower: BloodtowerTower = {
      snapshot: () => {
        const snap = base.snapshot();
        if (!triggerWatchDiff) return snap;
        return { ...snap, calibrated: { state: "unavailable" } };
      },
      subscribe: (listener) => base.subscribe(listener),
      runCapability: async (capabilityId, params, log) => {
        const result = await base.runCapability(capabilityId, params, log);
        if (capabilityId === "tower.calibrate" && holdCalibrate) {
          holdCalibrate = false;
          enteredResolve();
          await calibrateGate;
        }
        return result;
      },
      close: () => base.close(),
    };
    const host = await startSessionHost({
      port: 0,
      host: "127.0.0.1",
      webRoot: root,
      packsDir: loadConfig().packsDir,
      databasePath: join(tempDir(), "session.sqlite"),
      tower,
      towerWatchMs: 25,
    });
    hosts.push(host);

    const device = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    await whenOffered(device, "base-board-done");
    await act(device, "base-board-done", "board-set-up");
    await until(device.inbox, device.log, () =>
      deviceViews(device).some((frame) => frame.payload.acked === 1),
    );
    await whenOffered(device, "tower-connect");
    await act(device, "tower-connect", "tower-connect");
    await until(device.inbox, device.log, () =>
      deviceViews(device).some((frame) => frame.payload.acked === 2),
    );
    await whenOffered(device, "tower-calibrate");

    const ackedBefore = deviceViews(device).at(-1)?.payload.acked ?? -1;
    expect(ackedBefore).toBe(2);

    holdCalibrate = true;
    await act(device, "tower-calibrate", "tower-calibrate");
    await calibrateEntered;

    // Fire a timer broadcast while apply is held.
    const viewsBeforeTimer = deviceViews(device).length;
    triggerWatchDiff = true;
    await until(device.inbox, device.log, () => deviceViews(device).length > viewsBeforeTimer);
    const timerFrame = deviceViews(device).at(-1)?.payload;
    expect(timerFrame?.acked).toBe(ackedBefore);
    expect(timerFrame?.screen).toBe("tower-wake");

    // Release apply: no frame with the new acked may show tower-wake, and the frame where acked
    // rises to ackedBefore + 1 shows the press's screen (pick-story).
    const viewsBeforeRelease = deviceViews(device).length;
    releaseCalibrate();
    await until(device.inbox, device.log, () =>
      deviceViews(device)
        .slice(viewsBeforeRelease)
        .some((frame) => frame.payload.acked === ackedBefore + 1),
    );
    const afterRelease = deviceViews(device).slice(viewsBeforeRelease);
    const firstAcked = afterRelease.find((frame) => frame.payload.acked === ackedBefore + 1);
    expect(firstAcked?.payload.screen).toBe("pick-story");
    expect(
      deviceViews(device).some(
        (frame) => frame.payload.acked === ackedBefore + 1 && frame.payload.screen !== "pick-story",
      ),
    ).toBe(false);
    // Every frame before the acked frame stayed at ackedBefore.
    const ackedIndex = afterRelease.findIndex((frame) => frame.payload.acked === ackedBefore + 1);
    for (const earlier of afterRelease.slice(0, ackedIndex)) {
      expect(earlier.payload.acked).toBe(ackedBefore);
      expect(earlier.payload.screen).toBe("tower-wake");
    }
  });

  it("CU17 regression: Menu Reconnect -> Calibrate keeps play offers intact after tower-snapshot", async () => {
    const root = tempDir();
    writeFileSync(join(root, "index.html"), "<h1>Bloodtower</h1>");
    const mock = createMockTower();
    const waitFires: Array<() => void> = [];
    const host = await startSessionHost({
      port: 0,
      host: "127.0.0.1",
      webRoot: root,
      packsDir: loadConfig().packsDir,
      databasePath: join(tempDir(), "session.sqlite"),
      tower: bloodtowerTowerFromMock(mock),
      towerWatchMs: 25,
      waitTimer: (fire) => {
        waitFires.push(fire);
        return () => {
          const index = waitFires.indexOf(fire);
          if (index >= 0) waitFires.splice(index, 1);
        };
      },
    });
    hosts.push(host);

    const device = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    const pressAck = async (
      promptId: string,
      actionId: string,
      args: Record<string, unknown> = {},
    ) => {
      const before = deviceViews(device).at(-1)?.payload.acked ?? 0;
      await act(device, promptId, actionId, args);
      await until(device.inbox, device.log, () =>
        deviceViews(device).some((frame) => (frame.payload.acked ?? 0) > before),
      );
    };

    await whenOffered(device, "base-board-done");
    await pressAck("base-board-done", "board-set-up");
    await pressAck("tower-connect", "tower-connect");
    await pressAck("tower-calibrate", "tower-calibrate");
    await pressAck("volume-1", "volume-play");
    await pressAck("volume-keep", "volume-keep");
    await pressAck("continue-pick-story-test", "continue");
    await pressAck("set-setting", "set", { settingId: "hints", optionId: "off" });
    await pressAck("continue-game-settings", "continue");
    for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
      await pressAck("hero-hold", "take", { heroId });
    }
    await pressAck("continue-claim-heroes", "continue");
    for (let step = 0; step < 12; step += 1) {
      const spin = offered(device).find((a) => a.promptId.startsWith("spin-setup-"));
      if (spin) {
        await pressAck(spin.promptId, "spin");
        continue;
      }
      const next = offered(device).find((a) => a.promptId.startsWith("continue-setup-"));
      if (!next) break;
      await pressAck(next.promptId, "continue");
    }
    await pressAck("continue-begin", "continue");
    for (const moment of OPENING_MOMENTS) {
      await pressAck(openingPromptId(moment), "continue");
    }
    while (waitFires.length > 0) waitFires.shift()?.();
    await until(device.inbox, device.log, () =>
      offered(device).some((action) => action.open && action.promptId.endsWith("-roll-done")),
    );
    const roll = offered(device).find(
      (action) => action.open && action.promptId.endsWith("-roll-done"),
    );
    if (!roll) throw new Error("No roll prompt.");
    await pressAck(roll.promptId, roll.actionId);
    expect(offered(device).some((action) => action.open && action.actionId === "end-turn")).toBe(
      true,
    );

    // Drop the tower, confirm Go on without, then reconnect via Menu -> Tower -> Reconnect -> Calibrate.
    mock.loseConnection();
    await until(device.inbox, device.log, () =>
      offered(device).some((action) => action.open && action.actionId === "go-on-without"),
    );
    const goWithout = offered(device).find(
      (action) => action.open && action.actionId === "go-on-without",
    );
    if (!goWithout) throw new Error("No go-on-without prompt.");
    await pressAck(goWithout.promptId, goWithout.actionId);
    expect(deviceViews(device).at(-1)?.payload.screen).toBe("play");

    await pressAck("gear", "open", { item: "tower" });
    await pressAck("gear", "pick", { pick: "Reconnect" });
    await pressAck("gear", "done");
    await whenOffered(device, "tower-calibrate");
    await pressAck("tower-calibrate", "tower-calibrate");

    // Wait for the play screen and confirm play offers stay open (never wiped by tower-snapshot)
    // and remain pressable.
    await until(device.inbox, device.log, () => {
      const latest = deviceViews(device).at(-1)?.payload;
      return (
        latest?.screen === "play" &&
        latest.actions.some((action) => action.open && action.actionId === "end-turn")
      );
    });
    expect(offered(device).some((action) => action.open && action.actionId === "walk")).toBe(true);
    const endTurn = offered(device).find((action) => action.open && action.actionId === "end-turn");
    if (!endTurn) throw new Error("No open end-turn after Menu Reconnect -> Calibrate.");
    await pressAck(endTurn.promptId, endTurn.actionId);
    expect(deviceViews(device).at(-1)?.payload.screen).toBe("play");
  });

  it("CU17 EV-01: two open sockets for the same device share one gap-free seq sequence", async () => {
    const host = await start();
    const first = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    await whenOffered(first, "base-board-done");
    const welcome = first.log.find(
      (frame): frame is Extract<ServerMessage, { type: "welcome" }> => frame.type === "welcome",
    );
    if (!welcome) throw new Error("No welcome frame on first socket.");

    // Open a second socket for the same device token while the first socket is still open.
    const second = await helloDevice(host.port, {
      formFactor: "ipad",
      token: welcome.payload.token,
    });
    await until(second.inbox, second.log, () => deviceViews(second).length > 0);

    // Exercise both broadcastImpl (valid press) and sendDeviceViewImpl (refused press).
    await act(first, "base-board-done", "board-set-up");
    await until(first.inbox, first.log, () =>
      deviceViews(first).some((frame) => frame.payload.acked === 1),
    );
    await until(second.inbox, second.log, () =>
      deviceViews(second).some((frame) => frame.payload.acked === 1),
    );

    await act(second, "hero-hold", "take", {});
    await until(first.inbox, first.log, () =>
      deviceViews(first).some((frame) => frame.payload.acked === 2),
    );
    await until(second.inbox, second.log, () =>
      deviceViews(second).some((frame) => frame.payload.acked === 2),
    );

    const firstSeqs = deviceViews(first).map((frame) => frame.payload.seq);
    const secondSeqs = deviceViews(second).map((frame) => frame.payload.seq);
    expect(firstSeqs.length).toBeGreaterThanOrEqual(4);
    expect(secondSeqs.length).toBeGreaterThanOrEqual(3);

    // First socket sees 1, 2, 3, ... with no gap or repeat.
    for (let index = 0; index < firstSeqs.length; index += 1) {
      expect(firstSeqs[index]).toBe(index + 1);
    }
    // Second socket sees consecutive integers starting at its join broadcast, matching first's tail.
    const startSeq = secondSeqs[0] ?? 0;
    expect(startSeq).toBeGreaterThan(1);
    for (let index = 0; index < secondSeqs.length; index += 1) {
      expect(secondSeqs[index]).toBe(startSeq + index);
    }
    expect(secondSeqs.at(-1)).toBe(firstSeqs.at(-1));
    expect(deviceViews(first).at(-1)?.payload.acked).toBe(2);
    expect(deviceViews(second).at(-1)?.payload.acked).toBe(2);
  });

  it("CU17 EV-03: refused and no-op presses still ack and preserve error logs and frames", async () => {
    const errors: Array<{ code: string; message: string }> = [];
    const real = createHostLogger({ dataDir: tempDir(), mirror: false });
    const log: HostLogger = {
      ...real,
      error: (code, message, fields) => {
        errors.push({ code, message });
        real.error(code, message, fields);
      },
    };
    const root = tempDir();
    writeFileSync(join(root, "index.html"), "<h1>Bloodtower</h1>");
    const waitFires: Array<() => void> = [];
    const host = await startSessionHost({
      port: 0,
      host: "127.0.0.1",
      webRoot: root,
      packsDir: loadConfig().packsDir,
      databasePath: join(tempDir(), "session.sqlite"),
      tower: bloodtowerTowerFromMock(createMockTower({ log })),
      towerWatchMs: 0,
      waitTimer: (fire) => {
        waitFires.push(fire);
        return () => {
          const index = waitFires.indexOf(fire);
          if (index >= 0) waitFires.splice(index, 1);
        };
      },
      allowTestSeed: true,
      log,
    });
    hosts.push(host);

    const pad1 = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    const pad2 = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    await until(pad1.inbox, pad1.log, () => deviceViews(pad1).length > 0);
    await until(pad2.inbox, pad2.log, () => deviceViews(pad2).length > 0);

    // (a) hero-hold take with no heroId -> still acks.
    const pad2BeforeA = deviceViews(pad2).at(-1)?.payload.acked ?? 0;
    await act(pad2, "hero-hold", "take", {});
    await until(pad2.inbox, pad2.log, () =>
      deviceViews(pad2).some((frame) => frame.payload.acked === pad2BeforeA + 1),
    );

    // (c) gear action "bogus" -> logs gear-act error and still acks.
    const pad2BeforeC = deviceViews(pad2).at(-1)?.payload.acked ?? 0;
    await act(pad2, "gear", "bogus", {});
    await until(pad2.inbox, pad2.log, () =>
      deviceViews(pad2).some((frame) => frame.payload.acked === pad2BeforeC + 1),
    );
    expect(errors.some((entry) => entry.code === "gear-act")).toBe(true);

    // Walk pad1 into an open event while pad2 holds no heroes, then test (b) event refusal on pad2.
    const pressAck = async (
      device: Device,
      promptId: string,
      actionId: string,
      args: Record<string, unknown> = {},
    ) => {
      const before = deviceViews(device).at(-1)?.payload.acked ?? 0;
      await act(device, promptId, actionId, args);
      await until(device.inbox, device.log, () =>
        deviceViews(device).some((frame) => (frame.payload.acked ?? 0) > before),
      );
    };
    await whenOffered(pad1, "base-board-done");
    await pressAck(pad1, "base-board-done", "board-set-up");
    await pressAck(pad1, "play-without-tower", "play-without-tower");
    await pressAck(pad1, "continue-pick-story-test", "continue");
    await pressAck(pad1, "set-setting", "set", { settingId: "hints", optionId: "off" });
    await pressAck(pad1, "continue-game-settings", "continue");
    for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
      await pressAck(pad1, "hero-hold", "take", { heroId });
    }
    await pressAck(pad1, "continue-claim-heroes", "continue");
    for (let step = 0; step < 12; step += 1) {
      const spin = offered(pad1).find((a) => a.promptId.startsWith("spin-setup-"));
      if (spin) {
        await pressAck(pad1, spin.promptId, "spin");
        continue;
      }
      const next = offered(pad1).find((a) => a.promptId.startsWith("continue-setup-"));
      if (!next) break;
      await pressAck(pad1, next.promptId, "continue");
    }
    await pressAck(pad1, "continue-begin", "continue");
    for (const moment of OPENING_MOMENTS) {
      await pressAck(pad1, openingPromptId(moment), "continue");
    }
    // Dismiss chapter 1's auto-advancing card wait so the day 1 move roll is offered immediately.
    while (waitFires.length > 0) waitFires.shift()?.();
    await until(pad1.inbox, pad1.log, () =>
      offered(pad1).some((action) => action.open && action.promptId.endsWith("-roll-done")),
    );
    const roll = offered(pad1).find(
      (action) => action.open && action.promptId.endsWith("-roll-done"),
    );
    if (!roll) throw new Error("No roll prompt.");
    await pressAck(pad1, roll.promptId, roll.actionId);
    const pad1Table = deviceViews(pad1).at(-1)?.payload.table;
    const actingGroup = pad1Table?.groups.find((group) => group.heroId === pad1Table.actingHeroId);
    const spaceId = actingGroup?.spaceId;
    if (!spaceId) throw new Error("No acting group space.");
    await host.applyTestSeed(`~test-skulls:${spaceId}=1~test-event:hazard-storm`);
    await until(pad1.inbox, pad1.log, () =>
      offered(pad1).some((action) => action.open && action.actionId === "end-turn"),
    );
    const endTurn = offered(pad1).find((action) => action.open && action.actionId === "end-turn");
    if (!endTurn) throw new Error("No end-turn prompt.");
    await pressAck(pad1, endTurn.promptId, endTurn.actionId);
    await until(pad1.inbox, pad1.log, () =>
      offered(pad1).some((action) => action.open && action.actionId === "choose"),
    );
    const eventChoice = offered(pad1).find((action) => action.open && action.actionId === "choose");
    if (!eventChoice) throw new Error("No event choice offered.");

    // (b) pad2 holds no heroes -> refused, logged, sends error frame, AND sends deviceView with acked + 1.
    const pad2BeforeB = deviceViews(pad2).at(-1)?.payload.acked ?? 0;
    await act(pad2, eventChoice.promptId, eventChoice.actionId);
    await until(pad2.inbox, pad2.log, () =>
      deviceViews(pad2).some((frame) => frame.payload.acked === pad2BeforeB + 1),
    );
    expect(errors.some((entry) => entry.code === "event-press-refused")).toBe(true);
    expect(
      pad2.log.some((frame) => frame.type === "error" && frame.payload.code === "invalid-state"),
    ).toBe(true);
  });

  it("CU17 EV-04: acked and seq are per device", async () => {
    const host = await start();
    const pad1 = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    const pad2 = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    await whenOffered(pad1, "base-board-done");
    await until(pad2.inbox, pad2.log, () => deviceViews(pad2).length > 0);
    const pad2SeqBefore = deviceViews(pad2).at(-1)?.payload.seq ?? 0;

    await act(pad1, "base-board-done", "board-set-up");
    await until(pad1.inbox, pad1.log, () =>
      deviceViews(pad1).some((frame) => frame.payload.acked === 1),
    );
    await whenOffered(pad1, "play-without-tower");
    await act(pad1, "play-without-tower", "play-without-tower");
    await until(pad1.inbox, pad1.log, () =>
      deviceViews(pad1).some((frame) => frame.payload.acked === 2),
    );
    await until(pad2.inbox, pad2.log, () =>
      deviceViews(pad2).some((frame) => frame.payload.screen === "pick-story"),
    );

    expect(deviceViews(pad1).at(-1)?.payload.acked).toBe(2);
    const pad2Views = deviceViews(pad2);
    expect(pad2Views.every((frame) => frame.payload.acked === 0)).toBe(true);
    expect(pad2Views.at(-1)?.payload.seq ?? 0).toBeGreaterThan(pad2SeqBefore);
    for (let index = 0; index < pad2Views.length; index += 1) {
      expect(pad2Views[index]?.payload.seq).toBe(index + 1);
    }
  });

  it("CU17 EV-05: no tower frame on non-tower press or ack view send, and boardView has no seq or acked", async () => {
    const root = tempDir();
    writeFileSync(join(root, "index.html"), "<h1>Bloodtower</h1>");
    const mock = createMockTower();
    const host = await startSessionHost({
      port: 0,
      host: "127.0.0.1",
      webRoot: root,
      packsDir: loadConfig().packsDir,
      databasePath: join(tempDir(), "session.sqlite"),
      tower: bloodtowerTowerFromMock(mock),
      towerWatchMs: 0,
    });
    hosts.push(host);

    const board = await helloBoard(host.port);
    const device = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    await whenOffered(device, "base-board-done");
    await act(device, "base-board-done", "board-set-up");
    await until(device.inbox, device.log, () =>
      deviceViews(device).some((frame) => frame.payload.acked === 1),
    );
    // Also exercise the extra sendDeviceView path on a refused press.
    await act(device, "hero-hold", "take", {});
    await until(device.inbox, device.log, () =>
      deviceViews(device).some((frame) => frame.payload.acked === 2),
    );

    expect(mock.sent()).toEqual([]);
    const boards = boardViews(board);
    expect(boards.length).toBeGreaterThan(0);
    for (const frame of boards) {
      expect("seq" in frame.payload).toBe(false);
      expect("acked" in frame.payload).toBe(false);
    }
  });
});
