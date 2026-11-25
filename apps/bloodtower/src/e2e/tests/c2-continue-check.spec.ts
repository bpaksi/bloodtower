import {
  type Browser,
  type BrowserContext,
  expect,
  type Page,
  type TestInfo,
  test,
} from "@playwright/test";
import { OPENING_MOMENTS, openingPromptId } from "../../protocols/opening.ts";
import { openDatabase } from "../../server/db/client.ts";
import { createEventStore } from "../../server/events/store.ts";
import {
  enterWithTower,
  gateControls,
  holdHeroesFromTest,
  installSessionSocketHook,
  passChapterCard,
  releaseTogether,
  startAcceptanceHost,
  waitForBoardAnimationsSettled,
} from "./support/acceptance.ts";
import { copyToE2eArtifacts } from "./support/e2e-artifacts.ts";

/**
 * C2/11 Continue's piece check (DEC-283, DEC-710, DEC-716, DEC-717, MEC-018, PT-08):
 * EV-01, EV-03, EV-08, EV-09, EV-11, EV-16, EV-18, EV-21, EV-22.
 */

const STORY_ID = "test";
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const HEROES_2 = ["hero-a", "hero-b"] as const;
const BOARD_SIZE = { width: 1920, height: 1080 };
const IPAD_PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const IPAD_LANDSCAPE = { viewport: { width: 1024, height: 768 }, hasTouch: true as const };
const DEVICE_TOKEN_KEY = "bloodtower.deviceToken";

type WireTable = {
  day: number;
  purse?: unknown;
  phase?: string | null;
  groups?: { heroId: string; spaceId: string }[];
  unconfirmedPieces?: number;
};

type HookWindow = {
  __btLastBoardView?: { table?: WireTable | null; screen?: string };
};

const deviceMain = (page: Page) => page.locator("main.bt-device");
const boardMain = (page: Page) => page.locator("main.bt-board");

const installBoardHook = async (page: Page) => {
  await page.addInitScript(() => {
    const Native = window.WebSocket;
    class BoardTrackingWebSocket extends Native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        if (!String(url).includes("/ws")) return;
        this.addEventListener("message", (event) => {
          try {
            const message = JSON.parse(String(event.data)) as {
              type?: string;
              payload?: { table?: WireTable | null; screen?: string };
            };
            if (message.type === "boardView" && message.payload) {
              (window as unknown as HookWindow).__btLastBoardView = message.payload;
            }
          } catch {
            // Ignore non-JSON frames.
          }
        });
      }
    }
    window.WebSocket = BoardTrackingWebSocket;
  });
};

const wireTable = (board: Page) =>
  board.evaluate(() => (window as unknown as HookWindow).__btLastBoardView?.table ?? null);

const openBoard = async (browser: Browser, baseURL: string, contexts: BrowserContext[]) => {
  const context = await browser.newContext({ baseURL, viewport: BOARD_SIZE });
  contexts.push(context);
  const page = await context.newPage();
  await installBoardHook(page);
  await page.goto("/board");
  return page;
};

const openPad = async (
  browser: Browser,
  baseURL: string,
  joinCode: string,
  contexts: BrowserContext[],
  options: {
    viewport?: { width: number; height: number };
    token?: string;
    gate?: boolean;
  } = {},
) => {
  const vp = options.viewport ?? IPAD_PORTRAIT.viewport;
  const context = await browser.newContext({ baseURL, viewport: vp, hasTouch: true });
  contexts.push(context);
  const page = await context.newPage();
  if (options.token) {
    await page.addInitScript(({ key, token }) => sessionStorage.setItem(key, token), {
      key: DEVICE_TOKEN_KEY,
      token: options.token,
    });
  }
  await installSessionSocketHook(page);
  const gate = options.gate ? await gateControls(page) : null;
  await page.goto(`/join?code=${joinCode}`);
  await expect(page).toHaveURL(/\/device/, { timeout: 20_000 });
  return { page, gate };
};

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const selector = promptId
    ? `button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`
    : `button[data-action-id="${actionId}"]`;
  const button = page.locator(selector).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const closeAll = async (contexts: BrowserContext[]) => {
  for (const context of contexts.splice(0)) {
    await context.close().catch(() => undefined);
  }
};

