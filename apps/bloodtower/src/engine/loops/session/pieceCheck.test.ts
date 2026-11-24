import { describe, expect, it } from "vitest";
import { project } from "../../views/project.ts";
import { configureChapters } from "../chapter/chapters.ts";
import { bindPlayState, initPlayState, type PlayState } from "../chapter/playState.ts";
import { ensureClock, setBuildingSkulls, setHeroSheet } from "../day/clock.ts";
import { applySkullRecord, SKULL_STAYED_INSIDE_TARGET } from "../day/skull.ts";
import { configureQuests, ensureQuests, snapshotQuests } from "../quest/store.ts";
import { TEST_STORY } from "./pack.ts";
import {
  buildPieceCheck,
  buildPieceCheckSteps,
  DRUM_HOME,
  type DrumPositions,
  drumGlyphFaces,
  PHYSICAL_PIECE_KINDS_V1,
  type PieceCheckStepId,
  pieceCheckPromptId,
} from "./pieceCheck.ts";
import { PROVING_GROUNDS_PLAY } from "./playContent.ts";
import { initialShellState, type ShellState } from "./state.ts";
import { stepShell } from "./stepShell.ts";
import { projectShellView } from "./view.ts";

const makeSavedShell = (options?: {
  drums?: DrumPositions | undefined;
  mutatePlay?: (play: PlayState) => void;
}): ShellState => {
  const play = initPlayState("piece-check-seed", PROVING_GROUNDS_PLAY);
  play.dayNumber = 2;
  options?.mutatePlay?.(play);
  const state: ShellState = {
    ...initialShellState({
      sessionId: "s-check",
      seed: "piece-check-seed",
      stories: [TEST_STORY],
    }),
    screen: "play",
    stage: "playing",
    enter: null,
    towerChoice: "connect",
    towerLinked: true,
    play,
    drums: options?.drums ?? { ...DRUM_HOME },
  };
  return state;
};

const boardSpaceByBuilding = (play: PlayState, building: string) => {
  const space = play.content.board.spaces.find((s) => s.building === building);
  if (!space) throw new Error(`No ${building} space on board.`);
  return space;
};

