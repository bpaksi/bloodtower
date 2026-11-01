import { resolve } from "node:path";
import { type Browser, type BrowserContext, expect, type Page, test } from "@playwright/test";
import { loadConfig } from "../../server/config.ts";
import { startSessionHost } from "../../server/hub/host.ts";
import { createMockTower, type MockTower } from "../../server/tower/mock.ts";
import { bloodtowerTowerFromMock } from "../../server/tower/testAdapter.ts";
import {
  enterWithoutTowerKeepSound,
  enterWithTowerKeepSound,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";
import { copyToE2eArtifacts } from "./support/e2e-artifacts.ts";

const WEB_ROOT = resolve(import.meta.dirname, "../../web/out");
const BOARD = { width: 1920, height: 1080 } as const;
const IPAD = { width: 768, height: 1024 } as const;
const STEPS = [
  "Set the tower on the board.",
  "Lay out the board, kingdom edges matched.",
  "Sort the pieces: heroes, foes, skulls.",
];
const QUESTION = "Wake the tower, or play tonight without it?";
const FAILED_LINE = "The tower did not answer. Try again, or play without it.";

// The board and the iPads do not depend on the project's viewport, so one project runs this.
test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Own board and iPad viewports.");
});

const deviceMain = (page: Page) => page.locator("main.bt-device");
const boardMain = (page: Page) => page.locator("main.bt-board");

/** The iPad's body buttons: everything but the bottom bar (EV-14). */
const bodyButtons = (page: Page) =>
  page.locator("main.bt-device .bt-scroll button, .bt-pinned button");

const bodyLabels = async (page: Page) =>
  (await bodyButtons(page).allInnerTexts()).map((t) => t.trim());

const press = async (page: Page, promptId: string) => {
  const button = page.locator(`button[data-prompt-id="${promptId}"]`);
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const openBoard = async (browser: Browser, baseURL: string) => {
  const context = await browser.newContext({ baseURL, viewport: BOARD });
  const page = await context.newPage();
  await page.goto("/board");
  return { context, page };
};

const openPad = async (browser: Browser, baseURL: string, joinCode: string) => {
  const context = await browser.newContext({ baseURL, viewport: IPAD, hasTouch: true });
  const page = await context.newPage();
  await installSessionSocketHook(page);
  await page.goto(`/join?code=${joinCode}`);
  await expect(page).toHaveURL(/\/device/);
  return { context, page };
};

const shot = async (page: Page, name: string, testInfo: import("@playwright/test").TestInfo) => {
  const dest = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path: dest, fullPage: false });
  copyToE2eArtifacts(testInfo, dest, `${name}.png`);
};

const sentTypes = (tower: MockTower) => tower.sent().map((row) => row.type);

