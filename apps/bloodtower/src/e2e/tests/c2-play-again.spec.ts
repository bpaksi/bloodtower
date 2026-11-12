import {
  type Browser,
  type BrowserContext,
  expect,
  type Page,
  type TestInfo,
  test,
} from "@playwright/test";
import { openDatabase } from "../../server/db/client.ts";
import { createSessionStore } from "../../server/db/store.ts";
import { createEventStore } from "../../server/events/store.ts";
import {
  enterWithoutTowerKeepSound,
  holdHeroesFromTest,
  installSessionSocketHook,
  setSoundAndKeep,
  startAcceptanceHost,
  waitForBoardAnimationsSettled,
} from "./support/acceptance.ts";
import { copyToE2eArtifacts } from "./support/e2e-artifacts.ts";

const BOARD = { width: 1920, height: 1080 } as const;
const IPAD = { width: 768, height: 1024 } as const;
const STORY_ID = "test";
const HERO_IDS = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const SETUP_IDS = ["seals-and-skulls", "place-heroes"] as const;
const OPENING_IDS = ["grey-stair-01", "grey-stair-02", "grey-stair-03", "grey-stair-04"] as const;
const REPLACE_LINE = "This replaces the saved game. Are you sure?";

// The board and the iPads do not depend on the project's viewport, so one project runs this.
test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Own board and iPad viewports.");
});

const deviceMain = (page: Page) => page.locator("main.bt-device");
const boardMain = (page: Page) => page.locator("main.bt-board");
const bodyButtons = (page: Page) => page.locator("main.bt-device .bt-scroll button");
const bodyLabels = async (page: Page) =>
  (await bodyButtons(page).allInnerTexts()).map((text) => text.trim().replace(/\s+/g, " "));

