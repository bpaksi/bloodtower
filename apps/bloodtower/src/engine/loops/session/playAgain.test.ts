import { describe, expect, it } from "vitest";
import { OPENING_MOMENTS, openingPromptId } from "../../../protocols/opening.ts";
import type { PressEvent } from "../../events.ts";
import { project } from "../../views/project.ts";
import { enterWithoutEvents } from "./enterKit.ts";
import { beginNewGame, rateOpenGame } from "./hub.ts";
import { TEST_STORY } from "./pack.ts";
import { initialShellState, type ShellState } from "./state.ts";
import { stepShell } from "./stepShell.ts";
import { projectShellView } from "./view.ts";

const press = (promptId: string, actionId: string, deviceId = "ipad-0"): PressEvent => ({
  kind: "press",
  v: 1,
  deviceId,
  promptId,
  actionId,
});

const step = (state: ShellState, ...events: Parameters<typeof stepShell>[1][]) => {
  let cursor = state;
  for (const event of events) cursor = stepShell(cursor, event).state;
  return cursor;
};

const claimAll = (state: ShellState) => {
  let cursor = state;
  for (const [index, hero] of TEST_STORY.heroes.slice(0, 4).entries()) {
    const deviceId = `ipad-${index}`;
    cursor = step(
      cursor,
      { kind: "device-join", v: 1, deviceId },
      { kind: "hero-hold", v: 1, deviceId, heroId: hero.id, action: "take" },
    );
  }
  return cursor;
};

/** Pick story to the first play screen, four iPads holding one hero each. */
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
  state = claimAll(state);
  state = step(state, press("continue-claim-heroes", "continue"));
  for (const setup of state.setupSteps) {
    state = step(state, press(`continue-setup-${setup.id}`, "continue"));
  }
  state = step(state, press("continue-begin", "continue"));
  for (const momentId of OPENING_MOMENTS)
    state = step(state, press(openingPromptId(momentId), "continue"));
  return state;
};

const openOffers = (state: ShellState) =>
  state.offered.filter((offer) => offer.open && !offer.promptId.startsWith("menu-"));

/**
 * Plays by the first sensible press until `stop` holds. Returns what it pressed, so a test can
 * compare the game's counts with the walks, Enters and skull days it made.
 */
const drive = (start: ShellState, stop: (state: ShellState) => boolean) => {
  let state = start;
  const made = { walks: 0, enters: 0 };
  let walkedThisTurn = false;
  let enteredThisTurn = false;
  for (let index = 0; index < 400 && !stop(state); index += 1) {
    const open = openOffers(state);
    const find = (actionId: string) => open.find((offer) => offer.actionId === actionId);
    const pick =
      find("continue") ??
      find("record") ??
      find("done") ??
      find("leave") ??
      (enteredThisTurn ? undefined : find("enter")) ??
      (walkedThisTurn ? undefined : find("walk")) ??
      find("end-turn");
    if (!pick) throw new Error(`Nothing to press on day ${state.play?.dayNumber}.`);
    if (pick.actionId === "walk") {
      made.walks += 1;
      walkedThisTurn = true;
    }
    if (pick.actionId === "enter") {
      made.enters += 1;
      enteredThisTurn = true;
    }
    if (pick.actionId === "end-turn") {
      walkedThisTurn = false;
      enteredThisTurn = false;
    }
    state = step(state, press(pick.promptId, pick.actionId));
  }
  if (!stop(state)) {
    const open = openOffers(state).map((offer) => `${offer.promptId}/${offer.actionId}`);
    throw new Error(
      `The game did not reach the stop: day ${state.play?.dayNumber}, ${open.join(" ")}`,
    );
  }
  return { state, made };
};

const quit = (state: ShellState) => step(state, press("menu-quit", "quit-story"));

const levelOf = (state: ShellState, id: string) =>
  projectShellView(state).levels.find((level) => level.id === id);

const statRows = (state: ShellState) =>
  Object.fromEntries(
    (levelOf(state, "game-stats")?.shows ?? "").split("\n").map((line) => {
      const at = line.indexOf(": ");
      return [line.slice(0, at), line.slice(at + 2)];
    }),
  );

