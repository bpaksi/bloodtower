import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { openDatabase } from "../../server/db/client.ts";
import { createEventStore } from "../../server/events/store.ts";
import {
  gateControls,
  holdHeroesFromTest,
  installSessionSocketHook,
  releaseTogether,
  startAcceptanceHost,
} from "./support/acceptance.ts";

const STORY_ID = "test";
const HERO_IDS = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const PLACE_TYPES = ["village", "bazaar", "citadel", "sanctuary"] as const;

const CAPTION: Record<(typeof PLACE_TYPES)[number], string> = {
  village: "Quiet roofs. A well, a few doors. Nothing stirs.",
  bazaar: "Stalls stand empty. The cloth still smells of spice.",
  citadel: "Stone walls, a closed gate. The kingdom\u2019s mark above the door.",
  sanctuary: "A low stone sanctuary. The door is shut, but the threshold is dry.",
};

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
    modifier: await line.getAttribute("data-modifier"),
  };
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

const marker = async (page: Page) => {
  const now = await readStatus(page);
  return `${now.hero}|${now.space}|${now.inside}|${now.moves}|${now.day}|${await offerIds(page)}`;
};

const settle = async (page: Page, before: string) => {
  await expect.poll(async () => marker(page), { timeout: 15_000 }).not.toBe(before);
};

const finishSetup = async (page: Page) => {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const screen = await deviceMain(page).getAttribute("data-screen");
    if (screen === "play") return;
    if (screen === "setup") {
      await clickAct(page, "continue");
      continue;
    }
    if (screen === "begin") {
      await holdHeroesFromTest(page, [...HERO_IDS]);
      await clickAct(page, "continue", "continue-begin");
      await expect(deviceMain(page)).toHaveAttribute("data-screen", "play", { timeout: 20_000 });
      return;
    }
    if (screen === "claim-heroes") {
      await page.waitForTimeout(50);
      continue;
    }
    throw new Error(`Unexpected setup screen: ${screen}`);
  }
  throw new Error("Setup did not reach play.");
};

const skipTowerToClaim = async (page: Page, joinCode: string) => {
  await installSessionSocketHook(page);
  await page.goto(`/join?code=${joinCode}`);
  await expect(page).toHaveURL(/\/device/);
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "splash");
  await clickAct(page, "continue", "splash-play");
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "pick-story");
  await clickAct(page, "continue", `continue-pick-story-${STORY_ID}`);
  await clickAct(page, "continue", "continue-game-settings");
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "claim-heroes");
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

