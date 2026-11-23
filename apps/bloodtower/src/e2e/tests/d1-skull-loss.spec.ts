import { type Browser, errors, expect, type Page, type TestInfo, test } from "@playwright/test";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import {
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";

/**
 * D1 / 01-skull-loss-dispatch EV-09 (DEC-905, DEC-931, DEC-915; C3/10 EV-08). The fatal skull of a
 * no-tower night shows its one line, then the game is lost: no effects panel, no day 2, the
 * session screen reads "Game 1 lost" and offers no Continue.
 */

const FOUR = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;

type WireTable = { day: number; phase?: string | null; skull?: { lines?: string[] } | null };
type HookWindow = {
  __btLastBoardView?: { table?: WireTable | null };
  __btSessionSocket?: WebSocket;
  __btLastDeviceView?: { actions: { promptId: string; actionId: string; open: boolean }[] };
};

/** Tracks the board's last `boardView`, so the test reads the table the board was given. */
const installBoardHook = async (page: Page) => {
  await page.addInitScript(() => {
    const Native = window.WebSocket;
    const own = Object.getOwnPropertyDescriptor(Native.prototype, "onmessage");
    class BoardTrackingWebSocket extends Native {
      override set onmessage(handler: ((event: MessageEvent) => unknown) | null) {
        const wrapped = handler
          ? (event: MessageEvent) => {
              try {
                const message = JSON.parse(String(event.data));
                if (message?.type === "boardView") {
                  (window as unknown as HookWindow).__btLastBoardView = message.payload;
                }
              } catch (error) {
                console.error("board hook: frame is not JSON", error);
              }
              return handler.call(this, event);
            }
          : null;
        own?.set?.call(this, wrapped);
      }
      override get onmessage() {
        return own?.get?.call(this) ?? null;
      }
    }
    window.WebSocket = BoardTrackingWebSocket;
  });
};

const wireTable = (page: Page) =>
  page.evaluate(() => (window as unknown as HookWindow).__btLastBoardView?.table ?? null);

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const SKIP = ["quit-story", "reconnect", "go-on-without", "new-game", "done-for-tonight", "back"];
const PREFER = ["continue", "end-turn", "record", "leave", "enter"];
const pressOnce = (pad: Page) =>
  pad.evaluate(
    ({ prefer, skip }) => {
      const win = window as unknown as HookWindow;
      const socket = win.__btSessionSocket;
      const view = win.__btLastDeviceView;
      if (!socket || socket.readyState !== WebSocket.OPEN || !view) return false;
      const open = view.actions.filter((action) => action.open);
      let pick = open.find((action) => action.promptId === "regroup-done") ?? null;
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
    {
      prefer: PREFER,
      skip: [...SKIP, "split", "join", "walk", "tower-connect", "tower-calibrate"],
    },
  );

const playUntil = async (pad: Page, board: Page, phase: string, what: string) => {
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    if ((await wireTable(board))?.phase === phase) return;
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
      if (!(error instanceof errors.TimeoutError)) throw error;
    }
  }
  throw new Error(`Timed out before ${what}`);
};

const startGame = async (browser: Browser, testInfo: TestInfo, markers: string) => {
  const session = await startAcceptanceHost(testInfo, {
    seed: `d1-loss${markers}`,
    lanHost: () => "192.0.2.10",
  });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const pad = await context.newPage();
  const board = await context.newPage();
  await board.setViewportSize(BOARD_SIZE);
  await installBoardHook(board);
  await board.goto("/board");
  await installSessionSocketHook(pad);
  await pad.addInitScript(() => {
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      get: () => ({
        request: async () => ({
          released: false,
          release: async () => {},
          addEventListener: () => {},
        }),
      }),
    });
  });
  await pad.goto(`/join?code=${session.host.joinCode}`);
  await enterWithoutTower(pad);
  await clickAct(pad, "continue", "continue-pick-story-test");
  await pad
    .locator(`button[data-setting="party-size"][data-option="n-4"][data-action="set"]`)
    .click();
  await clickAct(pad, "continue", "continue-game-settings");
  await holdHeroesFromTest(pad, [...FOUR]);
  await clickAct(pad, "continue", "continue-claim-heroes");
  for (const id of SETUP_IDS) {
    await expect(pad.locator("main.bt-device")).toHaveAttribute("data-setup-step", id, {
      timeout: 20_000,
    });
    if (id === "starting-purse") await clickAct(pad, "spin", "spin-setup-starting-purse");
    await clickAct(pad, "continue", `continue-setup-${id}`);
  }
  await clickAct(pad, "continue", "continue-begin");
  for (const id of OPENING_IDS) {
    await clickAct(pad, "continue", `continue-opening-${id.replace(".", "-")}`);
  }
  return { session, context, pad, board };
};

