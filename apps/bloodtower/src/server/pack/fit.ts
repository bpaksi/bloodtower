import { KEEPER_MOMENT_ID, type Pack } from "bloodtower-protocols";
import type { PackLoadIssue } from "./load.ts";

/**
 * W-fit: the board shows a moment's text whole, or cuts it. The limits sit about 10% under the
 * cut, measured at 1180x820 with a throwaway Playwright probe (2026-10-20). A smaller board
 * cuts sooner (about 190 characters in the waiting dialog at 1024x594), so these are the limits
 * for the iPad-class board, not a promise for every screen.
 */

/**
 * Waiting dialog (a text moment). At 1180x820 it kept 520 characters of probe prose whole and
 * cut at 530; step 9 measured 506 on the test pack's text. The cut falls at a whole line.
 */
export const WAITING_DIALOG_TEXT_LIMIT = 460;

/**
 * Caption over a visual (a still or clip moment). At 1180x820 the 3-line clamp kept 250
 * characters of probe prose whole and cut at 260.
 */
export const VISUAL_CAPTION_TEXT_LIMIT = 225;

/**
 * What the board draws for a moment's text: `displayCaption` in the web part, copied here because
 * the server cannot import it. Pause tags `[pause N]` and stage directions `(whisper)` go, and
 * runs of space (and the newline between two lines) become one space.
 */
export const boardText = (text: string): string =>
  text
    .replace(/\[pause\s+\d+(?:\.\d+)?\]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s*\([^)]*\)\s*/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

/** Same text the session sends the board: the moment's lines, one per row, in `beats.ts`. */
const momentText = (moment: Pack["moments"][number]): string | undefined =>
  moment.lines && moment.lines.length > 0
    ? moment.lines.map((line) => line.text).join("\n")
    : undefined;

/**
 * One warning per shared moment whose board text is over the limit of the layer it lands in.
 * A moment is a visual when it is a still or clip, names an asset, or starts a cue in the pack (the
 * session sends the cue's screen as its still); the rest, and every pick, are the waiting dialog.
 * The Keeper's captions are per spoken line, not the moment, so it is not measured here.
 * Private iPad moments never reach the board. A placeholder is capped at 300 characters by the schema.
 */
export const textFitWarnings = (pack: Pack, file: string): PackLoadIssue[] => {
  const cueNames = new Set(pack.cues.map((cue) => cue.name));
  const warnings: PackLoadIssue[] = [];
  for (const moment of pack.moments) {
    if (moment.id === KEEPER_MOMENT_ID) continue;
    if (moment.target !== "storyboard" && moment.target !== "ipad:all") continue;
    const raw = momentText(moment);
    if (raw === undefined) continue;
    const visual =
      moment.kind !== "pick-card" &&
      (moment.kind === "still" ||
        moment.kind === "clip" ||
        Boolean(moment.asset) ||
        cueNames.has(moment.cues?.[0]?.cue ?? ""));
    const limit = visual ? VISUAL_CAPTION_TEXT_LIMIT : WAITING_DIALOG_TEXT_LIMIT;
    const length = boardText(raw).length;
    if (length <= limit) continue;
    warnings.push({
      rule: "W-fit",
      file,
      path: moment.id,
      message: `W-fit: Moment ${moment.id} has ${length} characters on the board; the ${
        visual ? "caption over a visual" : "waiting dialog"
      } holds ${limit}. The board cuts the rest, so shorten it in the pack.`,
    });
  }
  return warnings;
};
