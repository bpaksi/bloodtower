import { type Browser, expect, type Page, type TestInfo, test } from "@playwright/test";
import { openDatabase } from "../../server/db/client.ts";
import { createEventStore } from "../../server/events/store.ts";
import {
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  setSoundAndKeep,
  startAcceptanceHost,
} from "./support/acceptance.ts";

const STORY_ID = "test";
const HERO_IDS = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const HERO_NAMES = ["Hero A", "Hero B", "Hero C", "Hero D"] as const;
const BOARD_VIEW = { width: 1920, height: 1080 };

const projectViewport = (testInfo: TestInfo) => {
  const viewport = testInfo.project.use.viewport;
  if (viewport && typeof viewport === "object" && "width" in viewport && "height" in viewport) {
    return { width: viewport.width, height: viewport.height };
  }
  return { width: 1280, height: 720 };
};

const deviceMain = (page: Page) => page.locator("main.bt-device");

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;

/** One setup step or Begin. A bare Continue also matches the next opening prompt. */
const clickCurrentSetupOrBegin = async (page: Page) => {
  const screen = await deviceMain(page).getAttribute("data-screen");
  if (screen === "setup") {
    const step = page.locator(
      'button[data-prompt-id^="continue-setup-"][data-action-id="continue"]',
    );
    await expect(step).toBeEnabled({ timeout: 20_000 });
    const promptId = await step.getAttribute("data-prompt-id");
    await step.click();
    if (promptId) {
      await expect(page.locator(`button[data-prompt-id="${promptId}"]`)).toHaveCount(0);
    }
    return;
  }
  if (screen === "begin") {
    await clickAct(page, "continue", "continue-begin");
    await expect(page.locator('button[data-prompt-id="continue-begin"]')).toHaveCount(0);
  }
};

/** W5 grey-stair moments sit on the play screen before the move band. */
const passOpening = async (device: Page, board: Page) => {
  for (const id of OPENING_IDS) {
    const promptId = `continue-opening-${id.replace(".", "-")}`;
    await expect(board.locator("main")).toHaveAttribute("data-moment", id);
    await expect(board.locator("main")).toHaveAttribute("data-board-layer", "move");
    await expect(board.locator("[data-band]")).toHaveCount(0);
    await clickAct(device, "continue", promptId);
  }
  await expect(board.locator("main")).not.toHaveAttribute("data-moment", /.+/);
};

const readStatus = async (page: Page) => {
  const line = deviceMain(page).locator("p").first();
  return {
    day: await line.getAttribute("data-day"),
    moves: await line.getAttribute("data-moves"),
    space: await line.getAttribute("data-space"),
    inside: await line.getAttribute("data-inside"),
    building: await line.getAttribute("data-building"),
    hero: await line.getAttribute("data-acting-hero"),
    spaceName: await line.getAttribute("data-space-name"),
  };
};

const checkpointSeed = (databasePath: string): string => {
  const opened = openDatabase(databasePath);
  try {
    const store = createEventStore(opened.db);
    const autosave = store.getAutosave();
    if (!autosave) throw new Error("No autosave.");
    const checkpoint = store.lastCheckpoint(autosave.gameId);
    if (!checkpoint) throw new Error("No checkpoint.");
    return checkpoint.seed;
  } finally {
    opened.close();
  }
};

const openPair = async (
  browser: Browser,
  testInfo: TestInfo,
  baseURL: string,
  reducedMotion?: "reduce",
) => {
  const boardContext = await browser.newContext({
    baseURL,
    viewport: BOARD_VIEW,
    reducedMotion,
  });
  const deviceContext = await browser.newContext({
    baseURL,
    viewport: projectViewport(testInfo),
    hasTouch: Boolean(testInfo.project.use.hasTouch),
  });
  const board = await boardContext.newPage();
  const device = await deviceContext.newPage();
  return { boardContext, deviceContext, board, device };
};

test("W6 waiting line honours reduced motion", async ({ browser }, testInfo) => {
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w6-motion" });
  const { boardContext, deviceContext, board, device } = await openPair(
    browser,
    testInfo,
    session.baseURL,
    "reduce",
  );
  try {
    await board.goto("/board");
    await installSessionSocketHook(device);
    await device.goto(`/join?code=${session.host.joinCode}`);
    await enterWithoutTower(device);
    await clickAct(device, "continue", `continue-pick-story-${STORY_ID}`);
    await clickAct(device, "continue", "continue-game-settings");
    await holdHeroesFromTest(device, [...HERO_IDS]);
    await clickAct(device, "continue", "continue-claim-heroes");
    const deadline = Date.now() + 30_000;
    while ((await deviceMain(device).getAttribute("data-screen")) !== "play") {
      if (Date.now() > deadline) throw new Error("Did not reach play.");
      const screen = await deviceMain(device).getAttribute("data-screen");
      if (screen === "setup" || screen === "begin") await clickCurrentSetupOrBegin(device);
      else await device.waitForTimeout(50);
    }
    await passOpening(device, board);
    await expect(board.locator("[data-waiting]")).toBeVisible();
    await expect(board.locator("[data-waiting]")).toHaveText(/is choosing/);
    const pulse = await board.locator("[data-waiting]").evaluate((node) => {
      return getComputedStyle(node).animationName;
    });
    expect(pulse).toBe("none");
  } finally {
    await boardContext.close();
    await deviceContext.close();
    await session.host.close();
  }
});

