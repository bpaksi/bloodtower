import type { PieceCheckView } from "../../../protocols/v2/views.ts";
import { tryChapters } from "../chapter/chapters.ts";
import type { ChapterLocal } from "../chapter/loop.ts";
import { savedBuildingSkulls, trappedSkullCount } from "../day/skull.ts";
import type { EncounterLocal } from "../encounter/loop.ts";
import type { GroupTurnLocal } from "../group-turn/loop.ts";
import { openQuestTokens } from "../quest/store.ts";
import type { ShellState } from "./state.ts";

/** Drum levels in wire order: 0 top, 1 middle, 2 bottom (DEC-716, DEC-937). */
export type DrumLevel = "top" | "middle" | "bottom";
export type DrumSideIndex = 0 | 1 | 2 | 3;
export type DrumSide = "north" | "east" | "south" | "west";

export type DrumPositions = {
  top: DrumSideIndex;
  middle: DrumSideIndex;
  bottom: DrumSideIndex;
};

/** Calibrated home position for all three drums (north = 0). */
export const DRUM_HOME: DrumPositions = { top: 0, middle: 0, bottom: 0 };

export const DRUM_SIDES: readonly DrumSide[] = ["north", "east", "south", "west"];

export const DRUM_ORDER: readonly { level: DrumLevel; index: 0 | 1 | 2 }[] = [
  { level: "top", index: 0 },
  { level: "middle", index: 1 },
  { level: "bottom", index: 2 },
];

/**
 * Verified calibrated glyph positions from Bob's C2-10 tower run (DEC-937, Q-033):
 * at home (0 = north): top N=Cleanse S=Quest; middle N=Battle; bottom N=Banner S=Reinforce.
 */
const HOME_GLYPHS: Record<
  DrumLevel,
  readonly [string | null, string | null, string | null, string | null]
> = {
  top: ["Cleanse", null, "Quest", null],
  middle: ["Battle", null, null, null],
  bottom: ["Banner", null, "Reinforce", null],
};

/** Expected glyph on each of the 4 compass sides when `level` is rotated to `position`. */
export const drumGlyphFaces = (
  level: DrumLevel,
  position: DrumSideIndex,
): { side: DrumSide; glyph: string | null }[] => {
  const home = HOME_GLYPHS[level];
  return DRUM_SIDES.map((side, sideIndex) => {
    const homeIndex = (sideIndex - position + 4) % 4;
    return { side, glyph: home[homeIndex] ?? null };
  });
};

export const normalizeDrumPositions = (raw?: Partial<DrumPositions> | null): DrumPositions => {
  const valid = (value: unknown): DrumSideIndex =>
    value === 0 || value === 1 || value === 2 || value === 3 ? value : 0;
  return {
    top: valid(raw?.top),
    middle: valid(raw?.middle),
    bottom: valid(raw?.bottom),
  };
};

export const anyDrumOffHome = (drums: DrumPositions): boolean =>
  drums.top !== 0 || drums.middle !== 0 || drums.bottom !== 0;

/**
 * Exhaustive list of physical piece kinds tracked in a 1.0 autosave (PT-08, DEC-920, EV-20).
 * Order: board pieces (1..4), quest tokens (4a), tower steps (5..6).
 * App-only state (gold, items, corruption, virtues, flags) and 1.1 pieces (Warden,
 * adversary, lieutenant, captain, 1.1 pursuers) are never in this list.
 */
export const PHYSICAL_PIECE_KINDS_V1 = [
  "hero-minis",
  "skulls",
  "foes",
  "broken-seals",
  "quest-tokens",
  "drums",
  "trapped-skulls",
] as const;

export type PieceCheckStepId = (typeof PHYSICAL_PIECE_KINDS_V1)[number];
export type PieceCheckStepNumber = "1" | "2" | "3" | "4" | "4a" | "5" | "6";

const STEP_NUMBER: Record<PieceCheckStepId, PieceCheckStepNumber> = {
  "hero-minis": "1",
  skulls: "2",
  foes: "3",
  "broken-seals": "4",
  "quest-tokens": "4a",
  drums: "5",
  "trapped-skulls": "6",
};

/** Approved copy lines for Continue's piece check (mockup.html, screen-spec.md, EV-16, PT-08). */
export const PIECE_CHECK_COPY = {
  "hero-minis": "Set each hero on their saved space.",
  skulls: "Put the skulls back on each building.",
  foes: "Set the foes back where they stood.",
  "broken-seals": "Mark the broken seals.",
  "quest-tokens": "Put the quest tokens back on their spaces.",
  drumsTitle: "Turn the drums to the saved game",
  trappedSkulls: (count: number) => `Drop ${count} skulls back in the top of the tower.`,
} as const;

