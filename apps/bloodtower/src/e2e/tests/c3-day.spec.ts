import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  type Browser,
  type BrowserContext,
  errors,
  expect,
  type Page,
  type TestInfo,
  test,
} from "@playwright/test";
import {
  captureFrames,
  enterWithoutTower,
  enterWithoutTowerKeepSound,
  holdHeroesFromTest,
  installSessionSocketHook,
  setSoundAndKeep,
  startAcceptanceHost,
  waitForBoardAnimationsSettled,
} from "./support/acceptance.ts";

/**
 * C3 feature 11, the day on the board. Every eval this spec can drive with the real host is
 * live. The rest are `fixme`, each with Bob's 2026-11-07 ruling named; none is weakened.
 */

const STORY_ID = "test";
const FOUR = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const TWO = ["hero-a", "hero-b"] as const;
const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SETUP_IDS = ["seals-and-skulls", "place-heroes"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const HELP_LINE = "A new day begins. Move your heroes, then choose where to go.";
/**
 * `<Group>: <total>` then optional `(+N virtue)` `(+N terrain)` `(−N corruption)` and, while
 * the party is split (PT-06, CU/04), `(−N split)` terms.
 */
const ROLL_LINE =
  /^.+: \d+( \(\+\d+ virtue\))?( \(\+\d+ terrain\))?( \(−\d+ corruption\))?( \(−\d+ split\))?$/;

type WireRoll = {
  name: string;
  rolled: number;
  virtue: number;
  terrain: number;
  corruption: number;
  split?: number;
  total: number;
};
type WireTable = {
  day: number;
  groups?: { heroId: string; spaceId: string }[];
  groupsCard?: { day: number; holdMs: number; groups: { heroNames: string[] }[] } | null;
  daysLeft?: number | null;
  phase?: string | null;
  rolls?: WireRoll[];
  skull?: {
    kingdomLabel: string | null;
    buildings: { spaceId: string; skulls: number }[];
    lines?: string[];
  } | null;
};
type HookWindow = {
  __btLastBoardView?: { table?: WireTable | null };
  /** performance.now() when the board's groups card appeared and left (CU/04 EV-07). */
  __btCardShownAt?: number | null;
  __btCardGoneAt?: number | null;
  __btSent?: number;
  __btSessionSocket?: WebSocket;
  __btLastDeviceView?: { actions: { promptId: string; actionId: string; open: boolean }[] };
};

const deviceMain = (page: Page) => page.locator("main.bt-device");
const boardMain = (page: Page) => page.locator("main.bt-board");

/** The board's last `boardView` payload, read the way the board got it (no test-only route). */
const installBoardHook = async (page: Page) => {
  await page.addInitScript(() => {
    const Native = window.WebSocket;
    class BoardTrackingWebSocket extends Native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        if (!String(url).includes("/ws")) return;
        this.addEventListener("message", (event) => {
          let message: { type?: string; payload?: unknown } | null = null;
          try {
            message = JSON.parse(String(event.data));
          } catch (error) {
            console.error("board hook: frame is not JSON", error);
            return;
          }
          if (message?.type === "boardView") {
            (window as unknown as HookWindow).__btLastBoardView = message.payload as {
              table?: WireTable;
            };
          }
        });
      }
    }
    window.WebSocket = BoardTrackingWebSocket;
    // The groups card's own show and leave times, read on the page (CU/04 EV-07).
    const win = window as unknown as HookWindow;
    win.__btCardShownAt = null;
    win.__btCardGoneAt = null;
    let shown = false;
    new MutationObserver(() => {
      const now = document.querySelector("[data-groups-card]") !== null;
      if (now && !shown) {
        win.__btCardShownAt = performance.now();
        win.__btCardGoneAt = null;
      }
      if (!now && shown) win.__btCardGoneAt = performance.now();
      shown = now;
    }).observe(document, { childList: true, subtree: true });
  });
};

/**
 * A granted screen wake lock, as on a real iPad. Headless Chromium has none, so the keep-awake
 * notice would sit over the Menu's last rows (z-index 21 over 18) and hide Save and quit.
 */
const grantWakeLock = async (page: Page) => {
  await page.addInitScript(() => {
    const wakeLock = {
      request: async () => {
        let released = false;
        const listeners: Array<() => void> = [];
        return {
          get released() {
            return released;
          },
          release: async () => {
            released = true;
            for (const listener of listeners) listener();
          },
          addEventListener: (event: string, listener: () => void) => {
            if (event === "release") listeners.push(listener);
          },
        };
      },
    };
    Object.defineProperty(navigator, "wakeLock", { configurable: true, get: () => wakeLock });
  });
};

/** Counts every frame the iPad sends, so help can be shown to send nothing (EV-13). */
const installSendCounter = async (page: Page) => {
  await page.addInitScript(() => {
    const send = WebSocket.prototype.send;
    WebSocket.prototype.send = function (this: WebSocket, data) {
      const win = window as unknown as HookWindow;
      win.__btSent = (win.__btSent ?? 0) + 1;
      return send.call(this, data);
    };
  });
};

const sentCount = (page: Page) =>
  page.evaluate(() => (window as unknown as HookWindow).__btSent ?? 0);
const wireTable = (page: Page) =>
  page.evaluate(() => (window as unknown as HookWindow).__btLastBoardView?.table ?? null);

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const expectToolbar = async (page: Page) => {
  const footer = page.locator("footer.bt-bar--bottom");
  await expect(footer).toBeVisible();
  await expect(footer).toBeInViewport();
  const buttons = footer.locator("button");
  await expect(buttons.first()).toHaveText("?");
  await expect(buttons.last()).toHaveAttribute("data-action", "menu");
  // No body element covers the toolbar's two ends (EV-11).
  for (const end of [buttons.first(), buttons.last()]) {
    const box = await end.boundingBox();
    expect(box).not.toBeNull();
    if (!box) continue;
    const onTop = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest("footer.bt-bar--bottom") != null,
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    );
    expect(onTop).toBe(true);
  }
};

