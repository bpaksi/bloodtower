import { describe, expect, it } from "vitest";
import { OPENING_MOMENTS, openingPromptId } from "../../../protocols/opening.ts";
import type { PressEvent } from "../../events.ts";
import { project } from "../../views/project.ts";
import { enterConnectEvents, enterWithoutEvents } from "./enterKit.ts";
import type { ShellEvent } from "./events.ts";
import { TEST_STORY } from "./pack.ts";
import { initialShellState, type ShellState } from "./state.ts";
import { type ShellStepResult, stepShell } from "./stepShell.ts";
import { BASE_BOARD_STEPS, projectShellView } from "./view.ts";

const press = (promptId: string, actionId: string, deviceId = "ipad-0"): PressEvent => ({
  kind: "press",
  v: 1,
  deviceId,
  promptId,
  actionId,
});

const start = () =>
  stepShell(initialShellState({ sessionId: "s", seed: "seed", stories: [TEST_STORY] }), {
    kind: "start-session",
    v: 1,
    seed: "seed",
    sessionId: "sess-1",
  }).state;

/** Runs events and records the screen and the tower commands after each one. */
const trace = (state: ShellState, events: ShellEvent[]) => {
  const steps: { screen: string; commands: string[]; step: string | null }[] = [];
  let cursor = state;
  for (const event of events) {
    const result: ShellStepResult = stepShell(cursor, event);
    cursor = result.state;
    steps.push({
      screen: cursor.screen,
      step: cursor.enter?.step ?? null,
      commands: result.effects.flatMap((effect) =>
        effect.kind === "tower-command" ? [effect.capabilityId] : [],
      ),
    });
  }
  return { state: cursor, steps };
};

const openActions = (state: ShellState) =>
  projectShellView(state)
    .actions.filter((action) => action.open)
    .map((action) => `${action.promptId}:${action.label}`);

describe("enter runs MEC-039 in order", () => {
  it("connect track: join, first iPad, base board, tower choice, connect, calibrate, body", () => {
    let state = start();
    expect(state.screen).toBe("table-join");
    expect(openActions(state)).toEqual([]);

    state = stepShell(state, { kind: "device-join", v: 1, deviceId: "ipad-0" }).state;
    expect(state.screen).toBe("base-board");
    expect(openActions(state)).toEqual(["base-board-done:Board is set up"]);
    const board = project(projectShellView(state), { kind: "board" });
    expect(board.levels.at(-1)?.shows.split("\n")).toEqual([...BASE_BOARD_STEPS]);

    const ran = trace(state, [
      press("base-board-done", "board-set-up"),
      press("tower-connect", "tower-connect"),
      { kind: "tower-result", v: 1, capabilityId: "tower.connect", ok: true },
      press("tower-calibrate", "tower-calibrate"),
      { kind: "tower-result", v: 1, capabilityId: "tower.calibrate", ok: true },
    ]);
    expect(ran.steps).toEqual([
      { screen: "tower-choice", step: "choice", commands: [] },
      { screen: "tower-wake", step: "connecting", commands: ["tower.connect"] },
      { screen: "tower-wake", step: "calibrate", commands: [] },
      { screen: "tower-wake", step: "calibrating", commands: ["tower.calibrate"] },
      { screen: "pick-story", step: null, commands: [] },
    ]);
    expect(ran.state.towerChoice).toBe("connect");
  });

  it("without track: the same up to the tower choice, then straight to the body", () => {
    const ran = trace(start(), enterWithoutEvents());
    expect(ran.steps.map((step) => step.screen)).toEqual([
      "base-board",
      "tower-choice",
      "pick-story",
    ]);
    expect(ran.steps.flatMap((step) => step.commands)).toEqual([]);
    expect(ran.state.towerChoice).toBe("without");
    expect(ran.state.towerLinked).toBe(false);
  });

  it("the tower choice offers exactly Connect Tower and Play without Tower", () => {
    const state = trace(start(), enterWithoutEvents().slice(0, 2)).state;
    expect(state.screen).toBe("tower-choice");
    expect(openActions(state)).toEqual([
      "tower-connect:Connect Tower",
      "play-without-tower:Play without Tower",
    ]);
    const device = project(projectShellView(state), { kind: "device", deviceId: "ipad-0" });
    expect(device.shows).toBe("Wake the tower, or play tonight without it?");
  });

  it("one iPad's press finishes the board setup; a second press changes nothing", () => {
    const state = trace(start(), enterWithoutEvents().slice(0, 2)).state;
    const again = stepShell(state, press("base-board-done", "board-set-up", "ipad-1"));
    expect(again.state.screen).toBe("tower-choice");
    expect(again.effects.some((effect) => effect.kind === "tower-command")).toBe(false);
  });

  it("a second iPad can join during the tower choice", () => {
    let state = trace(start(), enterWithoutEvents().slice(0, 2)).state;
    state = stepShell(state, { kind: "device-join", v: 1, deviceId: "ipad-1" }).state;
    expect(state.screen).toBe("tower-choice");
    expect(state.devices.size).toBe(2);
  });

  it("a failed connect or calibrate shows Tower not found, then asks again; nothing retries", () => {
    let state = trace(start(), enterWithoutEvents().slice(0, 2)).state;
    const failed = trace(state, [
      press("tower-connect", "tower-connect"),
      { kind: "tower-result", v: 1, capabilityId: "tower.connect", ok: false },
    ]);
    state = failed.state;
    expect(failed.steps.flatMap((step) => step.commands)).toEqual(["tower.connect"]);
    expect(state.screen).toBe("tower-choice");
    expect(state.towerLinked).toBe(false);
    const view = projectShellView(state);
    expect(view.levels.at(-1)).toMatchObject({
      label: "Tower not found",
      shows: "The tower did not answer. Try again, or play without it.",
    });
    expect(openActions(state)).toEqual([
      "tower-connect:Connect Tower",
      "play-without-tower:Play without Tower",
    ]);

    const second = trace(state, [
      press("tower-connect", "tower-connect"),
      { kind: "tower-result", v: 1, capabilityId: "tower.connect", ok: true },
      press("tower-calibrate", "tower-calibrate"),
      { kind: "tower-result", v: 1, capabilityId: "tower.calibrate", ok: false },
    ]);
    expect(second.steps.flatMap((step) => step.commands)).toEqual([
      "tower.connect",
      "tower.calibrate",
    ]);
    expect(second.state.screen).toBe("tower-choice");
    expect(second.state.enter).toEqual({ step: "choice", failed: true });
    expect(second.state.towerLinked).toBe(false);
  });

  it("sends nothing on start, on a snapshot or when the first iPad joins", () => {
    const first = stepShell(initialShellState({ sessionId: "s", seed: "seed" }), {
      kind: "start-session",
      v: 1,
      seed: "seed",
      sessionId: "sess-1",
    });
    expect(first.effects.some((effect) => effect.kind === "tower-command")).toBe(false);
    const joined = stepShell(first.state, { kind: "device-join", v: 1, deviceId: "ipad-0" });
    expect(joined.effects.some((effect) => effect.kind === "tower-command")).toBe(false);
  });
});

