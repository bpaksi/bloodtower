import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { networkInterfaces } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import type { Duplex } from "node:stream";
import {
  CLIENT_MESSAGE_TYPES,
  clientMessageSchema,
  cueMessageSchema,
  dashboardStateMessageSchema,
  deviceStateMessageSchema,
  envelopeSchema,
  errorMessageSchema,
  PROTOCOL_VERSION,
  welcomeMessageSchema,
} from "burgomaster-funeral-poc-protocols";
import QRCode from "qrcode";
import { WebSocket, WebSocketServer } from "ws";
import { authorizeAsset, loadCatalog } from "./assets/catalog.ts";
import { appendEvent, openLog } from "./db/log.ts";
import { advertiseHost, joinUrl, type NetAddress } from "./net/join-url.ts";
import { type Clock, systemClock } from "./session/clock.ts";
import { DemoSession, publicHunters } from "./session/slice.ts";

const ASSET_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".webp": "image/webp",
};

export interface LiveServer {
  joinUrl: string;
  handleHttp: (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;
  handleUpgrade: (req: IncomingMessage, socket: Duplex, head: Buffer) => void;
  close: () => Promise<void>;
}

export interface LiveOptions {
  port: number;
  bindHost: string;
  dataDir: string;
  assetsRoot: string;
  clock?: Clock;
  interfaces?: readonly NetAddress[];
}

const listInterfaces = (): NetAddress[] =>
  Object.values(networkInterfaces()).flatMap((items) =>
    (items ?? []).map((item) => ({
      address: item.address,
      family: String(item.family),
      internal: item.internal,
    })),
  );

const pathnameOf = (url: string | undefined): URL | undefined => {
  try {
    return new URL(url ?? "/", "http://localhost");
  } catch {
    return undefined;
  }
};

const bearer = (req: IncomingMessage, url: URL): string | undefined => {
  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    if (token) return token;
  }
  const query = url.searchParams.get("token");
  return query && query.length > 0 ? query : undefined;
};

const sendJson = (res: ServerResponse, status: number, body: unknown, head: boolean) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(head ? undefined : payload);
};

const sendText = (res: ServerResponse, status: number, text: string) => {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
};

interface SocketClient {
  socket: WebSocket;
  role?: "dashboard" | "device";
  deviceId?: string;
  token?: string;
  hello: boolean;
}

/**
 * The running slice: SQLite log, WebSocket hub, join QR, and the asset files in place.
 * It does not open a tower connection.
 */
