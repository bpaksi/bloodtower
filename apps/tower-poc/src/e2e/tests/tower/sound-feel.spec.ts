import { readFile } from "node:fs/promises";
import { type Browser, expect, type Locator, type Page, test } from "@playwright/test";

// M6 step 6.2, on the mock and on the iPad first: Review feel on the Sounds page times a sound from
// the Play press and from the tower's answer, saves each pick as it is made, shows the picks to
// every device and after a reload, counts and filters the reviewed sounds, and exports them.

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

const towerConnection = (page: Page) =>
  field(page.getByRole("region", { name: "Tower" }), "Connection");

const catalog = (page: Page) => page.getByRole("region", { name: "Sound catalog" });
const feelOf = (page: Page, index: number) =>
  catalog(page).getByRole("group", { name: new RegExp(`^Feel of ${index} `) });

test("Review feel times a sound, saves each pick and exports them", async ({
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

    // Off by default: the catalog as before, with no review rows.
    await page.goto("/");
    await page.getByRole("button", { name: "Connect", exact: true }).tap();
    await expect(towerConnection(page)).toHaveText("Connected");
    await page.goto("/sounds");
    const toggle = page.getByRole("button", { name: "Review feel" });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(feelOf(page, 1)).toHaveCount(0);
    await toggle.tap();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(catalog(page).getByText(`0 of ${CATALOG_SIZE} with a feel`)).toBeVisible();

    // Stopped is off until this sound is played; nothing is measured yet.
    const one = feelOf(page, 1);
    const stopped = one.getByRole("button", { name: /^Stopped 1 / });
    await expect(stopped).toBeDisabled();
    await expect(field(one, "Length")).toHaveText("unavailable");
    await expect(field(one, "From answer")).toHaveText("unavailable");

    // Play, wait for the tower's answer, then Stopped: both lengths from the same play.
    await catalog(page)
      .getByRole("button", { name: /^Play 1 / })
      .tap();
    await expect(field(catalog(page), "Outcome")).toHaveText("Confirmed");
    await expect(stopped).toBeEnabled();
    await expect(feelOf(page, 2).getByRole("button", { name: /^Stopped 2 / })).toBeDisabled();
    await stopped.tap();
    await expect(one.getByRole("status")).toHaveText("Saved");
    await expect(field(one, "Length")).toHaveText(/^(\d+ ms|\d+\.\d s)$/);
    await expect(field(one, "From answer")).toHaveText(/^(\d+ ms|\d+\.\d s)$/);
    // One press per play.
    await expect(stopped).toBeDisabled();
    await expect(catalog(page).getByText(`1 of ${CATALOG_SIZE} with a feel`)).toBeVisible();

    // Each pick is saved as it is made; the note when the field is left.
    await one.getByLabel("Mood").selectOption("dread");
    await expect(one.getByRole("status")).toHaveText("Saved");
    await one.getByLabel("Reads as").selectOption("threat");
    await one.getByLabel("Strength").selectOption("strong");
    await one.getByLabel("Note").fill("  A low horn under the wind.  ");
    await one.getByLabel("Note").blur();
    await expect(one.getByRole("status")).toHaveText("Saved");
    await page.screenshot({ path: testInfo.outputPath("ipad-reviewed.png"), fullPage: false });

    // Another device sees the picks without a reload.
    await other.goto("/sounds");
    await other.getByRole("button", { name: "Review feel" }).click();
    const seen = feelOf(other, 1);
    await expect(seen.getByLabel("Mood")).toHaveValue("dread");
    await expect(seen.getByLabel("Reads as")).toHaveValue("threat");
    await expect(seen.getByLabel("Strength")).toHaveValue("strong");
    await expect(seen.getByLabel("Note")).toHaveValue("A low horn under the wind.");

    // A reload keeps Review feel on and shows what the service saved.
    await page.reload();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(one.getByLabel("Mood")).toHaveValue("dread");
    await expect(field(one, "Length")).toHaveText(/^(\d+ ms|\d+\.\d s)$/);

    // Clearing a pick saves no value for it.
    await seen.getByLabel("Strength").selectOption("");
    await expect(seen.getByRole("status")).toHaveText("Saved");
    await expect(one.getByLabel("Strength")).toHaveValue("");

    // Export downloads only the sounds with a feel, by card id.
    const downloading = other.waitForEvent("download");
    await catalog(other).getByRole("link", { name: "Export" }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe("sound-feel.json");
    const exported = JSON.parse(await readFile(await download.path(), "utf8"));
    expect(exported.version).toBe(1);
    expect(exported.sounds).toHaveLength(1);
    expect(exported.sounds[0]).toMatchObject({
      id: "SND-001",
      index: 1,
      mood: "dread",
      readsAs: "threat",
      note: "A low horn under the wind.",
    });
    expect(exported.sounds[0].strength).toBeUndefined();
    expect(exported.sounds[0].lengthMs).toBeGreaterThan(0);
    expect(exported.sounds[0].answerLengthMs).toBeGreaterThan(0);

    // A reload ends the timing; another play moves Stopped to that sound.
    const stoppedTwo = feelOf(page, 2).getByRole("button", { name: /^Stopped 2 / });
    await expect(stopped).toBeDisabled();
    await catalog(page)
      .getByRole("button", { name: /^Play 1 / })
      .tap();
    await expect(stopped).toBeEnabled();
    await expect(catalog(page).getByRole("button", { name: /^Play 2 / })).toBeEnabled();
    await catalog(page)
      .getByRole("button", { name: /^Play 2 / })
      .tap();
    await expect(stoppedTwo).toBeEnabled();
    await expect(stopped).toBeDisabled();
    await stoppedTwo.tap();
    await expect(feelOf(page, 2).getByRole("status")).toHaveText("Saved");
    await expect(catalog(page).getByText(`2 of ${CATALOG_SIZE} with a feel`)).toBeVisible();

    // Only not yet reviewed: sound 1 is left out, and sound 2, the one under review, stays
    // listed after its first pick, so Bob can make the others.
    const listed = catalog(page).getByRole("list", { name: "Sounds" }).getByRole("listitem");
    await catalog(page).getByLabel("Only sounds not yet reviewed").check();
    await expect(feelOf(page, 1)).toHaveCount(0);
    await expect(feelOf(page, 2)).toHaveCount(1);
    await expect(listed).toHaveCount(CATALOG_SIZE - 1);
    await catalog(page).getByLabel("Only sounds not yet reviewed").uncheck();
    await expect(listed).toHaveCount(CATALOG_SIZE);

    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(viewport);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${name}: page must not scroll sideways`).toBeLessThanOrEqual(0);
      await catalog(page).getByRole("button", { name: "Review feel" }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: false });
    }

    expect(errors).toEqual({ ipad: [], mac: [] });
  } finally {
    // Leave the tower as the other tower tests expect to find it, also when a step above failed.
    const page = await ipad.newPage();
    await page.goto("/");
    const disconnect = page.getByRole("button", { name: "Disconnect" });
    await expect(
      disconnect.or(page.getByRole("button", { name: "Connect", exact: true })).first(),
    ).toBeVisible();
    if (await disconnect.isEnabled()) {
      await disconnect.click();
      await expect(towerConnection(page)).toHaveText("Not connected");
    }
    await ipad.close();
    await mac.close();
    await ipadBrowser.close();
  }
});
