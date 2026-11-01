import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import {
  autosaveGame,
  beginGame,
  continueGame,
  drawStandardEvent,
  rollMove,
  runDay,
  supplyTotal,
  winQuest,
} from "../../engine/state.ts";
import type { Tuning } from "../../protocols/pack-v2/base.ts";
import { loadPackV2Dir, type PackV2LoadResult } from "./v2/load.ts";

const repoRoot = join(import.meta.dirname, "../../../../../");
const basePack = join(repoRoot, "packs", "base");

/** Fixture copied from DEC-703's rows: setup, day and moves, skulls, battle, heroes, gold, Tomb and Tower. */
const DEC_703 = {
  c3_end_after_chapter_1: true,
  fight_enabled: false,
  setup: {
    purse_wheel: { sides: [10, 20, 30, 40], floor: 10 },
    difficulty: {
      easy: { foe_level: -1, purse_percent: 50, full_hit_points: 2 },
      hard: { foe_level: 1, purse_percent: -25, purse_round: "down" },
    },
    foe_level_by_chapter: { chapter_1: 1, per_chapter: 1 },
    skull_supply: 24,
  },
  day: {
    move_roll: { dice: "2d3", floor: 2 },
    shifts: { per_helping_virtue: 1, per_corruption: -1 },
    event_chance: { short: 30, standard: 40 },
    event_weights: { quiet: 30, windfall: 15, hazard: 20, foes: 20, disaster: 5, people: 10 },
    hazard: { hit_points: -2 },
    windfall: { gold: 5 },
    go_around: { hit_points: -2, minimum: 1 },
  },
  skulls: {
    supply: 24,
    drops_a_night: {
      heroes_1_to_2: 1,
      heroes_3_to_4: { each_night: 1, every_other_night: 2 },
    },
    quest_won_suppresses_drop: true,
    simulated_drop: { skulls: 1, kingdom_die: "d4" },
    tower_drop: [
      { count: 0, percent: 30 },
      { count: 1, percent: 50 },
      { count: 2, percent: 20 },
    ],
    seal_break: { min: 0, max: "held" },
  },
  battle: {
    foe_count: { per_level: 4, per_extra_hero: 1 },
    round_odds: { min_percent: 10, max_percent: 90, heroes_divisor: 2 },
    won_round: { fraction: "half", round: "up", minimum: 2 },
    lost_round: { heroes: 1, hit_points: "foe_level" },
    trait_extra_hit_points: 1,
    step_up: { chance: { n: 1, d: 3 }, level: 1 },
    hex: { target: "random_attacking_hero", min_group: 3 },
    shield_wall: { cut_less: 1, small_group_max_heroes: 2, small_group_minimum_cut: 2 },
    automatic_advantage: { per_match: 1, max: 10 },
    potion_hit_points: 4,
  },
  heroes: {
    fighter: { fight: 3, hit_points: 12 },
    ranger: { fight: 2, hit_points: 10 },
    scout: { fight: 2, hit_points: 9 },
    healer: { fight: 1, hit_points: 9 },
    magic_user: { fight: 1, hit_points: 8 },
    bard: { fight: 1, hit_points: 8 },
    solo: { fight: 1, hit_points: 2 },
  },
  spells: {
    magic_missile: -2,
    lightning: -6,
    fireball: { fraction: "half", round: "down" },
    mend: 3,
    silver_tongue: { off: "quarter" },
  },
  gold: {
    won_battle: { per_level: 2, disaster: "double" },
    won_quest: 5,
    lost_on_fall: { per_level: 2, split: true, capped: true },
    citadel_rally: { gold: 5, moves: 1, heal: "full" },
    sanctuary_cure: { gold: 10, moves: 1, corruption: 1, first_each_chapter: "free" },
    tavern_rest: { hit_points: 3 },
    virtue_draw: 10,
  },
  tomb: {
    rooms: {
      short: { min: 4, max: 5 },
      standard: { min: 6, max: 7 },
      guardian_included: true,
    },
    deal: { nothing: 40, battle: 30, trap: 30, at_least_battle: 1, at_least_trap: 1 },
    guardian: { level_up: 1 },
  },
  tower: {
    rooms: {
      kinds: ["guard", "trap", "shrine"],
      each: { n: 1, d: 3 },
      third: "stair_guard",
    },
    guard: { level_offset: -2 },
    shrine: { hit_points: 2, once: true },
    trap: { hit_points: -2 },
    warden: { level: 5, counts_as: "any_foe" },
  },
} satisfies Tuning;

const tuningOf = (dir: string): Tuning => {
  const result: PackV2LoadResult = loadPackV2Dir(dir);
  expect(result.ok).toBe(true);
  if (!result.ok || result.kind !== "base-content" || !result.pack.tuning) {
    throw new Error("The base pack did not load its tuning.");
  }
  return result.pack.tuning;
};

const copyBase = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "bt-tuning-"));
  cpSync(basePack, dir, { recursive: true });
  return dir;
};

const withTuning = (edit: (text: string) => string): { dir: string; result: PackV2LoadResult } => {
  const dir = copyBase();
  const file = join(dir, "tuning.yaml");
  const next = edit(readFileSync(file, "utf8"));
  expect(next).not.toBe(readFileSync(file, "utf8"));
  writeFileSync(file, next);
  return { dir, result: loadPackV2Dir(dir) };
};

