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
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import {
  captureFrames,
  enterWithoutTower,
  enterWithoutTowerKeepSound,
  enterWithTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  passChapterCard,
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
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
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
  /** The Story board's own socket, to report a narration line ended. */
  __btBoardSocket?: WebSocket;
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
        (window as unknown as HookWindow).__btBoardSocket = this;
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
  /** Connect track with the mock tower: the gear Volume item is enabled only then (DEC-903). */
  withTower = false,
  /** C3/20: seed markers added to the game seed, and the fake clock for the effects wait. */
  extra: { markers?: string; fakeWait?: boolean } = {},
) => {
  // A LAN join address keeps the loopback warning off the board's band in the EV-06 shots.
  const session = await startAcceptanceHost(testInfo, {
    seed: `c3-day-1${extra.markers ?? ""}`,
    databasePath,
    lanHost: () => "192.0.2.10",
    seatTogether,
    fakeWait: extra.fakeWait,
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
  } else if (withTower) {
    await enterWithTower(pad);
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
    if (id === "starting-purse") await clickAct(pad, "spin", "spin-setup-starting-purse");
    await clickAct(pad, "continue", `continue-setup-${id}`);
  }
  await clickAct(pad, "continue", "continue-begin");
  for (const id of OPENING_IDS) {
    await clickAct(pad, "continue", `continue-opening-${id.replace(".", "-")}`);
  }
  await passChapterCard(pad, session.waitClock);
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

test.describe("C3/11 the day on the board", { tag: "@ipad-only" }, () => {
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

  /** Two heroes to day 2's turn: 31 days left on day 1, 30 after day 1's drop (EV-02; D6 EV-05). */
  const toDayTwo = async (pad: Page, board: Page) => {
    const band = board.locator("#band");
    await clickAct(pad, "continue");
    await expect(band.locator("[data-days-left]")).toHaveText("31 days left", {
      timeout: 20_000,
    });
    await playUntil(pad, board, atPhase(board, "turn", 2), "day 2's turn");
    await expect(band.locator("[data-day]")).toHaveText("Day 2");
    await expect(band.locator("[data-days-left]")).toHaveText("30 days left");
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
      // D6: after day 2's drop, 22 skulls, counting from the third counted night (DEC-947).
      expect(leftBefore).toBe("29 days left");
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
      // Continue seats the saved party on the iPads joined now (CU/16): pick, then play goes on.
      await holdHeroesFromTest(pad, [...TWO]);
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
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
    const { session, context, pad, board } = await startGame(
      browser,
      testInfo,
      FOUR,
      undefined,
      false,
      false,
      true,
    );
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
      await holdHeroesFromTest(pad2, [...FOUR]);
      // The restarted table has no tower. The re-pick (CU/16) ends the iPad pause and the tower
      // pause shows; the table goes on without it, as before this test's Continue.
      await pad2.locator('button[data-pause-ask="go-on-without"]').click({ timeout: 30_000 });
      await pad2.locator('button[data-action-id="go-on-without"]').click();
      await expect(deviceMain(pad2)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
      await expect(pad2.locator("[data-menu]")).toHaveCount(0);
      await expect(pad2.locator("[data-panel]")).toHaveCount(0);
      await expect(board2.locator("[data-panel]")).toHaveCount(0);
      await expect(deviceMain(pad2)).toHaveAttribute("data-paused", "false");
      await expect(boardMain(board2)).toHaveAttribute("data-paused", "false");
      await expectToolbar(pad2);
      await pad2.locator('[data-action="menu"]').click();
      // A restart never reconnects the tower by itself, so Volume and Tower now read "no tower".
      // Every other row reads as it did before the restart.
      const towerRow = (row: { id: string | null }) => row.id === "volume" || row.id === "tower";
      const menuAfter = await readMenu(pad2);
      expect(menuAfter.filter((row) => !towerRow(row))).toEqual(
        menuBefore.filter((row) => !towerRow(row)),
      );
      expect(menuAfter.filter(towerRow)).toEqual([
        { id: "volume", enabled: false, reason: "Only with the tower." },
        { id: "tower", enabled: true, reason: null },
      ]);
    } finally {
      await context2.close();
      await restarted.host.close();
    }
  });

  // C3/20: C3/11's blocked evals, live, the contract unchanged. The effects wait runs on the host's
  // fake clock; the seed hook sets the day (`~test-*` markers, and the host's test-only live seed).

  /** Two heroes to day 2's effects panel, with `markers` set live once day 2's turn shows. */
  const toEffectsPanel = async (
    session: Awaited<ReturnType<typeof startGame>>["session"],
    pad: Page,
    board: Page,
    markers: string,
  ) => {
    await toDayTwo(pad, board);
    await session.host.applyTestSeed(markers);
    await playUntil(pad, board, atPhase(board, "effects", 2), "day 2's effects panel");
    await expect(board.locator("#effects")).toBeVisible();
  };

  const effectLines = (board: Page) => board.locator("#effects [data-effect]").allTextContents();
  const reportNarrationEnded = (board: Page, lineId: string) =>
    board.evaluate((id) => {
      const socket = (window as unknown as HookWindow).__btBoardSocket;
      if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error("No board socket.");
      socket.send(JSON.stringify({ v: 2, type: "narration-ended", payload: { lineId: id } }));
    }, lineId);

  test("EV-03: a won quest shows +1 day and no drop line; days left do not move", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad, board } = await startGame(
      browser,
      testInfo,
      TWO,
      undefined,
      false,
      false,
      false,
      { fakeWait: true },
    );
    try {
      await toEffectsPanel(session, pad, board, "~test-effect:quest-won");
      expect(await effectLines(board)).toEqual(["+1 day"]);
      // D6 (DEC-947): 23 skulls count 30 nights from the next counted night, and tonight is added.
      await expect(board.locator("#band [data-days-left]")).toHaveText("31 days left");
      session.waitClock?.advance(4_000);
      await expect(board.locator("#band [data-day]")).toHaveText("Day 3", { timeout: 20_000 });
      // The won night dropped nothing and did not move N: the added night is spent (30 left).
      await expect(board.locator("#band [data-days-left]")).toHaveText("30 days left");
    } finally {
      await context.close();
      await session.host.close();
    }
  });

  test("EV-04, EV-14, EV-06 (effects shots), EV-11 and EV-13 (effects stop): one line per effect, no Next, 4 s with no audio", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad, board } = await startGame(
      browser,
      testInfo,
      TWO,
      undefined,
      false,
      false,
      false,
      { fakeWait: true },
    );
    try {
      await toEffectsPanel(session, pad, board, "~test-effect:cleanse");
      const lines = await effectLines(board);
      const night = (await wireTable(board))?.skull;
      expect(night).toBeDefined();
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe("+1 day");
      expect(lines[1]).toMatch(/^A skull lands on /);
      // No totals row, no recap, no button on the board or a Next on the iPad.
      await expect(board.locator("#effects")).not.toContainText(/total|recap|summary/i);
      await expect(board.locator("#effects button")).toHaveCount(0);
      await expect(deviceMain(pad).locator('button[data-action-id="continue"]')).toHaveCount(0);
      // The toolbar and help stand on the effects stop (EV-11, EV-13); help changes nothing.
      await expectToolbar(pad);
      await checkHelp(pad, board, "#effects");
      await shot(board, testInfo, "ev06-board-effects");
      await shot(pad, testInfo, "ev06-ipad-effects");
      // No audio: still here at 3.9 s, gone at 4.1 s (EV-14), and the day goes on.
      session.waitClock?.advance(3_900);
      await pad.waitForTimeout(200);
      await expect(board.locator("#effects")).toBeVisible();
      session.waitClock?.advance(200);
      await expect(board.locator("#band [data-day]")).toHaveText("Day 3", { timeout: 20_000 });
      await expect(board.locator("#effects")).toHaveCount(0);
      // The happy path never needed the gear (EV-12).
      await expect(boardMain(board)).toHaveAttribute("data-gear-opens", "0");
    } finally {
      await context.close();
      await session.host.close();
    }
  });

  test("EV-14, EV-17: a narrated effects panel waits for its audio end, never a timer", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad, board } = await startGame(
      browser,
      testInfo,
      TWO,
      undefined,
      false,
      false,
      false,
      { fakeWait: true, markers: "~test-effects-line:effects.line-1" },
    );
    try {
      await toEffectsPanel(session, pad, board, "~test-effect:cleanse");
      await expect(deviceMain(pad).locator('button[data-action-id="continue"]')).toHaveCount(0);
      // 4.5 s with no audio end: the iPad and the board are still on the step.
      session.waitClock?.advance(4_500);
      await pad.waitForTimeout(300);
      await expect(board.locator("#effects")).toBeVisible();
      expect((await wireTable(board))?.phase).toBe("effects");
      // Another line's end does nothing.
      await reportNarrationEnded(board, "another.line");
      await pad.waitForTimeout(300);
      await expect(board.locator("#effects")).toBeVisible();
      // Its own line's end moves on.
      await reportNarrationEnded(board, "effects.line-1");
      await expect(board.locator("#band [data-day]")).toHaveText("Day 3", { timeout: 20_000 });
    } finally {
      await context.close();
      await session.host.close();
    }
  });

  test("EV-18: a restart or a quit during the effects panel resumes it once, with each effect applied once", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(420_000);
    const databasePath = testInfo.outputPath("ev18.sqlite");
    const first = await startGame(browser, testInfo, TWO, databasePath, false, false, false, {
      fakeWait: true,
    });
    let host = first.session;
    let context = first.context;
    let pad = first.pad;
    let board = first.board;
    try {
      await toEffectsPanel(host, pad, board, "~test-effect:cleanse");
      const before = await effectLines(board);
      expect(before).toHaveLength(2);
      let daysBefore = (await board.locator("#band [data-days-left]").textContent()) ?? "";

      // Run 1: the host restarts before the panel advances, then Continue.
      await context.close();
      await host.host.close();
      for (const run of ["restart", "quit"] as const) {
        if (run === "restart") {
          host = await startAcceptanceHost(testInfo, {
            databasePath,
            seed: "c3-day-1",
            fakeWait: true,
          });
          context = await browser.newContext({ baseURL: host.baseURL, ...PORTRAIT });
          pad = await context.newPage();
          board = await context.newPage();
          await board.setViewportSize(BOARD_SIZE);
          await installBoardHook(board);
          await board.goto("/board");
          await installSessionSocketHook(pad);
          await grantWakeLock(pad);
          await pad.goto(`/join?code=${host.host.joinCode}`);
          await setSoundAndKeep(pad);
          await clickAct(pad, "continue", "continue-saved-game");
          await holdHeroesFromTest(pad, [...TWO]);
          await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", {
            timeout: 30_000,
          });
        } else {
          // Run 2: quit from the Menu on the same step, then Continue from the session screen.
          await pad.locator('[data-action="menu"]').click();
          await pad.locator('button[data-gear-item="save-and-quit"]').click();
          await pad.locator("[data-menu]").getByRole("button", { name: "Save and quit" }).click();
          await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", {
            timeout: 30_000,
          });
          await clickAct(pad, "continue", "continue-saved-game");
          await holdHeroesFromTest(pad, [...TWO]);
          await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", {
            timeout: 30_000,
          });
        }
        // The same step shows again, with the same lines: none lost, none doubled.
        await expect
          .poll(async () => (await wireTable(board))?.phase, { timeout: 30_000 })
          .toBe("effects");
        expect(await effectLines(board)).toEqual(before);
        await expect(board.locator("#band [data-days-left]")).toHaveText(daysBefore);
        host.waitClock?.advance(4_000);
        await expect(board.locator("#band [data-day]")).toHaveText(
          run === "restart" ? "Day 3" : "Day 4",
          { timeout: 20_000 },
        );
        // Applied once: the count read at the panel stays after the day goes on.
        await expect(board.locator("#band [data-days-left]")).toHaveText(daysBefore);
        if (run === "restart") {
          // Back onto the effects panel for the quit run: play on to a second panel on day 3.
          await playUntil(pad, board, atPhase(board, "turn", 3), "day 3's turn");
          await host.host.applyTestSeed("~test-effect:cleanse");
          await playUntil(pad, board, atPhase(board, "effects", 3), "day 3's effects panel");
          before.splice(0, before.length, ...(await effectLines(board)));
          daysBefore = (await board.locator("#band [data-days-left]").textContent()) ?? "";
          expect(before).toHaveLength(2);
        }
      }
    } finally {
      await context.close();
      await host.host.close();
    }
  });

  test("EV-01 (seeded groups): a helping virtue and a corruption show in the day roll", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const { session, context, board } = await startGame(
      browser,
      testInfo,
      TWO,
      undefined,
      false,
      false,
      false,
      { markers: "~test-virtues:hero-a=1~test-corruption:hero-b=1" },
    );
    try {
      await expectRollMatchesEngine(board, 1);
      const rolls = (await wireTable(board))?.rolls ?? [];
      const a = rolls.find((row) => row.virtue > 0);
      const b = rolls.find((row) => row.corruption < 0);
      expect(a?.virtue).toBe(1);
      expect(b?.corruption).toBe(-1);
      const lines = await board.locator("#roll li[data-roll]").allTextContents();
      expect(lines.filter((line) => line.includes("(+1 virtue)"))).toHaveLength(1);
      expect(lines.filter((line) => line.includes("(−1 corruption)"))).toHaveLength(1);
      // A group with no modifier shows the total alone: none here, both heroes carry one.
      expect(lines).toHaveLength(2);
    } finally {
      await context.close();
      await session.host.close();
    }
  });

  test("EV-09: a seeded drop into a kingdom with a 3-skull building, placed on the iPad, makes it fall", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(420_000);
    const inE = PROVING_GROUNDS_PLAY.board.spaces.filter(
      (space) => space.building && space.kingdom === "E",
    );
    const target = inE[0];
    const other = inE[1];
    if (!target || !other) throw new Error("The test board needs two buildings in E.");
    // Four heroes: night 1 drops one skull, night 2 drops two. Night 1 goes to E and so does night
    // 2's first; the second skull of night 2 shows the building that fell.
    const { session, context, pad, board } = await startGame(
      browser,
      testInfo,
      FOUR,
      undefined,
      false,
      false,
      true,
      { fakeWait: true, markers: `~test-skulls:${target.id}=3~test-kingdom:E+E` },
    );
    const record = (day: number, spaceId: string) =>
      pad.locator(
        `button[data-prompt-id="skull-record--${day}--${spaceId}"][data-action-id="record"]`,
      );
    const padBuildings = async () =>
      (
        await pad
          .locator('button[data-action-id="record"]')
          .evaluateAll((buttons) =>
            buttons.map((button) => button.getAttribute("data-prompt-id") ?? ""),
          )
      )
        .map((id) => id.split("--").slice(2).join("--"))
        .filter((id) => id !== "inside")
        .sort();
    const standingInE = inE.map((space) => space.id).sort();
    try {
      // Night 1: the board names E and the iPad lists only E's standing buildings.
      await playUntil(pad, board, atPhase(board, "skull", 1), "day 1's skull placement");
      const first = await wireTable(board);
      expect(first?.skull?.kingdomLabel).toContain("(E)");
      expect((first?.skull?.buildings ?? []).map((row) => row.spaceId).sort()).toEqual(standingInE);
      await clickAct(pad, "continue");
      await expect(record(1, other.id)).toBeVisible({ timeout: 20_000 });
      expect(await padBuildings()).toEqual(standingInE);
      await record(1, other.id).click();

      // Night 2, first skull: E again, with the 3-skull building listed and not auto-advanced.
      await playUntil(pad, board, atPhase(board, "skull", 2), "day 2's skull placement");
      await clickAct(pad, "continue");
      await expect(record(2, target.id)).toBeVisible({ timeout: 20_000 });
      expect(await padBuildings()).toEqual(standingInE);
      session.waitClock?.advance(5_000);
      await pad.waitForTimeout(300);
      expect((await wireTable(board))?.phase).toBe("skull");
      const seeded = (await wireTable(board))?.skull?.buildings.find(
        (row) => row.spaceId === target.id,
      );
      expect(seeded?.skulls).toBe(3);

      // The press makes it fall: the board names it, and it leaves the iPad's list.
      await record(2, target.id).click();
      await expect(board.locator("[data-fell]").first()).toBeVisible({ timeout: 20_000 });
      await expect(record(2, target.id)).toHaveCount(0);
      expect((await padBuildings()).includes(target.id)).toBe(false);
    } finally {
      await context.close();
      await session.host.close();
    }
  });

  test("EV-05, EV-11, EV-12, EV-13 (day start, groups card): no Regroup prompt, the queued split applies and the card shows", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    // Two heroes seated on one space by the seed hook, with a split queued from the host's action.
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
      expect((await wireTable(board))?.groups).toHaveLength(1);
      await sendAct(pad, "gear", "pick", { item: "split", pick: "split", heroId: "hero-b" });
      await playUntil(pad, board, atPhase(board, "roll", 3), "day 3's roll");

      // The queued split applied at day start and the card shows, with nothing pressable.
      const card = board.locator("[data-groups-card]");
      await expect(card).toBeVisible({ timeout: 5_000 });
      await expect(card.locator("[data-group]")).toHaveText(["Group 1: Hero A", "Group 2: Hero B"]);
      await expect(card.locator("button, a, [role='button'], [tabindex]")).toHaveCount(0);
      await expect(boardMain(board).locator("button")).toHaveCount(0);
      await expectNoRegroupOnPad(pad, "the day-start stop");
      expect((await wireTable(board))?.groups).toHaveLength(2);
      // The toolbar and help stand on this stop, and help changes nothing.
      await expectToolbar(pad);
      await checkHelp(pad, board, "[data-groups-card], #roll");
      // The happy path to here never opened the Menu.
      await expect(boardMain(board)).toHaveAttribute("data-gear-opens", "0");
    } finally {
      await context.close();
      await session.host.close();
    }
  });

  test.fixme("EV-08 (names): the engine keeps corruption counts only; the names come with C3-08", async () => {});
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
  await holdHeroesFromTest(pad, [...heroes]);
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
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

test.describe("CU/04 queued split and rejoin (PT-18, PT-06)", { tag: "@ipad-only" }, () => {
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
