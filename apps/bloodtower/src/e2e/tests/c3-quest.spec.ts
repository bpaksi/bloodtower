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
} from "./support/acceptance.ts";

/**
 * C3/14 (UI-042, UI-025, UI-036, MEC-037): the quest scene on the board and the iPad, through the
 * real host. The group stands in Egan's End (`~test-at:`), where the pack's Herald is open. Time
 * runs on the host's fake wait clock (`fakeWait`). The Ambush (EV-06) and the Lock (EV-02) are wild
 * quests with no Enter until F1/04; their screens are covered by render and engine tests.
 */

const STORY_ID = "test";
const FOUR = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const VILLAGE = "N-egans-end";
const HELP_LINE = "A quest is in front of you. Pick one of its options.";
const OPENING =
  'Tomas the herald meets you at the well. "They take a cart a week now. Will you go?"';
const END_HOOK = '"The forest road," Tomas says. "That\'s where they wait."';

const GOLD = (value: Record<string, number>) =>
  `~test-gold:${FOUR.map((id) => `${id}=${value[id] ?? 0}`).join(",")}`;
const seedFor = (quest: string, gold = GOLD({})) =>
  `c3q~test-event:none~test-at:${VILLAGE}${quest === "herald" ? "" : `~test-quest:${VILLAGE}=${quest}`}${gold}`;

const deviceMain = (page: Page) => page.locator("main.bt-device");

const installSendCounter = async (page: Page) => {
  await page.addInitScript(() => {
    const send = WebSocket.prototype.send;
    WebSocket.prototype.send = function (this: WebSocket, data) {
      const win = window as unknown as { __btSent?: number };
      win.__btSent = (win.__btSent ?? 0) + 1;
      return send.call(this, data);
    };
  });
};
const sentCount = (page: Page) =>
  page.evaluate(() => (window as unknown as { __btSent?: number }).__btSent ?? 0);

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

const openTable = async (
  browser: Browser,
  session: { baseURL: string; host: { joinCode: string } },
) => {
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const pad = await context.newPage();
  const board = await context.newPage();
  await board.setViewportSize(BOARD_SIZE);
  await board.goto("/board");
  await installSessionSocketHook(pad);
  await installSendCounter(pad);
  await grantWakeLock(pad);
  await pad.goto(`/join?code=${session.host.joinCode}`);
  return { context, pad, board };
};

const startGame = async (
  browser: Browser,
  testInfo: TestInfo,
  options: { seed: string; databasePath?: string },
) => {
  const session = await startAcceptanceHost(testInfo, {
    seed: options.seed,
    databasePath: options.databasePath,
    lanHost: () => "192.0.2.10",
    seatTogether: true,
    fakeWait: true,
  });
  const { context, pad, board } = await openTable(browser, session);
  await enterWithoutTower(pad);
  await clickAct(pad, "continue", `continue-pick-story-${STORY_ID}`);
  const size = pad.locator(
    `button[data-setting="party-size"][data-option="n-4"][data-action="set"]`,
  );
  await size.click();
  await expect(size).toHaveAttribute("aria-pressed", "true");
  await clickAct(pad, "continue", "continue-game-settings");
  await holdHeroesFromTest(pad, [...FOUR]);
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
  await clickAct(pad, "continue");
  await expect(board.locator("#band [data-days-left]")).toBeVisible({ timeout: 20_000 });
  return { session, context, pad, board };
};

type Game = Awaited<ReturnType<typeof startGame>>;

/** Enter the village and press Quest: the quest scene is up. */
const openQuest = async (game: Game) => {
  await clickAct(game.pad, "enter");
  const quest = deviceMain(game.pad)
    .locator("[data-building-option]")
    .filter({ hasText: /^Quest/ });
  await expect(quest).toBeEnabled({ timeout: 20_000 });
  await quest.click();
  await expect(game.board.locator("[data-quest-scene]")).toBeVisible({ timeout: 20_000 });
};

const closeAll = async (game: { context: BrowserContext; session: Game["session"] }) => {
  await game.context.close();
  await game.session.host.close();
};

const scene = (board: Page) => board.locator("[data-quest-scene]");
const phase = (board: Page, name: string) =>
  board.locator(`[data-quest-scene][data-quest-phase="${name}"]`);
