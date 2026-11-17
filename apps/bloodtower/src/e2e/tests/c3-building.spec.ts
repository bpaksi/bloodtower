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

/** Counts every frame the iPad sends, so help can be shown to send nothing (EV-14). */
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

/** Keeps the board's socket, so a test can report that a narration line ended (EV-15, EV-16). */
const installBoardSocket = async (page: Page) => {
  await page.addInitScript(() => {
    const Native = window.WebSocket;
    class BoardSocket extends Native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        if (String(url).includes("/ws")) {
          (window as unknown as { __btBoardSocket?: WebSocket }).__btBoardSocket = this;
        }
      }
    }
    window.WebSocket = BoardSocket;
  });
};
const reportNarrationEnded = (board: Page, lineId: string) =>
  board.evaluate((id) => {
    const socket = (window as unknown as { __btBoardSocket?: WebSocket }).__btBoardSocket;
    if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error("No board socket.");
    socket.send(JSON.stringify({ v: 2, type: "narration-ended", payload: { lineId: id } }));
  }, lineId);

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
    /** The building result's 4 s run on `session.waitClock` (EV-15 to EV-17). */
    fakeWait?: boolean;
  },
) => {
  const apart = options.apart === true;
  const session = await startAcceptanceHost(testInfo, {
    seed: options.seed,
    databasePath: options.databasePath,
    lanHost: () => "192.0.2.10",
    seatTogether: !apart,
    fakeWait: options.fakeWait,
  });
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
  await expect(deviceMain(pad).locator("section[data-building]")).toBeVisible({ timeout: 20_000 });
};

const openGearItem = async (pad: Page, id: string) => {
  await pad.locator('[data-action="menu"]').click();
  const row = pad.locator(`[data-menu] button[data-gear-item="${id}"]`);
  await expect(row).toBeEnabled();
  await row.click();
};

const heroRow = (board: Page, heroId: string) =>
  board.locator(`[data-panel="current-party"] [data-hero="${heroId}"]`);

