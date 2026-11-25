import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Browser, expect, type Page, type TestInfo, test } from "@playwright/test";
import { openDatabase } from "../../server/db/client.ts";
import { createEventStore } from "../../server/events/store.ts";
import {
  enterWithoutTower,
  enterWithTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  passChapterCard,
  startAcceptanceHost,
  type WaitClock,
} from "./support/acceptance.ts";

/**
 * C3/17 (SCR-019, DEC-116, DEC-117, DEC-627, PT-03, PT-04, PT-10): the Game stats screen on the
 * Story board (1920×1080) and iPad portrait (768×1024). Earlier games are seeded into the log as
 * records, so the best and the average under the game's key are known before it is played. Waits
 * run on the host's fake clock (`fakeWait: true`). The game's own length is real wall time (a few
 * seconds), so it reads "1 min": the best and average figures are checked against that.
 */

const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const BASE_SEED = "c317-e2e~test-event:none";
const LOSS_SEED = `${BASE_SEED}~test-supply:1~test-kingdom:E`;
const MIN = 60_000;
const HELP = "Here's how tonight went. Rate it if you like, then tap Play again.";

/** The rows of a finished game, in order (SCR-019, DEC-627). No skulls, seals or tap row. */
const ROWS = ["Outcome", "Time played", "Days", "Quests done", "Corruptions", "Gold", "Length"];

const deviceMain = (page: Page) => page.locator("main.bt-device");
const boardMain = (page: Page) => page.locator("main.bt-board");
const statsPanel = (board: Page) => board.locator('[data-startup-panel="game-stats"]');

type Seed = {
  outcome: "won" | "lost" | "quit";
  activeMs: number;
  partySize?: number;
};

/** A log with earlier games' records under the `test` story's key (one hero, no length or difficulty). */
const seededDatabase = (records: Seed[]): { databasePath: string; dir: string } => {
  const dir = mkdtempSync(join(tmpdir(), "c3-stats-db-"));
  const databasePath = join(dir, "stats.sqlite");
  const opened = openDatabase(databasePath);
  try {
    const store = createEventStore(opened.db);
    records.forEach((seed, index) => {
      const gameId = `seed-${index + 1}`;
      store.append({
        gameId,
        kind: "game-record",
        payload: {
          v: 1,
          gameId,
          outcome: seed.outcome,
          storyId: "test",
          length: null,
          difficulty: null,
          partySize: seed.partySize ?? 1,
          heroIds: ["hero-a"],
          how: seed.outcome === "quit" ? "quit" : seed.outcome === "won" ? "won" : "skulls",
          endDay: 4,
          activeMs: seed.activeMs,
          taps: 0,
        },
        atMonoMs: 0,
        atWall: "2026-10-01T00:00:00.000Z",
        deviceId: null,
        seed: "seed",
        packVersion: "0.1.0",
        engineVersion: "seeded",
      });
    });
  } finally {
    opened.close();
  }
  return { databasePath, dir };
};

const c3Packs = (): string => {
  const root = mkdtempSync(join(tmpdir(), "c3-stats-packs-"));
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

const installBoardSocket = async (page: Page) => {
  await page.addInitScript(() => {
    const Native = window.WebSocket;
    class BoardSocket extends Native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        if (String(url).includes("/ws")) {
          (window as unknown as { __btBoardSocket?: WebSocket }).__btBoardSocket = this;
        }
      }
    }
    window.WebSocket = BoardSocket;
  });
};

const installSendCounter = async (page: Page) => {
  await page.addInitScript(() => {
    const send = WebSocket.prototype.send;
    WebSocket.prototype.send = function (this: WebSocket, data) {
      const win = window as unknown as { __btSent?: number };
      win.__btSent = (win.__btSent ?? 0) + 1;
      return send.call(this, data);
    };
  });
};
const sentCount = (page: Page) =>
  page.evaluate(() => (window as unknown as { __btSent?: number }).__btSent ?? 0);

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

type Table = {
  host: Awaited<ReturnType<typeof startAcceptanceHost>>;
  pad: Page;
  board: Page;
  clock: WaitClock;
  close: () => Promise<void>;
};

