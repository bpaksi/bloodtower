import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import {
  CLIENT_MESSAGE_TYPES,
  type CommandLifecyclePayload,
  clientMessageSchema,
  type Envelope,
  type ErrorCode,
  envelopeSchema,
  inventory,
  PROTOCOL_VERSION,
  type ServerMessage,
  toInventoryEntry,
} from "tower-poc-protocols";
import { type RawData, type WebSocket, WebSocketServer } from "ws";
import { type ClientHub, createClientHub } from "./clientHub.ts";
import { type CommandExecutor, createCommandExecutor } from "./executor.ts";
import { SessionStateError, type TowerSession } from "./session.ts";
import { NoPendingRestoreError, type StateStore } from "./stateStore.ts";
import { requestPath, serveStatic } from "./static.ts";
import { handleTimingResults } from "./timing/http.ts";
import type { TowerRecords } from "./towerRecords.ts";
import type { Verifications } from "./verifications.ts";
import { installedVersion } from "./versions.ts";

export const WS_PATH = "/ws";
/** Far above any protocol message. The `ws` default is 100 MiB, all of it parsed as JSON. */
const MAX_MESSAGE_BYTES = 64 * 1024;

/** The inventory as `welcome` carries it. It cannot change while the service runs. */
const INVENTORY = inventory.map(toInventoryEntry);

export interface TowerServerOptions {
  port: number;
  host: string;
  /** Folder holding the web part's static export. */
  webRoot: string;
  serverVersion: string;
  /** The tower connection the lifecycle messages and commands act on. */
  session: TowerSession;
  /** The tower values every client is shown, and the restore prompt (D11). */
  store: StateStore;
  /** The service's own record of seals and skulls, which some commands change (spec D24). */
  records: TowerRecords;
  /** Verify mode's results, overlaid on the inventory in `welcome` (D14). */
  verifications: Verifications;
  /** Which tower the session drives, for `welcome`. */
  tower: "mock" | "bluetooth";
  /**
   * Extra origins a `/ws` connection may come from, besides the service's own (D20). Only the
   * `next dev` origin belongs here, and only in dev mode.
   */
  devOrigins?: readonly string[];
  /** Also called with every command lifecycle stage, after it is broadcast. */
  onLifecycle?: (payload: CommandLifecyclePayload) => void;
  /**
   * Where a saved timing result is written. Unset, `POST /api/timing-results` answers 404
   * and writes nothing.
   */
  timingResultsDir?: string;
}

export interface TowerServer {
  port: number;
  /** The connected clients and the broadcast to them. */
  hub: ClientHub;
  close: () => Promise<void>;
}

/**
 * Whether a `/ws` upgrade may proceed (D20). A page served by this service has an `Origin` whose
 * host and port are the ones the request was sent to, which is the `Host` header: the service
 * listens on every address, so it has no single origin of its own to compare with. A request with
 * no `Origin` is not from a web page (browsers always send one on a WebSocket upgrade) and is let
 * through.
 */
export const isAllowedOrigin = (
  origin: string | undefined,
  host: string | undefined,
  devOrigins: readonly string[] = [],
) => {
  if (origin === undefined) return true;
  if (devOrigins.includes(origin)) return true;
  if (!host) return false;
  try {
    const url = new URL(origin);
    return (url.protocol === "http:" || url.protocol === "https:") && url.host === host;
  } catch {
    // "null" (a sandboxed page or a file) and anything else that is not a URL.
    return false;
  }
};

/**
 * Reads the comma-separated `DEV_ORIGINS` value. Each entry is reduced to scheme, host and port, so
 * a trailing slash does not stop it matching. An entry that is not an http or https origin is an
 * error, not something to skip: `localhost:3000` without a scheme parses as an origin of "null",
 * and letting that through would admit every sandboxed and file page.
 */
export const parseDevOrigins = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "")
    .map((entry) => {
      const url = URL.canParse(entry) ? new URL(entry) : undefined;
      if (
        !url ||
        (url.protocol !== "http:" && url.protocol !== "https:") ||
        url.origin === "null"
      ) {
        throw new Error(
          `DEV_ORIGINS has an entry that is not an http or https origin: "${entry}". Write it like http://localhost:3000.`,
        );
      }
      return url.origin;
    });