test("W6 continue keeps the place still, then the move layer after Leave", async ({
  browser,
}, testInfo) => {
  test.setTimeout(240_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w6-continue" });
  const { databasePath } = session;
  const first = await openPair(browser, testInfo, session.baseURL);
  let snapshot: Awaited<ReturnType<typeof readStatus>> | null = null;
  let still = "";
  try {
    await first.board.goto("/board");
    await installSessionSocketHook(first.device);
    await first.device.goto(`/join?code=${session.host.joinCode}`);
    await enterWithoutTower(first.device);
    await clickAct(first.device, "continue", `continue-pick-story-${STORY_ID}`);
    await clickAct(first.device, "continue", "continue-game-settings");
    await holdHeroesFromTest(first.device, [...HERO_IDS]);
    await clickAct(first.device, "continue", "continue-claim-heroes");
    const deadline = Date.now() + 40_000;
    while ((await deviceMain(first.device).getAttribute("data-screen")) !== "play") {
      if (Date.now() > deadline) throw new Error("Did not reach play.");
      const screen = await deviceMain(first.device).getAttribute("data-screen");
      if (screen === "setup" || screen === "begin") await clickCurrentSetupOrBegin(first.device);
      else await first.device.waitForTimeout(50);
    }
    await passOpening(first.device, first.board);
    const roll = first.device.locator('button[data-prompt-id*="roll-done"]');
    const enter = first.device.locator('button[data-action-id="enter"]');
    await expect
      .poll(
        async () => {
          if ((await roll.count()) > 0) return "roll";
          if ((await enter.count()) > 0) return "enter";
          return "";
        },
        { timeout: 20_000 },
      )
      .not.toBe("");
    if ((await roll.count()) > 0) {
      await roll.click();
      await expect(enter).toBeVisible({ timeout: 20_000 });
    }
    const beforeEnter = await readStatus(first.device);
    await clickAct(first.device, "enter");
    await expect.poll(async () => (await readStatus(first.device)).inside).toBe("true");
    snapshot = await readStatus(first.device);
    expect(snapshot.moves).toBe(beforeEnter.moves);
    still = (await first.board.locator("[data-still]").getAttribute("data-still")) ?? "";
    expect(still).toBe(`place.${snapshot.building}`);
    expect(checkpointSeed(databasePath)).toBe("w6-continue");
    expect(session.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);
  } finally {
    await first.boardContext.close();
    await first.deviceContext.close();
    await session.host.close();
  }

  const restarted = await startAcceptanceHost(testInfo, {
    databasePath,
    seed: "w6-continue",
  });
  const second = await openPair(browser, testInfo, restarted.baseURL);
  let outside: Awaited<ReturnType<typeof readStatus>> | null = null;
  try {
    await second.board.goto("/board");
    await installSessionSocketHook(second.device);
    await second.device.goto(`/join?code=${restarted.host.joinCode}`);
    await setSoundAndKeep(second.device);
    await clickAct(second.device, "continue", "continue-saved-game");
    await expect(deviceMain(second.device)).toHaveAttribute("data-screen", "play");
    await expect(second.board.locator("main")).toHaveAttribute("data-board-layer", "place");
    await expect(second.board.locator("[data-still]")).toHaveAttribute("data-still", still);
    await holdHeroesFromTest(second.device, [...HERO_IDS]);
    const restored = await readStatus(second.device);
    expect(restored.inside).toBe("true");
    expect(restored.moves).toBe(snapshot?.moves);
    expect(restored.day).toBe(snapshot?.day);
    expect(restored.building).toBe(snapshot?.building);
    for (const name of HERO_NAMES) {
      await expect(second.device.locator("[data-roster]")).toContainText(name);
    }
    expect(checkpointSeed(databasePath)).toBe("w6-continue");
    expect(restarted.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);
    await expect(deviceMain(second.device)).not.toHaveAttribute("data-screen", "pause");
    await clickAct(second.device, "leave");
    await expect.poll(async () => (await readStatus(second.device)).inside).toBe("false");
    await expect(second.board.locator("main")).toHaveAttribute("data-board-layer", "move");
    await expect(second.board.locator("[data-chapter]")).toHaveText("The Ruined Keep");
    outside = await readStatus(second.device);
  } finally {
    await second.boardContext.close();
    await second.deviceContext.close();
    await restarted.host.close();
  }

  const again = await startAcceptanceHost(testInfo, { databasePath, seed: "w6-continue" });
  const third = await openPair(browser, testInfo, again.baseURL);
  try {
    await third.board.goto("/board");
    await installSessionSocketHook(third.device);
    await third.device.goto(`/join?code=${again.host.joinCode}`);
    await setSoundAndKeep(third.device);
    await clickAct(third.device, "continue", "continue-saved-game");
    await expect(deviceMain(third.device)).toHaveAttribute("data-screen", "play");
    await holdHeroesFromTest(third.device, [...HERO_IDS]);
    await expect(third.board.locator("main")).toHaveAttribute("data-board-layer", "move");
    await expect(third.board.locator("[data-still]")).toHaveCount(0);
    await expect(third.board.locator("[data-band]")).toBeVisible();
    const restored = await readStatus(third.device);
    expect(restored.inside).toBe("false");
    expect(restored.space).toBe(outside?.space);
    await expect(third.device.locator("[data-roster]")).toContainText(outside?.spaceName ?? "");
  } finally {
    await third.boardContext.close();
    await third.deviceContext.close();
    await again.host.close();
  }
});
