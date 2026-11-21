import { describe, expect, it } from "vitest";
import { OPENING_MOMENTS, openingPromptId } from "../../../protocols/opening.ts";
import type { PressEvent } from "../../events.ts";
import { initPlayState, type PlayState } from "../chapter/playState.ts";
import { configureDayClock, ensureClock, heroSheet, setHeroSheet } from "../day/clock.ts";
import { commitLive, loadLive, setHeroHp } from "../encounter/picks.ts";
import { beginQuest, chooseOption as chooseQuestOption } from "../quest/quest.ts";
import { configureQuests } from "../quest/store.ts";
import { enterWithoutEvents } from "../session/enterKit.ts";
import type { ShellEvent } from "../session/events.ts";
import { TEST_STORY } from "../session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { initialShellState, type ShellState } from "../session/state.ts";
import { stepShell } from "../session/stepShell.ts";
import { projectShellView } from "../session/view.ts";
import {
  chooseOption,
  commitLedger,
  eventOptions,
  eventState,
  eventTuningFrom,
  loadLedger,
  purseOf,
  settleEvent,
} from "./index.ts";
import type { OpenEvent } from "./state.ts";

/** D5 / 01-pool-pays: EV-08, EV-09, EV-10 (the event's pay-off, its windfall, and the quest toll). */

const tuning = eventTuningFrom();

const regroup = (play: PlayState, groups: string[][]): void => {
  play.groups.forEach((group, i) => {
    group.heroIds = groups[i] ?? [];
  });
};

const setup = (groups: string[][], gold: Record<string, number>) => {
  const play = initPlayState("d5-event", PROVING_GROUNDS_PLAY);
  play.dayNumber = 1;
  configureDayClock(play, {});
  regroup(play, groups);
  for (const [id, amount] of Object.entries(gold)) {
    setHeroSheet(play, id, { helpingVirtues: 0, corruptions: 0, gold: amount });
  }
  const group = play.groups[0];
  if (!group) throw new Error("no group");
  return { play, group };
};

const open = (play: PlayState, groupId: string, over: Partial<OpenEvent>): void => {
  eventState(play).open = {
    groupId,
    day: 1,
    type: "quiet",
    hazard: null,
    offer: null,
    status: "open",
    log: [],
    ...over,
  };
};

const goldOf = (play: PlayState, id: string): number | undefined =>
  heroSheet(ensureClock(play), id).gold;

describe("D5 EV-08: Pay them off is a priced choice the pool pays", () => {
  it("hero-a 2 and hero-b (another group) 10: enabled, the pool reads 12, hero-b pays only 3", () => {
    const { play, group } = setup([["hero-a"], ["hero-b"]], { "hero-a": 2, "hero-b": 10 });
    loadLedger(play, group.id, () => "fighter");
    open(play, group.id, { type: "foes" });
    expect(purseOf(play, group.id)).toBe(12);
    const pay = eventOptions(play, tuning).find((option) => option.id === "pay-off");
    expect(pay?.enabled).toBe(true);
    chooseOption(play, tuning, "pay-off");
    commitLedger(play, group.id);
    expect(goldOf(play, "hero-a")).toBe(0);
    expect(goldOf(play, "hero-b")).toBe(7);
  });

  it("a pool one coin short keeps Pay them off greyed", () => {
    const { play, group } = setup([["hero-a"], ["hero-b"]], { "hero-a": 2, "hero-b": 2 });
    loadLedger(play, group.id, () => "fighter");
    open(play, group.id, { type: "foes" });
    expect(purseOf(play, group.id)).toBe(4);
    expect(eventOptions(play, tuning).find((option) => option.id === "pay-off")?.enabled).toBe(
      false,
    );
  });
});

describe("D5 EV-09: a gain goes to the heroes present, the leftover to the one holding least", () => {
  it("a windfall for hero-a 3 and hero-b 0; hero-c elsewhere 0 -> 5, 3, 0", () => {
    const { play, group } = setup([["hero-a", "hero-b"], ["hero-c"]], {
      "hero-a": 3,
      "hero-b": 0,
      "hero-c": 0,
    });
    loadLedger(play, group.id, () => "fighter");
    open(play, group.id, { type: "windfall" });
    settleEvent(play, tuning);
    commitLedger(play, group.id);
    expect(goldOf(play, "hero-a")).toBe(5);
    expect(goldOf(play, "hero-b")).toBe(3);
    expect(goldOf(play, "hero-c")).toBe(0);
  });
});