export const PIECE_CHECK_PROMPT_PREFIX = "piece-check-";
export const pieceCheckPromptId = (stepId: PieceCheckStepId): string =>
  `${PIECE_CHECK_PROMPT_PREFIX}${stepId}`;

export const PIECE_CHECK_CONFIRM_ACTION = "confirm" as const;
export const PIECE_CHECK_SKIP_ACTION = "skip" as const;
export const PIECE_CHECK_TURN_DRUMS_ACTION = "turn-drums" as const;

export type PieceCheckState = {
  steps: PieceCheckStepId[];
  index: number;
  confirmed: PieceCheckStepId[];
  skipped: PieceCheckStepId[];
  drumTargets: DrumPositions;
  drumActual: DrumPositions;
  drumsTurning: boolean;
  drumsTurned: boolean;
  trappedSkulls: number;
  towerInPlay: boolean;
};

export const pieceCheckStepNumber = (stepId: PieceCheckStepId): PieceCheckStepNumber =>
  STEP_NUMBER[stepId];

export const pieceCheckCurrentStep = (check: PieceCheckState | null): PieceCheckStepId | null => {
  if (!check) return null;
  return check.steps[check.index] ?? null;
};

const isTowerStep = (stepId: PieceCheckStepId): boolean =>
  stepId === "drums" || stepId === "trapped-skulls";

/**
 * Pure step builder from a saved shell state (DEC-710, DEC-716, DEC-717, PT-08).
 * Read-only: never mutates `play`, day clock, chapter store, or quest store (EV-10, EV-23).
 */
export const buildPieceCheckSteps = (
  state: ShellState,
  towerInPlay: boolean,
): PieceCheckStepId[] => {
  const play = state.play;
  if (!play) return [];

  const steps: PieceCheckStepId[] = ["hero-minis", "skulls"];
  if ((play.foes?.length ?? 0) > 0) steps.push("foes");

  const chapters = tryChapters(play);
  if (chapters && chapters.brokenSeals.length > 0) steps.push("broken-seals");

  if (openQuestTokens(play).length > 0) steps.push("quest-tokens");

  if (towerInPlay) {
    const savedDrums = normalizeDrumPositions(state.drums);
    if (anyDrumOffHome(savedDrums)) steps.push("drums");
    if (trappedSkullCount(play) > 0) steps.push("trapped-skulls");
  }

  return steps;
};

/** Builds the initial PieceCheckState for Continue, or null if the save has no play state yet. */
export const buildPieceCheck = (
  state: ShellState,
  towerInPlay: boolean,
): PieceCheckState | null => {
  const play = state.play;
  if (!play) return null;
  const steps = buildPieceCheckSteps(state, towerInPlay);
  if (steps.length === 0) return null;
  const drumTargets = normalizeDrumPositions(state.drums);
  return {
    steps,
    index: 0,
    confirmed: [],
    skipped: [],
    drumTargets,
    drumActual: { ...DRUM_HOME },
    drumsTurning: false,
    drumsTurned: false,
    trappedSkulls: trappedSkullCount(play),
    towerInPlay,
  };
};

/** Next drum in top, middle, bottom order whose actual position differs from its saved target. */
export const nextDrumToRotate = (
  check: PieceCheckState,
): { level: DrumLevel; drumIndex: 0 | 1 | 2; position: DrumSideIndex } | null => {
  for (const { level, index } of DRUM_ORDER) {
    if (check.drumActual[level] !== check.drumTargets[level]) {
      return { level, drumIndex: index, position: check.drumTargets[level] };
    }
  }
  return null;
};

/** Offers the current piece-check step's actions on every joined iPad. */
export const ensurePieceCheckOffers = (state: ShellState): void => {
  const check = state.pieceCheck;
  if (!check || state.screen !== "piece-check") return;
  const stepId = pieceCheckCurrentStep(check);
  if (!stepId) return;
  const promptId = pieceCheckPromptId(stepId);
  state.offered = [];
  if (stepId === "drums") {
    state.offered.push({
      promptId,
      actionId: PIECE_CHECK_TURN_DRUMS_ACTION,
      open: !check.drumsTurning && !check.drumsTurned,
    });
    state.offered.push({
      promptId,
      actionId: PIECE_CHECK_CONFIRM_ACTION,
      open: check.drumsTurned && !check.drumsTurning,
    });
    state.offered.push({
      promptId,
      actionId: PIECE_CHECK_SKIP_ACTION,
      open: !check.drumsTurning,
    });
    return;
  }
  state.offered.push({ promptId, actionId: PIECE_CHECK_CONFIRM_ACTION, open: true });
  state.offered.push({ promptId, actionId: PIECE_CHECK_SKIP_ACTION, open: true });
};

