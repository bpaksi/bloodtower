import { randomBytes } from "node:crypto";
import { createServer, type IncomingMessage } from "node:http";
import {
  CLIENT_MESSAGE_TYPES,
  type ClientMessage,
  clientMessageSchema,
  deviceStatePayloadSchema,
  type ErrorCode,
  envelopeSchema,
  errorPayloadSchema,
  PROTOCOL_VERSION,
  type ServerMessage,
  storyboardStatePayloadSchema,
  welcomePayloadSchema,
} from "bloodtower-protocols";
import { type RawData, WebSocket, WebSocketServer } from "ws";
import { createPressLog } from "../control/lock.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore, type StoredRun } from "../db/store.ts";
import { joinHost } from "../lanUrls.ts";
import { formatLoadIssues, loadR1Pack } from "../pack/load.ts";
import { requestPath, serveStatic } from "../server.ts";
import { createSession, type SessionEngine } from "../session/engine.ts";
import { type Clock, systemClock } from "../timing/clock.ts";
import { createTimingLog } from "../timing/log.ts";
import { runTowerPress } from "../tower/port.ts";
import type { TowerPort } from "../tower/types.ts";
import { isAllowedOrigin } from "./origin.ts";

const WS_PATH = "/ws";
const MAX_MESSAGE_BYTES = 64 * 1024;
const SERVER_VERSION = "0.0.0";

export interface SessionHostOptions {
  port: number;
  host: string;
  webRoot: string;
  packsDir: string;
  /** SQLite file. The folder is created. */
  databasePath: string;
  tower: TowerPort;
  devOrigins?: readonly string[];
  /** Six digits. Omitted, a code is chosen for this process. */
  joinCode?: string;
  clock?: Clock;
  /** How often a changed tower snapshot is published. 0 reads it only on syncTower. */
  towerWatchMs?: number;
  /** The address iPads open for the join QR. Undefined when only loopback is reachable. Defaults to the LAN address for `host`. */
  lanHost?: () => string | undefined;
}

export interface SessionHost {
  port: number;
  joinCode: string;
  close: () => Promise<void>;
  /** The session rows. Not an HTTP route. */
  loadRun: () => StoredRun;
  /** Publish the tower snapshot when it has changed since the last broadcast. */
  syncTower: () => void;
}

const header = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const textOf = (raw: RawData): string | undefined => {
  if (typeof raw === "string") return raw;
  if (Buffer.isBuffer(raw)) return raw.toString("utf8");
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString("utf8");
  if (Array.isArray(raw)) return Buffer.concat(raw).toString("utf8");
  return undefined;
};

const freshToken = () => randomBytes(16).toString("base64url");

interface ClientState {
  role: "pending" | "storyboard" | "device";
  deviceId?: string;
}

/**
 * HTTP, the static UI, and the session socket on one port.
 * The test pack is loaded before the port opens. The tower is not connected here.
 * Arrival order on this process is the lock order. Client clocks are not read.
 */
