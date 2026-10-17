import { copyFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { captureFrames, startAcceptanceHost } from "./support/acceptance.ts";

// SCREENSHOT_DIR for cloud/walkthrough copies; otherwise a gitignored repo path
// (covered by root `test-results/`). `/opt/cursor/artifacts/screenshots` is not writable on a Mac.
const screenshotDir = process.env.SCREENSHOT_DIR?.trim();
const ARTIFACTS = screenshotDir
  ? resolve(screenshotDir)
  : join(import.meta.dirname, "../../../test-results/screenshots");

const device = (page: Page) => ({
  button: (action: string) => page.locator(`button[data-action="${action}"]`),
  hold: (hunter: string) => page.locator(`button[data-hunter="${hunter}"]`),
});

const boardStates = (frames: readonly string[]) =>
  frames
    .map((frame) => JSON.parse(frame) as { type: string; payload: Record<string, unknown> })
    .filter((message) => message.type === "storyboardState")
    .map((message) => message.payload);

test("opening screens walk splash to play", async ({ browser }, testInfo) => {
  test.setTimeout(90_000);
  const session = await startAcceptanceHost(testInfo);
  const { baseURL, host } = session;
  const viewport = testInfo.project.use.viewport ?? { width: 820, height: 1180 };
  const hasTouch = testInfo.project.use.hasTouch ?? false;
  const contexts: BrowserContext[] = [];
  const newPage = async (size = viewport, touch = hasTouch) => {
    const context = await browser.newContext({ baseURL, viewport: size, hasTouch: touch });
    contexts.push(context);
    return context.newPage();
  };
  mkdirSync(ARTIFACTS, { recursive: true });
  const shot = async (page: Page, name: string) => {
    const dest = testInfo.outputPath(`${testInfo.project.name}-${name}.png`);
    await page.screenshot({ path: dest, fullPage: true });
    const keepBoard = name.startsWith("board-") && testInfo.project.name === "desktop";
    const keepDevice = name.startsWith("device-") && testInfo.project.name === "ipad";
    if (keepBoard || keepDevice) copyFileSync(dest, `${ARTIFACTS}/${name}.png`);
  };

  try {
    const board = await newPage({ width: 1440, height: 900 }, false);
    const boardFrames = captureFrames(board);
    const pad = await newPage();
    const d = device(pad);
    const joinPage = `${baseURL}/join?code=${host.joinCode}`;

    await test.step("splash, then tower-connect on the board", async () => {
      await board.goto("/board?debug=1", { waitUntil: "domcontentloaded" });
      await expect(board.locator("main.bt-board")).toBeVisible();
      // First paint is the waiting splash. The host then publishes tower-connect.
      if ((await board.locator('[data-screen="splash"]').count()) > 0) {
        await shot(board, "board-splash");
      }
      await expect(board.locator("main")).toHaveAttribute("data-screen", "tower-connect");
      await expect(board.getByText("Tower Connect")).toBeVisible();
      await expect(board.locator("[data-status-strip]")).toBeVisible();
      await expect(board.locator("[data-status='tower']")).toContainText("no tower");
      await expect(board.locator("[data-status='step']")).toContainText("Tower Connect");
      await expect(board.getByRole("img", { name: "Join code" })).toBeVisible();
      await expect(board.locator("button, input, textarea, select, a, [onclick]")).toHaveCount(0);
      await shot(board, "board-tower-connect");
    });

    await test.step("iPad joins and walks each pre-play screen", async () => {
      await pad.goto("/join");
      await expect(pad.getByRole("heading", { name: "Join" })).toBeVisible();
      const joinBody = await pad.locator("body").innerText();
      expect(joinBody).not.toMatch(/Device token/);
      expect(joinBody).not.toMatch(/Open controls/);
      await shot(pad, "device-join");

      await pad.goto(joinPage);
      await expect(pad).toHaveURL(/\/device/);
      expect(await pad.locator("body").innerText()).not.toMatch(/Device token/);
      await expect(pad.locator("main")).toHaveAttribute("data-screen", "tower-connect");
      await expect(pad.getByRole("heading", { name: "Tower Connect" })).toBeVisible();
      await expect(d.button("play-without-tower")).toBeVisible();
      await expect(d.button("continue")).toBeHidden();
      await expect(pad.locator('[data-primary="true"]')).toHaveCount(1);
      await expect(pad.locator('[data-primary="true"]')).toHaveText("Connect tower");
      await shot(pad, "device-tower-connect");
      await shot(board, "board-tower-connect-joined");

      await d.button("play-without-tower").click();
      await expect(pad.locator("main")).toHaveAttribute("data-screen", "pick-story");
      await expect(pad.getByRole("heading", { name: "Pick Story" })).toBeVisible();
      await expect(pad.getByRole("heading", { name: "Proving ground", exact: true })).toBeVisible();
      await expect(
        board.getByRole("heading", { name: "Proving ground", exact: true }),
      ).toBeVisible();
      await expect(board.locator("[data-status='step']")).toContainText("Pick Story");
      await shot(pad, "device-pick-story");
      await shot(board, "board-pick-story");

      await d.button("continue").click();
      await expect(pad.locator("main")).toHaveAttribute("data-screen", "party-join");
      await expect(pad.getByRole("heading", { name: "Party Join" })).toBeVisible();
      await expect(d.button("continue")).toBeDisabled();
      await expect(pad.getByText("Disabled: Claim all hunters first.")).toBeVisible();
      await expect(board.getByText(/0 of 4 hunters claimed|hunters claimed/)).toBeVisible();
      await expect(board.getByText(host.joinCode, { exact: true })).toBeVisible();
      const join = boardStates(boardFrames).at(-1)?.join as { url: string };
      await expect(board.getByText(join.url)).toBeVisible();
      await shot(pad, "device-party-join");
      await shot(board, "board-party-join");

      await d.button("take-all").click();
      await expect(d.hold("alpha")).toHaveAttribute("data-action", "release");
      await expect(d.hold("delta")).toHaveAttribute("data-action", "release");
      await expect(d.button("continue")).toBeEnabled();
      await expect(board.getByText("4 of 4 hunters claimed")).toBeVisible();
      await shot(pad, "device-party-join-claimed");
      await shot(board, "board-party-join-claimed");

      await d.button("continue").click();
      await expect(pad.locator("main")).toHaveAttribute("data-screen", "begin");
      await expect(pad.getByRole("heading", { name: "Begin Story" })).toBeVisible();
      await expect(d.button("begin")).toBeEnabled();
      await expect(board.getByText("Begin", { exact: true })).toBeVisible();
      await shot(pad, "device-begin");
      await shot(board, "board-begin");

      await d.button("begin").click();
      await expect(pad.locator("main")).toHaveAttribute("data-screen", "play");
      await expect(pad.getByRole("heading", { name: "Play" })).toBeVisible();
      await expect(board.getByText("The proving ground is quiet.")).toBeVisible();
      await expect(board.locator("[data-status='step']")).toContainText("Play");
      await expect(d.button("continue")).toBeEnabled();
      await shot(pad, "device-play");
      await shot(board, "board-play");
    });
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await host.close();
  }
});
