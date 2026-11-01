import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROTOCOL_VERSION, type ServerMessage, serverMessageSchema } from "bloodtower-protocols";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { loadConfig } from "../config.ts";
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
    send(board.socket, "act", { promptId: "new-pick-game", actionId: "new-game", args: {} });
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