/** "?" then Close: the right sheet, nothing sent, pause and screen unchanged (EV-13). */
const checkHelp = async (pad: Page, board: Page, stateSelector: string) => {
  const paused = await deviceMain(pad).getAttribute("data-paused");
  const sentBefore = await sentCount(pad);
  await pad.locator('footer.bt-bar--bottom [data-action="help"]').click();
  const sheet = pad.locator("[data-help]");
  await expect(sheet).toHaveAttribute("data-help-screen", "day-on-the-board");
  await expect(sheet.locator("p")).toHaveText(HELP_LINE);
  await expect(deviceMain(pad)).toHaveAttribute("data-paused", paused ?? "false");
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toHaveCount(0);
  expect(await sentCount(pad)).toBe(sentBefore);
  await expect(deviceMain(pad)).toHaveAttribute("data-paused", paused ?? "false");
  await expect(board.locator(stateSelector).first()).toBeVisible();
};

/**
 * One open body press on the iPad's own socket. There is no Regroup prompt (CU/04), and the
 * toolbar and gear are never used here, so a press never splits the party.
 */
const PREFER = ["continue", "end-turn", "record", "leave", "enter"] as const;
const SKIP = new Set([
  "quit-story",
  "reconnect",
  "go-on-without",
  "new-game",
  "done-for-tonight",
  "back",
  "tower-connect",
  "tower-calibrate",
  "split",
  "join",
  "walk",
]);
const pressOnce = (pad: Page) =>
  pad.evaluate(
    ({ prefer, skip }) => {
      const win = window as unknown as HookWindow;
      const socket = win.__btSessionSocket;
      const view = win.__btLastDeviceView;
      if (!socket || socket.readyState !== WebSocket.OPEN || !view) return false;
      const open = view.actions.filter((action) => action.open);
      let pick: (typeof open)[number] | null = null;
      for (const actionId of prefer) {
        if (pick) break;
        pick = open.find((action) => action.actionId === actionId) ?? null;
      }
      pick = pick ?? open.find((action) => !skip.includes(action.actionId)) ?? null;
      if (!pick) return false;
      socket.send(
        JSON.stringify({
          v: 2,
          type: "act",
          payload: { promptId: pick.promptId, actionId: pick.actionId, args: {} },
        }),
      );
      return true;
    },
    { prefer: [...PREFER], skip: [...SKIP] },
  );

/**
 * Presses through the day until `reached` holds, checking before every press. After a press it
 * waits for the board's next view, so a step is never pressed past before the check sees it.
 */
const playUntil = async (pad: Page, board: Page, reached: () => Promise<boolean>, what: string) => {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await reached()) return;
    const before = JSON.stringify(await wireTable(board));
    if (!(await pressOnce(pad))) {
      await pad.waitForTimeout(50);
      continue;
    }
    try {
      await board.waitForFunction(
        (seen) =>
          JSON.stringify((window as unknown as HookWindow).__btLastBoardView?.table ?? null) !==
          seen,
        before,
        { timeout: 2_000 },
      );
    } catch (error) {
      // A press that changes nothing on the board (a turn ending in place) is expected: go on.
      // Anything but that timeout is a real failure.
      if (!(error instanceof errors.TimeoutError)) throw error;
    }
  }
  throw new Error(`Timed out before ${what}`);
};

/** True once the board is on `phase` (of `day`). Passing that day fails the test at once. */
const atPhase = (board: Page, phase: string, day?: number) => async () => {
  const table = await wireTable(board);
  if (day !== undefined && table && table.day > day) {
    throw new Error(`Passed day ${day} (now day ${table.day}) without seeing ${phase}`);
  }
  return table?.phase === phase && (day === undefined || table.day === day);
};

/** Join, skip the tower, pick the test story, hold the heroes, run setup and the opening. */
const startGame = async (
  browser: Browser,
  testInfo: TestInfo,
  heroes: readonly string[],
  databasePath?: string,
  /** CU/04: every hero in one group on one space (the test-only seat hook). */
  seatTogether = false,
  /** CU/04: a second iPad joins and holds the last hero; the first holds the rest. */
  secondPad = false,
) => {
  // A LAN join address keeps the loopback warning off the board's band in the EV-06 shots.
  const session = await startAcceptanceHost(testInfo, {
    seed: "c3-day-1",
    databasePath,
    lanHost: () => "192.0.2.10",
    seatTogether,
  });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const pad = await context.newPage();
  const board = await context.newPage();
  const padFrames = captureFrames(pad);
  const boardFrames = captureFrames(board);
  await board.setViewportSize(BOARD_SIZE);
  await installBoardHook(board);
  await board.goto("/board");
  await installSessionSocketHook(pad);
  await installSendCounter(pad);
  await grantWakeLock(pad);
  await pad.goto(`/join?code=${session.host.joinCode}`);
  let pad2: Page | null = null;
  let pad2Frames: string[] = [];
  let context2: BrowserContext | null = null;
  if (secondPad) {
    await enterWithoutTowerKeepSound(pad);
    context2 = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
    pad2 = await context2.newPage();
    pad2Frames = captureFrames(pad2);
    await installSessionSocketHook(pad2);
    await grantWakeLock(pad2);
    await pad2.goto(`/join?code=${session.host.joinCode}`);
    await expect(pad2).toHaveURL(/\/device/);
    await setSoundAndKeep(pad);
  } else {
    await enterWithoutTower(pad);
  }
  await clickAct(pad, "continue", `continue-pick-story-${STORY_ID}`);
  const size = pad.locator(
    `button[data-setting="party-size"][data-option="n-${heroes.length}"][data-action="set"]`,
  );
  await size.click();
  await expect(size).toHaveAttribute("aria-pressed", "true");
  await clickAct(pad, "continue", "continue-game-settings");
  if (pad2) {
    await holdHeroesFromTest(pad, heroes.slice(0, -1));
    await holdHeroesFromTest(pad2, heroes.slice(-1));
  } else {
    await holdHeroesFromTest(pad, [...heroes]);
  }
  await clickAct(pad, "continue", "continue-claim-heroes");
  for (const id of SETUP_IDS) {
    await expect(deviceMain(pad)).toHaveAttribute("data-setup-step", id, { timeout: 20_000 });
    await clickAct(pad, "continue", `continue-setup-${id}`);
  }
  await clickAct(pad, "continue", "continue-begin");
  for (const id of OPENING_IDS) {
    await clickAct(pad, "continue", `continue-opening-${id.replace(".", "-")}`);
  }
  return { session, context, pad, board, padFrames, boardFrames, pad2, pad2Frames, context2 };
};

