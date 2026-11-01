import { expect, type Page, test } from "@playwright/test";
import { startAcceptanceHost } from "./support/acceptance.ts";
import { settlePageAnimations } from "./support/animations.ts";
import { copyToE2eArtifacts } from "./support/e2e-artifacts.ts";

const collectErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
};

const titleViewports = [
  { name: "mac-1280x800", width: 1280, height: 800 },
  { name: "ipad-landscape-1024x768", width: 1024, height: 768 },
  { name: "ipad-portrait-768x1024", width: 768, height: 1024 },
  { name: "phone-390x844", width: 390, height: 844 },
] as const;

const assertTitleLayout = async (page: Page, viewport: { width: number; height: number }) => {
  await settlePageAnimations(page);
  const shell = page.locator(".bt-title-shell");
  const banner = page.locator("[data-banner]");
  const story = page.getByRole("link", { name: /Story board/i });
  const hunter = page.getByRole("link", { name: /Hunter/i });
  for (const locator of [banner, story, hunter]) {
    const box = await locator.boundingBox();
    expect(box, "title control must have a box").not.toBeNull();
    expect(box?.width ?? 0).toBeGreaterThan(280);
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(-1);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport.width + 1);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(viewport.height + 1);
  }
  const overflow = await shell.evaluate((node) => node.scrollWidth <= node.clientWidth);
  expect(overflow, "title shell must not clip horizontally").toBe(true);
  const pageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(pageOverflow, "page must not overflow horizontally").toBe(true);
};

test("the title page offers Story board and Hunter paths and health reports connection and sound only", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);

  await expect(page.locator("[data-banner]")).toBeVisible();
  await expect(page.getByRole("link", { name: /Story board/i })).toHaveAttribute("href", "/board");
  await expect(page.getByRole("link", { name: /Hunter/i })).toHaveAttribute("href", "/join");
  await expect(page.getByRole("img", { name: "The Keeper" })).toBeVisible();
  await expect(
    page.getByText(/Protocol \d|sends no effects|Tower connection is not open/i),
  ).toHaveCount(0);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "page must not scroll sideways").toBeLessThanOrEqual(0);

  const health = await page.request.get("/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({
    protocol: 2,
    tower: "connection-and-sound",
    effects: "sound-only",
  });

  for (const viewport of titleViewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    await expect(page.locator("[data-banner]")).toBeVisible();
    await expect(page.getByRole("link", { name: /Story board/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Hunter/i })).toBeVisible();
    await assertTitleLayout(page, viewport);
    const dest = testInfo.outputPath(`title-${viewport.name}.png`);
    await page.screenshot({ path: dest, fullPage: false });
    copyToE2eArtifacts(testInfo, dest, `title-${viewport.name}.png`);
  }

  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/join");
  await expect(page.getByRole("heading", { name: "Join" })).toBeVisible();
  await expect(page.getByLabel("Join code")).toBeVisible();
  await expect(page.getByText("Join code unavailable")).toHaveCount(0);
  await expect(page.getByText("Session host unavailable.")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("join-no-code-ipad.png"), fullPage: true });

  expect(errors).toEqual([]);
});

test("typing a join code on /join lands on /device", async ({ browser }, testInfo) => {
  test.setTimeout(60_000);
  const session = await startAcceptanceHost(testInfo);
  const context = await browser.newContext({ baseURL: session.baseURL });
  const page = await context.newPage();
  try {
    await page.goto("/join");
    await expect(page.getByLabel("Join code")).toBeVisible();
    await page.getByLabel("Join code").fill(session.host.joinCode);
    await page.getByRole("button", { name: "Enter the table" }).click();
    await expect(page).toHaveURL(/\/device/);
    await expect(page.locator("main")).toHaveAttribute("data-screen", "base-board");
  } finally {
    await context.close().catch(() => undefined);
    await session.host.close();
  }
});
