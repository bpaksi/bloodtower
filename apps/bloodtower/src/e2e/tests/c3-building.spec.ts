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
  holdHeroesFromTest,
  installSessionSocketHook,
  setSoundAndKeep,
  startAcceptanceHost,
} from "./support/acceptance.ts";

/**
 * C3/13 PR A (UI-043): the building menu through the real host, on the iPad's fallback render.
 * The group is put on a building of each kind with the test seed `~test-at:<space>`; gold, hit
 * points, corruptions and skulls come from the other test markers. Every hero sits in one group
 * (`seatTogether`). PR B draws the final screens and the screenshots.
 */

const STORY_ID = "test";
const FOUR = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;

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

const CITADEL = "N-radiant-mountains";
const SANCTUARY = "N-upper-ice-fangs";
const VILLAGE = "N-egans-end";
const BAZAAR = "N-dayside";

const seedAt = (space: string, extra = "") => `c3-bld~test-at:${space}${extra}`;

const options = (pad: Page) => deviceMain(pad).locator("[data-building-option]");
const labelsOf = async (pad: Page) => {
  await expect(options(pad).first()).toBeVisible({ timeout: 20_000 });
  return (await options(pad).allInnerTexts()).map((text) => text.split("\n")[0]?.trim() ?? "");
};
const optionByLabel = (pad: Page, label: string) =>
  options(pad).filter({ hasText: new RegExp(`^${label}`) });

/** Press Enter on the move map and wait for the building's menu. */
const enterBuilding = async (pad: Page) => {
  await clickAct(pad, "enter");
  await expect(deviceMain(pad).locator("[data-building]")).toBeVisible({ timeout: 20_000 });
};

const openGearItem = async (pad: Page, id: string) => {
  await pad.locator('[data-action="menu"]').click();
  const row = pad.locator(`[data-menu] button[data-gear-item="${id}"]`);
  await expect(row).toBeEnabled();
  await row.click();
};

const heroRow = (board: Page, heroId: string) =>
  board.locator(`[data-panel="current-party"] [data-hero="${heroId}"]`);

const closeAll = async (context: BrowserContext, host: { close: () => Promise<void> }) => {
  await context.close();
  await host.close();
};