test("base board setup shows its steps and waits for one press", async ({ browser }, testInfo) => {
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-enter-board" });
  const contexts: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, session.baseURL);
    contexts.push(board.context);
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "table-join");
    await expect(board.page.locator("[data-join-code] .bt-qr-lg svg")).toBeVisible();
    await expect(board.page.locator("[data-join-code] .bt-join-code")).toHaveText(
      session.host.joinCode,
    );
    await expect(board.page.locator("main button")).toHaveCount(0);
    const largeQr = await board.page.locator("[data-join-code] .bt-qr").boundingBox();
    await shot(board.page, "table-join-board", testInfo);

    const padA = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(padA.context);

    // EV-03: the three steps, in order, on the board; one body button on the iPad.
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "base-board");
    const steps = board.page.locator('[data-startup-panel="base-board"] li');
    await expect(steps).toHaveCount(3);
    expect((await steps.allInnerTexts()).map((t) => t.trim())).toEqual(STEPS);
    await expect(board.page.locator("main button")).toHaveCount(0);
    expect(await bodyLabels(padA.page)).toEqual(["Board is set up"]);
    await expect(bodyButtons(padA.page).first()).toHaveClass(/bt-primary/);
    await shot(board.page, "base-board-board", testInfo);
    await shot(padA.page, "base-board-ipad", testInfo);

    // EV-04: the QR shrinks to a corner at the first join and stays there.
    const corner = board.page.locator("[data-join-corner]");
    await expect(corner).toHaveCount(1);
    const cornerQr = await corner.locator(".bt-qr").boundingBox();
    expect(cornerQr?.height ?? 0).toBeGreaterThan(0);
    expect(cornerQr?.height ?? 0).toBeLessThan((largeQr?.height ?? 0) / 2);
    await expect(corner.locator(".bt-join-code")).toHaveText(session.host.joinCode);
    await expect(board.page.getByText("everyone", { exact: false })).toHaveCount(0);

    // A second iPad joins on base board setup and sees the same button.
    const padB = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(padB.context);
    await expect(deviceMain(padB.page)).toHaveAttribute("data-screen", "base-board");
    expect(await bodyLabels(padB.page)).toEqual(["Board is set up"]);

    // One press moves on. A second iPad's press after it changes nothing.
    await press(padA.page, "base-board-done");
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "tower-choice");
    await expect(deviceMain(padB.page)).toHaveAttribute("data-screen", "tower-choice");
    await padB.page.evaluate(() => {
      const socket = (window as unknown as { __btSessionSocket?: WebSocket }).__btSessionSocket;
      socket?.send(
        JSON.stringify({
          v: 2,
          type: "act",
          payload: { promptId: "base-board-done", actionId: "board-set-up", args: {} },
        }),
      );
    });
    await padB.page.waitForTimeout(500);
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "tower-choice");
    const presses = session.host.loadRun().presses.filter((p) => p.promptId === "base-board-done");
    expect(presses.filter((p) => p.winner)).toHaveLength(1);

    // EV-05: one tower question; both buttons named; the board only asks.
    await expect(board.page.locator('[data-startup-panel="tower-choice"]')).toContainText(QUESTION);
    await expect(board.page.locator("main button")).toHaveCount(0);
    await expect(board.page.locator("[data-join-corner]")).toHaveCount(1);
    expect(await bodyLabels(padA.page)).toEqual(["Connect Tower", "Play without Tower"]);
    await expect(bodyButtons(padA.page).nth(0)).toHaveClass(/bt-primary/);
    await expect(bodyButtons(padA.page).nth(1)).toHaveClass(/bt-secondary/);
    for (const text of ["Continue", "Play"]) {
      await expect(padA.page.getByRole("button", { name: text, exact: true })).toHaveCount(0);
    }
    await shot(board.page, "tower-choice-board", testInfo);
    await shot(padA.page, "tower-choice-ipad", testInfo);

    // EV-06: Play without Tower goes to Pick story and sends the tower nothing.
    await press(padA.page, "play-without-tower");
    await expect(deviceMain(padA.page)).toHaveAttribute("data-screen", "pick-story");
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "pick-story");
    await expect(board.page.locator("[data-join-corner]")).toHaveCount(1);
    await padA.page.waitForTimeout(1000);
    expect(session.tower.sent()).toEqual([]);
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await session.host.close();
  }
});

test("a failed connect or calibrate asks again; nothing physical happens without a press", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-enter-connect" });
  const { tower } = session;
  const contexts: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, session.baseURL);
    contexts.push(board.context);
    const pad = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(pad.context);
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "base-board");
    await pad.page.waitForTimeout(1000);
    expect(sentTypes(tower)).toEqual([]);

    await press(pad.page, "base-board-done");
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "tower-choice");
    await pad.page.waitForTimeout(1000);
    expect(sentTypes(tower)).toEqual([]);

    // EV-08: a failed connect shows its code on the iPad, a toast on the board, then asks again.
    tower.failNextConnect();
    await press(pad.page, "tower-connect");
    await expect(pad.page.locator('[data-error-code="tower-command-failed"]')).toBeVisible();
    await expect(
      board.page.locator('[data-error-code="tower-command-failed"]').first(),
    ).toBeVisible();
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "tower-choice");
    await expect(board.page.locator("[data-tower-status]")).toHaveText("Tower not found");
    await expect(board.page.locator('[data-startup-panel="tower-choice"]')).toContainText(
      FAILED_LINE,
    );
    await expect.poll(() => bodyLabels(pad.page)).toEqual(["Connect Tower", "Play without Tower"]);
    await shot(board.page, "tower-failed-board", testInfo);
    await shot(pad.page, "tower-failed-ipad", testInfo);
    await pad.page.waitForTimeout(3000);
    expect(sentTypes(tower)).toEqual([]);

    // EV-07: connect goes out only on its press; calibrate waits for its own press.
    await press(pad.page, "tower-connect");
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "tower-wake");
    await expect(board.page.locator("[data-tower-progress]")).not.toBeEmpty();
    await expect.poll(() => bodyLabels(pad.page)).toEqual(["Calibrate"]);
    await pad.page.waitForTimeout(3000);
    expect(sentTypes(tower)).toEqual(["connect"]);
    await expect(board.page.locator("main button")).toHaveCount(0);
    await shot(board.page, "tower-wake-board", testInfo);

    tower.failNextCalibrate();
    await press(pad.page, "tower-calibrate");
    await expect(pad.page.locator('[data-error-code="tower-command-failed"]')).toBeVisible();
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "tower-choice");
    await expect.poll(() => bodyLabels(pad.page)).toEqual(["Connect Tower", "Play without Tower"]);
    await pad.page.waitForTimeout(3000);
    expect(sentTypes(tower)).toEqual(["connect"]);

    await press(pad.page, "tower-connect");
    await press(pad.page, "tower-calibrate");
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "pick-story");
    await pad.page.waitForTimeout(3000);
    expect(sentTypes(tower)).toEqual(["connect", "calibrate"]);
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await session.host.close();
  }
});