const lines = (board: Page) => board.locator("[data-quest-words] [data-dialog-line]");
const questOptions = (pad: Page) =>
  deviceMain(pad).locator('[data-building-option][data-prompt-id*="--qopt--"]');
const optionById = (pad: Page, id: string) =>
  deviceMain(pad).locator(`[data-building-option][data-prompt-id$="--qopt--${id}"]`);
const heroButtons = (pad: Page) =>
  deviceMain(pad).locator('[data-building-option][data-prompt-id*="--qhero--"]');

/** Time on the host's fake clock, then a beat for the views to arrive. */
const tick = async (game: Game, ms: number) => {
  game.session.waitClock?.advance(ms);
  await game.pad.waitForTimeout(300);
};

const expectToolbar = async (page: Page) => {
  const footer = page.locator("footer.bt-bar--bottom");
  await expect(footer).toBeVisible();
  await expect(footer).toBeInViewport();
  const buttons = footer.locator("button");
  await expect(buttons.first()).toHaveText("?");
  await expect(buttons.last()).toHaveAttribute("data-action", "menu");
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

/** "?" then Close: the quest-scene sheet, nothing sent, the same state after (EV-12). */
const checkHelp = async (pad: Page, board: Page) => {
  const sentBefore = await sentCount(pad);
  const paused = await deviceMain(pad).getAttribute("data-paused");
  const before = await lines(board).allInnerTexts();
  await pad.locator('footer.bt-bar--bottom [data-action="help"]').click();
  const sheet = pad.locator("[data-help]");
  await expect(sheet).toHaveAttribute("data-help-screen", "quest-scene");
  await expect(sheet.locator("p")).toHaveText(HELP_LINE);
  await expect(deviceMain(pad)).toHaveAttribute("data-paused", paused ?? "false");
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toHaveCount(0);
  expect(await sentCount(pad)).toBe(sentBefore);
  expect(await lines(board).allInnerTexts()).toEqual(before);
};

const shoot = async (testInfo: TestInfo, name: string, pad: Page, board: Page) => {
  await board.waitForTimeout(400);
  const dir = process.env.BT_SHOTS_DIR;
  if (dir) {
    await pad.screenshot({ path: `${dir}/${name}-ipad.png` });
    await board.screenshot({ path: `${dir}/${name}-board.png` });
  }
  await testInfo.attach(`${name}-ipad`, { body: await pad.screenshot(), contentType: "image/png" });
  await testInfo.attach(`${name}-board`, {
    body: await board.screenshot(),
    contentType: "image/png",
  });
};

const gearGold = async (pad: Page, board: Page) => {
  await pad.locator('[data-action="menu"]').click();
  const row = pad.locator('[data-menu] button[data-gear-item="current-party"]');
  await expect(row).toBeEnabled({ timeout: 20_000 });
  await row.click();
  let total = 0;
  for (const id of FOUR) {
    const text = await board
      .locator(`[data-panel="current-party"] [data-hero="${id}"]`)
      .innerText();
    total += Number(/Gold (\d+)/.exec(text)?.[1] ?? Number.NaN);
  }
  await pad.locator("[data-gear-panel] button.bt-primary", { hasText: "Done" }).click();
  await expect(board.locator("[data-panel]")).toHaveCount(0);
  return total;
};

test.describe("C3/14 the quest scene", () => {
  test.beforeEach(({ browserName: _browserName }, testInfo) => {
    test.skip(testInfo.project.name !== "ipad", "The scene is drawn on the iPad and the board.");
  });

  test("EV-01, 03, 04, 05, 08, 09, 10, 11, 13: the Herald, the item hand-off, rewards, end hook", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const game = await startGame(browser, testInfo, { seed: seedFor("herald") });
    const { pad, board } = game;
    try {
      await openQuest(game);

      // EV-01, EV-08: painting and narration on the board, two options on the iPad, one step to come.
      await expect(board.locator("[data-quest-painting]")).toBeVisible();
      await expect(board.locator("[data-quest-title]")).toHaveText("The Herald");
      await expect(lines(board)).toHaveText([OPENING]);
      await expect(board.locator("[data-quest-track]")).toHaveAttribute("data-track-done", "0");
      await expect(board.locator("[data-quest-track]")).toHaveAttribute("data-track-total", "1");
      expect(await board.locator("[data-quest-scene] [data-building-option]").count()).toBe(0);
      await expect(questOptions(pad)).toHaveCount(2);
      await expect(optionById(pad, "ask-pay-first")).toContainText("Ask for pay first");
      await expect(optionById(pad, "ask-pay-first").locator("[data-quest-gain]")).toHaveText(
        "+10 gold",
      );
      await expect(optionById(pad, "take-the-job")).toContainText("Take the job");
      await expect(optionById(pad, "take-the-job").locator("[data-quest-gain]")).toHaveText(
        "Tomas's Map",
      );
      await expect(deviceMain(pad).locator("[data-building-prompt]")).toHaveText("Will you help?");
      await expectToolbar(pad);
      await shoot(testInfo, "ev05-choice", pad, board);
      // No auto-advance: still on the choice 5 s later.
      await tick(game, 5_000);
      await expect(phase(board, "choose")).toBeVisible();
      await expect(questOptions(pad)).toHaveCount(2);

      // EV-03: the item Reveal and the hero pick, one button per present hero, no auto-assign.
      await optionById(pad, "take-the-job").click();
      await expect(phase(board, "hero")).toBeVisible({ timeout: 20_000 });
      await expect(board.locator("[data-reveal]")).toHaveText("Tomas's Map");
      await expect(lines(board)).toHaveText(["Who takes the reward?"]);
      await expect(heroButtons(pad)).toHaveCount(4);
      await expectToolbar(pad);
      await shoot(testInfo, "ev05-item", pad, board);
      await tick(game, 5_000);
      await expect(heroButtons(pad)).toHaveCount(4);
      await deviceMain(pad)
        .locator('[data-building-option][data-prompt-id$="--qhero--hero-b"]')
        .click();

      // EV-04, EV-08: the rewards, quest gold for each present hero, one step done; no Next.
      await expect(phase(board, "rewards")).toBeVisible({ timeout: 20_000 });
      await expect(board.locator("[data-quest-track]")).toHaveAttribute("data-track-done", "1");
      await expect(board.locator('[data-badge="quest-gold"]')).toHaveText(
        Array(4).fill("quest +5"),
      );
      await expect(board.locator("[data-quest-rewards-line]")).toContainText("Tomas's Map");
      await expect(lines(board).first()).toContainText("Tomas hands you a map");
      await expect(board.locator("[data-quest-tick]")).toHaveText("Moves on by itself.");
      await expect(deviceMain(pad).locator("[data-building-option]")).toHaveCount(0);
      await expect(pad.locator('button[data-action-id="build"]')).toHaveCount(0);
      await expectToolbar(pad);
      await shoot(testInfo, "ev05-rewards", pad, board);

      // EV-13: it moves on by itself, at 4 s; the end hook is next.
      await tick(game, 3_800);
      await expect(phase(board, "rewards")).toBeVisible();
      await tick(game, 400);
      await expect(phase(board, "end")).toBeVisible({ timeout: 20_000 });
      await expect(lines(board)).toHaveText([END_HOOK]);
      await expect(deviceMain(pad).locator("[data-building-option]")).toHaveCount(0);
      await expectToolbar(pad);

      // EV-09: the end hook moves on by itself, to the village's menu with no Quest.
      await tick(game, 4_100);
      await expect(deviceMain(pad).locator('[data-building="menu"]')).toBeVisible({
        timeout: 20_000,
      });
      await expect(scene(board)).toHaveCount(0);
      await expect(
        deviceMain(pad)
          .locator("[data-building-option]")
          .filter({ hasText: /^Quest/ }),
      ).toHaveCount(0);

      // EV-11: the happy path needed neither the Menu nor help.
      await expect(pad.locator("[data-menu]")).toHaveCount(0);
      await expect(pad.locator("[data-help]")).toHaveCount(0);

      // EV-03: the hero's panel shows the item.
      await pad.locator('[data-action="menu"]').click();
      await pad.locator('[data-menu] button[data-gear-item="current-party"]').click();
      await expect(
        board.locator('[data-panel="current-party"] [data-hero="hero-b"]'),
      ).toContainText("Items 1 held", { timeout: 20_000 });
    } finally {
      await closeAll(game);
    }
  });

  test("EV-12, EV-10: help matches the quest on every state", async ({ browser }, testInfo) => {
    test.setTimeout(300_000);
    const game = await startGame(browser, testInfo, { seed: seedFor("herald") });
    const { pad, board } = game;
    try {
      await openQuest(game);
      await checkHelp(pad, board);
      await optionById(pad, "take-the-job").click();
      await expect(phase(board, "hero")).toBeVisible({ timeout: 20_000 });
      await checkHelp(pad, board);
      await heroButtons(pad).first().click();
      await expect(phase(board, "rewards")).toBeVisible({ timeout: 20_000 });
      await checkHelp(pad, board);
      await expectToolbar(pad);
      await tick(game, 4_100);
      await expect(phase(board, "end")).toBeVisible({ timeout: 20_000 });
      await checkHelp(pad, board);
      await expectToolbar(pad);
    } finally {
      await closeAll(game);
    }
  });

  test("EV-15, EV-16, EV-17: Continue reopens the choice; a restart on a closing step pays once", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(420_000);
    const seed = seedFor("herald");
    const first = await startGame(browser, testInfo, { seed });
    const { databasePath } = first.session;
    const quit = async (game: Game) => {
      await game.pad.locator('[data-action="menu"]').click();
      await game.pad.locator('button[data-gear-item="save-and-quit"]').click();
      await game.pad.locator("[data-menu]").getByRole("button", { name: "Save and quit" }).click();
      await expect(deviceMain(game.pad)).toHaveAttribute("data-screen", "session", {
        timeout: 30_000,
      });
      await closeAll(game);
    };
    const resume = async (): Promise<Game> => {
      const session = await startAcceptanceHost(testInfo, {
        databasePath,
        seed,
        lanHost: () => "192.0.2.10",
        seatTogether: true,
        fakeWait: true,
      });
      const { context, pad, board } = await openTable(browser, session);
      await clickAct(pad, "continue", "continue-saved-game");
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
      await holdHeroesFromTest(pad, [...FOUR]);
      return { session, context, pad, board };
    };
    await openQuest(first);
    // EV-17: a gear panel is open (Current party; Volume is greyed without the tower) when the host stops.
    await first.pad.locator('[data-action="menu"]').click();
    await first.pad.locator('[data-menu] button[data-gear-item="current-party"]').click();
    await expect(first.board.locator('[data-panel="current-party"]')).toBeVisible({
      timeout: 20_000,
    });
    await closeAll(first);

    const second = await resume();
    try {
      // EV-16, EV-17: the same choice; Menu and panels closed; not paused; toolbar back.
      await expect(second.board.locator("[data-quest-scene]")).toBeVisible({ timeout: 20_000 });
      await expect(phase(second.board, "choose")).toBeVisible();
      await expect(questOptions(second.pad)).toHaveCount(2);
      await expect(second.pad.locator("[data-menu]")).toHaveCount(0);
      await expect(second.pad.locator("[data-panel], [data-gear-panel]")).toHaveCount(0);
      await expect(second.board.locator("[data-panel]")).toHaveCount(0);
      await expect(deviceMain(second.pad)).toHaveAttribute("data-paused", "false");
      await expectToolbar(second.pad);

      // Ask for pay: the rewards step, then the end hook; restart on the end hook.
      await optionById(second.pad, "ask-pay-first").click();
      await expect(phase(second.board, "rewards")).toBeVisible({ timeout: 20_000 });
      await tick(second, 4_100);
      await expect(phase(second.board, "end")).toBeVisible({ timeout: 20_000 });
      await quit(second);
    } catch (error) {
      await closeAll(second);
      throw error;
    }

    const third = await resume();
    try {
      // EV-15: the same step, once; 10 gold shared and 5 quest gold each is 30 in all.
      await expect(phase(third.board, "end")).toBeVisible({ timeout: 20_000 });
      await tick(third, 4_100);
      await expect(deviceMain(third.pad).locator('[data-building="menu"]')).toBeVisible({
        timeout: 20_000,
      });
      expect(await gearGold(third.pad, third.board)).toBe(30);
    } finally {
      await closeAll(third);
    }
  });
});
