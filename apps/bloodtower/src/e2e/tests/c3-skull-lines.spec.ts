import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { type Browser, errors, expect, type Page, type TestInfo, test } from "@playwright/test";
import {
  enterWithoutTower,
  enterWithTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
  waitForBoardAnimationsSettled,
} from "./support/acceptance.ts";

/**
 * CU/03 (PT-07): the no-tower skull lines stack on the Story board, and with the tower the
 * table still places the skull. The real host cannot put 4 skulls in one night (the tuning has
 * no test hook, and 4 heroes drop 1 then 2), so the 3- and 4-line looks rewrite the board's
 * `boardView` frame on its way in. The wire shape is the real one; the real host test below
 * checks the engine's own lines.
 */

const FOUR = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SETUP_IDS = ["seals-and-skulls", "place-heroes"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;

type WireTable = { day: number; phase?: string | null; skull?: { lines?: string[] } | null };
type HookWindow = {
  __btLastBoardView?: { table?: WireTable | null };
  __btSessionSocket?: WebSocket;
  __btLastDeviceView?: { actions: { promptId: string; actionId: string; open: boolean }[] };
};

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== "ipad", "The board shots are at 1920x1080 from one project.");
});

/** Tracks the board's last `boardView`; `rewrite` swaps the skull lines for these on arrival. */
const installBoardHook = async (page: Page, rewrite: string[] | null) => {
  await page.addInitScript((lines) => {
    const Native = window.WebSocket;
    const own = Object.getOwnPropertyDescriptor(Native.prototype, "onmessage");
    class BoardTrackingWebSocket extends Native {
      override set onmessage(handler: ((event: MessageEvent) => unknown) | null) {
        const wrapped = handler
          ? (event: MessageEvent) => {
              let out = event;
              try {
                const message = JSON.parse(String(event.data));
                if (message?.type === "boardView") {
                  const skull = message.payload?.table?.skull;
                  if (lines && skull && Array.isArray(skull.lines)) {
                    skull.lines = lines;
                    out = new MessageEvent("message", { data: JSON.stringify(message) });
                  }
                  (window as unknown as HookWindow).__btLastBoardView = message.payload;
                }
              } catch (error) {
                console.error("board hook: frame is not JSON", error);
              }
              return handler.call(this, out);
            }
          : null;
        own?.set?.call(this, wrapped);
      }
      override get onmessage() {
        return own?.get?.call(this) ?? null;
      }
    }
    window.WebSocket = BoardTrackingWebSocket;
  }, rewrite);
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

const startGame = async (
  browser: Browser,
  testInfo: TestInfo,
  options: { tower: boolean; rewrite: string[] | null },
) => {
  const session = await startAcceptanceHost(testInfo, {
    seed: "cu03-1",
    lanHost: () => "192.0.2.10",
  });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const pad = await context.newPage();
  const board = await context.newPage();
  await board.setViewportSize(BOARD_SIZE);
  await installBoardHook(board, options.rewrite);
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
  if (options.tower) await enterWithTower(pad);
  else await enterWithoutTower(pad);
  await clickAct(pad, "continue", "continue-pick-story-test");
  const size = pad.locator(
    `button[data-setting="party-size"][data-option="n-4"][data-action="set"]`,
  );
  await size.click();
  await clickAct(pad, "continue", "continue-game-settings");
  await holdHeroesFromTest(pad, [...FOUR]);
  await clickAct(pad, "continue", "continue-claim-heroes");
  for (const id of SETUP_IDS) {
    await expect(pad.locator("main.bt-device")).toHaveAttribute("data-setup-step", id, {
      timeout: 20_000,
    });
    await clickAct(pad, "continue", `continue-setup-${id}`);
  }
  await clickAct(pad, "continue", "continue-begin");
  for (const id of OPENING_IDS) {
    await clickAct(pad, "continue", `continue-opening-${id.replace(".", "-")}`);
  }
  return { session, context, pad, board };
};

/** The stacked panel: one element per line, in order, whole, and nothing in it takes a press. */
const expectStacked = async (board: Page, lines: string[]) => {
  const panel = board.locator("#skull");
  await expect(panel).toBeVisible({ timeout: 20_000 });
  const items = panel.locator("[data-skull-line]");
  await expect(items).toHaveCount(lines.length);
  expect(await items.allTextContents()).toEqual(lines);
  const tops: number[] = [];
  for (let index = 0; index < lines.length; index++) {
    const item = items.nth(index);
    await expect(item).toBeVisible();
    const box = await item.boundingBox();
    expect(box).not.toBeNull();
    tops.push(box?.y ?? 0);
    const clipped = await item.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    expect(clipped).toBe(false);
  }
  expect([...tops].sort((a, b) => a - b)).toEqual(tops);
  expect(new Set(tops).size).toBe(lines.length);
  const whole = await panel.evaluate((el) => el.scrollHeight <= el.clientHeight + 1);
  expect(whole).toBe(true);
  await expect(panel.locator("button, a, [role=button]")).toHaveCount(0);
};

const SHOT_DIR = process.env.CU03_SHOT_DIR;
const shot = async (page: Page, testInfo: TestInfo, name: string) => {
  await waitForBoardAnimationsSettled(page);
  const path = testInfo.outputPath(`${name}.png`);
  await page.locator("#skull").screenshot({ path });
  await testInfo.attach(name, { path, contentType: "image/png" });
  if (SHOT_DIR) {
    const copy = `${SHOT_DIR}/${name}.png`;
    mkdirSync(dirname(copy), { recursive: true });
    await page.screenshot({ path: copy });
  }
};

test.describe("CU/03 stacked skull lines", () => {
  test("EV-07 the real host's lines stack, whole and unpressable", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad, board } = await startGame(browser, testInfo, {
      tower: false,
      rewrite: null,
    });
    try {
      await playUntil(pad, board, "skull-sim", "night 1's skull");
      const lines = (await wireTable(board))?.skull?.lines ?? [];
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatch(/^A skull falls on [A-Z][a-z]+\.$/);
      await expectStacked(board, lines);
    } finally {
      await context.close();
      await session.host.close();
    }
  });

  test("EV-07 and EV-08 four lines, then three, stack one under another", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const four = [
      "A skull falls on Village.",
      "A skull falls on Sanctuary.",
      "A skull falls on Sanctuary.",
      "A skull falls on Citadel.",
    ];
    const { session, context, pad, board } = await startGame(browser, testInfo, {
      tower: false,
      rewrite: four,
    });
    try {
      await playUntil(pad, board, "skull-sim", "night 1's skull");
      await expectStacked(board, four);
      await shot(board, testInfo, "ev07-four-lines");
    } finally {
      await context.close();
      await session.host.close();
    }
  });

  test("EV-08 three lines for the mockup comparison", async ({ browser }, testInfo) => {
    test.setTimeout(300_000);
    const three = [
      "A skull falls on Bazaar.",
      "A skull falls on Bazaar.",
      "A skull falls on Village.",
    ];
    const { session, context, pad, board } = await startGame(browser, testInfo, {
      tower: false,
      rewrite: three,
    });
    try {
      await playUntil(pad, board, "skull-sim", "night 1's skull");
      await expectStacked(board, three);
      await shot(board, testInfo, "ev08-three-lines");
    } finally {
      await context.close();
      await session.host.close();
    }
  });

  test("EV-14 tower on: the table places the skull; no tower: no command goes out", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const withTower = await startGame(browser, testInfo, { tower: true, rewrite: null });
    try {
      await playUntil(withTower.pad, withTower.board, "skull", "the tower-on skull prompt");
      // The table rolls the kingdom die and says so; only then do the building prompts open.
      await clickAct(withTower.pad, "continue");
      const records = withTower.pad.locator(
        'main.bt-device button[data-action-id="record"][data-prompt-id^="skull-record--"]',
      );
      await expect(records.first()).toBeEnabled({ timeout: 20_000 });
      const ids = await records.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-prompt-id") ?? ""),
      );
      const buildings = ids.filter((id) => !id.endsWith("--inside"));
      expect(buildings).toHaveLength(16);
      // The app picked none: no line, and the phase waits on the table.
      const table = await wireTable(withTower.board);
      expect(table?.phase).toBe("skull");
      expect(table?.skull?.lines ?? []).toEqual([]);
    } finally {
      await withTower.context.close();
      await withTower.session.host.close();
    }

    const without = await startGame(browser, testInfo, { tower: false, rewrite: null });
    try {
      await playUntil(without.pad, without.board, "skull-sim", "the no-tower skull");
      expect(without.session.tower.sent()).toEqual([]);
    } finally {
      await without.context.close();
      await without.session.host.close();
    }
  });
});
