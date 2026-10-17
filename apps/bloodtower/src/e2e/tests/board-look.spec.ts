import { copyFileSync, mkdirSync } from "node:fs";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { startAcceptanceHost } from "./support/acceptance.ts";

const ARTIFACTS = "/opt/cursor/artifacts/screenshots";

const device = (page: Page) => ({
  button: (action: string) => page.locator(`button[data-action="${action}"]`),
  hold: (hunter: string) => page.locator(`button[data-hunter="${hunter}"]`),
});

/** Portrait and caption sit fully in the viewport; the document does not scroll. */
const assertKeeperFits = async (page: Page) => {
  const portrait = page.getByRole("img", { name: "The Keeper" });
  const caption = page.locator('[data-talking-avatar="keeper"] figcaption');
  await expect(portrait).toBeVisible();
  await expect(caption).toBeVisible();
  await expect(portrait).toBeInViewport({ ratio: 1 });
  await expect(caption).toBeInViewport({ ratio: 1 });
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
  mkdirSync(ARTIFACTS, { recursive: true });
  const shot = async (page: Page, name: string) => {
    await page.locator(".bt-ink-in").first().waitFor({ state: "visible" });
    await page
      .locator(".bt-ink-in")
      .first()
      .evaluate((node) => {
        for (const animation of node.getAnimations()) animation.finish();
      });
    const dest = testInfo.outputPath(`${name}.png`);
    await page.screenshot({ path: dest, fullPage: false });
    copyFileSync(dest, `${ARTIFACTS}/${name}.png`);
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
    await d.button("take-all").click();
    await d.button("continue").click();
    await d.button("begin").click();

    await expect(board.getByText("The proving ground is quiet.")).toBeVisible();
    await shot(board, "board-proving-ground-landscape");

    await d.button("continue").click();
    await expect(board.getByText("Each hunter reads alone.")).toBeVisible();
    await d.button("continue").click();
    await expect(board.getByText("A bell marks the step.")).toBeVisible();
    await d.button("continue").click();
    await expect(board.getByText(/A grey stair climbs into the dark/)).toBeVisible();
    await shot(board, "board-grey-stair-landscape");

    await d.button("continue").click();
    await expect(board.getByText(/At the top, a door/)).toBeVisible();
    await d.button("continue").click();
    await expect(
      board.getByText("Light them if you can. The key is at the bottom. It always is."),
    ).toBeVisible();
    await expect(board.locator('[data-talking-avatar="keeper"]')).toBeVisible();
    await assertKeeperFits(board);
    await shot(board, "board-keeper-moment-landscape");

    await board.setViewportSize({ width: 1024, height: 594 });
    await expect(board.locator("main")).toHaveAttribute("data-moment", "grey-stair.03");
    await assertKeeperFits(board);
    await shot(board, "board-keeper-1024x594");
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await host.close();
  }
});
