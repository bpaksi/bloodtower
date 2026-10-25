import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import {
  gateControls,
  holdHeroesFromTest,
  installSessionSocketHook,
  releaseTogether,
  startAcceptanceHost,
} from "./support/acceptance.ts";

const STORY_ID = "test";
const HERO_IDS = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const SETUP_IDS = ["seals-and-skulls", "lay-out-board", "place-heroes"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;

const LABELS: Record<(typeof SETUP_IDS)[number], string> = {
  "seals-and-skulls": "Place the seals on the tower and load the skulls into the chute.",
  "lay-out-board": "Lay out the board and orient the kingdoms.",
  "place-heroes": "Stand each hero on their start building.",
};

const PACK_ROOT = join(import.meta.dirname, "../../../../../packs/test");
const STAND_IN = /hero\.webp|dialog-frame|place\.(village|bazaar|citadel|sanctuary)/;

const deviceMain = (page: Page) => page.locator("main.bt-device");
const boardMain = (page: Page) => page.locator("main.bt-board");

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const openingPrompt = (momentId: string) => `continue-opening-${momentId.replace(".", "-")}`;

const skipTowerToClaim = async (page: Page, joinCode: string) => {
  await installSessionSocketHook(page);
  await page.goto(`/join?code=${joinCode}`);
  await expect(page).toHaveURL(/\/device/);
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "splash");
  await clickAct(page, "continue", "splash-play");
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "pick-story");
  await clickAct(page, "continue", `continue-pick-story-${STORY_ID}`);
  await clickAct(page, "continue", "continue-game-settings");
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "tower-connect");
  await page.locator('button[data-action="play-without-tower"]').click();
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "claim-heroes");
};

const claimAndEnterSetup = async (page: Page) => {
  await holdHeroesFromTest(page, [...HERO_IDS]);
  await clickAct(page, "continue", "continue-claim-heroes");
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "setup");
  await expect(deviceMain(page)).toHaveAttribute("data-setup-step", "seals-and-skulls");
};

const openBoard = async (browser: import("@playwright/test").Browser, baseURL: string) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 900 },
  });
  const board = await context.newPage();
  await board.goto("/board");
  return { context, board };
};

const audiosPaused = async (page: Page) =>
  page
    .locator("audio")
    .evaluateAll((nodes) => nodes.every((node) => (node as HTMLAudioElement).paused));

const imageSrcs = async (page: Page) =>
  page.locator("img").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("src") ?? ""));

/** Sidecar plus the still it names. Absent until the Illusionist lands the files. */
const panningReady = (momentId: string): boolean => {
  const sidecar = join(PACK_ROOT, "camera", `${momentId}.json`);
  if (!existsSync(sidecar)) return false;
  const track = JSON.parse(readFileSync(sidecar, "utf8")) as { still?: string };
  if (!track.still || !/\.(png|jpe?g|webp)$/i.test(track.still)) return false;
  return existsSync(join(PACK_ROOT, "assets", track.still));
};

const motionReady = () =>
  existsSync(join(PACK_ROOT, "assets", "grey-stair-04.png")) &&
  existsSync(join(PACK_ROOT, "assets", "grey-stair-04-glow.png"));

const assertNoStandIn = async (page: Page) => {
  for (const src of await imageSrcs(page)) expect(src).not.toMatch(STAND_IN);
};

const assertUnavailableStill = async (board: Page) => {
  const still = board.locator('[data-still-state="unavailable"]');
  await expect(still).toBeVisible({ timeout: 15_000 });
  await expect(still.locator("[data-board-caption]")).not.toHaveText("");
  await assertNoStandIn(board);
};

