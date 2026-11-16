import { describe, expect, it } from "vitest";
import type { PressEvent } from "../../engine/events.ts";
import { HINT_TEXT, HINTS_COPY, RULES_GROUP, RULES_PAGES } from "../../engine/hints/copy.ts";
import { applyHints, hintsOn } from "../../engine/hints/flow.ts";
import {
  HINT_FOR_LOOP,
  HINT_IDS,
  HINT_TEXT_MISSING,
  HINTS_AFTER_SETUP,
  hintForLoopEntered,
  hintsForLoops,
  RULES_PAGE_MISSING,
} from "../../engine/hints/registry.ts";
import { enterWithoutEvents } from "../../engine/loops/session/enterKit.ts";
import type { ShellEvent } from "../../engine/loops/session/events.ts";
import type { ShellStory } from "../../engine/loops/session/pack.ts";
import { TEST_STORY } from "../../engine/loops/session/pack.ts";
import { initialShellState, type ShellState } from "../../engine/loops/session/state.ts";
import { stepShell } from "../../engine/loops/session/stepShell.ts";
import { projectShellView } from "../../engine/loops/session/view.ts";
import { project } from "../../engine/views/project.ts";
import { OPENING_MOMENTS, openingPromptId } from "../../protocols/opening.ts";
import { AUTO_ADVANCE_MS } from "../../protocols/v2/views.ts";
import { deserializeShellState, serializeShellState } from "./serialize.ts";

const press = (promptId: string, actionId: string, deviceId = "ipad-0"): PressEvent => ({
  kind: "press",
  v: 1,
  deviceId,
  promptId,
  actionId,
});

const step = (state: ShellState, ...events: ShellEvent[]) => {
  let cursor = state;
  for (const event of events) cursor = stepShell(cursor, event).state;
  return cursor;
};

const setHints = (optionId: string): ShellEvent => ({
  kind: "set-setting",
  v: 1,
  deviceId: "ipad-0",
  settingId: "hints",
  optionId,
});

/** Start of a game up to Game settings. */
const reachSettings = (story: ShellStory = TEST_STORY): ShellState => {
  const start = stepShell(initialShellState({ sessionId: "s", seed: "seed", stories: [story] }), {
    kind: "start-session",
    v: 1,
    seed: "seed",
    sessionId: "sess-1",
  }).state;
  return step(
    start,
    ...enterWithoutEvents(),
    press(`continue-pick-story-${story.card.id}`, "continue"),
  );
};

const reachPlay = (hints: "on" | "off" = "on"): ShellState => {
  let state = reachSettings();
  if (hints === "off") state = step(state, setHints("off"));
  state = step(state, press("continue-game-settings", "continue"));
  for (const [index, hero] of TEST_STORY.heroes.slice(0, 4).entries()) {
    const deviceId = `ipad-${index}`;
    state = step(
      state,
      { kind: "device-join", v: 1, deviceId },
      { kind: "hero-hold", v: 1, deviceId, heroId: hero.id, action: "take" },
    );
  }
  state = step(state, press("continue-claim-heroes", "continue"));
  for (const setup of state.setupSteps) {
    state = step(state, press(`continue-setup-${setup.id}`, "continue"));
  }
  state = step(state, press("continue-begin", "continue"));
  for (const momentId of OPENING_MOMENTS) {
    state = step(state, press(openingPromptId(momentId), "continue"));
  }
  return state;
};

const openOffers = (state: ShellState) =>
  state.offered.filter((offer) => offer.open && !offer.promptId.startsWith("menu-"));