const quitToSession = async (pad: Page) => {
  const dismissWake = pad.locator('[data-action="dismiss-wake-notice"]');
  if ((await dismissWake.count()) > 0) await dismissWake.click();
  await pad.locator('[data-action="menu"]').click();
  const quitItem = pad.locator('button[data-gear-item="save-and-quit"]');
  if ((await quitItem.count()) > 0) {
    await quitItem.click();
    await pad.locator("[data-menu]").getByRole("button", { name: "Save and quit" }).click();
  } else {
    await clickAct(pad, "quit-story", "menu-quit");
  }
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", { timeout: 30_000 });
};

/** Starts a 2-hero game with the mock tower and hints off, reaching Day 1 play past chapter card. */
const startTowerGameToDay1 = async (
  pad: Page,
  waitClock: { advance: (ms: number) => void } | null,
) => {
  await enterWithTower(pad);
  await clickAct(pad, "continue", `continue-pick-story-${STORY_ID}`);
  await pad.locator('button[data-setting="party-size"][data-option="n-2"]').click();
  await pad.locator('button[data-setting="hints"][data-option="off"]').click();
  await clickAct(pad, "continue", "continue-game-settings");
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "claim-heroes", { timeout: 20_000 });
  await holdHeroesFromTest(pad, [...HEROES_2]);
  await clickAct(pad, "continue", "continue-claim-heroes");
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "setup", { timeout: 20_000 });
  for (const id of SETUP_IDS) {
    await expect(deviceMain(pad)).toHaveAttribute("data-setup-step", id, { timeout: 20_000 });
    if (id === "starting-purse") await clickAct(pad, "spin", "spin-setup-starting-purse");
    await clickAct(pad, "continue", `continue-setup-${id}`);
  }
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "begin", { timeout: 20_000 });
  await clickAct(pad, "continue", "continue-begin");
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 20_000 });
  for (const moment of OPENING_MOMENTS) {
    await clickAct(pad, "continue", openingPromptId(moment));
  }
  await passChapterCard(pad, waitClock);
};

/** Plays Day 1 with the mock tower to Day 2, recording any night skull on a building (never inside). */
const playDay1ToDay2WithTower = async (
  pad: Page,
  board: Page,
  waitClock: { advance: (ms: number) => void } | null,
) => {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const table = await wireTable(board);
    if (table?.day && table.day >= 2) return;
    if (table?.phase === "effects" && waitClock) {
      waitClock.advance(4_100);
      await pad.waitForTimeout(150);
      continue;
    }
    // Prefer building skull records (never `inside`) so EV-01 has 0 trapped skulls.
    const buildingRecord = deviceMain(pad)
      .locator('button[data-action-id="record"]:not([data-prompt-id$="--inside"]):enabled')
      .first();
    if ((await buildingRecord.count()) > 0) {
      await buildingRecord.click();
      await pad.waitForTimeout(150);
      continue;
    }
    const next = deviceMain(pad)
      .locator(
        'button[data-action-id="continue"]:enabled, button[data-action-id="end-turn"]:enabled, button[data-action-id="done"]:enabled, button[data-action-id="leave"]:enabled',
      )
      .first();
    if ((await next.count()) > 0) {
      await next.click();
      await pad.waitForTimeout(150);
      continue;
    }
    if (waitClock) waitClock.advance(4_100);
    await pad.waitForTimeout(150);
  }
  throw new Error("Never reached Day 2.");
};

/** Reads piece-check confirm/skip press rows from the SQLite event log for the autosave game. */
const readPieceCheckPressLog = (databasePath: string) => {
  const opened = openDatabase(databasePath);
  try {
    const store = createEventStore(opened.db);
    const autosave = store.getAutosave();
    if (!autosave) throw new Error("No autosave row.");
    const rows = store.listEvents(autosave.gameId);
    const presses: Array<{ promptId: string; action: string; winner: boolean }> = [];
    for (const row of rows) {
      if (row.kind !== "control-press") continue;
      const parsed = JSON.parse(row.payload) as {
        press?: { promptId?: string; action?: string; winner?: boolean };
      };
      const promptId = parsed.press?.promptId ?? "";
      if (!promptId.startsWith("piece-check-")) continue;
      presses.push({
        promptId,
        action: parsed.press?.action ?? "",
        winner: Boolean(parsed.press?.winner),
      });
    }
    return {
      gameId: autosave.gameId,
      seed: store.lastCheckpoint(autosave.gameId)?.seed ?? null,
      presses,
    };
  } finally {
    opened.close();
  }
};