test("W5 claim Continue lands on seals, with Begin locked, and Back returns", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w5-first-step" });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const device = await context.newPage();
  try {
    await skipTowerToClaim(device, session.host.joinCode);
    await claimAndEnterSetup(device);
    await expect(device.getByRole("button", { name: "Done" })).toBeVisible();
    await expect(deviceMain(device)).toContainText(LABELS["seals-and-skulls"]);
    await expect(device.locator("[data-begin-lock]")).toHaveText("The setup steps are not done.");
    await expect(device.locator('button[data-prompt-id="continue-begin"]')).toBeDisabled();
    await expect(device.locator("main img")).toHaveCount(0);

    await clickAct(device, "back", "back-setup-seals-and-skulls");
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "claim-heroes");
    await clickAct(device, "continue", "continue-claim-heroes");
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "setup");
    await expect(deviceMain(device)).toHaveAttribute("data-setup-step", "seals-and-skulls");
    await expect(device.locator("[data-begin-lock]")).toBeVisible();
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("W5 setup steps stay in order on the iPad and the Story board", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w5-steps" });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const device = await context.newPage();
  const { context: boardContext, board } = await openBoard(browser, session.baseURL);
  try {
    await skipTowerToClaim(device, session.host.joinCode);
    await claimAndEnterSetup(device);

    for (const [index, id] of SETUP_IDS.entries()) {
      await expect(deviceMain(device)).toHaveAttribute("data-setup-step", id);
      await expect(deviceMain(device)).toContainText(LABELS[id]);
      await expect(device.locator("[data-setup-step]")).toHaveCount(1);
      await expect(device.locator("main img")).toHaveCount(0);
      await expect(device.locator("[data-begin-lock]")).toHaveText("The setup steps are not done.");
      await expect(device.locator('button[data-prompt-id="continue-begin"]')).toBeDisabled();

      await expect(boardMain(board)).toHaveAttribute("data-board-mode", "startup");
      await expect(boardMain(board)).toHaveAttribute("data-screen", "setup");
      await expect(boardMain(board)).toHaveAttribute("data-setup-step", id);
      await expect(board.locator("[data-setup-step]")).toHaveCount(1);
      await expect(board.locator("[data-setup-progress]")).toHaveText(`Step ${index + 1} of 3`);
      await expect(board.locator('[data-startup-panel="setup"]')).toContainText(LABELS[id]);
      await expect(board.locator("main button")).toHaveCount(0);
      await expect(board.locator("[data-hero-place]")).toHaveCount(0);
      await expect(board.locator("[data-roster], [data-kingdom]")).toHaveCount(0);
      await assertNoStandIn(board);

      if (index < SETUP_IDS.length - 1) {
        await clickAct(device, "continue", `continue-setup-${id}`);
      }
    }

    await clickAct(device, "back", "back-setup-place-heroes");
    await expect(deviceMain(device)).toHaveAttribute("data-setup-step", "lay-out-board");
    await expect(board.locator("[data-setup-progress]")).toHaveText("Step 2 of 3");
    await clickAct(device, "back", "back-setup-lay-out-board");
    await expect(deviceMain(device)).toHaveAttribute("data-setup-step", "seals-and-skulls");
    await expect(board.locator("[data-setup-progress]")).toHaveText("Step 1 of 3");
    expect(session.tower.sent()).toEqual([]);
  } finally {
    await boardContext.close();
    await context.close();
    await session.host.close();
  }
});

test("W5 Done on place-heroes opens Begin, and Back locks it again", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w5-begin" });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const device = await context.newPage();
  const { context: boardContext, board } = await openBoard(browser, session.baseURL);
  try {
    await skipTowerToClaim(device, session.host.joinCode);
    await claimAndEnterSetup(device);
    for (const id of SETUP_IDS) {
      await clickAct(device, "continue", `continue-setup-${id}`);
      expect(session.tower.sent()).toEqual([]);
    }
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "begin");
    await expect(device.locator("[data-begin-lock]")).toHaveCount(0);
    await expect(device.getByRole("button", { name: "Begin" })).toBeEnabled();
    await expect(board.locator('[data-startup-panel="begin"]')).toContainText("The table is set.");
    await expect(board.locator("main button")).toHaveCount(0);

    await clickAct(device, "back", "back-begin");
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "setup");
    await expect(deviceMain(device)).toHaveAttribute("data-setup-step", "place-heroes");
    await expect(device.locator("[data-begin-lock]")).toHaveText("The setup steps are not done.");
    await expect(device.locator('button[data-prompt-id="continue-begin"]')).toBeDisabled();
    expect(session.tower.sent()).toEqual([]);
  } finally {
    await boardContext.close();
    await context.close();
    await session.host.close();
  }
});