/** Sends to one client. A socket that has started closing is skipped, as the hub's broadcast does. */
const send = (socket: WebSocket, message: ServerMessage) => {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
};

const sendError = (socket: WebSocket, code: ErrorCode, message: string, correlationId?: string) =>
  send(socket, {
    v: PROTOCOL_VERSION,
    type: "error",
    ...(correlationId ? { correlationId } : {}),
    payload: { code, message },
  });

const connectionMessage = (session: TowerSession): ServerMessage => ({
  v: PROTOCOL_VERSION,
  type: "connection",
  payload: session.status(),
});

const stateMessage = (store: StateStore): ServerMessage => {
  const pendingRestore = store.pendingRestore();
  return {
    v: PROTOCOL_VERSION,
    type: "state",
    payload: { snapshot: store.snapshot(), ...(pendingRestore ? { pendingRestore } : {}) },
  };
};

/**
 * Runs one of the four lifecycle actions. Its outcome reaches every client as `connection`; only
 * a refusal is answered here, to the client that asked.
 */
const runAction = (socket: WebSocket, action: Promise<void>, correlationId?: string) =>
  action.catch((error) => {
    if (error instanceof SessionStateError) {
      return sendError(socket, "invalid-state", error.message, correlationId);
    }
    // The session reports its own failures in its status, so this is a bug in the service.
    console.error("Tower session action failed:", error);
  });

interface Context {
  options: TowerServerOptions;
  hub: ClientHub;
  executor: CommandExecutor;
  versions: { library: string; data: string };
}

const handleMessage = (socket: WebSocket, data: RawData, context: Context) => {
  const { options, hub, executor, versions } = context;
  const { serverVersion, session, store } = options;
  const client = hub.get(socket);
  // A message can still arrive in the moment between the socket closing and its removal.
  if (!client) return;
  const clientId = client.id;
  let json: unknown;
  try {
    json = JSON.parse(data.toString());
  } catch {
    return sendError(socket, "invalid-json", "Message is not valid JSON.");
  }

  const envelope = envelopeSchema.safeParse(json);
  if (!envelope.success) {
    return sendError(socket, "invalid-envelope", "Message is not a valid protocol envelope.");
  }
  const { id, type }: Envelope = envelope.data;

  if (!CLIENT_MESSAGE_TYPES.includes(type)) {
    return sendError(socket, "unknown-type", `Unknown message type "${type}".`, id);
  }
  const message = clientMessageSchema.safeParse(envelope.data);
  if (!message.success) {
    return sendError(socket, "invalid-payload", `Invalid payload for "${type}".`, id);
  }

  switch (message.data.type) {
    case "hello":
      client.label = message.data.payload.clientLabel;
      send(socket, {
        v: PROTOCOL_VERSION,
        type: "welcome",
        ...(id ? { correlationId: id } : {}),
        payload: {
          clientId,
          versions: {
            protocol: PROTOCOL_VERSION,
            server: serverVersion,
            node: process.version,
            ...versions,
          },
          inventory: INVENTORY,
          verificationOverlay: options.verifications.overlay(),
          tower: options.tower,
        },
      });
      // Then where the tower stands and what the service knows of it.
      send(socket, connectionMessage(session));
      return send(socket, stateMessage(store));
    case "connect":
      return runAction(socket, session.connect(), id);
    case "reconnect":
      return runAction(socket, session.reconnect(), id);
    case "disconnect":
      return runAction(socket, session.disconnect(), id);
    case "calibrate":
      // The calibration packet would land in the middle of a command and make its lifecycle
      // wrong. Nothing waits: the person calibrates again when the commands have ended.
      if (executor.busy()) {
        return sendError(
          socket,
          "invalid-state",
          "Commands are still running or waiting. Calibrate when they have finished.",
          id,
        );
      }
      return runAction(socket, session.calibrate(), id);
    case "command":
      // Its outcome, rejections included, reaches every client as `command.lifecycle`.
      return void executor.submit({
        commandId: message.data.id,
        clientId,
        capabilityId: message.data.payload.capabilityId,
        params: message.data.payload.params,
      });
    case "restoreState":
      // Bookkeeping only: nothing is sent to the tower (D11). Every client sees the outcome as
      // `state`, without the prompt.
      try {
        return store.answerRestore(message.data.payload.accept);
      } catch (error) {
        if (error instanceof NoPendingRestoreError) {
          return sendError(socket, "invalid-state", error.message, id);
        }
        // A bug in the service; thrown here it would stop the whole process.
        return console.error("Restoring state failed:", error);
      }
    case "verify.record": {
      // A person's account of what the tower did. Nothing is sent to the tower.
      let outcome: ReturnType<Verifications["record"]>;
      try {
        outcome = options.verifications.record(
          message.data.payload,
          client.label ?? "Unnamed device",
        );
      } catch (error) {
        console.error("Saving a Verify result failed:", error);
        return sendError(
          socket,
          "invalid-state",
          "The result was not saved: the service could not write it.",
          id,
        );
      }
      if (!outcome.ok) return sendError(socket, "invalid-payload", outcome.reason, id);
      // Every client sees it; the id tells the device that recorded it that it was saved.
      return hub.broadcast({
        v: PROTOCOL_VERSION,
        type: "verify.changed",
        correlationId: id,
        payload: { verificationOverlay: outcome.overlay },
      });
    }
    default: {
      // A client message type with no case here is a compile error, not a message left unanswered.
      const unhandled: never = message.data;
      return unhandled;
    }
  }
};

