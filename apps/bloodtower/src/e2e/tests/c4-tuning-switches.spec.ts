import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Browser, type BrowserContext, expect, type Page, test } from "@playwright/test";
import { openDatabase } from "../../server/db/client.ts";
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

const withStore = <T>(
  databasePath: string,
  read: (store: ReturnType<typeof createEventStore>) => T,
) => {
  const opened = openDatabase(databasePath);
  try {
    return read(createEventStore(opened.db));
  } finally {
    opened.close();
  }
};

const chapterPlanSaved = (databasePath: string) =>
  withStore(databasePath, (store) => {
    const gameId = store.getAutosave()?.gameId;
    const json = gameId ? store.lastCheckpoint(gameId)?.stateJson : undefined;
    if (!json) return null;
    const state = JSON.parse(json) as { chapters?: { plan?: Record<string, unknown> } | null };
    return state.chapters?.plan ?? null;
  });

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
  let atBegin: Record<string, unknown> | null = null;
  try {
    const pad = await openPad(browser, first.baseURL, first.host.joinCode);
    contexts.push(pad.context);
    await enterWithoutTowerKeepSound(pad.page);
    await setSoundAndKeep(pad.page);
    await playToBegin(pad.page);
    await quitGame(pad.page);
    atBegin = chapterPlanSaved(databasePath);
    // The switches the game began under: the C4 values from the repo's tuning.
    expect(atBegin).toMatchObject({ c3EndAfterChapter1: false });
  } finally {
    await closeAll(contexts);
    await first.host.close();
  }

  // Edit the tuning file between Begin and Continue: the C3 end back on.
  editTuning(packsDir, (text) =>
    text.replace("c3_end_after_chapter_1: false", "c3_end_after_chapter_1: true"),
  );

  const second = await startAcceptanceHost(testInfo, { databasePath, seed, packsDir });
  const next: BrowserContext[] = [];
  try {
    const pad = await openPad(browser, second.baseURL, second.host.joinCode);
    next.push(pad.context);
    await enterWithoutTowerKeepSound(pad.page);
    await setSoundAndKeep(pad.page);
    await clickAct(pad.page, "continue", "continue-saved-game");
    await expect(deviceMain(pad.page)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
    await holdHeroesFromTest(pad.page, [...HERO_IDS]);
    await quitGame(pad.page);
    // The game kept the Begin values; the edited file was not read.
    expect(chapterPlanSaved(databasePath)).toEqual(atBegin);
  } finally {
    await closeAll(next);
    await second.host.close();
    rmSync(packsDir, { recursive: true, force: true });
  }
});

// Blocked: telling a C3 save from a C4 one needs AUTOSAVE_FORMAT 3 (server/events/store.ts) and the
// `pre-C4 format` line (server/hub/host.ts), both outside this brief's Touches. Remove `fixme`
// when that change lands; the body is the contract.
test.fixme("EV-06: a C3 save is not resumed under C4; one log line; a new game can Begin", async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  const databasePath = join(mkdtempSync(join(tmpdir(), "c4-01-save-")), "session.sqlite");
  // A save written under the C3 switches (`c3_end_after_chapter_1: true`, `fight_enabled: false`).
  withStore(databasePath, (store) =>
    store.replaceAutosave({
      gameId: "c3-game",
      sessionId: "session-old",
      packId: STORY_ID,
    }),
  );
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
