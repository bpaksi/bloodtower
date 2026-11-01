import { resolve } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { loadConfig } from "../../server/config.ts";
import { startSessionHost } from "../../server/hub/host.ts";
import { createMockTower } from "../../server/tower/mock.ts";
import { bloodtowerTowerFromMock } from "../../server/tower/testAdapter.ts";
import {
  enterWithoutTower,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";

const WEB_ROOT = resolve(import.meta.dirname, "../../web/out");
const STORY_ID = "test";

const mainOf = (page: Page) => page.locator("main.bt-device");

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

test("W2 landing shows an open Blood Tower banner and a Sound control", async ({
  page,
}, testInfo) => {
  const project = testInfo.project.name;
  await page.addInitScript(() => {
    const Original = window.AudioContext;
    const made: AudioContext[] = [];
    (window as Window & { btContexts?: AudioContext[] }).btContexts = made;
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) {
        super(options);
        made.push(this);
      }
    };
  });
  await page.goto("/");
  await expect(page.locator('[data-screen="title"]')).toBeVisible();

  const banner = page.locator("[data-banner]");
  await expect(banner).toBeVisible();
  const bannerFacts = await banner.evaluate((el) => ({
    tag: el.tagName,
    text: (el.textContent ?? "").trim(),
    src:
      el instanceof HTMLImageElement ? el.getAttribute("src") : el.getAttribute("data-banner-src"),
  }));
  expect(["IMG", "SVG"]).toContain(bannerFacts.tag.toUpperCase());
  expect(bannerFacts.text).toBe("");
  expect(bannerFacts.src).not.toBe("/landing/hero.webp");
  await expect(banner).toHaveAccessibleName("Blood Tower");
  const headings = await page.getByRole("heading").allTextContents();
  expect(headings.map((text) => text.trim())).not.toContain("Blood Tower");

  const backdrop = await page
    .locator(".bt-title-backdrop")
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(backdrop).toContain("/landing/hero.webp");

  await expect(page.getByRole("link", { name: /Story board/i })).toHaveAttribute("href", "/board");
  await expect(page.getByRole("link", { name: /Hunter/i })).toHaveAttribute("href", "/join");
  await expect(page.locator("[data-bottom-bar]")).toHaveCount(0);

  const sound = page.locator('[data-action="sound"]');
  await expect(sound).toBeVisible();
  await expect(sound).toHaveAccessibleName("Sound");
  await expect(page.locator("[data-sound-dialog]")).toHaveCount(0);
  const quiet = await page.evaluate(() => {
    const made = (window as Window & { btContexts?: AudioContext[] }).btContexts ?? [];
    const playing = [...document.querySelectorAll("audio")].some(
      (element) => !element.paused && !element.ended && element.currentTime > 0,
    );
    return { playing, running: made.some((context) => context.state === "running") };
  });
  expect(quiet.playing).toBe(false);
  expect(quiet.running).toBe(false);

  if (project === "desktop") {
    await page.keyboard.press("Tab");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: /Story board/i })).toBeFocused();

    await sound.click();
    await expect(page).toHaveURL(/\/$/);
    const dialog = page.locator("[data-sound-dialog]");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("#bt-sound-music")).toBeVisible();
    await expect(dialog.locator("#bt-sound-ambient")).toBeVisible();
    await expect(dialog.locator("#bt-sound-voice")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Test" })).toHaveCount(3);
    await expect(dialog.getByRole("button", { name: "Continue" })).toHaveCount(1);
    await expect(dialog.locator("input")).toHaveCount(3);
    await page.locator("#bt-sound-music").fill("35");
    await dialog.getByRole("button", { name: "Continue" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('[data-action="sound"]').click();
    await expect(page.locator("#bt-sound-music")).toHaveValue("35");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.locator("[data-banner]").click({ position: { x: 8, y: 8 } });
    await expect(page).toHaveURL(/\/board$/);
  } else {
    await sound.click();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("button", { name: "Test" }).first().click();
    await expect(page).toHaveURL(/\/$/);
    const afterTest = await page.evaluate(() => {
      const made = (window as Window & { btContexts?: AudioContext[] }).btContexts ?? [];
      const playing = [...document.querySelectorAll("audio")].some(
        (element) => !element.paused && !element.ended && element.currentTime > 0,
      );
      return { playing, running: made.some((context) => context.state === "running") };
    });
    expect(afterTest.playing).toBe(false);
    expect(afterTest.running).toBe(false);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator("[data-sound-dialog]")).toHaveCount(0);

    await page.locator("[data-banner]").click({ position: { x: 8, y: 8 } });
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("link", { name: /Hunter/i }).click();
    await expect(page).toHaveURL(/\/join/);
  }

  await page.goto("/board");
  await expect(page.locator('[data-action="sound"]')).toHaveCount(0);
  await expect(page.locator("[data-banner]")).toHaveCount(0);
  await expect(page.locator("[data-bottom-bar]")).toHaveCount(0);
});

const expectStep = async (page: Page, context: string, instruction: string | RegExp) => {
  const stepContext = page.locator("main[data-screen] [data-step-context]");
  const stepInstruction = page.locator("main[data-screen] [data-step-instruction]");
  await expect(stepContext).toBeVisible();
  await expect(stepInstruction).toBeVisible();
  await expect(stepContext).not.toHaveText("0");
  await expect(stepInstruction).not.toHaveText("0");
  await expect(stepContext).toHaveText(context);
  await expect(stepInstruction).toHaveText(instruction);
};