const expectLint = (result: PackV2LoadResult, key: string) => {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(
    result.issues.some((item) => item.file.includes("tuning.yaml") && item.path.includes(key)),
  ).toBe(true);
};

describe("tuning.yaml", () => {
  it("matches DEC-703", () => {
    const tuning = tuningOf(basePack);
    expect(tuning.skulls.supply).toBe(24);
    expect(tuning.day.move_roll).toEqual({ dice: "2d3", floor: 2 });
    expect(tuning.day.event_chance).toEqual({ short: 30, standard: 40 });
    expect(tuning.gold.won_quest).toBe(5);
    expect(tuning.gold.sanctuary_cure.gold).toBe(10);
    expect(tuning).toEqual(DEC_703);
  });

  it("reads changed skull supply, move floor, event chance and quest gold", () => {
    const { dir, result } = withTuning((text) =>
      text
        .replace("\n  supply: 24\n", "\n  supply: 30\n")
        .replace("dice: 2d3\n    floor: 2", "dice: 2d3\n    floor: 3")
        .replace("standard: 40", "standard: 50")
        .replace("won_quest: 5", "won_quest: 7"),
    );
    try {
      expect(result.ok).toBe(true);
      if (!result.ok || result.kind !== "base-content" || !result.pack.tuning) {
        throw new Error("The edited base pack did not load tuning.");
      }
      const tuning = result.pack.tuning;
      expect(tuning.skulls.supply).toBe(30);
      expect(tuning.day.move_roll.floor).toBe(3);
      expect(tuning.day.event_chance.standard).toBe(50);
      expect(tuning.gold.won_quest).toBe(7);

      const seed = "c3-02";
      const started = beginGame(seed, tuning);
      const day = runDay(started);
      expect(supplyTotal(day.state)).toBe(30);
      expect(day.move).toBeGreaterThanOrEqual(3);
      const won = winQuest(day.state, 1);
      if (!day.state.play || !won.play) throw new Error("The game has no tuning.");
      expect(won.play.gold - day.state.play.gold).toBe(7);

      let rolling = beginGame(seed, tuning);
      for (let i = 0; i < 1000; i++) {
        const rolled = rollMove(rolling);
        expect(rolled.total).toBeGreaterThanOrEqual(3);
        rolling = rolled.state;
      }

      let drawing = beginGame(seed, tuning);
      let hits = 0;
      const draws = 10_000;
      for (let i = 0; i < draws; i++) {
        const drawn = drawStandardEvent(drawing);
        if (drawn.hit) hits += 1;
        drawing = drawn.state;
      }
      const percent = (hits / draws) * 100;
      expect(Math.abs(percent - tuning.day.event_chance.standard)).toBeLessThanOrEqual(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("names tuning.yaml and skulls.supply when supply is missing or not a number", () => {
    const missing = withTuning((text) => text.replace("\n  supply: 24\n", "\n"));
    const lots = withTuning((text) => text.replace("\n  supply: 24\n", "\n  supply: 'lots'\n"));
    try {
      expectLint(missing.result, "skulls.supply");
      expectLint(lots.result, "skulls.supply");
    } finally {
      rmSync(missing.dir, { recursive: true, force: true });
      rmSync(lots.dir, { recursive: true, force: true });
    }
  });

  it("requires the two C3 switches to be booleans", () => {
    const raw = parseYaml(readFileSync(join(basePack, "tuning.yaml"), "utf8")) as Tuning;
    expect(raw.c3_end_after_chapter_1).toBe(true);
    expect(raw.fight_enabled).toBe(false);
    const loaded = tuningOf(basePack);
    expect(loaded.c3_end_after_chapter_1).toBe(true);
    expect(loaded.fight_enabled).toBe(false);

    const cases = [
      (text: string) => text.replace("\nc3_end_after_chapter_1: true\n", "\n"),
      (text: string) => text.replace("\nfight_enabled: false\n", "\n"),
      (text: string) =>
        text.replace("c3_end_after_chapter_1: true", 'c3_end_after_chapter_1: "yes"'),
      (text: string) => text.replace("fight_enabled: false", 'fight_enabled: "yes"'),
    ];
    const keys = [
      "c3_end_after_chapter_1",
      "fight_enabled",
      "c3_end_after_chapter_1",
      "fight_enabled",
    ];
    const dirs: string[] = [];
    try {
      for (const [index, edit] of cases.entries()) {
        const run = withTuning(edit);
        dirs.push(run.dir);
        const key = keys[index];
        if (!key) throw new Error("Missing switch key.");
        expectLint(run.result, key);
      }
    } finally {
      for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    }
  });

  it("Continue keeps the tuning fixed at Begin", () => {
    const dir = copyBase();
    try {
      const startedTuning = tuningOf(dir);
      const started = beginGame("c3-02-continue", startedTuning);
      const saved = autosaveGame(started);
      const file = join(dir, "tuning.yaml");
      const edited = readFileSync(file, "utf8").replace("\n  supply: 24\n", "\n  supply: 30\n");
      writeFileSync(file, edited);
      const changed = tuningOf(dir);
      expect(changed.skulls.supply).toBe(30);
      const resumed = continueGame(saved);
      expect(supplyTotal(resumed)).toBe(24);
      expect(resumed.play?.tuning).toEqual(started.play?.tuning);
      expect(resumed.play?.tuning).not.toEqual(changed);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