test("AREA-077 cold start plays, enters every place, and leaves the session", async ({
  browser,
}, testInfo) => {
  test.setTimeout(240_000);
  const session = await startAcceptanceHost(testInfo, { seed: "area-077-cold" });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const board = await context.newPage();
  const device = await context.newPage();
  try {
    await board.goto("/board");
    await expect(board.locator("main :is(button, input, textarea, select)")).toHaveCount(0);
    await skipTowerToClaim(device, session.host.joinCode);
    expect(session.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);

    await holdHeroesFromTest(device, ["hero-a"]);
    const contextB = await browser.newContext({ baseURL: session.baseURL });
    const other = await contextB.newPage();
    await installSessionSocketHook(other);
    await other.goto(`/join?code=${session.host.joinCode}`);
    await expect(deviceMain(other)).toHaveAttribute("data-screen", "claim-heroes");
    const claimed = other.locator('button[data-hunter="hero-a"]');
    await expect(claimed).toBeDisabled();
    await expect(claimed).toHaveAttribute("data-claim", "taken");
    await contextB.close();

    await holdHeroesFromTest(device, [...HERO_IDS]);
    await clickAct(device, "continue", "continue-claim-heroes");
    await finishSetup(device);

    await expect(board.locator("[data-kingdom='Arisilon (N)']")).toContainText("Radiant Mountains");
    await expect(board.locator("[data-kingdom='Brynthia (E)']")).toContainText("Inner Kinghills");
    await expect(board.locator("[data-kingdom='Durnin (S)']")).toContainText("Howling Desert");
    await expect(board.locator("[data-kingdom='Zenon (W)']")).toContainText("Hissing Groves");
    await expect(board.locator("[data-alone='true']")).toHaveCount(4);
    await expect(device.locator('button[data-action-id="split"]')).toHaveCount(0);
    await expect(device.locator('button[data-action-id="join"]')).toHaveCount(0);

    await expect(board.locator("[data-band] [data-health]")).toHaveText(/unavailable/);
    await expect(board.locator("[data-band] [data-purse]")).toHaveText(/unavailable/);
    await expect(board.locator("[data-chapter]")).toHaveText("Proving Grounds");
    await expect(board.locator("[data-day]")).toHaveText(/Day \d+/);
    await expect(board.locator("[data-waiting]")).toHaveText(/is choosing/);
    await expect(device.locator("[data-topbar]")).toBeVisible();
    await expect(device.locator('[data-action="back"]')).toBeDisabled();
    await expect(device.locator('[data-action="replay"]')).toBeDisabled();
    await expect(device.locator('[data-action="menu"]')).toBeVisible();
    await expect(device.locator("main img")).toHaveCount(0);

    const rolled = await readStatus(device);
    expect(Number(rolled.roll)).toBeGreaterThanOrEqual(2);
    expect(Number(rolled.roll)).toBeLessThanOrEqual(8);
    expect(rolled.modifier).toBe("none");
    expect(await deviceMain(device).innerText()).not.toMatch(/modifier|\+\d/i);
    await clickAct(device, "continue");
    await expect.poll(async () => (await readStatus(device)).moves).not.toBeNull();

    const seen = new Set<string>();
    const tourHero = (await readStatus(device)).hero;
    expect(tourHero).toBeTruthy();
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
      if (now.hero && now.hero !== tourHero) {
        await clickAct(device, "end-turn");
        await settle(device, before);
        continue;
      }
      if (now.inside === "true" && now.building && now.building in CAPTION) {
        const building = now.building as (typeof PLACE_TYPES)[number];
        await expect(board.locator("figcaption")).toHaveText(CAPTION[building]);
        await expect(board.locator("[data-still]")).toHaveAttribute(
          "data-still",
          `place.${building}`,
        );
        await expect(device.getByText(CAPTION[building])).toHaveCount(0);
        await expect(device.locator("main img")).toHaveCount(0);
        const src = await board.locator("[data-place] img").getAttribute("src");
        expect(src).toBeTruthy();
        const image = await device.request.get(src ?? "");
        expect(image.status()).toBe(200);
        const moves = now.moves;
        const hero = now.hero;
        await clickAct(device, "leave");
        await settle(device, before);
        const afterLeave = await readStatus(device);
        if (moves && Number(moves) > 0) {
          expect(afterLeave.hero).toBe(hero);
          expect(afterLeave.moves).toBe(moves);
        }
        seen.add(building);
        continue;
      }
      if (now.building && !seen.has(now.building) && now.building in CAPTION) {
        if (Number(now.moves) > 0) {
          await expect(device.locator('button[data-action-id="walk"]').first()).toBeVisible();
        }
        const moves = now.moves;
        await clickAct(device, "enter");
        await settle(device, before);
        expect((await readStatus(device)).moves).toBe(moves);
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
      const next = spaceById.get(nextId);
      const walk = device.locator(`button[data-prompt-id="walk--${tourHero}--${nextId}"]`);
      await expect(walk).toContainText(next?.name ?? nextId);
      await walk.click();
      await settle(device, before);
    }
    expect([...seen].sort()).toEqual([...PLACE_TYPES].sort());

    await device.locator('[data-action="menu"]').click();
    await clickAct(device, "quit-story", "menu-quit");
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "session");
    const offered = device.locator("main button[data-action-id]");
    await expect(offered).toHaveCount(2);
    await expect(device.locator('button[data-action-id="new-game"]')).toBeVisible();
    await expect(device.locator('button[data-action-id="done-for-tonight"]')).toBeVisible();
    await clickAct(device, "done-for-tonight", "session-done-tonight");
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "goodbye");
    expect(session.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("AREA-077 one shared press wins and a private line stays on its iPad", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo);
  const contextA = await browser.newContext({ baseURL: session.baseURL });
  const contextB = await browser.newContext({ baseURL: session.baseURL });
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const gateA = await gateControls(pageA);
  const gateB = await gateControls(pageB);
  try {
    await skipTowerToClaim(pageA, session.host.joinCode);
    await installSessionSocketHook(pageB);
    await pageB.goto(`/join?code=${session.host.joinCode}`);
    await expect(deviceMain(pageB)).toHaveAttribute("data-screen", "claim-heroes");
    await holdHeroesFromTest(pageA, ["hero-a", "hero-b"]);
    await holdHeroesFromTest(pageB, ["hero-c", "hero-d"]);
    await expect(pageA.getByText("Only Hero A hears this.")).toBeVisible();
    await expect(pageA.getByText("Only Hero D hears this.")).toHaveCount(0);
    await expect(pageB.getByText("Only Hero D hears this.")).toBeVisible();
    await expect(pageB.getByText("Only Hero A hears this.")).toHaveCount(0);

    gateA.hold();
    gateB.hold();
    await clickAct(pageA, "continue", "continue-claim-heroes");
    await clickAct(pageB, "continue", "continue-claim-heroes");
    await gateA.held(1);
    await gateB.held(1);
    expect(releaseTogether(gateA, gateB)).toBe(2);
    await expect
      .poll(() =>
        session.host
          .loadRun()
          .presses.filter((press) => press.promptId === "continue-claim-heroes"),
      )
      .toHaveLength(2);
    const presses = session.host
      .loadRun()
      .presses.filter((press) => press.promptId === "continue-claim-heroes");
    expect(presses.filter((press) => press.winner)).toHaveLength(1);
  } finally {
    await contextA.close();
    await contextB.close();
    await session.host.close();
  }
});

