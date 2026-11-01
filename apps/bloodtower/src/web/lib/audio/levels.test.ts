import { describe, expect, it } from "vitest";
import { levelToGain as dialogLevelToGain } from "../../components/board/SoundDialog.tsx";
import {
  clampLevel,
  DEFAULT_LEVELS,
  LEVELS_KEY,
  levelToGain,
  readLevels,
  writeLevels,
} from "./levels.ts";

const memory = (initial: Record<string, string> = {}) => {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    raw: () => store.get(LEVELS_KEY),
  };
};

describe("sound levels", () => {
  it("uses the Sound dialog's levelToGain for the gain the board plays", () => {
    expect(dialogLevelToGain).toBe(levelToGain);
    expect(levelToGain(0.2)).toBeCloseTo(0.2);
    expect(levelToGain(0.5)).toBeCloseTo(0.5);
    expect(levelToGain(0)).toBe(0);
  });

  it("starts at the defaults when nothing is saved", () => {
    expect(readLevels(memory())).toEqual(DEFAULT_LEVELS);
  });

  it("keeps saved levels across a reload", () => {
    const store = memory();
    writeLevels(store, { music: 0.25, ambient: 0.5, voice: 1 });
    expect(readLevels(store)).toEqual({ music: 0.25, ambient: 0.5, voice: 1 });
  });

  it("clamps values outside 0..1 and fills in missing channels from the defaults", () => {
    const store = memory({ [LEVELS_KEY]: JSON.stringify({ music: 3, ambient: -1 }) });
    expect(readLevels(store)).toEqual({
      music: 1,
      ambient: 0,
      voice: DEFAULT_LEVELS.voice,
    });
  });

  it("falls back to the defaults for broken JSON or a non-number", () => {
    expect(readLevels(memory({ [LEVELS_KEY]: "{not json" }))).toEqual(DEFAULT_LEVELS);
    expect(readLevels(memory({ [LEVELS_KEY]: JSON.stringify({ music: "loud" }) }))).toEqual(
      DEFAULT_LEVELS,
    );
  });

  it("treats a blocked store as nothing saved, and a refused write as no error", () => {
    const blocked = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(readLevels(blocked)).toEqual(DEFAULT_LEVELS);
    expect(() => writeLevels(blocked, DEFAULT_LEVELS)).not.toThrow();
    expect(readLevels(undefined)).toEqual(DEFAULT_LEVELS);
  });

  it("clampLevel keeps finite numbers and refuses the rest", () => {
    expect(clampLevel(0.4, 0.9)).toBe(0.4);
    expect(clampLevel(Number.NaN, 0.9)).toBe(0.9);
    expect(clampLevel(undefined, 0.9)).toBe(0.9);
  });
});