const openTable = async (
  browser: Browser,
  testInfo: TestInfo,
  options: { c3?: boolean; tower?: boolean; seed?: string; seeded?: Seed[] } = {},
): Promise<Table> => {
  const packsDir = options.c3 ? c3Packs() : undefined;
  const seeded = options.seeded ? seededDatabase(options.seeded) : null;
  const host = await startAcceptanceHost(testInfo, {
    seed: options.seed ?? BASE_SEED,
    fakeWait: true,
    ...(packsDir ? { packsDir } : {}),
    ...(seeded ? { databasePath: seeded.databasePath } : {}),
  });
  const clock = host.waitClock;
  if (!clock) throw new Error("The host has no fake wait clock.");
  const padContext = await browser.newContext({ baseURL: host.baseURL, ...PORTRAIT });
  const boardContext = await browser.newContext({ baseURL: host.baseURL, viewport: BOARD_SIZE });
  const pad = await padContext.newPage();
  const board = await boardContext.newPage();
  await installBoardSocket(board);
  await board.goto("/board");
  await installSessionSocketHook(pad);
  await installSendCounter(pad);
  await pad.goto(`/join?code=${host.host.joinCode}`);
  if (options.tower) await enterWithTower(pad);
  else await enterWithoutTower(pad);
  await clickAct(pad, "continue", "continue-pick-story-test");
  const size = pad.locator('button[data-setting="party-size"][data-option="n-1"]');
  await size.click();
  await expect(size).toHaveAttribute("aria-pressed", "true");
  const hintsOff = pad.locator('button[data-setting="hints"][data-option="off"]');
  await hintsOff.click();
  await expect(hintsOff).toHaveAttribute("aria-pressed", "true");
  await clickAct(pad, "continue", "continue-game-settings");
  await holdHeroesFromTest(pad, ["hero-a"]);
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
  await passChapterCard(pad, clock);
  return {
    host,
    pad,
    board,
    clock,
    close: async () => {
      await padContext.close();
      await boardContext.close();
      await host.host.close();
      if (packsDir) rmSync(packsDir, { recursive: true, force: true });
      if (seeded) rmSync(seeded.dir, { recursive: true, force: true });
    },
  };
};

const outcomeStageIs = async (table: Pick<Table, "pad" | "board">, stage: string) => {
  await expect(deviceMain(table.pad)).toHaveAttribute("data-outcome-stage", stage, {
    timeout: 20_000,
  });
  await expect(boardMain(table.board)).toHaveAttribute("data-outcome-stage", stage, {
    timeout: 20_000,
  });
};

/** Play turns and advance chapter beats until the outcome scene appears on both screens. */
const playUntilOutcome = async (table: Table) => {
  for (let guard = 0; guard < 150; guard += 1) {
    if (await deviceMain(table.pad).getAttribute("data-outcome-stage")) return;
    const next = table.pad
      .locator(
        'button[data-action-id="continue"]:enabled, button[data-action-id="record"]:enabled, button[data-action-id="end-turn"]:enabled',
      )
      .first();
    if ((await next.count()) > 0) {
      await next.click({ force: true, timeout: 2_000 }).catch((error: unknown) => {
        const lost =
          error instanceof Error &&
          (error.name === "TimeoutError" || /not visible|detached/.test(error.message));
        if (!lost) throw error;
      });
    } else {
      table.clock.advance(4_000);
    }
    await table.pad.waitForTimeout(120);
  }
  await outcomeStageIs(table, "scene");
};

/** From the outcome scene through its beats to the stats screen on both screens. */
const reachStats = async (table: Table) => {
  await playUntilOutcome(table);
  for (let guard = 0; guard < 6; guard += 1) {
    if ((await deviceMain(table.pad).getAttribute("data-screen")) === "session") break;
    table.clock.advance(4_000);
    await table.pad.waitForTimeout(250);
  }
  await expect(deviceMain(table.pad)).toHaveAttribute("data-screen", "session", {
    timeout: 20_000,
  });
  await expect(table.pad.locator("[data-game-stats]")).toBeVisible({ timeout: 20_000 });
  await expect(statsPanel(table.board)).toBeVisible({ timeout: 20_000 });
};

