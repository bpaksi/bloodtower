import { join } from "node:path";
import { pathToFileURL } from "node:url";
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
  enterWithoutTowerKeepSound,
  enterWithTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  setSoundAndKeep,
  startAcceptanceHost,
  waitForBoardAnimationsSettled,
} from "./support/acceptance.ts";

/**
 * CU/13 (54a): the party items panel (UI-013) and the use-item flow. Items, hit points and gold
 * come from the test-only seed markers `~test-items:`, `~test-hp:` and `~test-gold:` (engine
 * `playState.ts`). Every hero sits in one group (`seatTogether`), so the acting group holds all
 * four and the pick-a-hero step lists them.
 */

const STORY_ID = "test";
const FOUR = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const NO_ITEMS = "No potions or items to use.";
const MOCKUP = join(
  import.meta.dirname,
  "../../../plans/briefs/CU/13-items-panel-and-use-item/mockup.html",
);

/** A holds one potion, B two, C none, D none. Hit points and gold are set for A, B and C. */
const SEED =
  "c3-day-1~test-items:hero-a=potion,hero-b=potion+potion~test-hp:hero-a=3/10,hero-b=2/10,hero-c=5/10~test-gold:hero-a=4,hero-b=7,hero-c=0";
const BARE_SEED = "c3-day-1";

type HookWindow = { __btSessionSocket?: WebSocket };

const deviceMain = (page: Page) => page.locator("main.bt-device");

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