test("W5 two iPads pressing Begin together open one grey-stair.01", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w5-two-begin" });
  const contextA = await browser.newContext({ baseURL: session.baseURL });
  const contextB = await browser.newContext({ baseURL: session.baseURL });
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const gateA = await gateControls(pageA);
  const gateB = await gateControls(pageB);
  const { context: boardContext, board } = await openBoard(browser, session.baseURL);
  try {
    await skipTowerToClaim(pageA, session.host.joinCode);
    await installSessionSocketHook(pageB);
    await pageB.goto(`/join?code=${session.host.joinCode}`);
    await expect(deviceMain(pageB)).toHaveAttribute("data-screen", "claim-heroes");
    await holdHeroesFromTest(pageA, [...HERO_IDS]);
    await clickAct(pageA, "continue", "continue-claim-heroes");
    for (const id of SETUP_IDS) {
      await expect(deviceMain(pageA)).toHaveAttribute("data-setup-step", id);
      await clickAct(pageA, "continue", `continue-setup-${id}`);
    }
    await expect(deviceMain(pageA)).toHaveAttribute("data-screen", "begin");
    await expect(deviceMain(pageB)).toHaveAttribute("data-screen", "begin");
    await expect(pageA.locator('button[data-prompt-id="continue-begin"]')).toBeEnabled();
    await expect(pageB.locator('button[data-prompt-id="continue-begin"]')).toBeEnabled();

    gateA.hold();
    gateB.hold();
    await clickAct(pageA, "continue", "continue-begin");
    await clickAct(pageB, "continue", "continue-begin");
    await gateA.held(1);
    await gateB.held(1);
    expect(releaseTogether(gateA, gateB)).toBe(2);

    await expect
      .poll(() =>
        session.host.loadRun().presses.filter((press) => press.promptId === "continue-begin"),
      )
      .toHaveLength(2);
    const presses = session.host
      .loadRun()
      .presses.filter((press) => press.promptId === "continue-begin");
    expect(presses.filter((press) => press.winner)).toHaveLength(1);

    await expect(boardMain(board)).toHaveAttribute("data-moment", "grey-stair.01");
    await expect(board.locator('[data-startup-panel="begin"]')).toHaveCount(0);
    await expect(boardMain(board)).not.toHaveText("The table is set.");
    for (const page of [pageA, pageB]) {
      await expect(page.locator('button[data-prompt-id="continue-begin"]:enabled')).toHaveCount(0);
      await expect(page.locator('button[data-action-id="walk"]')).toHaveCount(0);
      await expect(page.locator('button[data-action-id="enter"]')).toHaveCount(0);
      await expect(page.locator("main img")).toHaveCount(0);
    }
    expect(session.tower.sent()).toEqual([]);
  } finally {
    await boardContext.close();
    await contextA.close();
    await contextB.close();
    await session.host.close();
  }
});