describe("D5 EV-10: the toll stays with the heroes present (Q-C3-22, DEC-944)", () => {
  const AMBUSH = {
    id: "ambush",
    options: [
      {
        id: "toll",
        label: "Pay the toll",
        cost: { kind: "toll" as const },
        effects: [{ kind: "flag" as const, flag: "paid" }],
      },
    ],
  };

  const pay = (hero: Record<string, { gold: number; hp: number }>) => {
    const { play, group } = setup([["hero-a", "hero-b"], ["hero-c"]], {});
    for (const [id, row] of Object.entries(hero)) {
      setHeroSheet(play, id, {
        helpingVirtues: 0,
        corruptions: 0,
        gold: row.gold,
        hp: { hp: row.hp, max: 12 },
      });
    }
    setHeroSheet(play, "hero-c", { helpingVirtues: 0, corruptions: 0, gold: 20 });
    setHeroHp(play, "hero-a", 1, 1);
    // The quest's own reward gold (a gain, DEC-700) is set to 0 so only the toll moves gold here.
    configureQuests(play, {
      defs: [{ id: "ambush", chapter: 1, scene: AMBUSH }],
      tuning: { questGold: 0 },
    });
    loadLive(play, group.id, 3);
    expect(beginQuest(play, group.id, "ambush").ok).toBe(true);
    expect(chooseQuestOption(play, group.id, "ambush", "toll").ok).toBe(true);
    commitLive(play, group.id);
    return play;
  };

  it("(a) the present heroes cover the 10: hero-a 8 and hero-b 4 -> 2 and 0, no hit points lost", () => {
    const play = pay({ "hero-a": { gold: 8, hp: 5 }, "hero-b": { gold: 4, hp: 5 } });
    expect(goldOf(play, "hero-a")).toBe(2);
    expect(goldOf(play, "hero-b")).toBe(0);
    expect(goldOf(play, "hero-c")).toBe(20);
    expect(heroSheet(ensureClock(play), "hero-a").hp?.hp).toBe(5);
    expect(heroSheet(ensureClock(play), "hero-b").hp?.hp).toBe(5);
  });

  it("(b) short: hero-a 2 (2 hit points) and hero-b 4 (9) lose all gold and 2 hit points each, hero-c pays nothing", () => {
    const play = pay({ "hero-a": { gold: 2, hp: 2 }, "hero-b": { gold: 4, hp: 9 } });
    expect(goldOf(play, "hero-a")).toBe(0);
    expect(goldOf(play, "hero-b")).toBe(0);
    expect(goldOf(play, "hero-c")).toBe(20);
    expect(heroSheet(ensureClock(play), "hero-a").hp?.hp).toBe(1);
    expect(heroSheet(ensureClock(play), "hero-b").hp?.hp).toBe(7);
  });
});

/* The event panel's purse field carries the pool (EV-08): driven through the shell like the host. */

const press = (promptId: string, actionId: string, deviceId = "ipad-0"): PressEvent => ({
  kind: "press",
  v: 1,
  deviceId,
  promptId,
  actionId,
});
const step = (state: ShellState, ...events: ShellEvent[]): ShellState =>
  events.reduce((cursor, event) => stepShell(cursor, event).state, state);

const reachPlay = (): ShellState => {
  let state = stepShell(
    initialShellState({ sessionId: "s", seed: "seed", stories: [TEST_STORY] }),
    {
      kind: "start-session",
      v: 1,
      seed: "seed",
      sessionId: "sess-1",
    },
  ).state;
  state = step(state, ...enterWithoutEvents());
  state = step(
    state,
    press("continue-pick-story-test", "continue"),
    press("continue-game-settings", "continue"),
  );
  for (const [index, hero] of TEST_STORY.heroes.slice(0, 4).entries()) {
    const deviceId = `ipad-${index}`;
    state = step(
      state,
      { kind: "device-join", v: 1, deviceId },
      { kind: "hero-hold", v: 1, deviceId, heroId: hero.id, action: "take" },
    );
  }
  state = step(state, press("continue-claim-heroes", "continue"));
  for (const setupStep of state.setupSteps) {
    if (setupStep.id === "starting-purse") {
      state = step(state, press(`spin-setup-${setupStep.id}`, "spin"));
    }
    state = step(state, press(`continue-setup-${setupStep.id}`, "continue"));
  }
  state = step(state, press("continue-begin", "continue"));
  for (const momentId of OPENING_MOMENTS) {
    state = step(state, press(openingPromptId(momentId), "continue"));
  }
  return state;
};

describe("D5 EV-08 (panel): the event panel's purse is the pool", () => {
  it("hero-a 2, hero-b 10, the others 0: the panel reads 12 whichever group acts", () => {
    let state = reachPlay();
    const roll = state.offered.find((offer) => offer.open && offer.promptId.endsWith("-roll-done"));
    if (!roll) throw new Error("No move roll to take.");
    state = step(state, press(roll.promptId, roll.actionId));
    const play = state.play;
    if (!play) throw new Error("No play state.");
    const skulls = play.content.board.spaces
      .filter((space) => space.building)
      .map((space) => `${space.id}=1`)
      .join(",");
    state = step(state, {
      kind: "test-seed",
      v: 1,
      markers: `~test-skulls:${skulls}~test-event:foes~test-gold:hero-a=2,hero-b=10,hero-c=0,hero-d=0`,
    });
    const end = state.offered.find((offer) => offer.open && offer.actionId === "end-turn");
    if (!end) throw new Error("The first group cannot end its turn.");
    state = step(state, press(end.promptId, end.actionId));
    const scene = projectShellView(state).table?.event;
    expect(scene?.purse).toBe(12);
    expect(scene?.options.find((option) => option.optionId === "pay-off")?.enabled).toBe(true);
  });
});