/** The board panel's lines, checked against the engine's own roll as it went out on the wire. */
const expectRollMatchesEngine = async (board: Page, day: number) => {
  const roll = board.locator("#roll");
  await expect(roll).toBeVisible({ timeout: 20_000 });
  await expect(roll.locator("[data-roll-day]")).toHaveText(`Day ${day}`);
  const table = await wireTable(board);
  const rolls = table?.rolls ?? [];
  expect(rolls.length).toBeGreaterThanOrEqual(1);
  const lines = await roll.locator("li[data-roll]").allTextContents();
  expect(lines).toHaveLength(rolls.length);
  rolls.forEach((row, index) => {
    const split = row.split ?? 0;
    const expected = Math.max(row.rolled + row.virtue + row.terrain + row.corruption + split, 2);
    expect(row.total).toBe(expected);
    expect(row.rolled).toBeGreaterThanOrEqual(2);
    expect(row.rolled).toBeLessThanOrEqual(6);
    const terms = [
      row.virtue ? `(+${row.virtue} virtue)` : null,
      row.terrain ? `(+${row.terrain} terrain)` : null,
      row.corruption ? `(−${Math.abs(row.corruption)} corruption)` : null,
      split ? `(−${Math.abs(split)} split)` : null,
    ].filter(Boolean);
    expect(lines[index]).toBe([`${row.name}: ${row.total}`, ...terms].join(" "));
    expect(lines[index]).toMatch(ROLL_LINE);
  });
};

const shot = async (page: Page, testInfo: TestInfo, name: string) => {
  const path = testInfo.outputPath(`${name}.png`);
  await waitForBoardAnimationsSettled(page);
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: "image/png" });
};

