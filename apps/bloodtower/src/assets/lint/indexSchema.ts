// The pack's `assets/index.json`: asset ID -> shipped file. `assets:pack` (A1 step 5) writes it
// and imports this schema; the lint reads it. Hand-written so this part needs no schema library.

export const PICTURE_KINDS = ["painting", "portrait", "foe", "place", "item", "cover"] as const;
export const SOUND_KINDS = ["effect", "ambience"] as const;
/** `line` is a voiced line; `glow` is a painting's paired mask, not a picture kind. */
export const OTHER_KINDS = ["line", "glow"] as const;
export const STATUSES = ["draft", "final"] as const;

export type IndexStatus = (typeof STATUSES)[number];
/** Pictures and masks: `{width, height}`. Sounds: `{seconds}`. Voiced lines: `{seconds}` or `{bytes}`. */
export type IndexSize = { width: number; height: number } | { seconds: number } | { bytes: number };
export const MOUTH_SHAPES = [
  "REST",
  "MBP",
  "CONS-EE",
  "EH-AE",
  "AH",
  "OH-ER",
  "OO-W",
  "FV",
] as const;

export interface PackIndexEntry {
  kind: string;
  /** File name under `<pack>/assets/`. */
  file: string;
  /** Pixels for a picture or mask, seconds for a sound or line (bytes also accepted). */
  size: IndexSize;
  /** What the board shows for this asset: one caption per spoken line, empty otherwise. */
  captions: string[];
  status: IndexStatus;
}

/** The optional talking-avatar entry. No 0.2 pack has one; paths are relative to `dir`. */
export interface PackIndexAvatar {
  /** Folder under the pack folder, e.g. `avatars/keeper`. */
  dir: string;
  portrait: string;
  /** Fractions of the portrait: x, y, w, h. */
  anchor: { x: number; y: number; w: number; h: number };
  /** All eight shapes (DEC-207), mouth shape name -> frame file. */
  mouths: Record<string, string>;
}

export interface PackIndex {
  assets: Record<string, PackIndexEntry>;
  avatar?: PackIndexAvatar;
}

export interface SchemaProblem {
  path: string;
  message: string;
}

export type ParseResult =
  | { success: true; data: PackIndex }
  | { success: false; issues: SchemaProblem[] };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const posInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0;
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const parseSize = (v: unknown): IndexSize | undefined => {
  if (!isRecord(v)) return undefined;
  if (posInt(v.width) && posInt(v.height)) return { width: v.width, height: v.height };
  if (finite(v.seconds) && v.seconds > 0) return { seconds: v.seconds };
  if (posInt(v.bytes)) return { bytes: v.bytes };
  return undefined;
};

const parseAvatar = (v: unknown, problems: SchemaProblem[]): PackIndexAvatar | undefined => {
  const bad = (path: string, message: string) => problems.push({ path: `avatar${path}`, message });
  if (!isRecord(v)) {
    bad("", "must be an object.");
    return undefined;
  }
  const { dir, portrait, anchor, mouths } = v;
  let ok = true;
  for (const [name, value] of [
    ["dir", dir],
    ["portrait", portrait],
  ] as const) {
    if (typeof value !== "string" || value === "") {
      bad(`.${name}`, "must be a non-empty string.");
      ok = false;
    }
  }
  if (
    !isRecord(anchor) ||
    !finite(anchor.x) ||
    !finite(anchor.y) ||
    !finite(anchor.w) ||
    !finite(anchor.h)
  ) {
    bad(".anchor", "must be {x, y, w, h} numbers.");
    ok = false;
  }
  if (
    !isRecord(mouths) ||
    !MOUTH_SHAPES.every((shape) => typeof mouths[shape] === "string" && mouths[shape] !== "")
  ) {
    bad(
      ".mouths",
      `must map all eight shapes (${MOUTH_SHAPES.join(", ")}) to a file name (DEC-207).`,
    );
    ok = false;
  }
  if (!ok) return undefined;
  const a = anchor as { x: number; y: number; w: number; h: number };
  return {
    dir: dir as string,
    portrait: portrait as string,
    anchor: { x: a.x, y: a.y, w: a.w, h: a.h },
    mouths: { ...(mouths as Record<string, string>) },
  };
};

const safeParse = (raw: unknown): ParseResult => {
  const problems: SchemaProblem[] = [];
  if (!isRecord(raw)) {
    return { success: false, issues: [{ path: "(file)", message: "must be an object." }] };
  }
  const assets: Record<string, PackIndexEntry> = {};
  if (!isRecord(raw.assets)) {
    problems.push({ path: "assets", message: "must be an object of asset ID -> entry." });
  } else {
    for (const [id, entry] of Object.entries(raw.assets)) {
      const at = `assets.${id}`;
      if (!isRecord(entry)) {
        problems.push({ path: at, message: "must be an object." });
        continue;
      }
      const size = parseSize(entry.size);
      const captionsOk =
        Array.isArray(entry.captions) && entry.captions.every((c) => typeof c === "string");
      const statusOk = (STATUSES as readonly unknown[]).includes(entry.status);
      if (typeof entry.kind !== "string" || entry.kind === "") {
        problems.push({ path: `${at}.kind`, message: "must be a non-empty string." });
      }
      if (typeof entry.file !== "string" || entry.file === "") {
        problems.push({ path: `${at}.file`, message: "must be a non-empty string." });
      }
      if (!size) {
        problems.push({
          path: `${at}.size`,
          message: "must be {width, height}, {seconds} or {bytes}.",
        });
      }
      if (!captionsOk) problems.push({ path: `${at}.captions`, message: "must be strings." });
      if (!statusOk) {
        problems.push({ path: `${at}.status`, message: `must be one of ${STATUSES.join(", ")}.` });
      }
      if (
        typeof entry.kind === "string" &&
        entry.kind !== "" &&
        typeof entry.file === "string" &&
        entry.file !== "" &&
        size &&
        captionsOk &&
        statusOk
      ) {
        assets[id] = {
          kind: entry.kind,
          file: entry.file,
          size,
          captions: [...(entry.captions as string[])],
          status: entry.status as IndexStatus,
        };
      }
    }
  }
  let avatar: PackIndexAvatar | undefined;
  if (raw.avatar !== undefined) avatar = parseAvatar(raw.avatar, problems);
  if (problems.length > 0) return { success: false, issues: problems };
  return { success: true, data: { assets, ...(avatar ? { avatar } : {}) } };
};

export const packIndexSchema = {
  safeParse,
  parse: (raw: unknown): PackIndex => {
    const result = safeParse(raw);
    if (!result.success) {
      throw new Error(result.issues.map((i) => `${i.path}: ${i.message}`).join("; "));
    }
    return result.data;
  },
};