/** Plays by the first sensible press. `endHints` ends a showing hint as the host's timer would. */
const drive = (
  start: ShellState,
  stop: (state: ShellState) => boolean,
  options: { endHints: boolean } = { endHints: true },
) => {
  let state = start;
  const seen: string[] = [];
  let walked = false;
  let entered = false;
  for (let index = 0; index < 600 && !stop(state); index += 1) {
    if (state.hint) {
      seen.push(state.hint);
      if (!options.endHints) break;
      state = step(state, { kind: "hint-end", v: 1, hintId: state.hint });
      continue;
    }
    const open = openOffers(state);
    const find = (actionId: string) => open.find((offer) => offer.actionId === actionId);
    const pick =
      find("continue") ??
      find("record") ??
      find("done") ??
      find("leave") ??
      (entered ? undefined : find("enter")) ??
      (walked ? undefined : find("walk")) ??
      find("end-turn");
    if (!pick) throw new Error(`Nothing to press on day ${state.play?.dayNumber}.`);
    if (pick.actionId === "walk") walked = true;
    if (pick.actionId === "enter") entered = true;
    if (pick.actionId === "end-turn") {
      walked = false;
      entered = false;
    }
    state = step(state, press(pick.promptId, pick.actionId));
  }
  return { state, seen };
};

const FIVE = [
  "hint.first-battle",
  "hint.first-building",
  "hint.first-event",
  "hint.first-skull-drop",
  "hint.first-day-end",
];

describe("CU/09 the registry", () => {
  it("EV-02 each hint appears once per game, in the order the loops first appear", () => {
    const order = ["building", "event", "skull-drop", "battle", "day-end"];
    const effects = hintsForLoops({ on: true, shown: [] }, [...order, ...order]);
    expect(effects.map((effect) => effect.hintId)).toEqual([
      "hint.first-building",
      "hint.first-event",
      "hint.first-skull-drop",
      "hint.first-battle",
      "hint.first-day-end",
    ]);
    expect(hintForLoopEntered({ on: true, shown: ["hint.first-building"] }, "building")).toBeNull();
    expect(hintsForLoops({ on: true, shown: [] }, ["building", "other-loop"])).toHaveLength(1);
  });

  it("EV-03 a synthetic battle loop-entered event emits hint.first-battle once", () => {
    expect(
      hintsForLoops({ on: true, shown: [] }, ["battle", "battle"]).map((e) => e.hintId),
    ).toEqual(["hint.first-battle"]);
    expect([...HINT_IDS].sort()).toEqual([...FIVE].sort());
    expect(Object.keys(HINT_TEXT).sort()).toEqual([...FIVE].sort());
    expect(Object.keys(HINT_FOR_LOOP)).toHaveLength(5);
    expect(() => hintForLoopEntered({ on: true, shown: [] }, "no-such-loop")).not.toThrow();
    expect(hintForLoopEntered({ on: true, shown: [] }, "no-such-loop")).toBeNull();
  });

  it("EV-05 Hints off emits none", () => {
    expect(hintsForLoops({ on: false, shown: [] }, ["building", "battle", "day-end"])).toEqual([]);
  });
});

describe("CU/09 the Hints row on Game settings", () => {
  it("EV-01 is after the engine's rows, before the story's own, on by default, mirrored on the board", () => {
    const story: ShellStory = {
      ...TEST_STORY,
      settings: [
        { id: "mood", label: "Mood", options: [{ id: "a", label: "A" }], default: "a" },
        ...TEST_STORY.settings,
        { id: "mist", label: "Mist", options: [{ id: "a", label: "A" }], default: "a" },
        { id: "moon", label: "Moon", options: [{ id: "a", label: "A" }], default: "a" },
        { id: "fog", label: "Fog", options: [{ id: "a", label: "A" }], default: "a" },
      ],
    };
    const state = reachSettings(story);
    const view = projectShellView(state);
    expect(view.settings?.map((row) => row.id)).toEqual([
      "party-size",
      "hints",
      "mood",
      "mist",
      "moon",
      "fog",
    ]);
    const row = view.settings?.find((entry) => entry.id === "hints");
    expect(row).toMatchObject({
      label: HINTS_COPY.label,
      optionId: "on",
      options: [
        { id: "on", label: "On" },
        { id: "off", label: "Off" },
      ],
    });
    const shows = (s: ShellState) =>
      projectShellView(s).levels.find((level) => level.id === "setting-hints")?.shows;
    expect(shows(state)).toBe("On");
    expect(shows(step(state, setHints("off")))).toBe("Off");
    expect(hintsOn(step(state, setHints("off")))).toBe(false);
    expect(hintsOn(step(state, setHints("off"), setHints("on")))).toBe(true);
    const board = project(view, { kind: "board" });
    expect(board.levels.some((level) => level.id === "setting-hints")).toBe(true);
  });

  it("EV-14 is refused after setup: a logged error code, the value unchanged, no gear row", () => {
    const state = reachPlay("off");
    const late = stepShell(state, setHints("on"));
    expect(late.state.settingValues.hints).toBe("off");
    expect(late.effects).toContainEqual(
      expect.objectContaining({ kind: "press-error", code: HINTS_AFTER_SETUP }),
    );
    expect(projectShellView(late.state).settings).toBeUndefined();
    const gear = JSON.stringify(projectShellView(late.state).gear);
    expect(gear).not.toMatch(/hints/i);
  });
});

