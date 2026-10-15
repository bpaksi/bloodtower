import { expect, type Page, test } from "@playwright/test";

const collectErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
};

test("the story board is display only and reports connection-only health", async ({
  page,
}, testInfo) => {
  const errors = collectErrors(page);
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);

  await expect(
    page.getByRole("heading", { level: 1, name: "Bloodtower", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Display only.")).toBeVisible();
  await expect(page.getByText("sends no effects")).toBeVisible();

  expect(await page.locator("button, input, textarea, select, a").count()).toBe(0);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "page must not scroll sideways").toBeLessThanOrEqual(0);

  const health = await page.request.get("/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({
    protocol: 1,
    tower: "connection-only",
    effects: "none",
  });

  await page.screenshot({ path: testInfo.outputPath("board.png"), fullPage: true });
  expect(errors).toEqual([]);
});
