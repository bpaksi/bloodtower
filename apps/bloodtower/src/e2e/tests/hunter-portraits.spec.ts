import { copyFileSync, mkdirSync } from "node:fs";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { startAcceptanceHost } from "./support/acceptance.ts";

const ARTIFACTS = "/opt/cursor/artifacts/screenshots";

// iPad sizes, both orientations. The three projects set the browser; the size comes from here.
const SIZES = [
  { name: "landscape", width: 1024, height: 768 },
  { name: "portrait", width: 768, height: 1024 },
] as const;

const BOARD_VIEWPORT = { width: 1280, height: 800 };

const settleBoardInk = async (page: Page) => {
  const frame = page.locator(".bt-ink-in").first();
  await frame.waitFor({ state: "visible" });
  await frame.evaluate((node) => {
    for (const animation of node.getAnimations()) animation.finish();
  });
  await page.waitForTimeout(1500);
};

for (const size of SIZES) {
  test(`party join shows a portrait card per hunter at ${size.name} ${size.width}x${size.height}`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(90_000);
    const { baseURL, host } = await startAcceptanceHost(testInfo);
    const padViewport = { width: size.width, height: size.height };
    const boardViewport = BOARD_VIEWPORT;
    const contexts: BrowserContext[] = [];
    const newPage = async (viewport: { width: number; height: number }, hasTouch: boolean) => {
      const context = await browser.newContext({ baseURL, viewport, hasTouch });
      contexts.push(context);
      return context.newPage();
    };
    if (size.name === "landscape") mkdirSync(ARTIFACTS, { recursive: true });
    try {
      const board = await newPage(boardViewport, false);
      const pad = await newPage(padViewport, true);
      await board.goto("/board", { waitUntil: "domcontentloaded" });
      await expect(board.locator("main")).toHaveAttribute("data-screen", "tower-connect");
      await pad.goto(`${baseURL}/join?code=${host.joinCode}`);
      await pad.locator('button[data-action="play-without-tower"]').click();
      await pad.locator('button[data-action="continue"]').click();
      await expect(pad.locator("main")).toHaveAttribute("data-screen", "party-join");
      await expect(board.locator("main")).toHaveAttribute("data-screen", "party-join");

      if (size.name === "landscape") {
        await settleBoardInk(board);
        const boardShot = testInfo.outputPath("board-party-join.png");
        await board.screenshot({ path: boardShot, fullPage: false });
        copyFileSync(boardShot, `${ARTIFACTS}/board-party-join.png`);
        await pad.waitForTimeout(1500);
        const padShot = testInfo.outputPath("device-party-join.png");
        await pad.screenshot({ path: padShot, fullPage: true });
        copyFileSync(padShot, `${ARTIFACTS}/device-party-join.png`);
      } else {
        for (const [page, where] of [
          [pad, "ipad"],
          [board, "board"],
        ] as const) {
          await page.screenshot({
            path: testInfo.outputPath(`${where}-${size.name}.png`),
            fullPage: true,
          });
        }
      }

      for (const [page, where] of [
        [pad, "iPad"],
        [board, "board"],
      ] as const) {
        const cards = page.locator("[data-portrait-card]");
        await expect(cards, where).toHaveCount(4);
        await expect(page.locator('[data-portrait-frame="placeholder"]'), where).toHaveCount(4);
        for (const [id, name, initial] of [
          ["alpha", "Agnes", "A"],
          ["beta", "Tomas", "T"],
          ["gamma", "Wren", "W"],
          ["delta", "Emeric", "E"],
        ] as const) {
          const card = page.locator(`[data-portrait-card="${name}"]`);
          if (where === "board") {
            const cart = page.locator(`.bt-cart[data-hunter="${id}"]`);
            await expect(cart.locator(".bt-cart-nm"), `${where} ${name}`).toHaveText(name);
            await expect(card.locator("[data-portrait-frame]")).toHaveText(initial);
            await expect(cart).toBeInViewport();
          } else {
            await expect(card, `${where} ${name}`).toContainText(name);
            await expect(card.locator("[data-portrait-frame]")).toHaveText(initial);
            await expect(card).toBeInViewport();
          }
        }
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${where} scrolls sideways`).toBeLessThanOrEqual(0);
      }

      // The claim buttons keep their action and still work with the card inside.
      await pad.locator('button[data-hunter="alpha"]').click();
      await expect(pad.locator('button[data-hunter="alpha"]')).toHaveAttribute(
        "data-action",
        "release",
      );
      await expect(pad.locator('button[data-hunter="alpha"]')).toContainText("Agnes: Mine");
      await expect(board.locator('.bt-cart[data-hunter="alpha"] .bt-cart-st')).not.toHaveText(
        "waiting",
      );
      // Portrait frames fit above the fold with the Take all and Continue controls reachable.
      await expect(pad.locator('button[data-action="take-all"]')).toBeInViewport();
      await expect(pad.locator('button[data-action="continue"]')).toBeVisible();
    } finally {
      for (const context of contexts) await context.close().catch(() => undefined);
      await host.close();
    }
  });
}
