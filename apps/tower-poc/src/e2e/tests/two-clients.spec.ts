import { type Browser, expect, type Page, test } from "@playwright/test";

// The M2 exit condition, on the mock: a Mac and an iPad on the service at the same time. One
// connects and calibrates, the other plays the test sound, and both see the same lifecycle.

// The lifecycle of a sound the mock answers, as the dashboard labels it.
const PLAYED = ["Queued", "Started", "Sent", "Confirmed"];

const collectErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
};

const towerField = (page: Page, label: string) =>
  page
    .getByRole("region", { name: "Tower" })
    .locator("dt", { hasText: label })
    .locator("xpath=following-sibling::dd[1]");

const expectTower = async (page: Page, connection: string, calibration: string) => {
  await expect(towerField(page, "Connection")).toHaveText(connection);
  await expect(towerField(page, "Calibration")).toHaveText(calibration);
};

const lifecycle = (page: Page, sender: "this device" | "another device") =>
  page.getByRole("list", { name: `Test sound lifecycle, from ${sender}` }).getByRole("listitem");

test("two devices share one tower: connect, calibrate, play, disconnect", async ({
  browser,
  playwright,
}, testInfo) => {
  // Every project shares the one mock tower behind the server, so this runs once, not per
  // viewport. It opens both devices itself.
  test.skip(testInfo.project.name !== "desktop", "one shared mock tower; runs in one project");
  // Connect, 3 s of mock calibration, a sound, and two browsers starting.
  test.setTimeout(60_000);

  // Contexts opened here do not inherit the project's options, so they take the base URL too.
  const { baseURL } = testInfo.project.use;
  const ipadBrowser: Browser = await playwright.webkit.launch();
  const mac = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
  const ipad = await ipadBrowser.newContext({
    baseURL,
    viewport: { width: 820, height: 1180 },
    hasTouch: true,
  });

  try {
    const a = await mac.newPage();
    const b = await ipad.newPage();
    const errors = { mac: collectErrors(a), ipad: collectErrors(b) };

    await Promise.all([a.goto("/"), b.goto("/")]);
    for (const page of [a, b]) {
      await expect(page.getByText("Mock tower:")).toBeVisible();
      await expectTower(page, "Not connected", "Not calibrated");
    }

    // Connect from the Mac; the iPad sees it without doing anything.
    await a.getByRole("button", { name: "Connect", exact: true }).click();
    for (const page of [a, b]) {
      await expectTower(page, "Connected", "Not calibrated");
      await expect(page.getByRole("button", { name: "Disconnect" })).toBeEnabled();
    }

    // Calibrate from the Mac; both see it start and end, and neither can play meanwhile (D22).
    await a.getByRole("button", { name: "Calibrate" }).click();
    for (const page of [a, b]) {
      await expect(towerField(page, "Calibration")).toHaveText("Calibrating");
      await expect(page.getByRole("button", { name: "Play test sound" })).toBeDisabled();
    }
    // The mock calibrates for 3 s, too close to the default 5 s wait on a slow machine.
    for (const page of [a, b]) {
      await expect(towerField(page, "Calibration")).toHaveText("Calibrated", { timeout: 15_000 });
      await expect(towerField(page, "Connection")).toHaveText("Connected");
    }

    // Play from the iPad; both see every stage, each naming the right sender.
    await b.getByRole("button", { name: "Play test sound" }).tap();
    await expect(lifecycle(b, "this device")).toHaveText(PLAYED);
    await expect(lifecycle(a, "another device")).toHaveText(PLAYED);

    await a.screenshot({ path: testInfo.outputPath("mac.png"), fullPage: true });
    await b.screenshot({ path: testInfo.outputPath("ipad.png"), fullPage: true });

    // Disconnect from the iPad, leaving the tower as the other tests expect to find it.
    await b.getByRole("button", { name: "Disconnect" }).tap();
    for (const page of [a, b]) {
      await expect(towerField(page, "Connection")).toHaveText("Not connected");
      await expect(page.getByRole("button", { name: "Connect", exact: true })).toBeEnabled();
    }

    expect(errors).toEqual({ mac: [], ipad: [] });
  } finally {
    await mac.close();
    await ipad.close();
    await ipadBrowser.close();
  }
});