test("W5 Begin plays four opening moments before any walk", async ({ browser }, testInfo) => {
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w5-opening" });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const device = await context.newPage();
  const { context: boardContext, board } = await openBoard(browser, session.baseURL);
  const keeperUrls: string[] = [];
  board.on("response", (response) => {
    if (response.url().includes("/avatars/keeper/") && response.ok())
      keeperUrls.push(response.url());
  });
  try {
    await skipTowerToClaim(device, session.host.joinCode);
    await claimAndEnterSetup(device);
    for (const id of SETUP_IDS) await clickAct(device, "continue", `continue-setup-${id}`);
    await clickAct(device, "continue", "continue-begin");

    for (const id of OPENING_IDS) {
      await expect(boardMain(board)).toHaveAttribute("data-moment", id);
      await expect(board.locator('[data-moment="grey-stair.door-choice"]')).toHaveCount(0);
      await expect(device.locator('button[data-action-id="walk"]')).toHaveCount(0);
      await expect(device.locator('button[data-action-id="enter"]')).toHaveCount(0);
      await expect(device.locator("main img")).toHaveCount(0);
      await expect(device.locator(`button[data-prompt-id="${openingPrompt(id)}"]`)).toBeEnabled();
      expect(await audiosPaused(device)).toBe(true);

      if (id === "grey-stair.01" || id === "grey-stair.02") {
        if (panningReady(id)) {
          const image = board.locator(`[data-camera-still] img[data-camera-track="${id}"]`);
          await expect(image).toBeVisible({ timeout: 15_000 });
          await assertNoStandIn(board);
          const first = await image.evaluate((node) => (node as HTMLElement).style.transform);
          await expect
            .poll(() => image.evaluate((node) => (node as HTMLElement).style.transform), {
              timeout: 5_000,
            })
            .not.toBe(first);
          await board.emulateMedia({ reducedMotion: "reduce" });
          await expect(image).toHaveAttribute("data-camera-reduced", "true");
          const held = await image.evaluate((node) => (node as HTMLElement).style.transform);
          await board.waitForTimeout(400);
          expect(await image.evaluate((node) => (node as HTMLElement).style.transform)).toBe(held);
          await board.emulateMedia({ reducedMotion: "no-preference" });
        } else {
          await assertUnavailableStill(board);
          await expect(board.locator("[data-camera-still]")).toHaveCount(0);
        }
      }

      if (id === "grey-stair.03") {
        await expect(board.locator("[data-keeper-plate]")).toHaveCount(1);
        await expect(board.locator("[data-board-caption]").first()).not.toHaveText("");
        await expect.poll(() => keeperUrls.length).toBeGreaterThan(0);
        expect(keeperUrls.every((url) => url.includes("/avatars/keeper/"))).toBe(true);
      }

      if (id === "grey-stair.04") {
        if (motionReady()) {
          const glow = board.locator("[data-motion-still] [data-motion-glow]");
          await expect(glow).toBeVisible({ timeout: 15_000 });
          await expect
            .poll(() => glow.evaluate((node) => getComputedStyle(node).animationName))
            .toBe("bt-motion-flicker");
          const paint = await glow.evaluate((node) => getComputedStyle(node).backgroundImage);
          expect(paint).toContain("grey-stair-04-glow");
          expect(paint).not.toMatch(/window-mask|\/landing\//);
          await board.emulateMedia({ reducedMotion: "reduce" });
          await expect
            .poll(() => glow.evaluate((node) => getComputedStyle(node).animationName))
            .toBe("none");
          await board.emulateMedia({ reducedMotion: "no-preference" });
        } else {
          await assertUnavailableStill(board);
          await expect(board.locator("[data-motion-still], [data-motion-glow]")).toHaveCount(0);
        }
      }

      await clickAct(device, "continue", openingPrompt(id));
    }

    await expect(boardMain(board)).not.toHaveAttribute("data-moment", /.+/);
    await expect(device.locator('button[data-action-id="walk"]')).toHaveCount(0);
    await expect(board.locator("[data-roster], [data-kingdom], [data-hero-place]")).toHaveCount(0);
    await expect(device.locator("[data-alone='true']")).toHaveCount(4);
    await expect(device.locator("[data-kingdom='Arisilon (N)']")).toContainText(
      "Radiant Mountains",
    );
    await expect(device.locator("[data-kingdom='Brynthia (E)']")).toContainText("Inner Kinghills");
    await expect(device.locator("[data-kingdom='Durnin (S)']")).toContainText("Howling Desert");
    await expect(device.locator("[data-kingdom='Zenon (W)']")).toContainText("Hissing Groves");
    await expect(board.locator("[data-band] [data-moves]")).toHaveText(/unavailable/);
    await expect(board.locator("[data-chapter]")).toHaveText("Proving Grounds");
    expect(session.tower.sent()).toEqual([]);
  } finally {
    await boardContext.close();
    await context.close();
    await session.host.close();
  }
});

test("W5 a restart before Begin does not skip an undone setup step", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w5-restart-setup" });
  const { databasePath } = session;
  const context = await browser.newContext({ baseURL: session.baseURL });
  const device = await context.newPage();
  try {
    await skipTowerToClaim(device, session.host.joinCode);
    await claimAndEnterSetup(device);
    await clickAct(device, "continue", "continue-setup-seals-and-skulls");
    await expect(deviceMain(device)).toHaveAttribute("data-setup-step", "lay-out-board");
    expect(session.tower.sent()).toEqual([]);
  } finally {
    await context.close();
    await session.host.close();
  }

  const restarted = await startAcceptanceHost(testInfo, {
    databasePath,
    seed: "w5-restart-setup",
  });
  const context2 = await browser.newContext({ baseURL: restarted.baseURL });
  const page = await context2.newPage();
  const { context: boardContext, board } = await openBoard(browser, restarted.baseURL);
  try {
    await installSessionSocketHook(page);
    await page.goto(`/join?code=${restarted.host.joinCode}`);
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "splash");
    await clickAct(page, "continue", "splash-play");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "pick-story");
    await expect(page.locator('button[data-action-id="walk"]')).toHaveCount(0);
    await expect(page.locator('button[data-prompt-id="continue-begin"]')).toHaveCount(0);
    await expect(boardMain(board)).toContainText("Proving Grounds");
    await clickAct(page, "continue", `continue-pick-story-${STORY_ID}`);
    await clickAct(page, "continue", "continue-game-settings");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "tower-connect");
    await page.locator('button[data-action="play-without-tower"]').click();
    await holdHeroesFromTest(page, [...HERO_IDS]);
    await clickAct(page, "continue", "continue-claim-heroes");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "setup");
    await expect(deviceMain(page)).toHaveAttribute("data-setup-step", "seals-and-skulls");
    await expect(deviceMain(page)).not.toHaveAttribute("data-setup-step", "lay-out-board");
    expect(restarted.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);
  } finally {
    await boardContext.close();
    await context2.close();
    await restarted.host.close();
  }
});

