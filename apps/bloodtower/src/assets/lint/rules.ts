import { type Issue, issue } from "../needs/issues.ts";

/** Rules `pack:lint` raises for a pack's `assets/index.json`. `assets:needs` uses A1-1..A1-8. */
export const LINT_RULE = {
  /** The index file is unreadable or does not match `packIndexSchema`. */
  index: "A1-9",
  /** A mouth frame is not the portrait's exact pixel size (DEC-207). */
  frameSize: "A1-10",
  /** A mouth frame changes a pixel outside the anchor box (DEC-207). */
  outsideAnchor: "A1-11",
  /** The anchor box does not sit fully inside the portrait (DEC-207). */
  anchorBounds: "A1-12",
  /** A caption is longer than 120 code points once pause markup is removed (DEC-576). */
  caption: "A1-13",
  /** A portrait does not fade to dark at its edges (DEC-207, D9). */
  darkEdge: "A1-14",
  /** A picture or sound kind outside the allowed lists (DEC-844). */
  kind: "A1-15",
  /** A portrait mood outside DEC-344's five. */
  mood: "A1-16",
  /** A glow mask is not its painting's exact size (DEC-401). */
  glowSize: "A1-17",
  /** A glow mask is not grayscale. */
  glowGray: "A1-18",
  /** An ID the pack references has no index entry (R-AST-ORG-8). */
  missingId: "A1-19",
  /** A release carries a draft (R-AST-ORG-7). */
  draft: "A1-20",
} as const;

export const INDEX_FILE = "assets/index.json";

/** An issue on `assets/index.json`, naming the asset ID in the path and the message. */
export const indexIssue = (id: string, rule: string, message: string): Issue =>
  issue(INDEX_FILE, id, rule, `${id}: ${message}`);
