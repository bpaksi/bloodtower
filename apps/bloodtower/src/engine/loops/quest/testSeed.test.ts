import { describe, expect, it } from "vitest";
import { initPlayState } from "../chapter/playState.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { HERALD } from "./fixtures.ts";
import { openQuestAt } from "./quest.ts";
import { ensureQuests } from "./store.ts";
import { applyQuestTestSeed } from "./testSeed.ts";

const fresh = () => initPlayState("quest-seed", PROVING_GROUNDS_PLAY);

describe("the test-only quest marker (TEST ONLY)", () => {
  it("EV-09: opens a quest only with the marker, and a wrong name throws", () => {
    // (a) the marker opens `herald` at the space, with the fixture's scene
    const a = fresh();
    applyQuestTestSeed(a, "x~test-quest:N-egans-end=herald~test-at:N-egans-end");
    expect(openQuestAt(a, "N-egans-end")).toBe("herald");
    expect(ensureQuests(a).defs.find((def) => def.id === "herald")?.scene).toEqual(HERALD);

    // (b) a seed with no marker changes nothing
    const b = fresh();
    const before = JSON.stringify(ensureQuests(b));
    applyQuestTestSeed(b, "x~test-at:N-egans-end~test-gold:hero-a=3");
    expect(JSON.stringify(ensureQuests(b))).toBe(before);

    // (c) an unknown quest throws, naming it
    expect(() => applyQuestTestSeed(fresh(), "x~test-quest:N-egans-end=nope")).toThrow(/nope/);
  });
});
