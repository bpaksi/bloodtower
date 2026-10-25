import { expect, type Locator, type Page, test } from "@playwright/test";
import {
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";

const STORY_ID = "test";
const HERO_IDS = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;

const deviceMain = (page: Page) => page.locator("main.bt-device");

const clickAct = async (page: Page, actionId: string, promptId: string) => {
  const button = page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`);
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const box = async (locator: Locator) => {
  const found = await locator.boundingBox();
  if (!found) throw new Error("No box.");
  return found;
};

const expectBar = async (page: Page, ipad: boolean) => {
  const bar = page.locator("[data-bottom-bar]");
  await expect(bar).toHaveCount(1);
  await expect(bar).toBeVisible();
  const view = page.viewportSize();
  if (!view) throw new Error("No viewport.");
  const barBox = await box(bar);
  expect(Math.abs(view.height - (barBox.y + barBox.height))).toBeLessThanOrEqual(8);
  const back = await box(bar.locator('[data-action="back"]'));
  const replay = await box(bar.locator('[data-action="replay"]'));
  const menu = await box(bar.locator('[data-action="menu"]'));
  expect(back.x).toBeLessThan(replay.x);
  expect(replay.x).toBeLessThan(menu.x);
  const left = back.x;
  const right = view.width - (menu.x + menu.width);
  expect(Math.abs(left - right)).toBeLessThanOrEqual(12);
  if (ipad) {
    expect(left).toBeGreaterThanOrEqual(24);
    expect(right).toBeGreaterThanOrEqual(24);
  }
  const gapA = replay.x - (back.x + back.width);
  const gapB = menu.x - (replay.x + replay.width);
  expect(Math.abs(gapA - gapB)).toBeLessThanOrEqual(12);
};

const expectMuted = async (page: Page) => {
  const media = await page.evaluate(() => ({
    videos: [...document.querySelectorAll("video")].map((v) => ({
      muted: v.muted,
      volume: v.volume,
    })),
    playing: [...document.querySelectorAll("audio")].filter((a) => !a.paused).length,
  }));
  for (const video of media.videos) {
    expect(video.muted).toBe(true);
    expect(video.volume).toBe(0);
  }
  expect(media.playing).toBe(0);
};

const toClaim = async (page: Page, joinCode: string, ipad: boolean) => {
  await installSessionSocketHook(page);
  await page.goto(`/join?code=${joinCode}`);
  await expect(page).toHaveURL(/\/device/);
  const walk = [
    ["splash", "splash-play"],
    ["pick-story", `continue-pick-story-${STORY_ID}`],
    ["game-settings", "continue-game-settings"],
  ] as const;
  for (const [screen, promptId] of walk) {
    await expect(deviceMain(page)).toHaveAttribute("data-screen", screen);
    await expectBar(page, ipad);
    await expectMuted(page);
    await clickAct(page, "continue", promptId);
  }
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "tower-connect");
  await expectBar(page, ipad);
  await expectMuted(page);
  await clickAct(page, "play-without-tower", "play-without-tower");
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "claim-heroes");
  await expectBar(page, ipad);
  await expectMuted(page);
};

test("W1 /join with no code shows the bar, a disabled Back and Replay, and the gear", async ({
  page,
}, testInfo) => {
  const ipad = testInfo.project.name === "ipad";
  await page.goto("/join");
  await expect(page.getByRole("heading", { name: "Join" })).toBeVisible();
  await expect(
    page.locator('input[name="code"], input[inputmode="numeric"]').first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter the table" })).toBeVisible();
  await expectBar(page, ipad);
  const bar = page.locator("[data-bottom-bar]");
  await expect(bar.locator('[data-action="back"]')).toHaveText("Back");
  await expect(bar.locator('[data-action="back"]')).toBeDisabled();
  await expect(bar.locator('[data-action="replay"]')).toHaveText("Replay");
  await expect(bar.locator('[data-action="replay"]')).toBeDisabled();
  const menu = bar.locator('[data-action="menu"]');
  await expect(menu).toBeEnabled();
  await expect(menu).toHaveAccessibleName("Menu");
  expect((await menu.innerText()).trim()).toBe("");
  await expect(menu.locator("svg, img")).toHaveCount(1);
  expect(await bar.innerText()).not.toMatch(/claim|hold|pick/i);
  await expectMuted(page);

  await menu.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveCount(1);
  const view = page.viewportSize();
  if (!view) throw new Error("No viewport.");
  const dialogBox = await box(dialog);
  expect(Math.abs(dialogBox.x + dialogBox.width / 2 - view.width / 2)).toBeLessThanOrEqual(24);
  expect(Math.abs(dialogBox.y + dialogBox.height / 2 - view.height / 2)).toBeLessThanOrEqual(24);
  expect(dialogBox.x).toBeGreaterThan(0);
  expect(dialogBox.y).toBeGreaterThan(0);
  expect(dialogBox.x + dialogBox.width).toBeLessThan(view.width);
  expect(dialogBox.y + dialogBox.height).toBeLessThan(view.height);
  for (const name of ["Look up", "Table", "Leave"]) {
    await expect(dialog.getByRole("heading", { name })).toHaveCount(1);
    await expect(page.getByRole("heading", { name })).toHaveCount(1);
  }
  await expect(dialog.locator('[data-action="back"], [data-action="replay"]')).toHaveCount(0);
  await expect(bar).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await menu.click();
  await expect(dialog).toHaveCount(1);
  await menu.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Join" })).toBeVisible();
});

test("W1 the bar, Menu dialog, pinned Continue and no page scroll on claim-heroes", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const ipad = testInfo.project.name === "ipad";
  const session = await startAcceptanceHost(testInfo, { seed: "w1-chrome" });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const page = await context.newPage();
  try {
    await toClaim(page, session.host.joinCode, ipad);
    const bar = page.locator("[data-bottom-bar]");

    await bar.locator('[data-action="menu"]').click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveCount(1);
    await expect(dialog.getByRole("heading", { name: "Look up" })).toHaveCount(1);
    await expect(dialog.getByRole("heading", { name: "Table" })).toHaveCount(1);
    await expect(dialog.getByRole("heading", { name: "Leave" })).toHaveCount(1);
    await expect(dialog.locator('[data-action="back"], [data-action="replay"]')).toHaveCount(0);
    await expect(bar).toBeVisible();
    const view = page.viewportSize();
    if (!view) throw new Error("No viewport.");
    const dialogBox = await box(dialog);
    expect(Math.abs(dialogBox.x + dialogBox.width / 2 - view.width / 2)).toBeLessThanOrEqual(24);
    expect(Math.abs(dialogBox.y + dialogBox.height / 2 - view.height / 2)).toBeLessThanOrEqual(24);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "claim-heroes");

    if (testInfo.project.name === "phone") {
      await holdHeroesFromTest(page, [...HERO_IDS]);
      await page.locator(".bt-scroll").evaluate((node) => {
        const spacer = document.createElement("div");
        spacer.style.height = "3000px";
        node.appendChild(spacer);
        node.scrollTop = node.scrollHeight;
      });
      const scroller = await page.evaluate(() => ({
        top: document.scrollingElement?.scrollTop ?? 0,
        height: document.scrollingElement?.scrollHeight ?? 0,
        inner: window.innerHeight,
      }));
      expect(scroller.top).toBe(0);
      expect(scroller.height).toBeLessThanOrEqual(scroller.inner);
      const barBox = await box(bar);
      expect(Math.abs(view.height - (barBox.y + barBox.height))).toBeLessThanOrEqual(8);
      const next = page.locator('button[data-action-id="continue"]');
      await expect(next).toHaveCount(1);
      const nextBox = await box(next);
      expect(nextBox.y).toBeGreaterThanOrEqual(0);
      expect(nextBox.y + nextBox.height).toBeLessThanOrEqual(view.height);
      const inScroll = await next.evaluate((node) => node.closest(".bt-scroll") !== null);
      expect(inScroll).toBe(false);
      await expect(bar.locator('[data-action="back"]')).toBeVisible();
    }
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("W1 a held hero, the Menu and a restart survive Continue", async ({ browser }, testInfo) => {
  test.setTimeout(120_000);
  const ipad = testInfo.project.name === "ipad";
  const session = await startAcceptanceHost(testInfo, { seed: "w1-survive" });
  const { databasePath } = session;
  const context = await browser.newContext({ baseURL: session.baseURL });
  const page = await context.newPage();
  try {
    await toClaim(page, session.host.joinCode, ipad);
    await holdHeroesFromTest(page, ["hero-a"]);
    await expect(page.locator('button[data-hunter="hero-a"]')).toHaveAttribute(
      "data-claim",
      "yours",
    );
    await page.locator('[data-action="menu"]').click();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await page.locator('[data-action="menu"]').click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } finally {
    await context.close();
    await session.host.close();
  }
  expect(session.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);

  const restarted = await startAcceptanceHost(testInfo, { databasePath, seed: "w1-survive" });
  const context2 = await browser.newContext({ baseURL: restarted.baseURL });
  const again = await context2.newPage();
  try {
    await installSessionSocketHook(again);
    await again.goto(`/join?code=${restarted.host.joinCode}`);
    await clickAct(again, "continue", "splash-play");
    // The party pick is restored. This is a new iPad, so Hero A is taken by the one that sat down.
    await expect(deviceMain(again)).toHaveAttribute("data-screen", "claim-heroes");
    await expect(again.locator("[data-pick-status]")).toHaveText("1 of 4 picked");
    await expect(again.locator('button[data-hunter="hero-a"]')).toHaveAttribute(
      "data-claim",
      "taken",
    );
    await expectBar(again, ipad);
    await again.locator('[data-action="menu"]').click();
    await again.locator('[data-action="menu"]').click();
    await expect(deviceMain(again)).toHaveAttribute("data-screen", "claim-heroes");
    expect(restarted.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);
  } finally {
    await context2.close();
    await restarted.host.close();
  }
});