describe("CU/09 hints in a game", () => {
  it("EV-04 the hint is the loop's first beat and the iPads keep their screen until it ends", () => {
    const { state, seen } = drive(reachPlay(), (s) => s.hint !== null);
    expect(seen).toEqual([]);
    expect(state.hint).toBe("hint.first-building");
    const view = projectShellView(state);
    expect(view.hint).toMatchObject({
      id: "hint.first-building",
      text: HINT_TEXT["hint.first-building"],
      holdMs: AUTO_ADVANCE_MS,
      voiceId: null,
    });
    // Under a place's art the hint is a caption, never a Scroll (EV-15).
    expect(view.place).not.toBeNull();
    expect(view.hint?.caption).toBe(true);
    expect(view.actions).toEqual([]);
    const board = project(view, { kind: "board" });
    expect(board.hint?.text).toBe(HINT_TEXT["hint.first-building"]);
    const pad = project(view, { kind: "device", deviceId: "ipad-0" });
    expect(JSON.stringify(pad)).not.toContain("first-building");
    // A stale end changes nothing; the right one lets the step on.
    expect(step(state, { kind: "hint-end", v: 1, hintId: "hint.first-day-end" }).hint).toBe(
      "hint.first-building",
    );
    const ended = step(state, { kind: "hint-end", v: 1, hintId: "hint.first-building" });
    expect(ended.hint).toBeNull();
    expect(projectShellView(ended).hint).toBeNull();
    expect(projectShellView(ended).actions.length).toBeGreaterThan(0);
  });

  it("EV-02 over a game: building, skull drop and day's end once each, in the order they first appear", () => {
    const played = drive(reachPlay(), (s) => (s.play?.dayNumber ?? 0) >= 14);
    expect(played.seen).toEqual([
      "hint.first-building",
      "hint.first-skull-drop",
      "hint.first-day-end",
    ]);
    expect(played.state.hintsShown).toEqual(played.seen);
  });

  it("EV-05 with Hints off nothing shows and nothing waits", () => {
    const off = reachPlay("off");
    expect(hintsOn(off)).toBe(false);
    const played = drive(off, (s) => (s.play?.dayNumber ?? 0) >= 4, { endHints: false });
    expect(played.seen).toEqual([]);
    expect(played.state.hintsShown).toEqual([]);
    expect(played.state.hint).toBeNull();
  });

  it("EV-09 a hint step sends no tower command; a missing text is an error and the loop goes on", () => {
    const { state } = drive(reachPlay(), (s) => s.hint !== null);
    const ended = stepShell(state, { kind: "hint-end", v: 1, hintId: "hint.first-building" });
    expect(ended.effects.map((effect) => effect.kind)).not.toContain("tower-command");
    const result = applyHints(
      reachPlay(),
      [{ kind: "loop-trace", v: 1, loopId: "encounter", phase: "enter" }],
      { "hint.first-building": "" },
    );
    expect(result.extra).toContainEqual(
      expect.objectContaining({ kind: "press-error", code: HINT_TEXT_MISSING }),
    );
    expect(result.state.hint).toBeNull();
    expect(result.state.hintsShown).toEqual(["hint.first-building"]);
  });
});

