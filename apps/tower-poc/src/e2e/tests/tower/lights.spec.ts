import { type Browser, expect, type Locator, type Page, test } from "@playwright/test";

// M3 step 3.2, on the mock and on the iPad first: every control on the Lights page sends its
// command and shows what was requested apart from what the tower did. The tower is connected and
// not calibrated, as lights are available as soon as it is connected (D9).

const ANSWERED = ["Queued", "Started", "Sent", "Confirmed"];

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

test("every Lights control sends its command and shows requested vs outcome", async ({
  playwright,
}, testInfo) => {
  test.setTimeout(60_000);
  const { baseURL } = testInfo.project.use;
  const webkit: Browser = await playwright.webkit.launch();
  const context = await webkit.newContext({ baseURL, viewport: VIEWPORTS.ipad, hasTouch: true });

  try {
    const page = await context.newPage();
    const errors = collectErrors(page);

    // Before the tower is connected, every control says why it cannot be used.
    await page.goto("/lights");
    await expect(page.getByText("Mock tower:")).toBeVisible();
    for (const name of [
      "All lights on",
      "All lights off",
      "Set lights",
      "Light sequence",
      "Set one LED",
    ]) {
      const region = page.getByRole("region", { name });
      await expect(region.getByText("Connect the tower first.")).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Set lights" })).toBeDisabled();
    await page.screenshot({ path: testInfo.outputPath("ipad-disconnected.png"), fullPage: true });

    await page.goto("/");
    await page.getByRole("button", { name: "Connect", exact: true }).tap();
    await expect(towerConnection(page)).toHaveText("Connected");
    await page.goto("/lights");

    // All on, with an effect.
    const allOn = page.getByRole("region", { name: "All lights on" });
    await allOn.getByLabel(/^Effect/).selectOption("breathe");
    await allOn.getByRole("button", { name: "All lights on" }).tap();
    await expect(lifecycle(page, "All lights on")).toHaveText(ANSWERED);
    await expect(field(allOn, "Requested")).toHaveText("Effect breathe, from this device");

    // Set lights: nothing chosen is refused on the page and nothing is sent.
    const lights = page.getByRole("region", { name: "Set lights" });
    await lights.getByRole("button", { name: "Set lights" }).tap();
    await expect(lights.getByRole("alert")).toHaveText("Name at least one light.");
    await expect(lifecycle(page, "Set lights")).toHaveCount(0);

    // One light from each group.
    await lights.getByRole("combobox", { name: "Doorway top north" }).selectOption("on");
    await lights.getByRole("combobox", { name: "Ledge northeast" }).selectOption("flicker");
    await lights.getByRole("combobox", { name: "Base bottom west" }).selectOption("breatheFast");
    await expect(lights.getByText("3 lights chosen")).toBeVisible();
    await expect(lights.getByRole("alert")).toHaveCount(0);
    await lights.getByRole("button", { name: "Set lights" }).tap();
    await expect(lifecycle(page, "Set lights")).toHaveText(ANSWERED);
    await expect(field(lights, "Requested")).toHaveText(
      "Doorway top north on, Ledge northeast flicker, Base bottom west breatheFast, from this device",
    );
    await expect(field(lights, "Outcome")).toHaveText("Confirmed");

    // A rotation sequence needs a calibrated tower (D23): the service refuses it, sending nothing.
    const sequence = page.getByRole("region", { name: "Light sequence" });
    await sequence.getByLabel(/^Sequence/).selectOption("rotationDrumTop");
    await sequence.getByRole("button", { name: "Play sequence" }).tap();
    await expect(field(sequence, "Outcome")).toContainText("Rejected: This light sequence");
    // The held sequence is not offered at all (GAP-HW-007).
    await expect(sequence.getByRole("option", { name: "rotationDrumMiddle" })).toHaveCount(0);
    await sequence.getByLabel(/^Sequence/).selectOption("twinkle");
    await sequence.getByRole("button", { name: "Play sequence" }).tap();
    await expect(lifecycle(page, "Light sequence")).toHaveText(ANSWERED);
    await expect(field(sequence, "Requested")).toHaveText("Sequence twinkle, from this device");

    // One LED.
    const led = page.getByRole("region", { name: "Set one LED" });
    await led.getByLabel(/^Layer index/).fill("3");
    await led.getByLabel(/^Light index/).fill("2");
    await led.getByLabel(/^Effect/).selectOption("on");
    await led.getByRole("button", { name: "Set LED" }).tap();
    await expect(lifecycle(page, "Set one LED")).toHaveText(ANSWERED);
    await expect(field(led, "Requested")).toHaveText(
      "Layer index 3, Light index 2, Effect on, from this device",
    );

    // All off.
    const allOff = page.getByRole("region", { name: "All lights off" });
    await allOff.getByRole("button", { name: "All lights off" }).tap();
    await expect(lifecycle(page, "All lights off")).toHaveText(ANSWERED);

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
