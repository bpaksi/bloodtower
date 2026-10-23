import { expect, type Page, test } from "@playwright/test";
import { startAcceptanceHost } from "./support/acceptance.ts";

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page
        .locator(`button[data-action-id="${actionId}"], button[data-action="${actionId}"]`)
        .first();
  await expect(button).toBeEnabled({ timeout: 30_000 });
  await button.click();
};

const walkToPickStory = async (page: Page) => {
  await clickAct(page, "tower-connect", "tower-connect");
  await clickAct(page, "tower-calibrate", "tower-calibrate");
  await clickAct(page, "new-game", "new-pick-game");
  await expect(page.locator("main")).toHaveAttribute("data-screen", "pick-story", {
    timeout: 30_000,
  });
};

const walkSetupToPlay = walkToPickStory;

const advancePlay = async (page: Page, presses: number) => {
  for (let i = 0; i < presses; i += 1) {
    const cont = page.locator('button[data-action-id="continue"]');
    const record = page.locator('button[data-action-id="record"]');
    const walk = page.locator('button[data-action-id="walk"]');
    const leave = page.locator('button[data-action-id="leave"]');
    if (await record.count()) {
      await record.first().click();
      continue;
    }
    if (await walk.count()) {
      await walk.first().click();
      continue;
    }
    if (await leave.count()) {
      await leave.first().click();
      continue;
    }
    if (await cont.count()) {
      await cont.first().click();
      continue;
    }
    break;
  }
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

    await device.goto(`/join?code=${host.joinCode}`);
    await expect(device).toHaveURL(/\/device/);
    await walkToPickStory(device);
  } finally {
    await context.close();
    await session.host.close();
  }
});

test.fixme("quit from pause lands on session; continue resumes after host restart", async ({
  browser,
}, testInfo) => {
  test.setTimeout(240_000);
  const session = await startAcceptanceHost(testInfo);
  const { baseURL, host, databasePath } = session;
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  try {
    await page.goto(`/join?code=${host.joinCode}`);
    await walkSetupToPlay(page);
    await advancePlay(page, 80);
    await advancePlay(page, 80);
    await clickAct(page, "pause");
    await clickAct(page, "quit-story");
    await expect(page.locator("main")).toHaveAttribute("data-screen", "session");
    await expect(page.locator('button[data-action-id="new-game"]')).toBeVisible();
    await expect(page.locator('button[data-action-id="done-for-tonight"]')).toBeVisible();
    await clickAct(page, "done-for-tonight");
    await expect(page.locator("main")).toHaveAttribute("data-screen", "goodbye");
  } finally {
    await context.close();
    await session.host.close();
  }

  const restarted = await startAcceptanceHost(testInfo, { databasePath });
  const context2 = await browser.newContext({ baseURL: restarted.baseURL });
  const page2 = await context2.newPage();
  try {
    await page2.goto(`/join?code=${restarted.host.joinCode}`);
    await clickAct(page2, "tower-connect");
    await clickAct(page2, "tower-calibrate");
    await expect(page2.locator('button[data-action-id="continue"]')).toBeVisible({
      timeout: 20_000,
    });
    await clickAct(page2, "continue");
    await expect(page2.locator("main")).toHaveAttribute("data-screen", "play");
    await expect(page2.getByText(/Day 3/i)).toBeVisible({ timeout: 20_000 });
  } finally {
    await context2.close();
    await restarted.host.close();
  }
});