describe("CU/09 survival", () => {
  it("EV-11 a checkpoint keeps Hints and the shown set; a showing hint is not kept", () => {
    const { state } = drive(reachPlay(), (s) => s.hint !== null);
    const restored = deserializeShellState(
      JSON.parse(JSON.stringify(serializeShellState(state))) as ReturnType<
        typeof serializeShellState
      >,
    );
    expect(restored.hintsShown).toEqual(["hint.first-building"]);
    expect(restored.hint).toBeNull();
    expect(hintsOn(restored)).toBe(true);
    const off = deserializeShellState(
      JSON.parse(JSON.stringify(serializeShellState(reachPlay("off")))) as ReturnType<
        typeof serializeShellState
      >,
    );
    expect(hintsOn(off)).toBe(false);
    // The visit hint never repeats after the restore.
    const again = drive(restored, (s) => (s.play?.dayNumber ?? 0) >= 3);
    expect(again.seen).not.toContain("hint.first-building");
  });

  it("EV-12 a checkpoint with no hint record loads with Hints on and nothing shown", () => {
    const row = JSON.parse(JSON.stringify(serializeShellState(reachPlay()))) as Record<
      string,
      unknown
    >;
    delete row.hintsShown;
    delete row.hint;
    delete row.hintQueue;
    const settings = { ...(row.settingValues as Record<string, string>) };
    delete settings.hints;
    row.settingValues = settings;
    const restored = deserializeShellState(row as ReturnType<typeof serializeShellState>);
    expect(restored.hintsShown).toEqual([]);
    expect(restored.hint).toBeNull();
    expect(hintsOn(restored)).toBe(true);
  });

  it("EV-13 Play again keeps the Hints choice and shows each hint once more", () => {
    const first = drive(reachPlay("off"), (s) => (s.play?.dayNumber ?? 0) >= 2).state;
    const ended = step(first, press("menu-quit", "quit-story"));
    const again = step(
      { ...ended, autosave: null },
      press("session-game-1", "open-game"),
      press("stats-play-again", "play-again"),
    );
    expect(again.settingValues.hints).toBe("off");
    // With Hints on, a game's hints reset for the replay.
    const onGame = drive(reachPlay(), (s) => s.hint !== null).state;
    expect(onGame.hintsShown).toHaveLength(1);
    const quitOn = step({ ...onGame, hint: null }, press("menu-quit", "quit-story"));
    const replay = step(
      { ...quitOn, autosave: null },
      press("session-game-1", "open-game"),
      press("stats-play-again", "play-again"),
    );
    expect(replay.settingValues.hints).toBe("on");
    expect(replay.hintsShown).toEqual([]);
    expect(replay.hint).toBeNull();
  });
});

describe("CU/09 the Rules group in Look up", () => {
  const open = (state: ShellState) =>
    step(state, { kind: "gear", v: 1, deviceId: "ipad-0", action: "open", item: "look-up" });

  it("EV-06 lists the Rules group with five pages and shows one page on the board, display only", () => {
    let state = open(reachPlay("off"));
    let gear = projectShellView(state).gear;
    expect(gear?.cards.map((card) => card.title)).toEqual([
      "Battle",
      "Building visit",
      "Event",
      "Skull drop",
      "Day's end",
    ]);
    expect(gear?.cards.every((card) => card.group === RULES_GROUP)).toBe(true);
    expect(JSON.stringify(gear)).not.toMatch(/Rules of the tower|sample card/i);
    for (const page of RULES_PAGES) {
      state = step(state, {
        kind: "gear",
        v: 1,
        deviceId: "ipad-0",
        action: "pick",
        pick: page.id,
      });
      gear = projectShellView(state).gear;
      expect(gear?.cardTitle).toBe(page.title);
      expect(gear?.cardPage).toBe(page.page);
    }
  });

  it("EV-09 a pick with no page is an error and the Look up list stays", () => {
    const state = open(reachPlay("off"));
    const result = stepShell(state, {
      kind: "gear",
      v: 1,
      deviceId: "ipad-0",
      action: "pick",
      pick: "rules-nothing",
    });
    expect(result.effects).toContainEqual(
      expect.objectContaining({ kind: "press-error", code: RULES_PAGE_MISSING }),
    );
    expect(result.state.gearCard).toBeNull();
    expect(projectShellView(result.state).gear?.cardPage).toBeNull();
  });
});
