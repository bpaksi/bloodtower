import { expect, test } from "@playwright/test";
import { collectHydration, injectBrowserAttributes } from "./support/hydration.ts";

// #414: iOS Chrome adds __gchrome_* attributes to <html> and inputs before React hydrates.
// Any hydration warning or error on a player or host entry route fails here.
const ROUTES = ["/join", "/device", "/board", "/"];

for (const route of ROUTES) {
  test(`${route} hydrates without a warning`, async ({ page }) => {
    const found = collectHydration(page);
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    expect(found.messages).toEqual([]);
  });

  test(`${route} hydrates cleanly with browser-injected attributes`, async ({ page }) => {
    const found = collectHydration(page);
    await page.addInitScript(injectBrowserAttributes);
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    expect(found.messages).toEqual([]);
  });
}

test("the injected attributes really reach <html> and the join inputs", async ({ page }) => {
  const found = collectHydration(page);
  await page.addInitScript(injectBrowserAttributes);
  await page.goto("/join");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("html")).toHaveAttribute("__gchrome_remoteframetoken", "tok-1");
  await expect(page.locator("input[name=code]")).toHaveAttribute("__gchrome_uniqueid", "uid-1");
  expect(found.messages).toEqual([]);
});