test.describe("C3/11 the day on the board", () => {
  test.beforeEach(({ browserName: _browserName }, testInfo) => {
    test.skip(testInfo.project.name !== "ipad", "The approved mockup is iPad portrait.");
  });

  test("EV-01, EV-06, EV-07, EV-08, EV-10, EV-11, EV-12, EV-13: four heroes over two days", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad, board } = await startGame(browser, testInfo, FOUR);
    try {
      // Day 1 roll (EV-01): "Day 1", one line per group, every term the engine's.
      await expectRollMatchesEngine(board, 1);
      await expectToolbar(pad);
      await checkHelp(pad, board, "#roll");
      await shot(board, testInfo, "ev06-board-roll");
      await shot(pad, testInfo, "ev06-ipad-roll");

      // Mid-turn, night 1 with 4 heroes: the bar shows the 1 coming skull only (EV-07).
      await clickAct(pad, "continue");
      const band = board.locator("#band");
      await expect(band.locator("[data-days-left]")).toBeVisible({ timeout: 20_000 });
      await expect(band.locator("[data-day]")).toHaveText("Day 1");
      // 4 heroes, 24 skulls, 1,2,1,2 pattern: 16 nights (Q-C3-04). Never "skulls".
      await expect(band.locator("[data-days-left]")).toHaveText("16 days left");
      await expect(band).not.toContainText("skulls");
      await expect(board.locator("[data-threat]")).toHaveAttribute("data-threat", "1");
      await expect(board.locator("[data-threat-count]")).toHaveText("1 coming");
      await expect(board.locator("[data-skull]")).toHaveCount(1);
      await expectToolbar(pad);
      await checkHelp(pad, board, "#band");
      await shot(board, testInfo, "ev06-board-mid-turn");
      await shot(pad, testInfo, "ev06-ipad-mid-turn");

      // No hero holds a corruption: no hero panel shows one (EV-08, the count half).
      const groups = (await wireTable(board))?.rolls?.length ?? 0;
      expect(groups).toBeGreaterThan(0);
      await expect(board.locator("[data-hero-panel]")).toHaveCount(groups);
      await expect(board.locator("[data-hero-corruptions]")).toHaveCount(0);
      await expect(boardMain(board).locator("button")).toHaveCount(0);

      // Night 1 without the tower: the board names the kingdom the engine drew (EV-10).
      await playUntil(pad, board, atPhase(board, "skull-sim", 1), "the night 1 skull");
      const night1 = await wireTable(board);
      const kingdom = night1?.skull?.kingdomLabel;
      expect(kingdom).toBeTruthy();
      const panel = board.locator("#skull");
      await expect(panel).toBeVisible();
      await expect(panel).toContainText("Night falls");
      // The no-tower lines sit in the skull panel (CU/03), not in a second waiting box.
      await expect(panel.locator("[data-skull-line]").first()).toContainText(/skull/i);
      await expectToolbar(pad);
      await checkHelp(pad, board, "#skull");

      // Day 2 roll and mid-turn: night 2 brings 2 skulls, and the bar shows only those (EV-07).
      // There is no Regroup prompt on the way (CU/04 EV-01).
      await playUntil(pad, board, atPhase(board, "roll", 2), "day 2's roll");
      await expectRollMatchesEngine(board, 2);
      await clickAct(pad, "continue");
      await expect(band.locator("[data-day]")).toHaveText("Day 2", { timeout: 20_000 });
      await expect(board.locator("[data-threat]")).toHaveAttribute("data-threat", "2");
      await expect(board.locator("[data-threat-count]")).toHaveText("2 coming");
      await expect(board.locator("[data-skull]")).toHaveCount(2);

      // The happy path used only body presses: the Menu never opened (EV-12). The only help
      // opens were EV-13's own checks above.
      await expect(boardMain(board)).toHaveAttribute("data-gear-opens", "0");
      await expect(boardMain(board)).toHaveAttribute("data-paused", "false");
    } finally {
      await context.close();
      await session.host.close();
    }
  });

  /** Two heroes to day 2's turn: 24 days left on day 1, 23 after day 1's drop (EV-02). */
  const toDayTwo = async (pad: Page, board: Page) => {
    const band = board.locator("#band");
    await clickAct(pad, "continue");
    await expect(band.locator("[data-days-left]")).toHaveText("24 days left", {
      timeout: 20_000,
    });
    await playUntil(pad, board, atPhase(board, "turn", 2), "day 2's turn");
    await expect(band.locator("[data-day]")).toHaveText("Day 2");
    await expect(band.locator("[data-days-left]")).toHaveText("23 days left");
    await expect(band).not.toContainText("skulls");
  };

  test("EV-02: two heroes, the band reads days left after day 1's drop", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(180_000);
    const { session, context, pad, board } = await startGame(browser, testInfo, TWO);
    try {
      await toDayTwo(pad, board);
    } finally {
      await context.close();
      await session.host.close();
    }
  });

  test("EV-19: two heroes, Continue after a quit on day 3 shows the same clock", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad, board } = await startGame(browser, testInfo, TWO);
    try {
      const band = board.locator("#band");
      await toDayTwo(pad, board);

      // Quit on day 3, then Continue from the session screen (EV-19).
      await playUntil(pad, board, atPhase(board, "turn", 3), "day 3's turn");
      await expect(band.locator("[data-day]")).toHaveText("Day 3");
      const leftBefore = await band.locator("[data-days-left]").textContent();
      expect(leftBefore).toBe("22 days left");
      // The night's skull panel before the quit, seeded, for the skull half after Continue.
      await playUntil(pad, board, atPhase(board, "skull-sim", 3), "day 3's skull");
      const before = (await wireTable(board))?.skull;
      expect(before?.buildings.length).toBeGreaterThan(0);
      const leftAtSkull = await band.locator("[data-days-left]").textContent();

      await pad.locator('[data-action="menu"]').click();
      await pad.locator('button[data-gear-item="save-and-quit"]').click();
      await pad.locator("[data-menu]").getByRole("button", { name: "Save and quit" }).click();
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", {
        timeout: 30_000,
      });
      await clickAct(pad, "continue", "continue-saved-game");
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
      await holdHeroesFromTest(pad, [...TWO]);
      // Continue lands on day 3: at the step it left, or at the day's start from the last save.
      await expect.poll(async () => (await wireTable(board))?.day, { timeout: 20_000 }).toBe(3);
      await expect(band.locator("[data-day]")).toHaveText("Day 3");
      const resumedAt = (await wireTable(board))?.phase;
      testInfo.annotations.push({ type: "EV-19 resumed at", description: String(resumedAt) });
      if (resumedAt === "skull-sim") {
        await expect(band.locator("[data-days-left]")).toHaveText(leftAtSkull ?? "");
      } else {
        await playUntil(pad, board, atPhase(board, "turn", 3), "day 3's turn after Continue");
        await expect(band.locator("[data-days-left]")).toHaveText(leftBefore ?? "");
      }
      // The same seeded night: same kingdom, same buildings, same skulls on each.
      await playUntil(pad, board, atPhase(board, "skull-sim", 3), "day 3's skull after Continue");
      await expect(band.locator("[data-days-left]")).toHaveText(leftAtSkull ?? "");
      const after = (await wireTable(board))?.skull;
      expect(after?.kingdomLabel).toBe(before?.kingdomLabel);
      expect(after?.buildings).toEqual(before?.buildings);
      // The no-tower panel shows the lines only (CU/03); the counts ride the wire.
      expect((await wireTable(board))?.skull?.lines).toEqual(before?.lines);
    } finally {
      await context.close();
      await session.host.close();
    }
  });

  test("EV-20: a Volume panel open at a host restart comes back closed and unpaused", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad, board } = await startGame(browser, testInfo, FOUR);
    const { databasePath } = session;
    const readMenu = async (page: Page) =>
      page.locator("[data-menu] [data-gear-item]").evaluateAll((items) =>
        items.map((item) => ({
          id: item.getAttribute("data-gear-item"),
          enabled: !(item as HTMLButtonElement).disabled,
          reason: item.querySelector("[data-reason]")?.textContent ?? null,
        })),
      );
    let menuBefore: Awaited<ReturnType<typeof readMenu>> = [];
    try {
      await clickAct(pad, "continue");
      await expect(board.locator("#band [data-days-left]")).toBeVisible({ timeout: 20_000 });
      await pad.locator('[data-action="menu"]').click();
      menuBefore = await readMenu(pad);
      expect(menuBefore.length).toBeGreaterThan(0);
      await pad.locator('button[data-gear-item="volume"]').click();
      await expect(board.locator('[data-panel="volume"]')).toBeVisible({ timeout: 20_000 });
      await expect(boardMain(board)).toHaveAttribute("data-paused", "true");
    } finally {
      await context.close();
      await session.host.close();
    }

    const restarted = await startAcceptanceHost(testInfo, { databasePath, seed: "c3-day-1" });
    const context2 = await browser.newContext({ baseURL: restarted.baseURL, ...PORTRAIT });
    try {
      const pad2 = await context2.newPage();
      const board2 = await context2.newPage();
      await board2.setViewportSize(BOARD_SIZE);
      await board2.goto("/board");
      await installSessionSocketHook(pad2);
      await pad2.goto(`/join?code=${restarted.host.joinCode}`);
      await setSoundAndKeep(pad2);
      await clickAct(pad2, "continue", "continue-saved-game");
      await expect(deviceMain(pad2)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
      await holdHeroesFromTest(pad2, [...FOUR]);
      await expect(pad2.locator("[data-menu]")).toHaveCount(0);
      await expect(pad2.locator("[data-panel]")).toHaveCount(0);
      await expect(board2.locator("[data-panel]")).toHaveCount(0);
      await expect(deviceMain(pad2)).toHaveAttribute("data-paused", "false");
      await expect(boardMain(board2)).toHaveAttribute("data-paused", "false");
      await expectToolbar(pad2);
      await pad2.locator('[data-action="menu"]').click();
      expect(await readMenu(pad2)).toEqual(menuBefore);
    } finally {
      await context2.close();
      await restarted.host.close();
    }
  });

  // Bob's rulings, 2026-11-07 (recorded in ../../../plans/briefs/C3/11-day-on-the-board/plan.md).
  const blocked: Array<[string, string]> = [
    [
      "EV-03, EV-04, EV-14, EV-17, EV-18, EV-06 (effects shots)",
      "Ruling 1: the effects wait, its 4 s timer and the audio-end event go to a new engine step for the day loop (loops/day/loop.ts).",
    ],
    [
      "EV-08 (names)",
      "Ruling 2: the engine keeps corruption counts only; the names come with C3-08.",
    ],
    [
      "EV-15 (the use-item half), EV-16 (the use-item reason)",
      "Ruling 3 / Q7.2: the split halves are live in CU/04 below; the host's use-item action and a potion fixture go to CU/07.",
    ],
    [
      "EV-09, EV-01 (seeded virtue and corruption groups)",
      "Ruling 4: a test-only day-clock seed hook (skulls per building, the next kingdom, hero sheets) goes to the new engine step.",
    ],
    [
      "EV-05, EV-11 and EV-13 (the Regroup stop)",
      "Ruling 5: the test story starts each hero in another kingdom, so Regroup never shows; the same seed hook puts two heroes on one space.",
    ],
  ];
  for (const [ids, reason] of blocked) {
    test.fixme(`${ids}: ${reason}`, async () => {});
  }
});

