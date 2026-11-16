import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type Browser, expect, type Page, type TestInfo, test } from "@playwright/test";
import {
  type AcceptanceHost,
  captureFrames,
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  setSoundAndKeep,
  startAcceptanceHost,
} from "./support/acceptance.ts";

const STORY_ID = "test";
const HERO_IDS = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const HERO_NAME: Record<(typeof HERO_IDS)[number], string> = {
  "hero-a": "Hero A",
  "hero-b": "Hero B",
  "hero-c": "Hero C",
  "hero-d": "Hero D",
};
const REACHABLE_JOIN = () => "192.0.2.10";

type Space = { id: string; name: string; building?: string; adjacent: string[] };

const spaces = JSON.parse(
  readFileSync(join(import.meta.dirname, "../../../../../packs/base/board/spaces.json"), "utf8"),
) as { spaces: Space[] };

const spaceById = new Map(spaces.spaces.map((space) => [space.id, space]));

const deviceMain = (page: Page) => page.locator("main.bt-device");

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const status = (page: Page) => deviceMain(page).locator("p").first();

const offerIds = async (page: Page) =>
  page.locator("main button[data-prompt-id]").evaluateAll((nodes) =>
    nodes
      .map((node) => node.getAttribute("data-prompt-id"))
      .filter((id): id is string => id != null)
      .sort()
      .join("|"),
  );

const readStatus = async (page: Page) => {
  const line = status(page);
  return {
    day: await line.getAttribute("data-day"),
    moves: await line.getAttribute("data-moves"),
    space: await line.getAttribute("data-space"),
    inside: await line.getAttribute("data-inside"),
    building: await line.getAttribute("data-building"),
    hero: await line.getAttribute("data-acting-hero"),
    roll: await line.getAttribute("data-roll"),
  };
};

const marker = async (page: Page) => {
  const now = await readStatus(page);
  return `${now.hero}|${now.space}|${now.inside}|${now.moves}|${now.day}|${await offerIds(page)}`;
};

const settle = async (page: Page, before: string) => {
  await expect.poll(async () => marker(page), { timeout: 15_000 }).not.toBe(before);
};

const buildingTitle = (building: string) => building.charAt(0).toUpperCase() + building.slice(1);

const heroName = (heroId: string | null) =>
  heroId && heroId in HERO_NAME ? HERO_NAME[heroId as (typeof HERO_IDS)[number]] : "";

const SETUP_IDS = ["seals-and-skulls", "place-heroes"] as const;

/** The day-end skull step: the tower drop prompt, or the drawn drop without the tower (DEC-305). */
const SKULL_STEP = 'button[data-prompt-id*="skull-drop"], button[data-prompt-id^="skull-sim-day-"]';
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;

/** Done on the three setup steps, Begin, then Continue through the four opening moments. No walk. */
const finishSetup = async (page: Page) => {
  for (const id of SETUP_IDS) {
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "setup", { timeout: 20_000 });
    await expect(deviceMain(page)).toHaveAttribute("data-setup-step", id);
    await clickAct(page, "continue", `continue-setup-${id}`);
  }
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "begin", { timeout: 20_000 });
  await clickAct(page, "continue", "continue-begin");
  for (const id of OPENING_IDS) {
    await expect(page.locator('button[data-action-id="walk"]')).toHaveCount(0);
    await clickAct(page, "continue", `continue-opening-${id.replace(".", "-")}`);
  }
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "play", { timeout: 20_000 });
  await expect(page.locator('button[data-action-id="walk"]')).toHaveCount(0);
};

const skipTowerToClaim = async (page: Page, joinCode: string) => {
  await installSessionSocketHook(page);
  await page.goto(`/join?code=${joinCode}`);
  await expect(page).toHaveURL(/\/device/);
  await enterWithoutTower(page);
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "pick-story");
  await clickAct(page, "continue", `continue-pick-story-${STORY_ID}`);
  await clickAct(page, "continue", "continue-game-settings");
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "claim-heroes");
};

const takeMoveRoll = async (page: Page) => {
  const before = await marker(page);
  await clickAct(page, "continue");
  await settle(page, before);
  await expect.poll(async () => (await readStatus(page)).moves).not.toBeNull();
};

