import type { IncomingMessage, ServerResponse } from "node:http";
import { buildSoundFeelExport } from "@dark-tower/tower";
import type { SoundFeel } from "./soundFeel.ts";
import { requestPath } from "./static.ts";

export const SOUND_FEEL_EXPORT_PATH = "/api/sound-feel.json";

/**
 * `GET /api/sound-feel.json` (spec D25): the sound feel record as `sound-feel.json`, downloaded.
 * Returns true when this request was for that path. A page from another origin is refused (D20).
 */
export const handleSoundFeelExport = (
  req: IncomingMessage,
  res: ServerResponse,
  soundFeel: SoundFeel,
  allowed: boolean,
) => {
  if (requestPath(req.url) !== SOUND_FEEL_EXPORT_PATH) return false;
  const json = { "content-type": "application/json; charset=utf-8" };
  if (!allowed) {
    res.writeHead(403, json);
    res.end(JSON.stringify({ message: "This page cannot export the sound feel record." }));
    return true;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { ...json, allow: "GET, HEAD" });
    res.end(JSON.stringify({ message: "Method not allowed." }));
    return true;
  }
  const body = `${JSON.stringify(buildSoundFeelExport(soundFeel.rows()), null, 2)}\n`;
  res.writeHead(200, {
    ...json,
    "content-disposition": 'attachment; filename="sound-feel.json"',
    "cache-control": "no-store",
  });
  res.end(req.method === "HEAD" ? undefined : body);
  return true;
};
