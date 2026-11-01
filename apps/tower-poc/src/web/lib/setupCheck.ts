// The setup-check page's answers and how they compare with the library. Pure, so the rules are
// tested without a browser or a tower. Nothing here sends a command.
//
// The glyph table is `GLYPHS` from ultimatedarktowerdata@3.0.0 (the comment there: "positions
// based on calibrated drum orientation"). The web package does not depend on that package; the
// table is copied here and the unit test names each side's expected glyph.

export const DRUMS = ["top", "middle", "bottom"] as const;
export const SIDES = ["north", "east", "south", "west"] as const;
export const KINGDOMS = ["North", "East", "South", "West"] as const;

export type Drum = (typeof DRUMS)[number];
export type Side = (typeof SIDES)[number];
export type Kingdom = (typeof KINGDOMS)[number];

/** Glyph names, in the library's order. */
export const GLYPH_NAMES = ["cleanse", "quest", "battle", "banner", "reinforce"] as const;
export type GlyphName = (typeof GLYPH_NAMES)[number];

export const GLYPH_LABELS: Record<GlyphName, string> = {
  cleanse: "Cleanse",
  quest: "Quest",
  battle: "Battle",
  banner: "Banner",
  reinforce: "Reinforce",
};

/**
 * Where the library puts each glyph once calibration ends and before any rotation.
 * Sides that are not listed have no glyph.
 */
export const LIBRARY_GLYPHS: Record<GlyphName, { drum: Drum; side: Side }> = {
  cleanse: { drum: "top", side: "north" },
  quest: { drum: "top", side: "south" },
  battle: { drum: "middle", side: "north" },
  banner: { drum: "bottom", side: "north" },
  reinforce: { drum: "bottom", side: "south" },
};

/** What the library's table has on a side at calibration. `none` is an empty face, not a blank answer. */
export type ExpectedGlyph = GlyphName | "none";

/**
 * An answer the player has not given. It is never a match, including on a face the library
 * leaves empty: an empty face is confirmed by answering `none`, not by leaving it blank.
 */
export const BLANK = "blank";

/** A player's answer for one drum side. */
export type SeenGlyph = GlyphName | "none" | typeof BLANK;

export interface DrumSide {
  drum: Drum;
  side: Side;
}

export interface GlyphRecord {
  drum: Drum;
  side: Side;
  expected: ExpectedGlyph;
  seen: SeenGlyph;
  match: true | false | "unknown";
}

export const DRUM_SIDES: readonly DrumSide[] = DRUMS.flatMap((drum) =>
  SIDES.map((side) => ({ drum, side })),
);

export const sideKey = (drum: Drum, side: Side) => `${drum}/${side}`;

export const sideLabel = (drum: Drum, side: Side) =>
  `${drum.charAt(0).toUpperCase()}${drum.slice(1)} ${side}`;

export const expectedGlyph = (drum: Drum, side: Side): ExpectedGlyph => {
  for (const name of GLYPH_NAMES) {
    const place = LIBRARY_GLYPHS[name];
    if (place.drum === drum && place.side === side) return name;
  }
  return "none";
};

/** One row per drum side, in drum then side order, with the library's glyph beside what was seen. */
export const recordGlyphs = (
  answers: Readonly<Partial<Record<string, SeenGlyph>>>,
): GlyphRecord[] =>
  DRUM_SIDES.map(({ drum, side }) => {
    const expected = expectedGlyph(drum, side);
    const seen = answers[sideKey(drum, side)] ?? BLANK;
    return {
      drum,
      side,
      expected,
      seen,
      match: seen === BLANK ? "unknown" : seen === expected,
    };
  });

/** The facing line the page shows once north has been lit and a kingdom chosen. */
export const facingLine = (kingdom: Kingdom) => `north → ${kingdom}`;

/**
 * One north doorway light. `lighting.set` with only this entry lights the north side and no other.
 * Top ring, north: the same lamp as `lighting.set-led` layer 0, light 0.
 */
