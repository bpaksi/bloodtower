import {
  type Browser,
  type BrowserContext,
  expect,
  type Locator,
  type Page,
  type TestInfo,
  test,
} from "@playwright/test";
import { openDatabase } from "../../server/db/client.ts";
import { createSessionStore } from "../../server/db/store.ts";
import { createEventStore } from "../../server/events/store.ts";
import type { MockTower } from "../../server/tower/mock.ts";
import {
  enterWithoutTowerKeepSound,
  enterWithTowerKeepSound,
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
const JOIN_LINE = "Scan with each iPad. Then pick who this iPad speaks for at the table";

// The board and the iPads do not depend on the project's viewport, so one project runs this.
test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Own board and iPad viewports.");
});

const deviceMain = (page: Page) => page.locator("main.bt-device");
const boardMain = (page: Page) => page.locator("main.bt-board");

/** The iPad's body buttons: everything but the bottom bar (EV-15). */
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

const openPad = async (browser: Browser, baseURL: string, joinCode: string) => {
  const context = await browser.newContext({ baseURL, viewport: IPAD, hasTouch: true });
  const page = await context.newPage();
  await installSessionSocketHook(page);
  await page.goto(`/join?code=${joinCode}`);
  await expect(page).toHaveURL(/\/device/);
  return { context, page };
};