/** Join, skip the tower, pick the test story, hold the four heroes, run setup and the opening. */
const startGame = async (
  browser: Browser,
  testInfo: TestInfo,
  options: {
    seed: string;
    databasePath?: string;
    /** CU/14: heroes stay in their own groups, and a second iPad holds the last hero. */
    apart?: boolean;
  },
) => {
  const apart = options.apart === true;
  const session = await startAcceptanceHost(testInfo, {
    seed: options.seed,
    databasePath: options.databasePath,
    lanHost: () => "192.0.2.10",
    seatTogether: !apart,
  });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const pad = await context.newPage();
  const board = await context.newPage();
  await board.setViewportSize(BOARD_SIZE);
  await board.goto("/board");
  await installSessionSocketHook(pad);
  await grantWakeLock(pad);
  await pad.goto(`/join?code=${session.host.joinCode}`);
  let pad2: Page | null = null;
  let context2: BrowserContext | null = null;
  if (apart) {
    await enterWithoutTowerKeepSound(pad);
    context2 = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
    pad2 = await context2.newPage();
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
    `button[data-setting="party-size"][data-option="n-4"][data-action="set"]`,
  );
  await size.click();
  await expect(size).toHaveAttribute("aria-pressed", "true");
  await clickAct(pad, "continue", "continue-game-settings");
  if (pad2) {
    await holdHeroesFromTest(pad, FOUR.slice(0, -1));
    await holdHeroesFromTest(pad2, FOUR.slice(-1));
  } else {
    await holdHeroesFromTest(pad, [...FOUR]);
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
  // Past the roll panel: a hero's group is acting.
  await clickAct(pad, "continue");
  await expect(board.locator("#band [data-days-left]")).toBeVisible({ timeout: 20_000 });
  return { session, context, pad, board, pad2, context2 };
};

/** One act on the iPad's own socket: the host's own action path (Q7.2, EV-17). */
const sendAct = (pad: Page, promptId: string, actionId: string, args: Record<string, unknown>) =>
  pad.evaluate(
    ({ promptId, actionId, args }) => {
      const socket = (window as unknown as HookWindow).__btSessionSocket;
      if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error("No open socket.");
      socket.send(JSON.stringify({ v: 2, type: "act", payload: { promptId, actionId, args } }));
    },
    { promptId, actionId, args },
  );

const openGearItem = async (pad: Page, id: string) => {
  await pad.locator('[data-action="menu"]').click();
  const row = pad.locator(`[data-menu] button[data-gear-item="${id}"]`);
  await expect(row).toBeEnabled();
  await row.click();
};

const doneButton = (pad: Page) =>
  deviceMain(pad).locator("[data-gear-panel] button.bt-primary", { hasText: "Done" });

const closePanel = async (pad: Page, board: Page) => {
  await doneButton(pad).click();
  await expect(board.locator("[data-panel]")).toHaveCount(0);
  await expect(board.locator("main.bt-board")).toHaveAttribute("data-paused", "false");
};

const heroRow = (board: Page, heroId: string) =>
  board.locator(`[data-panel="current-party"] [data-hero="${heroId}"]`);

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

test.describe("CU/13 the party items panel and the use-item flow", () => {
  test.beforeEach(({ browserName: _browserName }, testInfo) => {
    test.skip(testInfo.project.name !== "ipad", "The approved mockup is the 1920x1080 board.");
  });

  test("EV-05, EV-07, EV-12, EV-17, EV-18 and C3-11 EV-15 (use-item half): the panel, both routes, once", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad, board } = await startGame(browser, testInfo, { seed: SEED });
    try {
      // EV-18: "Current party" keeps HP, gold and the count; no names, no use button.
      await openGearItem(pad, "current-party");
      const party = board.locator('[data-panel="current-party"]');
      await expect(party).toBeVisible({ timeout: 20_000 });
      await expect(heroRow(board, "hero-a")).toContainText("HP 3/10");
      await expect(heroRow(board, "hero-a")).toContainText("Gold 4");
      await expect(heroRow(board, "hero-a")).toContainText("Items 1 held");
      await expect(heroRow(board, "hero-b")).toContainText("Items 2 held");
      await expect(heroRow(board, "hero-c")).toContainText("Items 0 held");
      await expect(heroRow(board, "hero-d")).toContainText("HP unavailable");
      await expect(heroRow(board, "hero-d")).toContainText("Gold unavailable");
      await expect(party).not.toContainText("Healing potion");
      await expect(party.locator("button")).toHaveCount(0);
      await closePanel(pad, board);

      // EV-05: the items panel opens from the gear item, names each item, display only, paused.
      await openGearItem(pad, "use-potion");
      const items = board.locator('[data-panel="items"]');
      await expect(items).toBeVisible({ timeout: 20_000 });
      await expect(items).toContainText("Game paused.");
      await expect(items.locator("h2")).toHaveText("What the party carries");
      await expect(items.locator("li")).toHaveText([
        "Hero A: Healing potion",
        "Hero B: Healing potion",
        "Hero B: Healing potion",
        `Hero C: ${NO_ITEMS}`,
        `Hero D: ${NO_ITEMS}`,
        `Hero E: ${NO_ITEMS}`,
        `Hero F: ${NO_ITEMS}`,
      ]);
      await expect(items.locator("button")).toHaveCount(0);
      await expect(board.locator("main.bt-board")).toHaveAttribute("data-paused", "true");
      await expect(board.locator('[data-panel="current-party"]')).toHaveCount(0);

      // The iPad route (Q7.2): pick the hero, then the item. Heroes with nothing are not offered.
      const flow = deviceMain(pad).locator("[data-items-flow]");
      await expect(flow.locator("[data-items-hero]")).toHaveText(["Hero A", "Hero B"]);
      await shot(pad, testInfo, "cu13-ev12-ipad-hero-pick");
      await flow.locator('[data-items-hero="hero-b"]').click();
      await expect(flow.locator("[data-use-item]")).toHaveCount(2);
      await shot(pad, testInfo, "cu13-ev12-ipad-item-pick");
      await flow.locator('[data-use-item="potion"]').first().click();
      await expect(items.locator("li")).toHaveText([
        "Hero A: Healing potion",
        "Hero B: Healing potion",
        `Hero C: ${NO_ITEMS}`,
        `Hero D: ${NO_ITEMS}`,
        `Hero E: ${NO_ITEMS}`,
        `Hero F: ${NO_ITEMS}`,
      ]);
      await shot(board, testInfo, "cu13-ev12-board-items-panel");
      const mock = await browser.newContext({ viewport: { width: 1000, height: 1100 } });
      try {
        const mockPage = await mock.newPage();
        await mockPage.goto(pathToFileURL(MOCKUP).href);
        const path = testInfo.outputPath("cu13-ev12-mockup-items.png");
        await mockPage.locator("#items").screenshot({ path });
        await testInfo.attach("cu13-ev12-mockup-items", { path, contentType: "image/png" });
      } finally {
        await mock.close();
      }
      await closePanel(pad, board);

      // EV-07: B's hit points rose by 4 (the tuned amount); one potion is left.
      await openGearItem(pad, "current-party");
      await expect(heroRow(board, "hero-b")).toContainText("HP 6/10");
      await expect(heroRow(board, "hero-b")).toContainText("Items 1 held");
      await closePanel(pad, board);

      // EV-17: the host's own act (no panel open) is the same flow and the same result.
      await sendAct(pad, "gear", "pick", { item: "items", pick: "potion", heroId: "hero-a" });
      await openGearItem(pad, "current-party");
      await expect(heroRow(board, "hero-a")).toContainText("HP 7/10");
      await expect(heroRow(board, "hero-a")).toContainText("Items 0 held");
      await closePanel(pad, board);

      // Once only: the same host act again finds no potion, logs an error and changes nothing.
      await sendAct(pad, "gear", "pick", { item: "items", pick: "potion", heroId: "hero-a" });
      await expect(board.locator('[data-error-code="use-item-refused"]')).toBeVisible({
        timeout: 20_000,
      });
      await openGearItem(pad, "current-party");
      await expect(heroRow(board, "hero-a")).toContainText("HP 7/10");
      await closePanel(pad, board);
    } finally {
      await closeAll(context, session.host);
    }
  });

  test("EV-06 and C3-11 EV-16 (use-item reason): with nothing held the entry is disabled with the locked line", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad, board } = await startGame(browser, testInfo, {
      seed: BARE_SEED,
    });
    try {
      await pad.locator('[data-action="menu"]').click();
      const row = pad.locator('[data-menu] button[data-gear-item="use-potion"]');
      await expect(row).toBeVisible();
      await expect(row).toBeDisabled();
      await expect(row.locator("[data-reason]")).toHaveText(NO_ITEMS);
      // A forced act is refused with no panel and no error toast.
      await sendAct(pad, "gear", "open", { item: "use-potion" });
      await pad.waitForTimeout(500);
      await expect(board.locator("[data-panel]")).toHaveCount(0);
      await expect(board.locator("[data-error-code]")).toHaveCount(0);
    } finally {
      await closeAll(context, session.host);
    }
  });

  test("survival: an item used before Continue stays used; one not used is still held", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(360_000);
    const first = await startGame(browser, testInfo, { seed: SEED });
    const { databasePath } = first.session;
    let closed = false;
    try {
      await sendAct(first.pad, "gear", "pick", { item: "items", pick: "potion", heroId: "hero-a" });
      await openGearItem(first.pad, "current-party");
      await expect(heroRow(first.board, "hero-a")).toContainText("HP 7/10");
      await closePanel(first.pad, first.board);
      await first.pad.locator('[data-action="menu"]').click();
      await first.pad.locator('button[data-gear-item="save-and-quit"]').click();
      await first.pad.locator("[data-menu]").getByRole("button", { name: "Save and quit" }).click();
      await expect(deviceMain(first.pad)).toHaveAttribute("data-screen", "session", {
        timeout: 30_000,
      });
      await closeAll(first.context, first.session.host);
      closed = true;
    } finally {
      if (!closed) await closeAll(first.context, first.session.host);
    }

    const restarted = await startAcceptanceHost(testInfo, {
      databasePath,
      seed: SEED,
      seatTogether: true,
    });
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
      await expect(board2.locator("[data-panel]")).toHaveCount(0);
      await expect(board2.locator("main.bt-board")).toHaveAttribute("data-paused", "false");
      await openGearItem(pad2, "current-party");
      await expect(heroRow(board2, "hero-a")).toContainText("HP 7/10");
      await expect(heroRow(board2, "hero-a")).toContainText("Items 0 held");
      await expect(heroRow(board2, "hero-b")).toContainText("HP 2/10");
      await expect(heroRow(board2, "hero-b")).toContainText("Items 2 held");
    } finally {
      await closeAll(context2, restarted.host);
    }
  });
});