export const createLive = (options: LiveOptions): LiveServer => {
  const catalog = loadCatalog(options.assetsRoot);
  const stored = openLog(join(options.dataDir, "funeral.sqlite"));
  const clock = options.clock ?? systemClock();
  const host = advertiseHost(options.bindHost, options.interfaces ?? listInterfaces());
  const clients = new Set<SocketClient>();
  const wss = new WebSocketServer({ noServer: true });

  let session: DemoSession;
  const broadcast = () => {
    const cues = session.pullCues();
    for (const client of clients) {
      if (!client.hello || !client.token) continue;
      if (client.role === "dashboard") {
        for (const cue of cues) {
          send(
            client.socket,
            cueMessageSchema.parse({ v: PROTOCOL_VERSION, type: "cue", payload: cue }),
          );
        }
        send(
          client.socket,
          dashboardStateMessageSchema.parse({
            v: PROTOCOL_VERSION,
            type: "dashboardState",
            payload: session.dashboardState(),
          }),
        );
        continue;
      }
      if (client.role === "device" && client.deviceId) {
        send(
          client.socket,
          deviceStateMessageSchema.parse({
            v: PROTOCOL_VERSION,
            type: "deviceState",
            payload: session.deviceState(client.deviceId),
          }),
        );
      }
    }
  };

  session = new DemoSession({
    catalog,
    clock,
    joinUrlFor: (code) => joinUrl(host, options.port, code),
    log: (event) => appendEvent(stored.db, event),
    onChange: () => broadcast(),
  });

  const versions = {
    protocol: PROTOCOL_VERSION,
    server: "0.0.0",
    node: process.versions.node,
  };

  const send = (socket: WebSocket, message: unknown) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  };

  const fail = (
    socket: WebSocket,
    code:
      | "invalid-json"
      | "invalid-envelope"
      | "unknown-type"
      | "invalid-payload"
      | "invalid-state",
    message: string,
    correlationId?: string,
  ) => {
    send(
      socket,
      errorMessageSchema.parse({
        v: PROTOCOL_VERSION,
        type: "error",
        ...(correlationId ? { correlationId } : {}),
        payload: { code, message },
      }),
    );
  };

  const onMessage = (client: SocketClient, raw: WebSocket.RawData) => {
    const text =
      typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : undefined;
    if (text === undefined) {
      fail(client.socket, "invalid-json", "Messages are JSON text.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      fail(client.socket, "invalid-json", "That message is not JSON.");
      return;
    }
    const envelope = envelopeSchema.safeParse(parsed);
    if (!envelope.success) {
      fail(client.socket, "invalid-envelope", "That message does not match the envelope.");
      return;
    }
    if (!CLIENT_MESSAGE_TYPES.includes(envelope.data.type)) {
      fail(
        client.socket,
        "unknown-type",
        "That message type is not part of this host.",
        envelope.data.id,
      );
      return;
    }
    const message = clientMessageSchema.safeParse(parsed);
    if (!message.success) {
      fail(
        client.socket,
        "invalid-payload",
        "That payload does not match its type.",
        envelope.data.id,
      );
      return;
    }
    if (!client.hello && message.data.type !== "hello") {
      fail(client.socket, "invalid-state", "Say hello before anything else.", message.data.id);
      return;
    }

    if (message.data.type === "hello") {
      if (client.hello) {
        fail(client.socket, "invalid-state", "This socket has already joined.", message.data.id);
        return;
      }
      if (message.data.payload.role === "dashboard") {
        const hello = session.helloDashboard();
        client.hello = true;
        client.role = "dashboard";
        client.token = hello.token;
        send(
          client.socket,
          welcomeMessageSchema.parse({
            v: PROTOCOL_VERSION,
            type: "welcome",
            payload: { ...hello, versions },
          }),
        );
        broadcast();
        return;
      }
      const joined = session.helloDevice(
        message.data.payload.formFactor === "phone" ? "phone" : "ipad",
        message.data.payload.joinCode,
        message.data.payload.token,
      );
      if (!joined.ok) {
        fail(client.socket, joined.error.code, joined.error.message, message.data.id);
        return;
      }
      client.hello = true;
      client.role = "device";
      client.deviceId = joined.hello.clientId;
      client.token = joined.hello.token;
      send(
        client.socket,
        welcomeMessageSchema.parse({
          v: PROTOCOL_VERSION,
          type: "welcome",
          payload: { ...joined.hello, versions },
        }),
      );
      broadcast();
      return;
    }

    if (message.data.type === "hold") {
      if (client.role !== "device" || client.deviceId !== message.data.payload.deviceId) {
        fail(
          client.socket,
          "invalid-state",
          "A device can only change its own hunters.",
          message.data.id,
        );
        return;
      }
      if (message.data.payload.by !== "device") {
        fail(
          client.socket,
          "invalid-state",
          "This slice changes holdings from the device.",
          message.data.id,
        );
        return;
      }
      const result = session.hold(
        message.data.payload.deviceId,
        message.data.payload.hunter,
        message.data.payload.action,
      );
      if (!result.ok) fail(client.socket, result.error.code, result.error.message, message.data.id);
      return;
    }

    if (message.data.type === "start") {
      if (client.role !== "dashboard") {
        fail(
          client.socket,
          "invalid-state",
          "Only the Dashboard begins the scene.",
          message.data.id,
        );
        return;
      }
      const result = session.begin();
      if (!result.ok) fail(client.socket, result.error.code, result.error.message, message.data.id);
      return;
    }

    if (message.data.type === "investigationPick") {
      if (client.role !== "device" || !client.deviceId) {
        fail(client.socket, "invalid-state", "Only a hunter's device can choose.", message.data.id);
        return;
      }
      const result = session.pick(
        client.deviceId,
        message.data.payload.hunter,
        message.data.payload.action,
      );
      if (!result.ok) fail(client.socket, result.error.code, result.error.message, message.data.id);
      return;
    }

    fail(client.socket, "invalid-state", "That action is not part of this slice.", message.data.id);
  };

  wss.on("connection", (socket: WebSocket) => {
    const client: SocketClient = { socket, hello: false };
    clients.add(client);
    socket.on("message", (raw) => {
      try {
        onMessage(client, raw);
      } catch (error) {
        console.error(error);
        fail(client.socket, "invalid-state", "The host could not apply that message.");
      }
    });
    socket.on("close", () => {
      clients.delete(client);
      if (client.deviceId) session.detach(client.deviceId);
    });
    socket.on("error", () => socket.close());
  });

  const handleHttp = async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    if (req.method !== "GET" && req.method !== "HEAD") return false;
    const url = pathnameOf(req.url);
    if (!url) return false;
    const head = req.method === "HEAD";

    if (url.pathname === "/hunters") {
      sendJson(res, 200, publicHunters(catalog), head);
      return true;
    }
    if (url.pathname === "/join/qr.svg") {
      const svg = await QRCode.toString(session.joinUrl, {
        type: "svg",
        margin: 1,
        errorCorrectionLevel: "M",
      });
      res.writeHead(200, {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "no-store",
      });
      res.end(head ? undefined : svg);
      return true;
    }
    if (url.pathname === "/view") {
      const actor = session.actorFor(bearer(req, url));
      if (!actor) {
        sendText(res, 401, "Join again.\n");
        return true;
      }
      const body =
        actor.role === "dashboard"
          ? session.dashboardView(bearer(req, url) ?? "")
          : session.deviceView(actor.device);
      sendJson(res, 200, body, head);
      return true;
    }
    if (url.pathname.startsWith("/assets/")) {
      const relative = assetRelative(url.pathname);
      const record = relative ? catalog.byPath.get(relative) : undefined;
      const actor = session.actorFor(bearer(req, url));
      const access = authorizeAsset(
        record,
        actor?.role === "dashboard"
          ? { role: "dashboard" }
          : actor
            ? { role: "device", held: actor.device.held, delivered: actor.delivered }
            : undefined,
      );
      if (!access.ok || !relative) {
        sendText(
          res,
          access.ok ? 404 : access.status,
          access.ok ? "Not found.\n" : "Not available.\n",
        );
        return true;
      }
      const root = resolve(options.assetsRoot);
      const absolute = resolve(root, relative);
      if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) {
        sendText(res, 404, "Not found.\n");
        return true;
      }
      const info = await stat(absolute).catch(() => undefined);
      if (!info?.isFile()) {
        sendText(res, 404, "Not found.\n");
        return true;
      }
      res.writeHead(200, {
        "content-type": ASSET_TYPES[extname(absolute)] ?? "application/octet-stream",
        "content-length": info.size,
        "cache-control": "private, max-age=3600",
      });
      if (head) {
        res.end();
        return true;
      }
      createReadStream(absolute)
        .on("error", () => res.destroy())
        .pipe(res);
      return true;
    }
    return false;
  };

  return {
    joinUrl: session.joinUrl,
    handleHttp,
    handleUpgrade: (req, socket, head) => {
      const url = pathnameOf(req.url);
      if (url?.pathname !== "/ws") {
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
    },
    close: async () => {
      session.close();
      for (const client of clients) client.socket.close();
      await new Promise<void>((resolveClose) => wss.close(() => resolveClose()));
      stored.close();
    },
  };
};

const assetRelative = (pathname: string): string | undefined => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname.slice("/assets/".length));
  } catch {
    return undefined;
  }
  if (
    decoded === "" ||
    decoded.includes("\0") ||
    decoded.includes("\\") ||
    decoded.startsWith("/") ||
    decoded.split("/").some((part) => part === ".." || part === "")
  ) {
    return undefined;
  }
  return decoded;
};
