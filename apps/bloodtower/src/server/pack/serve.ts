import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { basename } from "node:path";
import { contentTypeFor, requestPath } from "../server.ts";
import type { PackAssetIndex } from "./assets.ts";

const sendText = (res: ServerResponse, status: number, text: string) => {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
};

const pipeFile = (file: string, res: ServerResponse) => {
  const stream = createReadStream(file);
  res.on("close", () => stream.destroy());
  stream.on("error", () => {
    if (!res.destroyed) res.destroy();
  });
  stream.pipe(res);
};

/**
 * `/packs/<packId>/assets/<file>`, `/packs/<packId>/asset/<assetId>`, and
 * `/packs/<packId>/camera/<momentId>.json` for optional camera-track sidecars.
 * Only declared assets that resolved at load time are served. Traversal is refused.
 */
export const tryServePackAssets = async (
  catalogs: readonly PackAssetIndex[],
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> => {
  if (req.method !== "GET" && req.method !== "HEAD") return false;

  const pathname = requestPath(req.url);
  if (!pathname?.startsWith("/packs/")) return false;

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 3 || parts[0] !== "packs") return false;

  const packId = parts[1];
  const catalog = catalogs.find((item) => item.packId === packId);
  if (!catalog) {
    sendText(res, 404, "Not found.\n");
    return true;
  }

  if (parts[2] === "camera" && parts.length === 4) {
    let momentId: string;
    try {
      const filePart = decodeURIComponent(parts[3] ?? "");
      if (!filePart.endsWith(".json") || filePart.includes("/") || filePart.includes("\\")) {
        sendText(res, 404, "Not found.\n");
        return true;
      }
      momentId = filePart.slice(0, -".json".length);
    } catch {
      sendText(res, 400, "Bad request.\n");
      return true;
    }
    const absolute = catalog.camera.byMomentId.get(momentId);
    if (!absolute) {
      sendText(res, 404, "Not found.\n");
      return true;
    }
    return sendPackFile(absolute, req, res);
  }

  if (parts[2] === "asset" && parts.length === 4) {
    let assetId: string;
    try {
      assetId = decodeURIComponent(parts[3] ?? "");
    } catch {
      sendText(res, 400, "Bad request.\n");
      return true;
    }
    const resolved = catalog.byId.get(assetId);
    if (!resolved) {
      sendText(res, 404, "Not found.\n");
      return true;
    }
    return sendPackFile(resolved.absolute, req, res);
  }

  if (parts[2] !== "assets" || parts.length !== 4) {
    sendText(res, 404, "Not found.\n");
    return true;
  }

  let filePart: string;
  try {
    filePart = decodeURIComponent(parts[3] ?? "");
  } catch {
    sendText(res, 400, "Bad request.\n");
    return true;
  }
  if (filePart.includes("/") || filePart.includes("\\") || filePart.includes("\0")) {
    sendText(res, 404, "Not found.\n");
    return true;
  }
  const absolute = catalog.byBasename.get(basename(filePart));
  if (!absolute) {
    sendText(res, 404, "Not found.\n");
    return true;
  }
  return sendPackFile(absolute, req, res);
};

const sendPackFile = async (
  file: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> => {
  const type = contentTypeFor(file);
  const size = (await stat(file)).size;
  res.writeHead(200, {
    "content-type": type,
    "content-length": String(size),
  });
  if (req.method === "HEAD") {
    res.end();
    return true;
  }
  pipeFile(file, res);
  return true;
};