/** CU/14 (54b): the turn-start virtue panel (UI-037) and the generic virtue choice list. */
const VIRTUE_MOCKUP = join(
  import.meta.dirname,
  "../../../plans/briefs/CU/14-virtue-panel-and-choice/mockup.html",
);
/** Skulls on one building of each kingdom, so Infused has something to take whatever kingdom acts. */
const SKULLS = "~test-skulls:N-egans-end=2,E-duwani=1,S-southern-wastes=2,W-anza=1";
const INFUSED_SEED = `c3-day-1~test-virtue-ids:hero-a=infused+fortunate${SKULLS}`;
const FIXTURE_SEED =
  "c3-day-1~test-virtue-ids:hero-a=fixture,hero-b=fixture,hero-c=fixture,hero-d=fixture";
const FORTUNATE_SEED = "c3-day-1~test-virtue-ids:hero-a=fortunate";
const virtuePanel = (board: Page) => board.locator('[data-panel="virtue"]');
const virtueOptions = (pad: Page) => deviceMain(pad).locator("button[data-virtue-option]");
const virtueButtons = (pad: Page) =>
  deviceMain(pad).locator('button[data-prompt-id^="virtue-choice--"]');

const mockupShot = async (browser: Browser, testInfo: TestInfo, id: string, name: string) => {
  const mock = await browser.newContext({ viewport: { width: 1000, height: 1100 } });
  try {
    const page = await mock.newPage();
    await page.goto(pathToFileURL(VIRTUE_MOCKUP).href);
    const path = testInfo.outputPath(`${name}.png`);
    await page.locator(id).screenshot({ path });
    await testInfo.attach(name, { path, contentType: "image/png" });
  } finally {
    await mock.close();
  }
};

