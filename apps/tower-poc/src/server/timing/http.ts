import type { IncomingMessage, ServerResponse } from "node:http";
import { requestPath } from "../static.ts";
import { saveTimingResult } from "./resultLog.ts";

/** Far more than a full timing result. A larger body is refused before it is parsed. */
const MAX_BODY_BYTES = 64 * 1024;

const header = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const sendJson = (
  res: ServerResponse,
  status: number,
  body: unknown,
  origin: string | undefined,
) => {
  const headers: Record<string, string> = { "content-type": "application/json; charset=utf-8" };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers.vary = "Origin";
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
};

const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("too-large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });

/**
 * `POST /api/timing-results`. Returns true when this request was for that path.
 * The file name is chosen here; the body cannot name a path.
 */
export const handleTimingResults = async (
  req: IncomingMessage,
  res: ServerResponse,
  dir: string | undefined,
  allowed: boolean,
) => {
  if (requestPath(req.url) !== "/api/timing-results") return false;

  const origin = header(req.headers.origin);
  if (!allowed) {
    sendJson(res, 403, { message: "This page cannot save a timing result." }, undefined);
    return true;
  }
  // A browser on another origin (next dev) needs these. A missing Origin is not a page.
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...(origin ? { "access-control-allow-origin": origin, vary: "Origin" } : {}),
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "600",
    });
    res.end();
    return true;
  }
  if (req.method !== "POST") {
    res.setHeader("allow", "POST, OPTIONS");
    sendJson(res, 405, { message: "Method not allowed." }, origin);
    return true;
  }
  if (!dir) {
    sendJson(res, 404, { message: "Timing results are not saved by this service." }, origin);
    return true;
  }

  let text: string;
  try {
    text = await readBody(req);
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "too-large";
    sendJson(
      res,
      tooLarge ? 413 : 400,
      { message: tooLarge ? "The timing result is too large." : "The timing result is not valid." },
      origin,
    );
    return true;
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    sendJson(res, 400, { message: "The timing result is not valid JSON." }, origin);
    return true;
  }

  const saved = await saveTimingResult(dir, body);
  if (!saved.ok) {
    sendJson(res, saved.status, { message: saved.message }, origin);
    return true;
  }
  sendJson(res, 201, { file: saved.file }, origin);
  return true;
};
