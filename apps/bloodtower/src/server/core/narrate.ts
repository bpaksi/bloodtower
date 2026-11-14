import { type PackedLine, packedLineSchema } from "../../protocols/v2/index.ts";
import type { NarrateEffect, PackMedia } from "./demoLine.ts";

export type NarrateResult =
  | {
      ok: true;
      line: PackedLine;
      /** Ids the line would use that are not packed, so the board goes without them. */
      unavailable: string[];
    }
  | { ok: false; message: string };

/**
 * Runs a pack `narrate` effect on the Story board (A1-8b-2). The board view gets ids and text only:
 * the voiced line's id when its packed file is on the host, the caption, and the picture with its
 * mask when both are packed. A missing file is unavailable (caption only), never a failure. Only
 * the storyboard target and one line are run: that is the demo, and nothing else calls this yet.
 */
export const runNarrate = (
  effect: NarrateEffect,
  media: PackMedia,
  options: { play: number; painting: string; glow: string },
): NarrateResult => {
  if (effect.target !== "storyboard") {
    return { ok: false, message: "Only a storyboard narrate plays on the Story board." };
  }
  const [line, ...rest] = effect.lines;
  if (!line || rest.length > 0) {
    return { ok: false, message: "The demo narrate plays exactly one line." };
  }
  const unavailable: string[] = [];
  let audio: string | null = null;
  if (line.voice) {
    if (media.indexed.get(line.voice)?.kind === "line") audio = line.voice;
    else unavailable.push(line.voice);
  }
  const painting = media.indexed.has(options.painting) ? options.painting : null;
  if (!painting) unavailable.push(options.painting);
  // A mask is only drawn over its own painting.
  const glow = painting && media.indexed.get(options.glow)?.kind === "glow" ? options.glow : null;
  if (!glow) unavailable.push(options.glow);
  const parsed = packedLineSchema.safeParse({
    packId: media.packId,
    lineId: line.voice ?? "",
    caption: line.text,
    audio,
    painting,
    glow,
    play: options.play,
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: `The line cannot go on the board view: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    };
  }
  return { ok: true, line: parsed.data, unavailable };
};
