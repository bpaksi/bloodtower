import { expect, type Page, test } from "@playwright/test";
import {
  holdHeroesFromTest,
  installSessionSocketHook,
  sendPlayPressFromTest,
  startAcceptanceHost,
} from "./support/acceptance.ts";

const STORY_ID = "test";
const HERO_IDS = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page
        .locator(`button[data-action-id="${actionId}"], button[data-action="${actionId}"]`)
        .first();
  await expect(button).toBeEnabled({ timeout: 30_000 });
  await button.click();
};

const readDayNumber = async (page: Page): Promise<number | null> => {
  const text = await deviceMain(page).locator("p").first().textContent();
  const match = text?.match(/Day (\d+)/);
  return match ? Number(match[1]) : null;
};

/** Autoplay presses until the device shows the given day number (inclusive). */
const playUntilDay = async (page: Page, targetDay: number) => {
  await holdHeroesFromTest(page, [...HERO_IDS]);
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    const day = await readDayNumber(page);
    if (day !== null && day >= targetDay) return;
    const screen = await deviceMain(page).getAttribute("data-screen");
    if (screen === "pause") {
      await holdHeroesFromTest(page, [...HERO_IDS]);
    }
    const pressed = await sendPlayPressFromTest(page);
    if (!pressed) await page.waitForTimeout(50);
    else await page.waitForTimeout(10);
  }
  throw new Error(`Timed out before reaching day ${targetDay}`);
};

const deviceMain = (page: Page) => page.locator("main.bt-device");

const waitForPlayScreen = async (page: Page) => {
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "play", { timeout: 60_000 });
};

const walkFullSetup = async (page: Page, joinCode: string, board?: Page) => {
  await installSessionSocketHook(page);
  await page.goto(`/join?code=${joinCode}`);
  await expect(page).toHaveURL(/\/device/, { timeout: 30_000 });
  await clickAct(page, "tower-connect", "tower-connect");
  await clickAct(page, "tower-calibrate", "tower-calibrate");
  await clickAct(page, "new-game", "new-pick-game");
  await clickAct(page, "continue", `continue-pick-story-${STORY_ID}`);
  await clickAct(page, "continue", "continue-game-settings");
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "claim-heroes", {
    timeout: 15_000,
  });
  await holdHeroesFromTest(page, [...HERO_IDS]);
  if (board) {
    for (const label of ["Hero A", "Hero B", "Hero C", "Hero D"]) {
      await expect(board.getByText(`${label} — held`)).toBeVisible({ timeout: 10_000 });
    }
  }
  await expect(
    page.locator(
      'button[data-prompt-id="continue-claim-heroes"][data-action-id="continue"]:not([disabled])',
    ),
  ).toBeEnabled({ timeout: 15_000 });
  await clickAct(page, "continue", "continue-claim-heroes");

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const screen = await deviceMain(page).getAttribute("data-screen");
    if (screen === "play") return;
    if (screen === "setup") {
      const stepContinue = page
        .locator('main.bt-device button[data-action-id="continue"]:not([disabled])')
        .first();
      await expect(stepContinue).toBeEnabled({ timeout: 15_000 });
      await stepContinue.click();
      continue;
    }
    if (screen === "begin") {
      await holdHeroesFromTest(page, [...HERO_IDS]);
      const beginContinue = page.locator(
        'button[data-prompt-id="continue-begin"][data-action-id="continue"]:not([disabled])',
      );
      if ((await beginContinue.count()) > 0) {
        await beginContinue.click();
        await waitForPlayScreen(page);
        return;
      }
      if ((await deviceMain(page).getAttribute("data-screen")) === "play") return;
      await page.waitForTimeout(100);
      continue;
    }
    if (screen === "claim-heroes") {
      await page.waitForTimeout(100);
      continue;
    }
    throw new Error(`Unexpected setup screen: ${screen}`);
  }
  await waitForPlayScreen(page);
};

test("core: board is display-only and a device walks setup to play", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo);
  const { baseURL, host } = session;
  const context = await browser.newContext({ baseURL });
  const board = await context.newPage();
  const device = await context.newPage();
  try {
    await board.goto("/board");
    await expect(board.locator("main.bt-board")).toBeVisible();
    await expect(board.getByText(new RegExp(host.joinCode))).toBeVisible();
    await expect(board.locator("main :is(button, input, textarea, select)")).toHaveCount(0);

    await walkFullSetup(device, host.joinCode, board);
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("quit from pause lands on session; continue resumes after host restart", async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  const session = await startAcceptanceHost(testInfo, { seed: "e2e-seed" });
  const { baseURL, host, tower, databasePath } = session;
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  try {
    await walkFullSetup(page, host.joinCode);
    await playUntilDay(page, 3);

    tower.loseConnection();
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "pause", { timeout: 30_000 });

    const quit = deviceMain(page).locator('button[data-action-id="quit-story"]');
    const quitPrompt = await quit.getAttribute("data-prompt-id");
    expect(quitPrompt).toMatch(/^pause-\d+-quit$/);
    await clickAct(page, "quit-story", quitPrompt ?? undefined);
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "session", {
      timeout: 30_000,
    });
    await expect(deviceMain(page).locator('button[data-action-id="new-game"]')).toBeVisible();
    await expect(
      deviceMain(page).locator('button[data-action-id="done-for-tonight"]'),
    ).toBeVisible();
    await expect(page.getByText(/seed/i)).toHaveCount(0);

    await clickAct(page, "done-for-tonight", "session-done-tonight");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "goodbye");
  } finally {
    await context.close();
    await session.host.close();
  }

  const restarted = await startAcceptanceHost(testInfo, { databasePath, seed: "e2e-seed" });
  const context2 = await browser.newContext({ baseURL: restarted.baseURL });
  const page2 = await context2.newPage();
  try {
    await installSessionSocketHook(page2);
    await page2.goto(`/join?code=${restarted.host.joinCode}`);
    await clickAct(page2, "tower-connect", "tower-connect");
    await clickAct(page2, "tower-calibrate", "tower-calibrate");
    await expect(
      page2.locator('button[data-prompt-id="continue-pick-game"][data-action-id="continue"]'),
    ).toBeVisible({
      timeout: 20_000,
    });
    await clickAct(page2, "continue", "continue-pick-game");
    await expect(deviceMain(page2)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
    await expect(deviceMain(page2).getByText(/Day 3/i)).toBeVisible({ timeout: 20_000 });
    await expect(page2.getByText(/seed/i)).toHaveCount(0);
  } finally {
    await context2.close();
    await restarted.host.close();
  }
});