test.describe("CU/14 the turn-start virtue panel and the choice list", () => {
  test.beforeEach(({ browserName: _browserName }, testInfo) => {
    test.skip(testInfo.project.name !== "ipad", "The approved mockup is the 1920x1080 board.");
  });

  test("EV-01, EV-04: an automatic virtue shows on the board with no press and no iPad button", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad, board } = await startGame(browser, testInfo, {
      seed: FORTUNATE_SEED,
    });
    try {
      const panel = virtuePanel(board);
      await expect(panel).toBeVisible({ timeout: 20_000 });
      await expect(panel.locator("h2")).toHaveText("Virtues today");
      await expect(panel.locator("li")).toHaveText(["Fortunate: a second pick today"]);
      // No button for it on the iPad, and the move map is already open: nothing held it back.
      await expect(virtueButtons(pad)).toHaveCount(0);
      await expect(deviceMain(pad).locator("[data-virtue-choice]")).toHaveCount(0);
      await expect(deviceMain(pad).locator("[data-move-map]")).toBeVisible();
      // EV-04: no use icon or button outside the gear; the toolbar is "?", Back, Replay and the gear.
      await expect(deviceMain(pad).locator('[data-action="use"], [data-use-item]')).toHaveCount(0);
      const bar = deviceMain(pad).locator("[data-bottom-bar]");
      await expect(bar.locator("button")).toHaveText(["?", "Back", "Replay", ""]);
      // The panel is gone once the group moves.
      await deviceMain(pad).locator('button[data-action-id="walk"]').first().click();
      await expect(panel).toHaveCount(0, { timeout: 20_000 });
    } finally {
      await closeAll(context, session.host);
    }
  });

  test("EV-02: a group with no virtue sees no panel and goes straight to the move map", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad, board } = await startGame(browser, testInfo, {
      seed: BARE_SEED,
    });
    try {
      await expect(deviceMain(pad).locator("[data-move-map]")).toBeVisible({ timeout: 20_000 });
      await expect(virtuePanel(board)).toHaveCount(0);
      await expect(board.locator("[data-virtue-lines]")).toHaveCount(0);
    } finally {
      await closeAll(context, session.host);
    }
  });

  test("EV-03: the fixture virtue offers 3 buttons to the acting group's iPad only; first press wins", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, context2, pad, pad2, board } = await startGame(browser, testInfo, {
      seed: FIXTURE_SEED,
      apart: true,
    });
    if (!pad2 || !context2) throw new Error("The second iPad did not join.");
    try {
      const acting = await deviceMain(pad).locator("[data-step-instruction]").first();
      await expect(acting).toHaveAttribute("data-acting-hero", /hero-/, { timeout: 20_000 });
      const hero = await acting.getAttribute("data-acting-hero");
      // Hero D is the second iPad's; every other hero is the first's.
      const [mine, other] = hero === "hero-d" ? [pad2, pad] : [pad, pad2];
      await expect(virtueOptions(mine)).toHaveCount(3, { timeout: 20_000 });
      await expect(virtueOptions(other)).toHaveCount(0);
      await expect(virtueButtons(other)).toHaveCount(0);
      await expect(virtuePanel(board)).toContainText("Fixture asks you to choose.");
      await shot(mine, testInfo, "cu14-ev12-ipad-fixture-choice");
      await virtueOptions(mine).nth(1).click();
      // The board mirrors the pick; the buttons are gone; nothing can pick twice.
      await expect(virtuePanel(board).locator("[data-virtue-picked]")).toHaveText(
        "Fixture: Second",
      );
      await expect(virtueOptions(mine)).toHaveCount(0);
      await expect(virtuePanel(board).locator("[data-virtue-asks]")).toHaveCount(0);
    } finally {
      await context2.close();
      await closeAll(context, session.host);
    }
  });

  test("EV-12, EV-16: Infused offers its kingdom's buildings; one press, mirrored, and the same list as the fixture", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad, board } = await startGame(browser, testInfo, {
      seed: INFUSED_SEED,
    });
    try {
      const panel = virtuePanel(board);
      await expect(panel).toBeVisible({ timeout: 20_000 });
      await expect(panel.locator("li").first()).toContainText("Infused: remove 1 skull in ");
      await expect(panel.locator("li").nth(1)).toHaveText("Fortunate: a second pick today");
      await expect(panel).toContainText("Infused asks you to choose.");
      // One button per standing building of the kingdom; only the one with a skull can be pressed.
      const options = virtueOptions(pad);
      await expect(options).toHaveCount(4);
      await expect(options.locator("xpath=self::button[not(@disabled)]")).toHaveCount(1);
      await shot(pad, testInfo, "cu14-ev12-ipad-virtue-choice");
      await shot(board, testInfo, "cu14-ev12-board-virtue-panel");
      await mockupShot(browser, testInfo, "#virtue", "cu14-ev12-mockup-virtue");
      await mockupShot(browser, testInfo, "#ipad-virtue", "cu14-ev12-mockup-ipad-virtue");
      await options.locator("xpath=self::button[not(@disabled)]").click();
      await expect(panel.locator("[data-virtue-picked]")).toContainText("Infused: ");
      await expect(options).toHaveCount(0);
      // The move map never waited for it.
      await expect(deviceMain(pad).locator("[data-move-map]")).toBeVisible();
    } finally {
      await closeAll(context, session.host);
    }
  });
});

