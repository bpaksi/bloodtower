import {
  type Browser,
  type BrowserContext,
  expect,
  type Page,
  type TestInfo,
  test,
} from "@playwright/test";
import { openDatabase } from "../../server/db/client.ts";
import { createEventStore } from "../../server/events/store.ts";
import type { MockTower } from "../../server/tower/mock.ts";
import {
  enterWithoutTowerKeepSound,
  enterWithTowerKeepSound,
  holdHeroesFromTest,
  installSessionSocketHook,
  sendPlayPressFromTest,
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
const QUIET_LINE = "The tower has gone quiet. The game waits.";
const QUIT_LINE = "Leave the game? It will be saved.";

// The board and the iPads do not depend on the project's viewport, so one project runs this.
test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Own board and iPad viewports.");
});

const deviceMain = (page: Page) => page.locator("main.bt-device");
const boardMain = (page: Page) => page.locator("main.bt-board");

/** The iPad's body buttons: everything but the bottom bar. */
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

const withEvents = <T>(
  databasePath: string,
  gameId: string,
  read: (events: ReturnType<ReturnType<typeof createEventStore>["listEvents"]>) => T,
) => {
  const opened = openDatabase(databasePath);
  try {
    return read(createEventStore(opened.db).listEvents(gameId));
  } finally {
    opened.close();
  }
};

/** How many presses the host has logged for the game: a press from the iPad adds one. */
const pressCount = (databasePath: string, gameId: string) =>
  withEvents(databasePath, gameId, (events) => events.filter((e) => e.kind === "control-press"))
    .length;

/** Presses the host accepted (winner). It logs a refused press too, with winner false. */
const wonPressCount = (databasePath: string, gameId: string) =>
  withEvents(
    databasePath,
    gameId,
    (events) =>
      events.filter(
        (e) =>
          e.kind === "control-press" &&
          (e.payload as { press?: { winner?: boolean } }).press?.winner === true,
      ).length,
  );

const autosaveGameId = (databasePath: string): string => {
  const opened = openDatabase(databasePath);
  try {
    const row = createEventStore(opened.db).getAutosave();
    if (!row) throw new Error("No autosave.");
    return row.gameId;
  } finally {
    opened.close();
  }
};

/** From a joined iPad to the first setup step, past the Enter and the sound step. */
const toFirstSetup = async (pad: Page, track: "connect" | "without") => {
  if (track === "connect") await enterWithTowerKeepSound(pad);
  else await enterWithoutTowerKeepSound(pad);
  await setSoundAndKeep(pad);
  await clickAct(pad, "continue", `continue-pick-story-${STORY_ID}`);
  await clickAct(pad, "continue", "continue-game-settings");
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "claim-heroes");
  await holdHeroesFromTest(pad, [...HERO_IDS]);
  await clickAct(pad, "continue", "continue-claim-heroes");
  await expect(deviceMain(pad)).toHaveAttribute("data-setup-step", SETUP_IDS[0], {
    timeout: 20_000,
  });
};

/** From the first setup step through Begin and the opening to the play screen. */
const setupToPlay = async (pad: Page) => {
  for (const id of SETUP_IDS) {
    await expect(deviceMain(pad)).toHaveAttribute("data-setup-step", id, { timeout: 20_000 });
    await clickAct(pad, "continue", `continue-setup-${id}`);
  }
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "begin", { timeout: 20_000 });
  await clickAct(pad, "continue", "continue-begin");
  for (const id of OPENING_IDS) await clickAct(pad, "continue", `continue-opening-${id}`);
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 20_000 });
};

const toPlay = async (pad: Page, track: "connect" | "without") => {
  await toFirstSetup(pad, track);
  await setupToPlay(pad);
};

/** The play screen's status: day, moves, who acts, where. */
const readStatus = async (pad: Page) => {
  const line = deviceMain(pad).locator("[data-step-instruction]").first();
  return {
    day: await line.getAttribute("data-day"),
    moves: await line.getAttribute("data-moves"),
    roll: await line.getAttribute("data-roll"),
    hero: await line.getAttribute("data-acting-hero"),
    space: await line.getAttribute("data-space"),
  };
};

