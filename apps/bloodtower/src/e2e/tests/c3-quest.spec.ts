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
import {
  enterWithoutTower,
  finishPieceCheck,
  holdHeroesFromTest,
  installSessionSocketHook,
  passChapterCard,
  startAcceptanceHost,
} from "./support/acceptance.ts";
import { settlePageAnimations } from "./support/animations.ts";

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
/** The group stands in the village; `extra` rides on the seed (a narration line, say). */
const seedFor = (gold = GOLD({}), extra = "") =>
  `c3q~test-event:none~test-at:${VILLAGE}${gold}${extra}`;

/** Opens another pack quest (or a test fixture) at the village once the game runs: the chapter's own marker is laid first. */
const openQuestAtVillage = (
  game: { session: { host: { applyTestSeed: (m: string) => Promise<void> } } },
  quest: string,
) => game.session.host.applyTestSeed(`~test-quest:${VILLAGE}=${quest}`);

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

const installBoardSocket = async (page: Page) => {
  await page.addInitScript(() => {
    const Native = window.WebSocket;
    class BoardSocket extends Native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        if (String(url).includes("/ws")) {
          const win = window as unknown as { __btBoardSocket?: WebSocket; __btNarr?: string[] };
          win.__btBoardSocket = this;
          // Every view frame that carries a narration line (EV-16: none replays after Continue).
          this.addEventListener("message", (event) => {
            if (typeof event.data === "string" && /"narration":\{/.test(event.data)) {
              win.__btNarr = [...(win.__btNarr ?? []), event.data.slice(0, 200)];
            }
          });
        }
      }
    }
    window.WebSocket = BoardSocket;
  });
};
const narrationFrames = (board: Page) =>
  board.evaluate(() => (window as unknown as { __btNarr?: string[] }).__btNarr ?? []);
const reportNarrationEnded = (board: Page, lineId: string) =>
  board.evaluate((id) => {
    const socket = (window as unknown as { __btBoardSocket?: WebSocket }).__btBoardSocket;
    if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error("No board socket.");
    socket.send(JSON.stringify({ v: 2, type: "narration-ended", payload: { lineId: id } }));
  }, lineId);

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
  await installBoardSocket(board);
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
  options: { seed: string; databasePath?: string; party?: readonly string[] },
) => {
  const party = options.party ?? FOUR;
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
    `button[data-setting="party-size"][data-option="n-${party.length}"][data-action="set"]`,
  );
  await size.click();
  await expect(size).toHaveAttribute("aria-pressed", "true");
  await clickAct(pad, "continue", "continue-game-settings");
  await holdHeroesFromTest(pad, [...party]);
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
  // The Scroll inks in; shoot after it settles, so it is not clipped mid-reveal.
  await settlePageAnimations(board);
  await settlePageAnimations(pad);
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