test.describe("C3/13 the building menu: engine and wire", () => {
  test.beforeEach(({ browserName: _browserName }, testInfo) => {
    test.skip(testInfo.project.name !== "ipad", "The menu is on the iPad.");
  });

  test("EV-01, EV-06 (citadel): each pick shows its move and gold; no Trade", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad } = await startGame(browser, testInfo, {
      seed: seedAt(CITADEL, "~test-gold:hero-a=20~test-hp:hero-a=4/12"),
    });
    try {
      await enterBuilding(pad);
      expect(await labelsOf(pad)).toEqual(["Rally", "Virtue", "Cleanse"]);
      await expect(optionByLabel(pad, "Rally")).toContainText("1 move · 5 gold");
      await expect(optionByLabel(pad, "Virtue")).toContainText("1 move · 10 gold");
      await expect(optionByLabel(pad, "Cleanse")).toContainText("1 move");
      await expect(optionByLabel(pad, "Cleanse")).not.toContainText("gold");
      await expect(pad.locator('button[data-action-id="leave"]')).toHaveCount(1);
      await expect(deviceMain(pad)).not.toContainText(/trade|shop/i);
    } finally {
      await closeAll(context, session.host);
    }
  });

  test("EV-03: with 3 gold Rally and Virtue are shown closed with their prices", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad } = await startGame(browser, testInfo, {
      seed: seedAt(CITADEL, "~test-gold:hero-a=3~test-hp:hero-a=4/12"),
    });
    try {
      await enterBuilding(pad);
      await expect(optionByLabel(pad, "Rally")).toBeDisabled();
      await expect(optionByLabel(pad, "Rally")).toContainText("5 gold");
      await expect(optionByLabel(pad, "Virtue")).toBeDisabled();
      await expect(optionByLabel(pad, "Virtue")).toContainText("10 gold");
    } finally {
      await closeAll(context, session.host);
    }
  });

  test("EV-04: a citadel with 2 skulls offers Cleanse and Leave only", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad, board } = await startGame(browser, testInfo, {
      seed: seedAt(CITADEL, `~test-gold:hero-a=20~test-skulls:${CITADEL}=2`),
    });
    try {
      await enterBuilding(pad);
      expect(await labelsOf(pad)).toEqual(["Cleanse"]);
      await expect(pad.locator('button[data-action-id="leave"]')).toHaveCount(1);
      // "2 skulls shown on the board" (EV-04).
      const onBoard = board.locator("[data-building-board]");
      await expect(onBoard).toHaveAttribute("data-skulls", "2", { timeout: 20_000 });
      await expect(onBoard).toContainText("2 skulls");
    } finally {
      await closeAll(context, session.host);
    }
  });

  test("EV-06: the village and the bazaar each show their own picks", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const village = await startGame(browser, testInfo, {
      seed: seedAt(VILLAGE, "~test-hp:hero-a=4/12"),
    });
    try {
      await enterBuilding(village.pad);
      expect(await labelsOf(village.pad)).toEqual(["Rest", "Cleanse"]);
    } finally {
      await closeAll(village.context, village.session.host);
    }
    const bazaar = await startGame(browser, testInfo, { seed: seedAt(BAZAAR) });
    try {
      await enterBuilding(bazaar.pad);
      expect(await labelsOf(bazaar.pad)).toEqual(["Cleanse"]);
    } finally {
      await closeAll(bazaar.context, bazaar.session.host);
    }
  });

  test("EV-08: village, hero at 4/12, 3 moves: the picker offers 1-3; 2 give 10/12 and leave 1 move", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    // The seed `c3-bld-m1` rolls 3 moves on the first day (2d3, checked against the engine's RNG).
    const { session, context, pad, board } = await startGame(browser, testInfo, {
      seed: `c3-bld-m1~test-at:${VILLAGE}~test-hp:hero-a=4/12`,
    });
    try {
      await enterBuilding(pad);
      await expect(board.locator("[data-building-board]")).toHaveAttribute("data-moves", "3", {
        timeout: 20_000,
      });
      await optionByLabel(pad, "Rest").click();
      await expect(deviceMain(pad).locator('[data-building="rest-moves"]')).toBeVisible();
      expect((await labelsOf(pad)).map((text) => text.trim())).toEqual(["1", "2", "3"]);
      await optionByLabel(pad, "2").click();
      await expect(deviceMain(pad).locator("[data-building-result]")).toHaveText(
        "You rest and recover.",
      );
      // 4 + 2 x 3 = 10 of 12 on the hero panel; 1 move left on the board.
      await expect(board.locator("[data-building-board]")).toHaveAttribute("data-moves", "1");
      await openGearItem(pad, "current-party");
      await expect(heroRow(board, "hero-a")).toContainText("HP 10/12", { timeout: 20_000 });
      await pad.locator("[data-gear-panel] button.bt-primary", { hasText: "Done" }).click();
      await clickAct(pad, "build");
      await expect(deviceMain(pad).locator('[data-building="menu"]')).toBeVisible();
      await optionByLabel(pad, "Rest").click();
      await expect(deviceMain(pad).locator('[data-building="rest-moves"]')).toBeVisible();
      expect(await labelsOf(pad)).toEqual(["1"]);
    } finally {
      await closeAll(context, session.host);
    }
  });

  test("EV-07: the iPad lists only corrupted heroes, then that hero's corruptions; Lost goes, Feral stays", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad } = await startGame(browser, testInfo, {
      seed: seedAt(SANCTUARY, "~test-gold:hero-a=30~test-named:hero-a=feral+lost,hero-c=greedy"),
    });
    try {
      await enterBuilding(pad);
      await optionByLabel(pad, "Cure").click();
      // Hero A and Hero C hold corruptions; B and D hold none and are not offered.
      await expect(deviceMain(pad).locator('[data-building="who"]')).toBeVisible();
      expect((await labelsOf(pad)).sort()).toEqual(["Hero A", "Hero C"]);
      await optionByLabel(pad, "Hero A").click();
      await expect(deviceMain(pad).locator('[data-building="corruption"]')).toBeVisible();
      expect(await labelsOf(pad)).toEqual(["Feral", "Lost"]);
      await optionByLabel(pad, "Lost").click();
      await expect(deviceMain(pad).locator("[data-building-result]")).toHaveText(
        "The corruption is lifted.",
      );
      await clickAct(pad, "build");
      // Hero A still holds Feral: the Cure's hero list still names Hero A.
      await expect(deviceMain(pad).locator('[data-building="menu"]')).toBeVisible();
      await optionByLabel(pad, "Cure").click();
      await expect(deviceMain(pad).locator('[data-building="who"]')).toBeVisible();
      expect((await labelsOf(pad)).sort()).toEqual(["Hero A", "Hero C"]);
    } finally {
      await closeAll(context, session.host);
    }
  });

  test("EV-02, EV-18: Cure reads free, then its price; Continue keeps the price", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(420_000);
    const seed = seedAt(SANCTUARY, "~test-gold:hero-a=30~test-named:hero-a=feral+lost");
    const first = await startGame(browser, testInfo, { seed });
    const { databasePath } = first.session;
    let closed = false;
    try {
      const { pad } = first;
      await enterBuilding(pad);
      expect(await labelsOf(pad)).toEqual(["Cure", "Cleanse"]);
      await expect(optionByLabel(pad, "Cure")).toContainText("1 move · free");
      await optionByLabel(pad, "Cure").click();
      // Only Hero A holds corruptions, so the hero step is skipped and the corruptions are listed.
      await expect(deviceMain(pad).locator('[data-building="corruption"]')).toBeVisible();
      expect(await labelsOf(pad)).toEqual(["Feral", "Lost"]);
      await optionByLabel(pad, "Lost").click();
      await expect(deviceMain(pad).locator("[data-building-result]")).toHaveText(
        "The corruption is lifted.",
      );
      await clickAct(pad, "build");
      await expect(deviceMain(pad).locator('[data-building="menu"]')).toBeVisible();
      // The free cure is spent: the next one shows its price.
      await expect(optionByLabel(pad, "Cure")).toContainText("gold");
      await expect(optionByLabel(pad, "Cure")).not.toContainText("free");

      // EV-18: save and quit inside the building, restart, Continue.
      await pad.locator('[data-action="menu"]').click();
      await pad.locator('button[data-gear-item="save-and-quit"]').click();
      await pad.locator("[data-menu]").getByRole("button", { name: "Save and quit" }).click();
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", { timeout: 30_000 });
      await closeAll(first.context, first.session.host);
      closed = true;
    } finally {
      if (!closed) await closeAll(first.context, first.session.host);
    }

    const restarted = await startAcceptanceHost(testInfo, {
      databasePath,
      seed,
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
      await expect(deviceMain(pad2).locator('[data-building="menu"]')).toBeVisible({
        timeout: 30_000,
      });
      await expect(optionByLabel(pad2, "Cure")).toContainText("gold");
      await expect(optionByLabel(pad2, "Cure")).not.toContainText("free");
    } finally {
      await closeAll(context2, restarted.host);
    }
  });
});