/** Presses on until a walk button shows, takes one walk, and returns the status after it. */
const walkOnce = async (pad: Page) => {
  const walk = deviceMain(pad).locator('button[data-action-id="walk"]:not([disabled])').first();
  for (let guard = 0; guard < 200 && (await walk.count()) === 0; guard += 1) {
    if (!(await sendPlayPressFromTest(pad))) await pad.waitForTimeout(50);
    else await pad.waitForTimeout(20);
  }
  await expect(walk).toBeVisible();
  const before = await readStatus(pad);
  await walk.click();
  await expect.poll(async () => (await readStatus(pad)).space).not.toBe(before.space);
  return readStatus(pad);
};

/** Reads the open walk press (prompt and action ids) off the move map without taking it. */
const captureWalkPress = async (pad: Page) => {
  const walk = deviceMain(pad).locator('[data-move-map] button[data-action-id="walk"]').first();
  for (let guard = 0; guard < 200 && (await walk.count()) === 0; guard += 1) {
    if (!(await sendPlayPressFromTest(pad))) await pad.waitForTimeout(50);
    else await pad.waitForTimeout(20);
  }
  const promptId = await walk.getAttribute("data-prompt-id");
  if (!promptId) throw new Error("The move map offers no walk to capture.");
  return { promptId, actionId: "walk" };
};

/** Sends one act on the page's live session socket, as the UI's own tap does. */
const sendActFromTest = (pad: Page, press: { promptId: string; actionId: string }) =>
  pad.evaluate((act) => {
    const socket = (window as unknown as { __btSessionSocket?: WebSocket }).__btSessionSocket;
    if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error("Socket is not open.");
    socket.send(JSON.stringify({ v: 2, type: "act", payload: { ...act, args: {} } }));
  }, press);

const dropTower = async (session: { tower: { loseConnection: () => void } }, pad: Page) => {
  session.tower.loseConnection();
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "pause", { timeout: 20_000 });
};

const types = (tower: MockTower) => tower.sent().map((row) => row.type);

/** Presses on (never a walk or Enter by choice) until the iPad offers the simulated drop's Continue. */
const playToSimulatedDrop = async (pad: Page, board: Page) => {
  const drop = deviceMain(pad).locator('button[data-prompt-id^="skull-sim-day-"]');
  for (let guard = 0; guard < 3000 && (await drop.count()) === 0; guard += 1) {
    await expect(deviceMain(pad).locator('button[data-action-id="record"]')).toHaveCount(0);
    if (!(await sendPlayPressFromTest(pad))) await pad.waitForTimeout(50);
    else await pad.waitForTimeout(10);
  }
  await expect(drop).toBeVisible();
  const line = boardMain(board).locator("[data-waiting]");
  await expect(line).toContainText(/^A skull falls on [^,]+\.$/);
  return (await line.innerText()).trim();
};