const MOCKUP = join(
  import.meta.dirname,
  "../../../plans/briefs/CU/04-queued-split-rejoin/mockup.html",
);
const REGROUP_TEXT = "Stay together, or split up?";

/** One act on the iPad's own socket: the host's own action path (CU/04 EV-29, Q7.2). */
const sendAct = (pad: Page, promptId: string, actionId: string, args: Record<string, unknown>) =>
  pad.evaluate(
    ({ promptId, actionId, args }) => {
      const socket = (window as unknown as HookWindow).__btSessionSocket;
      if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error("No open socket.");
      socket.send(JSON.stringify({ v: 2, type: "act", payload: { promptId, actionId, args } }));
    },
    { promptId, actionId, args },
  );

const openSplitPanel = async (pad: Page) => {
  await pad.locator('[data-action="menu"]').click();
  const row = pad.locator('[data-menu] button[data-gear-item="split-party"]');
  await expect(row).toBeEnabled();
  await row.click();
  await expect(deviceMain(pad).locator('[data-gear-panel="split"]')).toBeVisible({
    timeout: 20_000,
  });
};

const closeSplitPanel = async (pad: Page) => {
  await deviceMain(pad).locator("button[data-gear-back]").click();
  await expect(deviceMain(pad).locator('[data-gear-panel="split"]')).toHaveCount(0);
};

/** The section of the approved Gamewright draft, shot at its own size for side-by-side review. */
const mockupShot = async (browser: Browser, testInfo: TestInfo, section: string, name: string) => {
  const context = await browser.newContext({ viewport: { width: 1000, height: 1100 } });
  try {
    const page = await context.newPage();
    await page.goto(pathToFileURL(MOCKUP).href);
    const path = testInfo.outputPath(`${name}.png`);
    await page.locator(section).screenshot({ path });
    await testInfo.attach(name, { path, contentType: "image/png" });
  } finally {
    await context.close();
  }
};

type Frame = { type?: string; payload?: Record<string, unknown> };
const framesOf = (frames: string[], type: string): Record<string, unknown>[] =>
  frames.flatMap((text) => {
    let frame: Frame;
    try {
      frame = JSON.parse(text) as Frame;
    } catch (error) {
      // Not every frame is JSON (pings); those carry no view.
      if (!(error instanceof SyntaxError)) throw error;
      return [];
    }
    return frame.type === type && frame.payload ? [frame.payload] : [];
  });