export const NORTH_SIDE_PARAMS = {
  doorway: [{ position: "north", level: "top", style: "on" }],
} as const;

/** Top drum (index 0) to east (index 1). No sound, so a drum already there sends nothing. */
export const TOP_DRUM_EAST_PARAMS = { drumIndex: 0, position: 1 } as const;

export interface SkullTry {
  /** Stable for this run, so the list is not keyed by position. */
  id: string;
  /** Skulls that went in. Absent when this try was not counted. Never filled in as zero. */
  dropped?: number;
  /** Skulls still inside afterwards. Absent when this try was not counted. */
  stayed?: number;
}

export interface SkullSummary {
  /** Tries that had both counts. A try with either count missing is not included. */
  tries: number;
  totalDropped: number;
  totalStayed: number;
  /**
   * The share of counted skulls that stayed inside (stayed / dropped).
   * Undefined when nothing counted was dropped, so a missing count cannot become a zero share.
   */
  share: number | undefined;
  /** Tries left out of the totals and the share, in the order they were recorded. */
  uncounted: readonly SkullTry[];
  /** True while fewer than 10 tries have been counted. */
  incomplete: boolean;
}

const isCounted = (try_: SkullTry): try_ is SkullTry & { dropped: number; stayed: number } =>
  typeof try_.dropped === "number" && typeof try_.stayed === "number";

export const summarizeSkulls = (tries: readonly SkullTry[]): SkullSummary => {
  const uncounted = tries.filter((try_) => !isCounted(try_));
  const counted = tries.filter(isCounted);
  const totalDropped = counted.reduce((sum, try_) => sum + try_.dropped, 0);
  const totalStayed = counted.reduce((sum, try_) => sum + try_.stayed, 0);
  return {
    tries: counted.length,
    totalDropped,
    totalStayed,
    share: totalDropped > 0 ? totalStayed / totalDropped : undefined,
    uncounted,
    incomplete: counted.length < 10,
  };
};

export type VisitTowerState = "unknown" | "calibrating" | "calibrated";

/**
 * What this page visit knows of the tower. A reload starts unknown: a calibration from before
 * the reload is not this visit's, and nothing is sent until Calibrate is pressed again.
 */
export const visitTowerState = (
  pressedCalibrate: boolean,
  calibration: "uncalibrated" | "calibrating" | "calibrated" | undefined,
): VisitTowerState => {
  if (!pressedCalibrate) return "unknown";
  if (calibration === "calibrating") return "calibrating";
  if (calibration === "calibrated") return "calibrated";
  return "unknown";
};

export const VISIT_LABELS: Record<VisitTowerState, string> = {
  unknown: "Unknown",
  calibrating: "Calibrating",
  calibrated: "Calibrated",
};

/** Answers kept in this browser so a run can stop and continue. Tower state is not kept. */
export interface SetupRun {
  glyphs: Partial<Record<string, SeenGlyph>>;
  /** Set only once a north-side light command was sent. A kingdom needs it. */
  northLit: boolean;
  facingKingdom?: Kingdom;
  /** Set only once the top-drum rotate command was sent. */
  rotateSent: boolean;
  rotateResult?: Side;
  skulls: SkullTry[];
}

export const EMPTY_RUN: SetupRun = {
  glyphs: {},
  northLit: false,
  rotateSent: false,
  skulls: [],
};

export const STORAGE_KEY = "tower-poc.setup-check";

const isGlyphName = (value: unknown): value is GlyphName =>
  typeof value === "string" && (GLYPH_NAMES as readonly string[]).includes(value);

const isSeen = (value: unknown): value is SeenGlyph =>
  value === BLANK || value === "none" || isGlyphName(value);

const isSide = (value: unknown): value is Side =>
  typeof value === "string" && (SIDES as readonly string[]).includes(value);

const isKingdom = (value: unknown): value is Kingdom =>
  typeof value === "string" && (KINGDOMS as readonly string[]).includes(value);