/** The picks of a building by label, Leave as its own action, and nothing to trade (EV-06). */
const expectPicks = async (pad: Page, picks: string[]) => {
  expect(await labelsOf(pad)).toEqual(picks);
  await expect(pad.locator('button[data-action-id="leave"]')).toHaveCount(1);
  await expect(deviceMain(pad)).not.toContainText(/trade|shop|merchant|npc/i);
};

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
      await expectPicks(pad, ["Rally", "Virtue", "Cleanse"]);
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
      await expectPicks(village.pad, ["Rest", "Cleanse"]);
    } finally {
      await closeAll(village.context, village.session.host);
    }
    const bazaar = await startGame(browser, testInfo, { seed: seedAt(BAZAAR) });
    try {
      await enterBuilding(bazaar.pad);
      await expectPicks(bazaar.pad, ["Cleanse"]);
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
    const { session, context, pad, board } = await startGame(browser, testInfo, {
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
      // The board names the hero and the corruption that went.
      await expect(board.locator("[data-building-board-detail]")).toHaveText("Hero A · Lost");
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
      await expectPicks(pad, ["Cure", "Cleanse"]);
      await expect(optionByLabel(pad, "Cure")).toContainText("1 move · free");
      await optionByLabel(pad, "Cure").click();
      // Only Hero A holds corruptions: the hero step lists just Hero A, then the corruptions.
      await expect(deviceMain(pad).locator('[data-building="who"]')).toBeVisible();
      expect(await labelsOf(pad)).toEqual(["Hero A"]);
      await optionByLabel(pad, "Hero A").click();
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

const HELP_LINE = "Choose what to do in this building, or Leave.";
const FALLEN_LINE = "This building has fallen. No one can enter.";
const TILES = "~test-tiles:hero-a=courage+mercy+wisdom+honor";

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

/** "?" then Close: the building-menu sheet, nothing sent, the same step after (EV-14). */
const checkHelp = async (pad: Page, step: string) => {
  const sentBefore = await sentCount(pad);
  const paused = await deviceMain(pad).getAttribute("data-paused");
  await pad.locator('footer.bt-bar--bottom [data-action="help"]').click();
  const sheet = pad.locator("[data-help]");
  await expect(sheet).toHaveAttribute("data-help-screen", "building-menu");
  await expect(sheet.locator("p")).toHaveText(HELP_LINE);
  await expect(deviceMain(pad)).toHaveAttribute("data-paused", paused ?? "false");
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toHaveCount(0);
  expect(await sentCount(pad)).toBe(sentBefore);
  await expect(deviceMain(pad).locator(`[data-building="${step}"]`)).toBeVisible();
};

const stepIs = (pad: Page, step: string) => deviceMain(pad).locator(`[data-building="${step}"]`);
const boardMoves = (board: Page) => board.locator("[data-building-board]");

/** Shots for EV-05: the iPad portrait and the board, attached to the report. */
const shoot = async (testInfo: TestInfo, name: string, pad: Page, board: Page) => {
  await board.waitForTimeout(400);
  const dir = process.env.BT_SHOTS_DIR;
  if (dir) {
    await pad.screenshot({ path: `${dir}/${name}-ipad.png` });
    await board.screenshot({ path: `${dir}/${name}-board.png` });
  }
  await testInfo.attach(`${name}-ipad`, {
    body: await pad.screenshot(),
    contentType: "image/png",
  });
  await testInfo.attach(`${name}-board`, {
    body: await board.screenshot(),
    contentType: "image/png",
  });
};

/** Close the host, start another on the same file, join and Continue; the heroes are held again. */
const resumeGame = async (
  browser: Browser,
  testInfo: TestInfo,
  from: { databasePath: string; seed: string; fakeWait?: boolean },
) => {
  const session = await startAcceptanceHost(testInfo, {
    databasePath: from.databasePath,
    seed: from.seed,
    seatTogether: true,
    fakeWait: from.fakeWait,
  });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const pad = await context.newPage();
  const board = await context.newPage();
  await board.setViewportSize(BOARD_SIZE);
  await board.goto("/board");
  await installSessionSocketHook(pad);
  await installSendCounter(pad);
  await grantWakeLock(pad);
  await pad.goto(`/join?code=${session.host.joinCode}`);
  await clickAct(pad, "continue", "continue-saved-game");
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
  await holdHeroesFromTest(pad, [...FOUR]);
  return { session, context, pad, board };
};

const quitToSession = async (pad: Page) => {
  await pad.locator('[data-action="menu"]').click();
  await pad.locator('button[data-gear-item="save-and-quit"]').click();
  await pad.locator("[data-menu]").getByRole("button", { name: "Save and quit" }).click();
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", { timeout: 30_000 });
};

test.describe("C3/13 the building menu: the iPad and the board render", () => {
  test.beforeEach(({ browserName: _browserName }, testInfo) => {
    test.skip(testInfo.project.name !== "ipad", "The menu is on the iPad.");
  });

  test("EV-05, EV-11, EV-12, EV-14: the board paints the place and the rally; every step has the toolbar and help", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad, board } = await startGame(browser, testInfo, {
      seed: seedAt(CITADEL, "~test-gold:hero-a=20~test-hp:hero-a=4/12"),
      fakeWait: true,
    });
    try {
      await enterBuilding(pad);
      // The citadel's painting while the menu is open.
      await expect(board.locator('.bt-place-still[data-place="citadel"] img')).toBeVisible();
      await expect(board.locator("[data-building-board-title]")).toHaveText("Citadel");
      await expectToolbar(pad);
      await checkHelp(pad, "menu");
      await shoot(testInfo, "ev05-citadel", pad, board);
      await optionByLabel(pad, "Rally").click();
      // The result: words on the iPad, no Next; hero name and 12/12 on the board.
      await expect(stepIs(pad, "result")).toBeVisible();
      await expect(pad.locator('button[data-action-id="build"]')).toHaveCount(0);
      await expect(deviceMain(pad).locator("[data-building-auto]")).toHaveText(
        "Moves on by itself.",
      );
      await expect(board.locator("[data-building-board-line]")).toHaveText(
        /^Warriors join your ranks: \+\d+\.$/,
      );
      await expect(board.locator("[data-building-board-detail]")).toHaveText("Hero A 12/12");
      await expectToolbar(pad);
      await checkHelp(pad, "result");
      // 3.9 s: still here. 4.1 s: back on the menu (or the move map).
      session.waitClock?.advance(3_800);
      await pad.waitForTimeout(300);
      await expect(stepIs(pad, "result")).toBeVisible();
      session.waitClock?.advance(300);
      await expect(stepIs(pad, "menu")).toBeVisible({ timeout: 20_000 });
      // The 5 gold left the purse: 15 gold; one pick of 20 is not enough for two Virtue draws.
      await expect(optionByLabel(pad, "Rally")).toBeEnabled();
    } finally {
      await closeAll(context, session.host);
    }
  });

  test("EV-05 (sanctuary, village, bazaar), EV-12: each menu has the toolbar", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(420_000);
    const cases: [string, string, string][] = [
      ["sanctuary", SANCTUARY, "~test-gold:hero-a=30~test-named:hero-a=feral+lost"],
      ["village", VILLAGE, "~test-hp:hero-a=4/12"],
      ["bazaar", BAZAAR, ""],
    ];
    for (const [name, space, extra] of cases) {
      const { session, context, pad, board } = await startGame(browser, testInfo, {
        seed: seedAt(space, extra),
      });
      try {
        await enterBuilding(pad);
        await expect(board.locator(`.bt-place-still[data-place="${name}"] img`)).toBeVisible();
        await expectToolbar(pad);
        await shoot(testInfo, `ev05-${name}`, pad, board);
        if (name === "sanctuary") {
          await optionByLabel(pad, "Cure").click();
          await expect(stepIs(pad, "who")).toBeVisible();
          await expect(optionByLabel(pad, "Hero A")).toContainText("free");
          await expectToolbar(pad);
          await checkHelp(pad, "who");
          await optionByLabel(pad, "Hero A").click();
          await expect(stepIs(pad, "corruption")).toBeVisible();
          await expectToolbar(pad);
          await checkHelp(pad, "corruption");
        }
        if (name === "village") {
          await optionByLabel(pad, "Rest").click();
          await expect(stepIs(pad, "rest-moves")).toBeVisible();
          await expectToolbar(pad);
          await checkHelp(pad, "rest-moves");
        }
      } finally {
        await closeAll(context, session.host);
      }
    }
  });

  test("EV-09, EV-12, EV-14, EV-15: Virtue draw reveals, then a give-back of five tile buttons that never auto-advances", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad, board } = await startGame(browser, testInfo, {
      seed: seedAt(CITADEL, `~test-gold:hero-a=30${TILES}`),
      fakeWait: true,
    });
    try {
      await enterBuilding(pad);
      await optionByLabel(pad, "Virtue").click();
      // The Reveal: the drawn tile on the board, no Next on the iPad.
      await expect(stepIs(pad, "result")).toBeVisible();
      await expect(board.locator("[data-building-board-line]")).toHaveText(
        /^You gain a virtue: .+\.$/,
      );
      await expect(pad.locator('button[data-action-id="build"]')).toHaveCount(0);
      await expectToolbar(pad);
      await shoot(testInfo, "ev05-virtue-draw", pad, board);
      session.waitClock?.advance(4_100);
      // Its own give-back step: five tile buttons, no Next.
      await expect(stepIs(pad, "give-back")).toBeVisible({ timeout: 20_000 });
      expect(await labelsOf(pad)).toEqual(["Tile 1", "Tile 2", "Tile 3", "Tile 4", "Tile 5 (new)"]);
      await expect(pad.getByRole("button", { name: "Next" })).toHaveCount(0);
      await expect(deviceMain(pad).locator("[data-building-prompt]")).toHaveText(
        "You can hold four virtues. Give one back.",
      );
      await expect(board.locator("[data-building-board-tile]")).toHaveCount(5);
      await expectToolbar(pad);
      await checkHelp(pad, "give-back");
      await shoot(testInfo, "ev05-give-back", pad, board);
      // Still here 5 s later, with or without an audio-end event.
      session.waitClock?.advance(5_000);
      await pad.waitForTimeout(300);
      await expect(stepIs(pad, "give-back")).toBeVisible();
      await optionByLabel(pad, "Tile 5 \\(new\\)").click();
      await expect(stepIs(pad, "menu")).toBeVisible({ timeout: 20_000 });
      // Group holds 4: a second draw reveals and gives back again (it would not with 3).
      await optionByLabel(pad, "Virtue").click();
      await expect(stepIs(pad, "result")).toBeVisible();
      session.waitClock?.advance(4_100);
      await expect(stepIs(pad, "give-back")).toBeVisible({ timeout: 20_000 });
      expect(await labelsOf(pad)).toHaveLength(5);
    } finally {
      await closeAll(context, session.host);
    }
  });

  test("EV-15: Cleanse auto-advances after 4 s and shows its badge", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad, board } = await startGame(browser, testInfo, {
      seed: seedAt(CITADEL, `~test-skulls:${CITADEL}=1`),
      fakeWait: true,
    });
    try {
      await enterBuilding(pad);
      await optionByLabel(pad, "Cleanse").click();
      await expect(stepIs(pad, "result")).toBeVisible();
      await expect(pad.locator('button[data-action-id="build"]')).toHaveCount(0);
      await expect(board.locator("[data-building-board-line]")).toHaveText(
        "The skulls are cleared from this building.",
      );
      await expect(board.locator("[data-building-board-badge]")).toHaveText("−1 skull · +1 day");
      await expectToolbar(pad);
      await shoot(testInfo, "ev05-cleanse", pad, board);
      session.waitClock?.advance(3_800);
      await pad.waitForTimeout(300);
      await expect(stepIs(pad, "result")).toBeVisible();
      session.waitClock?.advance(300);
      await expect(stepIs(pad, "result")).toHaveCount(0, { timeout: 20_000 });
    } finally {
      await closeAll(context, session.host);
    }
  });

  test("EV-10, EV-12: a fallen building is not enterable and says so", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad, board } = await startGame(browser, testInfo, {
      seed: seedAt(VILLAGE, `~test-skulls:${VILLAGE}=4`),
    });
    try {
      await expect(deviceMain(pad).locator("[data-building-fallen]")).toHaveText(FALLEN_LINE, {
        timeout: 20_000,
      });
      await expect(pad.locator('button[data-action-id="enter"]')).toHaveCount(0);
      await expect(deviceMain(pad).locator("[data-building-title]")).toHaveCount(0);
      await expectToolbar(pad);
      await shoot(testInfo, "ev05-fallen", pad, board);
    } finally {
      await closeAll(context, session.host);
    }
  });

  test("EV-13: the happy path never opens the Menu or help", async ({ browser }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad } = await startGame(browser, testInfo, {
      seed: `c3-bld-m1~test-at:${VILLAGE}~test-hp:hero-a=4/12`,
    });
    try {
      await enterBuilding(pad);
      await optionByLabel(pad, "Rest").click();
      await optionByLabel(pad, "1").click();
      await expect(deviceMain(pad).locator("[data-building-result]")).toHaveText(
        "You rest and recover.",
      );
      await clickAct(pad, "build");
      await expect(stepIs(pad, "menu")).toBeVisible();
      await clickAct(pad, "leave");
      await expect(deviceMain(pad).locator("[data-move-map]")).toBeVisible({ timeout: 20_000 });
      await expect(pad.locator("[data-menu]")).toHaveCount(0);
      await expect(pad.locator("[data-help]")).toHaveCount(0);
    } finally {
      await closeAll(context, session.host);
    }
  });

  for (const how of ["restart", "quit"] as const) {
    test(`EV-17, EV-20: the give-back after a ${how} shows the same five tiles; cost spent once; the pick leaves 4`, async ({
      browser,
    }, testInfo) => {
      test.setTimeout(420_000);
      const seed = `c3-bld-m1~test-at:${CITADEL}~test-gold:hero-a=20${TILES}`;
      const first = await startGame(browser, testInfo, { seed, fakeWait: true });
      const { databasePath } = first.session;
      let tiles: string[] = [];
      let movesBefore = "";
      try {
        await enterBuilding(first.pad);
        movesBefore = (await boardMoves(first.board).getAttribute("data-moves")) ?? "";
        await optionByLabel(first.pad, "Virtue").click();
        await expect(stepIs(first.pad, "result")).toBeVisible();
        first.session.waitClock?.advance(4_100);
        await expect(stepIs(first.pad, "give-back")).toBeVisible({ timeout: 20_000 });
        tiles = await first.pad.locator("[data-building-option]").allInnerTexts();
        expect(tiles).toHaveLength(5);
        if (how === "quit") await quitToSession(first.pad);
      } finally {
        await closeAll(first.context, first.session.host);
      }
      const again = await resumeGame(browser, testInfo, { databasePath, seed, fakeWait: true });
      try {
        await expect(stepIs(again.pad, "give-back")).toBeVisible({ timeout: 30_000 });
        expect(await again.pad.locator("[data-building-option]").allInnerTexts()).toEqual(tiles);
        await expectToolbar(again.pad);
        await optionByLabel(again.pad, "Tile 2").click();
        await expect(stepIs(again.pad, "menu")).toBeVisible({ timeout: 20_000 });
        // One move spent, once.
        await expect(boardMoves(again.board)).toHaveAttribute(
          "data-moves",
          String(Number(movesBefore) - 1),
        );
        // 20 - 10 = 10 gold left: one more draw is open. After it, 0 is left and Virtue is closed,
        // so the first draw cost 10 gold exactly once (not 0, not 20).
        await expect(optionByLabel(again.pad, "Virtue")).toBeEnabled();
        await optionByLabel(again.pad, "Virtue").click();
        await expect(stepIs(again.pad, "result")).toBeVisible();
        again.session.waitClock?.advance(4_100);
        await expect(stepIs(again.pad, "give-back")).toBeVisible({ timeout: 20_000 });
        await optionByLabel(again.pad, "Tile 1").click();
        await expect(stepIs(again.pad, "menu")).toBeVisible({ timeout: 20_000 });
        await expect(optionByLabel(again.pad, "Virtue")).toBeDisabled();
      } finally {
        await closeAll(again.context, again.session.host);
      }
    });
  }

  for (const [pick, how] of [
    ["Rally", "restart"],
    ["Rally", "quit"],
    ["Cleanse", "restart"],
    ["Cleanse", "quit"],
  ] as const) {
    test(`EV-17: a ${how} during the ${pick} result resumes it and applies it once`, async ({
      browser,
    }, testInfo) => {
      test.setTimeout(420_000);
      const seed = `c3-bld-m1~test-at:${CITADEL}~test-gold:hero-a=10~test-hp:hero-a=4/12~test-skulls:${CITADEL}=1`;
      const first = await startGame(browser, testInfo, { seed, fakeWait: true });
      const { databasePath } = first.session;
      let movesBefore = "";
      try {
        await enterBuilding(first.pad);
        movesBefore = (await boardMoves(first.board).getAttribute("data-moves")) ?? "";
        await optionByLabel(first.pad, pick).click();
        await expect(stepIs(first.pad, "result")).toBeVisible();
        if (how === "quit") await quitToSession(first.pad);
      } finally {
        await closeAll(first.context, first.session.host);
      }
      const again = await resumeGame(browser, testInfo, { databasePath, seed, fakeWait: true });
      try {
        await expect(stepIs(again.pad, "result")).toBeVisible({ timeout: 30_000 });
        if (pick === "Rally") {
          await expect(again.board.locator("[data-building-board-detail]")).toHaveText(
            "Hero A 12/12",
          );
        }
        again.session.waitClock?.advance(4_100);
        await expect(stepIs(again.pad, "menu")).toBeVisible({ timeout: 20_000 });
        // Exactly one move spent, however many times the step came back.
        await expect(boardMoves(again.board)).toHaveAttribute(
          "data-moves",
          String(Number(movesBefore) - 1),
          { timeout: 20_000 },
        );
        if (pick === "Rally") {
          // 10 gold, 5 spent once: one more Rally is affordable and then none (a double spend
          // would have closed it already, no spend would leave a third).
          await optionByLabel(again.pad, "Rally").click();
          await expect(stepIs(again.pad, "result")).toBeVisible();
          again.session.waitClock?.advance(4_100);
          await expect(stepIs(again.pad, "menu")).toBeVisible({ timeout: 20_000 });
          await expect(optionByLabel(again.pad, "Rally")).toBeDisabled();
          await expect(optionByLabel(again.pad, "Rally")).toContainText("5 gold");
        }
        if (pick === "Cleanse") {
          // Its skull went: the board reads 0 skulls (and one only before).
          await expect(boardMoves(again.board)).toHaveAttribute("data-skulls", "0");
        }
      } finally {
        await closeAll(again.context, again.session.host);
      }
    });
  }

  test("EV-19: a Volume panel open at a restart comes back closed, unpaused, with the toolbar", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(420_000);
    const seed = seedAt(CITADEL, "~test-gold:hero-a=20~test-hp:hero-a=4/12");
    const first = await startGame(browser, testInfo, { seed });
    const { databasePath } = first.session;
    const readMenu = (page: Page) =>
      page.locator("[data-menu] [data-gear-item]").evaluateAll((items) =>
        items.map((item) => ({
          id: item.getAttribute("data-gear-item"),
          enabled: !(item as HTMLButtonElement).disabled,
          reason: item.querySelector("[data-reason]")?.textContent ?? null,
        })),
      );
    let menuBefore: Awaited<ReturnType<typeof readMenu>> = [];
    try {
      await enterBuilding(first.pad);
      await first.pad.locator('[data-action="menu"]').click();
      menuBefore = await readMenu(first.pad);
      expect(menuBefore.length).toBeGreaterThan(0);
      await first.pad.keyboard.press("Escape");
      await openGearItem(first.pad, "current-party");
      await expect(first.board.locator('[data-panel="current-party"]')).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      await closeAll(first.context, first.session.host);
    }
    const again = await resumeGame(browser, testInfo, { databasePath, seed });
    try {
      await expect(stepIs(again.pad, "menu")).toBeVisible({ timeout: 30_000 });
      await expect(again.pad.locator("[data-menu]")).toHaveCount(0);
      await expect(again.board.locator("[data-panel]")).toHaveCount(0);
      await again.pad.locator('[data-action="menu"]').click();
      expect(await readMenu(again.pad)).toEqual(menuBefore);
      await expect(deviceMain(again.pad)).toHaveAttribute("data-paused", "false");
      await expectToolbar(again.pad);
    } finally {
      await closeAll(again.context, again.session.host);
    }
  });

  for (const [pick, extra] of [
    ["Rally", "~test-hp:hero-a=4/12"],
    ["Cleanse", `~test-skulls:${CITADEL}=1`],
    ["Virtue", TILES.slice(0, TILES.lastIndexOf("+"))],
  ] as const) {
    test(`EV-15, EV-16: a narrated ${pick} result waits for its audio end, never a timer`, async ({
      browser,
    }, testInfo) => {
      test.setTimeout(300_000);
      const line = `building.${pick.toLowerCase()}`;
      const { session, context, pad, board } = await startGame(browser, testInfo, {
        seed: seedAt(CITADEL, `~test-gold:hero-a=30${extra}~test-building-line:${line}`),
        fakeWait: true,
      });
      try {
        await enterBuilding(pad);
        await optionByLabel(pad, pick).click();
        await expect(stepIs(pad, "result")).toBeVisible();
        await expect(pad.locator('button[data-action-id="build"]')).toHaveCount(0);
        // 4.5 s on the clock, no audio end: the iPad and the board are still on the step.
        session.waitClock?.advance(4_500);
        await pad.waitForTimeout(300);
        await expect(stepIs(pad, "result")).toBeVisible();
        await expect(board.locator("[data-building-board-line]")).toBeVisible();
        // Another line's end does nothing.
        await reportNarrationEnded(board, "another.line");
        await pad.waitForTimeout(300);
        await expect(stepIs(pad, "result")).toBeVisible();
        // Its own line's end moves on, to the menu (3 tiles held: no give-back).
        await reportNarrationEnded(board, line);
        await expect(stepIs(pad, "menu")).toBeVisible({ timeout: 20_000 });
      } finally {
        await closeAll(context, session.host);
      }
    });
  }

  for (const how of ["restart", "quit"] as const) {
    test(`EV-17: a ${how} during the Virtue result resumes it and applies it once`, async ({
      browser,
    }, testInfo) => {
      test.setTimeout(420_000);
      // Three tiles held: the draw ends in the menu, not a give-back. 10 gold, 3 moves.
      const seed = `c3-bld-m1~test-at:${CITADEL}~test-gold:hero-a=10~test-tiles:hero-a=courage+mercy+wisdom`;
      const first = await startGame(browser, testInfo, { seed, fakeWait: true });
      const { databasePath } = first.session;
      let movesBefore = "";
      try {
        await enterBuilding(first.pad);
        movesBefore = (await boardMoves(first.board).getAttribute("data-moves")) ?? "";
        await optionByLabel(first.pad, "Virtue").click();
        await expect(stepIs(first.pad, "result")).toBeVisible();
        if (how === "quit") await quitToSession(first.pad);
      } finally {
        await closeAll(first.context, first.session.host);
      }
      const again = await resumeGame(browser, testInfo, { databasePath, seed, fakeWait: true });
      try {
        await expect(stepIs(again.pad, "result")).toBeVisible({ timeout: 30_000 });
        again.session.waitClock?.advance(4_100);
        await expect(stepIs(again.pad, "menu")).toBeVisible({ timeout: 20_000 });
        // One move spent, once.
        await expect(boardMoves(again.board)).toHaveAttribute(
          "data-moves",
          String(Number(movesBefore) - 1),
        );
        // 10 gold, the draw cost 10 once: nothing left, Virtue is shown closed with its price
        // (a draw that was never paid would leave it open).
        await expect(optionByLabel(again.pad, "Virtue")).toBeDisabled();
        await expect(optionByLabel(again.pad, "Virtue")).toContainText("10 gold");
      } finally {
        await closeAll(again.context, again.session.host);
      }
    });
  }
});
