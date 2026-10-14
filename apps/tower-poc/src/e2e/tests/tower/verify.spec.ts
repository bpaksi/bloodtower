import { type Browser, expect, type Page, test } from "@playwright/test";

// M3 step 3.6, on the mock and on the iPad first: Verify mode on a control page records a result
// per capability in short chunks, shows it to every device, keeps it across a reload, and counts it
// on the Dashboard. A result recorded on the mock tower never counts as hardware-verified. Nothing
// here reaches the tower; it is in tests/tower because every test shares the service's database.

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

const panel = (page: Page) => page.getByRole("region", { name: "Verify on the tower" });
const row = (page: Page, id: string) =>
  panel(page).getByRole("listitem", { name: new RegExp(id.replaceAll(".", "\\.")) });

test("Verify mode records results in chunks and every device sees them", async ({
  browser,
  playwright,
}, testInfo) => {
  test.setTimeout(60_000);
  const { baseURL } = testInfo.project.use;
  const ipadBrowser: Browser = await playwright.webkit.launch();
  const ipad = await ipadBrowser.newContext({
    baseURL,
    viewport: VIEWPORTS.ipad,
    hasTouch: true,
  });
  const mac = await browser.newContext({ baseURL, viewport: VIEWPORTS.desktop });

  try {
    const page = await ipad.newPage();
    const other = await mac.newPage();
    const errors = { ipad: collectErrors(page), mac: collectErrors(other) };

    // Off by default: no checklist until the person turns Verify mode on.
    await page.goto("/lights");
    await expect(page.getByText("Mock tower:")).toBeVisible();
    const toggle = page.getByRole("button", { name: "Verify mode" });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(panel(page)).toHaveCount(0);
    await toggle.tap();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(panel(page).getByText("never count as hardware-verified")).toBeVisible();

    // One chunk per category; the page's only one is Lights, closed until opened.
    const lights = panel(page).locator("details");
    await expect(lights).toHaveCount(1);
    await expect(lights.locator("summary")).toHaveText(/Lights\s*0 of 5 recorded/);
    await lights.locator("summary").tap();
    const allOn = row(page, "lighting.all-on");
    await expect(allOn.getByText("No result recorded.")).toBeVisible();
    await expect(allOn.getByText("Mock-tested")).toBeVisible();

    // A fail needs notes: refused on the page, nothing sent.
    await allOn.getByLabel("Fail", { exact: true }).check();
    await allOn.getByRole("button", { name: "Record result" }).tap();
    await expect(allOn.getByRole("alert")).toHaveText(
      "Say what happened: a partial or a fail needs notes.",
    );
    await expect(lights.locator("summary")).toHaveText(/0 of 5 recorded/);

    // With notes it is saved, shown as the latest, and the form is cleared for the next one.
    await allOn.getByLabel("Notes").fill("The base lights stayed off.");
    await allOn.getByRole("button", { name: "Record result" }).tap();
    await expect(allOn.getByRole("status")).toHaveText("Saved (mock tower).");
    await expect(allOn.getByText(/Last recorded: Fail/)).toBeVisible();
    await expect(allOn.getByText("The base lights stayed off.")).toBeVisible();
    await expect(allOn.getByLabel("Notes")).toHaveValue("");
    await expect(lights.locator("summary")).toHaveText(/1 of 5 recorded/);
    // A result on the mock tower changes nothing about what is verified.
    await expect(allOn.getByText("Mock-tested")).toBeVisible();

    // Another device sees it, once it turns Verify mode on itself.
    await other.goto("/lights");
    await expect(panel(other)).toHaveCount(0);
    await other.getByRole("button", { name: "Verify mode" }).click();
    await panel(other).locator("summary").click();
    await expect(row(other, "lighting.all-on").getByText(/Last recorded: Fail/)).toBeVisible();

    // A pass from the other device replaces it as the latest on both.
    const allOff = row(other, "lighting.all-off");
    await allOff.getByLabel("Pass", { exact: true }).check();
    await allOff.getByRole("button", { name: "Record result" }).click();
    await expect(allOff.getByRole("status")).toHaveText("Saved (mock tower).");
    await expect(row(page, "lighting.all-off").getByText(/Last recorded: Pass/)).toBeVisible();
    await expect(lights.locator("summary")).toHaveText(/2 of 5 recorded/);

    // A reload keeps Verify mode on this device, and the service keeps the results. Settled first,
    // so the reload does not cut off the pages' link prefetches, which WebKit logs as errors.
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(panel(page).locator("summary")).toHaveText(/2 of 5 recorded/);

    // Every control page has its checklist; the Tower State page's comes in five chunks. Through
    // the nav, as a person would.
    const nav = page.getByRole("navigation", { name: "Pages" });
    await nav.getByRole("link", { name: "Tower State", exact: true }).tap();
    await expect(panel(page).locator("summary")).toHaveText([
      /Glyphs/,
      /Seals/,
      /Skulls/,
      /Battery/,
      /Tower state/,
    ]);
    await nav.getByRole("link", { name: "Sounds", exact: true }).tap();
    await expect(panel(page).locator("summary")).toHaveText([/Sounds\s*0 of 2 recorded/]);
    await nav.getByRole("link", { name: "Mechanics", exact: true }).tap();
    await expect(panel(page).locator("summary")).toHaveText([/Mechanics/]);

    // The Dashboard: its own checklist, and the capability summary counting both results.
    await nav.getByRole("link", { name: "Dashboard", exact: true }).tap();
    await expect(panel(page).locator("summary")).toHaveText([/Connection/, /Calibration/]);
    const summary = page.getByRole("region", { name: "Capabilities" });
    await expect(summary.getByText(/Verify pass: 2 of \d+ capabilities/)).toBeVisible();
    await expect(summary.getByText(/on the mock tower/)).toBeVisible();
    const hardwareVerified = summary
      .locator('dl[aria-label="By verification"] dt', { hasText: "Hardware-verified" })
      .locator("xpath=following-sibling::dd[1]");
    await expect(hardwareVerified).toHaveText("0");

    // Turned off, the checklist goes and the page is as it was.
    await nav.getByRole("link", { name: "Lights", exact: true }).tap();
    await toggle.tap();
    await expect(panel(page)).toHaveCount(0);
    await toggle.tap();
    await panel(page).locator("summary").tap();

    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(viewport);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${name}: page must not scroll sideways`).toBeLessThanOrEqual(0);
      await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
    }

    expect(errors).toEqual({ ipad: [], mac: [] });
  } finally {
    await ipad.close();
    await mac.close();
    await ipadBrowser.close();
  }
});
