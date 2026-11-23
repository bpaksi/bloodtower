import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { openDatabase } from "../../server/db/client.ts";
import { projectGameRecords } from "../../server/events/gameStats.ts";
import { createEventStore } from "../../server/events/store.ts";
import {
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  passChapterCard,
  startAcceptanceHost,
} from "./support/acceptance.ts";
import { walkTo } from "./support/walk.ts";

/**
 * F1/04 EV-09 (DEC-641, DEC-951, DEC-948, DEC-949): a real Ruined Keep game, one hero, won through
 * normal play. The seed carries no `~test-` marker except `~test-event:none` (no night events).
 * Hero A starts at the Arisilon citadel (N-radiant-mountains); Muted Forest is next to it and
 * Egan's End is a few steps on. The spec walks by the move map, whatever the day's roll is, and
 * presses what a table presses between turns.
 */

const SEED = "f104-e2e-1~test-event:none";
const HERO = "hero-a";
const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const START = "N-radiant-mountains";
const FOREST = "N-muted-forest";
const VILLAGE = "N-egans-end";
// Options by option id (DEC-949), so pack copy edits don't break this spec.
const TOLL = "--qopt--pay-the-toll";
const PAY = "--qopt--ask-pay-first";
const LEAVE = "--qleave";

type Space = { id: string; adjacent: string[] };
const spaces = JSON.parse(
  readFileSync(join(import.meta.dirname, "../../../../../packs/base/board/spaces.json"), "utf8"),
) as { spaces: Space[] };

/** The shortest path of space ids from `from` to `to`, `from` left out. */
const pathTo = (from: string, to: string): string[] => {
  const byId = new Map(spaces.spaces.map((space) => [space.id, space]));
  const before = new Map<string, string>([[from, from]]);
  const queue = [from];
  while (queue.length > 0) {
    const here = queue.shift() as string;
    if (here === to) break;
    for (const next of byId.get(here)?.adjacent ?? []) {
      if (before.has(next)) continue;
      before.set(next, here);
      queue.push(next);
    }
  }
  const path: string[] = [];
  for (let at = to; at !== from; at = before.get(at) as string) path.unshift(at);
  return path;
};

const deviceMain = (page: Page) => page.locator("main.bt-device");
const where = (pad: Page) => deviceMain(pad).locator("p[data-space]").first();

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

type WaitTicker = { advance: (ms: number) => void };

/** Ends the quest's rewards step and its end hook (the wait clock), until the building menu is back. */
const endQuestSteps = async (pad: Page, waitClock: { advance: (ms: number) => void } | null) => {
  const menu = deviceMain(pad).locator('[data-building="menu"]');
  for (const expected of ["result", "result"]) {
    await expect(deviceMain(pad).locator(`[data-building="${expected}"]`)).toBeVisible();
    waitClock?.advance(5_000);
    await pad.waitForTimeout(300);
  }
  await expect(menu).toBeVisible();
};

const options = (pad: Page) => deviceMain(pad).locator("[data-building-option]");
const labelsOf = async (pad: Page) => {
  await expect(options(pad).first()).toBeVisible({ timeout: 20_000 });
  return (await options(pad).allInnerTexts()).map((text) => text.split("\n")[0]?.trim() ?? "");
};
const idsOf = async (pad: Page) => {
  await expect(options(pad).first()).toBeVisible({ timeout: 20_000 });
  const ids = await options(pad).evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-prompt-id") ?? ""),
  );
  return ids.map((id) => id.match(/--(qopt--.+|qleave)$/)?.[0] ?? id);
};
const optionById = (pad: Page, suffix: string) =>
  deviceMain(pad).locator(`[data-building-option][data-prompt-id$="${suffix}"]`);
const optionByLabel = (pad: Page, label: string) =>
  options(pad).filter({ hasText: new RegExp(`^${label}`) });

