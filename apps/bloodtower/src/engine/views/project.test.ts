import { describe, expect, it } from "vitest";
import { initialEngineState, step } from "../step.ts";
import {
  type Audience,
  actionFromPrompt,
  levelsFromEngine,
  project,
  SETUP_SCREENS,
  type ShownHero,
  type ViewState,
} from "./project.ts";

const heroes = (): ShownHero[] => [
  {
    id: "hero-a",
    name: "Hero A",
    deviceId: "pad-a",
    privateLines: [{ id: "setup.01.private.hero-a", heroId: "hero-a", text: "LINE_HERO_A" }],
  },
  {
    id: "hero-b",
    name: "Hero B",
    deviceId: "pad-a",
    privateLines: [{ id: "setup.01.private.hero-b", heroId: "hero-b", text: "LINE_HERO_B" }],
  },
  {
    id: "hero-c",
    name: "Hero C",
    deviceId: "pad-b",
    privateLines: [{ id: "setup.01.private.hero-c", heroId: "hero-c", text: "LINE_HERO_C" }],
  },
  {
    id: "hero-d",
    name: "Hero D",
    deviceId: null,
    privateLines: [{ id: "setup.01.private.hero-d", heroId: "hero-d", text: "LINE_HERO_D" }],
  },
];

const stateFor = (screen: ViewState["screen"]): ViewState => ({
  screen,
  levels: [{ loopId: "session", phase: "body", shows: "A shared line may say private." }],
  heroes: heroes(),
  narration: { id: "landing.01", text: "A shared line may say private." },
  actions: [
    {
      promptId: `continue-${screen}`,
      actionId: "continue",
      label: "Continue",
      open: true,
      deviceIds: [],
    },
    {
      promptId: `back-${screen}`,
      actionId: "back",
      label: "Back",
      open: false,
      reason: "Closed on this step.",
      deviceIds: [],
    },
    {
      promptId: "only-pad-a",
      actionId: "claim",
      label: "Claim",
      open: true,
      deviceIds: ["pad-a"],
    },
  ],
});

const privateTexts = (view: { heroes: { privateLines: { text: string }[] }[] }) =>
  view.heroes.flatMap((hero) => hero.privateLines.map((line) => line.text));

