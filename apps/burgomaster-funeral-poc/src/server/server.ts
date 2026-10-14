import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import type { Duplex } from "node:stream";
import { hostHealthSchema, PROTOCOL_VERSION } from "burgomaster-funeral-poc-protocols";
import type { LiveServer } from "./live.ts";

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wav": "audio/wav",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

const HEALTH = hostHealthSchema.parse({ protocol: PROTOCOL_VERSION, towerUsed: false });

const isFile = async (path: string) => {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
};

/** Path part of a request target, or undefined when the target is not a URL. */
export const requestPath = (url: string | undefined) => {
  try {
    return new URL(url ?? "/", "http://localhost").pathname;
  } catch {
    return undefined;
  }
};

/**
 * Maps a request path onto a file inside `root`, the way a Next static export lays pages out.
 * Returns undefined when nothing matches or the path escapes `root`.
 */
export const resolveStaticFile = async (root: string, urlPath: string) => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return undefined;
  }
  if (decoded.includes("\0")) return undefined;

  const base = resolve(root);
  const target = resolve(join(base, decoded));
  if (target !== base && !target.startsWith(`${base}${sep}`)) return undefined;

  const candidates =
    target === base
      ? [join(base, "index.html")]
      : [target, `${target}.html`, join(target, "index.html")];
  for (const candidate of candidates) {
    if (await isFile(candidate)) return candidate;
  }
  return undefined;
};

const sendText = (res: ServerResponse, status: number, text: string) => {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
};

const sendJson = (res: ServerResponse, status: number, body: unknown, head: boolean) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(head ? undefined : JSON.stringify(body));
};

/** Serves the exported web UI. `GET /health` reports the protocol and that no tower is in use. */
export const serveStatic = async (root: string, req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("allow", "GET, HEAD");
    return sendText(res, 405, "Method not allowed.\n");
  }

  const pathname = requestPath(req.url);
  if (pathname === undefined) return sendText(res, 400, "Bad request.\n");
  if (pathname === "/health") return sendJson(res, 200, HEALTH, req.method === "HEAD");

  let status = 200;
  let file = await resolveStaticFile(root, pathname);
  if (!file) {
    status = 404;
    file = await resolveStaticFile(root, "/404.html");
  }
  if (!file) {
    const built = await isFile(join(root, "index.html"));
    return sendText(
      res,
      404,
      built ? "Not found.\n" : `Web UI is not built yet. Expected a static export in ${root}\n`,
    );
  }

  res.writeHead(status, {
    "content-type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream",
  });
  if (req.method === "HEAD") return res.end();
  createReadStream(file)
    .on("error", () => res.destroy())
    .pipe(res);
};

export interface HostOptions {
  port: number;
  host: string;
  webRoot: string;
  /** When set, the slice (join, scene, assets) is attached after the port is bound. */
  live?: (bound: { port: number }) => LiveServer;
}

export interface Host {
  port: number;
  joinUrl?: string;
  close: () => Promise<void>;
}

/** HTTP host for the static export. With `live`, it also runs the slice. It does not open a tower connection. */
export const startHost = async (options: HostOptions): Promise<Host> => {
  let live: LiveServer | undefined;
  let releaseReady: () => void = () => undefined;
  let failReady: (error: unknown) => void = () => undefined;
  const ready = new Promise<void>((resolve, reject) => {
    releaseReady = resolve;
    failReady = reject;
  });
  if (!options.live) releaseReady();

  const server = createServer((req, res) => {
    void (async () => {
      if (options.live) await ready;
      if (live && (await live.handleHttp(req, res))) return;
      await serveStatic(options.webRoot, req, res);
    })().catch(() => {
      if (!res.headersSent) sendText(res, 500, "Internal error.\n");
      else res.destroy();
    });
  });
  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    void ready.then(
      () => {
        if (!live || socket.destroyed || !req.url) {
          socket.destroy();
          return;
        }
        live.handleUpgrade(req, socket, head);
      },
      () => socket.destroy(),
    );
  });
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => resolveListen());
  });
  const address = server.address();
  const port = address && typeof address === "object" ? address.port : options.port;
  try {
    live = options.live?.({ port });
    releaseReady();
  } catch (error) {
    failReady(error);
    server.close();
    throw error;
  }
  return {
    port,
    ...(live ? { joinUrl: live.joinUrl } : {}),
    close: () =>
      new Promise((resolveClose, reject) => {
        const done = () => {
          server.close((error) => (error ? reject(error) : resolveClose()));
        };
        if (!live) {
          done();
          return;
        }
        live.close().then(done, reject);
      }),
  };
};
