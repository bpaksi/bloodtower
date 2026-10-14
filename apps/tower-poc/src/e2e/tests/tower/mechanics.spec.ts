import { type Browser, expect, type Locator, type Page, test } from "@playwright/test";

// M3 step 3.4, on the mock and on the iPad first: the Mechanics page calibrates, rotates every
// way the inventory offers, and asks before a random rotation. Nothing physical happens without a
// press, and every rotation is refused until the tower is calibrated (D9).

const ANSWERED = ["Queued", "Started", "Sent", "Confirmed"];

const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  ipad: { width: 820, height: 1180 },
  desktop: { width: 1440, height: 900 },
} as const;

const ROTATIONS = ["Rotate drums", "Rotate one drum", "Rotate drums at random"];

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

test("the Mechanics page calibrates, rotates, and confirms a random rotation first", async ({
  playwright,
}, testInfo) => {
  test.setTimeout(90_000);
  const { baseURL } = testInfo.project.use;
  const webkit: Browser = await playwright.webkit.launch();
  const context = await webkit.newContext({ baseURL, viewport: VIEWPORTS.ipad, hasTouch: true });

  try {
    const page = await context.newPage();
    const errors = collectErrors(page);

    // Before the tower is connected: every control says why it cannot be used.
    await page.goto("/mechanics");
    await expect(page.getByText("Mock tower:")).toBeVisible();
    const calibration = page.getByRole("region", { name: "Calibration" });
    await expect(calibration.getByRole("button", { name: "Calibrate" })).toBeDisabled();
    for (const name of ROTATIONS) {
      await expect(
        page.getByRole("region", { name, exact: true }).getByText("Connect the tower first."),
      ).toBeVisible();
    }
    // There is no stop control (spec §5).
    await expect(page.getByRole("button", { name: /stop/i })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("ipad-disconnected.png"), fullPage: true });

    // Through the nav, as a person would: a full navigation can cut off the pages' link
    // prefetches, which WebKit logs as errors.
    const nav = page.getByRole("navigation", { name: "Pages" });
    await nav.getByRole("link", { name: "Dashboard", exact: true }).tap();
    await page.getByRole("button", { name: "Connect", exact: true }).tap();
    await expect(towerConnection(page)).toHaveText("Connected");
    await nav.getByRole("link", { name: "Mechanics", exact: true }).tap();

    // Connected, not calibrated: every rotation waits for calibration (D9).
    for (const name of ROTATIONS) {
      await expect(
        page.getByRole("region", { name, exact: true }).getByText("Calibrate the tower first."),
      ).toBeVisible();
    }
    await calibration.getByRole("button", { name: "Calibrate" }).tap();
    await expect(field(calibration, "Calibration")).toHaveText("Calibrating");
    await expect(field(calibration, "Calibration")).toHaveText("Calibrated", { timeout: 15_000 });

    // Rotate all three drums, by side.
    const rotate = page.getByRole("region", { name: "Rotate drums", exact: true });
    await rotate.getByLabel(/^Top/).selectOption("east");
    await rotate.getByLabel(/^Middle/).selectOption("south");
    await rotate.getByLabel(/^Bottom/).selectOption("west");
    await rotate.getByRole("button", { name: "Rotate" }).tap();
    await expect(lifecycle(page, "Rotate drums")).toHaveText(ANSWERED, { timeout: 10_000 });
    await expect(field(rotate, "Requested")).toHaveText(
      "Top east, Middle south, Bottom west, from this device",
    );

    // One drum, chosen by name: the number is what is sent, the name is what is shown.
    const drum = page.getByRole("region", { name: "Rotate one drum", exact: true });
    await drum.getByLabel(/^Drum/).selectOption("bottom");
    await drum.getByLabel(/^Side/).selectOption("north");
    await drum.getByRole("button", { name: "Rotate drum" }).tap();
    await expect(lifecycle(page, "Rotate one drum")).toHaveText(ANSWERED, { timeout: 10_000 });
    await expect(field(drum, "Requested")).toHaveText("Drum bottom, Side north, from this device");

    // The same again: the drum is already there, so nothing is sent, and the page says so.
    await drum.getByRole("button", { name: "Rotate drum" }).tap();
    await expect(field(drum, "Outcome")).toHaveText(/^Not sent: The library sent nothing/);
    await expect(
      drum
        .getByRole("list", { name: "Rotate one drum lifecycle, from this device" })
        .getByRole("listitem"),
    ).toHaveText(["Queued", "Started", "Not sent"]);

    // Random rotate asks first. Cancel sends nothing.
    const random = page.getByRole("region", { name: "Rotate drums at random", exact: true });
    await random.getByLabel(/^Drums/).selectOption("all");
    await random.getByRole("button", { name: "Rotate at random" }).tap();
    const dialog = random.getByRole("alertdialog", { name: "Confirm: Rotate drums at random" });
    await expect(dialog).toContainText("cannot be stopped");
    await expect(dialog).toContainText("Drums all");
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath("ipad-confirm.png"), fullPage: true });
    await expect(random.getByRole("button", { name: "Rotate at random" })).toBeDisabled();
    await dialog.getByRole("button", { name: "Cancel" }).tap();
    await expect(dialog).toHaveCount(0);
    // Escape cancels too.
    await random.getByRole("button", { name: "Rotate at random" }).tap();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(lifecycle(page, "Rotate drums at random")).toHaveCount(0);

    // Confirm sends it. The sides are random: if every drum lands where it was, the tower may not
    // answer, and the command ends unanswered after 30 s instead of confirmed.
    await random.getByRole("button", { name: "Rotate at random" }).tap();
    await dialog.getByRole("button", { name: "Confirm" }).tap();
    await expect(dialog).toHaveCount(0);
    await expect(lifecycle(page, "Rotate drums at random").first()).toHaveText("Queued");
    await expect(field(random, "Requested")).toHaveText("Drums all, from this device");
    await expect(field(random, "Outcome")).toHaveText(/^(Confirmed|Sent, no answer)/, {
      timeout: 40_000,
    });

    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(viewport);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${name}: page must not scroll sideways`).toBeLessThanOrEqual(0);
      await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
    }

    // A confirmation left open is withdrawn when the tower drops, here from another device, so it
    // cannot be confirmed later against a tower someone else reconnected and calibrated.
    await random.getByRole("button", { name: "Rotate at random" }).tap();
    await expect(dialog).toBeVisible();
    const other = await context.newPage();
    await other.goto("/");
    await other.getByRole("button", { name: "Disconnect" }).click();
    await expect(towerConnection(other)).toHaveText("Not connected");
    await other.close();
    await expect(dialog).toHaveCount(0);
    await expect(random.getByText("Connect the tower first.")).toBeVisible();

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