const restartHost = async (
  session: Awaited<ReturnType<typeof startAcceptanceHost>>,
  seed: string,
  tower: MockTower,
) => {
  const port = Number(new URL(session.baseURL).port);
  await session.host.close();
  return startSessionHost({
    port,
    host: "127.0.0.1",
    webRoot: WEB_ROOT,
    packsDir: loadConfig({ env: {} }).packsDir,
    databasePath: session.databasePath,
    tower: bloodtowerTowerFromMock(tower),
    towerWatchMs: 50,
    sleep: async () => undefined,
    seed,
    graceMs: 100,
    joinCode: session.host.joinCode,
  });
};

for (const track of ["without", "connect"] as const) {
  test(`${track} track: tonight's tower choice survives a restart after the Enter`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(120_000);
    const seed = `c2-enter-survive-${track}`;
    const session = await startAcceptanceHost(testInfo, { seed });
    const contexts: BrowserContext[] = [];
    let restarted: Awaited<ReturnType<typeof startSessionHost>> | null = null;
    try {
      const pad = await openPad(browser, session.baseURL, session.host.joinCode);
      contexts.push(pad.context);
      await press(pad.page, "base-board-done");
      if (track === "without") {
        await press(pad.page, "play-without-tower");
      } else {
        await press(pad.page, "tower-connect");
        await press(pad.page, "tower-calibrate");
      }
      await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "pick-story");
      await pad.context.close();

      const tower = createMockTower();
      restarted = await restartHost(session, seed, tower);
      const again = await openPad(browser, session.baseURL, restarted.joinCode);
      contexts.push(again.context);
      await expect(deviceMain(again.page)).toHaveAttribute("data-screen", "pick-story");
      await again.page.waitForTimeout(1500);
      await expect(again.page.locator('button[data-prompt-id="base-board-done"]')).toHaveCount(0);
      await expect(again.page.locator('button[data-prompt-id="play-without-tower"]')).toHaveCount(
        0,
      );
      expect(tower.sent()).toEqual([]);
    } finally {
      for (const context of contexts) await context.close().catch(() => undefined);
      await restarted?.close().catch(() => undefined);
      await session.host.close().catch(() => undefined);
    }
  });
}

test("a restart in the middle of the Enter starts again from the join and sends nothing", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const seed = "c2-enter-mid";
  const session = await startAcceptanceHost(testInfo, { seed });
  const contexts: BrowserContext[] = [];
  let restarted: Awaited<ReturnType<typeof startSessionHost>> | null = null;
  try {
    const pad = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(pad.context);
    await press(pad.page, "base-board-done");
    await press(pad.page, "tower-connect");
    await expect(pad.page.locator('button[data-prompt-id="tower-calibrate"]')).toBeEnabled();
    expect(sentTypes(session.tower)).toEqual(["connect"]);
    await pad.context.close();

    const tower = createMockTower();
    restarted = await restartHost(session, seed, tower);
    const board = await openBoard(browser, session.baseURL);
    contexts.push(board.context);
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "table-join");
    await expect(board.page.locator("[data-join-code] .bt-qr-lg")).toBeVisible();
    await board.page.waitForTimeout(3000);
    expect(tower.sent()).toEqual([]);
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await restarted?.close().catch(() => undefined);
    await session.host.close().catch(() => undefined);
  }
});