const clickAct = async (page: Page, actionId: string, promptId: string) => {
  const button = page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`);
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const openBoard = async (browser: Browser, baseURL: string) => {
  const context = await browser.newContext({ baseURL, viewport: BOARD });
  const page = await context.newPage();
  await page.goto("/board");
  return { context, page };
};

/** The screens the iPad has shown, in order, so a test can say which ones never appeared. */
const recordScreens = async (page: Page) => {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __btScreens: string[] }).__btScreens = seen;
    const note = () => {
      const screen = document.querySelector("main.bt-device")?.getAttribute("data-screen");
      if (screen && seen.at(-1) !== screen) seen.push(screen);
    };
    new MutationObserver(note).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-screen"],
    });
  });
};

const screensSeen = (page: Page) =>
  page.evaluate(() => [...((window as unknown as { __btScreens?: string[] }).__btScreens ?? [])]);

const openPad = async (browser: Browser, baseURL: string, joinCode: string) => {
  const context = await browser.newContext({ baseURL, viewport: IPAD, hasTouch: true });
  const page = await context.newPage();
  await installSessionSocketHook(page);
  await recordScreens(page);
  await page.goto(`/join?code=${joinCode}`);
  await expect(page).toHaveURL(/\/device/);
  return { context, page };
};

const shot = async (page: Page, name: string, testInfo: TestInfo) => {
  if ((await boardMain(page).count()) > 0) await waitForBoardAnimationsSettled(page);
  const dest = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path: dest, fullPage: false });
  copyToE2eArtifacts(testInfo, dest, `${name}.png`);
};

const closeAll = async (contexts: BrowserContext[]) => {
  for (const context of contexts) {
    await context.close().catch((error: unknown) => {
      throw new Error(`A browser context did not close: ${String(error)}`);
    });
  }
};

const withDatabase = <T>(
  databasePath: string,
  read: (db: ReturnType<typeof openDatabase>) => T,
) => {
  const opened = openDatabase(databasePath);
  try {
    return read(opened);
  } finally {
    opened.close();
  }
};

const autosaveGameId = (databasePath: string): string | null =>
  withDatabase(databasePath, (opened) => createEventStore(opened.db).getAutosave()?.gameId ?? null);

const autosaveSeed = (databasePath: string): string | null =>
  withDatabase(databasePath, (opened) => {
    const store = createEventStore(opened.db);
    const gameId = store.getAutosave()?.gameId;
    return gameId ? (store.lastCheckpoint(gameId)?.seed ?? null) : null;
  });

const joinedDevices = (databasePath: string): number =>
  withDatabase(
    databasePath,
    (opened) =>
      createSessionStore(opened.db)
        .listDevices()
        .filter((row) => row.connected).length,
  );

const playToBegin = async (pad: Page, hold: () => Promise<void>) => {
  await clickAct(pad, "continue", `continue-pick-story-${STORY_ID}`);
  await clickAct(pad, "continue", "continue-game-settings");
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "claim-heroes");
  await hold();
  await clickAct(pad, "continue", "continue-claim-heroes");
  await setupToBegin(pad);
};

/** Each pack setup step, then Begin. */
const setupToBegin = async (pad: Page) => {
  for (const id of SETUP_IDS) {
    await expect(deviceMain(pad)).toHaveAttribute("data-setup-step", id, { timeout: 20_000 });
    await clickAct(pad, "continue", `continue-setup-${id}`);
  }
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "begin", { timeout: 20_000 });
  await clickAct(pad, "continue", "continue-begin");
};

const playThroughOpening = async (pad: Page) => {
  for (const id of OPENING_IDS) {
    await clickAct(pad, "continue", `continue-opening-${id}`);
  }
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 20_000 });
};

const quitGame = async (pad: Page) => {
  const dismissWake = pad.locator('[data-action="dismiss-wake-notice"]');
  if ((await dismissWake.count()) > 0) await dismissWake.click();
  await pad.locator('[data-action="menu"]').click();
  await clickAct(pad, "quit-story", "menu-quit");
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", { timeout: 20_000 });
};

const holdAllFromOnePad = (pad: Page) => () => holdHeroesFromTest(pad, [...HERO_IDS]);

type Pressable = { promptId: string; actionId: string };

/** The play buttons the iPad offers right now, in page order. */
const openPlayButtons = (pad: Page): Promise<Pressable[]> =>
  deviceMain(pad)
    .locator("button[data-prompt-id][data-action-id]:not([disabled])")
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        promptId: node.getAttribute("data-prompt-id") ?? "",
        actionId: node.getAttribute("data-action-id") ?? "",
      })),
    )
    .then((rows) => rows.filter((row) => !row.promptId.startsWith("menu-")));

const dayOf = async (pad: Page) =>
  Number(await deviceMain(pad).locator("[data-step-instruction]").first().getAttribute("data-day"));

/**
 * Plays by the first sensible press until the day shows `untilDay`. It takes the roll, makes one
 * walk a turn and one Enter in all (then Leave), records each day's skull and ends the turn.
 * Returns what it made, so a test can compare it with the stats.
 */
const playUntilDay = async (pad: Page, untilDay: number) => {
  const made = { walks: 0, enters: 0 };
  let walked = false;
  for (let guard = 0; guard < 300; guard += 1) {
    await expect
      .poll(async () => (await openPlayButtons(pad)).length, { timeout: 20_000 })
      .toBeGreaterThan(0);
    if ((await dayOf(pad)) >= untilDay) return made;
    const open = await openPlayButtons(pad);
    const find = (actionId: string) => open.find((row) => row.actionId === actionId);
    const pick =
      find("continue") ??
      find("record") ??
      find("done") ??
      find("leave") ??
      (made.enters > 0 ? undefined : find("enter")) ??
      (walked ? undefined : find("walk")) ??
      find("end-turn");
    if (!pick) throw new Error(`Nothing to press: ${JSON.stringify(open)}`);
    if (pick.actionId === "walk") {
      made.walks += 1;
      walked = true;
    }
    if (pick.actionId === "enter") made.enters += 1;
    if (pick.actionId === "end-turn") walked = false;
    const button = pad.locator(
      `button[data-prompt-id="${pick.promptId}"][data-action-id="${pick.actionId}"]`,
    );
    await button.click();
    // The press is taken once its button is gone, or re-offered under a new view.
    await expect(button.and(pad.locator(":not([disabled])"))).toHaveCount(0, { timeout: 20_000 });
  }
  throw new Error(`Day ${untilDay} was not reached.`);
};

const readStatus = async (pad: Page) => {
  const line = deviceMain(pad).locator("[data-step-instruction]").first();
  const roster = deviceMain(pad).locator("[data-roster]");
  return {
    day: await line.getAttribute("data-day"),
    roll: await line.getAttribute("data-roll"),
    space: await line.getAttribute("data-space"),
    roster: (await roster.count()) > 0 ? (await roster.innerText()).trim() : "",
  };
};

const statRows = async (board: Page) => {
  const rows = await boardMain(board).locator("[data-stat-row]").all();
  const out: Record<string, string> = {};
  for (const row of rows) {
    const label = (await row.getAttribute("data-stat-row")) ?? "";
    out[label] = ((await row.locator("[data-stat-value]").innerText()) ?? "").trim();
  }
  return out;
};

const noButtons = async (page: Page) =>
  expect(boardMain(page).locator(":is(button, input, textarea, select)")).toHaveCount(0);

test("drill in to a quit game, Play again with prefilled claims, and its seed (EV-01, 03, 06, 07, 08, 13, 14, 15)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(420_000);
  const seed = "c2-07-play-again";
  const session = await startAcceptanceHost(testInfo, { seed });
  const { databasePath } = session;
  const contexts: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, session.baseURL);
    contexts.push(board.context);
    const pad = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(pad.context);
    await enterWithoutTowerKeepSound(pad.page);
    await setSoundAndKeep(pad.page);
    await playToBegin(pad.page, holdAllFromOnePad(pad.page));
    await playThroughOpening(pad.page);

    // Two days: walks, one building (the first offered), a skull recorded each day; then quit on day 3.
    const made = await playUntilDay(pad.page, 3);
    expect(made.walks).toBeGreaterThan(0);
    expect(made.enters).toBe(1);
    await quitGame(pad.page);
    const quitGameId = autosaveGameId(databasePath);
    expect(quitGameId).toBeTruthy();
    expect(autosaveSeed(databasePath)).toBe(seed);

    // EV-01, EV-13: the game is picked on the iPad; the board shows its stats, with no button.
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "session");
    await clickAct(pad.page, "open-game", "session-game-1");
    await expect(boardMain(board.page).locator("[data-startup-panel='game-stats']")).toBeVisible();
    await expect(boardMain(board.page).locator("h1")).toHaveText("Game 1");
    await expect(boardMain(board.page).locator("[data-stat-row]")).toHaveCount(7);
    expect(await statRows(board.page)).toEqual({
      Story: "The Ruined Keep",
      Outcome: "quit",
      "Time played": "—",
      "Quit on day": "3",
      "Moves taken": String(made.walks),
      "Buildings entered": "1",
      "Skull drops recorded": "2",
    });
    await noButtons(board.page);
    await expect(boardMain(board.page)).not.toContainText(/\b0\b/);
    await expect
      .poll(() => bodyLabels(pad.page))
      .toEqual(["Play again", "Back", "1", "2", "3", "4", "5"]);
    await expect(bodyButtons(pad.page).first()).toHaveClass(/bt-primary/);
    await expect(deviceMain(pad.page).locator("h1")).toHaveText("Game 1");
    await shot(board.page, "game-stats-board", testInfo);
    await shot(pad.page, "game-stats-ipad", testInfo);

    // The rating is optional: giving it changes nothing else, and Play again stays open.
    await pad.page.locator('[data-rating-option="4"]').click();
    await expect(pad.page.locator('[data-rating-option="4"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(pad.page.locator('button[data-prompt-id="stats-play-again"]')).toBeEnabled();

    // EV-07: Back returns to the session screen, Continue still first.
    await clickAct(pad.page, "back", "stats-back");
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "session");
    await expect(boardMain(board.page).locator("[data-session-rows]")).toBeVisible();
    await expect
      .poll(() => bodyLabels(pad.page))
      .toEqual(["Continue", "New game", "Game 1 quit", "Done for tonight"]);

    // EV-06, EV-14: an autosave exists, so Play again asks first.
    await clickAct(pad.page, "open-game", "session-game-1");
    await clickAct(pad.page, "play-again", "stats-play-again");
    await expect(deviceMain(pad.page)).toContainText(REPLACE_LINE);
    await expect.poll(() => bodyLabels(pad.page)).toEqual(["Play again", "Back"]);
    await expect(bodyButtons(pad.page).first()).toHaveClass(/bt-primary/);
    await expect(boardMain(board.page)).toContainText("Play again?");
    await expect(boardMain(board.page)).toContainText(REPLACE_LINE);
    await noButtons(board.page);
    await shot(board.page, "play-again-confirm-board", testInfo);
    await shot(pad.page, "play-again-confirm-ipad", testInfo);
    // No: the save stays and the stats come back.
    await clickAct(pad.page, "back", "session-confirm-back");
    await expect(boardMain(board.page).locator("[data-startup-panel='game-stats']")).toBeVisible();
    expect(autosaveGameId(databasePath)).toBe(quitGameId);
    expect(autosaveSeed(databasePath)).toBe(seed);

    // Yes: straight to the claims; Pick story and Game settings never show.
    const before = (await screensSeen(pad.page)).length;
    await clickAct(pad.page, "play-again", "stats-play-again");
    await clickAct(pad.page, "play-again", "session-play-again-confirm");
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "claim-heroes", {
      timeout: 20_000,
    });
    expect(autosaveGameId(databasePath)).toBe(quitGameId);

    // EV-03, EV-15: the same heroes on this iPad, selected; one Confirm, open because all are held.
    await expect(deviceMain(pad.page).locator("[data-pick-status]")).toHaveText("4 of 4 picked");
    await expect(boardMain(board.page).locator("[data-claim-count]")).toHaveText("4 of 4 picked");
    await expect(deviceMain(pad.page).locator("[data-claim-state='yours']")).toHaveCount(4);
    for (const hero of HERO_IDS) {
      await expect(
        deviceMain(pad.page).locator(`[data-hero-panel="${hero}"] [data-claim-state]`),
      ).toHaveText("this iPad");
    }
    await expect(deviceMain(pad.page).locator("[data-hunter][aria-pressed='true']")).toHaveCount(4);
    const confirm = pad.page.locator('button[data-prompt-id="continue-claim-heroes"]');
    await expect(confirm).toHaveText("Confirm");
    await expect(confirm).toBeEnabled();
    await expect(confirm).toHaveClass(/bt-primary/);
    await expect(pad.page.locator('button[data-action-id="back"]')).toHaveCount(0);
    await shot(board.page, "claims-prefilled-board", testInfo);
    await shot(pad.page, "claims-prefilled-ipad", testInfo);

    // One press confirms; the pack's setup steps run again, then Begin.
    await confirm.click();
    await setupToBegin(pad.page);
    await playThroughOpening(pad.page);
    const screens = (await screensSeen(pad.page)).slice(before);
    expect(screens).not.toContain("pick-story");
    expect(screens).not.toContain("game-settings");
    // The old save is replaced at the new game's Begin, and the new game has its own seed.
    expect(autosaveGameId(databasePath)).not.toBe(quitGameId);
    expect(autosaveSeed(databasePath)).not.toBe(seed);
    await closeAll(contexts.splice(0));
  } finally {
    await closeAll(contexts);
    await session.host.close();
  }
});

test("Continue after Play again resumes the new game's seed and replay (EV-11)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(420_000);
  const seed = "c2-07-continue";
  const session = await startAcceptanceHost(testInfo, { seed });
  const { databasePath } = session;
  const contexts: BrowserContext[] = [];
  let before: Awaited<ReturnType<typeof readStatus>> | null = null;
  let newSeed: string | null = null;
  try {
    const pad = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(pad.context);
    await enterWithoutTowerKeepSound(pad.page);
    await setSoundAndKeep(pad.page);
    await playToBegin(pad.page, holdAllFromOnePad(pad.page));
    await playThroughOpening(pad.page);
    await quitGame(pad.page);
    expect(autosaveSeed(databasePath)).toBe(seed);

    await clickAct(pad.page, "open-game", "session-game-1");
    await clickAct(pad.page, "play-again", "stats-play-again");
    await clickAct(pad.page, "play-again", "session-play-again-confirm");
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "claim-heroes", {
      timeout: 20_000,
    });
    await clickAct(pad.page, "continue", "continue-claim-heroes");
    await setupToBegin(pad.page);
    await playThroughOpening(pad.page);
    // Day 1: the roll, then one walk.
    await clickAct(pad.page, "continue", "day-1-roll-done");
    const walk = deviceMain(pad.page)
      .locator('button[data-action-id="walk"]:not([disabled])')
      .first();
    await expect(walk).toBeVisible({ timeout: 20_000 });
    await walk.click();
    await expect(deviceMain(pad.page).locator("[data-moves-left]")).toBeVisible();
    before = await readStatus(pad.page);
    await quitGame(pad.page);
    newSeed = autosaveSeed(databasePath);
    expect(newSeed).toBeTruthy();
    expect(newSeed).not.toBe(seed);
  } finally {
    await closeAll(contexts);
    await session.host.close();
  }

  // A host restart, then Continue: the new game's seed, positions and next roll come back.
  const restarted = await startAcceptanceHost(testInfo, { databasePath, seed });
  const next: BrowserContext[] = [];
  try {
    const pad = await openPad(browser, restarted.baseURL, restarted.host.joinCode);
    next.push(pad.context);
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "session", {
      timeout: 30_000,
    });
    expect(autosaveSeed(databasePath)).toBe(newSeed);
    await clickAct(pad.page, "continue", "continue-saved-game");
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
    await holdHeroesFromTest(pad.page, [...HERO_IDS]);
    await expect(deviceMain(pad.page).locator("[data-roster]")).toBeVisible({ timeout: 20_000 });
    const after = await readStatus(pad.page);
    expect(after.day).toBe(before?.day);
    expect(after.roster).toBe(before?.roster);
    expect(after.roll).toBe(before?.roll);
    expect(after.space).toBe(before?.space);
    expect(autosaveSeed(databasePath)).toBe(newSeed);
    expect(autosaveSeed(databasePath)).not.toBe(seed);
  } finally {
    await closeAll(next);
    await restarted.host.close();
  }
});

test("an iPad that left loses its prefill, and Confirm stays closed until all four are held (EV-05, EV-15)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(420_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-07-left" });
  const { databasePath } = session;
  const contexts: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, session.baseURL);
    contexts.push(board.context);
    const padA = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(padA.context);
    await enterWithoutTowerKeepSound(padA.page);
    const padB = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(padB.context);
    await setSoundAndKeep(padA.page);
    await playToBegin(padA.page, async () => {
      await holdHeroesFromTest(padA.page, ["hero-a", "hero-b"]);
      await holdHeroesFromTest(padB.page, ["hero-c", "hero-d"]);
    });
    await playThroughOpening(padA.page);
    await quitGame(padA.page);
    await expect.poll(() => joinedDevices(databasePath)).toBe(2);

    // The second iPad leaves between games.
    await padB.context.close();
    contexts.splice(contexts.indexOf(padB.context), 1);
    await expect.poll(() => joinedDevices(databasePath)).toBe(1);

    await clickAct(padA.page, "open-game", "session-game-1");
    await clickAct(padA.page, "play-again", "stats-play-again");
    await clickAct(padA.page, "play-again", "session-play-again-confirm");
    await expect(deviceMain(padA.page)).toHaveAttribute("data-screen", "claim-heroes", {
      timeout: 20_000,
    });
    await expect(deviceMain(padA.page).locator("[data-pick-status]")).toHaveText("2 of 4 picked");
    await expect(boardMain(board.page).locator("[data-claim-count]")).toHaveText("2 of 4 picked");
    const stateOf = (hero: string) =>
      deviceMain(padA.page).locator(`[data-hero-panel="${hero}"] [data-claim-state]`);
    await expect(stateOf("hero-a")).toHaveText("this iPad");
    await expect(stateOf("hero-b")).toHaveText("this iPad");
    await expect(stateOf("hero-c")).toHaveText("unclaimed");
    await expect(stateOf("hero-d")).toHaveText("unclaimed");
    // The left iPad's heroes are not held by anyone, and can be claimed here.
    await expect(boardMain(board.page).locator('[data-hero="hero-c"]')).toHaveAttribute(
      "data-held",
      "false",
    );
    await expect(boardMain(board.page).locator('[data-hero="hero-d"]')).toHaveAttribute(
      "data-held",
      "false",
    );
    const confirm = padA.page.locator('button[data-prompt-id="continue-claim-heroes"]');
    await expect(confirm).toHaveText("Confirm");
    await expect(confirm).toBeDisabled();
    await padA.page.locator('[data-hunter="hero-c"]').click();
    await expect(confirm).toBeDisabled();
    await padA.page.locator('[data-hunter="hero-d"]').click();
    await expect(deviceMain(padA.page).locator("[data-pick-status]")).toHaveText("4 of 4 picked");
    await expect(confirm).toBeEnabled();
    await shot(board.page, "claims-left-ipad-board", testInfo);
    await shot(padA.page, "claims-left-ipad-ipad", testInfo);
  } finally {
    await closeAll(contexts);
    await session.host.close();
  }
});
