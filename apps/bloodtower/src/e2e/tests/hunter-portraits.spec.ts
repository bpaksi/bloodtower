import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { startAcceptanceHost } from "./support/acceptance.ts";
import { copyToE2eArtifacts } from "./support/e2e-artifacts.ts";

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

// A valid 1x1 PNG. The asset route belongs to the pack server; this test stubs it so the img
// loads without depending on the pack's files.
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
  "base64",
);
const HUNTERS = [
  ["Agnes", "alpha", "A"],
  ["Tomas", "beta", "T"],
  ["Wren", "gamma", "W"],
  ["Emeric", "delta", "E"],
] as const;

for (const size of SIZES) {
  test(`Claim Hunters shows a portrait per hunter on the board and none on the iPad at ${size.name} ${size.width}x${size.height}`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(90_000);
    const { baseURL, host } = await startAcceptanceHost(testInfo);
    const padViewport = { width: size.width, height: size.height };
    const contexts: BrowserContext[] = [];
    const newPage = async (viewport: { width: number; height: number }, hasTouch: boolean) => {
      const context = await browser.newContext({ baseURL, viewport, hasTouch });
      contexts.push(context);
      await context.route("**/packs/test/asset/*", (route) =>
        route.fulfill({ status: 200, contentType: "image/png", body: PIXEL }),
      );
      return context.newPage();
    };
    try {
      const board = await newPage(BOARD_VIEWPORT, false);
      const pad = await newPage(padViewport, true);
      await board.goto("/board", { waitUntil: "domcontentloaded" });
      await expect(board.locator("main")).toHaveAttribute("data-screen", "pick-story");
      await pad.goto(`${baseURL}/join?code=${host.joinCode}`);
      await pad.locator('button[data-action="continue"]').click();
      await expect(pad.locator("main")).toHaveAttribute("data-screen", "game-settings");
      await pad.locator('button[data-action="continue"]').click();
      await expect(pad.locator("main")).toHaveAttribute("data-screen", "tower-connect");
      await pad.locator('button[data-action="play-without-tower"]').click();
      await expect(pad.locator("main")).toHaveAttribute("data-screen", "tower-volume-test");
      await pad.locator('button[data-action="continue"]').click();
      await expect(pad.locator("main")).toHaveAttribute("data-screen", "party-join");
      await expect(board.locator("main")).toHaveAttribute("data-screen", "party-join");

      if (size.name === "landscape") {
        await settleBoardInk(board);
        const boardShot = testInfo.outputPath("board-party-join.png");
        await board.screenshot({ path: boardShot, fullPage: false });
        copyToE2eArtifacts(testInfo, boardShot, "board-party-join.png");
        await pad.waitForTimeout(1500);
        const padShot = testInfo.outputPath("device-party-join.png");
        await pad.screenshot({ path: padShot, fullPage: true });
        copyToE2eArtifacts(testInfo, padShot, "device-party-join.png");
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

      // Portraits show on the board only (R3-UI-51): the iPad has text buttons and no image.
      await expect(pad.locator("[data-portrait-card]")).toHaveCount(0);
      await expect(pad.locator("img")).toHaveCount(0);
      for (const [name, id] of HUNTERS) {
        await expect(pad.locator(`button[data-hunter="${id}"]`)).toHaveText(`Claim ${name}`);
        await expect(pad.locator(`button[data-hunter="${id}"]`)).toBeInViewport();
      }
      await expect(board.locator("[data-portrait-card]")).toHaveCount(4);
      await expect(board.locator('[data-portrait-frame="image"]')).toHaveCount(4);
      for (const [name, id] of HUNTERS) {
        const img = board.locator(`[data-portrait-card="${name}"] img`);
        await expect(img, `${name} src`).toHaveAttribute("src", `/packs/test/asset/por.${id}`);
        // The frame is aria-hidden, so the image carries no alt; the name is read elsewhere.
        await expect(img, `${name} alt`).toHaveAttribute("alt", "");
        const cart = board.locator(`.bt-cart[data-hunter="${id}"]`);
        await expect(cart.locator(".bt-cart-nm"), name).toHaveText(name);
        await expect(cart).toBeInViewport();
      }
      for (const [page, where] of [
        [pad, "iPad"],
        [board, "board"],
      ] as const) {
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
      await expect(pad.locator('button[data-hunter="alpha"]')).toHaveText("Agnes: Mine");
      await expect(board.locator('.bt-cart[data-hunter="alpha"] .bt-cart-st')).not.toHaveText(
        "waiting",
      );
      // Take all and Continue stay reachable above the fold.
      await expect(pad.locator('button[data-action="take-all"]')).toBeInViewport();
    } finally {
      for (const context of contexts) await context.close().catch(() => undefined);
      await host.close();
    }
  });
}

test("Claim Hunters falls back to the initial on the board when a portrait fails to load", async ({
  browser,
}, testInfo) => {
  test.setTimeout(90_000);
  const { baseURL, host } = await startAcceptanceHost(testInfo);
  const contexts: BrowserContext[] = [];
  const newPage = async (viewport: { width: number; height: number }, hasTouch: boolean) => {
    const context = await browser.newContext({ baseURL, viewport, hasTouch });
    contexts.push(context);
    await context.route("**/packs/test/asset/*", (route) =>
      route.fulfill({ status: 404, body: "Not found." }),
    );
    return context.newPage();
  };
  try {
    const board = await newPage(BOARD_VIEWPORT, false);
    const pad = await newPage({ width: 1024, height: 768 }, true);
    await board.goto("/board", { waitUntil: "domcontentloaded" });
    await expect(board.locator("main")).toHaveAttribute("data-screen", "pick-story");
    await pad.goto(`${baseURL}/join?code=${host.joinCode}`);
    await pad.locator('button[data-action="continue"]').click();
    await expect(pad.locator("main")).toHaveAttribute("data-screen", "game-settings");
    await pad.locator('button[data-action="continue"]').click();
    await expect(pad.locator("main")).toHaveAttribute("data-screen", "tower-connect");
    await pad.locator('button[data-action="play-without-tower"]').click();
    await expect(pad.locator("main")).toHaveAttribute("data-screen", "tower-volume-test");
    await pad.locator('button[data-action="continue"]').click();
    await expect(pad.locator("main")).toHaveAttribute("data-screen", "party-join");
    await expect(board.locator("main")).toHaveAttribute("data-screen", "party-join");
    await expect(board.locator('[data-portrait-frame="placeholder"]')).toHaveCount(4);
    await expect(board.locator("[data-portrait-frame] img")).toHaveCount(0);
    for (const [name, , initial] of HUNTERS) {
      const card = board.locator(`[data-portrait-card="${name}"]`);
      await expect(card.locator("[data-portrait-frame]"), name).toHaveText(initial);
    }
    // The claim button keeps its label and action.
    await expect(pad.locator('button[data-hunter="alpha"]')).toHaveText("Claim Agnes");
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await host.close();
  }
});