describe("game setup has no tower step", () => {
  it("runs pick-story, game-settings, claim-heroes, setup, begin with no tower command after the Enter", () => {
    let state = trace(start(), enterConnectEvents()).state;
    const screens = new Set<string>();
    const commands: string[] = [];
    const run = (events: ShellEvent[]) => {
      for (const event of events) {
        const result = stepShell(state, event);
        state = result.state;
        screens.add(state.screen);
        for (const effect of result.effects) {
          if (effect.kind === "tower-command") commands.push(effect.capabilityId);
        }
      }
    };
    screens.add(state.screen);
    run([
      press(`continue-pick-story-${state.focusStoryId}`, "continue"),
      press("continue-game-settings", "continue"),
    ]);
    for (const hero of TEST_STORY.heroes.slice(0, 4)) {
      run([{ kind: "hero-hold", v: 1, deviceId: "ipad-0", heroId: hero.id, action: "take" }]);
    }
    run([press("continue-claim-heroes", "continue")]);
    for (const step of [...state.setupSteps]) run([press(`continue-setup-${step.id}`, "continue")]);
    expect(state.screen).toBe("begin");
    expect([...screens]).toEqual(["pick-story", "game-settings", "claim-heroes", "setup", "begin"]);
    expect(commands).toEqual([]);
    expect(state.setupSteps.map((step) => step.id)).toEqual(["seals-and-skulls", "place-heroes"]);
  });
});

describe("without the tower is kept for the session", () => {
  it("a second game after Quit story asks no tower question and sends no tower command", () => {
    let state = trace(start(), enterWithoutEvents()).state;
    const commands: string[] = [];
    const run = (events: ShellEvent[]) => {
      for (const event of events) {
        const result = stepShell(state, event);
        state = result.state;
        for (const effect of result.effects) {
          if (effect.kind === "tower-command") commands.push(effect.capabilityId);
        }
      }
    };
    run([
      press(`continue-pick-story-${state.focusStoryId}`, "continue"),
      press("continue-game-settings", "continue"),
    ]);
    for (const hero of TEST_STORY.heroes.slice(0, 4)) {
      run([{ kind: "hero-hold", v: 1, deviceId: "ipad-0", heroId: hero.id, action: "take" }]);
    }
    run([press("continue-claim-heroes", "continue")]);
    for (const step of [...state.setupSteps]) run([press(`continue-setup-${step.id}`, "continue")]);
    run([press("continue-begin", "continue")]);
    for (const moment of OPENING_MOMENTS) run([press(openingPromptId(moment), "continue")]);
    run([press("menu-quit", "quit-story")]);
    expect(state.screen).toBe("session");

    const seen: string[] = [];
    run([press("session-new-game", "new-game")]);
    seen.push(state.screen);
    expect(seen).toEqual(["pick-story"]);
    expect(state.enter).toBeNull();
    expect(state.towerChoice).toBe("without");
    run([
      press(`continue-pick-story-${state.focusStoryId}`, "continue"),
      press("continue-game-settings", "continue"),
    ]);
    expect(state.screen).toBe("claim-heroes");
    expect(commands).toEqual([]);
  });
});