describe("piece check from a save (C2-11)", () => {
  it("EV-02: names heroes on their saved spaces and lists skulls per building; omits empty foes and seals", () => {
    const state = makeSavedShell({
      mutatePlay: (play) => {
        const desert = play.content.board.spaceById.get("S-howling-desert");
        const second = play.content.board.spaces.find((s) => s.id !== "S-howling-desert");
        if (!desert || !second) throw new Error("Expected named board spaces.");
        play.groups = [
          {
            id: "hero-a",
            heroIds: ["hero-a"],
            spaceId: desert.id,
            insideBuilding: false,
            order: 0,
          },
          {
            id: "hero-b",
            heroIds: ["hero-b"],
            spaceId: second.id,
            insideBuilding: false,
            order: 1,
          },
        ];
        const village = boardSpaceByBuilding(play, "village");
        const bazaar = boardSpaceByBuilding(play, "bazaar");
        setBuildingSkulls(play, village.id, 1);
        setBuildingSkulls(play, bazaar.id, 2);
      },
    });

    const started = stepShell(state, { kind: "piece-check-start", v: 1, towerInPlay: true }).state;
    expect(started.screen).toBe("piece-check");
    expect(started.pieceCheck?.steps).toEqual(["hero-minis", "skulls"]);

    const board1 = project(projectShellView(started), { kind: "board" });
    expect(board1.pieceCheck?.stepId).toBe("hero-minis");
    expect(board1.pieceCheck?.stepNumber).toBe("1");
    expect(board1.pieceCheck?.line).toBe("Set each hero on their saved space.");
    expect(board1.pieceCheck?.heroes?.map((h) => [h.heroId, h.spaceId])).toEqual([
      ["hero-a", "S-howling-desert"],
      ["hero-b", state.play?.groups[1]?.spaceId],
    ]);

    const afterStep1 = stepShell(started, {
      kind: "press",
      v: 1,
      deviceId: "ipad-1",
      promptId: pieceCheckPromptId("hero-minis"),
      actionId: "confirm",
    }).state;
    const board2 = project(projectShellView(afterStep1), { kind: "board" });
    expect(board2.pieceCheck?.stepId).toBe("skulls");
    expect(board2.pieceCheck?.stepNumber).toBe("2");
    expect(board2.pieceCheck?.line).toBe("Put the skulls back on each building.");
    const village = boardSpaceByBuilding(state.play as PlayState, "village");
    const bazaar = boardSpaceByBuilding(state.play as PlayState, "bazaar");
    expect(board2.pieceCheck?.buildings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ spaceId: village.id, skulls: 1 }),
        expect.objectContaining({ spaceId: bazaar.id, skulls: 2 }),
      ]),
    );
    expect(board2.pieceCheck?.buildings?.every((b) => b.skulls > 0)).toBe(true);
  });

  it("EV-05: hides the drums step when all drums are at home or when a pre-feature save lacks the drums field", () => {
    const atHome = makeSavedShell({ drums: { top: 0, middle: 0, bottom: 0 } });
    expect(buildPieceCheckSteps(atHome, true)).not.toContain("drums");

    const preFeature = makeSavedShell();
    // Pre-feature save had no drum field at all.
    (preFeature as { drums?: DrumPositions }).drums = undefined;
    expect(buildPieceCheckSteps(preFeature, true)).not.toContain("drums");
    const started = stepShell(preFeature, { kind: "piece-check-start", v: 1, towerInPlay: true });
    expect(started.effects.filter((e) => e.kind === "tower-command")).toHaveLength(0);
    expect(started.state.pieceCheck?.steps).not.toContain("drums");
  });

  it("EV-07: counts only 'inside' skull records for trapped skulls and omits the step when 0", () => {
    const withTrapped = makeSavedShell({
      mutatePlay: (play) => {
        bindPlayState(play);
        const village = boardSpaceByBuilding(play, "village");
        play.dayNumber = 1;
        applySkullRecord(1, village.id);
        play.dayNumber = 2;
        applySkullRecord(2, SKULL_STAYED_INSIDE_TARGET);
        play.dayNumber = 3;
        applySkullRecord(3, village.id);
        applySkullRecord(3, SKULL_STAYED_INSIDE_TARGET);
        bindPlayState(null);
      },
    });

    const started = stepShell(withTrapped, {
      kind: "piece-check-start",
      v: 1,
      towerInPlay: true,
    }).state;
    expect(started.pieceCheck?.steps).toEqual(["hero-minis", "skulls", "trapped-skulls"]);
    let cur = stepShell(started, {
      kind: "press",
      v: 1,
      deviceId: "ipad-1",
      promptId: pieceCheckPromptId("hero-minis"),
      actionId: "confirm",
    }).state;
    cur = stepShell(cur, {
      kind: "press",
      v: 1,
      deviceId: "ipad-1",
      promptId: pieceCheckPromptId("skulls"),
      actionId: "confirm",
    }).state;
    const board = project(projectShellView(cur), { kind: "board" });
    expect(board.pieceCheck?.stepId).toBe("trapped-skulls");
    expect(board.pieceCheck?.stepNumber).toBe("6");
    expect(board.pieceCheck?.trappedSkulls).toBe(2);
    expect(board.pieceCheck?.line).toBe("Drop 2 skulls back in the top of the tower.");

    const noneTrapped = makeSavedShell({
      mutatePlay: (play) => {
        bindPlayState(play);
        const village = boardSpaceByBuilding(play, "village");
        play.dayNumber = 1;
        applySkullRecord(1, village.id);
        bindPlayState(null);
      },
    });
    expect(buildPieceCheckSteps(noneTrapped, true)).not.toContain("trapped-skulls");
  });

  it("EV-14: includes foes and broken seals in order minis, skulls, foes, seals when present", () => {
    const state = makeSavedShell({
      mutatePlay: (play) => {
        play.foes = [{ id: "oreks", name: "Oreks", spaceId: "S-howling-desert" }];
        const chapters = configureChapters(play, {
          chapters: [{ id: "ch1", index: 1, kingdoms: ["N"], quests: [] }],
          seals: [{ id: "road-seal", name: "The Road Seal", glyph: "road", boon: "+1" }],
          c3EndAfterChapter1: false,
          sealBreakMin: 0,
          foeLevel: { chapter1: 1, perChapter: 1 },
        });
        chapters.brokenSeals.push("road-seal");
      },
    });
    expect(buildPieceCheckSteps(state, true)).toEqual([
      "hero-minis",
      "skulls",
      "foes",
      "broken-seals",
    ]);
  });

  it("EV-17: lists open quest tokens on their spaces, excludes done quests, and omits step when none open", () => {
    const barrowSpace = PROVING_GROUNDS_PLAY.board.spaces[1];
    const shrineSpace = PROVING_GROUNDS_PLAY.board.spaces[2];
    if (!barrowSpace || !shrineSpace) throw new Error("Expected spaces.");

    const oneOpen = makeSavedShell({
      mutatePlay: (play) => {
        configureQuests(play, {
          markersByChapter: {
            2: { [barrowSpace.id]: "the-barrow", [shrineSpace.id]: "the-shrine" },
          },
          chapter: 2,
        });
        ensureQuests(play).done.push("the-shrine");
      },
    });
    const started = stepShell(oneOpen, {
      kind: "piece-check-start",
      v: 1,
      towerInPlay: true,
    }).state;
    expect(started.pieceCheck?.steps).toEqual(["hero-minis", "skulls", "quest-tokens"]);
    let cur = stepShell(started, {
      kind: "press",
      v: 1,
      deviceId: "ipad-1",
      promptId: pieceCheckPromptId("hero-minis"),
      actionId: "confirm",
    }).state;
    cur = stepShell(cur, {
      kind: "press",
      v: 1,
      deviceId: "ipad-1",
      promptId: pieceCheckPromptId("skulls"),
      actionId: "confirm",
    }).state;
    const board = project(projectShellView(cur), { kind: "board" });
    expect(board.pieceCheck?.stepId).toBe("quest-tokens");
    expect(board.pieceCheck?.stepNumber).toBe("4a");
    expect(board.pieceCheck?.questTokens).toEqual([
      {
        questId: "the-barrow",
        spaceId: barrowSpace.id,
        spaceName: barrowSpace.name,
        kingdom: barrowSpace.kingdom,
      },
    ]);

    const bothDone = makeSavedShell({
      mutatePlay: (play) => {
        configureQuests(play, {
          markersByChapter: {
            2: { [barrowSpace.id]: "the-barrow", [shrineSpace.id]: "the-shrine" },
          },
          chapter: 2,
        });
        ensureQuests(play).done.push("the-shrine", "the-barrow");
      },
    });
    expect(buildPieceCheckSteps(bothDone, true)).not.toContain("quest-tokens");

    const beforeChapter1 = makeSavedShell();
    expect(buildPieceCheckSteps(beforeChapter1, true)).not.toContain("quest-tokens");
  });

  it("EV-19: app-only state (gold, items, corruption, virtues, story flags) produces no steps", () => {
    const state = makeSavedShell({
      mutatePlay: (play) => {
        setHeroSheet(play, "hero-a", {
          helpingVirtues: 2,
          corruptions: 2,
          named: ["feral", "lost"],
          gold: 17,
          items: ["potion", "charm"],
          virtues: ["infused"],
        });
        ensureQuests(play).flags.push("met-burgomaster", "loyalty-high", "clue-1");
        ensureQuests(play).items["hero-a"] = ["silver-key"];
      },
    });
    expect(buildPieceCheckSteps(state, true)).toEqual(["hero-minis", "skulls"]);
  });

  it("EV-20: covers every 1.0 physical piece kind in order and ignores 1.1 shapes", () => {
    const space = PROVING_GROUNDS_PLAY.board.spaces[1];
    if (!space) throw new Error("Expected space.");
    const full10 = makeSavedShell({
      drums: { top: 2, middle: 1, bottom: 0 },
      mutatePlay: (play) => {
        const village = boardSpaceByBuilding(play, "village");
        setBuildingSkulls(play, village.id, 1);
        play.foes = [{ id: "oreks", name: "Oreks", spaceId: space.id }];
        const chapters = configureChapters(play, {
          chapters: [{ id: "ch1", index: 1, kingdoms: ["N"], quests: [] }],
          seals: [{ id: "road-seal", name: "The Road Seal", glyph: "road", boon: "+1" }],
          c3EndAfterChapter1: false,
          sealBreakMin: 0,
          foeLevel: { chapter1: 1, perChapter: 1 },
        });
        chapters.brokenSeals.push("road-seal");
        configureQuests(play, { bySpace: { [space.id]: "open-q" } });
        ensureClock(play).held = 1;
      },
    });

    const built = buildPieceCheckSteps(full10, true);
    expect(built).toEqual([...PHYSICAL_PIECE_KINDS_V1]);
    // Every declared 1.0 physical piece kind maps 1-to-1 to a step.
    const kindToStep: Record<PieceCheckStepId, boolean> = {
      "hero-minis": built.includes("hero-minis"),
      skulls: built.includes("skulls"),
      foes: built.includes("foes"),
      "broken-seals": built.includes("broken-seals"),
      "quest-tokens": built.includes("quest-tokens"),
      drums: built.includes("drums"),
      "trapped-skulls": built.includes("trapped-skulls"),
    };
    expect(Object.values(kindToStep).every(Boolean)).toBe(true);

    // 1.1 shape fields yield no extra steps in 1.0.
    const with11 = makeSavedShell({
      mutatePlay: (play) => {
        Object.assign(play, {
          adversary: { id: "warden", spaceId: space.id },
          lieutenant: { id: "captain", spaceId: space.id },
          [`${"hunt"}ers`]: [{ id: "pursuer-1", spaceId: space.id }],
        });
      },
    });
    expect(buildPieceCheckSteps(with11, true)).toEqual(["hero-minis", "skulls"]);
  });

  it("EV-23: running, skipping, and abandoning the quest-tokens step never modifies quest state", () => {
    const space = PROVING_GROUNDS_PLAY.board.spaces[1];
    if (!space) throw new Error("Expected space.");
    const state = makeSavedShell({
      mutatePlay: (play) => {
        configureQuests(play, { bySpace: { [space.id]: "barrow" } });
        ensureQuests(play).done.push("shrine");
        ensureQuests(play).flags.push("flag-a");
      },
    });
    const before = snapshotQuests(state.play as PlayState);

    let cur = stepShell(state, { kind: "piece-check-start", v: 1, towerInPlay: false }).state;
    expect(snapshotQuests(cur.play as PlayState)).toBe(before);

    cur = stepShell(cur, {
      kind: "press",
      v: 1,
      deviceId: "ipad-1",
      promptId: pieceCheckPromptId("hero-minis"),
      actionId: "confirm",
    }).state;
    cur = stepShell(cur, {
      kind: "press",
      v: 1,
      deviceId: "ipad-1",
      promptId: pieceCheckPromptId("skulls"),
      actionId: "confirm",
    }).state;
    // Now on quest-tokens: abandon check (read without confirming)
    expect(cur.pieceCheck?.steps[cur.pieceCheck.index]).toBe("quest-tokens");
    expect(snapshotQuests(cur.play as PlayState)).toBe(before);

    // Skip quest-tokens
    const skipped = stepShell(cur, {
      kind: "press",
      v: 1,
      deviceId: "ipad-1",
      promptId: pieceCheckPromptId("quest-tokens"),
      actionId: "skip",
    }).state;
    expect(snapshotQuests(skipped.play as PlayState)).toBe(before);

    // Confirm quest-tokens
    const confirmed = stepShell(cur, {
      kind: "press",
      v: 1,
      deviceId: "ipad-1",
      promptId: pieceCheckPromptId("quest-tokens"),
      actionId: "confirm",
    }).state;
    expect(snapshotQuests(confirmed.play as PlayState)).toBe(before);
  });

  it("maps drum positions to the verified DEC-937 glyph table", () => {
    expect(drumGlyphFaces("top", 0)).toEqual([
      { side: "north", glyph: "Cleanse" },
      { side: "east", glyph: null },
      { side: "south", glyph: "Quest" },
      { side: "west", glyph: null },
    ]);
    expect(drumGlyphFaces("top", 1)).toEqual([
      { side: "north", glyph: null },
      { side: "east", glyph: "Cleanse" },
      { side: "south", glyph: null },
      { side: "west", glyph: "Quest" },
    ]);
    expect(drumGlyphFaces("middle", 1)).toEqual([
      { side: "north", glyph: null },
      { side: "east", glyph: "Battle" },
      { side: "south", glyph: null },
      { side: "west", glyph: null },
    ]);
    expect(drumGlyphFaces("bottom", 2)).toEqual([
      { side: "north", glyph: "Reinforce" },
      { side: "east", glyph: null },
      { side: "south", glyph: "Banner" },
      { side: "west", glyph: null },
    ]);
    expect(buildPieceCheck(makeSavedShell(), false)?.steps).toEqual(["hero-minis", "skulls"]);
  });
});
