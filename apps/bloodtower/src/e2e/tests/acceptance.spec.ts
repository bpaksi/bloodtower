import { type BrowserContext, expect, type Locator, type Page, test } from "@playwright/test";
import { readRun } from "../../server/scripts/timingReport.ts";
import { DEVICE_TOKEN_KEY } from "../../web/lib/session.ts";
import {
  captureFrames,
  gateControls,
  holdHeroesFromTest,
  installSessionSocketHook,
  releaseTogether,
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

const TEARDOWN = [
  ["place-heroes", "Take each hero off the board."],
  ["lay-out-board", "Pack up the board."],
  ["seals-and-skulls", "Take the seals off the tower and collect the skulls."],
] as const;

const expectTeardown = async (root: Locator) => {
  const items = root.locator("[data-teardown] [data-setup-id]");
  await expect(items).toHaveCount(3);
  for (const [index, [id, text]] of TEARDOWN.entries()) {
    const item = items.nth(index);
    await expect(item).toHaveAttribute("data-setup-id", id);
    await expect(item).toHaveText(text);
  }
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
    const main = board.locator("main.bt-board");
    await expect(main).toHaveAttribute("data-screen", "claim-heroes", { timeout: 10_000 });
    await expect(main).toHaveAttribute("data-board-mode", "startup");
    await expect(main.locator('[data-illusionist-asset="dialog-frame"]')).toHaveCount(1);
    await expect(main.locator("[data-claim-count]")).toHaveText("4 of 4 claimed");
    for (const [id, label] of [
      ["hero-a", "Hero A"],
      ["hero-b", "Hero B"],
      ["hero-c", "Hero C"],
      ["hero-d", "Hero D"],
    ] as const) {
      const row = main.locator(`[data-hero="${id}"]`);
      await expect(row).toHaveAttribute("data-held", "true");
      await expect(row.getByText(label, { exact: true })).toBeVisible();
      await expect(row.getByText("Claimed", { exact: true })).toBeVisible();
    }
    await expect(main.getByText("Unclaimed", { exact: true })).toHaveCount(0);
    await expect(main.getByText(/— held|— waiting/)).toHaveCount(0);
    await expect(main.locator("[data-status-strip]")).toHaveCount(0);
    await expect(main.locator("[data-next-prompt]")).toBeVisible();
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
    await expect(quit).toHaveText("Quit story");
    await expect(page.getByRole("button", { name: "Quit game" })).toHaveCount(0);
    const quitPrompt = await quit.getAttribute("data-prompt-id");
    expect(quitPrompt).toMatch(/^pause-\d+-quit$/);
    const connectsBefore = tower.sent().filter((item) => item.type === "connect").length;
    await clickAct(page, "quit-story", quitPrompt ?? undefined);
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "session", {
      timeout: 30_000,
    });
    await expect(deviceMain(page).locator('button[data-action-id="new-game"]')).toBeVisible();
    await expect(
      deviceMain(page).locator('button[data-action-id="done-for-tonight"]'),
    ).toBeVisible();
    await expect(page.getByText(/seed/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Quit game" })).toHaveCount(0);

    const board = await context.newPage();
    await board.goto("/board");
    await clickAct(page, "done-for-tonight", "session-done-tonight");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "goodbye");
    const boardMain = board.locator("main.bt-board");
    await expect(boardMain).toHaveAttribute("data-screen", "goodbye");
    await expect(boardMain).toHaveAttribute("data-board-mode", "startup");
    await expect(boardMain.getByRole("heading", { name: "Goodbye" })).toBeVisible();
    await expect(boardMain.locator("[data-next-prompt] b")).toHaveText("The evening is closing.");
    await expectTeardown(deviceMain(page));
    await expectTeardown(boardMain);
    await expect(deviceMain(page).locator("[data-tower-state]")).toHaveText("unavailable");
    await expect(boardMain.locator("[data-tower-state]")).toHaveText("unavailable");
    expect(tower.sent().filter((item) => item.type === "idle")).toHaveLength(0);
    expect(tower.sent().filter((item) => item.type === "connect")).toHaveLength(connectsBefore);
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
    await holdHeroesFromTest(page2, [...HERO_IDS]);
    let walked = false;
    const walkDeadline = Date.now() + 120_000;
    while (Date.now() < walkDeadline && !walked) {
      const walkBtn = deviceMain(page2)
        .locator('button[data-action-id="walk"]:not([disabled])')
        .first();
      if ((await walkBtn.count()) > 0) {
        await walkBtn.click();
        walked = true;
        break;
      }
      if (!(await sendPlayPressFromTest(page2))) await page2.waitForTimeout(50);
    }
    expect(walked).toBe(true);
    await expect(deviceMain(page2)).toHaveAttribute("data-screen", "play");
    await expect(deviceMain(page2).getByText(/Day 3/i)).toBeVisible();
    expect(restarted.tower.sent().filter((item) => item.type === "idle")).toHaveLength(0);
  } finally {
    await context2.close();
    await restarted.host.close();
  }
});

const boardViewFrames = (frames: readonly string[]) =>
  frames
    .map((frame) => JSON.parse(frame) as { type: string })
    .filter((message) => message.type === "boardView");