const shot = async (page: Page, name: string, testInfo: TestInfo) => {
  // The board paints its dialog in; the picture waits for that to finish.
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

const types = (tower: MockTower) => tower.sent().map((row) => row.type);

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

/** Pick story to Begin, the opening, then the first play screen. The iPad is past the sound step. */
const playToBegin = async (pad: Page) => {
  await clickAct(pad, "continue", `continue-pick-story-${STORY_ID}`);
  await clickAct(pad, "continue", "continue-game-settings");
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "claim-heroes");
  await holdHeroesFromTest(pad, [...HERO_IDS]);
  await clickAct(pad, "continue", "continue-claim-heroes");
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

/** From a joined iPad to the first quit: the Enter, a whole setup, the opening, Quit story. */
const playOneGame = async (pad: Page, track: "connect" | "without") => {
  if (track === "connect") await enterWithTowerKeepSound(pad);
  else await enterWithoutTowerKeepSound(pad);
  await setSoundAndKeep(pad);
  await playToBegin(pad);
  await playThroughOpening(pad);
  await quitGame(pad);
};

/** The play screen's status: day, the roll, who acts, where, and the roster text. */
const readStatus = async (pad: Page) => {
  const line = deviceMain(pad).locator("[data-step-instruction]").first();
  const roster = deviceMain(pad).locator("[data-roster]");
  return {
    day: await line.getAttribute("data-day"),
    roll: await line.getAttribute("data-roll"),
    hero: await line.getAttribute("data-acting-hero"),
    space: await line.getAttribute("data-space"),
    roster: (await roster.count()) > 0 ? ((await roster.innerText()).trim() as string) : "",
  };
};

const rowTexts = async (board: Page) =>
  (await boardMain(board).locator("[data-session-row]").allInnerTexts()).map((text) =>
    text.trim().replace(/\s+/g, " "),
  );

const noButtons = async (root: Locator) =>
  expect(root.locator(":is(button, input, textarea, select)")).toHaveCount(0);

test("connect track: the session screen, its confirms, Done for tonight, and a new session (EV-01, 04, 05, 06, 07, 11, 15, 16, 17)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  const seed = "c2-06-connect";
  const session = await startAcceptanceHost(testInfo, { seed });
  const { tower, databasePath } = session;
  const contexts: BrowserContext[] = [];
  let before: Awaited<ReturnType<typeof readStatus>> | null = null;
  try {
    const board = await openBoard(browser, session.baseURL);
    contexts.push(board.context);
    const pad = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(pad.context);
    await enterWithTowerKeepSound(pad.page);
    await setSoundAndKeep(pad.page);
    await playToBegin(pad.page);
    await playThroughOpening(pad.page);
    await expect(deviceMain(pad.page).locator("[data-roster]")).toBeVisible({ timeout: 20_000 });
    before = await readStatus(pad.page);
    expect(before.day).toBeTruthy();
    await quitGame(pad.page);
    const quitGameId = autosaveGameId(databasePath);
    expect(quitGameId).toBeTruthy();
    const sentAfterQuit = tower.sent().length;

    // EV-01, EV-15: the board lists the parts in order and carries no button.
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "session");
    expect(await rowTexts(board.page)).toEqual([
      "Continue",
      "New game",
      "Tonight's games",
      "Game 1 quit",
      "Done for tonight",
      "tower: in play",
    ]);
    await noButtons(boardMain(board.page));
    expect(await bodyLabels(pad.page)).toEqual([
      "Continue",
      "New game",
      "Game 1 quit",
      "Done for tonight",
    ]);
    await expect(bodyButtons(pad.page).first()).toHaveClass(/bt-primary/);
    await expect(pad.page.getByRole("button", { name: /delete/i })).toHaveCount(0);
    await expect(pad.page.locator('[data-screen="session"]')).not.toContainText(/pick-game/);
    await shot(board.page, "session-screen-board", testInfo);
    await shot(pad.page, "session-screen-ipad", testInfo);

    // EV-16, EV-04: New game asks, with exactly two answers; Back changes nothing.
    await clickAct(pad.page, "new-game", "session-new-game");
    await expect(deviceMain(pad.page)).toContainText(REPLACE_LINE);
    expect(await bodyLabels(pad.page)).toEqual(["New game", "Back"]);
    await expect(bodyButtons(pad.page).first()).toHaveClass(/bt-primary/);
    await expect(boardMain(board.page)).toContainText(REPLACE_LINE);
    await noButtons(boardMain(board.page));
    await shot(board.page, "replace-save-confirm-board", testInfo);
    await shot(pad.page, "replace-save-confirm-ipad", testInfo);
    await clickAct(pad.page, "back", "session-confirm-back");
    await expect(
      deviceMain(pad.page).locator('button[data-prompt-id="continue-saved-game"]'),
    ).toBeVisible();
    expect(await bodyLabels(pad.page)).toEqual([
      "Continue",
      "New game",
      "Game 1 quit",
      "Done for tonight",
    ]);
    expect(autosaveGameId(databasePath)).toBe(quitGameId);

    // EV-16, EV-05: Done asks first; Back returns, and no tower command goes out (EV-07).
    await clickAct(pad.page, "done-for-tonight", "session-done-tonight");
    await expect(deviceMain(pad.page)).toContainText("Done for tonight");
    await expect(deviceMain(pad.page)).toContainText("Are you sure?");
    expect(await bodyLabels(pad.page)).toEqual(["Done for tonight", "Back"]);
    await expect(bodyButtons(pad.page).first()).toHaveClass(/bt-primary/);
    await expect(boardMain(board.page)).toContainText("Are you sure?");
    await clickAct(pad.page, "back", "session-confirm-back");
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "session");
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "session");
    expect(tower.sent().length).toBe(sentAfterQuit);
    expect(types(tower).filter((type) => type === "idle")).toHaveLength(0);

    // EV-05, EV-07, EV-17: Yes ends the night. One idle, no disconnect, the painting, no button.
    await clickAct(pad.page, "done-for-tonight", "session-done-tonight");
    await clickAct(pad.page, "done-for-tonight", "session-done-confirm");
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "session-over");
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "session-over");
    await expect(boardMain(board.page).locator(".bt-dialog-frame")).toHaveCount(0);
    await expect(boardMain(board.page).locator(".bt-board-backdrop")).toHaveCount(1);
    await expect(deviceMain(pad.page)).toContainText("The session is over");
    await expect(bodyButtons(pad.page)).toHaveCount(0);
    await noButtons(boardMain(board.page));
    await expect.poll(() => types(tower).filter((type) => type === "idle")).toHaveLength(1);
    await pad.page.waitForTimeout(1000);
    expect(types(tower).filter((type) => type === "idle")).toHaveLength(1);
    expect(types(tower)).not.toContain("disconnect");
    expect(autosaveGameId(databasePath)).toBe(quitGameId);
    await expect.poll(() => joinedDevices(databasePath)).toBe(0);
    await shot(board.page, "session-over-board", testInfo);
    await shot(pad.page, "session-over-ipad", testInfo);

    // EV-17: the toolbar stays; "?" opens help; every gear item is disabled with the reason.
    await expect(pad.page.locator('[data-action="help"]')).toBeVisible();
    await pad.page.locator('[data-action="menu"]').click();
    const items = pad.page.locator("[data-menu] [data-gear-item]");
    expect(await items.count()).toBeGreaterThan(0);
    for (const item of await items.all()) {
      await expect(item).toBeDisabled();
      await expect(item.locator("[data-reason]")).toHaveText("The session is over.");
    }
    await pad.page.locator("[data-menu] .bt-menu-close").last().click();
    await pad.page.locator('[data-action="help"]').click();
    await expect(pad.page.locator("[data-help]")).toBeVisible();
    await closeAll(contexts.splice(0));
  } finally {
    await closeAll(contexts);
    await session.host.close();
  }

  // EV-06, EV-11: a new session starts at the join; the autosave is still there to Continue.
  const restarted = await startAcceptanceHost(testInfo, { databasePath, seed });
  const next: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, restarted.baseURL);
    next.push(board.context);
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "table-join");
    await expect(board.page.locator("[data-join-code] .bt-qr-lg svg")).toBeVisible();
    const pad = await openPad(browser, restarted.baseURL, restarted.host.joinCode);
    next.push(pad.context);
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "base-board");
    await enterWithTowerKeepSound(pad.page);
    // EV-03: Pick story, never pick-game, with Continue above the stories.
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "pick-story");
    await setSoundAndKeep(pad.page);
    const order = await deviceMain(pad.page)
      .locator("button[data-prompt-id]")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-prompt-id")));
    expect(order.indexOf("continue-saved-game")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("continue-saved-game")).toBeLessThan(
      order.indexOf(`continue-pick-story-${STORY_ID}`),
    );
    expect(autosaveSeed(databasePath)).toBe(seed);
    await clickAct(pad.page, "continue", "continue-saved-game");
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
    await holdHeroesFromTest(pad.page, [...HERO_IDS]);
    await expect(deviceMain(pad.page).locator("[data-roster]")).toBeVisible({ timeout: 20_000 });
    const after = await readStatus(pad.page);
    expect(after.day).toBe(before?.day);
    expect(after.roster).toBe(before?.roster);
    expect(after.space).toBe(before?.space);
    expect(after.roll).toBe(before?.roll);
    await expect(pad.page.getByText(/seed/i)).toHaveCount(0);
    await expect(board.page.getByText(/seed/i)).toHaveCount(0);
  } finally {
    await closeAll(next);
    await restarted.host.close();
  }
});

