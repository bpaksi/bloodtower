import { describe, expect, it } from "vitest";
import { OPENING_MOMENTS, openingPromptId } from "../../../protocols/opening.ts";
import type { PressEvent } from "../../events.ts";
import { project } from "../../views/project.ts";
import type { ShellStory } from "./pack.ts";
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

const hold = (heroId: string, action: "take" | "release", deviceId = "ipad-0") =>
  stepShell(current, {
    kind: "hero-hold",
    v: 1,
    deviceId,
    heroId,
    action,
  }).state;

let current = initialShellState({ sessionId: "s", seed: "seed", stories: [TEST_STORY] });

const boot = (stories: ShellStory[] = [TEST_STORY]) => {
  current = stepShell(initialShellState({ sessionId: "s", seed: "seed", stories }), {
    kind: "start-session",
    v: 1,
    seed: "seed",
    sessionId: "sess-1",
  }).state;
};

const run = (events: PressEvent[]) => {
  for (const event of events) current = stepShell(current, event).state;
};

const toClaim = () => {
  boot();
  run([press("splash-play", "continue"), press("continue-pick-story-test", "continue")]);
  expect(current.screen).toBe("game-settings");
  expect(current.settingValues["party-size"]).toBe("n-4");
  continueToClaim();
};

/** Game settings now stops at Connect Tower until the tower was calibrated. */
const continueToClaim = () => {
  run([
    press("continue-game-settings", "continue"),
    press("play-without-tower", "play-without-tower"),
  ]);
  expect(current.screen).toBe("claim-heroes");
};

const backToSettings = () => {
  run([press("back-claim-heroes", "back")]);
  expect(current.screen).toBe("tower-connect");
  run([press("back-tower-connect", "back")]);
  expect(current.screen).toBe("game-settings");
};

const DRACULA: ShellStory = {
  card: {
    id: "dracula",
    title: "The Count of Vellmoor",
    tagline: "The Count has taken Lenka.",
    playable: false,
    players: { min: 1, max: 1 },
  },
  settings: [
    {
      id: "length",
      label: "Length",
      options: [
        { id: "short", label: "Short" },
        { id: "standard", label: "Standard" },
        { id: "long", label: "Long" },
      ],
      default: "standard",
    },
  ],
  setup: [],
  heroes: [],
};

describe("party size and pick heroes", () => {
  it("reads N from the party-size option and refuses a fifth pick", () => {
    toClaim();
    expect(projectShellView(current).levels.at(-1)?.shows).toBe("0 of 4 picked");
    for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
      current = hold(heroId, "take");
    }
    expect(projectShellView(current).levels.at(-1)?.shows).toBe("4 of 4 picked");
    current = hold("hero-e", "take");
    expect(current.holdings["hero-e"]).toBeNull();
    expect(projectShellView(current).levels.at(-1)?.shows).toBe("4 of 4 picked");
    const device = project(projectShellView(current), { kind: "device", deviceId: "ipad-0" });
    expect(JSON.stringify(device)).not.toContain(".private.");
    expect(JSON.stringify(device)).not.toContain("hears this");
  });

  it("releases a pick and keeps it when N changes", () => {
    toClaim();
    current = hold("hero-a", "take");
    current = hold("hero-a", "release");
    expect(current.holdings["hero-a"]).toBeNull();
    current = hold("hero-a", "take");
    backToSettings();
    expect(current.holdings["hero-a"]).toBe("ipad-0");
    const serial = current.setSerial;
    current = stepShell(current, {
      kind: "set-setting",
      v: 1,
      deviceId: "ipad-0",
      settingId: "party-size",
      optionId: "n-4",
    }).state;
    expect(current.setSerial).toBe(serial);
    current = stepShell(current, {
      kind: "set-setting",
      v: 1,
      deviceId: "ipad-0",
      settingId: "party-size",
      optionId: "n-2",
    }).state;
    expect(current.settingValues["party-size"]).toBe("n-2");
    expect(current.holdings["hero-a"]).toBe("ipad-0");
    continueToClaim();
    expect(projectShellView(current).levels.at(-1)?.shows).toBe("1 of 2 picked");
    current = hold("hero-b", "take");
    current = hold("hero-c", "take");
    expect(current.holdings["hero-c"]).toBeNull();
  });

  it("clears the setting on the way back to Pick Story and keeps a private line on setup", () => {
    toClaim();
    current = hold("hero-a", "take");
    backToSettings();
    run([press("back-game-settings", "back"), press("continue-pick-story-test", "continue")]);
    expect(current.screen).toBe("game-settings");
    expect(current.settingValues["party-size"]).toBe("n-4");
    continueToClaim();
    for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
      current = hold(heroId, "take");
    }
    run([press("continue-claim-heroes", "continue")]);
    expect(current.screen).toBe("setup");
    const device = project(projectShellView(current), { kind: "device", deviceId: "ipad-0" });
    expect(JSON.stringify(device)).toContain("Only Hero A hears this.");
  });

  it("seats hero-a on Arisilon and hero-e on Brynthia when N is 2", () => {
    toClaim();
    backToSettings();
    current = stepShell(current, {
      kind: "set-setting",
      v: 1,
      deviceId: "ipad-0",
      settingId: "party-size",
      optionId: "n-2",
    }).state;
    continueToClaim();
    current = hold("hero-e", "take");
    current = hold("hero-a", "take");
    run([press("continue-claim-heroes", "continue")]);
    for (const step of current.setupSteps) {
      run([press(`continue-setup-${step.id}`, "continue")]);
    }
    run([press("continue-begin", "continue")]);
    expect(current.screen).toBe("play");
    expect(current.play).toBeNull();
    for (const momentId of OPENING_MOMENTS) {
      run([press(openingPromptId(momentId), "continue")]);
    }
    expect(current.play?.content.start.assignments).toEqual([
      { hero: "hero-a", kingdom: "N" },
      { hero: "hero-e", kingdom: "E" },
    ]);
    expect(current.play?.groups).toHaveLength(2);
    current = stepShell(current, { kind: "device-join", v: 1, deviceId: "ipad-extra" }).state;
    current = stepShell(current, { kind: "device-drop", v: 1, deviceId: "ipad-extra" }).state;
    expect(current.stage).toBe("playing");
    expect(current.pause).toBeNull();
  });

  it("stops on not-playable for Dracula and does not add party size", () => {
    boot([DRACULA, TEST_STORY]);
    expect(current.focusStoryId).toBe("test");
    expect(current.boundStoryId).toBe("test");
    run([press("splash-play", "continue")]);
    current = stepShell(current, {
      kind: "focus-story",
      v: 1,
      deviceId: "ipad-0",
      storyId: "dracula",
    }).state;
    expect(current.offered.some((offer) => offer.promptId === "continue-pick-story-dracula")).toBe(
      true,
    );
    const holdings = current.holdings["hero-a"];
    run([press("continue-pick-story-dracula", "continue")]);
    expect(current.screen).toBe("not-playable");
    expect(current.boundStoryId).toBe("test");
    expect(current.chosenStoryId).toBeNull();
    expect(current.holdings["hero-a"]).toBe(holdings);
    expect(current.settingValues).toEqual({});
    const shows = projectShellView(current).levels.at(-1)?.shows ?? "";
    expect(shows).toBe("The Count of Vellmoor");
    expect(shows).not.toContain("Party size");
    expect(shows).not.toContain("Length");
    run([press("back-not-playable", "back")]);
    expect(current.screen).toBe("pick-story");
    expect(current.focusStoryId).toBe("dracula");
    expect(current.settingValues).toEqual({});
  });
});
