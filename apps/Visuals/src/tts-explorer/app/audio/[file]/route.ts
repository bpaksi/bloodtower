import fs from "node:fs/promises";
import path from "node:path";
import { CACHE_DIR } from "../../../lib/stories/render.ts";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!/^[\w.-]+\.wav$/.test(file)) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(path.join(CACHE_DIR, file));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