test("without the tower: two games newest first, New game replaces the save only at Begin, all iPads dropped (EV-01, 04, 07, 09, 12, 15)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  const seed = "c2-06-without";
  const session = await startAcceptanceHost(testInfo, { seed });
  const { tower, databasePath } = session;
  const contexts: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, session.baseURL);
    contexts.push(board.context);
    const padA = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(padA.context);
    const padB = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(padB.context);
    await playOneGame(padA.page, "without");
    const firstGame = autosaveGameId(databasePath);

    // EV-01: the without track names itself.
    expect(await rowTexts(board.page)).toEqual([
      "Continue",
      "New game",
      "Tonight's games",
      "Game 1 quit",
      "Done for tonight",
      "without the tower",
    ]);
    await expect(deviceMain(padB.page)).toHaveAttribute("data-screen", "session");

    // EV-04: Yes goes to Pick story, Continue is gone, the old row stays until Begin.
    await clickAct(padA.page, "new-game", "session-new-game");
    await clickAct(padA.page, "new-game", "session-new-confirm");
    await expect(deviceMain(padA.page)).toHaveAttribute("data-screen", "pick-story");
    await expect(padA.page.locator('button[data-prompt-id="continue-saved-game"]')).toHaveCount(0);
    expect(autosaveGameId(databasePath)).toBe(firstGame);
    await clickAct(padA.page, "continue", `continue-pick-story-${STORY_ID}`);
    await clickAct(padA.page, "continue", "continue-game-settings");
    await holdHeroesFromTest(padA.page, [...HERO_IDS]);
    await clickAct(padA.page, "continue", "continue-claim-heroes");
    for (const id of SETUP_IDS) {
      await expect(deviceMain(padA.page)).toHaveAttribute("data-setup-step", id, {
        timeout: 20_000,
      });
      await clickAct(padA.page, "continue", `continue-setup-${id}`);
    }
    await expect(deviceMain(padA.page)).toHaveAttribute("data-screen", "begin");
    expect(autosaveGameId(databasePath)).toBe(firstGame);
    await clickAct(padA.page, "continue", "continue-begin");
    await expect.poll(() => autosaveGameId(databasePath)).not.toBe(firstGame);
    await playThroughOpening(padA.page);
    await quitGame(padA.page);

    // EV-15: newest first, each with its quit mark, on the board and on the iPad.
    expect(await rowTexts(board.page)).toEqual([
      "Continue",
      "New game",
      "Tonight's games",
      "Game 2 quit",
      "Game 1 quit",
      "Done for tonight",
      "without the tower",
    ]);
    expect(await bodyLabels(padA.page)).toEqual([
      "Continue",
      "New game",
      "Game 2 quit",
      "Game 1 quit",
      "Done for tonight",
    ]);
    // A game row is pressable and, until feature 07, does nothing.
    await clickAct(padA.page, "open-game", "session-game-1");
    await expect(deviceMain(padA.page)).toHaveAttribute("data-screen", "session");

    // EV-09: one drop blocks nothing; the last drop shows the join QR; a join brings it back.
    await padB.context.close();
    await padA.page.waitForTimeout(600);
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "session");
    await expect(deviceMain(padA.page)).toHaveAttribute("data-screen", "session");
    await expect(deviceMain(padA.page)).not.toHaveAttribute("data-paused", "true");
    await padA.context.close();
    await expect(
      boardMain(board.page).locator("[data-startup-panel='session-dropped']"),
    ).toBeVisible({
      timeout: 20_000,
    });
    await expect(boardMain(board.page).locator("[data-join-code] svg")).toBeVisible();
    await expect(boardMain(board.page).locator(".bt-join-code")).toHaveText(session.host.joinCode);
    await expect(boardMain(board.page)).toContainText(JOIN_LINE);
    await expect(boardMain(board.page)).toContainText(session.host.joinCode);
    await noButtons(boardMain(board.page));
    await shot(board.page, "all-ipads-dropped-board", testInfo);
    const padC = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(padC.context);
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "session");
    await expect(
      boardMain(board.page).locator("[data-startup-panel='session-dropped']"),
    ).toHaveCount(0);
    await expect(deviceMain(padC.page)).toHaveAttribute("data-screen", "session");
    expect((await bodyLabels(padC.page))[0]).toBe("Continue");

    // EV-07: without the tower, nothing at all went to the tower.
    expect(tower.sent()).toEqual([]);
    await shot(padC.page, "all-ipads-dropped-rejoined-ipad", testInfo);
  } finally {
    await closeAll(contexts);
    await session.host.close();
  }

  // EV-12: tonight's games survive a host restart in the same evening.
  const restarted = await startAcceptanceHost(testInfo, { databasePath, seed });
  const next: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, restarted.baseURL);
    next.push(board.context);
    const pad = await openPad(browser, restarted.baseURL, restarted.host.joinCode);
    next.push(pad.context);
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "session", {
      timeout: 30_000,
    });
    expect(await rowTexts(board.page)).toEqual([
      "Continue",
      "New game",
      "Tonight's games",
      "Game 2 quit",
      "Game 1 quit",
      "Done for tonight",
      "without the tower",
    ]);
    expect(restarted.tower.sent()).toEqual([]);
  } finally {
    await closeAll(next);
    await restarted.host.close();
  }
});

