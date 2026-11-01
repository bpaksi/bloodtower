import { eventRng } from "@dark-tower/rng";
import { type Tuning, tuningSchema } from "../protocols/pack-v2/base.ts";
import type { LoopRuntimeState } from "./loop/runtime.ts";
import { emptyLoopRuntime } from "./loop/runtime.ts";
import type { LoopRegistry } from "./loop/types.ts";
import { testNestedLoopRegistry } from "./loops/testNested.ts";

export const ENGINE_VERSION = "0.0.0-step3";

export type EngineMode = "idle" | "test-loop";

/** Tuning and the counts taken from it, fixed at Begin. Read-only after that. */
export type GamePlay = {
  tuning: Tuning;
  /** Skulls in the supply. Taken from tuning at Begin and never re-read from the file. */
  skullSupply: number;
  /** Gold awarded since Begin. */
  gold: number;
};

export type EngineState = {
  version: typeof ENGINE_VERSION;
  mode: EngineMode;
  seed: string;
  /** Number of events applied so far; the next event uses this as its sequence for rng. */
  eventSeq: number;
  loops: LoopRuntimeState;
  registry: LoopRegistry;
  /**
   * Set at Begin. Absent on a state that has not begun, including a checkpoint
   * restore that predates this field. Continue restores the Begin snapshot.
   */
  play?: GamePlay | null;
};

export const initialEngineState = (): EngineState => ({
  version: ENGINE_VERSION,
  mode: "idle",
  seed: "",
  eventSeq: 0,
  loops: emptyLoopRuntime(),
  registry: testNestedLoopRegistry,
});

const freezeDeep = (value: unknown): void => {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const nested of Object.values(value)) freezeDeep(nested);
};

const sealTuning = (tuning: Tuning): Tuning => {
  const copy = structuredClone(tuning);
  freezeDeep(copy);
  return copy;
};

const requirePlay = (state: EngineState): GamePlay => {
  if (!state.play) {
    throw new Error("Tuning is fixed at Begin; this game has not begun.");
  }
  return state.play;
};

const parseTuning = (tuning: unknown): Tuning => {
  const parsed = tuningSchema.safeParse(tuning);
  if (!parsed.success) {
    throw new Error(`Tuning is not usable: ${parsed.error.message}`);
  }
  return sealTuning(parsed.data);
};

/** Copies tuning onto the state. Later edits to the pack file do not change this copy. */
export const beginGame = (seed: string, tuning: Tuning): EngineState => {
  if (typeof seed !== "string") throw new Error("A game seed is a string.");
  const sealed = parseTuning(tuning);
  return {
    ...initialEngineState(),
    seed,
    play: Object.freeze({
      tuning: sealed,
      skullSupply: sealed.skulls.supply,
      gold: 0,
    }),
  };
};

export const supplyTotal = (state: EngineState): number => requirePlay(state).skullSupply;

/** One move roll. The dice and the floor come from the game's tuning. */
export const rollMove = (state: EngineState): { state: EngineState; total: number } => {
  const play = requirePlay(state);
  const rng = eventRng(state.seed, state.eventSeq);
  const rolled = rng.roll(play.tuning.day.move_roll.dice);
  const total = Math.max(play.tuning.day.move_roll.floor, rolled.total);
  return { state: { ...state, eventSeq: state.eventSeq + 1 }, total };
};

/** One day: the move roll. Skull supply stays the Begin value. */
export const runDay = (state: EngineState): { state: EngineState; move: number } => {
  const rolled = rollMove(state);
  return { state: rolled.state, move: rolled.total };
};

/**
 * One Standard event draw. The file stores a percent; chance() takes a fraction of 1.
 */
export const drawStandardEvent = (state: EngineState): { state: EngineState; hit: boolean } => {
  const play = requirePlay(state);
  const rng = eventRng(state.seed, state.eventSeq);
  const hit = rng.chance(play.tuning.day.event_chance.standard / 100);
  return { state: { ...state, eventSeq: state.eventSeq + 1 }, hit };
};

/** Adds the tuning's won-quest gold once for each hero in the group. */
export const winQuest = (state: EngineState, heroesInGroup: number): EngineState => {
  const play = requirePlay(state);
  if (!Number.isInteger(heroesInGroup) || heroesInGroup < 1) {
    throw new Error("A won quest awards gold to each hero in the group.");
  }
  return {
    ...state,
    play: Object.freeze({
      tuning: play.tuning,
      skullSupply: play.skullSupply,
      gold: play.gold + play.tuning.gold.won_quest * heroesInGroup,
    }),
  };
};

type SavedGame = {
  seed: string;
  eventSeq: number;
  tuning: unknown;
  skullSupply: unknown;
  gold: unknown;
};

/** Snapshot of the Begin tuning. Continue does not open the pack file. */
export const autosaveGame = (state: EngineState): string => {
  const play = requirePlay(state);
  return JSON.stringify({
    seed: state.seed,
    eventSeq: state.eventSeq,
    tuning: play.tuning,
    skullSupply: play.skullSupply,
    gold: play.gold,
  });
};

const savedNumber = (value: unknown, label: string): number => {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`Autosave needs ${label}.`);
  }
  return value;
};

/** Restores the snapshot from Begin. A changed tuning file is not read. */
export const continueGame = (autosave: string): EngineState => {
  let raw: unknown;
  try {
    raw = JSON.parse(autosave);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Autosave is not usable: ${message}`);
  }
  if (!raw || typeof raw !== "object") throw new Error("Autosave is not usable.");
  const row = raw as Partial<SavedGame>;
  if (typeof row.seed !== "string") throw new Error("Autosave needs a seed.");
  const eventSeq = savedNumber(row.eventSeq, "eventSeq");
  if (eventSeq < 0) throw new Error("Autosave needs eventSeq.");
  const skullSupply = savedNumber(row.skullSupply, "a skull supply");
  if (skullSupply < 0) throw new Error("Autosave needs a skull supply.");
  const gold = savedNumber(row.gold, "gold");
  const tuning = parseTuning(row.tuning);
  return {
    ...initialEngineState(),
    seed: row.seed,
    eventSeq,
    play: Object.freeze({
      tuning,
      skullSupply,
      gold,
    }),
  };
};
