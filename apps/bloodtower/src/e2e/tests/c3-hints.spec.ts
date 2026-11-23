import { type Browser, expect, type Page, type TestInfo, test } from "@playwright/test";
import {
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";

/**
 * CU/09 (DEC-571): the Hints row on Game settings, the first-time hint on the Story board, and the
 * Rules group in Look up. Copy is the brief's Copy table. The 4 s is the host's real timer: the
 * hint ends itself, so these specs wait on the board rather than faking the clock.
 */

const FOUR = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const BUILDING_HINT = "Entering a building is free. Each choice inside costs one move.";

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== "ipad", "The board shots are at 1920x1080 from one project.");
});

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

/** Up to Game settings (Hints row visible) on one iPad, with a Story board beside it. */
const openSettings = async (browser: Browser, testInfo: TestInfo) => {
  const session = await startAcceptanceHost(testInfo, { seed: "cu09-1" });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const pad = await context.newPage();
  const board = await context.newPage();
  await board.setViewportSize(BOARD_SIZE);
  await board.goto("/board");
  await installSessionSocketHook(pad);
  await pad.goto(`/join?code=${session.host.joinCode}`);
  await enterWithoutTower(pad);
  await clickAct(pad, "continue", "continue-pick-story-test");
  // The click returns before the Game settings view arrives; reading the rows sooner finds none.
  await expect(pad.locator("main.bt-device")).toHaveAttribute("data-screen", "game-settings", {
    timeout: 20_000,
  });
  await expect(pad.locator('main.bt-device div[data-setting="hints"]')).toBeVisible();
  return { session, context, pad, board };
};

/** From Game settings to the first play screen. */
const beginPlay = async (pad: Page) => {
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
};

/** Presses Continue, a walk and Enter until the building's Leave is offered or a hint shows. */
const walkIntoBuilding = async (pad: Page, board: Page) => {
  const deadline = Date.now() + 90_000;
  const open = (name: string) => pad.locator(`button[data-action-id="${name}"]:enabled`).first();
  while (Date.now() < deadline) {
    if ((await board.locator("[data-hint]").count()) > 0) return;
    if ((await pad.locator('button[data-action-id="leave"]:enabled').count()) > 0) return;
    for (const action of ["continue", "enter", "walk", "end-turn"]) {
      if ((await open(action).count()) > 0) {
        await open(action).click();
        break;
      }
    }
    await pad.waitForTimeout(100);
  }
  throw new Error("Never reached a building.");
};

test("EV-01 EV-14 Hints is a Game settings row, on by default, mirrored on the board", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const { session, context, pad, board } = await openSettings(browser, testInfo);
  try {
    const rows = pad.locator("main.bt-device div[data-setting]");
    const ids = await rows.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-setting")),
    );
    expect(ids.indexOf("hints")).toBeGreaterThan(ids.indexOf("party-size"));
    const on = pad.locator('button[data-setting="hints"][data-option="on"]');
    const off = pad.locator('button[data-setting="hints"][data-option="off"]');
    await expect(on).toHaveText("On");
    await expect(off).toHaveText("Off");
    await expect(on).toHaveAttribute("aria-pressed", "true");
    const mirror = board.locator('[data-setting="hints"] [data-setting-value]');
    await expect(mirror).toHaveText("On");
    await off.click();
    await expect(off).toHaveAttribute("aria-pressed", "true");
    await expect(mirror).toHaveText("Off");
    await on.click();
    await expect(mirror).toHaveText("On");
    await pad.screenshot({ path: testInfo.outputPath("settings-ipad.png") });
    await board.screenshot({ path: testInfo.outputPath("settings-board.png") });

    // Set at setup only: no Hints control anywhere in the gear once the game runs.
    await beginPlay(pad);
    await pad.locator('[data-action="menu"]').click();
    await expect(pad.locator("[data-menu]")).not.toContainText("Hints");
    await expect(pad.locator('button[data-setting="hints"]')).toHaveCount(0);
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("EV-04 EV-15 the first building opens with a caption under the art, then ends itself", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const { session, context, pad, board } = await openSettings(browser, testInfo);
  try {
    await beginPlay(pad);
    await walkIntoBuilding(pad, board);
    const hint = board.locator("[data-hint]");
    await expect(hint).toHaveCount(1);
    await expect(hint).toHaveText(BUILDING_HINT);
    // A building is an art hold: a caption, not a Scroll, and it has no button.
    await expect(hint).toHaveAttribute("data-hint-kind", "caption");
    await expect(board.locator("[data-scroll]")).toHaveCount(0);
    await expect(board.locator("main button")).toHaveCount(0);
    await expect(board.locator("[data-place]")).toBeVisible();
    // The iPad keeps its prior screen: no Leave yet.
    await expect(pad.locator('button[data-action-id="leave"]')).toHaveCount(0);
    await board.screenshot({ path: testInfo.outputPath("hint-board.png") });
    // The 4 s end by themselves, and the step (Leave) comes back.
    await expect(hint).toHaveCount(0, { timeout: 6_000 });
    await expect(pad.locator('button[data-action-id="leave"]:enabled')).toHaveCount(1);
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("EV-05 with Hints off no hint shows and the step is on at once", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const { session, context, pad, board } = await openSettings(browser, testInfo);
  try {
    await pad.locator('button[data-setting="hints"][data-option="off"]').click();
    await expect(board.locator('[data-setting="hints"] [data-setting-value]')).toHaveText("Off");
    await beginPlay(pad);
    await walkIntoBuilding(pad, board);
    await expect(pad.locator('button[data-action-id="leave"]:enabled')).toHaveCount(1);
    await expect(board.locator("[data-hint]")).toHaveCount(0);
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("EV-06 Look up lists the Rules group and each page opens on the board, display only", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const { session, context, pad, board } = await openSettings(browser, testInfo);
  try {
    await pad.locator('button[data-setting="hints"][data-option="off"]').click();
    await beginPlay(pad);
    await pad.locator('[data-action="menu"]').click();
    await pad.locator('[data-menu] [data-gear-item="look-up"]').click();
    const panel = board.locator('[data-panel="look-up"]');
    await expect(panel).toBeVisible();
    await expect(pad.getByText("See the Story board")).toBeVisible();
    await expect(pad.locator("[data-lookup-group]")).toHaveText("Rules");
    await expect(pad.getByText("Rules of the tower")).toHaveCount(0);
    await expect(pad.getByText("A sample card")).toHaveCount(0);
    const titles = ["Battle", "Building visit", "Event", "Skull drop", "Day's end"];
    for (const title of titles) {
      await pad.getByRole("button", { name: title, exact: true }).click();
      await expect(panel.locator("h3")).toHaveText(title);
      await expect(panel.locator("[data-card-page]")).not.toBeEmpty();
      await expect(panel.locator("button, input, textarea, select, a")).toHaveCount(0);
      await pad.locator("[data-gear-panel]").getByRole("button", { name: "Done" }).click();
      await pad.locator('[data-action="menu"]').click();
      await pad.locator('[data-menu] [data-gear-item="look-up"]').click();
    }
  } finally {
    await context.close();
    await session.host.close();
  }
});