test("connect track: the pause, Go on without, and the stand-ins (EV-01, 02, 03, 06, 08, 09, 13)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-08-pause" });
  const { tower, databasePath } = session;
  const contexts: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, session.baseURL);
    contexts.push(board.context);
    const pad = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(pad.context);

    // EV-02: a drop during piece setup pauses on the setup step, and Reconnect returns to it.
    await toFirstSetup(pad.page, "connect");
    await dropTower(session, pad.page);
    await expect.poll(() => bodyLabels(pad.page)).toEqual(["Reconnect", "Go on without", "Quit"]);
    await expect(boardMain(board.page).locator("[data-tower-lost]")).toHaveText("Tower lost");
    await clickAct(pad.page, "reconnect", await reconnectPrompt(pad.page));
    const calibrate = pad.page.locator('button[data-prompt-id="tower-calibrate"]');
    await expect(calibrate).toBeEnabled({ timeout: 20_000 });
    await calibrate.click();
    await expect(deviceMain(pad.page)).toHaveAttribute("data-setup-step", SETUP_IDS[0], {
      timeout: 20_000,
    });
    await setupToPlay(pad.page);

    // EV-01: a tower lost in play pauses with three buttons, in order; nothing else is offered.
    const walked = await walkOnce(pad.page);
    const gameId = autosaveGameId(databasePath);
    const staleWalk = await captureWalkPress(pad.page);
    await dropTower(session, pad.page);
    await expect(deviceMain(pad.page).locator("[data-move-map]")).toHaveCount(0);
    await expect(deviceMain(pad.page).locator('button[data-action-id="walk"]')).toHaveCount(0);
    await expect.poll(() => bodyLabels(pad.page)).toEqual(["Reconnect", "Go on without", "Quit"]);
    await expect(bodyButtons(pad.page).first()).toHaveClass(/bt-primary/);
    const pressesBefore = pressCount(databasePath, gameId);
    await pad.page.waitForTimeout(300);
    expect(pressCount(databasePath, gameId)).toBe(pressesBefore);

    // EV-01: a tap on a move-map space while paused registers nothing. The map is not drawn
    // during the pause, so this replays the walk press captured before the drop over the same
    // session socket the UI uses; the host's stepShell guard must refuse it. The host still logs
    // the press, as a loser, so the count goes up by one and the accepted count does not.
    const wonBefore = wonPressCount(databasePath, gameId);
    await sendActFromTest(pad.page, staleWalk);
    await expect.poll(() => pressCount(databasePath, gameId)).toBe(pressesBefore + 1);
    expect(wonPressCount(databasePath, gameId)).toBe(wonBefore);
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "pause");
    await expect.poll(() => bodyLabels(pad.page)).toEqual(["Reconnect", "Go on without", "Quit"]);

    // EV-13: the board frame and the iPad's lines; no board button.
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "pause");
    await expect(boardMain(board.page).locator("[data-tower-quiet]")).toContainText(QUIET_LINE);
    await expect(boardMain(board.page).locator("[data-tower-lost]")).toHaveText("Tower lost");
    await expect(boardMain(board.page).locator("button")).toHaveCount(0);
    await expect(deviceMain(pad.page).locator("[data-step-instruction]")).toHaveText(QUIET_LINE);

    // EV-09: the pause at 1920×1080 and on an iPad at 768×1024.
    await shot(board.page, "pause-board", testInfo);
    await shot(pad.page, "pause-ipad", testInfo);

    // EV-13, EV-03: Go on without asks first; Back returns to the pause.
    await pad.page.locator('button[data-pause-ask="go-on-without"]').click();
    await expect.poll(() => bodyLabels(pad.page)).toEqual(["Go on without", "Back"]);
    await expect(deviceMain(pad.page).locator("[data-pause-title]")).toHaveText("Go on without");
    await expect(deviceMain(pad.page).locator("[data-step-instruction]")).toHaveText(
      "Are you sure?",
    );
    await expect(bodyButtons(pad.page).first()).toHaveClass(/bt-primary/);
    await shot(pad.page, "go-on-without-confirm-ipad", testInfo);
    await shot(board.page, "go-on-without-confirm-board", testInfo);
    await pad.page.locator("[data-pause-back]").click();
    await expect.poll(() => bodyLabels(pad.page)).toEqual(["Reconnect", "Go on without", "Quit"]);

    // EV-13: Quit asks too, with exactly two answers; Back returns.
    await pad.page.locator('button[data-pause-ask="quit-story"]').click();
    await expect(deviceMain(pad.page).locator("[data-step-instruction]")).toHaveText(QUIT_LINE);
    await expect.poll(() => bodyLabels(pad.page)).toEqual(["Leave", "Back"]);
    await expect(bodyButtons(pad.page).first()).toHaveClass(/bt-primary/);
    await pad.page.locator("[data-pause-back]").click();
    await expect.poll(() => bodyLabels(pad.page)).toEqual(["Reconnect", "Go on without", "Quit"]);

    // EV-06: nothing reconnects on its own, and a press that fails shows its code on this iPad.
    const sentAtDrop = tower.sent().length;
    await pad.page.waitForTimeout(5000);
    expect(tower.sent().length).toBe(sentAtDrop);
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "pause");
    tower.failNextConnect();
    await clickAct(pad.page, "reconnect", await reconnectPrompt(pad.page));
    await expect(
      deviceMain(pad.page).locator('[data-error-code="tower-command-failed"]'),
    ).toBeVisible({
      timeout: 20_000,
    });
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "pause");
    await expect.poll(() => bodyLabels(pad.page)).toEqual(["Reconnect", "Go on without", "Quit"]);

    // EV-13, EV-06: Reconnecting has no body button; then the tower check; play waits for it.
    const release = session.holdNextConnect();
    await clickAct(pad.page, "reconnect", await reconnectPrompt(pad.page));
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "tower-wake", {
      timeout: 20_000,
    });
    await expect(boardMain(board.page)).toContainText("Calling the tower back...");
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "tower-wake");
    await expect(bodyButtons(pad.page)).toHaveCount(0);
    await expect(pad.page.locator('button[data-action-id="reconnect-cancel"]')).toHaveCount(0);
    release();
    const check = pad.page.locator('button[data-prompt-id="tower-calibrate"]');
    await expect(check).toBeEnabled({ timeout: 20_000 });
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "tower-wake");
    await check.click();
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "play", { timeout: 20_000 });
    expect(await readStatus(pad.page)).toEqual(walked);

    // EV-08: Quit from the pause asks, then lands on the session screen as quit.
    await dropTower(session, pad.page);
    await pad.page.locator('button[data-pause-ask="quit-story"]').click();
    await pad.page.locator('button[data-action-id="quit-story"]').click();
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "session", {
      timeout: 20_000,
    });
    expect((await bodyLabels(pad.page))[0]).toBe("Continue");
    await expect(boardMain(board.page).locator("[data-session-row]").last()).toHaveText(
      "Tower lost",
    );
    expect(autosaveGameId(databasePath)).toBe(gameId);
  } finally {
    await closeAll(contexts);
    await session.host.close();
  }
});

