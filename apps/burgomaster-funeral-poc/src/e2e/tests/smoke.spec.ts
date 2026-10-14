import { expect, type Page, test } from "@playwright/test";

const collectErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
};

test("the door shows Burgomaster's Funeral POC", async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);

  await expect(
    page.getByRole("heading", { level: 1, name: "Burgomaster's Funeral POC", exact: true }),
  ).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "page must not scroll sideways").toBeLessThanOrEqual(0);

  const health = await page.request.get("/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ protocol: 1, towerUsed: false });

  await page.screenshot({ path: testInfo.outputPath("door.png"), fullPage: true });
  expect(errors).toEqual([]);
});
