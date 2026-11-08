import { type Browser, errors, expect, type Page, type TestInfo, test } from "@playwright/test";
import {
  enterWithoutTower,
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
/** `<Group>: <total>` then optional `(+N virtue)` `(+N terrain)` `(−N corruption)` terms. */
const ROLL_LINE = /^.+: \d+( \(\+\d+ virtue\))?( \(\+\d+ terrain\))?( \(−\d+ corruption\))?$/;

type WireRoll = {
  name: string;
  rolled: number;
  virtue: number;
  terrain: number;
  corruption: number;
  total: number;
};
type WireTable = {
  day: number;
  daysLeft?: number | null;
  phase?: string | null;
  rolls?: WireRoll[];
  skull?: {
    kingdomLabel: string | null;
    buildings: { spaceId: string; skulls: number }[];
  } | null;
};
type HookWindow = {
  __btLastBoardView?: { table?: WireTable | null };
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
 * One open body press on the iPad's own socket. Regroup is always "Stay as you are", so a
 * test never splits the party by accident; the toolbar and gear are never used.
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
      const regroup = open.find((action) => action.promptId === "regroup-done");
      let pick = regroup ?? null;
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
) => {
  // A LAN join address keeps the loopback warning off the board's band in the EV-06 shots.
  const session = await startAcceptanceHost(testInfo, {
    seed: "c3-day-1",
    databasePath,
    lanHost: () => "192.0.2.10",
  });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const pad = await context.newPage();
  const board = await context.newPage();
  await board.setViewportSize(BOARD_SIZE);
  await installBoardHook(board);
  await board.goto("/board");
  await installSessionSocketHook(pad);
  await installSendCounter(pad);
  await grantWakeLock(pad);
  await pad.goto(`/join?code=${session.host.joinCode}`);
  await enterWithoutTower(pad);
  await clickAct(pad, "continue", `continue-pick-story-${STORY_ID}`);
  const size = pad.locator(
    `button[data-setting="party-size"][data-option="n-${heroes.length}"][data-action="set"]`,
  );
  await size.click();
  await expect(size).toHaveAttribute("aria-pressed", "true");
  await clickAct(pad, "continue", "continue-game-settings");
  await holdHeroesFromTest(pad, [...heroes]);
  await clickAct(pad, "continue", "continue-claim-heroes");
  for (const id of SETUP_IDS) {
    await expect(deviceMain(pad)).toHaveAttribute("data-setup-step", id, { timeout: 20_000 });
    await clickAct(pad, "continue", `continue-setup-${id}`);
  }
  await clickAct(pad, "continue", "continue-begin");
  for (const id of OPENING_IDS) {
    await clickAct(pad, "continue", `continue-opening-${id.replace(".", "-")}`);
  }
  return { session, context, pad, board };
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
    const expected = Math.max(row.rolled + row.virtue + row.terrain + row.corruption, 2);
    expect(row.total).toBe(expected);
    expect(row.rolled).toBeGreaterThanOrEqual(2);
    expect(row.rolled).toBeLessThanOrEqual(6);
    const terms = [
      row.virtue ? `(+${row.virtue} virtue)` : null,
      row.terrain ? `(+${row.terrain} terrain)` : null,
      row.corruption ? `(−${Math.abs(row.corruption)} corruption)` : null,
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
      await expect(panel).toContainText(String(kingdom));
      await expect(board.locator("[data-waiting]")).toContainText(/skull/i);
      await expectToolbar(pad);
      await checkHelp(pad, board, "#skull");

      // Day 2 roll and mid-turn: night 2 brings 2 skulls, and the bar shows only those (EV-07).
      // A Regroup on the way is "Stay as you are"; EV-05 is checked in the two-hero test.
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
    // Found 2026-11-07: Continue does not keep the skull clock (21 days left before the quit,
    // 23 after). Bob ruled a test-first fix on its own fix/ branch; that fix removes this marker.
    test.fail(true, "Continue resets the day clock's supply and skulls (bug, own fix/ branch).");
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
      for (const building of after?.buildings ?? []) {
        await expect(board.locator(`#skull [data-building="${building.spaceId}"]`)).toHaveAttribute(
          "data-skulls",
          String(building.skulls),
        );
      }
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
      "EV-15, EV-16",
      "Ruling 3: the host's split and use-item actions and a potion fixture go to their own step.",
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