test("Go on without: confirm, no tower command, the board names the drop, the Menu's Tower (EV-03, 07, 08, 14)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-08-without" });
  const { tower } = session;
  const contexts: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, session.baseURL);
    contexts.push(board.context);
    const pad = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(pad.context);
    await toPlay(pad.page, "connect");
    const walked = await walkOnce(pad.page);
    await dropTower(session, pad.page);

    // EV-03: ask, Back, ask again, confirm. The same node is offered again.
    await pad.page.locator('button[data-pause-ask="go-on-without"]').click();
    await pad.page.locator("[data-pause-back]").click();
    await expect(
      deviceMain(pad.page).locator('button[data-pause-ask="go-on-without"]'),
    ).toBeVisible();
    await pad.page.locator('button[data-pause-ask="go-on-without"]').click();
    const sentAtConfirm = tower.sent().length;
    await pad.page.locator('button[data-action-id="go-on-without"]').click();
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "play", { timeout: 20_000 });
    expect(await readStatus(pad.page)).toEqual(walked);
    await expect(
      deviceMain(pad.page).locator('button[data-action-id="walk"]').first(),
    ).toBeVisible();

    // EV-14: the Menu's Table group, in order, with Tower enabled and Close last.
    await pad.page.locator('[data-action="menu"]').click();
    const menu = deviceMain(pad.page).locator("[data-menu]");
    const table = menu.locator('section[aria-label="Table"] [data-gear-item]');
    expect(
      (await table.locator(".bt-gear-label").allInnerTexts()).map((text) => text.trim()),
    ).toEqual([
      "Game board setup",
      "Volume",
      "Split party",
      "Use a potion or item",
      "Change who holds whom",
      "Join another iPad",
      "Tower",
      "Pause/Resume",
    ]);
    await expect(menu.locator('[data-gear-item="tower"]')).toBeEnabled();
    expect((await menu.locator("button").last().innerText()).trim()).toBe("Close");

    // EV-07: Tower opens a panel on the board; the iPad has the picks.
    await menu.locator('[data-gear-item="tower"]').click();
    await expect(boardMain(board.page).locator('[data-panel="tower"]')).toContainText("Tower");
    await expect(boardMain(board.page).locator('[data-panel="tower"]')).toContainText(
      "without the tower",
    );
    await expect(deviceMain(pad.page).locator("h2")).toHaveText("See the Story board");
    await expect.poll(() => bodyLabels(pad.page)).toEqual(["Reconnect", "Go on without", "Done"]);
    const sentBeforePick = tower.sent().length;
    await pad.page.locator('[data-tower-pick="Reconnect"]').click();
    await expect(boardMain(board.page).locator("[data-picked]")).toHaveText("Reconnect");
    await expect.poll(() => bodyLabels(pad.page)).toEqual(["Yes", "Back"]);
    await bodyButtons(pad.page).getByText("Back", { exact: true }).click();
    await expect.poll(() => bodyLabels(pad.page)).toEqual(["Reconnect", "Go on without", "Done"]);
    await pad.page.locator('[data-tower-pick="Reconnect"]').click();
    // Picking Reconnect, Back and Reconnect again sends nothing to the tower until Yes.
    expect(tower.sent().length).toBe(sentBeforePick);

    // Cancel: the Menu's Reconnect offers Cancel beside Calibrate; it returns to the Tower panel.
    await bodyButtons(pad.page).getByText("Yes", { exact: true }).click();
    await expect(pad.page.locator('button[data-prompt-id="tower-calibrate"]')).toBeEnabled({
      timeout: 20_000,
    });
    const cancel = pad.page.locator('button[data-action-id="reconnect-cancel"]');
    await expect(cancel).toHaveText("Cancel");
    await cancel.click();
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "play", { timeout: 20_000 });
    await expect(boardMain(board.page).locator('[data-panel="tower"]')).toBeVisible();
    await expect.poll(() => bodyLabels(pad.page)).toEqual(["Reconnect", "Go on without", "Done"]);
    await pad.page.locator('[data-tower-pick="Reconnect"]').click();

    // Yes connects and runs the tower check; the rest of the game uses the tower again.
    await bodyButtons(pad.page).getByText("Yes", { exact: true }).click();
    const check = pad.page.locator('button[data-prompt-id="tower-calibrate"]');
    await expect(check).toBeEnabled({ timeout: 20_000 });
    await check.click();
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "play", { timeout: 20_000 });
    const soundsBefore = types(tower).filter((type) => type === "sound").length;
    for (let guard = 0; guard < 600; guard += 1) {
      if (types(tower).filter((type) => type === "sound").length > soundsBefore) break;
      if (!(await sendPlayPressFromTest(pad.page))) await pad.page.waitForTimeout(50);
      else await pad.page.waitForTimeout(10);
    }
    expect(types(tower).filter((type) => type === "sound").length).toBeGreaterThan(soundsBefore);
    expect(sentAtConfirm).toBeGreaterThan(0);
  } finally {
    await closeAll(contexts);
    await session.host.close();
  }
});