describe("project", () => {
  it("returns a board view and a device view for every setup screen", () => {
    expect([...SETUP_SCREENS]).toEqual([
      "splash",
      "landing",
      "sound",
      "tower-connect",
      "volume-test",
      "pick-game",
      "pick-story",
      "game-settings",
      "claim-heroes",
      "seals-and-skulls",
    ]);
    for (const screen of SETUP_SCREENS) {
      const state = stateFor(screen);
      const board = project(state, { kind: "board" });
      const padA = project(state, { kind: "device", deviceId: "pad-a" });
      const padB = project(state, { kind: "device", deviceId: "pad-b" });

      const boardJson = JSON.stringify(board);
      expect(boardJson).not.toContain(".private.");
      expect(boardJson).not.toContain("ipad:");
      expect(boardJson).not.toContain("LINE_HERO_");
      expect(boardJson).not.toContain("privateLines");
      expect(board.narration?.text).toContain("private");
      expect(board.heroes.map((hero) => [hero.id, hero.held])).toEqual([
        ["hero-a", true],
        ["hero-b", true],
        ["hero-c", true],
        ["hero-d", false],
      ]);

      expect(privateTexts(padA)).toEqual(["LINE_HERO_A", "LINE_HERO_B"]);
      expect(privateTexts(padB)).toEqual(["LINE_HERO_C"]);
      expect(JSON.stringify(padA)).not.toContain("LINE_HERO_C");
      expect(JSON.stringify(padA)).not.toContain("LINE_HERO_D");
      expect(JSON.stringify(padB)).not.toContain("LINE_HERO_A");
      expect(JSON.stringify(padB)).not.toContain("LINE_HERO_B");
      expect(JSON.stringify(padB)).not.toContain("LINE_HERO_D");
      expect(padA.roster.map((hero) => hero.id)).toEqual(["hero-a", "hero-b", "hero-c", "hero-d"]);
      expect(padA.heroes.map((hero) => hero.id)).toEqual(["hero-a", "hero-b"]);

      expect(padA.actions.map((action) => action.promptId)).toEqual([
        `continue-${screen}`,
        `back-${screen}`,
        "only-pad-a",
      ]);
      expect(padB.actions.map((action) => action.promptId)).toEqual([
        `continue-${screen}`,
        `back-${screen}`,
      ]);
      for (const action of [...padA.actions, ...padB.actions]) {
        expect(action.promptId.length).toBeGreaterThan(0);
        expect(action.actionId.length).toBeGreaterThan(0);
        expect(action.label.length).toBeGreaterThan(0);
        if (action.open) {
          expect(action).not.toHaveProperty("reason");
        } else {
          expect(action.reason.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("drops a private line filed on the wrong hero, and drops unsafe public text", () => {
    const state = stateFor("splash");
    const heroA = state.heroes[0];
    if (!heroA) throw new Error("expected Hero A");
    state.heroes = [
      {
        ...heroA,
        privateLines: [
          ...heroA.privateLines,
          { id: "setup.01.private.hero-c", heroId: "hero-c", text: "LINE_MISFILED" },
        ],
      },
      ...state.heroes.slice(1),
    ];
    state.narration = { id: "setup.01.private.hero-a", text: "LINE_HERO_A" };
    state.levels = [{ loopId: "session", phase: "body", shows: "ipad:hero-a" }];
    const board = project(state, { kind: "board" });
    const padA = project(state, { kind: "device", deviceId: "pad-a" });
    expect(board.narration).toBeNull();
    expect(board.levels).toEqual([]);
    expect(JSON.stringify(board)).not.toContain("ipad:");
    expect(JSON.stringify(board)).not.toContain(".private.");
    expect(privateTexts(padA)).toEqual(["LINE_HERO_A", "LINE_HERO_B"]);
    expect(JSON.stringify(padA)).not.toContain("LINE_MISFILED");
  });

  it("projects the running loop levels and the open prompt onto each audience", () => {
    const engine = step(initialEngineState(), {
      kind: "start-test-loop",
      v: 1,
      seed: "view",
    }).state;
    const state: ViewState = {
      screen: "splash",
      levels: levelsFromEngine(engine),
      heroes: [],
      narration: null,
      actions: actionFromPrompt(engine.loops.prompt, "Continue", "That prompt is closed."),
    };
    const board = project(state, { kind: "board" } satisfies Audience);
    const device = project(state, { kind: "device", deviceId: "pad-a" });
    expect(board.levels.map((level) => level.loopId)).toEqual(["test-outer", "test-inner"]);
    expect(board.levels.map((level) => level.shows)).toEqual(["test-outer", "test-inner"]);
    expect(device.levels).toEqual(board.levels);
    expect(device.actions).toEqual([
      { promptId: "inner-advance", actionId: "continue", label: "Continue", open: true },
    ]);
    expect(board).not.toHaveProperty("actions");
  });

  it("turns a closed prompt slot into an action with a reason", () => {
    expect(actionFromPrompt(null, "Continue", "Closed.")).toEqual([]);
    expect(
      actionFromPrompt(
        { promptId: "inner-advance", actionId: "continue", open: false },
        "Continue",
        "Already pressed.",
      ),
    ).toEqual([
      {
        promptId: "inner-advance",
        actionId: "continue",
        label: "Continue",
        open: false,
        reason: "Already pressed.",
        deviceIds: [],
      },
    ]);
    expect(() =>
      actionFromPrompt({ promptId: "p", actionId: "continue", open: true }, "", "Closed."),
    ).toThrow(/label/);
    expect(() =>
      actionFromPrompt({ promptId: "p", actionId: "continue", open: false }, "Continue", ""),
    ).toThrow(/reason/);
  });
});