test("a restart during play: Pick story with Continue above the stories, no Enter (EV-03)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(240_000);
  const seed = "c2-06-restart";
  const session = await startAcceptanceHost(testInfo, { seed });
  const { databasePath } = session;
  const contexts: BrowserContext[] = [];
  let before: Awaited<ReturnType<typeof readStatus>> | null = null;
  try {
    const pad = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(pad.context);
    await enterWithoutTowerKeepSound(pad.page);
    await setSoundAndKeep(pad.page);
    await playToBegin(pad.page);
    await playThroughOpening(pad.page);
    await expect(deviceMain(pad.page).locator("[data-roster]")).toBeVisible({ timeout: 20_000 });
    before = await readStatus(pad.page);
  } finally {
    await closeAll(contexts);
    await session.host.close();
  }

  const restarted = await startAcceptanceHost(testInfo, { databasePath, seed });
  const next: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, restarted.baseURL);
    next.push(board.context);
    const pad = await openPad(browser, restarted.baseURL, restarted.host.joinCode);
    next.push(pad.context);
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "pick-story", {
      timeout: 30_000,
    });
    await expect(deviceMain(pad.page)).not.toHaveAttribute("data-screen", /pick-game/);
    await setSoundAndKeep(pad.page);
    const order = await deviceMain(pad.page)
      .locator("button[data-prompt-id]")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-prompt-id")));
    expect(order.indexOf("continue-saved-game")).toBeLessThan(
      order.indexOf(`continue-pick-story-${STORY_ID}`),
    );
    await clickAct(pad.page, "continue", "continue-saved-game");
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
    await holdHeroesFromTest(pad.page, [...HERO_IDS]);
    await expect(deviceMain(pad.page).locator("[data-roster]")).toBeVisible({ timeout: 20_000 });
    const after = await readStatus(pad.page);
    expect(after.day).toBe(before?.day);
    expect(after.roster).toBe(before?.roster);
    expect(restarted.tower.sent()).toEqual([]);
  } finally {
    await closeAll(next);
    await restarted.host.close();
  }
});