test("Go on without: the day ends with a seeded drop named on the board, then Quit reads without the tower (EV-03, 08)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-08-day" });
  const { tower } = session;
  const contexts: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, session.baseURL);
    contexts.push(board.context);
    const pad = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(pad.context);
    await toPlay(pad.page, "connect");
    await dropTower(session, pad.page);
    await pad.page.locator('button[data-pause-ask="go-on-without"]').click();
    const sentAtConfirm = tower.sent().length;
    await pad.page.locator('button[data-action-id="go-on-without"]').click();
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "play", { timeout: 20_000 });

    // The day ends with no "where did it land" prompt: the board names the building.
    const named = await playToSimulatedDrop(pad.page, board.page);
    expect(named).toMatch(/^A skull falls on \w+/);
    expect(tower.sent().length).toBe(sentAtConfirm);
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "play");
    await clickAct(pad.page, "continue", await dropPrompt(pad.page));

    // EV-08: a quit after Go on without reads without the tower on the session screen.
    await quitFromMenu(pad.page);
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "session", {
      timeout: 20_000,
    });
    await expect(boardMain(board.page).locator("[data-session-row]").last()).toHaveText(
      "without the tower",
    );
    expect(tower.sent().length).toBe(sentAtConfirm);
  } finally {
    await closeAll(contexts);
    await session.host.close();
  }
});