test("AREA-077 continue after a walk stays in play when the tower was never connected", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "area-077-continue" });
  const { databasePath } = session;
  const context = await browser.newContext({ baseURL: session.baseURL });
  const device = await context.newPage();
  let snapshot: Awaited<ReturnType<typeof readStatus>> | null = null;
  try {
    await skipTowerToClaim(device, session.host.joinCode);
    await holdHeroesFromTest(device, [...HERO_IDS]);
    await clickAct(device, "continue", "continue-claim-heroes");
    await finishSetup(device);
    await clickAct(device, "continue");
    await device.locator('[data-action="menu"]').click();
    await expect(device.locator('button[data-prompt-id="menu-connect"]')).toBeVisible();
    await device.locator('[data-action="menu"]').click();
    const before = await readStatus(device);
    expect(Number(before.moves)).toBeGreaterThanOrEqual(2);
    const here = before.space ? spaceById.get(before.space) : undefined;
    const nextId = here?.adjacent[0];
    expect(nextId).toBeTruthy();
    await device.locator(`button[data-prompt-id="walk--${before.hero}--${nextId}"]`).click();
    await expect.poll(async () => (await readStatus(device)).space).toBe(nextId);
    snapshot = await readStatus(device);
    expect(snapshot.space).toBe(nextId);
    expect(Number(snapshot.moves)).toBe(Number(before.moves) - 1);
    session.tower.loseConnection();
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "play");
    expect(await device.getByText(/seed/i).count()).toBe(0);
    expect(checkpointSeed(databasePath)).toBe("area-077-continue");
  } finally {
    await context.close();
    await session.host.close();
  }

  const restarted = await startAcceptanceHost(testInfo, {
    databasePath,
    seed: "area-077-continue",
  });
  const context2 = await browser.newContext({ baseURL: restarted.baseURL });
  const page = await context2.newPage();
  try {
    await installSessionSocketHook(page);
    await page.goto(`/join?code=${restarted.host.joinCode}`);
    await clickAct(page, "continue", "splash-play");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "pick-game");
    await clickAct(page, "continue", "continue-pick-game");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "play");
    await holdHeroesFromTest(page, [...HERO_IDS]);
    const restored = await readStatus(page);
    expect(restored.space).toBe(snapshot?.space);
    expect(restored.moves).toBe(snapshot?.moves);
    expect(restored.day).toBe(snapshot?.day);
    expect(restored.hero).toBe(snapshot?.hero);
    const here = restored.space ? spaceById.get(restored.space) : undefined;
    const nextId = here?.adjacent[0];
    expect(nextId).toBeTruthy();
    await page.locator(`button[data-prompt-id="walk--${restored.hero}--${nextId}"]`).click();
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "play");
    expect((await readStatus(page)).space).toBe(nextId);
  } finally {
    await context2.close();
    await restarted.host.close();
  }
});

test("AREA-077 a connected tower pauses on drop and a never-connected one does not", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const cold = await startAcceptanceHost(testInfo, { seed: "area-077-off" });
  const coldContext = await browser.newContext({ baseURL: cold.baseURL });
  const coldDevice = await coldContext.newPage();
  try {
    await skipTowerToClaim(coldDevice, cold.host.joinCode);
    await holdHeroesFromTest(coldDevice, [...HERO_IDS]);
    await clickAct(coldDevice, "continue", "continue-claim-heroes");
    await finishSetup(coldDevice);
    cold.tower.loseConnection();
    await expect(deviceMain(coldDevice)).toHaveAttribute("data-screen", "play");
    await expect(deviceMain(coldDevice).locator('button[data-action-id="reconnect"]')).toHaveCount(
      0,
    );
  } finally {
    await coldContext.close();
    await cold.host.close();
  }

  const linked = await startAcceptanceHost(testInfo, { seed: "area-077-on" });
  const context = await browser.newContext({ baseURL: linked.baseURL });
  const device = await context.newPage();
  try {
    await installSessionSocketHook(device);
    await device.goto(`/join?code=${linked.host.joinCode}`);
    await clickAct(device, "tower-connect", "tower-connect");
    await clickAct(device, "tower-calibrate", "tower-calibrate");
    await clickAct(device, "new-game", "new-pick-game");
    await clickAct(device, "continue", `continue-pick-story-${STORY_ID}`);
    await clickAct(device, "continue", "continue-game-settings");
    await holdHeroesFromTest(device, [...HERO_IDS]);
    await clickAct(device, "continue", "continue-claim-heroes");
    await finishSetup(device);
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "play");
    linked.tower.loseConnection();
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "pause", { timeout: 20_000 });
    await expect(device.locator('button[data-action-id="reconnect"]')).toBeVisible();
    await expect(device.locator('button[data-action-id="quit-story"]')).toBeVisible();
  } finally {
    await context.close();
    await linked.host.close();
  }
});