export const startSessionHost = async (options: SessionHostOptions): Promise<SessionHost> => {
  const loaded = loadR1Pack(options.packsDir);
  if (!loaded.ok) {
    throw new Error(`The test pack did not load.\n${formatLoadIssues(loaded.issues).join("\n")}`);
  }
  const pack = loaded.pack;
  const joinCode =
    options.joinCode ?? String(randomBytes(3).readUIntBE(0, 3) % 1_000_000).padStart(6, "0");
  const clock = options.clock ?? systemClock();
  const opened = openDatabase(options.databasePath);
  const store = createSessionStore(opened.db);
  const sessionId = `session-${randomBytes(8).toString("hex")}`;
  const devOrigins = options.devOrigins ?? [];
  const tower = options.tower;
  const lanHost = options.lanHost ?? (() => joinHost(options.host));
  let engine: SessionEngine;
  try {
    engine = createSession(pack, {
      sessionId,
      joinCode,
      startedWall: clock.wall(),
      timing: createTimingLog(store, clock, sessionId),
      presses: createPressLog(clock, (press) => store.insertPress(sessionId, press)),
      saveRoster: (roster) => store.saveRoster(roster),
      tower: () => tower.snapshot(),
      onChange: () => broadcast(),
    });
    // The pack loaded and the session exists, so the splash is done. It is not a press.
    engine.finishSplash();
  } catch (error) {
    opened.close();
    throw error;
  }

  const roster = pack.hunters.map((hunter) => ({
    id: hunter.id,
    name: hunter.name,
    portrait: hunter.portrait,
  }));
  const clients = new Map<WebSocket, ClientState>();
  const deviceSockets = new Map<string, Set<WebSocket>>();
  const boardTokens = new Set<string>();
  let boardSeq = 0;
  /** Known once the port is open. Until then the configured port is only a placeholder. */
  let boundPort = options.port;
  let closing = false;
  let lastSnapshot = JSON.stringify(tower.snapshot());

  const joinAt = (): { url: string; reachable: boolean } => {
    const host = lanHost();
    return {
      url: `http://${host ?? "127.0.0.1"}:${boundPort}/join?code=${joinCode}`,
      reachable: host !== undefined,
    };
  };

  const send = (socket: WebSocket, message: ServerMessage) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  };

  const sendError = (
    socket: WebSocket,
    code: ErrorCode,
    message: string,
    correlationId?: string,
  ) => {
    const payload = errorPayloadSchema.parse({ code, message });
    send(socket, {
      v: PROTOCOL_VERSION,
      type: "error",
      ...(correlationId ? { correlationId } : {}),
      payload,
    });
  };

  const storyboardMessage = (): ServerMessage | undefined => {
    try {
      const payload = storyboardStatePayloadSchema.parse(
        engine.projectStoryboard(tower.snapshot(), joinAt()),
      );
      return { v: PROTOCOL_VERSION, type: "storyboardState", payload };
    } catch {
      console.error("Story board state was refused.");
      return undefined;
    }
  };

  const deviceMessage = (deviceId: string): ServerMessage | undefined => {
    try {
      const view = engine.projectDevice(deviceId);
      const payload = deviceStatePayloadSchema.parse({
        ...view,
        tower: tower.snapshot(),
        pausePromptId: engine.pausePromptId(),
        connectLock: engine.lockFor("tower-connect"),
        calibrateLock: engine.lockFor("tower-calibrate"),
        roster,
        packId: pack.pack_id,
      });
      return { v: PROTOCOL_VERSION, type: "deviceState", payload };
    } catch {
      console.error("Device state was refused.");
      return undefined;
    }
  };

  const broadcast = () => {
    try {
      lastSnapshot = JSON.stringify(tower.snapshot());
      const board = storyboardMessage();
      for (const [socket, client] of clients) {
        if (client.role === "storyboard") {
          if (board) send(socket, board);
          else
            sendError(socket, "private-on-storyboard", "The story board refused a private frame.");
          continue;
        }
        if (client.role === "device" && client.deviceId) {
          const message = deviceMessage(client.deviceId);
          if (message) send(socket, message);
          else sendError(socket, "invalid-state", "That device state was refused.");
        }
      }
    } catch {
      console.error("Broadcast failed.");
    }
  };

  const syncTower = () => {
    const next = JSON.stringify(tower.snapshot());
    if (next === lastSnapshot) return;
    broadcast();
  };

  const watchMs = options.towerWatchMs ?? 200;
  const timer = watchMs > 0 ? setInterval(syncTower, watchMs) : undefined;
  if (timer) timer.unref?.();

  const attachDevice = (socket: WebSocket, deviceId: string) => {
    const set = deviceSockets.get(deviceId) ?? new Set<WebSocket>();
    set.add(socket);
    deviceSockets.set(deviceId, set);
  };

  const detachDevice = (socket: WebSocket, deviceId: string) => {
    const set = deviceSockets.get(deviceId);
    if (!set) return;
    set.delete(socket);
    if (set.size > 0) return;
    deviceSockets.delete(deviceId);
    engine.disconnect(deviceId);
    broadcast();
  };

  const sendWelcome = (
    socket: WebSocket,
    input: {
      clientId: string;
      role: "storyboard" | "device";
      token: string;
      channels: string[];
      correlationId?: string;
    },
  ) => {
    const payload = welcomePayloadSchema.parse({
      clientId: input.clientId,
      role: input.role,
      token: input.token,
      channels: input.channels,
      versions: { protocol: PROTOCOL_VERSION, server: SERVER_VERSION, node: process.version },
    });
    send(socket, {
      v: PROTOCOL_VERSION,
      type: "welcome",
      ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      payload,
    });
  };

  const channelsFor = (deviceId: string) =>
    engine.projectDevice(deviceId).heldHunters.map((hunter) => `ipad:${hunter}`);

  const onHello = (socket: WebSocket, client: ClientState, message: ClientMessage) => {
    if (message.type !== "hello") return;
    const { payload } = message;
    const correlationId = message.id;
    if (client.role !== "pending") {
      sendError(socket, "invalid-state", "This socket has already said hello.", correlationId);
      return;
    }
    if (payload.role === "storyboard") {
      let token = payload.token;
      if (token) {
        const device = engine.roster().devices.find((item) => item.token === token);
        if (device) {
          sendError(
            socket,
            "invalid-state",
            "A device token cannot open the story board.",
            correlationId,
          );
          return;
        }
        if (!boardTokens.has(token)) {
          sendError(
            socket,
            "invalid-state",
            "That token does not match the story board.",
            correlationId,
          );
          return;
        }
      } else {
        token = freshToken();
        boardTokens.add(token);
      }
      boardSeq += 1;
      client.role = "storyboard";
      sendWelcome(socket, {
        clientId: `storyboard-${boardSeq}`,
        role: "storyboard",
        token,
        channels: ["storyboard"],
        correlationId,
      });
      broadcast();
      return;
    }
    if (payload.formFactor === "mac") {
      sendError(socket, "invalid-payload", "A player device is an iPad or a phone.", correlationId);
      return;
    }
    if (payload.token) {
      if (boardTokens.has(payload.token)) {
        sendError(
          socket,
          "invalid-state",
          "A story board token cannot join as a device.",
          correlationId,
        );
        return;
      }
      const again = engine.rejoin(payload.token);
      if (!again.ok) {
        sendError(socket, "invalid-state", "That token does not match a device.", correlationId);
        return;
      }
      client.role = "device";
      client.deviceId = again.deviceId;
      attachDevice(socket, again.deviceId);
      sendWelcome(socket, {
        clientId: again.deviceId,
        role: "device",
        token: payload.token,
        channels: channelsFor(again.deviceId),
        correlationId,
      });
      broadcast();
      return;
    }
    if (!payload.joinCode) {
      sendError(socket, "invalid-payload", "A device joins with a code or a token.", correlationId);
      return;
    }
    const joined = engine.join({ joinCode: payload.joinCode, formFactor: payload.formFactor });
    if (!joined.ok) {
      sendError(
        socket,
        "invalid-state",
        "The join code does not match this session.",
        correlationId,
      );
      return;
    }
    client.role = "device";
    client.deviceId = joined.deviceId;
    attachDevice(socket, joined.deviceId);
    sendWelcome(socket, {
      clientId: joined.deviceId,
      role: "device",
      token: joined.token,
      channels: [],
      correlationId,
    });
    broadcast();
  };

  const onHold = (socket: WebSocket, client: ClientState, message: ClientMessage) => {
    if (message.type !== "hold") return;
    const correlationId = message.id;
    if (client.role === "pending") {
      sendError(socket, "invalid-state", "Say hello before anything else.", correlationId);
      return;
    }
    if (client.role !== "device" || !client.deviceId) {
      sendError(socket, "storyboard-control", "The story board is display only.", correlationId);
      return;
    }
    const result = engine.hold(client.deviceId, message.payload.hunter, message.payload.action);
    if (!result.ok) {
      sendError(socket, "invalid-state", "That hold was not accepted.", correlationId);
      return;
    }
    broadcast();
  };

  const onControl = (socket: WebSocket, client: ClientState, message: ClientMessage) => {
    if (message.type !== "control") return;
    const correlationId = message.id;
    if (client.role === "pending") {
      sendError(socket, "invalid-state", "Say hello before anything else.", correlationId);
      return;
    }
    if (client.role !== "device" || !client.deviceId) {
      sendError(socket, "storyboard-control", "The story board is display only.", correlationId);
      return;
    }
    const result = engine.press(
      client.deviceId,
      message.payload.promptId,
      message.payload.action,
      message.payload.option,
    );
    if (!result.ok) {
      sendError(socket, "invalid-state", "That press was not accepted.", correlationId);
      return;
    }
    runTowerPress(result, tower);
    broadcast();
  };

  /**
   * The story board's one message (D7 exception). Only the storyboard socket may send it.
   * The engine acts only when the line matches the current Keeper line, so a late one is a no-op.
   */
  const onKeeperLineEnded = (socket: WebSocket, client: ClientState, message: ClientMessage) => {
    if (message.type !== "keeper-line-ended") return;
    const correlationId = message.id;
    if (client.role === "pending") {
      sendError(socket, "invalid-state", "Say hello before anything else.", correlationId);
      return;
    }
    if (client.role !== "storyboard") {
      sendError(
        socket,
        "invalid-state",
        "Only the story board reports a Keeper line.",
        correlationId,
      );
      return;
    }
    if (engine.keeperLineEnded(message.payload.momentId, message.payload.line)) broadcast();
  };

  const handle = (socket: WebSocket, raw: RawData) => {
    const client = clients.get(socket);
    if (!client || closing) return;
    const text = textOf(raw);
    if (text === undefined) {
      sendError(socket, "invalid-json", "Message is not valid JSON.");
      return;
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      sendError(socket, "invalid-json", "Message is not valid JSON.");
      return;
    }
    const envelope = envelopeSchema.safeParse(json);
    if (!envelope.success) {
      sendError(socket, "invalid-envelope", "Message is not a valid protocol envelope.");
      return;
    }
    const correlationId = envelope.data.id;
    if (!CLIENT_MESSAGE_TYPES.includes(envelope.data.type)) {
      sendError(
        socket,
        "unknown-type",
        `Unknown message type "${envelope.data.type}".`,
        correlationId,
      );
      return;
    }
    const message = clientMessageSchema.safeParse(envelope.data);
    if (!message.success) {
      sendError(
        socket,
        "invalid-payload",
        `Invalid payload for "${envelope.data.type}".`,
        correlationId,
      );
      return;
    }
    if (message.data.type === "hello") onHello(socket, client, message.data);
    else if (message.data.type === "hold") onHold(socket, client, message.data);
    else if (message.data.type === "keeper-line-ended")
      onKeeperLineEnded(socket, client, message.data);
    else onControl(socket, client, message.data);
  };

  const http = createServer((req, res) => {
    void serveStatic(options.webRoot, req, res).catch(() => {
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        res.end("Internal error.\n");
      } else res.destroy();
    });
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });

  wss.on("connection", (socket: WebSocket) => {
    clients.set(socket, { role: "pending" });
    socket.on("close", () => {
      const current = clients.get(socket);
      clients.delete(socket);
      if (!current || closing || !current.deviceId) return;
      detachDevice(socket, current.deviceId);
    });
    socket.on("error", () => socket.terminate());
    socket.on("message", (data) => {
      try {
        handle(socket, data);
      } catch {
        console.error("Session message failed.");
        sendError(socket, "invalid-state", "That message was not applied.");
      }
    });
  });

  http.on("upgrade", (req: IncomingMessage, socket, head) => {
    const fail = (status: string) => {
      socket.on("error", () => socket.destroy());
      socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`, () => socket.destroy());
    };
    if (requestPath(req.url) !== WS_PATH) {
      fail("404 Not Found");
      return;
    }
    if (!isAllowedOrigin(header(req.headers.origin), header(req.headers.host), devOrigins)) {
      fail("403 Forbidden");
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  try {
    await new Promise<void>((resolveListen, reject) => {
      const onError = (error: Error) => {
        http.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        http.off("error", onError);
        resolveListen();
      };
      http.once("error", onError);
      http.once("listening", onListening);
      http.listen(options.port, options.host);
    });
  } catch (error) {
    if (timer) clearInterval(timer);
    await new Promise<void>((resolveClose) => {
      http.close(() => resolveClose());
    });
    wss.close();
    opened.close();
    throw error;
  }

  const address = http.address();
  const port = address && typeof address === "object" ? address.port : options.port;
  boundPort = port;
  let closingPromise: Promise<void> | undefined;

  return {
    port,
    joinCode,
    loadRun: () => store.loadRun(sessionId),
    syncTower,
    close: () => {
      if (closingPromise) return closingPromise;
      closing = true;
      if (timer) clearInterval(timer);
      closingPromise = (async () => {
        try {
          for (const id of deviceSockets.keys()) engine.disconnect(id);
          engine.close();
          deviceSockets.clear();
          for (const socket of clients.keys()) socket.close();
          clients.clear();
          await new Promise<void>((resolveClose) => {
            wss.close();
            http.close(() => resolveClose());
            http.closeAllConnections();
          });
        } finally {
          tower.close();
          opened.close();
        }
      })();
      return closingPromise;
    },
  };
};