const startGame = async (pad: Page, board: Page, waitClock: WaitTicker | null) => {
  await enterWithoutTower(pad);
  await clickAct(pad, "continue", "continue-pick-story-test");
  const size = pad.locator(
    `button[data-setting="party-size"][data-option="n-1"][data-action="set"]`,
  );
  await size.click();
  await expect(size).toHaveAttribute("aria-pressed", "true");
  await clickAct(pad, "continue", "continue-game-settings");
  await holdHeroesFromTest(pad, [HERO]);
  await clickAct(pad, "continue", "continue-claim-heroes");
  for (const id of SETUP_IDS) {
    await expect(deviceMain(pad)).toHaveAttribute("data-setup-step", id, { timeout: 20_000 });
    if (id === "starting-purse") await clickAct(pad, "spin", "spin-setup-starting-purse");
    await clickAct(pad, "continue", `continue-setup-${id}`);
  }
  await clickAct(pad, "continue", "continue-begin");
  for (const id of OPENING_IDS) {
    await clickAct(pad, "continue", `continue-opening-${id.replace(".", "-")}`);
  }
  await passChapterCard(pad, waitClock);
  await clickAct(pad, "continue");
  await expect(board.locator("#band [data-days-left]")).toBeVisible({ timeout: 20_000 });
};

/** Presses what a table presses between turns: the roll, the skull, done, a turn end. */
const pressBetween = async (pad: Page): Promise<boolean> => {
  const next = pad
    .locator(
      'button[data-action-id="continue"]:enabled, button[data-action-id="record"]:enabled, button[data-action-id="done"]:enabled, button[data-action-id="end-turn"]:enabled',
    )
    .first();
  if ((await next.count()) === 0) return false;
  // The roll panel animates, so its button is never "stable": press it without waiting. A short,
  // lost click is the panel swapping out; the caller looks again.
  await next.click({ force: true, timeout: 2_000 }).catch((error: unknown) => {
    // A lost click is the panel swapping out or the screen changing; the caller looks again and
    // the assertions after the loop still fail the test when the state is wrong.
    const lost =
      error instanceof Error &&
      (error.name === "TimeoutError" || /not visible|detached/.test(error.message));
    if (!lost) throw error;
  });
  return true;
};

/** Walks by the move map, day after day, until Enter shows at `target`. */
const walkToEnter = async (pad: Page, target: string, waitClock: WaitTicker | null) => {
  const enter = pad.locator('button[data-action-id="enter"]');
  for (let guard = 0; guard < 120; guard += 1) {
    const at = await where(pad)
      .getAttribute("data-space", { timeout: 1_000 })
      .catch(() => null);
    // Quest costs 1 move: a landing with none left waits for the next turn at the same space.
    const moves = await where(pad)
      .getAttribute("data-moves", { timeout: 1_000 })
      .catch(() => null);
    if (at === target && (await enter.count()) > 0 && Number(moves) >= 1) return;
    if (at && at !== target) {
      const step = pathTo(at, target)[0];
      const walk = pad.locator(`button[data-prompt-id$="--${step}"][data-action-id="walk"]`);
      if ((await walk.count()) > 0) {
        await walkTo(pad, step as string);
        continue;
      }
    }
    if (!(await pressBetween(pad))) {
      waitClock?.advance(5_000);
      await pad.waitForTimeout(250);
    }
  }
  throw new Error(`Never reached Enter at ${target}.`);
};

/**
 * C4-01 turned the C3 end (chapter 1 won ends the game) off in the base tuning. This spec proves
 * the C3 end, so it plays a copy of the packs with that switch on, as `liveQuests.test.ts` does.
 */
const c3Packs = (): string => {
  const root = mkdtempSync(join(tmpdir(), "f1-04-packs-"));
  const source = join(import.meta.dirname, "../../../../../packs");
  for (const id of ["base", "test", "dracula"]) {
    cpSync(join(source, id), join(root, id), { recursive: true });
  }
  const file = join(root, "base", "tuning.yaml");
  const text = readFileSync(file, "utf8");
  const edited = text.replace("c3_end_after_chapter_1: false", "c3_end_after_chapter_1: true");
  if (edited === text) throw new Error("The tuning has no C3 switch to turn on.");
  writeFileSync(file, edited);
  return root;
};