const openTable = async (browser: Browser, testInfo: TestInfo, session: AcceptanceHost) => {
  const viewport = testInfo.project.use.viewport ?? { width: 1280, height: 720 };
  const context = await browser.newContext({
    baseURL: session.baseURL,
    viewport,
    hasTouch: Boolean(testInfo.project.use.hasTouch),
  });
  const board = await context.newPage();
  await board.setViewportSize({ width: 1440, height: 900 });
  const device = await context.newPage();
  await board.goto("/board");
  await skipTowerToClaim(device, session.host.joinCode);
  await holdHeroesFromTest(device, [...HERO_IDS]);
  await clickAct(device, "continue", "continue-claim-heroes");
  await finishSetup(device);
  await takeMoveRoll(device);
  return { context, board, device };
};

const hostFor = (testInfo: TestInfo, seed: string) =>
  startAcceptanceHost(testInfo, { seed, lanHost: REACHABLE_JOIN });

test("CU/05 Back undoes a tap, repeats, and is gone at the turn start (EV-05, EV-09, EV-26)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const session = await hostFor(testInfo, "cu05-back");
  const { context, device } = await openTable(browser, testInfo, session);
  try {
    const start = await readStatus(device);
    const moves = Number(start.moves);
    expect(moves).toBeGreaterThanOrEqual(2);
    const back = device.locator('button[data-action="back"]');
    // EV-05: nothing to undo at the turn start.
    await expect(back).toBeDisabled();
    const here = spaceById.get(start.space ?? "");
    const first = here?.adjacent[0];
    expect(first).toBeTruthy();
    let before = await marker(device);
    await clickAct(device, "walk", `walk--${start.hero}--${first}`);
    await settle(device, before);
    expect((await readStatus(device)).moves).toBe(String(moves - 1));
    await expect(back).toBeEnabled();
    await testInfo.attach("move-map-after-tap", {
      body: await device.screenshot(),
      contentType: "image/png",
    });
    before = await marker(device);
    await back.click();
    await settle(device, before);
    const undone = await readStatus(device);
    expect(undone.space).toBe(start.space);
    expect(undone.moves).toBe(start.moves);
    await expect(back).toBeDisabled();
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("CU/05 Fix my position lives in Game board setup and moves the group for free (EV-07, EV-10)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const session = await hostFor(testInfo, "cu05-fix");
  const { context, board, device } = await openTable(browser, testInfo, session);
  try {
    const start = await readStatus(device);
    const target = spaces.spaces.find(
      (space) =>
        space.id !== start.space && !spaceById.get(start.space ?? "")?.adjacent.includes(space.id),
    );
    expect(target).toBeTruthy();
    await device.locator('button[data-action="menu"]').click();
    await device.locator('[data-gear-item="game-board-setup"]').click();
    const panel = device.locator('[data-gear-panel="game-board-setup"]');
    await expect(panel.locator("[data-setup-steps] li").first()).toBeVisible();
    await panel.locator("[data-fix-position-open]").click();
    await expect(panel.locator('[data-copy="fix-position-help"]')).toContainText(
      "It costs no moves and nothing starts.",
    );
    await expect(panel.getByText("Whose group?")).toBeVisible();
    await expect(panel.getByText("Where does it stand?")).toBeVisible();
    await panel.locator("[data-fix-position-space]").selectOption(target?.id ?? "");
    await testInfo.attach("fix-position", {
      body: await device.screenshot(),
      contentType: "image/png",
    });
    await panel.locator("[data-fix-position-set]").click();
    await expect(board.locator("[data-picked]")).toContainText("'s group is set on");
    await device.getByRole("button", { name: "Done", exact: true }).click();
    await expect.poll(async () => (await readStatus(device)).space).toBe(target?.id);
    expect((await readStatus(device)).moves).toBe(start.moves);
    for (const next of target?.adjacent ?? []) {
      await expect(
        device.locator(`button[data-prompt-id="walk--${start.hero}--${next}"]`),
      ).toHaveCount(1);
    }
  } finally {
    await context.close();
    await session.host.close();
  }
});