test("the splash no longer offers Continue or Connect Tower", async ({ browser }, testInfo) => {
  const session = await startAcceptanceHost(testInfo, { seed: "c2-enter-splash" });
  const contexts: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, session.baseURL);
    contexts.push(board.context);
    const pad = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(pad.context);
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "base-board");
    for (const name of ["Continue", "Connect Tower", "Play"]) {
      await expect(pad.page.getByRole("button", { name, exact: true })).toHaveCount(0);
    }
    await expect(board.page.getByText(/Continue|Connect Tower/)).toHaveCount(0);
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await session.host.close();
  }
});

const VOLUME_LINE = "How loud should the tower be? Press one to hear it.";
const ENABLE_LINE = "Tap once to turn on this iPad's sound.";

const audioState = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __btDeviceSound?: { contextState: string | null } }).__btDeviceSound
        ?.contextState ?? null,
  );

const playedLog = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as { __btDeviceSound?: { played: { volume: number }[] } }
      ).__btDeviceSound?.played.map((row) => row.volume) ?? [],
  );

/** The iPad body's text: everything in the scroll area. */
const bodyText = async (page: Page) =>
  (await page.locator("main.bt-device .bt-scroll").innerText()).replace(/\n+/g, "\n").trim();

const soundCommands = (tower: MockTower) =>
  tower.sent().flatMap((row) => (row.type === "sound" ? [row] : []));

test("Pick story starts with Enable sound on each iPad, then levels, Keep and the story list", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-enter-sound" });
  const contexts: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, session.baseURL);
    contexts.push(board.context);
    const padA = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(padA.context);
    const padB = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(padB.context);
    await enterWithoutTowerKeepSound(padA.page);
    await expect(deviceMain(padB.page)).toHaveAttribute("data-screen", "pick-story");

    // EV-15, EV-14 (7a): only the prompt and one primary button; audio suspended; nothing played.
    for (const pad of [padA, padB]) {
      await expect.poll(() => audioState(pad.page)).toBe("suspended");
      expect(await bodyText(pad.page)).toBe(`${ENABLE_LINE}\nEnable sound`);
      expect(await bodyLabels(pad.page)).toEqual(["Enable sound"]);
      await expect(bodyButtons(pad.page).first()).toHaveClass(/bt-primary/);
      expect(await playedLog(pad.page)).toEqual([]);
    }
    const greyed = board.page.locator('.bt-row--disabled[aria-disabled="true"]');
    await expect(boardMain(board.page)).toHaveAttribute("data-screen", "pick-story");
    await expect(board.page.getByText(VOLUME_LINE)).toHaveCount(1);
    await expect(greyed.getByText(VOLUME_LINE)).toBeVisible();
    await expect(board.page.locator("main button")).toHaveCount(0);
    await shot(board.page, "sound-7a-board", testInfo);
    await shot(padA.page, "sound-7a-ipad", testInfo);

    // One iPad's tap unlocks only that iPad.
    await press(padA.page, "sound-enable");
    await expect.poll(() => audioState(padA.page)).toBe("running");
    expect(await audioState(padB.page)).toBe("suspended");
    expect(await bodyLabels(padB.page)).toEqual(["Enable sound"]);

    // EV-16, EV-14 (7b): the levels show with Keep disabled; the board line is at full strength.
    await expect
      .poll(() => bodyLabels(padA.page))
      .toEqual(["Volume 0", "Volume 1", "Volume 2", "Keep", "Try another"]);
    expect(await bodyText(padA.page)).toContain(VOLUME_LINE);
    const keep = padA.page.locator('button[data-prompt-id="volume-keep"]');
    await expect(keep).toBeDisabled();
    await expect(keep).toHaveClass(/bt-primary/);
    await expect(padA.page.locator('button[data-prompt-id^="continue-pick-story-"]')).toHaveCount(
      0,
    );
    await expect(board.page.getByText(VOLUME_LINE)).toHaveCount(1);
    await expect(board.page.locator('.bt-row--disabled, [aria-disabled="true"]')).toHaveCount(0);
    await expect(board.page.locator("main button")).toHaveCount(0);
    await shot(board.page, "sound-7b-board", testInfo);
    await shot(padA.page, "sound-7b-ipad", testInfo);

    // EV-17 (no tower): Keep waits for the iPad's own played-sound entry; no tower command.
    await keep.click({ force: true });
    await padA.page.waitForTimeout(500);
    await expect(keep).toBeDisabled();
    await press(padA.page, "volume-1");
    await expect.poll(() => playedLog(padA.page)).toEqual([1]);
    await expect(keep).toBeEnabled();
    await shot(board.page, "sound-7c-board", testInfo);
    await shot(padA.page, "sound-7c-ipad", testInfo);
    expect(session.tower.sent()).toEqual([]);

    // Try another clears Keep; then Volume 2 and Keep end the step; the story list follows.
    await press(padA.page, "volume-again");
    await expect(keep).toBeDisabled();
    await press(padA.page, "volume-2");
    await expect.poll(() => playedLog(padA.page)).toEqual([1, 2]);
    await press(padA.page, "volume-keep");
    await expect(
      padA.page.locator('button[data-prompt-id^="continue-pick-story-"]').first(),
    ).toBeVisible();
    await expect(board.page.getByText(VOLUME_LINE)).toHaveCount(0);
    expect(await bodyLabels(padB.page)).toEqual(["Enable sound"]);
    expect(session.tower.sent()).toEqual([]);
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await session.host.close();
  }
});