/** Quit on the connect track, then the mock tower goes away between games. */
const quitThenLoseTower = async (
  browser: Browser,
  session: Awaited<ReturnType<typeof startAcceptanceHost>>,
  contexts: BrowserContext[],
) => {
  const board = await openBoard(browser, session.baseURL);
  contexts.push(board.context);
  const pad = await openPad(browser, session.baseURL, session.host.joinCode);
  contexts.push(pad.context);
  await playOneGame(pad.page, "connect");
  await expect(boardMain(board.page).locator("[data-session-row='tower']")).toHaveText(
    "tower: in play",
  );
  session.tower.loseConnection();
  session.host.syncTower();
  await expect(boardMain(board.page).locator("[data-session-row='tower']")).toHaveText(
    "Tower lost",
    { timeout: 20_000 },
  );
  const sent = session.tower.sent().length;
  await pad.page.waitForTimeout(5000);
  // EV-08: nothing reconnects by itself, and no Reconnect button is offered.
  expect(session.tower.sent().length).toBe(sent);
  await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "session");
  await expect(pad.page.getByRole("button", { name: /reconnect/i })).toHaveCount(0);
  await expect(boardMain(board.page).getByText(/reconnect/i)).toHaveCount(0);
  expect(await bodyLabels(pad.page)).toEqual([
    "Continue",
    "New game",
    "Game 1 quit",
    "Done for tonight",
  ]);
  return { board, pad, sent };
};

