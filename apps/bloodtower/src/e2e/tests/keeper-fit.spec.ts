import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { startAcceptanceHost } from "./support/acceptance.ts";
import { copyToE2eArtifacts } from "./support/e2e-artifacts.ts";

const SHOT_NAME = process.env.KEEPER_SHOT_NAME?.trim() || "keeper_moment_1024x594";

const device = (page: Page) => ({
  button: (action: string) => page.locator(`button[data-action="${action}"]`),
  hold: (hunter: string) => page.locator(`button[data-hunter="${hunter}"]`),
});

test("the Keeper portrait fits a 1024x594 story-board viewport", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one board screenshot at 1024x594");
  test.setTimeout(90_000);
  const session = await startAcceptanceHost(testInfo);
  const { baseURL, host } = session;
  const contexts: BrowserContext[] = [];
  const newPage = async (size: { width: number; height: number }, touch: boolean) => {
    const context = await browser.newContext({ baseURL, viewport: size, hasTouch: touch });
    contexts.push(context);
    return context.newPage();
  };
  try {
    const board = await newPage({ width: 1024, height: 594 }, false);
    const pad = await newPage({ width: 820, height: 1180 }, true);
    const d = device(pad);
    const joinPage = `${baseURL}/join?code=${host.joinCode}`;

    await board.goto("/board", { waitUntil: "domcontentloaded" });
    await expect(board.locator("main.bt-board")).toBeVisible();
    await expect(board.locator("main")).toHaveAttribute("data-screen", "pick-story");

    await pad.goto(joinPage);
    await expect(pad).toHaveURL(/\/device/);
    await expect(pad.locator("main")).toHaveAttribute("data-screen", "pick-story");
    await expect(d.button("continue")).toHaveText("Choose Proving ground");
    await d.button("continue").click();
    await expect(pad.locator("main")).toHaveAttribute("data-screen", "game-settings");
    await d.button("continue").click();
    await expect(pad.locator("main")).toHaveAttribute("data-screen", "tower-connect");
    await d.button("play-without-tower").click();
    await d.button("take-all").click();
    await d.button("continue").click();
    await d.button("begin").click();
    await expect(board.getByText("The proving ground is quiet.")).toBeVisible();
    await d.button("continue").click();
    await expect(board.getByText("Each hunter reads alone.")).toBeVisible();
    await d.button("continue").click();
    await expect(board.getByText("A bell marks the step.")).toBeVisible();
    await d.button("continue").click();
    await expect(
      board.getByText("A grey stair climbs into the dark. Someone has left the lamps unlit."),
    ).toBeVisible();
    await d.button("continue").click();
    await expect(board.getByText(/At the top, a door/)).toBeVisible();
    await d.button("continue").click();
    await expect(
      board.getByText("Light them if you can. The key is at the bottom. It always is."),
    ).toBeVisible();
    await expect(board.locator('[data-talking-avatar="keeper"]')).toBeVisible();
    await expect(board.getByRole("img", { name: "The Keeper" })).toBeVisible();

    const dest = testInfo.outputPath(`${testInfo.project.name}-${SHOT_NAME}.png`);
    await board.screenshot({ path: dest, fullPage: false });
    if (testInfo.project.name === "desktop") {
      copyToE2eArtifacts(testInfo, dest, `${SHOT_NAME}.png`);
    }

    const viewport = board.viewportSize();
    expect(viewport).toEqual({ width: 1024, height: 594 });
    const portrait = board.getByRole("img", { name: "The Keeper" });
    await expect(portrait).toBeInViewport({ ratio: 1 });
    const box = await portrait.boundingBox();
    expect(box).not.toBeNull();
    if (!box || !viewport) throw new Error("portrait box");
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await host.close();
  }
});
