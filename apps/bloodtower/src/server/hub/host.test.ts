import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROTOCOL_VERSION, type ServerMessage, serverMessageSchema } from "bloodtower-protocols";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";
import { loadConfig } from "../config.ts";
import { openDatabase } from "../db/client.ts";
import { autosave } from "../db/schema.ts";
import { createSessionStore } from "../db/store.ts";
import { createEventStore } from "../events/store.ts";
import { createHostLogger, type HostLogger } from "../log/hostLog.ts";
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
    if (row && row.gameId !== OLD_GAME && row.format === 2) return row;
    if (Date.now() - startMs > 5000) throw new Error("no new format 2 autosave was written");
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

describe.each([
  { label: "no format", format: null, version: "none" },
  { label: "format: 1", format: 1, version: "1" },
])("a pre-C3 autosave with $label (C3-01 EV-07)", ({ format, version }) => {
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
      { code: "save-skipped", message: `save skipped: pre-C3 format ${version}` },
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

  it("lets a New game run clean and replaces the old row with a format 2 save", async () => {
    const databasePath = join(tempDir(), "session.sqlite");
    seedAutosave(databasePath, format);
    const { log, calls } = warnSpy();
    const host = await startAt(databasePath, log);
    await helloBoard(host.port);
    const device = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    await playToBegin(device);
    const row = await waitForNewAutosave(databasePath);
    expect(row.format).toBe(2);
    expect(calls.filter((call) => call.code === "save-skipped")).toHaveLength(1);
  });
});

describe("a format 2 autosave (C3-01 EV-07)", () => {
  it("is written as format 2 and Continue restores it after a restart", async () => {
    const databasePath = join(tempDir(), "session.sqlite");
    const first = warnSpy();
    const host = await startAt(databasePath, first.log);
    await helloBoard(host.port);
    const device = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    await playToBegin(device);
    const written = await waitForNewAutosave(databasePath);
    expect(written.format).toBe(2);
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
    expect(readAutosave(databasePath)?.format).toBe(2);
  });
});