/** Resets awaiting-press flags on play loops so saved prompts re-offer when piece check enters play. */
export const resetPlayPromptsAfterPieceCheck = (state: ShellState): void => {
  for (const frame of state.loops.stack) {
    if (frame.loopId === "group-turn") {
      frame.local = { ...(frame.local as GroupTurnLocal), awaitingPress: false };
    } else if (frame.loopId === "encounter") {
      frame.local = {
        ...(frame.local as EncounterLocal),
        awaitingLeave: false,
        awaitingPress: false,
      };
    } else if (frame.loopId === "chapter") {
      frame.local = { ...(frame.local as ChapterLocal), awaitingPress: false };
    }
  }
};

const advancePieceCheck = (state: ShellState): boolean => {
  const check = state.pieceCheck;
  if (!check) return false;
  check.index += 1;
  if (check.index >= check.steps.length) {
    state.unconfirmedPieces = [...check.skipped];
    state.pieceCheck = null;
    if (!state.pause) {
      state.screen = "play";
      state.stage = "playing";
    }
    resetPlayPromptsAfterPieceCheck(state);
    return true;
  }
  return false;
};

export const applyPieceCheckConfirm = (
  state: ShellState,
  promptId: string,
): { accepted: boolean; finished: boolean } => {
  const check = state.pieceCheck;
  if (!check || state.screen !== "piece-check") return { accepted: false, finished: false };
  const stepId = pieceCheckCurrentStep(check);
  if (!stepId || promptId !== pieceCheckPromptId(stepId)) {
    return { accepted: false, finished: false };
  }
  if (stepId === "drums" && (!check.drumsTurned || check.drumsTurning)) {
    return { accepted: false, finished: false };
  }
  if (!check.confirmed.includes(stepId)) check.confirmed.push(stepId);
  return { accepted: true, finished: advancePieceCheck(state) };
};

export const applyPieceCheckSkip = (
  state: ShellState,
  promptId: string,
): { accepted: boolean; finished: boolean } => {
  const check = state.pieceCheck;
  if (!check || state.screen !== "piece-check") return { accepted: false, finished: false };
  const stepId = pieceCheckCurrentStep(check);
  if (!stepId || promptId !== pieceCheckPromptId(stepId)) {
    return { accepted: false, finished: false };
  }
  if (stepId === "drums" && check.drumsTurning) {
    return { accepted: false, finished: false };
  }
  if (!check.skipped.includes(stepId)) check.skipped.push(stepId);
  return { accepted: true, finished: advancePieceCheck(state) };
};

export const applyPieceCheckTurnDrums = (
  state: ShellState,
  promptId: string,
): {
  accepted: boolean;
  command: {
    capabilityId: "mechanics.rotate-drum";
    params: { drumIndex: number; position: number };
  } | null;
} => {
  const check = state.pieceCheck;
  if (!check || state.screen !== "piece-check") return { accepted: false, command: null };
  const stepId = pieceCheckCurrentStep(check);
  if (stepId !== "drums" || promptId !== pieceCheckPromptId("drums")) {
    return { accepted: false, command: null };
  }
  if (check.drumsTurning || check.drumsTurned) return { accepted: false, command: null };
  const next = nextDrumToRotate(check);
  if (!next) {
    check.drumsTurned = true;
    return { accepted: true, command: null };
  }
  check.drumsTurning = true;
  return {
    accepted: true,
    command: {
      capabilityId: "mechanics.rotate-drum",
      params: { drumIndex: next.drumIndex, position: next.position },
    },
  };
};

/**
 * Handles the settlement of one `mechanics.rotate-drum` command during step 5.
 * - On ok: updates `drumActual` and `state.drums`, requests a checkpoint write (EV-06, EV-15),
 *   and returns the next drum to rotate (if any), or marks `drumsTurned = true`.
 * - On failure: clears `drumsTurning`, sends NO further commands and never retries (EV-06, tower safety).
 */
