import { randomBytes } from "node:crypto";
import { createServer, type IncomingMessage } from "node:http";
import { dirname } from "node:path";
import {
  boardViewMessageSchema,
  CLIENT_MESSAGE_TYPES,
  type ClientMessage,
  clientMessageSchema,
  containsPrivateChannel,
  deviceViewMessageSchema,
  type ErrorCode,
  envelopeSchema,
  errorPayloadSchema,
  loggedMessageSchema,
  PAGE_LOG_MESSAGE_MAX,
  PROTOCOL_VERSION,
  type ServerMessage,
  welcomePayloadSchema,
} from "bloodtower-protocols";
import { type RawData, WebSocket, WebSocketServer } from "ws";
import { loadStoryCatalog } from "../core/loadStories.ts";
import { type CoreSession, createCoreSession } from "../core/session.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore, type StoredRun } from "../db/store.ts";
import { storedRunFromEventLog } from "../events/rebuildRun.ts";
import { createEventStore } from "../events/store.ts";
import { joinHost } from "../lanUrls.ts";
import {
  createHostLogger,
  type HostLogger,
  handleLogIngest,
  isLogIngestPath,
  type LogEntry,
} from "../log/hostLog.ts";
import { devAudioAllowOrigin } from "../pack/audio.ts";
import { tryServePackAssets } from "../pack/serve.ts";
import { formatPackV2Issues } from "../pack/v2/load.ts";
import { requestPath, serveStatic } from "../server.ts";
import { type Clock, systemClock } from "../timing/clock.ts";
import { type BloodtowerTower, createBloodtowerTower } from "../tower/host.ts";
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
  tower?: BloodtowerTower;
  devOrigins?: readonly string[];
  /** When set, join URLs use this HTTP port (for example `next dev` on 3000) while `/ws` stays on `port`. */
  joinPagePort?: number;
  /** Six digits. Omitted, a code is chosen for this process. */
  joinCode?: string;
  clock?: Clock;
  /** How often a changed tower snapshot is published. 0 reads it only on syncTower. */
  towerWatchMs?: number;
  /** The address iPads open for the join QR. Undefined when only loopback is reachable. Defaults to the LAN address for `host`. */
  lanHost?: () => string | undefined;
  /**
   * Decision 0003 log. Omitted, one is created under the database folder and pruned on start.
   * Pass the same instance the tower was built with so a command failure shares this file.
   */
  log?: HostLogger;
  /** Waits for the volume test's timing. Tests pass one that does not wait. */
  sleep?: (ms: number) => Promise<void>;
  /** Game seed. Omitted, one is chosen for this process. */
  seed?: string;
  /** Device holding grace after a drop. E2e passes a short value. */
  graceMs?: number;
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
 * The story packs are loaded before the port opens. The tower is not connected here.
 * Arrival order on this process is the lock order. Client clocks are not read.
 */