test("connect track: a volume plays Dungeon Complete on the tower only on its press; Keep follows the tower", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-enter-volume" });
  const { tower } = session;
  const contexts: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, session.baseURL);
    contexts.push(board.context);
    const pad = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(pad.context);
    await enterWithTowerKeepSound(pad.page);
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "pick-story");
    await pad.page.waitForTimeout(3000);
    expect(sentTypes(tower)).toEqual(["connect", "calibrate"]);

    await press(pad.page, "sound-enable");
    const keep = pad.page.locator('button[data-prompt-id="volume-keep"]');
    await expect(keep).toBeDisabled();
    await pad.page.waitForTimeout(1000);
    expect(soundCommands(tower)).toEqual([]);

    // Volume 0 plays once.
    await press(pad.page, "volume-0");
    await expect
      .poll(() => soundCommands(tower))
      .toEqual([{ type: "sound", soundIndex: 58, volume: 0 }]);
    await expect(keep).toBeEnabled();
    await pad.page.waitForTimeout(3000);
    expect(soundCommands(tower)).toHaveLength(1);

    // EV-09: Volume 1, Try another, Volume 2, Keep. Two more sounds, one per press.
    await press(pad.page, "volume-again");
    await expect(keep).toBeDisabled();
    await press(pad.page, "volume-1");
    await expect(keep).toBeEnabled();
    await press(pad.page, "volume-again");
    await press(pad.page, "volume-2");
    await expect(keep).toBeEnabled();
    expect(soundCommands(tower).map((row) => row.volume)).toEqual([0, 1, 2]);
    await press(pad.page, "volume-keep");
    await expect(
      pad.page.locator('button[data-prompt-id^="continue-pick-story-"]').first(),
    ).toBeVisible();
    await pad.page.waitForTimeout(1500);
    expect(soundCommands(tower)).toHaveLength(3);
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await session.host.close();
  }
});

test("connect track: a tower that does not play the sound leaves Keep disabled and shows the error", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-enter-volume-fail" });
  const { tower } = session;
  const contexts: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, session.baseURL);
    contexts.push(board.context);
    const pad = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(pad.context);
    await enterWithTowerKeepSound(pad.page);
    await press(pad.page, "sound-enable");
    tower.failNextSound();
    await press(pad.page, "volume-1");
    await expect(pad.page.locator('[data-error-code="tower-command-failed"]')).toBeVisible();
    await expect(
      board.page.locator('[data-error-code="tower-command-failed"]').first(),
    ).toBeVisible();
    await expect(pad.page.locator('button[data-prompt-id="volume-keep"]')).toBeDisabled();
    expect(soundCommands(tower)).toEqual([]);
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await session.host.close();
  }
});
