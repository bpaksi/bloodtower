import { type BrowserContext, expect, test } from "@playwright/test";
import { startAcceptanceHost } from "./support/acceptance.ts";

// iPad sizes, both orientations. The three projects set the browser; the size comes from here.
const SIZES = [
  { name: "landscape", width: 1024, height: 768 },
  { name: "portrait", width: 768, height: 1024 },
] as const;

for (const size of SIZES) {
  test(`party join shows a portrait card per hunter at ${size.name} ${size.width}x${size.height}`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(90_000);
    const { baseURL, host } = await startAcceptanceHost(testInfo);
    const viewport = { width: size.width, height: size.height };
    const contexts: BrowserContext[] = [];
    const newPage = async () => {
      const context = await browser.newContext({ baseURL, viewport, hasTouch: true });
      contexts.push(context);
      return context.newPage();
    };
    try {
      const board = await newPage();
      const pad = await newPage();
      await board.goto("/board", { waitUntil: "domcontentloaded" });
      await expect(board.locator("main")).toHaveAttribute("data-screen", "tower-connect");
      await pad.goto(`${baseURL}/join?code=${host.joinCode}`);
      await pad.locator('button[data-action="play-without-tower"]').click();
      await pad.locator('button[data-action="continue"]').click();
      await expect(pad.locator("main")).toHaveAttribute("data-screen", "party-join");
      await expect(board.locator("main")).toHaveAttribute("data-screen", "party-join");

      for (const [page, where] of [
        [pad, "ipad"],
        [board, "board"],
      ] as const) {
        await page.screenshot({
          path: testInfo.outputPath(`${where}-${size.name}.png`),
          fullPage: true,
        });
      }

      for (const [page, where] of [
        [pad, "iPad"],
        [board, "board"],
      ] as const) {
        const cards = page.locator("[data-portrait-card]");
        await expect(cards, where).toHaveCount(4);
        await expect(page.locator('[data-portrait-frame="placeholder"]'), where).toHaveCount(4);
        for (const [name, initial] of [
          ["Alpha", "A"],
          ["Beta", "B"],
          ["Gamma", "G"],
          ["Delta", "D"],
        ] as const) {
          const card = page.locator(`[data-portrait-card="${name}"]`);
          await expect(card, `${where} ${name}`).toContainText(name);
          await expect(card.locator("[data-portrait-frame]")).toHaveText(initial);
          await expect(card).toBeInViewport();
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
      await expect(pad.locator('button[data-hunter="alpha"]')).toContainText("Alpha: Mine");
      await expect(board.locator('[data-portrait-card="Alpha"]')).not.toContainText("waiting");
      // Portrait frames fit above the fold with the Take all and Continue controls reachable.
      await expect(pad.locator('button[data-action="take-all"]')).toBeInViewport();
    } finally {
      for (const context of contexts) await context.close().catch(() => undefined);
      await host.close();
    }
  });
}