/** EV-08: bottom toolbar is in viewport, "?" first and gear last, nothing covering them. */
const expectToolbar = async (pad: Page) => {
  const bar = pad.locator("footer.bt-bar--bottom");
  await expect(bar).toBeInViewport();
  const controls = bar.locator(":scope > button, :scope > span > button");
  const helpBtn = controls.first();
  const menuBtn = controls.last();
  await expect(helpBtn).toHaveAttribute("aria-label", "Help");
  await expect(menuBtn).toHaveAttribute("aria-label", "Menu");
  for (const button of [helpBtn, menuBtn]) {
    const covered = await button.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return !(top && (top === el || el.contains(top)));
    });
    expect(covered).toBe(false);
  }
};

/** EV-10: "?" opens the game-stats help, sends nothing, does not pause, Close returns cleanly. */
const expectHelp = async (pad: Page) => {
  const beforeSent = await sentCount(pad);
  await pad.locator('footer.bt-bar--bottom button[aria-label="Help"]').click();
  const sheet = pad.locator("[data-help]");
  await expect(sheet).toHaveAttribute("data-help-screen", "game-stats");
  await expect(sheet.locator("p")).toHaveText(HELP);
  await expect(deviceMain(pad)).toHaveAttribute("data-paused", "false");
  expect(await sentCount(pad)).toBe(beforeSent);
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toHaveCount(0);
  expect(await sentCount(pad)).toBe(beforeSent);
  await expect(pad.locator("[data-game-stats]")).toBeVisible();
};

/** The board's rows as { label → value }, and the order the labels came in. */
const boardRows = async (board: Page) => {
  const rows = await statsPanel(board)
    .locator("[data-stat-row]")
    .evaluateAll((els) =>
      els.map((el) => ({
        label: el.getAttribute("data-stat-row") ?? "",
        value: el.querySelector("[data-stat-value]")?.textContent?.trim() ?? "",
      })),
    );
  return {
    labels: rows.map((row) => row.label),
    value: (label: string) => rows.find((row) => row.label === label)?.value,
  };
};

const rate = async (pad: Page, value: number) => {
  const button = pad.locator(`[data-rating-option="${value}"]`);
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
};

const readMenu = async (pad: Page) => {
  await pad.locator('[data-action="menu"]').click();
  const rows = pad.locator("[data-menu] button[data-gear-item]");
  await expect(rows.first()).toBeVisible();
  const states = await rows.evaluateAll((els) =>
    els.map((el) => ({
      id: el.getAttribute("data-gear-item"),
      disabled: (el as HTMLButtonElement).disabled,
      reason: el.querySelector("[data-reason]")?.textContent?.trim() ?? null,
    })),
  );
  await pad.locator("[data-menu]").getByRole("button", { name: "Close" }).click();
  await expect(pad.locator("[data-menu]")).toHaveCount(0);
  return states;
};

