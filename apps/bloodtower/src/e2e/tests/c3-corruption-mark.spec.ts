import {
  type Browser,
  type BrowserContext,
  expect,
  type Page,
  type TestInfo,
  test,
} from "@playwright/test";
import {
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
  waitForBoardAnimationsSettled,
} from "./support/acceptance.ts";

/**
 * CU/10 (PT-17): the corruption mark on the edge band. The counts come from the test-only seed
 * marker `~test-corruption:` (engine `playState.ts`), which sets them at the start of the game.
 * The seed cannot change a count mid-game, so EV-04's live raise and lower is `fixme` below.
 */

const STORY_ID = "test";
const FOUR = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const TWO = ["hero-a", "hero-b"] as const;
const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SETUP_IDS = ["seals-and-skulls", "place-heroes"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const label = (name: string) => `${name} has two corruptions. A third ends the game.`;

type HookWindow = { __btSent?: number };

const deviceMain = (page: Page) => page.locator("main.bt-device");

/** Counts every frame the page sends, so "display only" can be shown. */
const installSendHook = async (page: Page) => {
  await page.addInitScript(() => {
    const send = WebSocket.prototype.send;
    WebSocket.prototype.send = function (this: WebSocket, data) {
      const win = window as unknown as HookWindow;
      win.__btSent = (win.__btSent ?? 0) + 1;
      return send.call(this, data);
    };
  });
};
const sent = (page: Page) => page.evaluate(() => (window as unknown as HookWindow).__btSent ?? 0);

const grantWakeLock = async (page: Page) => {
  await page.addInitScript(() => {
    const lock = {
      request: async () => ({
        released: false,
        release: async () => {},
        addEventListener: () => {},
      }),
    };
    Object.defineProperty(navigator, "wakeLock", { configurable: true, get: () => lock });
  });
};

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
  await expect(footer.locator("button").last()).toHaveAttribute("data-action", "menu");
};

/** Join, skip the tower, pick the test story, hold the heroes, run setup and the opening. */
const startGame = async (
  browser: Browser,
  testInfo: TestInfo,
  heroes: readonly string[],
  options: { seed: string; seatTogether?: boolean; databasePath?: string },
) => {
  const session = await startAcceptanceHost(testInfo, {
    seed: options.seed,
    databasePath: options.databasePath,
    lanHost: () => "192.0.2.10",
    seatTogether: options.seatTogether,
  });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const pad = await context.newPage();
  const board = await context.newPage();
  await board.setViewportSize(BOARD_SIZE);
  await installSendHook(board);
  await board.goto("/board");
  await installSessionSocketHook(pad);
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

/** The band at mid-turn: past the roll panel, the days-left line is showing. */
const toMidTurn = async (pad: Page, board: Page) => {
  await clickAct(pad, "continue");
  await expect(board.locator("#band [data-days-left]")).toBeVisible({ timeout: 20_000 });
};

const markIds = (board: Page) =>
  board
    .locator("[data-band] [data-corruption-mark]")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-corruption-mark")));

const shot = async (page: Page, testInfo: TestInfo, name: string) => {
  const path = testInfo.outputPath(`${name}.png`);
  await waitForBoardAnimationsSettled(page);
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: "image/png" });
};

const closeAll = async (context: BrowserContext, host: { close: () => Promise<void> }) => {
  await context.close();
  await host.close();
};