/** The host's event log for the saved game (append-only; a replay adds nothing). */
const hostEvents = (databasePath: string) => {
  const opened = openDatabase(databasePath);
  try {
    const store = createEventStore(opened.db);
    const save = store.getAutosave();
    if (!save) throw new Error("No autosave.");
    return store.listEvents(save.gameId).map((e) => ({ kind: e.kind, payload: e.payload }));
  } finally {
    opened.close();
  }
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

test.describe("C3/14 the quest scene", { tag: "@ipad-only" }, () => {
  test("EV-01, 03, 04, 05, 08, 09, 10, 11, 13: the Herald, the item hand-off, rewards, end hook", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const game = await startGame(browser, testInfo, { seed: seedFor() });
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
      // EV-05: the iPad header shows the step label, as the mockup draws it.
      await expect(deviceMain(pad).locator("[data-quest-step-label]")).toHaveText("Present heroes");
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
      await expect(heroButtons(pad)).toHaveText(["Hero A", "Hero B", "Hero C", "Hero D"]);
      await expect(board.locator("[data-reveal-card] [data-item-placeholder]")).toBeVisible();
      await expectToolbar(pad);
      // EV-05: the iPad header shows the step label, as the mockup draws it.
      await expect(deviceMain(pad).locator("[data-quest-step-label]")).toHaveText("Item");
      await shoot(testInfo, "ev05-item", pad, board);
      await tick(game, 5_000);
      await expect(heroButtons(pad)).toHaveCount(4);
      await deviceMain(pad)
        .locator('[data-building-option][data-prompt-id$="--qhero--hero-b"]')
        .click();

      // EV-04, EV-08: the rewards, the base 10 for the group once (DEC-827), one step done; no Next.
      await expect(phase(board, "rewards")).toBeVisible({ timeout: 20_000 });
      await expect(board.locator("[data-quest-track]")).toHaveAttribute("data-track-done", "1");
      await expect(board.locator('[data-badge="quest-gold"]')).toHaveText(["quest +10"]);
      await expect(board.locator("[data-quest-rewards-line]")).toContainText("Tomas's Map");
      await expect(lines(board).first()).toContainText("Tomas hands you a map");
      await expect(board.locator("[data-quest-tick]")).toHaveText("Moves on by itself.");
      await expect(board.locator('[data-badge="item"]')).toHaveText("Tomas's Map");
      await expect(deviceMain(pad).locator("[data-quest-ticks]")).toHaveText("● ● ○");
      await expect(deviceMain(pad).locator("[data-building-option]")).toHaveCount(0);
      await expect(pad.locator('button[data-action-id="build"]')).toHaveCount(0);
      await expectToolbar(pad);
      // EV-05: the iPad header shows the step label, as the mockup draws it.
      await expect(deviceMain(pad).locator("[data-quest-step-label]")).toHaveText("Rewards");
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
      // A story item is carried, not usable: the item row stays greyed with its reason.
      const useRow = pad.locator('[data-menu] button[data-gear-item="use-potion"]');
      await expect(useRow).toBeDisabled();
      await expect(useRow).toContainText("No potions or items to use.");
      await pad.locator('[data-menu] button[data-gear-item="current-party"]').click();
      await expect(
        board.locator('[data-panel="current-party"] [data-hero="hero-b"]'),
      ).toContainText("Items 1 held", { timeout: 20_000 });
      // The item's name is on that hero's panel, and only there.
      await expect(
        board.locator('[data-panel="current-party"] [data-hero="hero-b"] [data-story-items]'),
      ).toHaveText("Tomas's Map");
      await expect(board.locator('[data-panel="current-party"] [data-story-items]')).toHaveCount(1);
    } finally {
      await closeAll(game);
    }
  });

  test("EV-12, EV-10: help matches the quest on every state", async ({ browser }, testInfo) => {
    test.setTimeout(300_000);
    const game = await startGame(browser, testInfo, { seed: seedFor() });
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

  test("EV-06: The Ambush shows no Fight; a short purse reads its price and stays enabled", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    // Two present heroes and a purse of 6 (hero A holds it all).
    const game = await startGame(browser, testInfo, {
      seed: seedFor(GOLD({ "hero-a": 6 })),
      party: ["hero-a", "hero-b"],
    });
    const { pad, board } = game;
    try {
      await openQuestAtVillage(game, "ambush");
      await openQuest(game);
      await expect(board.locator("[data-quest-title]")).toHaveText("The Ambush");
      await expect(lines(board)).toHaveText([
        "Felled trees block the forest road. Men step out from behind them, bows drawn.",
        "Their shields have had a crest scratched off.",
      ]);
      await expect(questOptions(pad)).toHaveCount(1);
      await expect(deviceMain(pad)).not.toContainText("Fight");
      await expect(scene(board)).not.toContainText("Fight");
      const toll = optionById(pad, "pay-the-toll");
      await expect(toll).toContainText("Pay the toll (10 gold)");
      await expect(toll).toHaveClass(/bt-primary/);
      await expect(deviceMain(pad).locator(".bt-primary")).toHaveCount(1);
      await expect(toll.locator("[data-quest-cost]")).toHaveText("6 gold · 2 hit points each");
      await expect(toll).toBeEnabled();
      await toll.click();
      await expect(phase(board, "rewards")).toBeVisible({ timeout: 20_000 });
      await expect(lines(board).first()).toHaveText(
        "You don't have ten. They take what you have, and a beating for the rest.",
      );
      await tick(game, 4_100);
      await expect(lines(board)).toHaveText([
        "The road is clear. Past the trees, the old keep stands on its hill.",
      ]);
    } finally {
      await closeAll(game);
    }
  });

  test("EV-02: an item option the group lacks is greyed, with the item's name", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const game = await startGame(browser, testInfo, { seed: seedFor() });
    try {
      await openQuestAtVillage(game, "lock");
      await openQuest(game);
      const turn = optionById(game.pad, "turn-the-signet");
      await expect(turn).toBeVisible();
      await expect(turn).toBeDisabled();
      await expect(turn.locator("[data-quest-item]")).toHaveText("Needs The Warden's Signet");
    } finally {
      await closeAll(game);
    }
  });

  test("EV-07: a corruption cost asks which of the 2 present heroes takes it, and waits", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const game = await startGame(browser, testInfo, {
      seed: seedFor(),
      party: ["hero-a", "hero-b"],
    });
    const { pad, board } = game;
    try {
      await openQuestAtVillage(game, "curse");
      await openQuest(game);
      await optionById(pad, "take-the-curse").click();
      await expect(phase(board, "hero")).toBeVisible({ timeout: 20_000 });
      await expect(lines(board)).toHaveText(["Who takes the corruption?"]);
      await expect(heroButtons(pad)).toHaveText(["Hero A", "Hero B"]);
      await expectToolbar(pad);
      await tick(game, 5_000);
      await expect(heroButtons(pad)).toHaveText(["Hero A", "Hero B"]);
      await deviceMain(pad)
        .locator('[data-building-option][data-prompt-id$="--qhero--hero-b"]')
        .click();
      await expect(phase(board, "rewards")).toBeVisible({ timeout: 20_000 });
      await tick(game, 4_100);
      await expect(phase(board, "end")).toBeVisible({ timeout: 20_000 });
      await tick(game, 4_100);
      await expect(deviceMain(pad).locator('[data-building="menu"]')).toBeVisible({
        timeout: 20_000,
      });
      // Leave: the band's panel shows +1 corruption on hero B, and nothing for hero A.
      await pad.locator('button[data-action-id="leave"]').click();
      const bandB = board.locator('#band [data-hero-corruptions="hero-b"]');
      await expect(bandB).toHaveAttribute("data-count", "1", { timeout: 20_000 });
      await expect(bandB).toContainText("Hero B: 1 corruption");
      await expect(board.locator('#band [data-hero-corruptions="hero-a"]')).toHaveCount(0);
    } finally {
      await closeAll(game);
    }
  });

  test("EV-13, EV-14: a narrated closing step waits for its audio end, never a timer", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const line = "quest.herald";
    const game = await startGame(browser, testInfo, {
      seed: seedFor(GOLD({}), `~test-building-line:${line}`),
    });
    const { pad, board } = game;
    try {
      await openQuest(game);
      await optionById(pad, "ask-pay-first").click();
      for (const next of ["end", "menu"] as const) {
        const here = next === "end" ? phase(board, "rewards") : phase(board, "end");
        await expect(here).toBeVisible({ timeout: 20_000 });
        await expect(deviceMain(pad).locator("[data-building-option]")).toHaveCount(0);
        // 4.5 s on the clock, no audio end: the iPad and the board are still on the step.
        await tick(game, 4_500);
        await expect(here).toBeVisible();
        // Another line's end does nothing.
        await reportNarrationEnded(board, "another.line");
        await pad.waitForTimeout(300);
        await expect(here).toBeVisible();
        // Its own line's end moves on.
        await reportNarrationEnded(board, line);
        if (next === "end") await expect(phase(board, "end")).toBeVisible({ timeout: 20_000 });
      }
      await expect(deviceMain(pad).locator('[data-building="menu"]')).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      await closeAll(game);
    }
  });

  test("EV-04: a pair gets the group's quest gold once, not a share each", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    // A party of two: the quest's present heroes are exactly hero A and hero B; no one else is at the table.
    const party = ["hero-a", "hero-b"] as const;
    const game = await startGame(browser, testInfo, { seed: seedFor(), party });
    const { pad, board } = game;
    try {
      await openQuest(game);
      await optionById(pad, "ask-pay-first").click();
      await expect(phase(board, "rewards")).toBeVisible({ timeout: 20_000 });
      await expect(board.locator('[data-badge="quest-gold"]')).toHaveText(["quest +10"]);
      await expect(board.locator('[data-badge="quest-gold"]')).toHaveCount(1);
    } finally {
      await closeAll(game);
    }
  });

  test("EV-15, EV-16, EV-17: Continue reopens the choice; a restart on a closing step pays once", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(480_000);
    const seed = seedFor();
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
      // Continue seats the saved party on the iPads joined now (CU/16): pick, then play goes on.
      await holdHeroesFromTest(pad, [...FOUR]);
      await finishPieceCheck(pad);
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
      return { session, context, pad, board };
    };
    /** Every Menu row with its state and reason, then the Menu closed again. */
    const menuStates = async (pad: Page) => {
      await pad.locator('[data-action="menu"]').click();
      const rows = pad.locator("[data-menu] button[data-gear-item]");
      await expect(rows.first()).toBeVisible();
      const states = await rows.evaluateAll((els) =>
        els.map((el) => ({
          id: el.getAttribute("data-gear-item"),
          disabled: (el as HTMLButtonElement).disabled,
          text: (el.textContent ?? "").trim(),
        })),
      );
      await pad.locator("[data-menu]").getByRole("button", { name: "Close" }).click();
      await expect(pad.locator("[data-menu]")).toHaveCount(0);
      return states;
    };
    await openQuest(first);
    const menuBefore = await menuStates(first.pad);
    expect(menuBefore.length).toBeGreaterThan(3);
    // EV-17: a gear panel is open (Current party; Volume is greyed without the tower) when the host stops.
    await first.pad.locator('[data-action="menu"]').click();
    await first.pad.locator('[data-menu] button[data-gear-item="current-party"]').click();
    await expect(first.board.locator('[data-panel="current-party"]')).toBeVisible({
      timeout: 20_000,
    });
    await closeAll(first);

    // The host stops on the rewards step with no quit; then Continue, move on and quit on the end hook.
    const stayOn = async (name: string, onStep: (game: Game) => Promise<void>) => {
      const game = await resume();
      try {
        await onStep(game);
      } catch (error) {
        await closeAll(game);
        throw error;
      }
      return name;
    };

    const second = await resume();
    try {
      // EV-16, EV-17: the same choice, the narration not replayed; Menu and panels closed; not paused.
      await expect(second.board.locator("[data-quest-scene]")).toBeVisible({ timeout: 20_000 });
      await expect(phase(second.board, "choose")).toBeVisible();
      await expect(lines(second.board)).toHaveText([OPENING]);
      await expect(questOptions(second.pad)).toHaveCount(2);
      expect(await narrationFrames(second.board)).toEqual([]);
      await expect(second.pad.locator("[data-menu]")).toHaveCount(0);
      await expect(second.pad.locator("[data-panel], [data-gear-panel]")).toHaveCount(0);
      await expect(second.board.locator("[data-panel]")).toHaveCount(0);
      await expect(deviceMain(second.pad)).toHaveAttribute("data-paused", "false");
      await expectToolbar(second.pad);
      expect(await menuStates(second.pad)).toEqual(menuBefore);

      // Ask for pay: the rewards step. EV-15 run 1a: the host stops there, with no quit.
      await optionById(second.pad, "ask-pay-first").click();
      await expect(phase(second.board, "rewards")).toBeVisible({ timeout: 20_000 });
      await closeAll(second);
    } catch (error) {
      await closeAll(second);
      throw error;
    }
    // Run 2: Continue shows the rewards again; it moves on once; quit and Continue on the end hook.
    await stayOn("rewards-to-end", async (game) => {
      await expect(phase(game.board, "rewards")).toBeVisible({ timeout: 20_000 });
      await tick(game, 4_100);
      await expect(phase(game.board, "end")).toBeVisible({ timeout: 20_000 });
      await quit(game);
    });
    // The end: 10 gold shared and the base 10 for the group is 20 in all, paid once across every restart.
    const last = await resume();
    try {
      await expect(phase(last.board, "end")).toBeVisible({ timeout: 20_000 });
      await tick(last, 4_100);
      await expect(deviceMain(last.pad).locator('[data-building="menu"]')).toBeVisible({
        timeout: 20_000,
      });
      // The quest marker is gone: the menu has no Quest row.
      await expect(
        deviceMain(last.pad)
          .locator("[data-building-option]")
          .filter({ hasText: /^Quest/ }),
      ).toHaveCount(0);
      expect(await gearGold(last.pad, last.board)).toBe(20);
      // The host's event log: the option pressed once, each closing step ended once.
      const log = hostEvents(databasePath);
      expect(
        log.filter((e) => e.kind === "shell" && e.payload.includes("--qopt--ask-pay-first")),
      ).toHaveLength(1);
      const waitEnds = log.flatMap((e) => /"waitId":"(building-[^"]+)"/.exec(e.payload)?.[1] ?? []);
      expect(waitEnds).toHaveLength(2);
      expect(new Set(waitEnds).size).toBe(2);
    } finally {
      await closeAll(last);
    }
  });

  test("EV-15: a quit and Continue on the rewards step shows it again and pays once", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const seed = seedFor();
    const first = await startGame(browser, testInfo, { seed });
    const { databasePath } = first.session;
    await openQuest(first);
    await optionById(first.pad, "ask-pay-first").click();
    await expect(phase(first.board, "rewards")).toBeVisible({ timeout: 20_000 });
    await first.pad.locator('[data-action="menu"]').click();
    await first.pad.locator('button[data-gear-item="save-and-quit"]').click();
    await first.pad.locator("[data-menu]").getByRole("button", { name: "Save and quit" }).click();
    await expect(deviceMain(first.pad)).toHaveAttribute("data-screen", "session", {
      timeout: 30_000,
    });
    await closeAll(first);

    const session = await startAcceptanceHost(testInfo, {
      databasePath,
      seed,
      lanHost: () => "192.0.2.10",
      seatTogether: true,
      fakeWait: true,
    });
    const { context, pad, board } = await openTable(browser, session);
    const game: Game = { session, context, pad, board };
    try {
      await clickAct(pad, "continue", "continue-saved-game");
      // Continue seats the saved party on the iPads joined now (CU/16): pick, then play goes on.
      await holdHeroesFromTest(pad, [...FOUR]);
      await finishPieceCheck(pad);
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
      await expect(phase(board, "rewards")).toBeVisible({ timeout: 20_000 });
      await tick(game, 4_100);
      await expect(phase(board, "end")).toBeVisible({ timeout: 20_000 });
      await tick(game, 4_100);
      await expect(deviceMain(pad).locator('[data-building="menu"]')).toBeVisible({
        timeout: 20_000,
      });
      expect(await gearGold(pad, board)).toBe(20);
    } finally {
      await closeAll(game);
    }
  });

  test("#589: a host stop after a closing step's wait ended resumes on the step that was showing and pays once", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const seed = seedFor();
    const first = await startGame(browser, testInfo, { seed });
    const { databasePath } = first.session;
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
      await holdHeroesFromTest(pad, [...FOUR]);
      await finishPieceCheck(pad);
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
      return { session, context, pad, board };
    };
    // Sitting 1: the quest's rewards step; its wait ends and the end hook shows; the host stops
    // there, with no quit and no press since the quest option.
    await openQuest(first);
    await optionById(first.pad, "ask-pay-first").click();
    await expect(phase(first.board, "rewards")).toBeVisible({ timeout: 20_000 });
    await tick(first, 4_100);
    await expect(phase(first.board, "end")).toBeVisible({ timeout: 20_000 });
    await closeAll(first);

    // Sitting 2: Continue shows the end hook, not the rewards. Its wait ends, the menu shows, and
    // the host stops again.
    const second = await resume();
    try {
      await expect(phase(second.board, "end")).toBeVisible({ timeout: 20_000 });
      await tick(second, 4_100);
      await expect(deviceMain(second.pad).locator('[data-building="menu"]')).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      await closeAll(second);
    }

    // Sitting 3: Continue shows the menu. 10 shared + the base 10 for the group is 20, paid once.
    const third = await resume();
    try {
      await expect(deviceMain(third.pad).locator('[data-building="menu"]')).toBeVisible({
        timeout: 20_000,
      });
      await expect(scene(third.board)).toHaveCount(0);
      expect(await gearGold(third.pad, third.board)).toBe(20);
    } finally {
      await closeAll(third);
    }
  });
});
