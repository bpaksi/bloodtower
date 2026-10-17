import { expect, type Page, test } from "@playwright/test";

const collectErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
};

const titleViewports = [
  { name: "mac-1280x800", width: 1280, height: 800 },
  { name: "ipad-landscape-1024x768", width: 1024, height: 768 },
  { name: "ipad-portrait-768x1024", width: 768, height: 1024 },
] as const;

test("the title page offers Story board and Hunter paths and health stays connection-only", async ({
  page,
}, testInfo) => {
  const errors = collectErrors(page);
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { level: 1, name: "Blood Tower" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Story board/i })).toHaveAttribute("href", "/board");
  await expect(page.getByRole("link", { name: /Hunter/i })).toHaveAttribute("href", "/join");
  await expect(page.getByRole("img", { name: "The Keeper" })).toBeVisible();
  await expect(
    page.getByText(/Protocol \d|sends no effects|Tower connection is not open/i),
  ).toHaveCount(0);

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

  for (const viewport of titleViewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Blood Tower" })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`title-${viewport.name}.png`),
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/join");
  await expect(page.getByRole("heading", { name: "Join" })).toBeVisible();
  await expect(page.getByLabel("Join code")).toBeVisible();
  await expect(page.getByText("Join code unavailable")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("join-no-code-ipad.png"), fullPage: true });

  expect(errors).toEqual([]);
});
