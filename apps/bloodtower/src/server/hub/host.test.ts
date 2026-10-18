import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { privateHunterOf, type ServerMessage, serverMessageSchema } from "bloodtower-protocols";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { loadConfig } from "../config.ts";
import { loadR1Pack } from "../pack/load.ts";
import { createMockTower, type MockTower } from "../tower/mock.ts";
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

const packOrThrow = () => {
  const loaded = loadR1Pack(loadConfig().packsDir);
  if (!loaded.ok) throw new Error(loaded.issues.map((item) => item.message).join("\n"));
  return loaded.pack;
};

const privateTexts = (hunter: string) => {
  const pack = packOrThrow();
  return pack.moments.flatMap((moment) => {
    if (privateHunterOf(moment.id) !== hunter) return [];
    return (moment.lines ?? []).map((line) => line.text);
  });
};

const start = async (
  tower: MockTower = createMockTower(),
  extra?: {
    devOrigins?: string[];
    lanHost?: () => string | undefined;
    joinPagePort?: number;
    packsDir?: string;
  },
) => {
  const root = tempDir();
  writeFileSync(join(root, "index.html"), "<h1>Bloodtower</h1>");
  const host = await startSessionHost({
    port: 0,
    host: "127.0.0.1",
    webRoot: root,
    packsDir: extra?.packsDir ?? loadConfig().packsDir,
    databasePath: join(tempDir(), "session.sqlite"),
    tower,
    towerWatchMs: 0,
    devOrigins: extra?.devOrigins,
    lanHost: extra?.lanHost,
    joinPagePort: extra?.joinPagePort,
  });
  hosts.push(host);
  return { host, tower };
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

const waitFor = async <T>(read: () => T, ready: (value: T) => boolean): Promise<T> => {
  const started = Date.now();
  let value = read();
  while (!ready(value)) {
    if (Date.now() - started > 2000) throw new Error("timed out waiting for the session");
    await new Promise((resolve) => setTimeout(resolve, 15));
    value = read();
  }
  return value;
};

const until = async (
  inbox: Inbox,
  log: ServerMessage[],
  ready: (messages: ServerMessage[]) => boolean,
) => {
  const startMs = Date.now();
  while (!ready(log)) {
    if (Date.now() - startMs > 2000) throw new Error(`timed out after ${log.length} messages`);
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
  socket.send(JSON.stringify({ v: 1, type, ...(id ? { id } : {}), payload }));
};

const helloBoard = async (port: number) => {
  const client = await connect(port);
  send(client.socket, "hello", {
    role: "storyboard",
    clientLabel: "Story board",
    formFactor: "mac",
  });
  await until(client.inbox, client.log, (messages) =>
    messages.some((message) => message.type === "storyboardState"),
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

const latest = (log: ServerMessage[], type: ServerMessage["type"]) =>
  [...log].reverse().find((message) => message.type === type);

type Client = Awaited<ReturnType<typeof connect>>;

/** One flow press, then wait until this device's state shows the screen the flow moved to. */
const step = async (
  client: Client,
  promptId: string,
  action: "continue" | "begin",
  next: string,
) => {
  send(client.socket, "control", { promptId, action });
  await until(client.inbox, client.log, (messages) => {
    const state = [...messages].reverse().find((message) => message.type === "deviceState");
    return state?.type === "deviceState" && state.payload.screen === next;
  });
};

/** The three steps before play, then Begin. Any joined iPad may send each one. */
const walkToPlay = async (client: Client) => {
  await step(client, "continue-tower-connect", "continue", "pick-story");
  await step(client, "continue-pick-story-test", "continue", "game-settings");
  await step(client, "continue-game-settings", "continue", "party-join");
  await step(client, "continue-party-join", "continue", "begin");
  await step(client, "begin", "begin", "play");
};

describe("session hub", () => {
  it("serves the page and connection-only health, and refuses another origin", async () => {
    const { host } = await start();
    const page = await fetch(`http://127.0.0.1:${host.port}/`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("Bloodtower");
    const health = await fetch(`http://127.0.0.1:${host.port}/health`);
    expect(await health.json()).toEqual({ protocol: 1, tower: "connection-only", effects: "none" });

    await expect(connect(host.port, "https://evil.example")).rejects.toThrow(/403/);
    const allowed = await connect(host.port, `http://127.0.0.1:${host.port}`);
    expect(allowed.socket.readyState).toBe(WebSocket.OPEN);
  });

  it("accepts a listed dev origin and ignores a spoofed Host on the join URL", async () => {
    const { host } = await start(createMockTower(), { devOrigins: ["http://localhost:3000"] });
    const dev = await connect(host.port, "http://localhost:3000");
    expect(dev.socket.readyState).toBe(WebSocket.OPEN);

    const spoofed = new WebSocket(`ws://127.0.0.1:${host.port}/ws`, {
      headers: { host: "evil.example:9" },
    });
    sockets.push(spoofed);
    await new Promise<void>((resolve, reject) => {
      spoofed.once("open", () => resolve());
      spoofed.once("error", reject);
    });
    const board = track(spoofed);
    send(spoofed, "hello", { role: "storyboard", clientLabel: "Story board", formFactor: "mac" });
    await until(board.inbox, board.log, (messages) =>
      messages.some((message) => message.type === "storyboardState"),
    );
    const state = latest(board.log, "storyboardState");
    if (state?.type !== "storyboardState") throw new Error("board");
    expect(state.payload.join?.url.startsWith("http://127.0.0.1:")).toBe(true);
    expect(state.payload.join?.url).not.toContain("evil.example");
    expect(state.payload.join?.code).toBe(host.joinCode);
    expect(state.payload.join?.url).toContain(`/join?code=${host.joinCode}`);
  });

  it("rejects a bad frame, a storyboard press, and a token used for the other role", async () => {
    const { host } = await start();
    const device = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    const welcome = latest(device.log, "welcome");
    if (welcome?.type !== "welcome") throw new Error("welcome");
    expect(welcome.payload.channels).toEqual([]);
    expect(welcome.payload.role).toBe("device");

    const early = await connect(host.port);
    send(early.socket, "hold", { hunter: "nope", action: "take" });
    await until(early.inbox, early.log, (messages) =>
      messages.some((message) => message.type === "error"),
    );
    expect(latest(early.log, "error")).toMatchObject({
      type: "error",
      payload: { code: "invalid-state" },
    });

    send(early.socket, "nope", {});
    await until(
      early.inbox,
      early.log,
      (messages) => messages.filter((message) => message.type === "error").length >= 2,
    );
    early.socket.send(JSON.stringify({ v: 1, type: "hello", bytes: "0a", payload: {} }));
    await until(
      early.inbox,
      early.log,
      (messages) => messages.filter((message) => message.type === "error").length >= 3,
    );
    const codes = early.log
      .filter((message) => message.type === "error")
      .map((message) => message.payload.code);
    expect(codes).toEqual(["invalid-state", "unknown-type", "invalid-envelope"]);

    const board = await helloBoard(host.port);
    const before = host.loadRun().holdings.length;
    send(board.socket, "hold", {
      hunter: packOrThrow().hunters[0]?.id ?? "hunter",
      action: "take",
    });
    await until(board.inbox, board.log, (messages) =>
      messages.some((message) => message.type === "error"),
    );
    expect(latest(board.log, "error")).toMatchObject({
      type: "error",
      payload: { code: "storyboard-control" },
    });
    expect(host.loadRun().holdings).toHaveLength(before);

    const asBoard = await connect(host.port);
    send(asBoard.socket, "hello", {
      role: "storyboard",
      clientLabel: "Story board",
      formFactor: "mac",
      token: welcome.payload.token,
    });
    await until(asBoard.inbox, asBoard.log, (messages) =>
      messages.some((message) => message.type === "error"),
    );
    expect(latest(asBoard.log, "error")).toMatchObject({
      type: "error",
      payload: { code: "invalid-payload" },
    });

    const boardWelcome = latest(board.log, "welcome");
    if (boardWelcome?.type !== "welcome") throw new Error("board welcome");
    const asDevice = await connect(host.port);
    send(asDevice.socket, "hello", {
      role: "device",
      clientLabel: "iPad",
      formFactor: "ipad",
      token: boardWelcome.payload.token,
    });
    await until(asDevice.inbox, asDevice.log, (messages) =>
      messages.some((message) => message.type === "error"),
    );
    expect(latest(asDevice.log, "error")).toMatchObject({
      type: "error",
      payload: { code: "invalid-state" },
    });

    const wrong = host.joinCode === "000000" ? "111111" : "000000";
    const missed = await connect(host.port);
    send(missed.socket, "hello", {
      role: "device",
      clientLabel: "Phone",
      formFactor: "phone",
      joinCode: wrong,
    });
    await until(missed.inbox, missed.log, (messages) =>
      messages.some((message) => message.type === "error"),
    );
    expect(latest(missed.log, "error")).toMatchObject({
      type: "error",
      payload: { code: "invalid-state" },
    });
    expect(JSON.stringify(board.log)).not.toContain(welcome.payload.token);
  });

  it("gives the board a code and keeps private lines off it, with one winner for two continues", async () => {
    const pack = packOrThrow();
    const privateHunter =
      pack.hunters.find((hunter) => privateTexts(hunter.id).length > 0) ?? pack.hunters[0];
    if (!privateHunter) throw new Error("The test pack has no hunter.");
    const { host } = await start();
    const board = await helloBoard(host.port);
    const alpha = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    const beta = await helloDevice(host.port, { formFactor: "phone", joinCode: host.joinCode });
    const alphaWelcome = latest(alpha.log, "welcome");
    const betaWelcome = latest(beta.log, "welcome");
    if (alphaWelcome?.type !== "welcome" || betaWelcome?.type !== "welcome")
      throw new Error("welcome");

    const hold = async (client: typeof alpha, hunter: string) => {
      send(client.socket, "hold", { hunter, action: "take" });
      await until(client.inbox, client.log, (messages) => {
        const state = [...messages].reverse().find((message) => message.type === "deviceState");
        return state?.type === "deviceState" && state.payload.heldHunters.includes(hunter);
      });
    };
    await hold(alpha, privateHunter.id);
    for (const hunter of pack.hunters) {
      if (hunter.id !== privateHunter.id) await hold(beta, hunter.id);
    }

    await until(board.inbox, board.log, (messages) => {
      const state = [...messages].reverse().find((message) => message.type === "storyboardState");
      return state?.type === "storyboardState" && state.payload.gate.canBegin;
    });
    const shown = latest(board.log, "storyboardState");
    if (shown?.type !== "storyboardState" || !shown.payload.join) throw new Error("join");
    expect(shown.payload.join.code).toMatch(/^\d{6}$/);
    expect(shown.payload.gate.canBegin).toBe(true);

    await walkToPlay(alpha);
    await until(alpha.inbox, alpha.log, (messages) => {
      const state = [...messages].reverse().find((message) => message.type === "deviceState");
      return state?.type === "deviceState" && state.payload.prompt?.id === "continue-0";
    });

    send(alpha.socket, "control", { promptId: "continue-0", action: "continue" });
    send(beta.socket, "control", { promptId: "continue-0", action: "continue" });
    const presses = await waitFor(
      () => host.loadRun().presses.filter((press) => press.promptId === "continue-0"),
      (found) => found.length >= 2,
    );
    await until(alpha.inbox, alpha.log, (messages) => {
      const state = [...messages].reverse().find((message) => message.type === "deviceState");
      return state?.type === "deviceState" && state.payload.prompt?.id !== "continue-0";
    });
    expect(presses).toHaveLength(2);
    expect(presses.filter((press) => press.winner)).toHaveLength(1);
    expect(new Set(presses.map((press) => press.deviceId)).size).toBe(2);
    expect(
      presses.every((press) => Number.isFinite(press.atMonoMs) && press.atWall.endsWith("Z")),
    ).toBe(true);

    let guard = 0;
    while (guard < 12) {
      guard += 1;
      const state = latest(alpha.log, "deviceState");
      if (state?.type !== "deviceState") break;
      const promptId = state.payload.prompt?.id;
      if (!promptId?.startsWith("continue-")) break;
      if (state.payload.lock?.promptId === promptId) break;
      const before = alpha.log.length;
      send(alpha.socket, "control", { promptId, action: "continue" });
      await until(alpha.inbox, alpha.log, (messages) => messages.length > before);
    }

    const hidden = pack.moments.flatMap((moment) => {
      if (!privateHunterOf(moment.id)) return [];
      return (moment.lines ?? []).map((line) => line.text);
    });
    const boardText = JSON.stringify(board.log);
    for (const text of hidden) expect(boardText).not.toContain(text);
    expect(boardText).not.toContain(".private.");
    expect(boardText).not.toContain("ipad:");
    expect(boardText).not.toContain(alphaWelcome.payload.token);

    const alphaText = JSON.stringify(alpha.log);
    const betaText = JSON.stringify(beta.log);
    for (const text of privateTexts(privateHunter.id)) {
      expect(alphaText).toContain(text);
      if (
        !beta.log.some(
          (message) =>
            message.type === "deviceState" &&
            message.payload.heldHunters.includes(privateHunter.id),
        )
      ) {
        expect(betaText).not.toContain(text);
      }
    }
    for (const hunter of pack.hunters) {
      if (hunter.id === privateHunter.id) continue;
      for (const text of privateTexts(hunter.id)) expect(alphaText).not.toContain(text);
    }

    const run = host.loadRun();
    expect(run.session.packId).toBe(pack.pack_id);
    expect(run.session.packVersion).toBe(pack.version);
    expect(run.marks.some((mark) => mark.kind === "moment" && mark.startWall.endsWith("Z"))).toBe(
      true,
    );
    if (pack.moments.some((moment) => (moment.cues?.length ?? 0) > 0)) {
      expect(run.marks.some((mark) => mark.kind === "cue")).toBe(true);
    }
    const roster = latest(alpha.log, "deviceState");
    if (roster?.type !== "deviceState") throw new Error("roster");
    expect(roster.payload.roster?.map((hunter) => hunter.id)).toEqual(
      pack.hunters.map((hunter) => hunter.id),
    );
    // The portrait comes from the pack's hunter data, not from the hunter id.
    expect(roster.payload.roster?.map((hunter) => hunter.portrait)).toEqual(
      pack.hunters.map((hunter) => hunter.portrait),
    );
    expect(roster.payload.packId).toBe(pack.pack_id);
  });

  it("moves the flow on the first press of a step, logs both presses with their screen, and sends the loser no error", async () => {
    const { host } = await start();
    const board = await helloBoard(host.port);
    expect(latest(board.log, "storyboardState")).toMatchObject({
      payload: { screen: "tower-connect" },
    });
    const alpha = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    const beta = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });

    send(alpha.socket, "control", { promptId: "continue-tower-connect", action: "continue" });
    send(beta.socket, "control", { promptId: "continue-tower-connect", action: "continue" });
    const presses = await waitFor(
      () => host.loadRun().presses.filter((press) => press.promptId === "continue-tower-connect"),
      (found) => found.length >= 2,
    );
    expect(presses.filter((press) => press.winner)).toHaveLength(1);
    expect(presses.find((press) => press.winner)).toMatchObject({
      screen: "tower-connect",
      nextScreen: "pick-story",
    });
    expect(
      presses.filter((press) => !press.winner).every((press) => press.nextScreen === null),
    ).toBe(true);
    expect(new Set(presses.map((press) => press.deviceId)).size).toBe(2);

    await until(board.inbox, board.log, (messages) => {
      const state = [...messages].reverse().find((message) => message.type === "storyboardState");
      return state?.type === "storyboardState" && state.payload.screen === "pick-story";
    });
    await until(beta.inbox, beta.log, (messages) => {
      const state = [...messages].reverse().find((message) => message.type === "deviceState");
      return state?.type === "deviceState" && state.payload.screen === "pick-story";
    });
    expect(latest(beta.log, "error")).toBeUndefined();
    expect(latest(beta.log, "deviceState")).toMatchObject({
      payload: { screen: "pick-story" },
    });
  });

  it("pauses when the only holder drops and resumes on rejoin, and a spare socket does not", async () => {
    const pack = packOrThrow();
    const { host } = await start();
    const board = await helloBoard(host.port);
    const device = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    const welcome = latest(device.log, "welcome");
    if (welcome?.type !== "welcome") throw new Error("welcome");
    for (const hunter of pack.hunters) {
      send(device.socket, "hold", { hunter: hunter.id, action: "take" });
      await until(device.inbox, device.log, (messages) => {
        const state = [...messages].reverse().find((message) => message.type === "deviceState");
        return state?.type === "deviceState" && state.payload.heldHunters.includes(hunter.id);
      });
    }
    await walkToPlay(device);
    await until(board.inbox, board.log, (messages) => {
      const state = [...messages].reverse().find((message) => message.type === "storyboardState");
      return state?.type === "storyboardState" && state.payload.stage === "playing";
    });

    const spare = await helloDevice(host.port, {
      formFactor: "ipad",
      token: welcome.payload.token,
    });
    const deviceId = welcome.payload.clientId;
    spare.socket.close();
    await new Promise<void>((resolve) => spare.socket.once("close", () => resolve()));
    expect(host.loadRun().devices.find((item) => item.deviceId === deviceId)?.connected).toBe(true);
    const still = latest(board.log, "storyboardState");
    if (still?.type !== "storyboardState") throw new Error("board");
    expect(still.payload.stage).toBe("playing");

    device.socket.close();
    await until(board.inbox, board.log, (messages) => {
      const state = [...messages].reverse().find((message) => message.type === "storyboardState");
      return state?.type === "storyboardState" && state.payload.stage === "paused";
    });
    const paused = latest(board.log, "storyboardState");
    if (paused?.type !== "storyboardState") throw new Error("paused");
    expect(paused.payload.pause?.cause).toBe("disconnect");
    expect(paused.payload.pause?.hunter).toBe(pack.hunters[0]?.id);

    const again = await helloDevice(host.port, {
      formFactor: "ipad",
      token: welcome.payload.token,
    });
    await until(again.inbox, again.log, (messages) =>
      messages.some((message) => message.type === "deviceState"),
    );
    const restored = latest(again.log, "deviceState");
    if (restored?.type !== "deviceState") throw new Error("restored");
    expect(restored.payload.heldHunters).toEqual(pack.hunters.map((hunter) => hunter.id));
    await until(board.inbox, board.log, (messages) => {
      const state = [...messages].reverse().find((message) => message.type === "storyboardState");
      return state?.type === "storyboardState" && state.payload.stage === "playing";
    });
    const pause = host.loadRun().marks.find((mark) => mark.kind === "pause");
    expect(pause?.cause).toBe("disconnect");
    expect(pause?.startWall.endsWith("Z")).toBe(true);
    expect(pause?.endWall?.endsWith("Z")).toBe(true);
    expect(pause?.endMonoMs).not.toBeNull();
  });

  it("connects and calibrates only from a winning press, and keeps an unknown battery unavailable", async () => {
    const pack = packOrThrow();
    const tower = createMockTower();
    const { host } = await start(tower);
    const board = await helloBoard(host.port);
    const first = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    const second = await helloDevice(host.port, { formFactor: "phone", joinCode: host.joinCode });
    for (const hunter of pack.hunters) {
      send(first.socket, "hold", { hunter: hunter.id, action: "take" });
    }
    await until(first.inbox, first.log, (messages) => {
      const state = [...messages].reverse().find((message) => message.type === "deviceState");
      return (
        state?.type === "deviceState" && state.payload.heldHunters.length === pack.hunters.length
      );
    });

    send(first.socket, "control", { promptId: "tower-calibrate", action: "tower-calibrate" });
    await until(first.inbox, first.log, (messages) =>
      messages.some((message) => message.type === "error"),
    );
    expect(tower.sent()).toEqual([]);

    send(first.socket, "control", { promptId: "tower-connect", action: "tower-connect" });
    send(second.socket, "control", { promptId: "tower-connect", action: "tower-connect" });
    await until(board.inbox, board.log, (messages) => {
      const state = [...messages].reverse().find((message) => message.type === "storyboardState");
      return state?.type === "storyboardState" && state.payload.tower.connection === "connected";
    });
    const connectPresses = await waitFor(
      () => host.loadRun().presses.filter((press) => press.action === "tower-connect"),
      (found) => found.length >= 2,
    );
    expect(tower.sent().map((item) => item.type)).toEqual(["connect"]);
    expect(connectPresses.filter((press) => press.winner)).toHaveLength(1);
    expect(connectPresses).toHaveLength(2);

    await until(first.inbox, first.log, (messages) => {
      const state = [...messages].reverse().find((message) => message.type === "deviceState");
      return (
        state?.type === "deviceState" &&
        state.payload.connectLock?.action === "tower-connect" &&
        state.payload.tower?.connection === "connected"
      );
    });
    const locked = latest(first.log, "deviceState");
    if (locked?.type !== "deviceState") throw new Error("lock");
    expect(locked.payload.connectLock?.action).toBe("tower-connect");
    expect(locked.payload.tower?.connection).toBe("connected");
    expect(locked.payload.tower?.battery).toEqual({ state: "unavailable" });

    send(first.socket, "control", { promptId: "tower-calibrate", action: "tower-calibrate" });
    await until(board.inbox, board.log, (messages) => {
      const state = [...messages].reverse().find((message) => message.type === "storyboardState");
      return (
        state?.type === "storyboardState" &&
        state.payload.tower.calibrated.state === "known" &&
        state.payload.tower.calibrated.calibrated === true
      );
    });
    expect(tower.sent().map((item) => item.type)).toEqual(["connect", "calibrate"]);
    expect(tower.sent().some((item) => item.type === "command")).toBe(false);

    tower.setBattery(0);
    host.syncTower();
    await until(board.inbox, board.log, (messages) => {
      const state = [...messages].reverse().find((message) => message.type === "storyboardState");
      return state?.type === "storyboardState" && state.payload.tower.battery.state === "known";
    });
    const known = latest(board.log, "storyboardState");
    if (known?.type !== "storyboardState") throw new Error("battery");
    expect(known.payload.tower.battery).toEqual({ state: "known", percent: 0 });

    tower.setBattery("unavailable");
    host.syncTower();
    await until(board.inbox, board.log, (messages) => {
      const state = [...messages].reverse().find((message) => message.type === "storyboardState");
      return (
        state?.type === "storyboardState" && state.payload.tower.battery.state === "unavailable"
      );
    });
  });

  it("puts the LAN address in the join QR and marks it reachable", async () => {
    const { host } = await start(createMockTower(), { lanHost: () => "192.168.1.20" });
    const board = await helloBoard(host.port);
    const state = latest(board.log, "storyboardState");
    if (state?.type !== "storyboardState") throw new Error("board");
    expect(state.payload.join).toEqual({
      code: host.joinCode,
      url: `http://192.168.1.20:${host.port}/join?code=${host.joinCode}`,
      reachable: true,
    });
  });

  it("uses joinPagePort for the join QR when next dev serves the page on another port", async () => {
    const { host } = await start(createMockTower(), {
      lanHost: () => "192.168.1.20",
      joinPagePort: 3000,
    });
    const board = await helloBoard(host.port);
    const state = latest(board.log, "storyboardState");
    if (state?.type !== "storyboardState") throw new Error("board");
    expect(state.payload.join?.url).toBe(`http://192.168.1.20:3000/join?code=${host.joinCode}`);
  });

  it("says the join address is unreachable when only loopback is available", async () => {
    const { host } = await start();
    const board = await helloBoard(host.port);
    const state = latest(board.log, "storyboardState");
    if (state?.type !== "storyboardState") throw new Error("board");
    expect(state.payload.join).toEqual({
      code: host.joinCode,
      url: `http://127.0.0.1:${host.port}/join?code=${host.joinCode}`,
      reachable: false,
    });
  });

  it("shows a dropped device's hunters as disconnected, still claimed, during the grace period", async () => {
    const pack = packOrThrow();
    const { host } = await start();
    const board = await helloBoard(host.port);
    const device = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    for (const hunter of pack.hunters) {
      send(device.socket, "hold", { hunter: hunter.id, action: "take" });
      await until(device.inbox, device.log, (messages) => {
        const state = [...messages].reverse().find((message) => message.type === "deviceState");
        return state?.type === "deviceState" && state.payload.heldHunters.includes(hunter.id);
      });
    }
    device.socket.close();
    await until(board.inbox, board.log, (messages) => {
      const state = [...messages].reverse().find((message) => message.type === "storyboardState");
      return (
        state?.type === "storyboardState" &&
        state.payload.hunters.every((hunter) => hunter.disconnected)
      );
    });
    const state = latest(board.log, "storyboardState");
    if (state?.type !== "storyboardState") throw new Error("board");
    expect(state.payload.hunters.every((hunter) => hunter.holders.length === 1)).toBe(true);
    expect(state.payload.gate).toEqual({ canBegin: true, unheld: [] });
  });

  it("ignores keeper-line-ended from a device socket", async () => {
    const { host } = await start();
    const board = await helloBoard(host.port);
    const device = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    send(device.socket, "keeper-line-ended", { momentId: "grey-stair.03", line: 0 });
    await until(device.inbox, device.log, (messages) =>
      messages.some((message) => message.type === "error"),
    );
    expect(latest(device.log, "error")).toMatchObject({
      type: "error",
      payload: { code: "invalid-state" },
    });
    const state = latest(board.log, "storyboardState");
    if (state?.type !== "storyboardState") throw new Error("board");
    expect(state.payload.keeperLine ?? null).not.toBe(1);
  });

  it("lists every story, moves the highlight for the board, and binds the one chosen", async () => {
    const packs = tempDir();
    cpSync(join(loadConfig().packsDir, "test"), join(packs, "test"), { recursive: true });
    cpSync(join(loadConfig().packsDir, "test"), join(packs, "second"), { recursive: true });
    const manifest = join(packs, "second", "pack.yaml");
    writeFileSync(
      manifest,
      readFileSync(manifest, "utf8")
        .replace("pack_id: test", "pack_id: second")
        .replace("title: Proving ground", "title: Second story"),
    );
    mkdirSync(join(packs, "broken"));
    writeFileSync(join(packs, "broken", "pack.yaml"), "pack_id: broken\n");
    const { host } = await start(createMockTower(), { packsDir: packs });
    const board = await helloBoard(host.port);
    const device = await helloDevice(host.port, { formFactor: "ipad", joinCode: host.joinCode });
    await step(device, "continue-tower-connect", "continue", "pick-story");

    const boardStories = () => {
      const state = latest(board.log, "storyboardState");
      return state?.type === "storyboardState" ? state.payload.stories : undefined;
    };
    await waitFor(boardStories, (stories) => stories?.cards.length === 3);
    expect(boardStories()?.cards.map((card) => [card.id, card.loadable])).toEqual([
      ["broken", false],
      ["second", true],
      ["test", true],
    ]);
    // The session starts on the first story that loads; the greyed door is never current.
    expect(boardStories()?.current).toBe("second");

    send(device.socket, "focus-story", { story: "test" });
    await waitFor(boardStories, (stories) => stories?.focus === "test");
    expect(boardStories()?.current).toBe("second");
    await step(device, "continue-pick-story-test", "continue", "game-settings");
    await step(device, "continue-game-settings", "continue", "party-join");
    await waitFor(boardStories, (stories) => stories?.current === "test");
    const deviceState = latest(device.log, "deviceState");
    if (deviceState?.type !== "deviceState") throw new Error("device");
    expect(deviceState.payload.roster?.map((hunter) => hunter.id)).toContain("alpha");

    // Off Pick Story the highlight no longer moves, and the board cannot move it at all.
    send(device.socket, "focus-story", { story: "second" });
    send(board.socket, "focus-story", { story: "second" });
    await until(board.inbox, board.log, (messages) =>
      messages.some((message) => message.type === "error"),
    );
    expect(boardStories()?.focus).toBe("test");
  });

  it("does not open a port when no story pack loads", async () => {
    const tower = createMockTower();
    const root = tempDir();
    writeFileSync(join(root, "index.html"), "<h1>Bloodtower</h1>");
    const databasePath = join(tempDir(), "session.sqlite");
    await expect(
      startSessionHost({
        port: 0,
        host: "127.0.0.1",
        webRoot: root,
        packsDir: tempDir(),
        databasePath,
        tower,
        towerWatchMs: 0,
      }),
    ).rejects.toThrow(/No story pack/);
    tower.close();
  });

  it("does not name a story pack in the hub", () => {
    const dir = new URL(".", import.meta.url);
    const source = readdirSync(dir)
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
      .map((name) => readFileSync(new URL(name, dir), "utf8"))
      .join("\n")
      .toLowerCase();
    expect(source).not.toMatch(/dracula|grey stair/);
  });
});