const saveQuitContinue = async (pad: Page, heroes: readonly string[]) => {
  await pad.locator('[data-action="menu"]').click();
  await pad.locator('button[data-gear-item="save-and-quit"]').click();
  await pad.locator("[data-menu]").getByRole("button", { name: "Save and quit" }).click();
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", { timeout: 30_000 });
  await clickAct(pad, "continue", "continue-saved-game");
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
  await holdHeroesFromTest(pad, [...heroes]);
};

const noRegroupOffer = (pad: Page) =>
  pad.evaluate(() =>
    ((window as unknown as HookWindow).__btLastDeviceView?.actions ?? []).every(
      (action) => !action.promptId.startsWith("regroup"),
    ),
  );

/**
 * One iPad shows no Regroup question: no regroup offer on its socket, no regroup button, no
 * "Stay together" text, and no groups card or its controls (the card is the board's only).
 */
const expectNoRegroupOnPad = async (pad: Page, what: string) => {
  expect(await noRegroupOffer(pad), `${what}: regroup offer`).toBe(true);
  const main = deviceMain(pad);
  await expect(main.locator('button[data-prompt-id^="regroup"]')).toHaveCount(0);
  await expect(main.locator("[data-groups-card], [data-day-step='regroup']")).toHaveCount(0);
  await expect(main).not.toContainText(REGROUP_TEXT);
};

/** Both iPads; the test must have joined the second. */
const bothPads = (game: { pad: Page; pad2: Page | null }): Page[] => {
  if (!game.pad2) throw new Error("This check needs the second iPad.");
  return [game.pad, game.pad2];
};

