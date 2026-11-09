import { expect, type Page, test } from "@playwright/test";
import {
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";
import { copyToE2eArtifacts } from "./support/e2e-artifacts.ts";

/**
 * A1-07 (D46): with the web UI built with SHOW_ASSET_IDS=1 the board labels the Keeper line id and
 * the place still id. The flag is fixed at build time (static export), so this spec needs a flagged
 * build: `SHOW_ASSET_IDS=1 pnpm build` in the web part first. Without it the spec is skipped.
 */
const FLAGGED_BUILD = process.env.SHOW_ASSET_IDS === "1";
const BOARD_VIEW = { width: 1920, height: 1080 };
/** The board's outer padding at 1920x1080: clamp(1rem, 2.2vw, 2.25rem) and clamp(0.8rem, 1.6vh, 1.6rem). */
const SAFE_X = 36;
const SAFE_Y = 17.28;

const HERO_IDS = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

type Box = { x: number; y: number; width: number; height: number };
const intersects = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const assertLabel = async (board: Page, text: string, others: string[]) => {
  const label = board.locator("[data-asset-id-label]");
  await expect(label).toHaveCount(1);
  await expect(label).toHaveText(text);
  const box = await label.boundingBox();
  if (!box) throw new Error("label has no box");
  expect(box.x).toBeGreaterThanOrEqual(SAFE_X - 1);
  expect(box.y + box.height).toBeLessThanOrEqual(BOARD_VIEW.height - SAFE_Y + 1);
  expect(box.x + box.width).toBeLessThan(BOARD_VIEW.width / 2);
  expect(box.y).toBeGreaterThan(BOARD_VIEW.height / 2);
  const size = Number.parseFloat(await label.evaluate((n) => getComputedStyle(n).fontSize));
  expect(size).toBeGreaterThanOrEqual(14);
  expect(size).toBeLessThanOrEqual(16);
  expect(await label.evaluate((n) => getComputedStyle(n).position)).toBe("fixed");
  for (const selector of others) {
    const nodes = board.locator(selector);
    for (let i = 0; i < (await nodes.count()); i++) {
      const other = await nodes.nth(i).boundingBox();
      if (other)
        expect(intersects(box, other), `${selector} #${i} ${JSON.stringify({ box, other })}`).toBe(
          false,
        );
    }
  }
};

test("A1-07 the board labels the Keeper line and the place still, and the iPad never does", async ({
  browser,
}, testInfo) => {
  test.skip(!FLAGGED_BUILD, "needs a web build made with SHOW_ASSET_IDS=1");
  test.skip(
    testInfo.project.name !== "desktop",
    "one 1920x1080 board; the iPad page is the other half",
  );
  test.setTimeout(240_000);
  const session = await startAcceptanceHost(testInfo, { seed: "a1-asset-id" });
  const boardContext = await browser.newContext({ baseURL: session.baseURL, viewport: BOARD_VIEW });
  const deviceContext = await browser.newContext({
    baseURL: session.baseURL,
    viewport: { width: 820, height: 1180 },
    hasTouch: true,
  });
  try {
    const board = await boardContext.newPage();
    const device = await deviceContext.newPage();
    await board.goto("/board");
    await installSessionSocketHook(device);
    await device.goto(`/join?code=${session.host.joinCode}`);
    await enterWithoutTower(device);
    await clickAct(device, "continue", "continue-pick-story-test");
    await clickAct(device, "continue", "continue-game-settings");
    await holdHeroesFromTest(device, [...HERO_IDS]);
    await clickAct(device, "continue", "continue-claim-heroes");

    const main = device.locator("main.bt-device");
    const deadline = Date.now() + 60_000;
    while ((await main.getAttribute("data-screen")) !== "play") {
      if (Date.now() > deadline) throw new Error("Did not reach play.");
      const screen = await main.getAttribute("data-screen");
      if (screen === "setup") {
        const step = device.locator(
          'button[data-prompt-id^="continue-setup-"][data-action-id="continue"]',
        );
        if ((await step.count()) > 0 && (await step.first().isEnabled()))
          await step.first().click();
      } else if (screen === "begin") {
        await clickAct(device, "continue", "continue-begin");
      }
      await device.waitForTimeout(100);
    }

    for (const id of OPENING_IDS) {
      await expect(board.locator("main")).toHaveAttribute("data-moment", id);
      if (id === "grey-stair.03") {
        await expect(board.locator('[data-talking-avatar="keeper"]')).toBeVisible();
        await assertLabel(board, "ts-keeper-001", [
          "[data-board-caption]",
          "[data-caption-toggle]",
        ]);
        await expect(device.locator("[data-asset-id-label]")).toHaveCount(0);
        const shot = testInfo.outputPath("a1-07-board-asset-id-1920x1080.png");
        await board.screenshot({ path: shot });
        copyToE2eArtifacts(testInfo, shot, "a1-07-board-asset-id-1920x1080.png");
      } else {
        await expect(board.locator("[data-asset-id-label]")).toHaveCount(0);
      }
      await clickAct(device, "continue", `continue-opening-${id.replace(".", "-")}`);
    }

    const roll = device.locator('button[data-prompt-id*="roll-done"]');
    const enter = device.locator('button[data-action-id="enter"]');
    await expect
      .poll(async () => ((await roll.count()) > 0 || (await enter.count()) > 0 ? "ready" : ""), {
        timeout: 20_000,
      })
      .toBe("ready");
    if ((await roll.count()) > 0) {
      await roll.click();
      await expect(enter).toBeVisible({ timeout: 20_000 });
    }
    await clickAct(device, "enter");
    await expect(board.locator("main")).toHaveAttribute("data-board-layer", "place");
    const stillId = await board.locator("[data-still]").getAttribute("data-still");
    expect(stillId).toMatch(/^place\./u);
    await assertLabel(board, stillId ?? "", ["[data-board-caption]", "[data-place] figcaption"]);
    await expect(device.locator("[data-asset-id-label]")).toHaveCount(0);
  } finally {
    await boardContext.close();
    await deviceContext.close();
    await session.host.close();
  }
});