/** Starts the HTTP server (static web UI) and the WebSocket endpoint on one port. */
export const startTowerServer = async (options: TowerServerOptions): Promise<TowerServer> => {
  const http = createServer((req, res) => {
    const origin = Array.isArray(req.headers.origin) ? req.headers.origin[0] : req.headers.origin;
    const host = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host;
    handleTimingResults(
      req,
      res,
      options.timingResultsDir,
      isAllowedOrigin(origin, host, options.devOrigins),
    )
      .then((handled) => {
        if (!handled) return serveStatic(options.webRoot, req, res);
      })
      .catch(() => res.destroy());
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });
  const hub = createClientHub();
  // Every client sees every command's lifecycle, whoever sent it (D7).
  const executor = createCommandExecutor({
    session: options.session,
    records: options.records,
    onLifecycle: (payload) => {
      hub.broadcast({ v: PROTOCOL_VERSION, type: "command.lifecycle", payload });
      options.onLifecycle?.(payload);
    },
  });
  const context: Context = {
    options,
    hub,
    executor,
    versions: {
      library: installedVersion("ultimatedarktower"),
      data: installedVersion("ultimatedarktowerdata"),
    },
  };
  wss.on("connection", (socket) => {
    hub.add(socket);
    socket.on("close", () => hub.remove(socket));
    // ws reports protocol violations (bad frames, invalid UTF-8) as `error`. Unhandled, that would
    // take the whole service down, so drop just this client.
    socket.on("error", () => socket.terminate());
    socket.on("message", (data) => handleMessage(socket, data, context));
  });

  // Every client sees every change of connection and calibration state, whoever caused it (D7).
  const stopBroadcast = options.session.subscribe(() =>
    hub.broadcast(connectionMessage(options.session)),
  );
  // Every value change and the restore prompt closing, likewise.
  const stopStateBroadcast = options.store.subscribe(() =>
    hub.broadcast(stateMessage(options.store)),
  );

  http.on("upgrade", (req, socket, head) => {
    if (requestPath(req.url) !== WS_PATH) {
      // Destroy after the reply is flushed, so a client that stays connected cannot hold close() open.
      socket.on("error", () => socket.destroy());
      socket.end("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n", () => socket.destroy());
      return;
    }
    if (!isAllowedOrigin(req.headers.origin, req.headers.host, options.devOrigins)) {
      socket.on("error", () => socket.destroy());
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n", () => socket.destroy());
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  await new Promise<void>((resolve, reject) => {
    http.once("error", reject);
    http.listen(options.port, options.host, () => {
      http.off("error", reject);
      resolve();
    });
  });

  return {
    port: (http.address() as AddressInfo).port,
    hub,
    close: () =>
      new Promise<void>((resolve, reject) => {
        stopBroadcast();
        stopStateBroadcast();
        hub.closeAll();
        wss.close();
        http.close((error) => (error ? reject(error) : resolve()));
        http.closeAllConnections();
      }),
  };
};