export const applyPieceCheckDrumResult = (
  state: ShellState,
  drumIndex: 0 | 1 | 2,
  position: DrumSideIndex,
  ok: boolean,
): {
  checkpoint: boolean;
  nextCommand: {
    capabilityId: "mechanics.rotate-drum";
    params: { drumIndex: number; position: number };
  } | null;
} => {
  const check = state.pieceCheck;
  if (!check) return { checkpoint: false, nextCommand: null };
  const entry = DRUM_ORDER.find((row) => row.index === drumIndex);
  if (!entry) {
    check.drumsTurning = false;
    return { checkpoint: false, nextCommand: null };
  }
  if (!ok) {
    check.drumsTurning = false;
    check.drumsTurned = false;
    return { checkpoint: false, nextCommand: null };
  }
  check.drumActual = { ...check.drumActual, [entry.level]: position };
  state.drums = { ...normalizeDrumPositions(state.drums), [entry.level]: position };
  const next = nextDrumToRotate(check);
  if (next) {
    check.drumsTurning = true;
    return {
      checkpoint: true,
      nextCommand: {
        capabilityId: "mechanics.rotate-drum",
        params: { drumIndex: next.drumIndex, position: next.position },
      },
    };
  }
  check.drumsTurning = false;
  check.drumsTurned = true;
  return { checkpoint: true, nextCommand: null };
};

/**
 * Drops tower-only steps (5 and 6) if the table switches to Play without Tower mid-check (DEC-305/306).
 * Advances into play if no board steps remain.
 */
export const dropTowerStepsFromPieceCheck = (state: ShellState): boolean => {
  const check = state.pieceCheck;
  if (!check) return false;
  const remaining = check.steps.filter((step, idx) => idx < check.index || !isTowerStep(step));
  check.steps = remaining;
  check.towerInPlay = false;
  check.drumsTurning = false;
  if (check.index >= check.steps.length) {
    state.unconfirmedPieces = [...check.skipped];
    state.pieceCheck = null;
    if (!state.pause) {
      state.screen = "play";
      state.stage = "playing";
    }
    resetPlayPromptsAfterPieceCheck(state);
    return true;
  }
  return false;
};

/** Projects the current piece-check step into the wire-safe `PieceCheckView` for board and iPads. */
export const buildPieceCheckView = (
  state: ShellState,
  resolveHeroName: (heroId: string) => string,
): PieceCheckView | null => {
  const check = state.pieceCheck;
  const play = state.play;
  if (!check || !play || state.screen !== "piece-check") return null;
  const stepId = pieceCheckCurrentStep(check);
  if (!stepId) return null;

  const base = {
    stepId,
    stepNumber: pieceCheckStepNumber(stepId),
    stepIndex: check.index,
    stepCount: check.steps.length,
    title: stepId === "drums" ? PIECE_CHECK_COPY.drumsTitle : null,
    line:
      stepId === "drums"
        ? null
        : stepId === "trapped-skulls"
          ? PIECE_CHECK_COPY.trappedSkulls(check.trappedSkulls)
          : PIECE_CHECK_COPY[stepId],
    skippedCount: check.skipped.length,
  };

  if (stepId === "hero-minis") {
    const board = play.content.board;
    const heroes = play.groups.flatMap((group) => {
      const space = board.spaceById.get(group.spaceId);
      return group.heroIds.map((heroId) => ({
        heroId,
        heroName: resolveHeroName(heroId),
        spaceId: group.spaceId,
        spaceName: space?.name ?? group.spaceId,
        kingdom: space?.kingdom ?? ("N" as const),
      }));
    });
    return { ...base, heroes };
  }

  if (stepId === "skulls") {
    return { ...base, buildings: savedBuildingSkulls(play) };
  }

  if (stepId === "foes") {
    const board = play.content.board;
    const foes = (play.foes ?? []).map((foe) => ({
      id: foe.id,
      name: foe.name,
      spaceId: foe.spaceId,
      spaceName: board.spaceById.get(foe.spaceId)?.name ?? foe.spaceId,
    }));
    return { ...base, foes };
  }

  if (stepId === "broken-seals") {
    const chapters = tryChapters(play);
    const seals = (chapters?.brokenSeals ?? []).map((sealId) => {
      const def = chapters?.plan.seals.find((row) => row.id === sealId);
      return {
        id: sealId,
        name: def?.name ?? sealId,
        glyph: def?.glyph ?? null,
      };
    });
    return { ...base, seals };
  }

  if (stepId === "quest-tokens") {
    return { ...base, questTokens: openQuestTokens(play) };
  }

  if (stepId === "drums") {
    return {
      ...base,
      drums: {
        turned: check.drumsTurned,
        turning: check.drumsTurning,
        rows: DRUM_ORDER.map(({ level }) => {
          const target = check.drumTargets[level];
          return {
            level,
            position: target,
            side: DRUM_SIDES[target] ?? "north",
            turned: check.drumActual[level] === target,
            faces: drumGlyphFaces(level, target),
          };
        }),
      },
    };
  }

  return { ...base, trappedSkulls: check.trappedSkulls };
};
