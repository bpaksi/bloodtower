import { createRng, type Rng } from "@dark-tower/rng";
import { formatGroupAction } from "../loops/group-turn/loop.ts";
import type { ShellEvent } from "../loops/session/events.ts";
import { TEST_STORY } from "../loops/session/pack.ts";
import { initialShellState, type ShellState } from "../loops/session/state.ts";
import { stepShell } from "../loops/session/stepShell.ts";
import { pickPress } from "./autoplay.ts";

export type DayLog = {
  day: number;
  rolls: Record<string, number>;
  groups: Record<string, string[]>;
  skull: { kingdom: string; spaceId: string; building: string | null } | null;
};

export type GameSimResult = {
  seed: string;
  days: DayLog[];
};

const SETUP_EVENTS = (seed: string): ShellEvent[] => [
  { kind: "start-session", v: 1, sessionId: "sim", seed },
  { kind: "device-join", v: 1, deviceId: "sim-pad" },
  {
    kind: "press",
    v: 1,
    deviceId: "sim-pad",
    promptId: "tower-connect",
    actionId: "tower-connect",
  },
  {
    kind: "press",
    v: 1,
    deviceId: "sim-pad",
    promptId: "tower-calibrate",
    actionId: "tower-calibrate",
  },
  { kind: "press", v: 1, deviceId: "sim-pad", promptId: "new-pick-game", actionId: "new-game" },
  { kind: "focus-story", v: 1, deviceId: "sim-pad", storyId: "test" },
  {
    kind: "press",
    v: 1,
    deviceId: "sim-pad",
    promptId: "continue-pick-story-test",
    actionId: "continue",
  },
  {
    kind: "press",
    v: 1,
    deviceId: "sim-pad",
    promptId: "continue-game-settings",
    actionId: "continue",
  },
  { kind: "hero-hold", v: 1, deviceId: "sim-pad", heroId: "hero-a", action: "take" },
  { kind: "hero-hold", v: 1, deviceId: "sim-pad", heroId: "hero-b", action: "take" },
  { kind: "hero-hold", v: 1, deviceId: "sim-pad", heroId: "hero-c", action: "take" },
  { kind: "hero-hold", v: 1, deviceId: "sim-pad", heroId: "hero-d", action: "take" },
  {
    kind: "press",
    v: 1,
    deviceId: "sim-pad",
    promptId: "continue-claim-heroes",
    actionId: "continue",
  },
  {
    kind: "press",
    v: 1,
    deviceId: "sim-pad",
    promptId: "continue-setup-seals-and-skulls",
    actionId: "continue",
  },
  {
    kind: "press",
    v: 1,
    deviceId: "sim-pad",
    promptId: "continue-setup-lay-out-board",
    actionId: "continue",
  },
  {
    kind: "press",
    v: 1,
    deviceId: "sim-pad",
    promptId: "continue-setup-place-heroes",
    actionId: "continue",
  },
  { kind: "press", v: 1, deviceId: "sim-pad", promptId: "continue-begin", actionId: "continue" },
];

const setupThroughPlay = (seed: string): ShellState => {
  let state = initialShellState({ sessionId: "sim", seed, stories: [TEST_STORY] });
  for (const event of SETUP_EVENTS(seed)) {
    state = stepShell(state, event).state;
  }
  return state;
};

const dayLogFromState = (
  state: ShellState,
  day: number,
  actions: Record<string, string[]>,
): DayLog => {
  const play = state.play;
  return {
    day,
    rolls: { ...(play?.dayRolls ?? {}) },
    groups: Object.fromEntries(
      (play?.turnOrder ?? Object.keys(actions)).map((id) => [id, [...(actions[id] ?? [])]]),
    ),
    skull: play?.lastSkull ?? null,
  };
};

export const simulateGame = (seed: string, targetDays: number, rng: Rng): GameSimResult => {
  let state = setupThroughPlay(seed);
  const days: DayLog[] = [];
  const actions: Record<string, string[]> = {};
  const board = state.playContent?.board;

  let guard = 0;
  while (days.length < targetDays && guard < 80_000) {
    guard += 1;
    const press = pickPress(state, rng);
    if (!press) break;

    const groupFrame = state.loops.stack.find((f) => f.loopId === "group-turn");
    const groupId =
      groupFrame &&
      typeof groupFrame.local === "object" &&
      groupFrame.local &&
      "groupId" in groupFrame.local
        ? String((groupFrame.local as { groupId: string }).groupId)
        : null;

    if (groupId && board) {
      if (!actions[groupId]) actions[groupId] = [];
      actions[groupId].push(formatGroupAction(board, press.promptId, press.actionId));
    }

    const result = stepShell(state, {
      kind: "press",
      v: 1,
      deviceId: "sim-pad",
      promptId: press.promptId,
      actionId: press.actionId,
    });
    state = result.state;

    for (const effect of result.effects) {
      if (effect.kind === "checkpoint-write") {
        days.push(dayLogFromState(state, effect.day, actions));
        for (const id of state.play?.turnOrder ?? []) actions[id] = [];
      }
    }
  }

  return { seed, days };
};

export const simulateBatch = (games: number, days: number, seed: string): GameSimResult[] => {
  const results: GameSimResult[] = [];
  for (let i = 0; i < games; i++) {
    const runSeed = `${seed}:${i}`;
    results.push(simulateGame(runSeed, days, createRng(runSeed)));
  }
  return results;
};