describe("C2/07 a game's stats", () => {
  it("counts the walks, Enters and skull days of the game played (EV-01)", () => {
    const played = drive(reachPlay(), (state) => state.play?.dayNumber === 3);
    const ended = quit(played.state);
    const opened = step(ended, press("session-game-1", "open-game"));
    expect(opened.screen).toBe("session");
    expect(opened.statsGame).toBe(1);
    const view = projectShellView(opened);
    expect(levelOf(opened, "game-stats")?.label).toBe("Game 1");
    expect(statRows(opened)).toEqual({
      Story: "Proving Grounds",
      Outcome: "quit",
      "Time played": "—",
      "Quit on day": "3",
      "Moves taken": String(played.made.walks),
      "Buildings entered": String(played.made.enters),
      "Skull drops recorded": "2",
    });
    expect(played.made.walks).toBeGreaterThan(0);
    expect(view.actions.filter((action) => action.open).map((action) => action.label)).toEqual([
      "Play again",
      "Back",
    ]);
  });

  it("shows a skull count as unavailable before the first skull, never zero (EV-02)", () => {
    // Every turn is over and the day's skull is about to be recorded.
    const early = drive(reachPlay(), (state) =>
      openOffers(state).some((offer) => offer.actionId === "record"),
    );
    const first = step(quit(early.state), press("session-game-1", "open-game"));
    expect(statRows(first)["Skull drops recorded"]).toBe("unavailable");
    expect(statRows(first)["Time played"]).toBe("—");
    expect(statRows(first)["Quit on day"]).toBe("1");
    const later = drive(reachPlay(), (state) => state.play?.dayNumber === 2);
    const second = step(quit(later.state), press("session-game-1", "open-game"));
    expect(statRows(second)["Skull drops recorded"]).toBe("1");
  });

  it("shows every count as unavailable when the game quit before play began", () => {
    const state = reachPlay();
    const openingOnly = {
      ...state,
      play: null,
      openingIndex: 0,
      tally: { moves: 0, buildings: 0, skulls: null, skullDay: null },
    };
    const opened = step(quit(openingOnly), press("session-game-1", "open-game"));
    const rows = statRows(opened);
    expect(rows["Quit on day"]).toBe("unavailable");
    expect(rows["Moves taken"]).toBe("unavailable");
    expect(rows["Buildings entered"]).toBe("unavailable");
    expect(rows["Skull drops recorded"]).toBe("unavailable");
  });

  it("Back returns to the session screen unchanged (EV-07)", () => {
    const ended = quit(reachPlay());
    const before = projectShellView(ended);
    const back = step(ended, press("session-game-1", "open-game"), press("stats-back", "back"));
    expect(back.statsGame).toBeNull();
    expect(projectShellView(back).actions).toEqual(before.actions);
    expect(projectShellView(back).levels).toEqual(before.levels);
    expect(before.actions[0]?.label).toBe("Continue");
  });

  it("takes an optional 1 to 5 rating that blocks nothing (EV-13)", () => {
    const opened = step(quit(reachPlay()), press("session-game-1", "open-game"));
    const device = project(projectShellView(opened), { kind: "device", deviceId: "ipad-0" });
    expect(device.settings?.[0]).toMatchObject({
      id: "fun-rating",
      label: "How was tonight?",
      optionId: "none",
    });
    expect(device.settings?.[0]?.options.map((option) => option.label)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    const rate = (state: ShellState, optionId: string) =>
      stepShell(state, {
        kind: "set-setting",
        v: 1,
        deviceId: "ipad-0",
        settingId: "fun-rating",
        optionId,
      }).state;
    expect(rate(opened, "4").games[0]?.rating).toBe(4);
    expect(rate(opened, "9").games[0]?.rating).toBeNull();
    // Play again is offered whether or not a rating was given.
    expect(openOffers(rate(opened, "4")).map((offer) => offer.actionId)).toEqual([
      "play-again",
      "back",
    ]);
    expect(openOffers(opened).map((offer) => offer.actionId)).toEqual(["play-again", "back"]);
  });
});

const seedsOf = (...states: ShellState[]) => states.map((state) => state.seed);

describe("C2/07 play again", () => {
  const withoutSave = (state: ShellState): ShellState => ({ ...state, autosave: null });

  it("skips Pick story and Game settings, and prefills the same heroes (EV-03, EV-15)", () => {
    const ended = withoutSave(quit(reachPlay()));
    const again = step(
      ended,
      press("session-game-1", "open-game"),
      press("stats-play-again", "play-again"),
    );
    expect(again.screen).toBe("claim-heroes");
    expect(again.confirm).toBeNull();
    expect(again.chosenStoryId).toBe("test");
    expect(again.settingValues).toEqual(ended.settingValues);
    expect(again.holdings).toEqual(
      Object.fromEntries(
        TEST_STORY.heroes.map((hero, index) => [hero.id, index < 4 ? `ipad-${index}` : null]),
      ),
    );
    const view = projectShellView(again);
    expect(view.levels.find((level) => level.id === "claim-heroes")?.shows).toBe("4 of 4 picked");
    const open = view.actions.filter((action) => action.open);
    expect(open.map((action) => action.label)).toEqual(["Confirm"]);
    expect(view.actions.some((action) => action.actionId === "back")).toBe(false);
    const seen = new Set<string>();
    let state = again;
    state = step(state, press("continue-claim-heroes", "continue"));
    for (const setup of state.setupSteps) {
      seen.add(state.screen);
      state = step(state, press(`continue-setup-${setup.id}`, "continue"));
    }
    expect(seen).toEqual(new Set(["setup"]));
    expect(state.screen).toBe("begin");
    expect(state.setupSteps.map((setup) => setup.id)).toEqual(["seals-and-skulls", "place-heroes"]);
    state = step(state, press("continue-begin", "continue"));
    expect(state.screen).toBe("play");
    expect(state.autosave?.seed).toBe(again.seed);
  });

  it("opens Confirm only once every hero is held, and an iPad that left loses its prefill (EV-05)", () => {
    const ended = withoutSave(quit(reachPlay()));
    const gone = step(ended, { kind: "device-drop", v: 1, deviceId: "ipad-1" });
    const again = step(
      gone,
      press("session-game-1", "open-game"),
      press("stats-play-again", "play-again"),
    );
    expect(again.holdings["hero-a"]).toBe("ipad-0");
    expect(again.holdings["hero-b"]).toBeNull();
    expect(again.holdings["hero-c"]).toBe("ipad-2");
    const view = project(projectShellView(again), { kind: "device", deviceId: "ipad-0" });
    expect(view.shows).toBe("3 of 4 picked");
    expect(view.heroes.map((hero) => [hero.id, hero.claim])).toContainEqual(["hero-b", "open"]);
    // Confirm does nothing while a hero is unheld.
    expect(step(again, press("continue-claim-heroes", "continue")).screen).toBe("claim-heroes");
    const joined = step(
      again,
      { kind: "device-join", v: 1, deviceId: "ipad-9" },
      { kind: "hero-hold", v: 1, deviceId: "ipad-9", heroId: "hero-b", action: "take" },
    );
    expect(step(joined, press("continue-claim-heroes", "continue")).screen).toBe("setup");
  });

  it("gives each Play again its own seed and shows none (EV-04)", () => {
    const ended = withoutSave(quit(reachPlay()));
    const open = step(ended, press("session-game-1", "open-game"));
    const first = step(open, press("stats-play-again", "play-again"));
    const second = step(
      step(open, {
        kind: "set-setting",
        v: 1,
        deviceId: "ipad-0",
        settingId: "fun-rating",
        optionId: "3",
      }),
      press("stats-play-again", "play-again"),
    );
    const seeds = seedsOf(ended, first, second);
    expect(new Set(seeds).size).toBe(3);
    for (const state of [first, second]) {
      expect(state.chosenStoryId).toBe(ended.chosenStoryId);
      expect(state.settingValues).toEqual(ended.settingValues);
      expect(state.holdings).toEqual(ended.holdings);
    }
    for (const state of [open, first, second]) {
      expect(JSON.stringify(projectShellView(state))).not.toContain(state.seed);
      expect(JSON.stringify(projectShellView(state))).not.toContain(ended.seed);
    }
    // The same press on the same game finds the same seed.
    expect(step(open, press("stats-play-again", "play-again")).seed).toBe(first.seed);
  });

  it("asks before replacing the autosave; No keeps it, Yes replaces it at Begin (EV-06, EV-14)", () => {
    const ended = quit(reachPlay());
    expect(ended.autosave).not.toBeNull();
    const asked = step(
      ended,
      press("session-game-1", "open-game"),
      press("stats-play-again", "play-again"),
    );
    expect(asked.screen).toBe("session");
    expect(asked.confirm).toBe("play-again");
    expect(asked.seed).toBe(ended.seed);
    const view = projectShellView(asked);
    expect(view.levels.find((level) => level.id === "session")?.shows).toContain(
      "This replaces the saved game. Are you sure?",
    );
    expect(view.levels.find((level) => level.id === "session-confirm")).toEqual({
      id: "session-confirm",
      label: "Play again?",
      shows: "Same heroes, a fresh board.\nThis replaces the saved game. Are you sure?",
    });
    expect(view.actions.filter((action) => action.open).map((action) => action.label)).toEqual([
      "Play again",
      "Back",
    ]);
    // No: the autosave stays and the stats come back.
    const declined = step(asked, press("session-confirm-back", "back"));
    expect(declined.confirm).toBeNull();
    expect(declined.statsGame).toBe(1);
    expect(declined.autosave).toEqual(ended.autosave);
    expect(declined.seed).toBe(ended.seed);
    expect(openOffers(declined).map((offer) => offer.actionId)).toEqual(["play-again", "back"]);
    // Yes: claims, the old save stays until Begin writes the next one.
    const yes = stepShell(asked, press("session-play-again-confirm", "play-again"));
    expect(yes.state.screen).toBe("claim-heroes");
    expect(yes.state.autosave).toBeNull();
    expect(yes.effects.some((effect) => effect.kind === "autosave-write")).toBe(false);
    let state = step(yes.state, press("continue-claim-heroes", "continue"));
    for (const setup of state.setupSteps) {
      state = step(state, press(`continue-setup-${setup.id}`, "continue"));
    }
    const begun = stepShell(state, press("continue-begin", "continue"));
    expect(begun.effects.some((effect) => effect.kind === "autosave-write")).toBe(true);
    expect(begun.state.autosave?.gameId).not.toBe(ended.autosave?.gameId);
    expect(begun.state.autosave?.seed).toBe(yes.state.seed);
  });

  it("a game that is played again keeps its place in tonight's list", () => {
    const ended = withoutSave(quit(reachPlay()));
    let state = step(
      ended,
      press("session-game-1", "open-game"),
      press("stats-play-again", "play-again"),
      press("continue-claim-heroes", "continue"),
    );
    for (const setup of state.setupSteps) {
      state = step(state, press(`continue-setup-${setup.id}`, "continue"));
    }
    state = step(state, press("continue-begin", "continue"));
    for (const momentId of OPENING_MOMENTS)
      state = step(state, press(openingPromptId(momentId), "continue"));
    state = quit(state);
    expect(state.games.map((game) => game.gameId)).toHaveLength(2);
    expect(levelOf(state, "session-games")?.shows).toBe("Game 2 quit\nGame 1 quit");
    // Game 1's own start is still the one Play again reads.
    expect(state.games[0]?.holdings).toEqual(ended.games[0]?.holdings);
  });
});

describe("C2/07 refused presses are errors, not silence", () => {
  const withoutSave = (state: ShellState): ShellState => ({ ...state, autosave: null });
  const refusals = (result: ReturnType<typeof stepShell>) =>
    result.effects.filter((effect) => effect.kind === "press-error");

  it("Play again on a story that is gone changes nothing and reports invalid-state", () => {
    const opened = step(withoutSave(quit(reachPlay())), press("session-game-1", "open-game"));
    const result = stepShell({ ...opened, stories: [] }, press("stats-play-again", "play-again"));
    expect(result.state.screen).toBe("session");
    expect(result.state.playAgain).toBe(false);
    expect(refusals(result)).toEqual([
      expect.objectContaining({ code: "invalid-state", message: expect.stringContaining("story") }),
    ]);
  });

  it("Play again on a story that is not playable reports invalid-state", () => {
    const opened = step(withoutSave(quit(reachPlay())), press("session-game-1", "open-game"));
    const stories = opened.stories.map((story) => ({
      ...story,
      card: { ...story.card, playable: false },
    }));
    const result = stepShell({ ...opened, stories }, press("stats-play-again", "play-again"));
    expect(result.state.screen).toBe("session");
    expect(refusals(result)).toHaveLength(1);
  });

  it("a Play again that starts reports nothing", () => {
    const opened = step(withoutSave(quit(reachPlay())), press("session-game-1", "open-game"));
    const result = stepShell(opened, press("stats-play-again", "play-again"));
    expect(result.state.screen).toBe("claim-heroes");
    expect(refusals(result)).toEqual([]);
  });

  it("a rating outside 1 to 5 is kept out and reported", () => {
    const opened = step(quit(reachPlay()), press("session-game-1", "open-game"));
    for (const optionId of ["9", "0", "2.5", "abc"]) {
      const result = stepShell(opened, {
        kind: "set-setting",
        v: 1,
        deviceId: "ipad-0",
        settingId: "fun-rating",
        optionId,
      });
      expect(result.state.games[0]?.rating).toBeNull();
      expect(refusals(result)).toEqual([
        expect.objectContaining({
          code: "invalid-state",
          message: expect.stringContaining("1 to 5"),
        }),
      ]);
    }
  });

  it("a rating with no game open is reported", () => {
    const effects: Parameters<typeof rateOpenGame>[2] = [];
    rateOpenGame(quit(reachPlay()), "3", effects);
    expect(effects).toEqual([
      expect.objectContaining({ kind: "press-error", code: "invalid-state" }),
    ]);
  });

  it("a valid rating reports nothing", () => {
    const opened = step(quit(reachPlay()), press("session-game-1", "open-game"));
    const result = stepShell(opened, {
      kind: "set-setting",
      v: 1,
      deviceId: "ipad-0",
      settingId: "fun-rating",
      optionId: "3",
    });
    expect(refusals(result)).toEqual([]);
  });

  it("New game after Play again gets its own seed (DEC-217)", () => {
    const ended = withoutSave(quit(reachPlay()));
    const again = step(
      ended,
      press("session-game-1", "open-game"),
      press("stats-play-again", "play-again"),
    );
    const fresh = { ...again };
    beginNewGame(fresh);
    expect(fresh.screen).toBe("pick-story");
    expect(fresh.seed).not.toBe(again.seed);
    expect(fresh.seed).not.toBe(ended.seed);
  });
});
