import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Browser, type BrowserContext, expect, type Page, test } from "@playwright/test";
import { openDatabase } from "../../server/db/client.ts";
import { autosave, checkpoints } from "../../server/db/schema.ts";
import { createSessionStore } from "../../server/db/store.ts";
import { createEventStore } from "../../server/events/store.ts";
import { createHostLogger, type HostLogger } from "../../server/log/hostLog.ts";
import {
  enterWithoutTowerKeepSound,
  holdHeroesFromTest,
  installSessionSocketHook,
  setSoundAndKeep,
  startAcceptanceHost,
} from "./support/acceptance.ts";

/**
 * C4 / 01-tuning-switches, the survival evals.
 * EV-05: the tuning read at Begin stays fixed through Continue (C3 B2).
 * EV-06: a save written under the C3 switches is not offered for Continue (Q-C3-07).
 */

const STORY_ID = "test";
const HERO_IDS = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair-01", "grey-stair-02", "grey-stair-03", "grey-stair-04"] as const;
const SKIPPED_LOG = "save skipped: pre-C4 format";

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Own board and iPad viewports.");
});

const deviceMain = (page: Page) => page.locator("main.bt-device");

const clickAct = async (page: Page, actionId: string, promptId: string) => {
  const button = page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`);
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const openPad = async (browser: Browser, baseURL: string, joinCode: string) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 768, height: 1024 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await installSessionSocketHook(page);
  await page.goto(`/join?code=${joinCode}`);
  await expect(page).toHaveURL(/\/device/);
  return { context, page };
};

const closeAll = async (contexts: BrowserContext[]) => {
  for (const context of contexts) await context.close();
};

/** A copy of the repo's packs, so a test can edit the base tuning without touching the repo. */
const copyPacks = (): string => {
  const root = mkdtempSync(join(tmpdir(), "c4-01-packs-"));
  const source = join(import.meta.dirname, "../../../../../packs");
  for (const id of ["base", "test", "dracula"]) {
    cpSync(join(source, id), join(root, id), { recursive: true });
  }
  return root;
};

const editTuning = (packsDir: string, edit: (text: string) => string) => {
  const file = join(packsDir, "base", "tuning.yaml");
  const before = readFileSync(file, "utf8");
  const after = edit(before);
  expect(after).not.toBe(before);
  writeFileSync(file, after);
};

/** A host logger that keeps every warning it is given. */
const spyLogger = (dataDir: string): { log: HostLogger; warnings: string[] } => {
  const warnings: string[] = [];
  const real = createHostLogger({ dataDir, mirror: false });
  const log: HostLogger = {
    ...real,
    warn: (code, message, fields) => {
      warnings.push(message);
      real.warn(code, message, fields);
    },
  };
  return { log, warnings };
};

type SavedPlan = { checkpointId: number; plan: Record<string, unknown> };

/**
 * The applied chapter plan, from the newest checkpoint that holds one.
 *
 * `lastCheckpoint` orders by day descending, so the opening's day-1 snapshot (written before
 * `configureStoryPlay`, `chapters` null) hides the later day-0 markers. A quit writes one of
 * those with the plan fixed at Begin. The Continue press writes another of the restored game.
 */
const chapterPlanSaved = (databasePath: string): SavedPlan | null => {
  const opened = openDatabase(databasePath);
  try {
    const gameId = opened.db.select().from(autosave).all()[0]?.gameId;
    if (!gameId) return null;
    const rows = opened.db
      .select()
      .from(checkpoints)
      .all()
      .filter((row) => row.gameId === gameId)
      .sort((a, b) => b.id - a.id);
    for (const row of rows) {
      const state = JSON.parse(row.stateJson) as {
        chapters?: { plan?: Record<string, unknown> } | null;
      };
      if (state.chapters?.plan) return { checkpointId: row.id, plan: state.chapters.plan };
    }
    return null;
  } finally {
    opened.close();
  }
};

const playToBegin = async (pad: Page) => {
  await clickAct(pad, "continue", `continue-pick-story-${STORY_ID}`);
  await clickAct(pad, "continue", "continue-game-settings");
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "claim-heroes");
  await holdHeroesFromTest(pad, [...HERO_IDS]);
  await clickAct(pad, "continue", "continue-claim-heroes");
  for (const id of SETUP_IDS) {
    await expect(deviceMain(pad)).toHaveAttribute("data-setup-step", id, { timeout: 20_000 });
    if (id === "starting-purse") await clickAct(pad, "spin", "spin-setup-starting-purse");
    await clickAct(pad, "continue", `continue-setup-${id}`);
  }
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "begin", { timeout: 20_000 });
  await clickAct(pad, "continue", "continue-begin");
  for (const id of OPENING_IDS) await clickAct(pad, "continue", `continue-opening-${id}`);
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 20_000 });
};

const quitGame = async (pad: Page) => {
  const dismissWake = pad.locator('[data-action="dismiss-wake-notice"]');
  if ((await dismissWake.count()) > 0) await dismissWake.click();
  await pad.locator('[data-action="menu"]').click();
  await clickAct(pad, "quit-story", "menu-quit");
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", { timeout: 20_000 });
};

test("EV-05: the tuning read at Begin survives Continue, whatever the file says now (C3 B2)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  const packsDir = copyPacks();
  const seed = "c4-01-ev05";
  const first = await startAcceptanceHost(testInfo, { seed, packsDir });
  const { databasePath } = first;
  const contexts: BrowserContext[] = [];
  let atBegin: SavedPlan | null = null;
  try {
    const pad = await openPad(browser, first.baseURL, first.host.joinCode);
    contexts.push(pad.context);
    await enterWithoutTowerKeepSound(pad.page);
    await setSoundAndKeep(pad.page);
    await playToBegin(pad.page);
    await quitGame(pad.page);
    atBegin = chapterPlanSaved(databasePath);
    // The switches the game began under: the C4 values from the repo's tuning.
    expect(atBegin?.plan).toMatchObject({
      c3EndAfterChapter1: false,
      c4EndAfterChapter3: true,
    });
  } finally {
    await closeAll(contexts);
    await first.host.close();
  }

  // Edit the tuning file between Begin and Continue. Both switches move, so a re-read shows.
  editTuning(packsDir, (text) =>
    text
      .replace("c3_end_after_chapter_1: false", "c3_end_after_chapter_1: true")
      .replace("c4_end_after_chapter_3: true", "c4_end_after_chapter_3: false"),
  );

  const second = await startAcceptanceHost(testInfo, { databasePath, seed, packsDir });
  const next: BrowserContext[] = [];
  try {
    const pad = await openPad(browser, second.baseURL, second.host.joinCode);
    next.push(pad.context);
    // The evening already entered and quit to the session screen, so a restart resumes there.
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "session", {
      timeout: 30_000,
    });
    await clickAct(pad.page, "continue", "continue-saved-game");
    // Continue seats the saved party on the iPads joined now (CU/16): pick, then play goes on.
    // The saved game never linked a tower, so the re-pick does not open a tower pause.
    await holdHeroesFromTest(pad.page, [...HERO_IDS]);
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
    await quitGame(pad.page);
    const kept = chapterPlanSaved(databasePath);
    // A checkpoint written after Continue, not the Begin marker read again.
    expect(kept?.checkpointId).toBeGreaterThan(atBegin?.checkpointId ?? 0);
    // The game kept the Begin values; the edited file was not read.
    expect(kept?.plan).toEqual(atBegin?.plan);
  } finally {
    await closeAll(next);
    await second.host.close();
    rmSync(packsDir, { recursive: true, force: true });
  }
});

test("EV-06: a C3 save is not resumed under C4; one log line; a new game can Begin", async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  const databasePath = join(mkdtempSync(join(tmpdir(), "c4-01-save-")), "session.sqlite");
  // A save written under the C3 switches: format 2, the format before AUTOSAVE_FORMAT 3.
  // The autosave row references its session, so the parent row has to exist first.
  const opened = openDatabase(databasePath);
  try {
    createSessionStore(opened.db).saveRoster({
      sessionId: "session-old",
      packId: STORY_ID,
      packVersion: "0.1.0",
      startedWall: "2026-10-30T00:00:00.000Z",
      joinCode: "000000",
      devices: [],
      holdings: [],
    });
    createEventStore(opened.db).replaceAutosave({
      gameId: "c3-game",
      sessionId: "session-old",
      packId: STORY_ID,
    });
    opened.db.update(autosave).set({ format: 2 }).run();
  } finally {
    opened.close();
  }
  const { log, warnings } = spyLogger(join(tmpdir(), "c4-01-log"));
  const session = await startAcceptanceHost(testInfo, { databasePath, seed: "c4-01-ev06", log });
  const contexts: BrowserContext[] = [];
  try {
    expect(warnings.filter((line) => line.startsWith(SKIPPED_LOG))).toHaveLength(1);
    const pad = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(pad.context);
    await enterWithoutTowerKeepSound(pad.page);
    await setSoundAndKeep(pad.page);
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "pick-story");
    await expect(pad.page.locator('button[data-prompt-id="continue-saved-game"]')).toHaveCount(0);
    expect(warnings.filter((line) => line.startsWith(SKIPPED_LOG))).toHaveLength(1);
    // A new game can Begin.
    await playToBegin(pad.page);
  } finally {
    await closeAll(contexts);
    await session.host.close();
  }
});
