import { expect, type Page, test } from "@playwright/test";

// The pages from spec §5. Kept here, not imported from the web part, so the test states the expectation.
const PAGES = [
  { path: "/", title: "Dashboard" },
  { path: "/lights", title: "Lights" },
  { path: "/sounds", title: "Sounds" },
  { path: "/mechanics", title: "Mechanics" },
  { path: "/state", title: "Tower State" },
  { path: "/diagnostics", title: "Diagnostics" },
  { path: "/gaps", title: "Feature Gaps" },
  { path: "/settings", title: "Settings" },
  { path: "/timing", title: "Timing" },
] as const;

const collectErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
};

for (const { path, title } of PAGES) {
  test(`${title} shell loads at ${path}`, async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Pages" });
    await expect(nav.getByRole("link")).toHaveCount(PAGES.length);
    await expect(nav.locator('[aria-current="page"]')).toHaveText(title);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "page must not scroll sideways").toBeLessThanOrEqual(0);

    await page.screenshot({ path: testInfo.outputPath(`${title}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}

test("the nav moves between every page without a full reload", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await page.evaluate(() => {
    (window as Window & { __sameDocument?: boolean }).__sameDocument = true;
  });

  const nav = page.getByRole("navigation", { name: "Pages" });
  for (const { path, title } of [...PAGES.slice(1), PAGES[0]]) {
    await nav.getByRole("link", { name: title, exact: true }).click();
    await expect(page).toHaveURL(path);
    await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
  }

  const sameDocument = await page.evaluate(
    () => (window as Window & { __sameDocument?: boolean }).__sameDocument === true,
  );
  expect(sameDocument, "navigation should be client-side").toBe(true);
  expect(errors).toEqual([]);
});

test("an unknown path gets the 404 page", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("banner")).toBeVisible();
});