const CHANCE_MOCKUP = join(
  import.meta.dirname,
  "../../../plans/briefs/CU/15-purse-spin/mockup.html",
);

const chanceMockupShot = async (browser: Browser, testInfo: TestInfo, id: string, name: string) => {
  const mock = await browser.newContext({ viewport: { width: 1000, height: 1100 } });
  try {
    const page = await mock.newPage();
    await page.goto(pathToFileURL(CHANCE_MOCKUP).href);
    const path = testInfo.outputPath(`${name}.png`);
    await page.locator(id).screenshot({ path });
    await testInfo.attach(name, { path, contentType: "image/png" });
  } finally {
    await mock.close();
  }
};

type SentTower = ReturnType<
  Awaited<ReturnType<typeof startAcceptanceHost>>["tower"]["sent"]
>[number];
const sequences = (sent: readonly SentTower[]) => sent.filter((row) => row.type === "sequence");
const coinCues = (board: Page) =>
  board.evaluate(() => (window as unknown as { __btCoinCues?: number }).__btCoinCues ?? 0);

/** Join, choose the tower track, pick the test story and hold the four heroes, to the purse step. */
const reachPurseStep = async (
  browser: Browser,
  testInfo: TestInfo,
  options: { tower: boolean; seed: string; databasePath?: string },
) => {
  const session = await startAcceptanceHost(testInfo, {
    seed: options.seed,
    databasePath: options.databasePath,
    lanHost: () => "192.0.2.10",
  });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const pad = await context.newPage();
  const board = await context.newPage();
  await board.setViewportSize(BOARD_SIZE);
  await board.goto("/board");
  await installSessionSocketHook(pad);
  await grantWakeLock(pad);
  await pad.goto(`/join?code=${session.host.joinCode}`);
  if (options.tower) await enterWithTower(pad);
  else await enterWithoutTower(pad);
  await clickAct(pad, "continue", `continue-pick-story-${STORY_ID}`);
  await clickAct(pad, "continue", "continue-game-settings");
  await holdHeroesFromTest(pad, [...FOUR]);
  await clickAct(pad, "continue", "continue-claim-heroes");
  for (const id of SETUP_IDS.slice(0, -1)) {
    await expect(deviceMain(pad)).toHaveAttribute("data-setup-step", id, { timeout: 20_000 });
    await clickAct(pad, "continue", `continue-setup-${id}`);
  }
  await expect(deviceMain(pad)).toHaveAttribute("data-setup-step", "starting-purse", {
    timeout: 20_000,
  });
  return { session, context, pad, board };
};