test("Play without Tower: no pause, simulated drops, no tower command (EV-05)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-08-no-tower" });
  const { tower } = session;
  const contexts: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, session.baseURL);
    contexts.push(board.context);
    const pad = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(pad.context);
    await toPlay(pad.page, "without");
    for (let day = 0; day < 2; day += 1) {
      const named = await playToSimulatedDrop(pad.page, board.page);
      expect(named).toMatch(/^A skull falls on \w+/);
      await expect(deviceMain(pad.page)).not.toHaveAttribute("data-screen", "pause");
      await clickAct(pad.page, "continue", await dropPrompt(pad.page));
      await expect(
        deviceMain(pad.page).locator('button[data-prompt-id^="skull-sim-day-"]'),
      ).toHaveCount(0);
    }
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "play");
    expect(tower.sent()).toEqual([]);
  } finally {
    await closeAll(contexts);
    await session.host.close();
  }
});

test("Continue keeps without the tower after a host restart (EV-11)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-08-continue" });
  const { databasePath } = session;
  const contexts: BrowserContext[] = [];
  try {
    const pad = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(pad.context);
    await toPlay(pad.page, "connect");
    await dropTower(session, pad.page);
    await pad.page.locator('button[data-pause-ask="go-on-without"]').click();
    await pad.page.locator('button[data-action-id="go-on-without"]').click();
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "play", { timeout: 20_000 });
    await walkOnce(pad.page);
    await quitFromMenu(pad.page);
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "session", {
      timeout: 20_000,
    });
  } finally {
    await closeAll(contexts.splice(0));
    await session.host.close();
  }

  // The host restarts with the tower connected: the session resumes with tonight's choice.
  const restarted = await startAcceptanceHost(testInfo, { databasePath, seed: "c2-08-continue" });
  restarted.tower.connect();
  restarted.tower.calibrate();
  const sentBefore = restarted.tower.sent().length;
  try {
    const board = await openBoard(browser, restarted.baseURL);
    contexts.push(board.context);
    const pad = await openPad(browser, restarted.baseURL, restarted.host.joinCode);
    contexts.push(pad.context);
    // The evening stood on the session screen, so the restart lands there: no Enter, no tower ask.
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "session", {
      timeout: 30_000,
    });
    await clickAct(pad.page, "continue", "continue-saved-game");
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
    await holdHeroesFromTest(pad.page, [...HERO_IDS]);
    await playToSimulatedDrop(pad.page, board.page);
    await expect(deviceMain(pad.page)).not.toHaveAttribute("data-screen", "pause");
    expect(restarted.tower.sent().length).toBe(sentBefore);
  } finally {
    await closeAll(contexts);
    await restarted.host.close();
  }
});

/** Save and quit from the Menu. The wake-lock notice, when it shows, is dismissed first. */
const quitFromMenu = async (pad: Page) => {
  const dismissWake = pad.locator('[data-action="dismiss-wake-notice"]');
  if ((await dismissWake.count()) > 0) await dismissWake.click();
  await pad.locator('[data-action="menu"]').click();
  await clickAct(pad, "quit-story", "menu-quit");
};

/** The prompt id of the pause's Reconnect press. It carries the pause's serial. */
const reconnectPrompt = async (pad: Page) => {
  const id = await pad.locator('button[data-action-id="reconnect"]').getAttribute("data-prompt-id");
  if (!id) throw new Error("The pause offers no Reconnect.");
  return id;
};

/** The prompt id of the simulated drop's Continue. */
const dropPrompt = async (pad: Page) => {
  const id = await pad
    .locator('button[data-prompt-id^="skull-sim-day-"]')
    .getAttribute("data-prompt-id");
  if (!id) throw new Error("The day offers no simulated drop.");
  return id;
};