/** A counted number, or undefined when the value is missing or not a count. Never turns a gap into 0. */
const countOrMissing = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 99
    ? value
    : undefined;

const sanitizeTry = (value: unknown, index: number): SkullTry | undefined => {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as { id?: unknown; dropped?: unknown; stayed?: unknown };
  const dropped = countOrMissing(record.dropped);
  const stayed = countOrMissing(record.stayed);
  const id =
    typeof record.id === "string" && record.id.length > 0 && record.id.length <= 40
      ? record.id
      : `try-${index + 1}`;
  return {
    id,
    ...(dropped !== undefined ? { dropped } : {}),
    ...(stayed !== undefined ? { stayed } : {}),
  };
};

export const sanitizeRun = (value: unknown): SetupRun => {
  if (typeof value !== "object" || value === null) return EMPTY_RUN;
  const record = value as Partial<SetupRun>;
  const glyphs: SetupRun["glyphs"] = {};
  if (typeof record.glyphs === "object" && record.glyphs !== null) {
    for (const { drum, side } of DRUM_SIDES) {
      const key = sideKey(drum, side);
      const seen = (record.glyphs as Record<string, unknown>)[key];
      if (isSeen(seen)) glyphs[key] = seen;
    }
  }
  const northLit = record.northLit === true;
  const rotateSent = record.rotateSent === true;
  const skulls = Array.isArray(record.skulls)
    ? record.skulls.flatMap((try_, index) => {
        const sanitized = sanitizeTry(try_, index);
        return sanitized ? [sanitized] : [];
      })
    : [];
  return {
    glyphs,
    northLit,
    ...(northLit && isKingdom(record.facingKingdom) ? { facingKingdom: record.facingKingdom } : {}),
    rotateSent,
    ...(rotateSent && isSide(record.rotateResult) ? { rotateResult: record.rotateResult } : {}),
    skulls,
  };
};

/** Records the kingdom north faces. Does nothing when the north side was never lit. */
export const withFacing = (run: SetupRun, kingdom: Kingdom): SetupRun =>
  run.northLit ? { ...run, facingKingdom: kingdom } : run;

export const withGlyph = (run: SetupRun, drum: Drum, side: Side, seen: SeenGlyph): SetupRun => ({
  ...run,
  glyphs: { ...run.glyphs, [sideKey(drum, side)]: seen },
});

export const withSkull = (run: SetupRun, try_: SkullTry): SetupRun => ({
  ...run,
  skulls: [...run.skulls, try_],
});

/** Records where the top drum landed. Does nothing until the rotate command has been sent. */
export const withRotateResult = (run: SetupRun, side: Side): SetupRun =>
  run.rotateSent ? { ...run, rotateResult: side } : run;

/** A typed-in count. Empty is missing, not zero. */
export const parseCount = (raw: string): number | undefined => {
  const text = raw.trim();
  if (!/^\d{1,2}$/.test(text)) return undefined;
  return Number(text);
};

export const asSeen = (value: string): SeenGlyph =>
  value === BLANK || value === "none" || (GLYPH_NAMES as readonly string[]).includes(value)
    ? (value as SeenGlyph)
    : BLANK;

export interface StoredRun {
  run: SetupRun;
  /** Set when the saved text could not be read. The caller logs it. */
  error?: unknown;
}

export const loadRun = (storage: Pick<Storage, "getItem">): StoredRun => {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null || raw === "") return { run: EMPTY_RUN };
  try {
    return { run: sanitizeRun(JSON.parse(raw)) };
  } catch (error) {
    return { run: EMPTY_RUN, error };
  }
};

/** Writes the run. Returns the error when the browser refused, so the caller can log it. */
export const saveRun = (storage: Pick<Storage, "setItem">, run: SetupRun): unknown => {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(sanitizeRun(run)));
    return undefined;
  } catch (error) {
    return error;
  }
};