test("W5 a restart on grey-stair.02 reloads that moment and offers no walk", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w5-restart-opening" });
  const { databasePath } = session;
  const context = await browser.newContext({ baseURL: session.baseURL });
  const device = await context.newPage();
  const { context: boardContext, board } = await openBoard(browser, session.baseURL);
  try {
    await skipTowerToClaim(device, session.host.joinCode);
    await claimAndEnterSetup(device);
    for (const id of SETUP_IDS) await clickAct(device, "continue", `continue-setup-${id}`);
    await clickAct(device, "continue", "continue-begin");
    await expect(boardMain(board)).toHaveAttribute("data-moment", "grey-stair.01");
    await clickAct(device, "continue", openingPrompt("grey-stair.01"));
    await expect(boardMain(board)).toHaveAttribute("data-moment", "grey-stair.02");
    await expect(device.locator('button[data-action-id="walk"]')).toHaveCount(0);
  } finally {
    await boardContext.close();
    await context.close();
    await session.host.close();
  }

  const restarted = await startAcceptanceHost(testInfo, {
    databasePath,
    seed: "w5-restart-opening",
  });
  const context2 = await browser.newContext({ baseURL: restarted.baseURL });
  const page = await context2.newPage();
  const reopened = await openBoard(browser, restarted.baseURL);
  try {
    await installSessionSocketHook(page);
    await page.goto(`/join?code=${restarted.host.joinCode}`);
    await clickAct(page, "continue", "splash-play");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "pick-game");
    await clickAct(page, "continue", "continue-pick-game");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "play");
    await holdHeroesFromTest(page, [...HERO_IDS]);
    await expect(reopened.board.locator("main")).toHaveAttribute("data-moment", "grey-stair.02");
    await expect(page.locator('button[data-action-id="walk"]')).toHaveCount(0);
    await expect(page.locator('button[data-action-id="enter"]')).toHaveCount(0);
    await expect(
      page.locator(`button[data-prompt-id="${openingPrompt("grey-stair.02")}"]`),
    ).toBeEnabled();
    await expect(page.locator("main img")).toHaveCount(0);
    expect(restarted.tower.sent()).toEqual([]);
  } finally {
    await reopened.context.close();
    await context2.close();
    await restarted.host.close();
  }
});

test("W5 quit on grey-stair.01 shows no tower on goodbye", async ({ browser }, testInfo) => {
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w5-quit-opening" });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const device = await context.newPage();
  const { context: boardContext, board } = await openBoard(browser, session.baseURL);
  try {
    await skipTowerToClaim(device, session.host.joinCode);
    await claimAndEnterSetup(device);
    for (const id of SETUP_IDS) await clickAct(device, "continue", `continue-setup-${id}`);
    await clickAct(device, "continue", "continue-begin");
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "play");
    await expect(boardMain(board)).toHaveAttribute("data-moment", "grey-stair.01");
    await expect(device.locator('button[data-action-id="walk"]')).toHaveCount(0);

    await device.locator('[data-action="menu"]').click();
    await clickAct(device, "quit-story", "menu-quit");
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "session");
    await clickAct(device, "done-for-tonight", "session-done-tonight");

    await expect(deviceMain(device)).toHaveAttribute("data-screen", "goodbye");
    await expect(boardMain(board)).toHaveAttribute("data-screen", "goodbye");
    await expect(deviceMain(device).locator("[data-tower-state]")).toHaveText("no tower");
    await expect(boardMain(board).locator("[data-tower-state]")).toHaveText("no tower");
    expect(session.tower.sent().filter((item) => item.type === "idle")).toHaveLength(0);
  } finally {
    await boardContext.close();
    await context.close();
    await session.host.close();
  }
});
