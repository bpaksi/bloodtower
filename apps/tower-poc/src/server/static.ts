import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, join, resolve, sep } from "node:path";

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

const isFile = async (path: string) => {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
};

/**
 * Maps a request path to a file inside `root`, the way a Next.js static export
 * lays pages out: `/lights` is `lights.html` or `lights/index.html`.
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
  if (target !== base && !target.startsWith(base + sep)) return undefined;

  const candidates = [target, `${target}.html`, join(target, "index.html")];
  for (const candidate of candidates) {
    if (await isFile(candidate)) return candidate;
  }
  return undefined;
};

const sendText = (res: ServerResponse, status: number, text: string) => {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
};

/** Serves the exported web UI from `root`. Only GET and HEAD are allowed. */
export const serveStatic = async (root: string, req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("allow", "GET, HEAD");
    return sendText(res, 405, "Method not allowed.\n");
  }

  const { pathname } = new URL(req.url ?? "/", "http://localhost");
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