test.describe("CU/04 queued split and rejoin (PT-18, PT-06)", () => {
  test.beforeEach(({ browserName: _browserName }, testInfo) => {
    test.skip(testInfo.project.name !== "ipad", "The mockup is iPad portrait and a 1920 board.");
  });

  test("EV-01, EV-25: a party that never queues sees no Regroup prompt and no groups card", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const game = await startGame(browser, testInfo, TWO, undefined, true, true);
    const { session, context, pad, board } = game;
    try {
      await clickAct(pad, "continue");
      for (const day of [2, 3, 4]) {
        await playUntil(pad, board, atPhase(board, "roll", day), `day ${day}'s roll`);
        for (const [index, page] of bothPads(game).entries()) {
          await expectNoRegroupOnPad(page, `iPad ${index + 1}, day ${day} start`);
        }
      }
      await expect(board.locator("#roll")).toBeVisible();
      const tables = framesOf(game.boardFrames, "boardView").flatMap((view) =>
        view.table ? [view.table as WireTable] : [],
      );
      expect(tables.length).toBeGreaterThan(0);
      expect(tables.filter((table) => table.phase === "regroup")).toEqual([]);
      expect(tables.filter((table) => table.groupsCard)).toEqual([]);
      for (const day of [2, 3, 4]) {
        // The first phase of the day is the roll: the day start shows nothing before it.
        const first = tables.find((table) => table.day === day && table.phase);
        expect(first?.phase, `day ${day}`).toBe("roll");
      }
      // Every offer either iPad ever got, from its first frame.
      for (const frames of [game.padFrames, game.pad2Frames]) {
        const offers = framesOf(frames, "deviceView").flatMap(
          (view) => (view.actions as { promptId: string }[] | undefined) ?? [],
        );
        expect(offers.length).toBeGreaterThan(0);
        expect(offers.filter((offer) => offer.promptId.startsWith("regroup"))).toEqual([]);
      }
      for (const frames of [game.padFrames, game.pad2Frames, game.boardFrames]) {
        expect(frames.some((text) => text.includes(REGROUP_TEXT))).toBe(false);
      }
      await expect(boardMain(board)).not.toContainText(REGROUP_TEXT);
      await expect(board.locator("[data-groups-card]")).toHaveCount(0);
      // Still one group: nothing split it.
      expect((await wireTable(board))?.groups).toHaveLength(1);
    } finally {
      await game.context2?.close();
      await context.close();
      await session.host.close();
    }
  });

  test("EV-02, EV-09, EV-21, EV-07, EV-10, EV-25 and C3-11 EV-15/EV-16 (split halves): a queued split survives Continue and applies at the next day start", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(360_000);
    const game = await startGame(browser, testInfo, TWO, undefined, true, true);
    const { session, context, pad, board } = game;
    const pad2 = bothPads(game)[1] as Page;
    try {
      await clickAct(pad, "continue");
      await playUntil(pad, board, atPhase(board, "turn", 2), "day 2's turn");

      // C3-11 EV-16 (split half): one "Split party" item, enabled, no reason; no Rejoin item.
      await pad.locator('[data-action="menu"]').click();
      const row = pad.locator('[data-menu] button[data-gear-item="split-party"]');
      await expect(row.locator(".bt-gear-label")).toHaveText("Split party");
      await expect(row).toBeEnabled();
      await expect(row.locator("[data-reason]")).toHaveCount(0);
      await expect(pad.locator('[data-gear-item="rejoin-party"]')).toHaveCount(0);
      const enabled = pad.locator("[data-menu] button[data-gear-item]:not([disabled])");
      for (const item of await enabled.all())
        await expect(item.locator("[data-reason]")).toHaveCount(0);
      await row.click();

      // EV-02 and C3-11 EV-15 (split half): the iPad has the picks, the board mirrors, paused.
      const panel = deviceMain(pad).locator('[data-gear-panel="split"]');
      await expect(panel).toBeVisible({ timeout: 20_000 });
      await expect(panel.locator("[data-see-board]")).toHaveText("See the Story board");
      await expect(panel.locator("h2")).toHaveText("Split party");
      // One pick per hero (in the group's seeded order), then Back.
      await expect(panel.locator("button")).toHaveCount(3);
      const labels = (await panel.locator("button").allTextContents()).map((text) => text.trim());
      expect(labels.at(-1)).toBe("Back");
      expect(labels.slice(0, 2).sort()).toEqual(["Split Hero A off", "Split Hero B off"]);
      await expect(panel.locator("[data-copy]")).toHaveText([
        "[COPY: split-party-help]",
        "[COPY: queued-confirm] Queued: takes effect at the next day.",
      ]);
      const boardPanel = board.locator('[data-panel="split"]');
      await expect(boardPanel).toBeVisible({ timeout: 20_000 });
      await expect(boardPanel.locator("button")).toHaveCount(0);
      await expect(boardMain(board)).toHaveAttribute("data-paused", "true");
      // EV-09: the panel next to the draft's #gear-split.
      await pad.waitForTimeout(800);
      const ipadShot = testInfo.outputPath("cu04-ev09-ipad-split-panel.png");
      await pad.screenshot({ path: ipadShot });
      await testInfo.attach("cu04-ev09-ipad-split-panel", {
        path: ipadShot,
        contentType: "image/png",
      });
      await mockupShot(browser, testInfo, "#gear-split", "cu04-ev09-mockup-gear-split");

      await panel.locator('button[data-regroup-pick="split"][data-hero="hero-b"]').click();
      await expect(panel.locator('[data-queued="split"][data-hero="hero-b"]')).toHaveText(
        "Split Hero B off",
      );
      await expect(boardPanel.locator('[data-queued="split"][data-hero="hero-b"]')).toBeVisible();
      await closeSplitPanel(pad);
      await expect(boardMain(board)).toHaveAttribute("data-paused", "false");
      // Nothing moves on day 2.
      expect((await wireTable(board))?.groups).toHaveLength(1);
      await expect(board.locator("[data-hero-panel]")).toHaveCount(1);

      // EV-21: quit and Continue keeps the queue. Each iPad takes its hero back.
      await saveQuitContinue(pad, ["hero-a"]);
      await holdHeroesFromTest(pad2, ["hero-b"]);
      await expect.poll(async () => (await wireTable(board))?.day, { timeout: 20_000 }).toBe(2);
      expect((await wireTable(board))?.groups).toHaveLength(1);
      await board.evaluate(() => {
        const win = window as unknown as HookWindow;
        win.__btCardShownAt = null;
        win.__btCardGoneAt = null;
      });
      await playUntil(pad, board, atPhase(board, "roll", 3), "day 3's roll");

      // EV-07, EV-10, C3-11 EV-15: the groups card, two groups, no button, then the roll.
      const card = board.locator("[data-groups-card]");
      await expect(card).toBeVisible({ timeout: 5_000 });
      await expect(card.locator("[data-groups-day]")).toHaveText("Day 3");
      await expect(card.locator("[data-group]")).toHaveText(["Group 1: Hero A", "Group 2: Hero B"]);
      await expect(card.locator("button, a, [role='button'], [tabindex]")).toHaveCount(0);
      await expect(board.locator("#roll")).toHaveCount(0);
      // Nothing else sits over the card (EV-10): no waiting box while it shows.
      await expect(board.locator("[data-play-waiting]")).toHaveCount(0);
      // EV-07: neither iPad offers a regroup choice or shows the card's controls.
      for (const [index, page] of bothPads(game).entries()) {
        await expectNoRegroupOnPad(page, `iPad ${index + 1}, card day`);
      }
      // The card's frame fits and inks in first; the shot waits for that, inside the 4 s.
      await board.waitForFunction(() => {
        const frame = document.querySelector("[data-groups-card]");
        if (!frame || frame.getBoundingClientRect().width < 300) return false;
        return frame.getAnimations({ subtree: true }).every((a) => a.playState !== "running");
      });
      const boardShot = testInfo.outputPath("cu04-ev10-board-groups-card.png");
      await board.screenshot({ path: boardShot });
      await testInfo.attach("cu04-ev10-board-groups-card", {
        path: boardShot,
        contentType: "image/png",
      });
      await mockupShot(browser, testInfo, "#day-start", "cu04-ev10-mockup-day-start");
      await expect(card).toHaveCount(0, { timeout: 8_000 });
      await expect(board.locator("#roll")).toBeVisible();
      const held = await board.evaluate(() => {
        const win = window as unknown as HookWindow;
        return (win.__btCardGoneAt ?? 0) - (win.__btCardShownAt ?? 0);
      });
      testInfo.annotations.push({ type: "EV-07 card held (ms)", description: String(held) });
      expect(held).toBeGreaterThanOrEqual(3_500);
      expect(held).toBeLessThanOrEqual(6_000);
      expect((await wireTable(board))?.groups).toHaveLength(2);
      expect((await wireTable(board))?.rolls).toHaveLength(2);

      // C3-11 EV-16 (split half): the same item now reads "Rejoin party".
      await pad.locator('[data-action="menu"]').click();
      await expect(
        pad.locator('[data-menu] button[data-gear-item="split-party"] .bt-gear-label'),
      ).toHaveText("Rejoin party");
      await pad.locator("[data-menu]").getByRole("button", { name: "Close" }).click();

      // EV-21 and EV-25: day 4 adds no split and shows no card on a quiet day.
      await playUntil(pad, board, atPhase(board, "roll", 4), "day 4's roll");
      await pad.waitForTimeout(1_000);
      await expect(board.locator("[data-groups-card]")).toHaveCount(0);
      expect((await wireTable(board))?.groupsCard ?? null).toBeNull();
      expect((await wireTable(board))?.groups).toHaveLength(2);
      for (const [index, page] of bothPads(game).entries()) {
        await expectNoRegroupOnPad(page, `iPad ${index + 1}, quiet day 4`);
      }
    } finally {
      await game.context2?.close();
      await context.close();
      await session.host.close();
    }
  });

  test("EV-24: a queued Rejoin that cannot apply toasts on the Story board and tells the iPad that queued it", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(360_000);
    const game = await startGame(browser, testInfo, TWO, undefined, true, true);
    const { session, context, pad, board } = game;
    const pad2 = bothPads(game)[1] as Page;
    try {
      await clickAct(pad, "continue");
      await playUntil(pad, board, atPhase(board, "turn", 2), "day 2's turn");
      await sendAct(pad, "gear", "pick", { item: "split", pick: "split", heroId: "hero-b" });
      await playUntil(pad, board, atPhase(board, "roll", 3), "day 3's roll");
      expect((await wireTable(board))?.groups).toHaveLength(2);

      // The second iPad queues the Rejoin while the two groups share a space.
      await sendAct(pad2, "gear", "pick", { item: "split", pick: "join", heroId: "hero-b" });
      await clickAct(pad, "continue");
      // The first group walks off, so at day 4 the groups no longer share a space.
      // Poll: the walk prompt reaches the iPad a moment after the Continue.
      const sendWalk = () =>
        pad.evaluate(() => {
          const win = window as unknown as HookWindow;
          const walk = (win.__btLastDeviceView?.actions ?? []).find(
            (action) => action.open && action.promptId.startsWith("walk--"),
          );
          if (!walk || !win.__btSessionSocket) return false;
          win.__btSessionSocket.send(
            JSON.stringify({
              v: 2,
              type: "act",
              payload: { promptId: walk.promptId, actionId: "walk", args: {} },
            }),
          );
          return true;
        });
      await expect.poll(sendWalk, { timeout: 15_000 }).toBe(true);
      await expect
        .poll(async () => new Set((await wireTable(board))?.groups?.map((g) => g.spaceId)).size)
        .toBe(2);
      await playUntil(pad, board, atPhase(board, "roll", 4), "day 4's roll");

      // Nothing applied, never silent: the board toasts the code, the queuing iPad is told.
      expect((await wireTable(board))?.groups).toHaveLength(2);
      await expect(board.locator('[data-error-code="regroup-dropped"]')).toBeVisible({
        timeout: 10_000,
      });
      const banner = deviceMain(pad2).locator('[data-presentation="banner"]');
      await expect(banner).toBeVisible({ timeout: 10_000 });
      await expect(banner).toContainText("regroup-dropped");
      await expect(banner).toContainText("Rejoin");
      await expect(board.locator("[data-groups-card]")).toHaveCount(0);
      // The first iPad did not queue it, so it is not told.
      await expect(
        deviceMain(pad).locator('[data-presentation="banner"]', { hasText: "regroup-dropped" }),
      ).toHaveCount(0);
    } finally {
      await game.context2?.close();
      await context.close();
      await session.host.close();
    }
  });

  test("EV-27, EV-29: a cancel leaves nothing, and the host's action queues a split and a rejoin", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(360_000);
    const { session, context, pad, board } = await startGame(
      browser,
      testInfo,
      TWO,
      undefined,
      true,
    );
    try {
      await clickAct(pad, "continue");
      await playUntil(pad, board, atPhase(board, "turn", 2), "day 2's turn");

      // EV-29: the host's split action, with no panel open, gives the iPad pick's queue entry.
      await sendAct(pad, "gear", "pick", { item: "split", pick: "split", heroId: "hero-b" });
      await openSplitPanel(pad);
      const panel = deviceMain(pad).locator('[data-gear-panel="split"]');
      await expect(panel.locator("[data-queued]")).toHaveCount(1);
      await expect(panel.locator('[data-queued="split"][data-hero="hero-b"]')).toHaveText(
        "Split Hero B off",
      );
      // EV-27: Rejoin for hero B cancels the queued split: no row left, not two.
      await panel.locator('button[data-regroup-pick="join"][data-hero="hero-b"]').click();
      await expect(panel.locator("[data-queued]")).toHaveCount(0);
      await closeSplitPanel(pad);
      await playUntil(pad, board, atPhase(board, "roll", 3), "day 3's roll");
      await pad.waitForTimeout(1_000);
      await expect(board.locator("[data-groups-card]")).toHaveCount(0);
      expect((await wireTable(board))?.groups).toHaveLength(1);
      await expect(board.locator('[data-error-code="regroup-dropped"]')).toHaveCount(0);

      // EV-29: the host's split, then its rejoin, each at the next day start through the queue.
      await sendAct(pad, "gear", "pick", { item: "split", pick: "split", heroId: "hero-b" });
      await expect.poll(async () => (await wireTable(board))?.groups?.length).toBe(1);
      await playUntil(pad, board, atPhase(board, "roll", 4), "day 4's roll");
      await expect(board.locator("[data-groups-card] [data-group]")).toHaveCount(2, {
        timeout: 5_000,
      });
      expect((await wireTable(board))?.groups).toHaveLength(2);
      await sendAct(pad, "gear", "pick", { item: "split", pick: "join", heroId: "hero-b" });
      await expect.poll(async () => (await wireTable(board))?.groups?.length).toBe(2);
      await playUntil(pad, board, atPhase(board, "roll", 5), "day 5's roll");
      expect((await wireTable(board))?.groups).toHaveLength(1);
      await expect(board.locator("[data-groups-card] [data-group]")).toHaveCount(1, {
        timeout: 5_000,
      });
      await expect(board.locator('[data-error-code="regroup-dropped"]')).toHaveCount(0);
    } finally {
      await context.close();
      await session.host.close();
    }
  });
});
