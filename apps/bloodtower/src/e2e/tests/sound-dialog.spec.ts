import { type BrowserContext, expect, test } from "@playwright/test";
import { startAcceptanceHost } from "./support/acceptance.ts";

// R3-UI-03. The Mac board shows the Sound dialog after its first click or keypress, before Pick
// Game, and the levels survive a reload. Audio exists only on the Mac, so this runs on desktop.

test("the first board click opens the Sound dialog, and its levels survive a reload", async ({
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
    await board.goto("/board?debug=1", { waitUntil: "domcontentloaded" });
    await expect(board.locator("main.bt-board")).toBeVisible();
    await expect(board.locator("[data-sound-dialog]")).toHaveCount(0);

    await test.step("one click opens the Sound dialog before Pick Game", async () => {
      await board.locator("main.bt-board").click({ position: { x: 40, y: 300 } });
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
    });

    await test.step("after a reload the same levels are back", async () => {
      await board.reload({ waitUntil: "domcontentloaded" });
      await expect(board.locator("main.bt-board")).toBeVisible();
      await board.locator("main.bt-board").click({ position: { x: 40, y: 300 } });
      await expect(board.locator("[data-sound-dialog]")).toBeVisible();
      await expect(board.locator("#bt-sound-music")).toHaveValue("35");
    });
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await host.close();
  }
});
