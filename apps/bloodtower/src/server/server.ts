import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { hostHealthSchema, PROTOCOL_VERSION } from "bloodtower-protocols";

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".m4a": "audio/mp4",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

const AVATARS_ROOT = resolve(import.meta.dirname, "../../public");

export const contentTypeFor = (file: string): string =>
  CONTENT_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";

/**
 * One `bytes=start-end` range. Inclusive end. `unsatisfiable` is a 416.
 * Missing or malformed headers leave the full file (200).
 */
export const parseByteRange = (
  header: string | undefined,
  size: number,
): { start: number; end: number } | "unsatisfiable" | undefined => {
  if (!header) return undefined;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match) return undefined;
  const rawStart = match[1] ?? "";
  const rawEnd = match[2] ?? "";
  if (rawStart === "" && rawEnd === "") return undefined;
  if (rawStart === "") {
    const suffix = Number(rawEnd);
    if (!Number.isInteger(suffix) || suffix <= 0 || size === 0) return "unsatisfiable";
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(rawStart);
  if (!Number.isInteger(start) || start < 0) return "unsatisfiable";
  const end = rawEnd === "" ? size - 1 : Number(rawEnd);
  if (!Number.isInteger(end) || end < start || start >= size) return "unsatisfiable";
  return { start, end: Math.min(end, size - 1) };
};

const HEALTH = hostHealthSchema.parse({
  protocol: PROTOCOL_VERSION,
  tower: "connection-only",
  effects: "none",
});

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
 * Maps a request path onto a file inside `root`.
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

const pipeFile = (file: string, res: ServerResponse, range?: { start: number; end: number }) => {
  const stream = createReadStream(file, range);
  res.on("close", () => stream.destroy());
  stream.on("error", () => {
    if (!res.destroyed) res.destroy();
  });
  stream.pipe(res);
};

const header = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const sendText = (res: ServerResponse, status: number, text: string) => {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
};

const sendJson = (res: ServerResponse, status: number, body: unknown, head: boolean) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(head ? undefined : JSON.stringify(body));
};

/** Serves the exported web UI. `GET /health` reports connection-only mode and no effects. */
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
  if (!file && (pathname.startsWith("/avatars/") || pathname.startsWith("/landing/"))) {
    file = await resolveStaticFile(AVATARS_ROOT, pathname);
  }
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

  const type = contentTypeFor(file);
  if (status === 404) {
    res.writeHead(404, { "content-type": type });
    if (req.method === "HEAD") return res.end();
    pipeFile(file, res);
    return;
  }

  const size = (await stat(file)).size;
  const range = parseByteRange(header(req.headers.range), size);
  if (range === "unsatisfiable") {
    res.writeHead(416, {
      "content-type": type,
      "content-range": `bytes */${size}`,
      "accept-ranges": "bytes",
    });
    return res.end();
  }
  if (range) {
    res.writeHead(206, {
      "content-type": type,
      "content-range": `bytes ${range.start}-${range.end}/${size}`,
      "content-length": String(range.end - range.start + 1),
      "accept-ranges": "bytes",
    });
    if (req.method === "HEAD") return res.end();
    pipeFile(file, res, range);
    return;
  }

  res.writeHead(200, {
    "content-type": type,
    "content-length": String(size),
    "accept-ranges": "bytes",
  });
  if (req.method === "HEAD") return res.end();
  pipeFile(file, res);
};

export interface HostOptions {
  port: number;
  host: string;
  webRoot: string;
}

export interface Host {
  port: number;
  close: () => Promise<void>;
}

/**
 * HTTP host for the static export.
 * It does not open a tower connection and it does not send effects.
 */
export const startHost = async (options: HostOptions): Promise<Host> => {
  const server = createServer((req, res) => {
    void serveStatic(options.webRoot, req, res).catch(() => {
      if (!res.headersSent) sendText(res, 500, "Internal error.\n");
      else res.destroy();
    });
  });
  await new Promise<void>((resolveListen, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolveListen();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(options.port, options.host);
  });
  const address = server.address();
  const port = address && typeof address === "object" ? address.port : options.port;
  let closing: Promise<void> | undefined;
  return {
    port,
    close: () => {
      if (closing) return closing;
      closing = new Promise((resolveClose, reject) => {
        server.close((error) => (error ? reject(error) : resolveClose()));
        server.closeAllConnections();
      });
      return closing;
    },
  };
};