const wonRecords = (databasePath: string) => {
  const opened = openDatabase(databasePath);
  try {
    return projectGameRecords(createEventStore(opened.db));
  } finally {
    opened.close();
  }
};

test.describe("F1/04 chapter 1 won through Enter on the wild marker", { tag: "@ipad-only" }, () => {
  test("EV-09: Muted Forest and Egan's End, both quests, the day ends, the game is won", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(420_000);
    const packsDir = c3Packs();
    // C3/14: a finished quest shows its rewards and end-hook steps before the menu; each ends on the
    // host's wait clock, which the test advances (`endQuestSteps`).
    const { host, baseURL, databasePath, waitClock } = await startAcceptanceHost(testInfo, {
      seed: SEED,
      packsDir,
      fakeWait: true,
    });
    const context = await browser.newContext({ baseURL, ...PORTRAIT });
    const pad = await context.newPage();
    const board = await context.newPage();
    await board.setViewportSize(BOARD_SIZE);
    await board.goto("/board");
    await installSessionSocketHook(pad);
    try {
      expect(SEED.replace("~test-event:none", "")).not.toMatch(/~test-/);
      expect(pathTo(START, FOREST)).toHaveLength(1);
      await pad.goto(`/join?code=${host.joinCode}`);
      await startGame(pad, board, waitClock);

      // Muted Forest: the wild marker holds the Ambush.
      await walkToEnter(pad, FOREST, waitClock);
      // The label is "Enter"; the button carries a leading icon glyph in its text.
      await expect(pad.locator('button[data-action-id="enter"]').first()).toHaveText(/Enter$/);
      await clickAct(pad, "enter");
      await expect(deviceMain(pad).locator("section[data-building]")).toBeVisible({
        timeout: 20_000,
      });
      await expect(deviceMain(pad).locator("[data-building-title]")).toHaveText("Muted Forest");
      // The rows are Quest, then Leave; Leave is the panel's own button, not a building option.
      expect(await labelsOf(pad)).toEqual(["Quest"]);
      await expect(pad.locator('button[data-action-id="leave"]')).toBeEnabled();
      const quest = optionByLabel(pad, "Quest");
      await expect(quest).toBeEnabled();
      await expect(quest).toContainText("1 move");
      await quest.click();
      await expect(deviceMain(pad).locator('[data-building="quest"]')).toBeVisible();
      expect(await idsOf(pad)).toEqual([TOLL, LEAVE]);
      await optionById(pad, TOLL).click();
      await endQuestSteps(pad, waitClock);
      await expect(optionByLabel(pad, "Quest")).toHaveCount(0);
      await pad.locator('button[data-action-id="leave"]').click();
      await expect(deviceMain(pad).locator("section[data-building]")).toHaveCount(0, {
        timeout: 20_000,
      });

      // Egan's End: the Herald.
      await walkToEnter(pad, VILLAGE, waitClock);
      await clickAct(pad, "enter");
      await expect(deviceMain(pad).locator("section[data-building]")).toBeVisible({
        timeout: 20_000,
      });
      expect((await labelsOf(pad))[0]).toBe("Quest");
      await optionByLabel(pad, "Quest").click();
      await optionById(pad, PAY).click();
      await endQuestSteps(pad, waitClock);
      await pad.locator('button[data-action-id="leave"]').click();

      // Play on to the day's end: the game ends won and the record is written once.
      for (let guard = 0; guard < 200; guard += 1) {
        if ((await deviceMain(pad).getAttribute("data-screen")) === "session") break;
        if (!(await pressBetween(pad))) {
          waitClock?.advance(5_000);
          await pad.waitForTimeout(250);
        }
      }
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", {
        timeout: 20_000,
      });
      // The board leaves play too.
      await expect(board.locator("main.bt-board")).toHaveAttribute("data-screen", "session", {
        timeout: 20_000,
      });
      const records = wonRecords(databasePath);
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({ outcome: "won" });
    } finally {
      await context.close();
      await host.close();
      rmSync(packsDir, { recursive: true, force: true });
    }
  });
});
