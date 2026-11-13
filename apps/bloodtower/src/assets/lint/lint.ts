import { existsSync, readFileSync, realpathSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { dialogFileText } from "@asset-studio/formats";
import { MOODS } from "../needs/build.ts";
import { type Issue, issue } from "../needs/issues.ts";
import {
  OTHER_KINDS,
  type PackIndex,
  type PackIndexEntry,
  PICTURE_KINDS,
  packIndexSchema,
  SOUND_KINDS,
} from "./indexSchema.ts";
import {
  anchorInBounds,
  EDGE_MAX_RATIO,
  edgeRatio,
  isGrayscale,
  outsideAnchorChanges,
  type Raster,
  readRaster,
} from "./raster.ts";
import { INDEX_FILE, indexIssue, LINT_RULE } from "./rules.ts";

/** DEC-576: at most this many code points of displayed caption. */
export const CAPTION_MAX = 120;

const isPictureKind = (k: string) => (PICTURE_KINDS as readonly string[]).includes(k);
const isSoundKind = (k: string) => (SOUND_KINDS as readonly string[]).includes(k);
const isOtherKind = (k: string) => (OTHER_KINDS as readonly string[]).includes(k);

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export interface LintOptions {
  /** Pack folder (the folder that holds `assets/`). */
  root: string;
  /** Asset IDs the pack references (the job's, via `assetKeys`). */
  referenced: readonly string[];
  /** A release carries no draft. */
  release: boolean;
}

/** A path under `base` that stays inside it, or undefined. */
const inside = (base: string, rel: string): string | undefined => {
  if (rel === "" || isAbsolute(rel)) return undefined;
  const full = resolve(base, rel);
  const back = relative(base, full);
  return back === "" || back.startsWith("..") || back.includes(`..${sep}`) ? undefined : full;
};

const entryIssues = (id: string, e: PackIndexEntry, index: PackIndex): Issue[] => {
  const out: Issue[] = [];
  const prefix = id.includes(".") ? id.slice(0, id.indexOf(".")) : id;
  if (isPictureKind(e.kind)) {
    if (prefix !== e.kind) {
      out.push(
        indexIssue(
          id,
          LINT_RULE.kind,
          `the id starts with "${prefix}" but the picture kind is "${e.kind}". Use <kind>.<entry> with one of ${PICTURE_KINDS.join(", ")}.`,
        ),
      );
    }
  } else if (isSoundKind(e.kind)) {
    if (PICTURE_KINDS.includes(prefix as (typeof PICTURE_KINDS)[number]) || prefix === "glow") {
      out.push(
        indexIssue(
          id,
          LINT_RULE.kind,
          `the id starts with "${prefix}", a picture name, but the kind is "${e.kind}".`,
        ),
      );
    }
  } else if (!isOtherKind(e.kind)) {
    out.push(
      indexIssue(
        id,
        LINT_RULE.kind,
        `kind "${e.kind}" is not allowed. Pictures: ${PICTURE_KINDS.join(", ")}; sounds: ${SOUND_KINDS.join(", ")}; also line and glow.`,
      ),
    );
  }
  if (e.kind === "glow" && !id.startsWith("glow.")) {
    out.push(indexIssue(id, LINT_RULE.kind, `a glow mask's id starts with "glow.".`));
  }
  if (e.kind === "portrait" && id.includes("~")) {
    const mood = id.slice(id.indexOf("~") + 1);
    if (!(MOODS as readonly string[]).includes(mood)) {
      out.push(
        indexIssue(
          id,
          LINT_RULE.mood,
          `mood "${mood}" is not one of ${MOODS.join(", ")} (DEC-344).`,
        ),
      );
    }
  }
  e.captions.forEach((caption, n) => {
    let shown: string;
    try {
      shown = dialogFileText(caption);
    } catch (error) {
      out.push(
        indexIssue(
          id,
          LINT_RULE.caption,
          `caption ${n + 1} has bad pause markup: ${errorText(error)}`,
        ),
      );
      return;
    }
    const length = [...shown].length;
    if (length > CAPTION_MAX) {
      out.push(
        indexIssue(
          id,
          LINT_RULE.caption,
          `caption ${n + 1} is ${length} characters; at most ${CAPTION_MAX} (DEC-576). Split the line.`,
        ),
      );
    }
  });
  if (id.startsWith("glow.") && e.kind === "glow") {
    const painting = index.assets[`painting.${id.slice("glow.".length)}`];
    if (painting) {
      const a = e.size;
      const b = painting.size;
      if (!("width" in a) || !("width" in b)) {
        out.push(indexIssue(id, LINT_RULE.glowSize, "the mask or its painting has no pixel size."));
      } else if (a.width !== b.width || a.height !== b.height) {
        out.push(
          indexIssue(
            id,
            LINT_RULE.glowSize,
            `mask is ${a.width}x${a.height} but painting.${id.slice(5)} is ${b.width}x${b.height}; they must match exactly (DEC-401).`,
          ),
        );
      }
    }
  }
  return out;
};

export interface LintReport {
  /** Problems that fail the lint. */
  errors: Issue[];
  /** Problems that are reported but do not fail it. */
  warnings: Issue[];
}

/** Most ids a missing-id warning names; the count covers all of them. */
const WARN_IDS_SHOWN = 5;

/**
 * Index-only rules: kinds, moods, captions, glow sizes, missing ids, drafts. No file is read.
 * A referenced id with no entry is an error in a release and one warning with a count otherwise
 * (D45: a partial pack is allowed until it ships).
 */
export const lintIndexEntriesReport = (index: PackIndex, options: LintOptions): LintReport => {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  for (const [id, entry] of Object.entries(index.assets)) {
    errors.push(...entryIssues(id, entry, index));
    if (options.release && entry.status === "draft") {
      errors.push(
        indexIssue(
          id,
          LINT_RULE.draft,
          "is a draft. A release ships only final assets (R-AST-ORG-7).",
        ),
      );
    }
  }
  const absent: string[] = [];
  for (const id of options.referenced) {
    if (index.assets[id] !== undefined) continue;
    absent.push(id);
    if (!options.release) continue;
    const mate = id.startsWith("glow.") ? `painting.${id.slice(5)}` : undefined;
    errors.push(
      indexIssue(
        id,
        LINT_RULE.missingId,
        mate
          ? `the pack references this mask but the index has no entry for it (paired with ${mate}).`
          : "the pack references this id but the index has no entry for it (R-AST-ORG-8).",
      ),
    );
  }
  if (!options.release && absent.length > 0) {
    const shown = absent.slice(0, WARN_IDS_SHOWN).join(", ");
    const more =
      absent.length > WARN_IDS_SHOWN ? `, and ${absent.length - WARN_IDS_SHOWN} more` : "";
    warnings.push(
      issue(
        INDEX_FILE,
        "(file)",
        LINT_RULE.missingId,
        `${absent.length} referenced id${absent.length === 1 ? " has" : "s have"} no index entry yet (${shown}${more}). A release needs every one (R-AST-ORG-8).`,
      ),
    );
  }
  // A mask without its painting is a pairing error even when nothing references it.
  for (const id of Object.keys(index.assets)) {
    if (id.startsWith("glow.") && index.assets[`painting.${id.slice(5)}`] === undefined) {
      errors.push(
        indexIssue(id, LINT_RULE.missingId, `has no paired painting.${id.slice(5)} in the index.`),
      );
    }
  }
  return { errors, warnings };
};

/** `lintIndexEntriesReport`'s errors alone. */
export const lintIndexEntries = (index: PackIndex, options: LintOptions): Issue[] =>
  lintIndexEntriesReport(index, options).errors;

/** File rules for glow masks: the file is grayscale and is the size the index says. */
export const lintGlowFiles = async (index: PackIndex, root: string): Promise<Issue[]> => {
  const out: Issue[] = [];
  for (const [id, entry] of Object.entries(index.assets)) {
    if (entry.kind !== "glow") continue;
    const file = inside(join(root, "assets"), entry.file);
    if (!file) {
      out.push(
        indexIssue(id, LINT_RULE.glowGray, `file "${entry.file}" is outside the assets folder.`),
      );
      continue;
    }
    let raster: Raster;
    try {
      raster = await readRaster(file);
    } catch (error) {
      out.push(
        indexIssue(id, LINT_RULE.glowGray, `cannot read ${entry.file}: ${errorText(error)}`),
      );
      continue;
    }
    if (!isGrayscale(raster)) {
      out.push(
        indexIssue(
          id,
          LINT_RULE.glowGray,
          `${entry.file} is not grayscale; a mask carries brightness only.`,
        ),
      );
    }
    if (
      "width" in entry.size &&
      (raster.width !== entry.size.width || raster.height !== entry.size.height)
    ) {
      out.push(
        indexIssue(
          id,
          LINT_RULE.glowSize,
          `${entry.file} is ${raster.width}x${raster.height} but the index says ${entry.size.width}x${entry.size.height}.`,
        ),
      );
    }
  }
  return out;
};

/** The optional `avatar` entry: frame size, outside-anchor pixels, anchor bounds, dark edge. */
export const lintAvatar = async (index: PackIndex, root: string): Promise<Issue[]> => {
  const avatar = index.avatar;
  if (!avatar) return [];
  const id = "avatar";
  const out: Issue[] = [];
  if (!anchorInBounds(avatar.anchor)) {
    out.push(
      indexIssue(
        id,
        LINT_RULE.anchorBounds,
        `anchor ${JSON.stringify(avatar.anchor)} is not fully inside the portrait (0..1, positive size).`,
      ),
    );
  }
  const dir = inside(root, avatar.dir);
  if (!dir) {
    out.push(
      indexIssue(id, LINT_RULE.index, `avatar dir "${avatar.dir}" is outside the pack folder.`),
    );
    return out;
  }
  const load = async (rel: string, what: string): Promise<Raster | undefined> => {
    const file = inside(dir, rel);
    if (!file) {
      out.push(indexIssue(id, LINT_RULE.index, `${what} "${rel}" is outside the avatar folder.`));
      return undefined;
    }
    if (!existsSync(file)) {
      out.push(indexIssue(id, LINT_RULE.index, `${what} "${rel}" is not a file in ${avatar.dir}.`));
      return undefined;
    }
    try {
      return await readRaster(file);
    } catch (error) {
      out.push(
        indexIssue(id, LINT_RULE.index, `cannot read ${what} "${rel}": ${errorText(error)}`),
      );
      return undefined;
    }
  };
  const portrait = await load(avatar.portrait, "portrait");
  if (portrait && edgeRatio(portrait) > EDGE_MAX_RATIO) {
    out.push(
      indexIssue(
        id,
        LINT_RULE.darkEdge,
        `portrait ${avatar.portrait} does not fade to dark at its edges (edge/centre brightness above ${EDGE_MAX_RATIO}).`,
      ),
    );
  }
  for (const [shape, rel] of Object.entries(avatar.mouths)) {
    const frame = await load(rel, `mouth ${shape}`);
    if (!portrait || !frame) continue;
    if (frame.width !== portrait.width || frame.height !== portrait.height) {
      out.push(
        indexIssue(
          id,
          LINT_RULE.frameSize,
          `mouth ${shape} (${basename(rel)}) is ${frame.width}x${frame.height}; the portrait is ${portrait.width}x${portrait.height}.`,
        ),
      );
      continue;
    }
    if (!anchorInBounds(avatar.anchor)) continue;
    const changed = outsideAnchorChanges(portrait, frame, avatar.anchor);
    if (changed > 0) {
      out.push(
        indexIssue(
          id,
          LINT_RULE.outsideAnchor,
          `mouth ${shape} (${basename(rel)}) changes ${changed} pixels outside the anchor box (DEC-207).`,
        ),
      );
    }
  }
  return out;
};

export interface IndexLintInput {
  /** Raw text of `assets/index.json`. */
  text: string;
  options: LintOptions;
}

/** Parses the index text and runs every rule. */
export const lintIndexTextReport = async (input: IndexLintInput): Promise<LintReport> => {
  let raw: unknown;
  try {
    raw = JSON.parse(input.text);
  } catch (error) {
    return {
      errors: [
        issue(
          INDEX_FILE,
          "(file)",
          LINT_RULE.index,
          `${LINT_RULE.index}: not valid JSON: ${errorText(error)}`,
        ),
      ],
      warnings: [],
    };
  }
  const parsed = packIndexSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      errors: parsed.issues.map((p) =>
        issue(INDEX_FILE, p.path, LINT_RULE.index, `${LINT_RULE.index}: ${p.message}`),
      ),
      warnings: [],
    };
  }
  const index = parsed.data;
  const entries = lintIndexEntriesReport(index, input.options);
  return {
    errors: [
      ...entries.errors,
      ...(await lintGlowFiles(index, input.options.root)),
      ...(await lintAvatar(index, input.options.root)),
    ],
    warnings: entries.warnings,
  };
};

/** `lintIndexTextReport`'s errors alone. */
export const lintIndexText = async (input: IndexLintInput): Promise<Issue[]> =>
  (await lintIndexTextReport(input)).errors;

/** Lints the index file text at `<packDir>/assets/index.json` (which must exist). */
export const lintPackIndex = async (
  packDir: string,
  referenced: readonly string[],
  release: boolean,
): Promise<LintReport> => {
  const fail = (error: unknown): LintReport => ({
    errors: [
      issue(INDEX_FILE, "(file)", LINT_RULE.index, `${LINT_RULE.index}: ${errorText(error)}`),
    ],
    warnings: [],
  });
  let root: string;
  let text: string;
  try {
    root = realpathSync(packDir);
    text = readFileSync(join(root, INDEX_FILE), "utf8");
  } catch (error) {
    return fail(error);
  }
  return lintIndexTextReport({ text, options: { root, referenced, release } });
};
