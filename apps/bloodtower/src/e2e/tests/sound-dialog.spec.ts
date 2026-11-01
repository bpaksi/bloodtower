import { type BrowserContext, expect, test } from "@playwright/test";
import { startAcceptanceHost } from "./support/acceptance.ts";
import { copyToE2eArtifacts } from "./support/e2e-artifacts.ts";

// R3-UI-03, retargeted onto `/` (W2). Sound is a control on the landing. Levels survive a reload.
// Desktop only. C2/02 runs this file (EV-06), so it is not in testIgnore.

test("Sound on the landing opens the dialog, and its levels survive a reload", async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The Sound dialog is the Mac board's.");
  test.setTimeout(90_000);
  const session = await startAcceptanceHost(testInfo);
  const { baseURL, host } = session;
  const contexts: BrowserContext[] = [];
  try {
    const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
    contexts.push(context);
    const board = await context.newPage();
    await board.goto("/", { waitUntil: "domcontentloaded" });
    await expect(board.locator('[data-screen="title"]')).toBeVisible();
    await expect(board.locator("[data-sound-dialog]")).toHaveCount(0);

    await test.step("Sound on the landing opens the dialog and stays on /", async () => {
      await board.locator('[data-action="sound"]').click();
      await expect(board).toHaveURL(/\/$/);
      const dialog = board.locator("[data-sound-dialog]");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("slider")).toHaveCount(3);
      await expect(dialog.getByRole("button", { name: "Test" })).toHaveCount(3);
      await expect(board.getByText("Pick Game")).toHaveCount(0);
    });

    await test.step("a slider change is saved on this Mac", async () => {
      await board.locator("#bt-sound-music").fill("35");
      await expect(board.locator("#bt-sound-music")).toHaveValue("35");
    });

    await test.step("Continue closes the dialog", async () => {
      await board.getByRole("button", { name: "Continue" }).click();
      await expect(board.locator("[data-sound-dialog]")).toHaveCount(0);
      await expect(board).toHaveURL(/\/$/);
    });

    await test.step("after a reload the same levels are back", async () => {
      await board.reload({ waitUntil: "domcontentloaded" });
      await expect(board.locator('[data-screen="title"]')).toBeVisible();
      await board.locator('[data-action="sound"]').click();
      await expect(board.locator("[data-sound-dialog]")).toBeVisible();
      await expect(board.locator("#bt-sound-music")).toHaveValue("35");
    });
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await host.close();
  }
});

// Visuals step 1: the dialog is a DialogFrame over the landing painting, fits every viewport, is
// keyboard-reachable with a visible candle ring, and does not ink in under reduced motion.
const openSound = async (
  browser: import("@playwright/test").Browser,
  baseURL: string,
  reducedMotion?: "reduce",
) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 900 },
    reducedMotion,
  });
  const board = await context.newPage();
  await board.goto("/", { waitUntil: "domcontentloaded" });
  await expect(board.locator('[data-screen="title"]')).toBeVisible();
  await board.locator('[data-action="sound"]').click();
  await expect(board.locator("[data-sound-dialog]")).toBeVisible();
  return { context, board };
};

test("the Sound dialog is a DialogFrame that fits 1024x594, 1180x820 and 1920x1080", async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The Sound dialog is the Mac board's.");
  test.setTimeout(90_000);
  const { baseURL, host } = await startAcceptanceHost(testInfo);
  const { context, board } = await openSound(browser, baseURL);
  try {
    // The start-up dialog under the scrim is a frame too; this is the Sound one.
    const frame = board.locator('[data-sound-dialog][data-illusionist-asset="dialog-frame"]');
    await expect(frame).toHaveCount(1);
    expect(
      await board
        .locator("[data-sound-dialog]")
        .evaluate((el) => el.closest('[data-illusionist-asset="dialog-frame"]') !== null),
    ).toBe(true);
    await expect(frame.locator("#bt-sound-music")).toBeVisible();
    for (const [width, height] of [
      [1024, 594],
      [1180, 820],
      [1920, 1080],
    ] as const) {
      await board.setViewportSize({ width, height });
      await frame.evaluate((el) => {
        for (const a of el.getAnimations()) a.finish();
      });
      await expect(frame).toBeInViewport({ ratio: 1 });
      await expect(board.getByRole("button", { name: "Continue" })).toBeInViewport({ ratio: 1 });
      const overflow = await board.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${width}x${height} scrolls sideways`).toBeLessThanOrEqual(0);
      const dest = testInfo.outputPath(`sound-${width}x${height}.png`);
      await board.screenshot({ path: dest });
      copyToE2eArtifacts(testInfo, dest, `sound-dialog-${width}x${height}.png`);
    }
  } finally {
    await context.close().catch(() => undefined);
    await host.close();
  }
});

test("a Sound slider is reachable by Tab, shows a candle ring and moves with the arrow keys", async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The Sound dialog is the Mac board's.");
  test.setTimeout(90_000);
  const { baseURL, host } = await startAcceptanceHost(testInfo);
  const { context, board } = await openSound(browser, baseURL);
  try {
    const music = board.locator("#bt-sound-music");
    for (let i = 0; i < 4; i += 1) {
      await board.keyboard.press("Tab");
      if (await music.evaluate((el) => el === document.activeElement)) break;
    }
    await expect(music).toBeFocused();
    const ring = await music.evaluate((el) => {
      const style = getComputedStyle(el);
      return { width: style.outlineWidth, style: style.outlineStyle, color: style.outlineColor };
    });
    expect(ring.style).toBe("solid");
    expect(Number.parseFloat(ring.width)).toBeGreaterThanOrEqual(3);
    expect(ring.color).toBe("rgb(245, 196, 81)");
    const before = Number(await music.inputValue());
    await board.keyboard.press("ArrowRight");
    await expect(music).toHaveValue(String(Math.min(100, before + 1)));
    await board.keyboard.press("ArrowLeft");
    await board.keyboard.press("ArrowLeft");
    await expect(music).toHaveValue(String(Math.max(0, before - 1)));
    await board.keyboard.press("Tab"); // music Test, then the ambient slider
    await board.keyboard.press("Tab");
    await board.keyboard.press("ArrowLeft");
    const ambient = Number(await board.locator("#bt-sound-ambient").inputValue());
    await board.reload({ waitUntil: "domcontentloaded" });
    await board.locator('[data-action="sound"]').click();
    await expect(board.locator("#bt-sound-ambient")).toHaveValue(String(ambient));
  } finally {
    await context.close().catch(() => undefined);
    await host.close();
  }
});

test("with reduced motion the Sound dialog does not ink in", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The Sound dialog is the Mac board's.");
  test.setTimeout(90_000);
  const { baseURL, host } = await startAcceptanceHost(testInfo);
  const { context, board } = await openSound(browser, baseURL, "reduce");
  try {
    const names = await board.locator("[data-sound-dialog]").evaluate((el) => ({
      css: getComputedStyle(el).animationName,
      running: el.getAnimations().map((a) => (a as CSSAnimation).animationName),
    }));
    expect(names.css).toBe("bt-fade-in");
    expect(names.running).not.toContain("bt-ink-in");
  } finally {
    await context.close().catch(() => undefined);
    await host.close();
  }
});
