import { expect, type Page, test } from "@playwright/test";

const collectErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
};

test("one device holds all four, the opening plays, and a finding stays on that device", async ({
  page,
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The slice uses the one shared session.");
  test.setTimeout(120_000);

  const errors = collectErrors(page);
  await page.goto("/dashboard");
  const qr = page.getByTestId("join-qr");
  await expect(qr).toBeVisible();
  const qrResponse = await page.request.get("/join/qr.svg");
  expect(qrResponse.status()).toBe(200);
  const qrSvg = await qrResponse.text();
  expect(qrSvg.startsWith("<svg")).toBe(true);
  expect(qrSvg).not.toContain(".private.");
  await expect
    .poll(async () => qr.evaluate((img: HTMLImageElement) => img.clientWidth))
    .toBeGreaterThan(0);
  await expect(page.getByTestId("join-url")).toHaveText(/\/join\?code=\d{4,8}$/);
  await expect(page.getByTestId("join-code")).toHaveText(/^\d{6}$/);
  await expect(page.getByTestId("begin")).toBeDisabled();
  await expect(page.getByText("unavailable").first()).toBeVisible();

  const joinUrl = (await page.getByTestId("join-url").innerText()).trim();
  const device = await browser.newContext({
    viewport: { width: 820, height: 1180 },
    hasTouch: true,
  });
  const tablet = await device.newPage();
  const deviceErrors = collectErrors(tablet);
  try {
    await tablet.goto(joinUrl);
    await expect(tablet.getByTestId("take-all")).toBeEnabled();
    await tablet.getByTestId("take-all").click();
    await expect(page.getByTestId("begin")).toBeEnabled();
    await expect(page.getByTestId("unheld")).toHaveText("All four hunters are held.");

    await page.getByTestId("begin").click();
    await expect(page.getByTestId("ambient-bed")).toHaveAttribute("data-live", "true");
    const still = page.getByTestId("moment-still");
    await expect(still).toHaveAttribute("src", /n2-burgomasters-funeral\.01/);
    await expect
      .poll(async () => still.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);

    const caption = page.getByTestId("spoken-caption");
    await expect(caption).toContainText("Vellmoor buries its burgomaster", { timeout: 15_000 });
    const narratorReachable = (el: HTMLElement) => {
      const text = (el.textContent ?? "").trim();
      if (!text.includes("Vellmoor buries its burgomaster")) return false;
      const scroller = (node: HTMLElement | null): HTMLElement | null => {
        while (node) {
          const overflow = getComputedStyle(node).overflowY;
          if (overflow === "auto" || overflow === "scroll") return node;
          node = node.parentElement;
        }
        return null;
      };
      const boxClipped = (node: HTMLElement) => {
        let parent = node.parentElement;
        while (parent) {
          const overflow = getComputedStyle(parent).overflowY;
          if (overflow === "hidden" || overflow === "clip") {
            const box = node.getBoundingClientRect();
            const frame = parent.getBoundingClientRect();
            if (box.top < frame.top - 1 || box.bottom > frame.bottom + 1) return true;
          }
          parent = parent.parentElement;
        }
        return false;
      };
      const scroll = scroller(el);
      if (scroll) return !boxClipped(scroll);
      return !boxClipped(el);
    };
    for (const size of [
      { width: 1440, height: 900 },
      { width: 390, height: 500 },
      { width: 820, height: 400 },
    ]) {
      await page.setViewportSize(size);
      expect(await caption.evaluate(narratorReachable)).toBe(true);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByTestId("ambient-bed")).toHaveAttribute("data-reason", "speech");
    const voice = page.getByTestId("spoken-line");
    await expect(voice).toHaveAttribute("src", /01\.vo-01\.narrator\.wav/);
    await expect
      .poll(async () => voice.evaluate((audio: HTMLAudioElement) => audio.currentTime))
      .toBeGreaterThan(0);

    await tablet.goto("about:blank");
    await expect(
      page.getByText("Play is paused until every hunter has a connected device."),
    ).toBeVisible();
    await expect
      .poll(async () => voice.evaluate((audio: HTMLAudioElement) => audio.paused))
      .toBe(true);
    await expect
      .poll(async () =>
        page.getByTestId("moment-music").evaluate((audio: HTMLAudioElement) => audio.paused),
      )
      .toBe(true);
    await tablet.goto(joinUrl);
    await expect(
      page.getByText("Play is paused until every hunter has a connected device."),
    ).toHaveCount(0);
    await expect
      .poll(async () => voice.evaluate((audio: HTMLAudioElement) => audio.paused))
      .toBe(false);

    await expect(page.getByTestId("accent-pulse")).toHaveAttribute("data-live", "true", {
      timeout: 50_000,
    });

    await expect(caption).toContainText("The mourners keep their vigil", { timeout: 90_000 });
    await expect(page.getByTestId("cue-pulse")).toHaveAttribute("data-live", "true");
    const cueAudio = page.getByTestId("cue-audio");
    await expect(cueAudio).toHaveAttribute("src", /heartbeat-fallback\.wav/);
    await expect
      .poll(async () => cueAudio.evaluate((audio: HTMLAudioElement) => audio.currentTime))
      .toBeGreaterThan(0);

    await tablet.getByRole("button", { name: "Agnes", exact: true }).click();
    const pick = tablet.getByRole("button", { name: /Examine Dorka/ });
    await expect(pick).toBeEnabled({ timeout: 20_000 });
    await pick.click();
    await expect(tablet.getByTestId("finding-text")).toContainText("Two bites");
    const findingStill = tablet.getByTestId("finding-still");
    await expect(findingStill).toHaveAttribute("src", /private\.agnes/);
    await expect(tablet.getByTestId("finding-audio")).toHaveAttribute("src", /private\.agnes/);
    await expect
      .poll(async () => findingStill.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);

    await expect(page.getByText("Two bites")).toHaveCount(0);
    const leaked = await page.evaluate(() =>
      [...document.querySelectorAll("img, audio, source")].some((node) =>
        (node.getAttribute("src") ?? "").includes("private"),
      ),
    );
    expect(leaked).toBe(false);

    await tablet.getByRole("button", { name: "Tomas", exact: true }).click();
    await expect(tablet.getByTestId("finding")).toHaveCount(0);
    await expect(tablet.getByText("Two bites")).toHaveCount(0);

    expect(errors).toEqual([]);
    expect(deviceErrors).toEqual([]);
  } finally {
    await device.close();
  }
});