test("W2 the Enter asks the tower question once, before Pick story, and keeps the step lines", async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name === "desktop", "Device checks run on phone and ipad.");
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w2-tower-off" });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const page = await context.newPage();
  try {
    await installSessionSocketHook(page);
    await page.goto(`/join?code=${session.host.joinCode}`);
    await expect(page).toHaveURL(/\/device/);
    await expect(mainOf(page)).toHaveAttribute("data-screen", "base-board");
    await expectStep(page, "Base board", /Set the tower on the board\./);
    const setUp = mainOf(page).locator('button[data-prompt-id="base-board-done"]');
    await expect(setUp).toHaveAccessibleName("Board is set up");
    await setUp.click();

    await expect(mainOf(page)).toHaveAttribute("data-screen", "tower-choice");
    await expectStep(page, "Tower", "Wake the tower, or play tonight without it?");
    const primary = mainOf(page).locator('[data-primary="true"]');
    await expect(primary).toHaveCount(1);
    await expect(primary).toHaveAccessibleName("Connect Tower");
    await expect(primary).toHaveAttribute("data-action", "tower-connect");
    const skip = mainOf(page).locator('[data-action="play-without-tower"]');
    await expect(skip).toHaveCount(1);
    await expect(skip).toHaveAccessibleName("Play without Tower");
    await expect(skip).not.toHaveAttribute("data-primary", "true");
    for (const name of ["Connect tower", "Play without tower", "Skip", "Next", "Continue"]) {
      await expect(mainOf(page).getByRole("button", { name, exact: true })).toHaveCount(0);
    }
    expect(session.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);

    await skip.click();
    await expect(mainOf(page)).toHaveAttribute("data-screen", "pick-story");
    await expectStep(page, "Pick Story", "Proving Grounds");
    await expect(page.getByRole("button", { name: "Pick Hero A" })).toHaveCount(0);
    await clickAct(page, "continue", `continue-pick-story-${STORY_ID}`);

    await expect(mainOf(page)).toHaveAttribute("data-screen", "game-settings");
    await expectStep(page, "Game settings", /.+/);
    await clickAct(page, "continue", "continue-game-settings");

    await expect(mainOf(page)).toHaveAttribute("data-screen", "claim-heroes");
    expect(session.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);
    await expectStep(page, "Party Join", /^\d+ of \d+ picked$/);
    await expect(page.locator('button[data-hunter="hero-a"]')).toHaveAccessibleName("Pick Hero A");
    await expect(page.getByRole("button", { name: /^(Take|Claim|Hold)\b/ })).toHaveCount(0);

    await page.locator('[data-action="menu"]').click();
    const menuConnect = page.locator('button[data-prompt-id="menu-connect"]');
    if ((await menuConnect.count()) > 0) {
      await expect(menuConnect).toHaveAccessibleName("Connect Tower");
      await expect(menuConnect).toHaveAttribute("data-action", "tower-connect");
    }
    await page.locator('[data-action="menu"]').click();
    await expect(mainOf(page)).toHaveAttribute("data-screen", "claim-heroes");
    await expect(page.locator('button[data-hunter="hero-a"]')).toBeVisible();
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("W2 Sound and Play without Tower leave the session, and levels survive a host restart", async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "ipad", "One device width covers the restart.");
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w2-survival" });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const device = await context.newPage();
  const landing = await context.newPage();
  const port = Number(new URL(session.baseURL).port);
  const joinCode = session.host.joinCode;
  try {
    await installSessionSocketHook(device);
    await device.goto(`/join?code=${joinCode}`);
    await enterWithoutTower(device);
    await clickAct(device, "continue", `continue-pick-story-${STORY_ID}`);
    await clickAct(device, "continue", "continue-game-settings");
    await expect(mainOf(device)).toHaveAttribute("data-screen", "claim-heroes");
    await device.locator('button[data-hunter="hero-a"]').click();
    await expect(device.locator('button[data-hunter="hero-a"]')).toHaveAttribute(
      "data-claim",
      "yours",
    );

    await landing.goto("/");
    await landing.locator('[data-action="sound"]').click();
    await landing.locator("#bt-sound-music").fill("35");
    await landing.getByRole("button", { name: "Continue" }).click();
    await expect(device.locator('button[data-hunter="hero-a"]')).toHaveAttribute(
      "data-claim",
      "yours",
    );
    await expect(mainOf(device)).toHaveAttribute("data-screen", "claim-heroes");
    await expect(device.locator("[data-step-instruction]")).toHaveText(/picked/);
    expect(session.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);

    await session.host.close();
    const tower = createMockTower();
    const restarted = await startSessionHost({
      port,
      host: "127.0.0.1",
      webRoot: WEB_ROOT,
      packsDir: loadConfig({ env: {} }).packsDir,
      databasePath: session.databasePath,
      tower: bloodtowerTowerFromMock(tower),
      towerWatchMs: 50,
      sleep: async () => undefined,
      seed: "w2-survival",
      graceMs: 100,
      joinCode,
    });
    try {
      await landing.goto("/");
      await landing.locator('[data-action="sound"]').click();
      await expect(landing.locator("#bt-sound-music")).toHaveValue("35");
      await landing.getByRole("button", { name: "Continue" }).click();

      const resumed = await context.newPage();
      await installSessionSocketHook(resumed);
      await resumed.goto(`/join?code=${restarted.joinCode}`);
      // The restart keeps the party (W4): Proving Grounds, hero-a still held on claim-heroes.
      // This page joins as a new iPad, so the first iPad's hold shows as taken.
      await expect(mainOf(resumed)).toHaveAttribute("data-screen", "claim-heroes");
      await expect(resumed.locator("[data-step-instruction]")).toHaveText("1 of 4 picked");
      await expect(resumed.locator('button[data-hunter="hero-a"]')).toHaveAttribute(
        "data-claim",
        "taken",
      );
      expect(tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);
    } finally {
      await restarted.close();
    }
  } finally {
    await context.close().catch(() => undefined);
    await session.host.close().catch(() => undefined);
  }
});