test.describe("CU/15 the game of chance: the Spin and the starting purse", () => {
  test.beforeEach(({ browserName: _browserName }, testInfo) => {
    test.skip(testInfo.project.name !== "ipad", "The approved mockup is the 1920x1080 board.");
  });

  test("EV-08, EV-12: with the tower nothing runs until the press, then one command, and the tower plays the sound", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad, board } = await reachPurseStep(browser, testInfo, {
      tower: true,
      seed: "cu15-tower",
    });
    try {
      const chance = board.locator("#chance");
      await expect(chance).toBeVisible({ timeout: 20_000 });
      await expect(chance).toContainText("Starting purse");
      await expect(chance.locator("[data-chance-result]")).toHaveCount(0);
      // Ten seconds of waiting: the tower receives nothing on its own.
      await pad.waitForTimeout(10_000);
      expect(sequences(session.tower.sent())).toHaveLength(0);
      const spin = pad.locator('button[data-prompt-id="spin-setup-starting-purse"]');
      await expect(spin).toHaveText("Spin");
      await expect(pad.locator("main.bt-device [data-gear-panel], main.bt-device img")).toHaveCount(
        0,
      );
      await shot(pad, testInfo, "cu15-ev12-ipad-spin");
      await chanceMockupShot(browser, testInfo, "#ipad-chance", "cu15-ev12-mockup-ipad-chance");
      await spin.click();
      await expect(chance.locator("[data-chance-result]")).toHaveText(
        /^The lights stop on (10|20|30|40) gold\.$/,
        { timeout: 20_000 },
      );
      const sent = sequences(session.tower.sent());
      expect(sent).toHaveLength(1);
      expect(sent[0]?.sequence).toBeTruthy();
      expect(sent[0]?.soundIndex).toBeGreaterThan(0);
      // No raw bytes: every recorded row has only the named command fields.
      for (const row of session.tower.sent()) {
        expect(
          Object.keys(row).every((key) =>
            ["type", "sequence", "soundIndex", "volume"].includes(key),
          ),
        ).toBe(true);
      }
      // The tower plays the sound: the board plays none (DEC-114).
      expect(await coinCues(board)).toBe(0);
      await shot(board, testInfo, "cu15-ev12-board-chance-result");
      await chanceMockupShot(browser, testInfo, "#chance", "cu15-ev12-mockup-chance");
      // Spin is spent; Continue is the one primary button now.
      await expect(spin).toHaveCount(0);
      await expect(
        pad.locator('button[data-prompt-id="continue-setup-starting-purse"]'),
      ).toBeEnabled();
    } finally {
      await closeAll(context, session.host);
    }
  });

  test("EV-10, EV-11, EV-13: with no tower the result is at once, one coin cue on the board, a second press changes nothing", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad, board } = await reachPurseStep(browser, testInfo, {
      tower: false,
      seed: "cu15-no-tower",
    });
    try {
      const chance = board.locator("#chance");
      await expect(chance).toBeVisible({ timeout: 20_000 });
      expect(await coinCues(board)).toBe(0);
      // Two presses straight after each other: the second arrives from "another iPad's" socket path.
      await sendAct(pad, "spin-setup-starting-purse", "spin", {});
      await sendAct(pad, "spin-setup-starting-purse", "spin", {});
      const result = chance.locator("[data-chance-result]");
      await expect(result).toHaveText(/^The wheel stops on (10|20|30|40) gold\.$/, {
        timeout: 2_000,
      });
      const text = await result.textContent();
      await pad.waitForTimeout(1_000);
      await expect(result).toHaveText(text ?? "");
      expect(await coinCues(board)).toBe(1);
      expect(sequences(session.tower.sent())).toHaveLength(0);
      await expect(chance).not.toContainText(/tower|lights/i);
      // No iPad plays sound (DEC-903).
      expect(
        await pad.evaluate(
          () => (window as unknown as { __btCoinCues?: number }).__btCoinCues ?? 0,
        ),
      ).toBe(0);
      expect(await pad.locator("audio").count()).toBe(0);
    } finally {
      await closeAll(context, session.host);
    }
  });

  test("EV-14, EV-15: a restart keeps the set purse, offers no second spin, and plays and sends nothing", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const first = await reachPurseStep(browser, testInfo, { tower: false, seed: "cu15-restart" });
    const { databasePath } = first.session;
    let amount = "";
    try {
      await clickAct(first.pad, "spin", "spin-setup-starting-purse");
      const result = first.board.locator("#chance [data-chance-result]");
      await expect(result).toHaveText(/gold\.$/, { timeout: 20_000 });
      amount = (await result.getAttribute("data-chance-amount")) ?? "";
      expect(amount).toMatch(/^(10|20|30|40)$/);
    } finally {
      await closeAll(first.context, first.session.host);
    }
    const restarted = await startAcceptanceHost(testInfo, {
      databasePath,
      seed: "cu15-restart",
      lanHost: () => "192.0.2.10",
    });
    const context = await browser.newContext({ baseURL: restarted.baseURL, ...PORTRAIT });
    const pad = await context.newPage();
    const board = await context.newPage();
    await board.setViewportSize(BOARD_SIZE);
    await board.goto("/board");
    try {
      await installSessionSocketHook(pad);
      await grantWakeLock(pad);
      await pad.goto(`/join?code=${restarted.host.joinCode}`);
      await expect(deviceMain(pad)).toHaveAttribute("data-setup-step", "starting-purse", {
        timeout: 20_000,
      });
      await expect(board.locator("#chance [data-chance-result]")).toHaveAttribute(
        "data-chance-amount",
        amount,
        { timeout: 20_000 },
      );
      // No second Spin is offered; nothing plays or is sent without a new press.
      await expect(pad.locator('button[data-action-id="spin"]')).toHaveCount(0);
      await expect(
        pad.locator('button[data-prompt-id="continue-setup-starting-purse"]'),
      ).toBeEnabled();
      await pad.waitForTimeout(2_000);
      expect(await coinCues(board)).toBe(0);
      expect(sequences(restarted.tower.sent())).toHaveLength(0);
      // The same purse goes on with Continue.
      await clickAct(pad, "continue", "continue-setup-starting-purse");
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "begin");
    } finally {
      await closeAll(context, restarted.host);
    }
  });
});
