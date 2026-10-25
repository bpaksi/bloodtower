import { expect, test } from "@playwright/test";

// R3-UI-03: on a Mac (a fine pointer) a click or keypress on the landing screen opens the Story
// board. On an iPad (touch) the landing stays put, and the Hunter link goes to join.
test("a click on the landing screen opens the Story board on a Mac", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-banner]")).toBeVisible();
  const fine = await page.evaluate(() => window.matchMedia("(pointer: fine)").matches);
  test.skip(!fine, "The landing opens the board only where the pointer is fine.");

  await page.locator("[data-banner]").click({ position: { x: 8, y: 8 } });
  await expect(page).toHaveURL(/\/board$/);
  await expect(page.locator("main.bt-board")).toBeVisible();
});

test("the landing keeps Tab for moving between its links", async ({ page }) => {
  await page.goto("/");
  const fine = await page.evaluate(() => window.matchMedia("(pointer: fine)").matches);
  test.skip(!fine, "Keyboard focus on the landing matters where the pointer is fine.");

  await page.keyboard.press("Tab");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: /Story board/i })).toBeFocused();
});