test("Tower lost: New game runs the tower block before Pick story (EV-08, EV-13, EV-10)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-06-lost-new" });
  const contexts: BrowserContext[] = [];
  try {
    const { board, pad, sent } = await quitThenLoseTower(browser, session, contexts);
    await shot(board.page, "tower-lost-board", testInfo);
    await shot(pad.page, "tower-lost-ipad", testInfo);
    await clickAct(pad.page, "new-game", "session-new-game");
    await clickAct(pad.page, "new-game", "session-new-confirm");
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "tower-choice");
    await expect(pad.page.locator('button[data-prompt-id="tower-connect"]')).toBeVisible();
    await expect(pad.page.locator('button[data-prompt-id="play-without-tower"]')).toBeVisible();
    expect(session.tower.sent().length).toBe(sent);
    // The block ends where New game was going: Pick story.
    await pad.page.locator('button[data-prompt-id="play-without-tower"]').click();
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "pick-story");
  } finally {
    await closeAll(contexts);
    await session.host.close();
  }
});

test("Tower lost: Continue runs the tower block before the resumed game (EV-08)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-06-lost-continue" });
  const contexts: BrowserContext[] = [];
  try {
    const { pad, sent } = await quitThenLoseTower(browser, session, contexts);
    await clickAct(pad.page, "continue", "continue-saved-game");
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "tower-choice");
    expect(session.tower.sent().length).toBe(sent);
    await pad.page.locator('button[data-prompt-id="play-without-tower"]').click();
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
  } finally {
    await closeAll(contexts);
    await session.host.close();
  }
});

/**
 * A fresh evening: no games tonight and no autosave. Play cannot reach this by itself (a game
 * is recorded when it begins), so the stopped host's last checkpoint is emptied and the host
 * restarts on it, which puts the evening back on the session screen (EV-15).
 */
const emptyTonight = (databasePath: string) =>
  withDatabase(databasePath, (opened) => {
    const store = createEventStore(opened.db);
    const row = store.latestCheckpoint();
    if (!row) throw new Error("No checkpoint to empty.");
    const raw = JSON.parse(row.stateJson) as Record<string, unknown>;
    store.writeCheckpoint({
      gameId: row.gameId,
      day: row.day,
      afterEventSeq: row.afterEventSeq,
      stateJson: JSON.stringify({ ...raw, games: [], autosave: null, screen: "session" }),
      atMonoMs: row.atMonoMs + 1,
      atWall: row.atWall,
      seed: row.seed,
      packVersion: row.packVersion,
      engineVersion: row.engineVersion,
    });
    store.clearAutosave();
  });

test("a fresh evening: No games yet tonight., no Continue, no delete (EV-15)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  const seed = "c2-06-fresh";
  const first = await startAcceptanceHost(testInfo, { seed });
  const { databasePath } = first;
  const contexts: BrowserContext[] = [];
  try {
    const pad = await openPad(browser, first.baseURL, first.host.joinCode);
    contexts.push(pad.context);
    await playOneGame(pad.page, "without");
  } finally {
    await closeAll(contexts);
    await first.host.close();
  }
  emptyTonight(databasePath);

  const restarted = await startAcceptanceHost(testInfo, { databasePath, seed });
  const next: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, restarted.baseURL);
    next.push(board.context);
    const pad = await openPad(browser, restarted.baseURL, restarted.host.joinCode);
    next.push(pad.context);
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "session", {
      timeout: 30_000,
    });
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "session");

    for (const [name, page] of [
      ["board", board.page],
      ["ipad", pad.page],
    ] as const) {
      const screen = page.locator("[data-screen]").first();
      await expect(screen.getByText("No games yet tonight.")).toBeVisible();
      await expect(screen.getByText("Continue", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /delete|remove/i })).toHaveCount(0);
      expect(
        await page
          .locator("[aria-label]")
          .evaluateAll(
            (nodes) =>
              nodes.filter((node) => /delete|remove/i.test(node.getAttribute("aria-label") ?? ""))
                .length,
          ),
        `${name}: no aria-label names delete or remove`,
      ).toBe(0);
      await shot(page, `fresh-${name}`, testInfo);
    }
    // Board: no buttons at all. iPad: body buttons are New game and Done for tonight only.
    await noButtons(boardMain(board.page));
    expect(await bodyLabels(pad.page)).toEqual(["New game", "Done for tonight"]);
    expect(await bodyLabels(pad.page)).not.toContain("Continue");
  } finally {
    await closeAll(next);
    await restarted.host.close();
  }
});
