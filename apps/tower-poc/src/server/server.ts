import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import {
  CLIENT_MESSAGE_TYPES,
  clientMessageSchema,
  type Envelope,
  type ErrorCode,
  envelopeSchema,
  PROTOCOL_VERSION,
  type ServerMessage,
} from "tower-poc-protocols";
import { type RawData, type WebSocket, WebSocketServer } from "ws";
import { requestPath, serveStatic } from "./static.ts";

export const WS_PATH = "/ws";

export interface TowerServerOptions {
  port: number;
  host: string;
  /** Folder holding the web part's static export. */
  webRoot: string;
  serverVersion: string;
  /**
   * Extra origins a `/ws` connection may come from, besides the service's own (D20). Only the
   * `next dev` origin belongs here, and only in dev mode.
   */
  devOrigins?: readonly string[];
}

export interface TowerServer {
  port: number;
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

const send = (socket: WebSocket, message: ServerMessage) => socket.send(JSON.stringify(message));

const sendError = (socket: WebSocket, code: ErrorCode, message: string, correlationId?: string) =>
  send(socket, {
    v: PROTOCOL_VERSION,
    type: "error",
    ...(correlationId ? { correlationId } : {}),
    payload: { code, message },
  });

const handleMessage = (
  socket: WebSocket,
  clientId: string,
  data: RawData,
  serverVersion: string,
) => {
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
      return send(socket, {
        v: PROTOCOL_VERSION,
        type: "welcome",
        ...(id ? { correlationId: id } : {}),
        payload: {
          clientId,
          versions: { protocol: PROTOCOL_VERSION, server: serverVersion, node: process.version },
        },
      });
    default:
      // Valid, and nothing handles it yet. In particular a `command` goes nowhere until the
      // executor exists (M2 step 5).
      return sendError(socket, "not-implemented", `"${type}" is not handled yet.`, id);
  }
};

/** Starts the HTTP server (static web UI) and the WebSocket endpoint on one port. */
export const startTowerServer = async (options: TowerServerOptions): Promise<TowerServer> => {
  const http = createServer((req, res) => {
    serveStatic(options.webRoot, req, res).catch(() => res.destroy());
  });

  const wss = new WebSocketServer({ noServer: true });
  wss.on("connection", (socket) => {
    const clientId = randomUUID();
    // ws reports protocol violations (bad frames, invalid UTF-8) as `error`. Unhandled, that would
    // take the whole service down, so drop just this client.
    socket.on("error", () => socket.terminate());
    socket.on("message", (data) => handleMessage(socket, clientId, data, options.serverVersion));
  });

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
    close: () =>
      new Promise<void>((resolve, reject) => {
        for (const client of wss.clients) client.terminate();
        wss.close();
        http.close((error) => (error ? reject(error) : resolve()));
        http.closeAllConnections();
      }),
  };
};