test.describe("C3/17 game stats screen (SCR-019)", { tag: "@ipad-only" }, () => {
  test("EV-01, EV-04, EV-08, EV-09, EV-10, EV-13, EV-15, EV-16, EV-18: a lost game's read-out, toolbar, help, and the best and average under its key", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const table = await openTable(browser, testInfo, {
      seed: LOSS_SEED,
      seeded: [
        { outcome: "won", activeMs: 40 * MIN },
        // A quit is listed but not counted (PT-03); another party size is another key (PT-04).
        { outcome: "quit", activeMs: 20 * MIN },
        { outcome: "won", activeMs: 10 * MIN, partySize: 4 },
      ],
    });
    try {
      const { pad, board } = table;
      await reachStats(table);

      // EV-01 and EV-18: the rows in order, and no skulls, seals, tap or target row.
      const rows = await boardRows(board);
      expect(rows.labels).toEqual(ROWS);
      expect(rows.value("Outcome")).toBe("Lost");
      expect(rows.value("Time played")).toMatch(/^\d+ min$/);
      expect(rows.value("Days")).toMatch(/^\d+$/);
      expect(rows.value("Quests done")).toMatch(/^\d+$/);
      expect(rows.value("Corruptions")).toMatch(/^\d+$/);
      expect(rows.value("Gold")).toMatch(/^(\d+|unavailable)$/);
      // EV-13, EV-15 (c), EV-16: the earlier 40 min win is the best; the quit and the other
      // party size are not in the average, so it is the win and this loss.
      expect(rows.value("Length")).toMatch(/^\d+ min \(best 40 min · average (20|21) min\)$/);
      await expect(statsPanel(board)).not.toContainText(/skulls on the board|seals broken|taps/i);
      await expect(statsPanel(board)).not.toContainText("No win yet to compare");
      await expect(statsPanel(board)).not.toContainText("Best: this game");
      const length = rows.value("Length");

      // EV-01: Play again first, then Back, and no Next.
      expect(await pad.locator("[data-game-stats] > button").allInnerTexts()).toEqual([
        "Play again",
        "Back",
      ]);
      await expect(pad.getByRole("button", { name: "Next" })).toHaveCount(0);

      // EV-08, EV-09, EV-10: toolbar, no gear needed, and the stats help.
      await expectToolbar(pad);
      await expect(boardMain(board)).toHaveAttribute("data-gear-opens", "0");
      await expectHelp(pad);

      // EV-02, EV-11: rating is optional; Back needs none and the rating is kept.
      await rate(pad, 4);
      await expect.poll(async () => (await boardRows(board)).value("How was tonight?")).toBe("4");
      await clickAct(pad, "back", "stats-back");
      await expect(pad.locator("[data-session-buttons]")).toBeVisible({ timeout: 20_000 });
      await expect(board.locator("[data-session-row='game']").first()).toContainText(/lost/i);

      // EV-04: from tonight's games the same numbers and the rating given.
      await pad.locator("[data-game-row]").first().click();
      await expect(pad.locator("[data-game-stats]")).toBeVisible({ timeout: 20_000 });
      await expectToolbar(pad);
      await expect(pad.locator('[data-rating-option="4"]')).toHaveAttribute("aria-pressed", "true");
      const again = await boardRows(board);
      expect(again.labels).toEqual([...ROWS, "How was tonight?"]);
      expect(again.value("Length")).toBe(length);
      expect(again.value("Outcome")).toBe("Lost");
      expect(again.value("How was tonight?")).toBe("4");
    } finally {
      await table.close();
    }
  });

  test("EV-14, EV-02, EV-07: the first win says Best: this game with no best minutes; Play again needs no rating", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const table = await openTable(browser, testInfo, {
      c3: true,
      // A win under another key and a loss under this one do not make this the second win.
      seeded: [
        { outcome: "won", activeMs: 10 * MIN, partySize: 4 },
        { outcome: "lost", activeMs: 30 * MIN },
      ],
    });
    try {
      const { pad, board } = table;
      await table.host.host.applyTestSeed("~test-quests-done:herald+ambush");
      await reachStats(table);
      const rows = await boardRows(board);
      expect(rows.labels).toEqual(ROWS);
      expect(rows.value("Outcome")).toBe("Won");
      expect(rows.value("Quests done")).toBe("2");
      expect(rows.value("Length")).toMatch(/^\d+ min \(Best: this game · average (15|16) min\)$/);
      await expect(statsPanel(board)).not.toContainText(/best \d+ min/);
      await expect(statsPanel(board)).not.toContainText("No win yet to compare");

      // EV-07: Back, open the finished game, Play again starts the same story's setup.
      await clickAct(pad, "back", "stats-back");
      await expect(pad.locator("[data-session-buttons]")).toBeVisible({ timeout: 20_000 });
      await expect(board.locator("[data-session-row='game']").first()).toContainText(/won/i);
      await pad.locator("[data-game-row]").first().click();
      await expect(pad.locator("[data-game-stats]")).toBeVisible({ timeout: 20_000 });
      // No rating was given and Play again is still pressable (EV-02).
      await clickAct(pad, "play-again", "stats-play-again");
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "claim-heroes", {
        timeout: 20_000,
      });
    } finally {
      await table.close();
    }
  });

  test("EV-15: a loss with no win under its key says No win yet to compare, never a zero", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const table = await openTable(browser, testInfo, { seed: LOSS_SEED });
    try {
      await reachStats(table);
      const rows = await boardRows(table.board);
      expect(rows.value("Outcome")).toBe("Lost");
      expect(rows.value("Length")).toMatch(/^\d+ min \(No win yet to compare · average \d+ min\)$/);
      await expect(statsPanel(table.board)).not.toContainText("Best: this game");
      await expect(statsPanel(table.board)).not.toContainText(/best \d+ min/);
    } finally {
      await table.close();
    }
  });

  test("EV-11, EV-12, EV-20: the rating, the best and the average survive a host restart; the Menu comes back closed", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const first = await openTable(browser, testInfo, {
      tower: true,
      seed: LOSS_SEED,
      seeded: [{ outcome: "won", activeMs: 40 * MIN }],
    });
    const { databasePath } = first.host;
    let length: string | undefined;
    try {
      await reachStats(first);
      await rate(first.pad, 2);
      await expect
        .poll(async () => (await boardRows(first.board)).value("How was tonight?"))
        .toBe("2");
      length = (await boardRows(first.board)).value("Length");
      expect(length).toMatch(/best 40 min/);
      await first.pad.locator('[data-action="menu"]').click();
      await expect(first.pad.locator("[data-menu]")).toBeVisible();
      // A gear panel (Volume) open when the host stops (EV-12).
      const volume = first.pad.locator('[data-menu] button[data-gear-item="volume"]');
      await expect(volume).toBeEnabled();
      await volume.click();
      await expect(first.pad.locator('[data-gear-panel="volume"]')).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      // The log is the database, so it outlives the host: do not remove it with the table.
      await first.pad.context().close();
      await first.board.context().close();
      await first.host.host.close();
    }

    const restarted = await startAcceptanceHost(testInfo, {
      databasePath,
      seed: LOSS_SEED,
      fakeWait: true,
    });
    const padContext = await browser.newContext({ baseURL: restarted.baseURL, ...PORTRAIT });
    const boardContext = await browser.newContext({
      baseURL: restarted.baseURL,
      viewport: BOARD_SIZE,
    });
    const pad = await padContext.newPage();
    const board = await boardContext.newPage();
    try {
      await board.goto("/board");
      await installSessionSocketHook(pad);
      await pad.goto(`/join?code=${restarted.host.joinCode}`);
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", { timeout: 20_000 });
      await expect(pad.locator("[data-session-buttons]")).toBeVisible({ timeout: 20_000 });

      // EV-12: the Menu is closed, the game is not paused, the toolbar is back.
      await expect(pad.locator("[data-menu]")).toHaveCount(0);
      await expect(pad.locator("[data-panel], [data-gear-panel]")).toHaveCount(0);
      await expect(board.locator("[data-panel]")).toHaveCount(0);
      await expect(deviceMain(pad)).toHaveAttribute("data-paused", "false");
      await expectToolbar(pad);
      expect((await readMenu(pad)).length).toBeGreaterThan(3);

      // EV-11, EV-20: the same read-out, the rating given, and the same best and average.
      await pad.locator("[data-game-row]").first().click();
      await expect(pad.locator("[data-game-stats]")).toBeVisible({ timeout: 20_000 });
      // The iPad that joins after a restart is a new device, so it shows no button pressed; the
      // rating given belongs to the game and the board shows it.
      const rows = await boardRows(board);
      expect(rows.value("Length")).toBe(length);
      expect(rows.value("Outcome")).toBe("Lost");
      expect(rows.value("How was tonight?")).toBe("2");
    } finally {
      await padContext.close();
      await boardContext.close();
      await restarted.host.close();
    }
  });
});