/** Night 1 with three E buildings at 4, the fourth at 3 and the one skull forced to E. */
const playFatalNight = async (
  browser: Browser,
  testInfo: TestInfo,
  check: (ctx: { pad: Page; board: Page }) => Promise<void>,
) => {
  const east = PROVING_GROUNDS_PLAY.board.spaces.filter(
    (space) => space.building && space.kingdom === "E",
  );
  const fourth = east[3];
  if (east.length < 4 || !fourth?.building) {
    throw new Error("The test board needs four buildings in E.");
  }
  // The board names a skull's building by its kind: "A skull falls on Sanctuary."
  const line = `${fourth.building.charAt(0).toUpperCase()}${fourth.building.slice(1)}`;
  const skulls = east.map((space, index) => `${space.id}=${index < 3 ? 4 : 3}`).join(",");
  const { session, context, pad, board } = await startGame(
    browser,
    testInfo,
    `~test-skulls:${skulls}~test-kingdom:E`,
  );
  try {
    // Play day 1 to the close: the night's one skull is drawn and its line is up.
    await playUntil(pad, board, "skull-sim", "night 1's skull line");
    const table = await wireTable(board);
    expect(table?.day).toBe(1);
    expect(table?.skull?.lines).toEqual([`A skull falls on ${line}.`]);
    await expect(board.locator("#skull [data-skull-line]")).toHaveCount(1);
    await expect(board.locator("#skull [data-skull-line]")).toHaveText(`A skull falls on ${line}.`);

    // Press past the line.
    await clickAct(pad, "continue", "skull-sim-day-1");
    await check({ pad, board });
  } finally {
    await context.close();
    await session.host.close();
  }
};

const EFFECTS_PANEL = "#effects, [data-day-panel='effects']";

test.describe("D1 the fatal skull ends the game", () => {
  test("EV-09 (night) the fatal skull shows one line and no effects panel follows", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    await playFatalNight(browser, testInfo, async ({ board }) => {
      await board.waitForTimeout(1_000);
      await expect(board.locator(EFFECTS_PANEL)).toHaveCount(0);
    });
  });

  // BLOCKED, named in the D1 build report: the live host never configures chapters (only tests
  // do), so a day's loss does not end the game and day 2 rolls. Wiring chapters into the host is
  // outside D1's Touches. The body is EV-09's contract, not weakened.
  // Ruled 2026-11-18 (Bob's approved F1/03, via Warden): F1/03 (live quests) wires live chapter
  // loading and removes this fixme; D1 ships with it.
  test.fixme("EV-09 (game end) day 2 never rolls, Game 1 lost, no Continue", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    await playFatalNight(browser, testInfo, async ({ pad, board }) => {
      await expect(pad.locator("main.bt-device")).toHaveAttribute("data-screen", "session", {
        timeout: 20_000,
      });
      await expect(board.locator(EFFECTS_PANEL)).toHaveCount(0);
      expect((await wireTable(board))?.day ?? 1).toBeLessThan(2);
      await expect(pad.locator('button[data-prompt-id*="day-2"]')).toHaveCount(0);
      // The session screen: the game reads lost, and Continue is not offered (C3/10 EV-08).
      const labels = (await pad.locator("main.bt-device .bt-scroll button").allInnerTexts()).map(
        (text) => text.trim().replace(/\s+/g, " "),
      );
      expect(labels).toContain("Game 1 lost");
      expect(labels).not.toContain("Continue");
      await expect(board.locator("[data-session-row='continue']")).toHaveCount(0);
    });
  });
});
