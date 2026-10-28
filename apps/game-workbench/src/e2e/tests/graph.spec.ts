import { expect, type Page, test } from "@playwright/test";

const collectErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
};

const centreId = (page: Page) => page.locator(".gcard.ring-0 .gcard-id");

test("the graph page draws a focus card in the middle of its stage", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page.locator(".stage")).toBeVisible();
  const focus = page.locator(".gcard.ring-0");
  await expect(focus).toHaveCount(1);
  await expect(focus).toBeVisible();
  const id = (await centreId(page).textContent()) ?? "";
  expect(id).not.toBe("");
  // The detail panel names the same card.
  await expect(page.locator(".detail h1")).toBeVisible();
  await expect(page.locator(".detail .chip").first()).toHaveText(id);
  expect(errors).toEqual([]);
});

test("clicking a neighbour moves it to the centre and sets ?focus=", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  const first = (await centreId(page).textContent()) ?? "";
  const neighbour = page.locator(".gcard.ring-1").first();
  await expect(neighbour).toBeVisible();
  const next = (await neighbour.locator(".gcard-id").textContent()) ?? "";
  expect(next).not.toBe(first);
  await neighbour.click();
  await expect(page).toHaveURL(new RegExp(`[?&]focus=${encodeURIComponent(next)}$`));
  await expect(centreId(page)).toHaveText(next);
  await expect(page.locator(".detail .chip").first()).toHaveText(next);
  expect(errors).toEqual([]);
});

test("?focus= opens that card, and an unknown one falls back to a card", async ({ page }) => {
  await page.goto("/");
  const start = (await centreId(page).textContent()) ?? "";
  const neighbour = page.locator(".gcard.ring-1").first();
  const target = (await neighbour.locator(".gcard-id").textContent()) ?? "";
  await page.goto(`/?focus=${encodeURIComponent(target)}`);
  await expect(centreId(page)).toHaveText(target);
  await page.goto("/?focus=NOT-A-CARD");
  await expect(centreId(page)).toHaveText(start);
});
