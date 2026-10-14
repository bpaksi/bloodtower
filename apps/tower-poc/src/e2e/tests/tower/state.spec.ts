import { type Browser, expect, type Locator, type Page, test } from "@playwright/test";

// M3 step 3.5, on the mock and on the iPad first: the Tower State page shows every value with its
// origin, freshness and time. Seals and the skull count are the app's own record (spec D24): they
// change with no tower connected, last through a disconnect and a reload, and only a person clears
// them. Breaking a seal plays on the tower and asks first.

const ANSWERED = ["Queued", "Started", "Sent", "Confirmed"];
const RECORDED = ["Queued", "Started", "Confirmed"];

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

const region = (page: Page, name: string) => page.getByRole("region", { name, exact: true });
const seal = (page: Page, level: string, side: string) =>
  region(page, "Seals").locator(`[data-seal="${level}-${side}"]`);

/** Picks a seal in one of the seal forms and presses its button. */
const sealCommand = async (
  page: Page,
  control: string,
  button: string,
  side: string,
  level: string,
) => {
  const form = region(page, control);
  await form.getByLabel(/^Seal side/).selectOption(side);
  await form.getByLabel(/^Seal level/).selectOption(level);
  await form.getByRole("button", { name: button }).tap();
};

test("the Tower State page keeps the seal and skull record and shows every value's origin", async ({
  playwright,
}, testInfo) => {
  test.setTimeout(90_000);
  const { baseURL } = testInfo.project.use;
  const webkit: Browser = await playwright.webkit.launch();
  const context = await webkit.newContext({ baseURL, viewport: VIEWPORTS.ipad, hasTouch: true });

  try {
    const page = await context.newPage();
    const errors = collectErrors(page);
    await page.goto("/state");
    await expect(page.getByText("Mock tower:")).toBeVisible();

    // The record is never unknown, and it needs no tower. Start from a clean one: the database
    // lasts as long as the test server, and other tests may have marked seals.
    const clear = region(page, "Clear all broken seals");
    await clear.getByRole("button", { name: "Clear all" }).tap();
    const clearDialog = clear.getByRole("alertdialog", { name: "Confirm: Clear all broken seals" });
    await expect(clearDialog.getByRole("button", { name: "Cancel" })).toBeFocused();
    await clearDialog.getByRole("button", { name: "Confirm" }).tap();
    await expect(lifecycle(page, "Clear all broken seals")).toHaveText(RECORDED);
    await expect(region(page, "Seals").getByText("0 of 12 broken")).toBeVisible();
    await expect(region(page, "Seals").getByText(/^Kept by the app·Current·/)).toBeVisible();

    // Before the tower is connected no reading is current: each is unavailable, never zero, or
    // stale from an earlier connection (the other tower tests share this server).
    const notCurrent = /^(Unavailable until .*|.*·Stale·.*)$/;
    for (const name of ["Battery", "Drum positions", "Glyphs"]) {
      const meta = region(page, name).getByText(notCurrent);
      await expect(meta.first(), name).toBeVisible();
      await expect(region(page, name).getByText(/·Current·/), name).toHaveCount(0);
    }
    // Breaking a seal plays on the tower, so it waits for one.
    await expect(region(page, "Break a seal").getByText("Connect the tower first.")).toBeVisible();

    // Mark and restore with no tower: the grid follows the record.
    await sealCommand(page, "Mark a seal broken", "Mark broken", "east", "middle");
    await expect(lifecycle(page, "Mark a seal broken")).toHaveText(RECORDED);
    await expect(seal(page, "middle", "east")).toHaveText("Broken");
    await sealCommand(page, "Mark a seal broken", "Mark broken", "west", "top");
    await expect(seal(page, "top", "west")).toHaveText("Broken");
    await expect(region(page, "Seals").getByText("2 of 12 broken")).toBeVisible();
    await sealCommand(page, "Mark a seal restored", "Mark restored", "west", "top");
    await expect(seal(page, "top", "west")).toHaveText("Intact");

    // The skull count resets with no tower, after asking.
    const resetCount = region(page, "Reset skull count");
    await resetCount.getByRole("button", { name: "Reset count" }).tap();
    await resetCount.getByRole("alertdialog").getByRole("button", { name: "Confirm" }).tap();
    await expect(lifecycle(page, "Reset skull count")).toHaveText(RECORDED);
    await expect(region(page, "Skull count").getByText(/^Since /)).toBeVisible();
    await expect(region(page, "Skull count").getByText("0", { exact: true })).toBeVisible();

    // The record lasts through a reload: it is the service's, not the page's.
    await page.reload();
    await expect(seal(page, "middle", "east")).toHaveText("Broken");
    await page.screenshot({ path: testInfo.outputPath("ipad-disconnected.png"), fullPage: true });

    // Connect and calibrate through the Dashboard, as a person would.
    const nav = page.getByRole("navigation", { name: "Pages" });
    await nav.getByRole("link", { name: "Dashboard", exact: true }).tap();
    await page.getByRole("button", { name: "Connect", exact: true }).tap();
    await expect(towerConnection(page)).toHaveText("Connected");
    await page.getByRole("button", { name: "Calibrate" }).tap();
    await expect(field(page.getByRole("region", { name: "Tower" }), "Calibration")).toHaveText(
      "Calibrated",
      { timeout: 15_000 },
    );
    await nav.getByRole("link", { name: "Tower State", exact: true }).tap();

    // Library-derived drums and glyphs, and the battery from the tower with its history.
    const drums = region(page, "Drum positions");
    await expect(field(drums, "Top")).toHaveText("north");
    await expect(drums.getByText(/^Worked out by the library·Current·/)).toBeVisible();
    await expect(
      region(page, "Glyphs").getByText(/^Worked out by the library·Current·/),
    ).toBeVisible();
    const battery = region(page, "Battery");
    await expect(battery.getByText(/^\d+% \(\d\.\d\d V\)$/).first()).toBeVisible({
      timeout: 5_000,
    });
    await expect(battery.getByText(/^Reported by the tower·Current·/).first()).toBeVisible();
    await expect(battery.getByRole("img", { name: /^Battery from / })).toBeVisible();

    // Break a seal: it asks first, Cancel sends nothing, and Confirm plays it and records it.
    const breakSeal = region(page, "Break a seal");
    await sealCommand(page, "Break a seal", "Break seal", "north", "bottom");
    const breakDialog = breakSeal.getByRole("alertdialog", { name: "Confirm: Break a seal" });
    await expect(breakDialog).toContainText("Seal side north, Seal level bottom");
    await expect(breakDialog.getByRole("button", { name: "Cancel" })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath("ipad-confirm-break.png"), fullPage: true });
    await breakDialog.getByRole("button", { name: "Cancel" }).tap();
    await expect(breakDialog).toHaveCount(0);
    await expect(lifecycle(page, "Break a seal")).toHaveCount(0);
    await expect(seal(page, "bottom", "north")).toHaveText("Intact");
    await breakSeal.getByRole("button", { name: "Break seal" }).tap();
    await breakDialog.getByRole("button", { name: "Confirm" }).tap();
    await expect(lifecycle(page, "Break a seal")).toHaveText(ANSWERED, { timeout: 10_000 });
    await expect(seal(page, "bottom", "north")).toHaveText("Broken");

    // The tower's own counter: written, and the mock does not answer it (GAP-LIB-012).
    const towerCounter = region(page, "Reset the tower's skull counter");
    await towerCounter.getByRole("button", { name: "Reset tower counter" }).tap();
    await expect(lifecycle(page, "Reset the tower's skull counter").first()).toHaveText("Queued");

    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(viewport);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${name}: page must not scroll sideways`).toBeLessThanOrEqual(0);
      await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
    }
    await page.setViewportSize(VIEWPORTS.ipad);

    // A disconnect makes the readings stale and leaves the record as it was (spec D24).
    await nav.getByRole("link", { name: "Dashboard", exact: true }).tap();
    await page.getByRole("button", { name: "Disconnect" }).tap();
    await expect(towerConnection(page)).toHaveText("Not connected");
    await nav.getByRole("link", { name: "Tower State", exact: true }).tap();
    await expect(drums.getByText(/^Worked out by the library·Stale·/)).toBeVisible();
    await expect(seal(page, "bottom", "north")).toHaveText("Broken");
    await expect(seal(page, "middle", "east")).toHaveText("Broken");
    await expect(region(page, "Seals").getByText(/^Kept by the app·Current·/)).toBeVisible();

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
