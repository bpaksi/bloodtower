import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type Browser, expect, type Page, type TestInfo, test } from "@playwright/test";
import { PLACE_CAPTION } from "../../engine/loops/session/placeCaption.ts";
import { openDatabase } from "../../server/db/client.ts";
import { createEventStore } from "../../server/events/store.ts";
import {
  type AcceptanceHost,
  captureFrames,
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
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
const PLACE_TYPES = ["village", "bazaar", "citadel", "sanctuary"] as const;
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

const nearestMissing = (start: string, seen: Set<string>): string[] | null => {
  const queue: string[][] = [[start]];
  const visited = new Set([start]);
  while (queue.length > 0) {
    const path = queue.shift();
    if (!path) break;
    const here = path.at(-1);
    const space = here ? spaceById.get(here) : undefined;
    if (!space) continue;
    if (path.length > 1 && space.building && !seen.has(space.building)) return path;
    for (const next of space.adjacent) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push([...path, next]);
    }
  }
  return null;
};

/** A building at least one step away, with one move left after the walk. */
const routeToEnter = (start: string, moves: number): string[] | null => {
  if (moves < 2) return null;
  const queue: string[][] = [[start]];
  const visited = new Set([start]);
  while (queue.length > 0) {
    const path = queue.shift();
    if (!path) break;
    const here = path.at(-1);
    const space = here ? spaceById.get(here) : undefined;
    if (!space) continue;
    const steps = path.length - 1;
    if (steps >= 1 && space.building && steps <= moves - 1) return path;
    if (steps >= moves - 1) continue;
    for (const next of space.adjacent) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push([...path, next]);
    }
  }
  return null;
};

const packFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...packFiles(path));
    else out.push(path);
  }
  return out;
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