test("core: one winner per press, private wire, disconnect pause, run from events", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo);
  const { baseURL, host, tower, databasePath } = session;
  const contextBoard = await browser.newContext({ baseURL });
  const contextA = await browser.newContext({ baseURL });
  const contextB = await browser.newContext({ baseURL });
  const contexts: BrowserContext[] = [contextBoard, contextA, contextB];
  const board = await contextBoard.newPage();
  const boardFrames = captureFrames(board);
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const gateA = await gateControls(pageA);
  const gateB = await gateControls(pageB);
  const joinPage = `${baseURL}/join?code=${host.joinCode}`;

  try {
    await board.goto("/board");
    await installSessionSocketHook(pageA);
    await installSessionSocketHook(pageB);
    await pageA.goto(joinPage);
    await pageB.goto(joinPage);

    await test.step("one tower-connect press wins when both devices press together", async () => {
      gateA.hold();
      gateB.hold();
      await clickAct(pageA, "tower-connect", "tower-connect");
      await clickAct(pageB, "tower-connect", "tower-connect");
      await gateA.held(1);
      await gateB.held(1);
      expect(releaseTogether(gateA, gateB)).toBe(2);
      await expect
        .poll(() => host.loadRun().presses.filter((press) => press.promptId === "tower-connect"))
        .toHaveLength(2);
      const connects = host.loadRun().presses.filter((press) => press.promptId === "tower-connect");
      expect(connects.filter((press) => press.winner)).toHaveLength(1);
      expect(tower.sent().filter((item) => item.type === "connect")).toHaveLength(1);
    });

    await clickAct(pageA, "tower-calibrate", "tower-calibrate");
    await clickAct(pageA, "new-game", "new-pick-game");
    await clickAct(pageA, "continue", `continue-pick-story-${STORY_ID}`);
    await clickAct(pageA, "continue", "continue-game-settings");
    await expect(deviceMain(pageA)).toHaveAttribute("data-screen", "claim-heroes", {
      timeout: 15_000,
    });
    await pageB.goto(joinPage);
    await expect(deviceMain(pageB)).toHaveAttribute("data-screen", "claim-heroes", {
      timeout: 30_000,
    });

    await test.step("private setup lines reach only the holder on screen and on the wire", async () => {
      await holdHeroesFromTest(pageA, ["hero-a", "hero-b"]);
      await holdHeroesFromTest(pageB, ["hero-c", "hero-d"]);
      await expect(pageA.getByText("Only Hero A hears this.")).toBeVisible();
      await expect(pageA.getByText("Only Hero D hears this.")).toHaveCount(0);
      await expect(pageB.getByText("Only Hero D hears this.")).toBeVisible();
      await expect(pageB.getByText("Only Hero A hears this.")).toHaveCount(0);
      await expect(board.getByText(/Only Hero [A-D] hears this/)).toHaveCount(0);
      expect(gateA.received.some((frame) => frame.includes("Only Hero A hears this."))).toBe(true);
      expect(gateB.received.some((frame) => frame.includes("Only Hero D hears this."))).toBe(true);
      for (const frame of gateA.received) {
        expect(frame).not.toContain("Only Hero D hears this.");
        expect(frame).not.toContain(".private.hero-d");
      }
      for (const frame of gateB.received) {
        expect(frame).not.toContain("Only Hero A hears this.");
        expect(frame).not.toContain(".private.hero-a");
      }
      expect(boardViewFrames(boardFrames).length).toBeGreaterThan(0);
      for (const frame of boardFrames) {
        expect(frame).not.toContain(".private.");
        expect(frame).not.toMatch(/Only Hero [A-D] hears this/);
      }
    });

    await holdHeroesFromTest(pageA, [...HERO_IDS]);
    await holdHeroesFromTest(pageB, [...HERO_IDS]);
    await clickAct(pageA, "continue", "continue-claim-heroes");
    const setupDeadline = Date.now() + 90_000;
    while (Date.now() < setupDeadline) {
      const screen = await deviceMain(pageA).getAttribute("data-screen");
      if (screen === "play") break;
      if (screen === "begin") {
        await holdHeroesFromTest(pageA, [...HERO_IDS]);
        await clickAct(pageA, "continue", "continue-begin");
        break;
      }
      if (screen === "setup") {
        await clickAct(pageA, "continue");
        continue;
      }
      await pageA.waitForTimeout(50);
    }
    await waitForPlayScreen(pageA);

    await test.step("dropping the only holder for heroes pauses until rejoin", async () => {
      const tokenB = await pageB.evaluate((key) => sessionStorage.getItem(key), DEVICE_TOKEN_KEY);
      expect(tokenB).toBeTruthy();
      await contextB.close();
      contexts.pop();
      await expect(deviceMain(pageA)).toHaveAttribute("data-screen", "pause", { timeout: 15_000 });
      await expect(
        deviceMain(pageA).locator('button[data-action-id="continue"]:not([disabled])'),
      ).toHaveCount(0);
      await expect(
        deviceMain(pageA).locator('button[data-action-id="walk"]:not([disabled])'),
      ).toHaveCount(0);

      const contextRejoin = await browser.newContext({ baseURL });
      contexts.push(contextRejoin);
      const pageC = await contextRejoin.newPage();
      await installSessionSocketHook(pageC);
      await pageC.goto("/join");
      await pageC.getByLabel("Rejoin token").fill(tokenB ?? "");
      await pageC.getByRole("button", { name: "Rejoin" }).click();
      await expect(pageC).toHaveURL(/\/device/);
      await holdHeroesFromTest(pageC, ["hero-c", "hero-d"]);
      await expect(deviceMain(pageA)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
    });

    await test.step("timingReport rebuilds the same presses as the host", async () => {
      const live = host.loadRun();
      const rebuilt = readRun(databasePath);
      expect(rebuilt.presses.length).toBeGreaterThan(0);
      expect(rebuilt.presses).toEqual(live.presses);
      let previous = -1;
      for (const press of rebuilt.presses) {
        expect(press.atMonoMs).toBeGreaterThanOrEqual(previous);
        expect(press.atWall).toMatch(/^\d{4}-\d\d-\d\dT.*Z$/);
        previous = press.atMonoMs;
      }
    });
  } finally {
    for (const ctx of contexts) await ctx.close().catch(() => undefined);
    await host.close();
  }
});