export const startSessionHost = async (options: SessionHostOptions): Promise<SessionHost> => {
  const log = options.log ?? createHostLogger({ dataDir: dirname(options.databasePath) });
  const catalog = loadStoryCatalog(options.packsDir);
  if (catalog.stories.length === 0) {
    throw new Error(`No story pack loaded.\n${formatPackV2Issues(catalog.issues).join("\n")}`);
  }
  for (const issue of catalog.issues) {
    log.error("pack-load", formatPackV2Issues([issue]).join("\n"));
  }
  const packAssetCatalogs = catalog.assetIndexes;
  for (const index of packAssetCatalogs) {
    for (const warning of index.warnings) {
      log.error("pack-asset", `${index.packId}: ${warning.message}`);
    }
  }
  const joinCode =
    options.joinCode ?? String(randomBytes(3).readUIntBE(0, 3) % 1_000_000).padStart(6, "0");
  const clock = options.clock ?? systemClock();
  const opened = openDatabase(options.databasePath);
  const store = createSessionStore(opened.db);
  const sessionId = `session-${randomBytes(8).toString("hex")}`;
  log.setSession(sessionId);
  const devOrigins = options.devOrigins ?? [];
  const allowDevPrivateOrigins = devOrigins.length > 0;
  const joinPagePort = options.joinPagePort;
  const tower = options.tower ?? createBloodtowerTower({ mock: process.env.MOCK === "1" });
  const eventStore = createEventStore(opened.db);
  const lanHost = options.lanHost ?? (() => joinHost(options.host));
  const sleep =
    options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const seed = options.seed ?? randomBytes(8).toString("hex");
  const playableStory = catalog.stories.find((story) => story.card.playable) ?? catalog.stories[0];
  const packId = playableStory?.card.id ?? "test";
  const packVersion = packId === "test" ? "0.1.0" : "0.0.0";
  store.saveRoster({
    sessionId,
    packId,
    packVersion,
    startedWall: clock.wall(),
    joinCode,
    devices: [],
    holdings: [],
  });
  let broadcastImpl: () => void = () => undefined;
  let engine: CoreSession;
  const persistRoster = () => {
    const current = engine.state();
    const roster = engine.roster();
    store.saveRoster({
      sessionId,
      packId,
      packVersion,
      startedWall: clock.wall(),
      joinCode,
      devices: roster.devices.map((device) => ({
        deviceId: device.id,
        formFactor: device.formFactor,
        token: device.token,
        connected: current.devices.has(device.id),
      })),
      holdings: Object.entries(current.holdings).flatMap(([hunter, deviceId]) =>
        deviceId == null ? [] : [{ deviceId, hunter }],
      ),
    });
  };
  try {
    engine = createCoreSession({
      sessionId,
      seed,
      stories: catalog.stories,
      playContent: catalog.defaultPlay,
      packVersion,
      store: eventStore,
      graceMs: options.graceMs,
      tower,
      clock,
      log,
      onChange: () => {
        broadcastImpl();
        persistRoster();
      },
    });
    engine.restoreDevices(store.listDevices());
  } catch (error) {
    opened.close();
    throw error;
  }
  const autosaveRow = eventStore.getAutosave();
  if (autosaveRow) {
    if (autosaveRow.sessionId !== sessionId) {
      eventStore.replaceAutosave({ ...autosaveRow, sessionId });
    }
    const checkpoint = eventStore.lastCheckpoint(autosaveRow.gameId);
    await engine.whenIdle();
    engine.rememberAutosave({
      gameId: autosaveRow.gameId,
      packId: autosaveRow.packId,
      day: checkpoint?.day ?? 1,
    });
    engine.syncTowerSnapshot();
  }

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
    const pagePort = joinPagePort ?? boundPort;
    return {
      url: `http://${host ?? "127.0.0.1"}:${pagePort}/join?code=${joinCode}`,
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
    const client = clients.get(socket);
    log.error(code, message, { device: client?.deviceId ?? null });
    send(socket, {
      v: PROTOCOL_VERSION,
      type: "error",
      ...(correlationId ? { correlationId } : {}),
      payload,
    });
  };

  const toastMessage = (text: string): string => {
    const clipped =
      text.length > PAGE_LOG_MESSAGE_MAX ? `${text.slice(0, PAGE_LOG_MESSAGE_MAX - 3)}...` : text;
    if (clipped.trim() === "" || containsPrivateChannel(clipped)) return "An error was logged.";
    return clipped;
  };

  let inToast = false;
  const notifyBoards = (entry: LogEntry) => {
    if (inToast || entry.level !== "error" || closing) return;
    inToast = true;
    try {
      const parsed = loggedMessageSchema.safeParse({
        v: PROTOCOL_VERSION,
        type: "logged",
        payload: {
          code: entry.code,
          source: entry.source,
          message: toastMessage(entry.message),
        },
      });
      if (!parsed.success) {
        log.error("log-toast", "The story board toast was refused.");
        return;
      }
      for (const [board, client] of clients) {
        if (client.role === "storyboard") send(board, parsed.data);
      }
    } finally {
      inToast = false;
    }
  };

  const stopLog = log.subscribe(notifyBoards);

  const storyboardMessage = (): ServerMessage | undefined => {
    try {
      const join = joinAt();
      const payload = engine.projectBoard({
        code: joinCode,
        url: join.url,
        reachable: join.reachable,
      });
      return boardViewMessageSchema.parse({
        v: PROTOCOL_VERSION,
        type: "boardView",
        payload,
      });
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      log.error("board-view", detail.trim() === "" ? "Story board view was refused." : detail);
      return undefined;
    }
  };

  const deviceMessage = (deviceId: string): ServerMessage | undefined => {
    try {
      const payload = engine.projectDevice(deviceId);
      return deviceViewMessageSchema.parse({
        v: PROTOCOL_VERSION,
        type: "deviceView",
        payload,
      });
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      log.error("device-view", detail.trim() === "" ? "Device view was refused." : detail);
      return undefined;
    }
  };

  broadcastImpl = () => {
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
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      log.error("broadcast", detail.trim() === "" ? "Broadcast failed." : detail);
    }
  };
  const broadcast = () => broadcastImpl();

  const syncTower = () => {
    const next = JSON.stringify(tower.snapshot());
    if (next === lastSnapshot) return;
    engine.syncTowerSnapshot();
    broadcast();
  };
  tower.subscribe(() => syncTower());

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

  const channelsFor = (deviceId: string) => engine.channelsFor(deviceId);

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
    if (payload.joinCode !== joinCode) {
      sendError(
        socket,
        "invalid-state",
        "The join code does not match this session.",
        correlationId,
      );
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

  const onAct = (socket: WebSocket, client: ClientState, message: ClientMessage) => {
    if (message.type !== "act") return;
    const correlationId = message.id;
    if (client.role === "pending") {
      sendError(socket, "invalid-state", "Say hello before anything else.", correlationId);
      return;
    }
    if (client.role !== "device" || !client.deviceId) {
      sendError(socket, "storyboard-control", "The story board is display only.", correlationId);
      return;
    }
    engine.act(
      client.deviceId,
      message.payload.promptId,
      message.payload.actionId,
      message.payload.args,
    );
  };

  /**
   * A page log (D39). It changes no game state. Source, device id and session come from
   * this socket after hello (D12), never from the payload. A pending socket is refused:
   * it has no role, so it cannot claim the story board or a device. A storyboard line
   * has no device id.
   */
  const onLog = (socket: WebSocket, client: ClientState, message: ClientMessage) => {
    if (message.type !== "log") return;
    const correlationId = message.id;
    if (client.role === "pending") {
      sendError(socket, "invalid-state", "Say hello before anything else.", correlationId);
      return;
    }
    log.append({
      level: message.payload.level,
      source: client.role === "storyboard" ? "board" : "device",
      device: client.role === "device" ? (client.deviceId ?? null) : null,
      session: sessionId,
      screen: message.payload.screen,
      code: message.payload.code,
      message: message.payload.message,
    });
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
    else if (message.data.type === "log") onLog(socket, client, message.data);
    else if (message.data.type === "act") onAct(socket, client, message.data);
  };

  const http = createServer((req, res) => {
    const pathname = requestPath(req.url);
    const origin = header(req.headers.origin);
    const allowOrigin = devAudioAllowOrigin(pathname, origin, devOrigins);
    if (allowOrigin) {
      res.setHeader("access-control-allow-origin", allowOrigin);
      res.setHeader("vary", "origin");
    }
    if (
      isLogIngestPath(pathname) &&
      origin &&
      devOrigins.length > 0 &&
      isAllowedOrigin(origin, undefined, devOrigins, allowDevPrivateOrigins)
    ) {
      res.setHeader("access-control-allow-origin", origin);
      res.setHeader("vary", "origin");
      res.setHeader("access-control-allow-methods", "POST, OPTIONS");
      res.setHeader("access-control-allow-headers", "content-type");
    }
    if (isLogIngestPath(pathname) && req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    void (async () => {
      if (isLogIngestPath(pathname)) {
        await handleLogIngest(req, res, log);
        return;
      }
      if (await tryServePackAssets(packAssetCatalogs, req, res)) return;
      return serveStatic(options.webRoot, req, res);
    })().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      log.error("http-request", message.trim() === "" ? "The request failed." : message);
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
      } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : String(error);
        const shown = detail.trim() === "" ? "That message was not applied." : detail;
        sendError(
          socket,
          "invalid-state",
          shown.length > 300 ? `${shown.slice(0, 297)}...` : shown,
        );
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
    if (
      !isAllowedOrigin(
        header(req.headers.origin),
        header(req.headers.host),
        devOrigins,
        allowDevPrivateOrigins,
      )
    ) {
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
    loadRun: () => {
      const base = store.loadRun(sessionId);
      const gameId =
        engine.currentGameId() ?? eventStore.autosaveForSession(sessionId)?.gameId ?? null;
      if (gameId && eventStore.hasEvents(gameId)) {
        return storedRunFromEventLog(eventStore, gameId, base);
      }
      return base;
    },
    syncTower,
    close: () => {
      if (closingPromise) return closingPromise;
      closing = true;
      stopLog();
      if (timer) clearInterval(timer);
      closingPromise = (async () => {
        try {
          for (const id of deviceSockets.keys()) engine.disconnect(id);
          deviceSockets.clear();
          await engine.cancelDisconnects();
          for (const socket of clients.keys()) socket.close();
          clients.clear();
          await new Promise<void>((resolveClose) => {
            wss.close();
            http.close(() => resolveClose());
            http.closeAllConnections();
          });
        } finally {
          await engine.whenIdle();
          void tower.close();
          opened.close();
        }
      })();
      return closingPromise;
    },
  };
};