test("W7 acting iPad move map spends one space and loses leftover moves", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const session = await hostFor(testInfo, "w7-move-map");
  const { context, board, device } = await openTable(browser, testInfo, session);
  try {
    expect(session.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "play");
    const now = await readStatus(device);
    expect(Number(now.moves)).toBeGreaterThanOrEqual(1);
    expect(now.inside).toBe("false");
    expect(now.hero).toBeTruthy();
    const here = now.space ? spaceById.get(now.space) : undefined;
    expect(here?.building).toBeTruthy();
    const map = device.locator("[data-move-map]");
    await expect(map).toHaveCount(1);
    const walks = map.locator('button[data-action-id="walk"]');
    await expect(walks).toHaveCount(here?.adjacent.length ?? 0);
    for (const nextId of here?.adjacent ?? []) {
      const promptId = `walk--${now.hero}--${nextId}`;
      const button = map.locator(`button[data-prompt-id="${promptId}"]`);
      await expect(button).toHaveCount(1);
      await expect(button).toHaveText(spaceById.get(nextId)?.name ?? nextId);
      await expect(button.locator("xpath=ancestor::*[@data-slot][1]")).toHaveCount(1);
    }
    await expect(map.locator("[data-slot]")).toHaveCount(8);
    expect(
      await map
        .locator("[data-slot]")
        .evaluateAll((els) => els.map((el) => el.getAttribute("data-slot"))),
    ).toEqual(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]);
    await expect(map.locator("[data-tower-up]")).toHaveCount(1);
    const you = map.locator("[data-you]");
    await expect(you).toContainText(here?.name ?? "");
    await expect(you).toContainText("YOU");
    await expect(map.getByText("Also adjacent")).toHaveCount(0);
    await expect(device.locator('[data-ipad-corners="theme-b"]')).toHaveCount(1);
    for (const corner of ["tl", "tr", "bl", "br"]) {
      await expect(device.locator(`[data-ipad-corner="${corner}"]`)).toHaveCount(1);
    }
    expect(
      await map
        .locator("[data-slot]")
        .evaluateAll((els) => els.map((el) => el.textContent?.trim())),
    ).not.toContain("N");
    const stranger = spaces.spaces.find(
      (space) => space.id !== here?.id && !here?.adjacent.includes(space.id),
    );
    expect(stranger).toBeTruthy();
    await expect(
      device.locator(`button[data-prompt-id="walk--${now.hero}--${stranger?.id}"]`),
    ).toHaveCount(0);
    const end = map.locator('button[data-action-id="end-turn"]');
    await expect(end).toHaveAttribute("data-prompt-id", `end-turn--${now.hero}`);
    await expect(end).toContainText("End turn");
    if (here?.building) {
      const enter = map.locator(`button[data-prompt-id="enter--${now.hero}--${here.id}"]`);
      await expect(enter).toContainText(`Enter ${buildingTitle(here.building)}`);
    }
    await expect(map.locator("img, canvas")).toHaveCount(0);
    await expect(map.locator("svg")).not.toHaveCount(0);
    await expect(device.locator("main img, main canvas")).toHaveCount(0);
    await expect(device.locator("[data-mini], [data-token], [data-board-map]")).toHaveCount(0);

    await expect(board.locator("main.bt-board")).toHaveAttribute("data-board-mode", "play");
    await expect(board.locator(".bt-board-warning")).toHaveCount(0);
    await expect(board.getByText("Paused.")).toHaveCount(0);
    // The landing painting (W6 backdrop) sits under every layer. The band leads the rest.
    const first = board.locator("main.bt-board > :not(.bt-board-backdrop)").first();
    expect(await first.evaluate((el) => el.hasAttribute("data-band"))).toBe(true);
    const band = board.locator("[data-band]");
    const waiting = board.locator("[data-waiting]");
    await expect(band).toBeVisible();
    await expect(waiting).toHaveCount(1);
    const bandBox = await band.boundingBox();
    const waitBox = await waiting.boundingBox();
    const mainBox = await board.locator("main.bt-board").boundingBox();
    expect(bandBox && waitBox && mainBox).toBeTruthy();
    if (bandBox && waitBox && mainBox) {
      expect(bandBox.y + bandBox.height).toBeLessThanOrEqual(waitBox.y + 1);
      const topGap = bandBox.y - mainBox.y;
      const bottomGap = mainBox.y + mainBox.height - (bandBox.y + bandBox.height);
      expect(topGap).toBeLessThan(bottomGap);
    }
    // One health mark per seated hero (W6).
    const health = band.locator("[data-health]");
    await expect(health).toHaveCount(HERO_IDS.length);
    for (const mark of await health.all()) {
      await expect(mark).toHaveText(/unavailable/);
      expect(await mark.innerText()).not.toMatch(/\b0\b/);
    }
    await expect(band.locator("[data-purse]")).toHaveText(/unavailable/);
    expect(await band.locator("[data-purse]").innerText()).not.toMatch(/\b0\b/);
    await expect(board.locator("[data-chapter]")).toHaveText("Proving Grounds");
    await expect(board.locator("[data-day]")).toHaveText(/^Day \d+$/);
    await expect(board.locator("[data-acting]")).toHaveText(heroName(now.hero));
    await expect(board.locator("[data-moves]")).toHaveAttribute("data-moves", now.moves ?? "");
    await expect(waiting).toHaveAttribute("role", "status");
    await expect(waiting).toHaveClass(/bt-waiting-pulse/);
    await expect(waiting).toHaveText(new RegExp(`${heroName(now.hero)} is choosing`));
    await expect(board.locator("main.bt-board img")).toHaveCount(0);
    await expect(board.locator("[data-still]")).toHaveCount(0);
    await expect(board.locator("[data-place]")).toHaveCount(0);
    await expect(board.locator("[data-waiting-dialog]")).toHaveCount(0);
    const marked = await board.locator("main.bt-board").evaluate((main) =>
      [...main.querySelectorAll("*")].some((node) => {
        const src = (node.getAttribute("src") ?? "").toLowerCase();
        const still = (node.getAttribute("data-still") ?? "").toLowerCase();
        return /wash|\.mark|hero\.[a-z0-9-]+\.mark|board\.wash|\/map/.test(`${src} ${still}`);
      }),
    );
    expect(marked).toBe(false);
    const packRoot = join(import.meta.dirname, "../../../../../packs/test");
    const packText = [readFileSync(join(packRoot, "pack.yaml"), "utf8"), ...packFiles(packRoot)]
      .join("\n")
      .toLowerCase();
    expect(packText).not.toContain("board.wash");
    expect(packText).not.toMatch(/hero\.[a-z0-9-]+\.mark/);
    // W6 took the text roster off the Story board. It stays on the iPad.
    await expect(board.locator("[data-roster]")).toHaveCount(0);

    const motionName = await waiting.evaluate((el) => getComputedStyle(el).animationName);
    expect(motionName).toBe("bt-waiting-pulse");
    const reduced = await browser.newContext({
      baseURL: session.baseURL,
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const reducedBoard = await reduced.newPage();
    try {
      await reducedBoard.goto("/board");
      const reducedLine = reducedBoard.locator("[data-waiting]");
      await expect(reducedLine).toBeVisible();
      await expect(reducedLine).toHaveText(/is choosing/);
      const reducedName = await reducedLine.evaluate((el) => getComputedStyle(el).animationName);
      expect(reducedName).toBe("none");
      await expect(reducedBoard.locator("[data-band]")).toBeVisible();
      await expect(reducedBoard.locator("[data-waiting-dialog]")).toHaveCount(0);
    } finally {
      await reduced.close();
    }

    const nextId = here?.adjacent[0];
    expect(nextId).toBeTruthy();
    const beforeWalk = await marker(device);
    const movesBefore = Number(now.moves);
    await device.locator(`button[data-prompt-id="walk--${now.hero}--${nextId}"]`).click();
    await settle(device, beforeWalk);
    const walked = await readStatus(device);
    expect(walked.space).toBe(nextId);
    expect(Number(walked.moves)).toBe(movesBefore - 1);
    expect(walked.inside).toBe("false");
    expect(walked.hero).toBe(now.hero);
    await expect(device.locator("[data-move-map] button[data-action-id='end-turn']")).toBeVisible();
    await expect(board.locator("[data-waiting]")).toBeVisible();

    const leftover = Number(walked.moves);
    expect(leftover).toBeGreaterThanOrEqual(1);
    const beforeEnd = await marker(device);
    await clickAct(device, "end-turn", `end-turn--${now.hero}`);
    await settle(device, beforeEnd);
    await expect(device.locator(`[data-prompt-id^="walk--${now.hero}--"]`)).toHaveCount(0);
    await expect(device.locator(`[data-prompt-id="end-turn--${now.hero}"]`)).toHaveCount(0);
    await expect(device.getByText(/\brest\b/i)).toHaveCount(0);
    const next = await readStatus(device);
    const skull = device.locator('button[data-prompt-id*="skull-drop"]');
    if ((await skull.count()) > 0) {
      await expect(device.locator("[data-move-map]")).toHaveCount(0);
    } else {
      expect(next.hero).not.toBe(now.hero);
      expect(Number(next.moves)).toBe(Number(next.roll));
      expect(Number(next.moves)).not.toBe(leftover + Number(next.roll));
      await expect(device.locator("[data-move-map]")).toBeVisible();
      const offered = device.locator('[data-move-map] button[data-action-id="walk"]');
      const count = await offered.count();
      expect(count).toBeGreaterThan(0);
      for (let index = 0; index < count; index += 1) {
        const promptId = await offered.nth(index).getAttribute("data-prompt-id");
        expect(promptId?.startsWith(`walk--${next.hero}--`)).toBe(true);
      }
    }

    let sawSkull = (await skull.count()) > 0;
    for (let guard = 0; !sawSkull && guard < 6; guard += 1) {
      const acting = await readStatus(device);
      const before = await marker(device);
      const groupLeftover = Number(acting.moves);
      await clickAct(device, "end-turn");
      await settle(device, before);
      const skullNow = device.locator('button[data-prompt-id*="skull-drop"]');
      if ((await skullNow.count()) > 0) {
        sawSkull = true;
        await expect(device.locator("[data-move-map]")).toHaveCount(0);
        await expect(device.locator(`[data-prompt-id^="walk--${acting.hero}--"]`)).toHaveCount(0);
        await expect(device.getByText(/\brest\b/i)).toHaveCount(0);
        expect(groupLeftover).toBeGreaterThanOrEqual(1);
        break;
      }
      const followed = await readStatus(device);
      expect(followed.hero).not.toBe(acting.hero);
      expect(Number(followed.moves)).toBe(Number(followed.roll));
      expect(Number(followed.moves)).not.toBe(groupLeftover + Number(followed.roll));
    }
    expect(sawSkull).toBe(true);
    await expect(board.locator("[data-band]")).toBeVisible();
    await expect(board.locator("[data-waiting-dialog]")).toHaveCount(0);
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("W7 Enter shows the place still on the story board and Leave is the only place action", async ({
  browser,
}, testInfo) => {
  test.setTimeout(240_000);
  const session = await hostFor(testInfo, "w7-enter");
  const { context, board, device } = await openTable(browser, testInfo, session);
  try {
    const opened = await readStatus(device);
    expect(opened.inside).toBe("false");
    if (opened.building && Number(opened.moves) > 0) {
      await expect(
        device.locator('[data-move-map] button[data-action-id="walk"]').first(),
      ).toBeVisible();
      await expect(
        device.locator(
          `[data-move-map] button[data-prompt-id="enter--${opened.hero}--${opened.space}"]`,
        ),
      ).toBeVisible();
    }

    const seen = new Set<string>();
    let steps = 0;
    while (seen.size < PLACE_TYPES.length && steps < 90) {
      steps += 1;
      const now = await readStatus(device);
      const before = await marker(device);
      const rollButton = device.locator('button[data-prompt-id*="roll-done"]');
      if ((await rollButton.count()) > 0) {
        await rollButton.click();
        await settle(device, before);
        continue;
      }
      const skull = device.locator('button[data-prompt-id*="skull-drop"]');
      if ((await skull.count()) > 0) {
        await skull.click();
        await settle(device, before);
        continue;
      }
      const record = device.locator('button[data-action-id="record"]');
      if ((await record.count()) > 0) {
        const inside = device.locator('button[data-prompt-id$="--inside"]');
        if ((await inside.count()) > 0) await inside.click();
        else await record.first().click();
        await settle(device, before);
        continue;
      }
      if (now.inside === "true" && now.building && now.building in PLACE_CAPTION) {
        const building = now.building as (typeof PLACE_TYPES)[number];
        const caption = PLACE_CAPTION[building];
        await expect(board.locator("[data-still]")).toHaveAttribute(
          "data-still",
          `place.${building}`,
        );
        await expect(board.locator("figcaption")).toHaveText(caption);
        const src = await board.locator("[data-place] img").getAttribute("src");
        expect(src).toBeTruthy();
        const image = await device.request.get(src ?? "");
        expect(image.status()).toBe(200);
        await expect(device.locator("main img")).toHaveCount(0);
        await expect(device.getByText(caption)).toHaveCount(0);
        await expect(device.locator("[data-move-map]")).toHaveCount(0);
        await expect(device.locator('button[data-action-id="walk"]')).toHaveCount(0);
        await expect(device.locator('button[data-action-id="end-turn"]')).toHaveCount(0);
        const placeButtons = device.locator("main button[data-action-id]");
        await expect(placeButtons).toHaveCount(1);
        await expect(placeButtons).toHaveAttribute("data-action-id", "leave");
        await expect(placeButtons).toContainText("Leave");
        const labels = await device.locator("main button").allInnerTexts();
        for (const label of labels) {
          expect(label).not.toMatch(/search|fight|talk|event|foe|battle/i);
        }
        // The place still fills the board, so the band and the waiting line hide (DEC-190, W6).
        await expect(board.locator("main.bt-board")).toHaveAttribute("data-board-layer", "place");
        await expect(board.locator("[data-waiting]")).toHaveCount(0);
        await expect(board.locator("[data-waiting-dialog]")).toHaveCount(0);
        await expect(board.locator("[data-band]")).toHaveCount(0);
        const moves = now.moves;
        await clickAct(device, "leave", `leave--${now.hero}`);
        await settle(device, before);
        const after = await readStatus(device);
        expect(after.inside).toBe("false");
        if (moves && Number(moves) > 0) {
          // Leave spends no move and brings the move map back (W7-step-1 l.40).
          expect(after.moves).toBe(moves);
          expect(after.space).toBe(now.space);
          await expect(device.locator("[data-move-map]")).toBeVisible();
          await expect(board.locator("[data-still]")).toHaveCount(0);
          await expect(board.locator("[data-place]")).toHaveCount(0);
          await expect(board.locator("main.bt-board img")).toHaveCount(0);
        } else {
          // Entered with no moves left: Leave ends the group's turn, and the next
          // offer is the next move roll or the skull prompt (W7-step-1 l.36).
          const nextOffer = await device
            .locator('button[data-prompt-id*="roll-done"], button[data-prompt-id*="skull-drop"]')
            .count();
          const turnPassed =
            after.hero !== now.hero ||
            after.day !== now.day ||
            Number(after.moves) > 0 ||
            nextOffer > 0;
          expect(turnPassed).toBe(true);
          await expect(board.locator("[data-place]")).toHaveCount(0);
        }
        seen.add(building);
        continue;
      }
      if (now.building && !seen.has(now.building) && now.building in PLACE_CAPTION) {
        if (Number(now.moves) > 0) {
          await expect(
            device.locator('[data-move-map] button[data-action-id="walk"]').first(),
          ).toBeVisible();
          await expect(
            device.locator('[data-move-map] button[data-action-id="enter"]'),
          ).toBeVisible();
        }
        const moves = now.moves;
        await clickAct(device, "enter", `enter--${now.hero}--${now.space}`);
        await settle(device, before);
        expect((await readStatus(device)).moves).toBe(moves);
        expect((await readStatus(device)).inside).toBe("true");
        continue;
      }
      if (!now.moves || Number(now.moves) < 1) {
        const end = device.locator('button[data-action-id="end-turn"]');
        if ((await end.count()) > 0) {
          await end.click();
          await settle(device, before);
        } else await device.waitForTimeout(50);
        continue;
      }
      const path = now.space ? nearestMissing(now.space, seen) : null;
      const nextId = path?.[1];
      const here = now.space ? spaceById.get(now.space) : undefined;
      if (!nextId || !here?.adjacent.includes(nextId)) {
        await clickAct(device, "end-turn");
        await settle(device, before);
        continue;
      }
      await device.locator(`button[data-prompt-id="walk--${now.hero}--${nextId}"]`).click();
      await settle(device, before);
    }
    expect([...seen].sort()).toEqual([...PLACE_TYPES].sort());
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("W7 continue keeps an entered place and Leave returns to the move map", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const session = await hostFor(testInfo, "w7-continue");
  const { databasePath } = session;
  const { context, device } = await openTable(browser, testInfo, session);
  let snapshot: Awaited<ReturnType<typeof readStatus>> | null = null;
  let building: string | null = null;
  try {
    let entered = false;
    for (let guard = 0; !entered && guard < 8; guard += 1) {
      const now = await readStatus(device);
      const moves = Number(now.moves);
      const route = now.space ? routeToEnter(now.space, moves) : null;
      if (!route) {
        const before = await marker(device);
        await clickAct(device, "end-turn");
        await settle(device, before);
        continue;
      }
      for (const step of route.slice(1)) {
        const before = await marker(device);
        const prior = Number((await readStatus(device)).moves);
        await device.locator(`button[data-prompt-id="walk--${now.hero}--${step}"]`).click();
        await settle(device, before);
        expect(Number((await readStatus(device)).moves)).toBe(prior - 1);
      }
      const atDoor = await readStatus(device);
      expect(atDoor.inside).toBe("false");
      expect(atDoor.building).toBeTruthy();
      const movesAtDoor = atDoor.moves;
      const beforeEnter = await marker(device);
      await clickAct(device, "enter", `enter--${atDoor.hero}--${atDoor.space}`);
      await settle(device, beforeEnter);
      const inside = await readStatus(device);
      expect(inside.inside).toBe("true");
      expect(inside.moves).toBe(movesAtDoor);
      expect(Number(inside.moves)).toBeGreaterThanOrEqual(1);
      snapshot = inside;
      building = inside.building;
      entered = true;
    }
    expect(entered).toBe(true);
    expect(await device.getByText(/seed/i).count()).toBe(0);
    expect(checkpointSeed(databasePath)).toBe("w7-continue");
    expect(session.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);
  } finally {
    await context.close();
    await session.host.close();
  }

  const restarted = await startAcceptanceHost(testInfo, {
    databasePath,
    seed: "w7-continue",
    lanHost: REACHABLE_JOIN,
  });
  const context2 = await browser.newContext({
    baseURL: restarted.baseURL,
    viewport: testInfo.project.use.viewport ?? { width: 1280, height: 720 },
  });
  const board = await context2.newPage();
  await board.setViewportSize({ width: 1440, height: 900 });
  const frames = captureFrames(board);
  const page = await context2.newPage();
  try {
    await board.goto("/board");
    await installSessionSocketHook(page);
    await page.goto(`/join?code=${restarted.host.joinCode}`);
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "pick-game");
    await clickAct(page, "continue", "continue-pick-game");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "play");
    const restored = await readStatus(page);
    expect(restored.inside).toBe("true");
    expect(restored.space).toBe(snapshot?.space);
    expect(restored.moves).toBe(snapshot?.moves);
    expect(restored.day).toBe(snapshot?.day);
    expect(restored.hero).toBe(snapshot?.hero);
    // Inside a place the band, and its chapter, hide behind the still (DEC-190, W6).
    await expect(board.locator("main.bt-board")).toHaveAttribute("data-board-layer", "place");
    await expect(board.locator("[data-chapter]")).toHaveCount(0);
    await expect.poll(() => frames.some((frame) => frame.includes('"screen":"play"'))).toBe(true);
    const held = frames
      .map(
        (frame) =>
          JSON.parse(frame) as {
            type?: string;
            payload?: { screen?: string; heroes?: { id: string; held: boolean }[] };
          },
      )
      .filter((message) => message.type === "boardView" && message.payload?.screen === "play")
      .at(-1);
    expect(
      held?.payload?.heroes
        ?.filter((hero) => hero.held)
        .map((hero) => hero.id)
        .sort(),
    ).toEqual([...HERO_IDS].sort());
    await expect(board.locator("[data-still]")).toHaveAttribute("data-still", `place.${building}`);
    await expect(page.locator("[data-roster]")).toContainText("Hero A");
    await expect(page.locator("[data-roster]")).toContainText("Hero B");
    await expect(page.locator("[data-roster]")).toContainText("Hero C");
    await expect(page.locator("[data-roster]")).toContainText("Hero D");
    await expect(page.locator('button[data-action-id="reconnect"]')).toHaveCount(0);
    expect(restarted.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);
    expect(checkpointSeed(databasePath)).toBe("w7-continue");
    expect(await page.getByText(/seed/i).count()).toBe(0);
    await expect(board.locator("[data-waiting]")).toHaveCount(0);
    await expect(board.locator("[data-waiting-dialog]")).toHaveCount(0);
    const beforeLeave = await marker(page);
    await clickAct(page, "leave", `leave--${restored.hero}`);
    await settle(page, beforeLeave);
    const outside = await readStatus(page);
    expect(outside.inside).toBe("false");
    expect(outside.moves).toBe(restored.moves);
    expect(outside.space).toBe(restored.space);
    await expect(page.locator("[data-move-map]")).toBeVisible();
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "play");
    await expect(board.locator("[data-still]")).toHaveCount(0);
    await expect(board.locator("[data-band]")).toBeVisible();
  } finally {
    await context2.close();
    await restarted.host.close();
  }
});