const shoot = async (page: Page, name: string, testInfo: TestInfo) => {
  const dest = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path: dest });
  copyToE2eArtifacts(testInfo, dest, `${name}.png`);
  await testInfo.attach(name, { path: dest, contentType: "image/png" });
};

/** Asserts that a board piece-check step has a visible picture (img/svg/canvas) and 0 buttons. */
const expectBoardStepPictureNoButtons = async (board: Page) => {
  const main = boardMain(board);
  const picture = main.locator("[data-piece-check-diagram], img, svg, canvas").first();
  await expect(picture).toBeVisible({ timeout: 20_000 });
  await expect(main.locator("button")).toHaveCount(0);
};

test.describe("C2/11 Continue piece check", { tag: "@ipad-only" }, () => {
  test("continue after a restart (EV-01, EV-11)", async ({ browser }, testInfo) => {
    test.setTimeout(300_000);
    const seed = "c2-11-ev01~test-event:none";
    const session = await startAcceptanceHost(testInfo, {
      seed,
      fakeWait: true,
      lanHost: () => "192.0.2.10",
    });
    const { databasePath } = session;
    const contexts: BrowserContext[] = [];
    let savedToken = "";
    let beforeDay = 0;
    let beforeGroups: string[] = [];
    let beforePurse: unknown = null;
    let beforeSeed: string | null = null;
    try {
      const board = await openBoard(browser, session.baseURL, contexts);
      const { page: pad } = await openPad(
        browser,
        session.baseURL,
        session.host.joinCode,
        contexts,
      );
      await startTowerGameToDay1(pad, session.waitClock);
      await playDay1ToDay2WithTower(pad, board, session.waitClock);

      const table = await wireTable(board);
      beforeDay = table?.day ?? 0;
      expect(beforeDay).toBe(2);
      beforeGroups = (table?.groups ?? []).map((g) => `${g.heroId}@${g.spaceId}`);
      beforePurse = table?.purse ?? null;
      savedToken = (await pad.evaluate((k) => sessionStorage.getItem(k), DEVICE_TOKEN_KEY)) ?? "";
      expect(savedToken).not.toBe("");

      await quitToSession(pad);
      beforeSeed = readPieceCheckPressLog(databasePath).seed;
      expect(beforeSeed).toBe(seed);
    } finally {
      await closeAll(contexts);
      await session.host.close();
    }

    // Restart the host: mock tower stays connected, session resumes on session screen with no Enter.
    const restarted = await startAcceptanceHost(testInfo, {
      databasePath,
      seed,
      fakeWait: true,
      lanHost: () => "192.0.2.10",
    });
    restarted.tower.connect();
    restarted.tower.calibrate();
    restarted.host.syncTower();
    try {
      const board = await openBoard(browser, restarted.baseURL, contexts);
      const { page: pad } = await openPad(
        browser,
        restarted.baseURL,
        restarted.host.joinCode,
        contexts,
        { token: savedToken },
      );

      // Resumes with tonight's tower choice on the session screen — no Enter, no tower question.
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", { timeout: 30_000 });
      const seenScreens: string[] = [];
      const seenSteps: string[] = [];
      const recordScreen = async () => {
        const s = await deviceMain(pad).getAttribute("data-screen");
        if (s && seenScreens.at(-1) !== s) seenScreens.push(s);
      };
      await recordScreen();

      await clickAct(pad, "continue", "continue-saved-game");

      // Walk through the check steps in order.
      for (const expectedStep of ["hero-minis", "skulls", "quest-tokens"]) {
        await expect(deviceMain(pad)).toHaveAttribute("data-screen", "piece-check", {
          timeout: 20_000,
        });
        await expect(deviceMain(pad)).toHaveAttribute("data-piece-check-step", expectedStep, {
          timeout: 20_000,
        });
        await expect(boardMain(board)).toHaveAttribute("data-piece-check-step", expectedStep, {
          timeout: 20_000,
        });
        await recordScreen();
        seenSteps.push(expectedStep);
        await clickAct(pad, "confirm", `piece-check-${expectedStep}`);
      }

      // Resumes Day 2 directly with no setup/settings/claim/tower screens shown.
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
      await recordScreen();
      expect(seenSteps).toEqual(["hero-minis", "skulls", "quest-tokens"]);
      for (const forbidden of [
        "base-board",
        "tower-choice",
        "tower-wake",
        "game-settings",
        "claim-heroes",
        "setup",
        "begin",
      ]) {
        expect(seenScreens).not.toContain(forbidden);
      }

      // EV-11: day, group positions, purse, claims, and seed match; seed is not shown.
      await expect.poll(async () => (await wireTable(board))?.day, { timeout: 20_000 }).toBe(2);
      const afterTable = await wireTable(board);
      expect((afterTable?.groups ?? []).map((g) => `${g.heroId}@${g.spaceId}`)).toEqual(
        beforeGroups,
      );
      expect(afterTable?.purse).toEqual(beforePurse);
      expect(readPieceCheckPressLog(databasePath).seed).toBe(beforeSeed);
      await expect(boardMain(board).getByText(/c2-11-ev01/i)).toHaveCount(0);
      await expect(deviceMain(pad).getByText(/c2-11-ev01/i)).toHaveCount(0);
      // Both heroes stay claimed on this iPad (no disconnect pause).
      await expect(deviceMain(pad)).not.toHaveAttribute("data-screen", "pause");
    } finally {
      await closeAll(contexts);
      await restarted.host.close();
    }
  });

  test("EV-03: Done confirms, Skip leaves unconfirmed badge beside Tower, two iPads first press wins", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const seed = "c2-11-ev03~test-event:none";
    const session = await startAcceptanceHost(testInfo, {
      seed,
      fakeWait: true,
      lanHost: () => "192.0.2.10",
    });
    const contexts: BrowserContext[] = [];
    try {
      const board = await openBoard(browser, session.baseURL, contexts);
      const padA = await openPad(browser, session.baseURL, session.host.joinCode, contexts, {
        gate: true,
      });
      const padB = await openPad(browser, session.baseURL, session.host.joinCode, contexts, {
        gate: true,
      });

      await startTowerGameToDay1(padA.page, session.waitClock);
      await quitToSession(padA.page);
      await clickAct(padA.page, "continue", "continue-saved-game");

      // Step 1 (hero-minis): both iPads show Done and Skip. Hold both presses and release together.
      for (const pad of [padA.page, padB.page]) {
        await expect(deviceMain(pad)).toHaveAttribute("data-piece-check-step", "hero-minis", {
          timeout: 20_000,
        });
        await expect(deviceMain(pad).locator('button[data-action-id="confirm"]')).toBeVisible();
        await expect(deviceMain(pad).locator('button[data-action-id="skip"]')).toBeVisible();
      }
      if (!padA.gate || !padB.gate) throw new Error("Missing control gates.");
      padA.gate.hold();
      padB.gate.hold();
      await deviceMain(padA.page).locator('button[data-action-id="confirm"]').click();
      await deviceMain(padB.page).locator('button[data-action-id="skip"]').click();
      await padA.gate.held(1);
      await padB.gate.held(1);
      // Both presses go out together over two sockets, so either can reach the host first. The
      // first to arrive wins hero-minis; the other finds the step closed and changes nothing (#631).
      releaseTogether(padA.gate, padB.gate);

      // Both iPads advance to skulls (not past it — second press changed nothing).
      for (const pad of [padA.page, padB.page]) {
        await expect(deviceMain(pad)).toHaveAttribute("data-piece-check-step", "skulls", {
          timeout: 20_000,
        });
        await expect(deviceMain(pad).locator('button[data-action-id="confirm"]')).toBeVisible();
        await expect(deviceMain(pad).locator('button[data-action-id="skip"]')).toBeVisible();
      }

      // Skip skulls; Done quest-tokens.
      await clickAct(padB.page, "skip", "piece-check-skulls");
      await expect(deviceMain(padA.page)).toHaveAttribute("data-piece-check-step", "quest-tokens", {
        timeout: 20_000,
      });
      await clickAct(padA.page, "confirm", "piece-check-quest-tokens");

      // In play: board top band shows outline badge beside Tower; heroes are not marked.
      await expect(deviceMain(padA.page)).toHaveAttribute("data-screen", "play", {
        timeout: 30_000,
      });

      // SQLite event log: exactly one winning press for hero-minis (Done or Skip, whichever arrived
      // first), 1 winning skip for skulls and 1 winning confirm for quest-tokens.
      const { presses } = readPieceCheckPressLog(session.databasePath);
      const winners = presses.filter((p) => p.winner);
      const heroMinis = presses.filter((p) => p.promptId === "piece-check-hero-minis");
      expect(heroMinis.map((p) => p.action).sort()).toEqual(["confirm", "skip"]);
      const heroMinisWinners = heroMinis.filter((p) => p.winner);
      expect(heroMinisWinners).toHaveLength(1);
      // Skipped steps stay unconfirmed: skulls always, hero-minis only when Skip won it.
      const unconfirmed = heroMinisWinners[0]?.action === "skip" ? "2" : "1";
      const towerBand = boardMain(board).locator("#band [data-band-tower]");
      await expect(towerBand).toBeVisible({ timeout: 20_000 });
      const badge = towerBand.locator("[data-unconfirmed-badge]");
      await expect(badge).toBeVisible();
      await expect(badge).toHaveClass(/bt-badge--outline/);
      await expect(badge).toHaveAttribute("data-unconfirmed-count", unconfirmed);
      await expect(badge).toContainText(unconfirmed);
      await expect(
        boardMain(board).locator("[data-hero-panel] [data-unconfirmed-badge]"),
      ).toHaveCount(0);

      expect(
        winners.filter((p) => p.promptId === "piece-check-skulls" && p.action === "skip"),
      ).toHaveLength(1);
      expect(
        winners.filter((p) => p.promptId === "piece-check-quest-tokens" && p.action === "confirm"),
      ).toHaveLength(1);
    } finally {
      await closeAll(contexts);
      await session.host.close();
    }
  });

  test("EV-08, EV-21: without the tower, tower steps drop out and quest tokens stay", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const seed = "c2-11-ev08~test-event:none";
    const session = await startAcceptanceHost(testInfo, {
      seed,
      fakeWait: true,
      lanHost: () => "192.0.2.10",
    });
    const contexts: BrowserContext[] = [];
    try {
      const board = await openBoard(browser, session.baseURL, contexts);
      const { page: pad } = await openPad(
        browser,
        session.baseURL,
        session.host.joinCode,
        contexts,
      );
      await startTowerGameToDay1(pad, session.waitClock);
      // Seed an off-home drum and 1 trapped skull inside the tower; chapter 1 already has open quest tokens.
      await session.host.applyTestSeed("~test-drums:2,1,0~test-inside:1");
      await quitToSession(pad);

      // Drop the tower between games, then press Continue -> Play without Tower.
      session.tower.loseConnection();
      session.host.syncTower();
      await expect(boardMain(board).locator("[data-session-row='tower']")).toHaveText(
        "Tower lost",
        {
          timeout: 20_000,
        },
      );
      const sentBeforeContinue = session.tower.sent().length;
      await clickAct(pad, "continue", "continue-saved-game");
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "tower-choice", {
        timeout: 20_000,
      });
      await clickAct(pad, "play-without-tower", "play-without-tower");

      // Must show minis, skulls, and quest-tokens ONLY — no drums, no trapped-skulls.
      const seenSteps: string[] = [];
      for (const expected of ["hero-minis", "skulls", "quest-tokens"]) {
        await expect(deviceMain(pad)).toHaveAttribute("data-screen", "piece-check", {
          timeout: 20_000,
        });
        await expect(deviceMain(pad)).toHaveAttribute("data-piece-check-step", expected, {
          timeout: 20_000,
        });
        seenSteps.push(expected);
        await clickAct(pad, "confirm", `piece-check-${expected}`);
      }

      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
      expect(seenSteps).toEqual(["hero-minis", "skulls", "quest-tokens"]);
      expect(session.tower.sent().length).toBe(sentBeforeContinue);
    } finally {
      await closeAll(contexts);
      await session.host.close();
    }
  });

  test("EV-16: steps 1 to 6 match mockup (board 1920x1080, iPad 768x1024), Done disabled on step 5 until turned", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const seed = "c2-11-ev16~test-event:none";
    const session = await startAcceptanceHost(testInfo, {
      seed,
      fakeWait: true,
      lanHost: () => "192.0.2.10",
    });
    const contexts: BrowserContext[] = [];
    try {
      const board = await openBoard(browser, session.baseURL, contexts);
      const { page: pad } = await openPad(
        browser,
        session.baseURL,
        session.host.joinCode,
        contexts,
        { viewport: IPAD_PORTRAIT.viewport },
      );
      await startTowerGameToDay1(pad, session.waitClock);
      // Fixture with no open quest tokens, plus skulls, foe, broken seal, off-home drums, 2 trapped skulls.
      await session.host.applyTestSeed(
        "~test-quests-done:herald+ambush~test-skulls:N-dayside=1,E-duwani=2~test-foes:brigand@N-dayside~test-broken-seals:road-seal~test-drums:2,1,0~test-inside:2",
      );
      await quitToSession(pad);
      await clickAct(pad, "continue", "continue-saved-game");

      const checkBoardStep = async (
        stepId: string,
        stepNumber: string,
        expectedLineOrTitle: string,
        isTitle = false,
      ) => {
        await expect(boardMain(board)).toHaveAttribute("data-screen", "piece-check", {
          timeout: 20_000,
        });
        await expect(boardMain(board)).toHaveAttribute("data-piece-check-step", stepId, {
          timeout: 20_000,
        });
        await expect(boardMain(board)).toHaveAttribute("data-piece-check-number", stepNumber);
        await expectBoardStepPictureNoButtons(board);
        const target = isTitle
          ? boardMain(board).locator("[data-piece-check-title]")
          : boardMain(board).locator("[data-piece-check-line]");
        await expect(target).toHaveText(expectedLineOrTitle);
      };

      const checkStandardPadButtons = async () => {
        const done = deviceMain(pad).locator('button[data-action-id="confirm"]');
        const skip = deviceMain(pad).locator('button[data-action-id="skip"]');
        await expect(done).toHaveText("Done");
        await expect(done).toHaveClass(/bt-primary/);
        await expect(done).toBeEnabled();
        await expect(skip).toHaveText("Skip");
        await expect(skip).toHaveClass(/bt-secondary/);
        await expect(skip).toBeEnabled();
        return { done, skip };
      };

      // Step 1: hero-minis
      await checkBoardStep("hero-minis", "1", "Set each hero on their saved space.");
      const s1 = await checkStandardPadButtons();
      await s1.done.click();

      // Step 2: skulls
      await checkBoardStep("skulls", "2", "Put the skulls back on each building.");
      const s2 = await checkStandardPadButtons();
      await s2.done.click();

      // Step 3: foes (skip this one to check badge!)
      await checkBoardStep("foes", "3", "Set the foes back where they stood.");
      const s3 = await checkStandardPadButtons();
      await s3.skip.click();

      // Step 4: broken-seals (badge now shows 1 beside Tower)
      await checkBoardStep("broken-seals", "4", "Mark the broken seals.");
      await expect(boardMain(board).locator("[data-unconfirmed-badge]")).toContainText("1");
      const s4 = await checkStandardPadButtons();
      await s4.done.click();

      // Step 5: drums — Turn the drums (primary), Done and Skip together, Done disabled until turned
      await checkBoardStep("drums", "5", "Turn the drums to the saved game", true);
      const turn = deviceMain(pad).locator('button[data-action-id="turn-drums"]');
      const done5 = deviceMain(pad).locator('button[data-action-id="confirm"]');
      const skip5 = deviceMain(pad).locator('button[data-action-id="skip"]');
      await expect(turn).toHaveText("Turn the drums");
      await expect(turn).toHaveClass(/bt-primary/);
      await expect(turn).toBeEnabled();
      await expect(done5).toHaveText("Done");
      await expect(done5).toBeDisabled();
      await expect(skip5).toHaveText("Skip");
      await expect(skip5).toBeEnabled();

      await turn.click();
      await expect(done5).toBeEnabled({ timeout: 20_000 });
      await done5.click();

      // Step 6: trapped-skulls
      await checkBoardStep("trapped-skulls", "6", "Drop 2 skulls back in the top of the tower.");
      const s6 = await checkStandardPadButtons();
      await s6.done.click();

      // In play: board top band shows outline badge beside Tower with count = 1.
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
      const badge = boardMain(board).locator("#band [data-band-tower] [data-unconfirmed-badge]");
      await expect(badge).toBeVisible({ timeout: 20_000 });
      await expect(badge).toHaveClass(/bt-badge--outline/);
      await expect(badge).toHaveAttribute("data-unconfirmed-count", "1");
    } finally {
      await closeAll(contexts);
      await session.host.close();
    }
  });

  test("EV-18: step order 1, 2, 3, 4, 4a, 5, 6 with tower and 1..4a without tower", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const seed = "c2-11-ev18~test-event:none";
    const session = await startAcceptanceHost(testInfo, {
      seed,
      fakeWait: true,
      lanHost: () => "192.0.2.10",
    });
    const contexts: BrowserContext[] = [];
    try {
      const board = await openBoard(browser, session.baseURL, contexts);
      const { page: pad } = await openPad(
        browser,
        session.baseURL,
        session.host.joinCode,
        contexts,
      );
      await startTowerGameToDay1(pad, session.waitClock);
      // Keep chapter 1 open quests + add skulls, foe, broken seal, off-home drum, 1 trapped skull.
      await session.host.applyTestSeed(
        "~test-skulls:N-dayside=1~test-foes:brigand@N-dayside~test-broken-seals:road-seal~test-drums:2,0,0~test-inside:1",
      );
      await quitToSession(pad);

      // Run (a): with mock tower — Done on all except Skip on quest-tokens.
      await clickAct(pad, "continue", "continue-saved-game");
      const seenA: Array<{ step: string; number: string }> = [];
      const expectedA = [
        { step: "hero-minis", number: "1" },
        { step: "skulls", number: "2" },
        { step: "foes", number: "3" },
        { step: "broken-seals", number: "4" },
        { step: "quest-tokens", number: "4a" },
        { step: "drums", number: "5" },
        { step: "trapped-skulls", number: "6" },
      ] as const;

      for (const item of expectedA) {
        await expect(boardMain(board)).toHaveAttribute("data-piece-check-step", item.step, {
          timeout: 20_000,
        });
        await expect(boardMain(board)).toHaveAttribute("data-piece-check-number", item.number);
        await expectBoardStepPictureNoButtons(board);
        await expect(deviceMain(pad).locator('button[data-action-id="confirm"]')).toBeVisible();
        await expect(deviceMain(pad).locator('button[data-action-id="skip"]')).toBeVisible();
        seenA.push({ step: item.step, number: item.number });

        if (item.step === "quest-tokens") {
          await clickAct(pad, "skip", "piece-check-quest-tokens");
        } else if (item.step === "drums") {
          await clickAct(pad, "turn-drums", "piece-check-drums");
          await clickAct(pad, "confirm", "piece-check-drums");
        } else {
          await clickAct(pad, "confirm", `piece-check-${item.step}`);
        }
      }

      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
      expect(seenA).toEqual([...expectedA]);
      const badgeA = boardMain(board).locator("#band [data-band-tower] [data-unconfirmed-badge]");
      await expect(badgeA).toHaveAttribute("data-unconfirmed-count", "1");

      const { presses } = readPieceCheckPressLog(session.databasePath);
      const winners = presses.filter((p) => p.winner);
      for (const confirmed of [
        "hero-minis",
        "skulls",
        "foes",
        "broken-seals",
        "drums",
        "trapped-skulls",
      ]) {
        expect(
          winners.filter(
            (p) => p.promptId === `piece-check-${confirmed}` && p.action === "confirm",
          ),
        ).toHaveLength(1);
      }
      expect(
        winners.filter((p) => p.promptId === "piece-check-quest-tokens" && p.action === "skip"),
      ).toHaveLength(1);

      // Run (b): same save with Play without Tower -> 1, 2, 3, 4, 4a only (no 5 or 6).
      await quitToSession(pad);
      session.tower.loseConnection();
      session.host.syncTower();
      await expect(boardMain(board).locator("[data-session-row='tower']")).toHaveText(
        "Tower lost",
        {
          timeout: 20_000,
        },
      );
      const sentBeforeB = session.tower.sent().length;
      await clickAct(pad, "continue", "continue-saved-game");
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "tower-choice", {
        timeout: 20_000,
      });
      await clickAct(pad, "play-without-tower", "play-without-tower");

      const expectedB = [
        { step: "hero-minis", number: "1" },
        { step: "skulls", number: "2" },
        { step: "foes", number: "3" },
        { step: "broken-seals", number: "4" },
        { step: "quest-tokens", number: "4a" },
      ] as const;
      const seenB: Array<{ step: string; number: string }> = [];
      for (const item of expectedB) {
        await expect(boardMain(board)).toHaveAttribute("data-piece-check-step", item.step, {
          timeout: 20_000,
        });
        await expect(boardMain(board)).toHaveAttribute("data-piece-check-number", item.number);
        seenB.push({ step: item.step, number: item.number });
        await clickAct(pad, "confirm", `piece-check-${item.step}`);
      }
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
      expect(seenB).toEqual([...expectedB]);
      expect(session.tower.sent().length).toBe(sentBeforeB);
    } finally {
      await closeAll(contexts);
      await session.host.close();
    }
  });

  test("EV-09, EV-22: screenshots of minis, quest tokens, drums before/after, and trapped skulls", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const seed = "c2-11-shots~test-event:none";
    const session = await startAcceptanceHost(testInfo, {
      seed,
      fakeWait: true,
      lanHost: () => "192.0.2.10",
    });
    const contexts: BrowserContext[] = [];
    try {
      const board = await openBoard(browser, session.baseURL, contexts);
      const { page: pad } = await openPad(
        browser,
        session.baseURL,
        session.host.joinCode,
        contexts,
        { viewport: IPAD_LANDSCAPE.viewport },
      );
      await startTowerGameToDay1(pad, session.waitClock);
      await session.host.applyTestSeed("~test-skulls:N-dayside=1~test-drums:2,1,0~test-inside:2");
      await quitToSession(pad);
      await clickAct(pad, "continue", "continue-saved-game");

      // EV-09 (1-2): hero-minis
      await expect(boardMain(board)).toHaveAttribute("data-piece-check-step", "hero-minis", {
        timeout: 20_000,
      });
      await waitForBoardAnimationsSettled(board);
      await shoot(board, "c2-11-minis-board", testInfo);
      await shoot(pad, "c2-11-minis-ipad", testInfo);
      await clickAct(pad, "confirm", "piece-check-hero-minis");

      // Step 2: skulls
      await expect(boardMain(board)).toHaveAttribute("data-piece-check-step", "skulls", {
        timeout: 20_000,
      });
      await clickAct(pad, "confirm", "piece-check-skulls");

      // EV-22 (9-10): quest-tokens
      await expect(boardMain(board)).toHaveAttribute("data-piece-check-step", "quest-tokens", {
        timeout: 20_000,
      });
      await waitForBoardAnimationsSettled(board);
      await shoot(board, "c2-11-quest-tokens-board", testInfo);
      await shoot(pad, "c2-11-quest-tokens-ipad", testInfo);
      await clickAct(pad, "confirm", "piece-check-quest-tokens");

      // EV-09 (3-4): drums BEFORE press
      await expect(boardMain(board)).toHaveAttribute("data-piece-check-step", "drums", {
        timeout: 20_000,
      });
      await waitForBoardAnimationsSettled(board);
      await shoot(board, "c2-11-drums-before-board", testInfo);
      await shoot(pad, "c2-11-drums-before-ipad", testInfo);

      // EV-09 (5-6): drums AFTER press
      await clickAct(pad, "turn-drums", "piece-check-drums");
      await expect(deviceMain(pad).locator('button[data-action-id="confirm"]')).toBeEnabled({
        timeout: 20_000,
      });
      await waitForBoardAnimationsSettled(board);
      await shoot(board, "c2-11-drums-after-board", testInfo);
      await shoot(pad, "c2-11-drums-after-ipad", testInfo);
      await clickAct(pad, "confirm", "piece-check-drums");

      // EV-09 (7-8): trapped-skulls
      await expect(boardMain(board)).toHaveAttribute("data-piece-check-step", "trapped-skulls", {
        timeout: 20_000,
      });
      await waitForBoardAnimationsSettled(board);
      await shoot(board, "c2-11-trapped-skulls-board", testInfo);
      await shoot(pad, "c2-11-trapped-skulls-ipad", testInfo);
      await clickAct(pad, "confirm", "piece-check-trapped-skulls");

      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
    } finally {
      await closeAll(contexts);
      await session.host.close();
    }
  });
});
