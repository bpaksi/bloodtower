import { type Browser, expect, type Locator, type Page, test } from "@playwright/test";

// M3 step 3.3, on the mock and on the iPad first: the Sounds page lists the whole catalog, filters
// it by number, name and category, plays a sound with one command at a time, and plays one with a
// volume. The tower is connected and not calibrated, as sounds are available as soon as it is
// connected (D9).

const ANSWERED = ["Queued", "Started", "Sent", "Confirmed"];
// Spec §5 expects 113; kept here so the test states it.
const CATALOG_SIZE = 113;

const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  ipad: { width: 820, height: 1180 },
  desktop: { width: 1440, height: 900 },
} as const;

const collectErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
};

const field = (region: Locator, label: string) =>
  region.locator("dt", { hasText: label }).locator("xpath=following-sibling::dd[1]");

const lifecycle = (page: Page, name: string) =>
  page.getByRole("list", { name: `${name} lifecycle, from this device` }).getByRole("listitem");

const towerConnection = (page: Page) =>
  field(page.getByRole("region", { name: "Tower" }), "Connection");

test("the Sounds page filters the catalog and plays a sound, with and without a volume", async ({
  playwright,
}, testInfo) => {
  test.setTimeout(60_000);
  const { baseURL } = testInfo.project.use;
  const webkit: Browser = await playwright.webkit.launch();
  const context = await webkit.newContext({ baseURL, viewport: VIEWPORTS.ipad, hasTouch: true });

  try {
    const page = await context.newPage();
    const errors = collectErrors(page);

    // Before the tower is connected: the whole catalog, every play button disabled, and why.
    await page.goto("/sounds");
    await expect(page.getByText("Mock tower:")).toBeVisible();
    const catalog = page.getByRole("region", { name: "Sound catalog" });
    const sounds = catalog.getByRole("list", { name: "Sounds" }).getByRole("listitem");
    await expect(sounds).toHaveCount(CATALOG_SIZE);
    await expect(catalog.getByText(`${CATALOG_SIZE} sounds`)).toBeVisible();
    await expect(catalog.getByText("Connect the tower first.")).toBeVisible();
    await expect(catalog.getByRole("button", { name: "Play 1 Ashstrider" })).toBeDisabled();
    const withVolume = page.getByRole("region", { name: "Play with volume" });
    await expect(withVolume.getByText("Connect the tower first.")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("ipad-disconnected.png"), fullPage: true });

    // Filtering works without a tower: by number, by name, by category, and to nothing.
    const filter = catalog.getByLabel("Filter by number or name");
    await filter.fill("12");
    await expect(sounds).toHaveText([/^12\s*Letha\s*Ally/]);
    await filter.fill("tower seal");
    await expect(sounds).toHaveCount(1);
    await expect(catalog.getByText(`1 of ${CATALOG_SIZE} sounds`)).toBeVisible();
    await filter.fill("");
    await catalog.getByLabel("Category").selectOption("Seals");
    await expect(sounds).toHaveCount(4);
    await filter.fill("no such sound");
    await expect(catalog.getByText("No sound matches this filter.")).toBeVisible();
    await filter.fill("");
    await catalog.getByLabel("Category").selectOption("");
    await expect(sounds).toHaveCount(CATALOG_SIZE);

    await page.goto("/");
    await page.getByRole("button", { name: "Connect", exact: true }).tap();
    await expect(towerConnection(page)).toHaveText("Connected");
    await page.goto("/sounds");

    // Play one from the catalog: requested names the sound, the tower answers.
    await filter.fill("letha");
    const letha = catalog.getByRole("button", { name: "Play 12 Letha" });
    await expect(letha).toBeEnabled();
    await letha.tap();
    await expect(lifecycle(page, "Play a sound")).toHaveText(ANSWERED);
    await expect(field(catalog, "Requested")).toHaveText("12 Letha, from this device");
    await expect(field(catalog, "Outcome")).toHaveText("Confirmed");

    // Another, by number, from the end of the catalog.
    await filter.fill(String(CATALOG_SIZE));
    await catalog.getByRole("button", { name: /^Play 113 / }).tap();
    await expect(lifecycle(page, "Play a sound")).toHaveText(ANSWERED);
    await expect(field(catalog, "Requested")).toHaveText(
      "113 Tower Skull Dropped, from this device",
    );

    // With a volume. A number outside the catalog is refused on the page, with nothing sent.
    await withVolume.getByLabel(/^Sound index/).fill(String(CATALOG_SIZE + 1));
    await withVolume.getByRole("button", { name: "Play" }).tap();
    await expect(withVolume.getByText("Too big: expected number to be <=113")).toBeVisible();
    await expect(lifecycle(page, "Play with volume")).toHaveCount(0);
    await withVolume.getByLabel(/^Sound index/).fill("12");
    await withVolume.getByLabel(/^Volume/).fill("2");
    await withVolume.getByRole("button", { name: "Play" }).tap();
    await expect(lifecycle(page, "Play with volume")).toHaveText(ANSWERED);
    await expect(field(withVolume, "Requested")).toHaveText(
      "Sound index 12, Volume 2, from this device",
    );

    await filter.fill("");
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(viewport);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${name}: page must not scroll sideways`).toBeLessThanOrEqual(0);
      await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
    }

    expect(errors).toEqual([]);
  } finally {
    // Leave the tower as the other tower tests expect to find it, also when a step above failed.
    const page = await context.newPage();
    await page.goto("/");
    const disconnect = page.getByRole("button", { name: "Disconnect" });
    await expect(
      disconnect.or(page.getByRole("button", { name: "Connect", exact: true })).first(),
    ).toBeVisible();
    if (await disconnect.isEnabled()) {
      await disconnect.click();
      await expect(towerConnection(page)).toHaveText("Not connected");
    }
    await context.close();
    await webkit.close();
  }
});
