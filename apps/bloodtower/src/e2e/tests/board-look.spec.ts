import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { startAcceptanceHost, waitForBoardAnimationsSettled } from "./support/acceptance.ts";
import { copyToE2eArtifacts } from "./support/e2e-artifacts.ts";

const device = (page: Page) => ({
  button: (action: string) => page.locator(`button[data-action="${action}"]`),
  hold: (hunter: string) => page.locator(`button[data-hunter="${hunter}"]`),
});

/** Portrait, caption, and all four cartouches sit fully in the viewport; the document does not scroll. */
const assertBoardFits = async (page: Page, opts?: { keeper?: boolean }) => {
  const carts = page.locator(".bt-cart");
  await expect(carts).toHaveCount(4);
  for (let i = 0; i < 4; i += 1) {
    await expect(carts.nth(i)).toBeInViewport({ ratio: 1 });
  }
  if (opts?.keeper) {
    const portrait = page.getByRole("img", { name: "The Keeper" });
    const caption = page.locator("[data-board-caption]");
    await expect(portrait).toBeVisible();
    await expect(caption).toBeVisible();
    await expect(caption).toContainText("The Keeper:");
    await expect(portrait).toBeInViewport({ ratio: 1 });
    await expect(caption).toBeInViewport({ ratio: 1 });
  }
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  }));
  expect(overflow.y, "board must not scroll vertically").toBeLessThanOrEqual(0);
  expect(overflow.x, "board must not scroll sideways").toBeLessThanOrEqual(0);
};

test("story board look at proving ground, grey-stair, and the Keeper", async ({
  browser,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "iPad-landscape board shots are captured on Chromium.");
  test.setTimeout(90_000);
  const session = await startAcceptanceHost(testInfo);
  const { baseURL, host } = session;
  const contexts: BrowserContext[] = [];
  const shot = async (page: Page, name: string) => {
    await waitForBoardAnimationsSettled(page);
    const dest = testInfo.outputPath(`${name}.png`);
    await page.screenshot({ path: dest, fullPage: false });
    copyToE2eArtifacts(testInfo, dest, `${name}.png`);
  };

  try {
    const boardContext = await browser.newContext({
      baseURL,
      viewport: { width: 1180, height: 820 },
      hasTouch: false,
    });
    contexts.push(boardContext);
    const board = await boardContext.newPage();
    const padContext = await browser.newContext({
      baseURL,
      viewport: { width: 1180, height: 820 },
      hasTouch: true,
    });
    contexts.push(padContext);
    const pad = await padContext.newPage();
    const d = device(pad);

    await board.goto("/board", { waitUntil: "domcontentloaded" });
    await expect(board.locator("main")).toHaveAttribute("data-screen", "tower-connect");
    await pad.goto(`${baseURL}/join?code=${host.joinCode}`);
    await expect(pad.locator("main")).toHaveAttribute("data-screen", "tower-connect");
    await d.button("play-without-tower").click();
    await d.button("continue").click();
    await expect(pad.locator("main")).toHaveAttribute("data-screen", "game-settings");
    await d.button("continue").click();
    await d.button("take-all").click();
    await d.button("continue").click();
    await d.button("begin").click();

    await expect(board.getByText("The proving ground is quiet.")).toBeVisible();
    await expect(board.locator(".bt-board-title h1")).toContainText("The Hall");
    await expect(board.locator(".bt-board-title h1 small")).toHaveText("The Proving Ground");
    await expect(board.locator("[data-status-strip]")).toHaveCount(0);
    await expect(board.getByText(/Fallback/)).toHaveCount(0);
    const cartNames = board.locator(".bt-cart-nm");
    const cartStatus = board.locator(".bt-cart-st");
    await expect(cartStatus).toHaveCount(4);
    for (let i = 0; i < 4; i += 1) {
      const name = await cartNames.nth(i).innerText();
      const status = await cartStatus.nth(i).innerText();
      expect(status, "cartouche status is the holder id, not the hunter name").not.toContain(name);
      expect(status).not.toMatch(/—/);
      expect(status.length).toBeGreaterThan(0);
    }
    await expect(board.locator(".bt-banner")).toContainText("iPads can't reach this address");
    await assertBoardFits(board);
    await shot(board, "board-proving-ground-landscape");

    await board.setViewportSize({ width: 1024, height: 594 });
    await expect(board.locator(".bt-banner")).toContainText("iPads can't reach this address");
    await expect(board.getByText("Emeric")).toBeVisible();
    await assertBoardFits(board);
    await shot(board, "board-join-warning-1024x594");
    await board.setViewportSize({ width: 1180, height: 820 });

    await d.button("continue").click();
    await expect(board.getByText("Each hunter reads alone.")).toBeVisible();
    await d.button("continue").click();
    await expect(board.getByText("A bell marks the step.")).toBeVisible();
    await d.button("continue").click();
    await expect(board.getByText(/A grey stair climbs into the dark/)).toBeVisible();
    await expect(board.locator(".bt-board-title h1")).toContainText("A Grey Stair");
    await expect(board.locator(".bt-board-title h1 small")).toHaveText("The Grey Stair");
    await assertBoardFits(board);
    await shot(board, "board-grey-stair-landscape");

    await d.button("continue").click();
    await expect(board.getByText(/At the top, a door/)).toBeVisible();
    await d.button("continue").click();
    await expect(board.locator('[data-talking-avatar="keeper"]')).toBeVisible();
    const keeperCaption = board.locator("[data-board-caption]");
    await expect(keeperCaption).toBeVisible();
    await expect(keeperCaption).toHaveAttribute("data-keeper-line", "ts-keeper-001");
    await expect(keeperCaption).toHaveText(
      "The Keeper: Light them if you can. The key is at the bottom. It always is.",
    );
    await expect(board.locator(".bt-board-title h1")).toContainText("The Keeper");
    await expect(board.locator(".bt-board-title h1 small")).toHaveText("The Grey Stair");
    await board.evaluate(() => {
      const audio = document.querySelector<HTMLAudioElement>("[data-keeper-plate] audio");
      if (!audio) throw new Error("Keeper audio element missing");
      audio.pause();
      audio.currentTime = 0;
      audio.dispatchEvent(new Event("timeupdate", { bubbles: true }));
    });
    await expect(keeperCaption).toHaveText(
      "The Keeper: Light them if you can. The key is at the bottom. It always is.",
    );
    await board.evaluate(() => {
      for (const audio of document.querySelectorAll("audio")) audio.pause();
    });
    await assertBoardFits(board, { keeper: true });
    await shot(board, "board-keeper-moment-landscape");
    await board.setViewportSize({ width: 1024, height: 594 });
    await expect(board.locator("main")).toHaveAttribute("data-moment", "grey-stair.03");
    await assertBoardFits(board, { keeper: true });
    await shot(board, "board-keeper-1024x594");
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await host.close();
  }
});
