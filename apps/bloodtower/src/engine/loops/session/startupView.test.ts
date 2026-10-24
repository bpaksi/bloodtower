import { describe, expect, it } from "vitest";
import type { PressEvent } from "../../events.ts";
import { project } from "../../views/project.ts";
import { TEST_STORY } from "./pack.ts";
import { initialShellState } from "./state.ts";
import { stepShell } from "./stepShell.ts";
import { projectShellView } from "./view.ts";

const press = (promptId: string, actionId: string): PressEvent => ({
  kind: "press",
  v: 1,
  deviceId: "ipad-0",
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

const run = (state: ReturnType<typeof start>, events: PressEvent[]) => {
  let cursor = state;
  for (const event of events) cursor = stepShell(cursor, event).state;
  return cursor;
};

describe("startup board copy", () => {
  it("describes splash, the story door, and setup without a screen dump", () => {
    let state = start();
    let view = projectShellView(state);
    expect(view.levels.at(-1)).toMatchObject({ id: "splash", shows: "Blood Tower" });
    expect(view.levels.find((level) => level.id === "table-status")?.shows).toContain(
      "tower: no tower",
    );
    expect(view.levels.length).toBeLessThanOrEqual(7);
    expect(project(view, { kind: "device", deviceId: "ipad-0" }).shows).toBe("Blood Tower");
    expect(JSON.stringify(project(view, { kind: "board" }))).not.toContain(".private.");

    state = run(state, [press("splash-play", "continue")]);
    view = projectShellView(state);
    expect(state.screen).toBe("pick-story");
    expect(view.levels.find((level) => level.id === "door-test")?.shows).toContain(
      "1\u20134 players",
    );
    expect(view.levels.find((level) => level.id === "door-test")?.shows).toContain(
      "AREA-077 day slice",
    );
    expect(view.levels.at(-1)?.shows).toBe("Proving Grounds");
    expect(project(view, { kind: "device", deviceId: "ipad-0" }).shows).toBe("Proving Grounds");

    state = run(state, [
      press(`continue-pick-story-${state.focusStoryId}`, "continue"),
      press("continue-game-settings", "continue"),
    ]);
    expect(state.screen).toBe("claim-heroes");
    for (const hero of TEST_STORY.heroes) {
      state = stepShell(state, {
        kind: "hero-hold",
        v: 1,
        deviceId: "ipad-0",
        heroId: hero.id,
        action: "take",
      }).state;
    }
    view = projectShellView(state);
    expect(view.levels.at(-1)?.shows).toBe("4 of 4 claimed");

    state = run(state, [press("continue-claim-heroes", "continue")]);
    expect(state.screen).toBe("setup");
    view = projectShellView(state);
    expect(view.levels.at(-1)?.label).toMatch(/^Step 1 of /);
    expect(view.levels.at(-1)?.shows.startsWith("Screen ")).toBe(false);

    for (const step of state.setupSteps) {
      state = run(state, [press(`continue-setup-${step.id}`, "continue")]);
    }
    expect(state.screen).toBe("begin");
    view = projectShellView(state);
    expect(view.levels.at(-1)?.shows).toBe("The table is set.");
    expect(view.levels.length).toBeLessThanOrEqual(7);
  });
});