test.describe("CU/10 the corruption mark on the band", () => {
  test.beforeEach(({ browserName: _browserName }, testInfo) => {
    test.skip(testInfo.project.name !== "ipad", "The approved mockup is the 1920x1080 board.");
  });

  test("EV-01, EV-05, EV-06, EV-07, EV-09: hero B at 2 carries the mark, display only, and it survives Continue", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const seed = "c3-day-1~test-corruption:hero-a=1,hero-b=2,hero-c=0";
    const { session, context, pad, board } = await startGame(browser, testInfo, FOUR, { seed });
    const { databasePath } = session;
    let closed = false;
    try {
      await toMidTurn(pad, board);
      const band = board.locator("[data-band]");
      // EV-01: exactly one mark, hero B's, in B's own panel span next to B's corruption text.
      await expect(board.locator("[data-corruption-mark]")).toHaveCount(1);
      const mark = band.locator('[data-hero-panel="hero-b"] [data-corruption-mark="hero-b"]');
      await expect(mark).toHaveCount(1);
      await expect(mark).toHaveAttribute("aria-label", label("Hero B"));
      expect((await mark.textContent())?.trim()).toBe("");
      await expect(mark.locator("svg")).toBeVisible();
      await expect(
        band.locator('[data-hero-panel="hero-b"] [data-hero-corruptions="hero-b"]'),
      ).toContainText("2 corruptions");
      await expect(
        band.locator('[data-hero-panel="hero-a"] [data-hero-corruptions="hero-a"]'),
      ).toContainText("1 corruption");
      await expect(band.locator('[data-hero-panel="hero-c"] [data-corruption-mark]')).toHaveCount(
        0,
      );

      // EV-07: the band is one row at 1920x1080 and the mark is inside the viewport.
      const bandBox = await band.boundingBox();
      const markBox = await mark.boundingBox();
      expect(bandBox?.height).toBeLessThanOrEqual(72);
      expect(markBox).not.toBeNull();
      expect(markBox?.width).toBeGreaterThan(8);
      expect(markBox?.x ?? 0).toBeGreaterThanOrEqual(bandBox?.x ?? 0);
      expect((markBox?.x ?? 0) + (markBox?.width ?? 0)).toBeLessThanOrEqual(1920);
      const overflow = await band.evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      await shot(board, testInfo, "ev07-board-band");

      // EV-06: no warning line and no foe mark on a day.
      await expect(board.locator("[data-warning]")).toHaveCount(0);
      await expect(board.locator("[data-foe]")).toHaveCount(0);

      // EV-05: not a button, no act; clicking it sends nothing and changes nothing.
      await expect(mark.locator("button, [data-action]")).toHaveCount(0);
      await expect(mark).not.toHaveAttribute("data-action", /.*/);
      await expect(mark).not.toHaveAttribute("tabindex", /.*/);
      const stateBefore = await board.locator("main.bt-board").evaluate((el) => el.outerHTML);
      const sentBefore = await sent(board);
      await mark.click({ force: true });
      await board.waitForTimeout(300);
      expect(await sent(board)).toBe(sentBefore);
      expect(await board.locator("main.bt-board").evaluate((el) => el.outerHTML)).toBe(stateBefore);

      // EV-09: save and quit, restart the host, Continue: the mark is recomputed, B only.
      await pad.locator('[data-action="menu"]').click();
      await pad.locator('button[data-gear-item="save-and-quit"]').click();
      await pad.locator("[data-menu]").getByRole("button", { name: "Save and quit" }).click();
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", {
        timeout: 30_000,
      });
      await closeAll(context, session.host);
      closed = true;
    } finally {
      if (!closed) await closeAll(context, session.host);
    }

    const restarted = await startAcceptanceHost(testInfo, { databasePath, seed });
    const context2 = await browser.newContext({ baseURL: restarted.baseURL, ...PORTRAIT });
    try {
      const pad2 = await context2.newPage();
      const board2 = await context2.newPage();
      await board2.setViewportSize(BOARD_SIZE);
      await board2.goto("/board");
      await installSessionSocketHook(pad2);
      await grantWakeLock(pad2);
      await pad2.goto(`/join?code=${restarted.host.joinCode}`);
      await clickAct(pad2, "continue", "continue-saved-game");
      await expect(deviceMain(pad2)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
      await holdHeroesFromTest(pad2, [...FOUR]);
      await expect(board2.locator("[data-band]")).toBeVisible({ timeout: 20_000 });
      await expect.poll(() => markIds(board2), { timeout: 20_000 }).toEqual(["hero-b"]);
      await expect(
        board2.locator('[data-hero-panel="hero-b"] [data-corruption-mark="hero-b"]'),
      ).toHaveAttribute("aria-label", label("Hero B"));
      await expect(pad2.locator("[data-menu]")).toHaveCount(0);
      await expect(deviceMain(pad2)).toHaveAttribute("data-paused", "false");
      await expect(board2.locator("main.bt-board")).toHaveAttribute("data-paused", "false");
      await expectToolbar(pad2);
    } finally {
      await closeAll(context2, restarted.host);
    }
  });

  test("EV-10: a member's mark sits in the lead's span; two at 2 give two marks", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    // One group of two heroes. Which is the lead follows the seed, so read it from the band.
    const memberAt2 = "c3-day-1~test-corruption:hero-a=0,hero-b=2";
    const { session, context, pad, board } = await startGame(browser, testInfo, TWO, {
      seed: memberAt2,
      seatTogether: true,
    });
    try {
      await toMidTurn(pad, board);
      await expect(board.locator("[data-hero-panel]")).toHaveCount(1);
      const lead = await board.locator("[data-hero-panel]").getAttribute("data-hero-panel");
      expect(lead).toBe("hero-a");
      const span = board.locator('[data-hero-panel="hero-a"]');
      await expect(span.locator('[data-corruption-mark="hero-b"]')).toHaveCount(1);
      await expect(span.locator('[data-corruption-mark="hero-b"]')).toHaveAttribute(
        "aria-label",
        label("Hero B"),
      );
      await expect(span.locator('[data-corruption-mark="hero-a"]')).toHaveCount(0);
    } finally {
      await closeAll(context, session.host);
    }

    const bothAt2 = await startGame(browser, testInfo, TWO, {
      seed: "c3-day-1~test-corruption:hero-a=2,hero-b=2",
      seatTogether: true,
    });
    try {
      await toMidTurn(bothAt2.pad, bothAt2.board);
      const span = bothAt2.board.locator('[data-hero-panel="hero-a"]');
      await expect(span.locator("[data-corruption-mark]")).toHaveCount(2);
      await expect(span.locator('[data-corruption-mark="hero-a"]')).toHaveAttribute(
        "aria-label",
        label("Hero A"),
      );
      await expect(span.locator('[data-corruption-mark="hero-b"]')).toHaveAttribute(
        "aria-label",
        label("Hero B"),
      );
    } finally {
      await closeAll(bothAt2.context, bothAt2.session.host);
    }
  });

  test("EV-08 (live half): no corruptions held, no mark and no zero", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const { session, context, pad, board } = await startGame(browser, testInfo, FOUR, {
      seed: "c3-day-1",
    });
    try {
      await toMidTurn(pad, board);
      await expect(board.locator("[data-corruption-mark]")).toHaveCount(0);
      await expect(board.locator("[data-band]")).not.toContainText("0 corruptions");
    } finally {
      await closeAll(context, session.host);
    }
  });

  test.fixme("EV-04: the mark moves with the count mid-game, without a reload", async () => {
    // The test-only seed sets counts when the game starts. Raising hero A and lowering hero B
    // while the game runs needs a live seed hook (step 12) or a real quest cost and cure on the
    // way, neither of which this step's Touches reach. The unit test renders the band per count.
  });
});
