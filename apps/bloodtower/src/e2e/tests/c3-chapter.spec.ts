import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Browser, expect, type Page, type TestInfo, test } from "@playwright/test";
import {
  enterWithoutTower,
  enterWithTower,
  finishPieceCheck,
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
  type WaitClock,
} from "./support/acceptance.ts";

/**
 * C3/15 (UI-020, UI-044, PT-21): the chapter card, the stamped won card, the close Scroll, the
 * seal's Reveal and Set the table, on the iPad (768×1024) and the Story board (1920×1080). The
 * host's waits run on the fake clock. Chapter 1 is won by the test marker `~test-quests-done`
 * (both quests done) and the first day's end; the quest scenes are not under test here.
 *
 * `c3: true` plays a copy of the packs with `c3_end_after_chapter_1: true` (Q-C3-01). The base
 * tuning has it off (C4-01): that is the brief's `c3_end_after_chapter_1: false` fixture.
 */

const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const SEED = "c315-e2e~test-event:none";
const HELP_CARD = "This is your chapter goal. Finish it before the days run out.";
const HELP_TABLE =
  "Tick the rows that show as an aid, then tap Done. You do not have to tick them all.";

const deviceMain = (page: Page) => page.locator("main.bt-device");
const boardMain = (page: Page) => page.locator("main.bt-board");

const c3Packs = (): string => {
  const root = mkdtempSync(join(tmpdir(), "c3-chapter-packs-"));
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
  options: { c3?: boolean; tower?: boolean; seed?: string } = {},
): Promise<Table> => {
  const packsDir = options.c3 ? c3Packs() : undefined;
  const host = await startAcceptanceHost(testInfo, {
    seed: options.seed ?? SEED,
    fakeWait: true,
    ...(packsDir ? { packsDir } : {}),
  });
  const clock = host.waitClock;
  if (!clock) throw new Error("The host has no fake wait clock.");
  const padContext = await browser.newContext({ baseURL: host.baseURL, ...PORTRAIT });
  const boardContext = await browser.newContext({ baseURL: host.baseURL, viewport: BOARD_SIZE });
  const pad = await padContext.newPage();
  const board = await boardContext.newPage();
  // The board reports narration ends (EV-12), so the test keeps its socket.
  await board.addInitScript(() => {
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
  await board.goto("/board");
  await installSessionSocketHook(pad);
  await pad.goto(`/join?code=${host.host.joinCode}`);
  if (options.tower) await enterWithTower(pad);
  else await enterWithoutTower(pad);
  await clickAct(pad, "continue", "continue-pick-story-test");
  const size = pad.locator('button[data-setting="party-size"][data-option="n-1"]');
  await size.click();
  await expect(size).toHaveAttribute("aria-pressed", "true");
  // Hints run on a real timer and are not under test here.
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
    },
  };
};

const stageIs = async (table: Table, stage: string) => {
  await expect(deviceMain(table.pad)).toHaveAttribute("data-chapter-stage", stage, {
    timeout: 20_000,
  });
  await expect(boardMain(table.board)).toHaveAttribute("data-chapter-stage", stage, {
    timeout: 20_000,
  });
};

/** EV-08, EV-21: the bottom toolbar is in view, "?" first and the gear last. */
const expectToolbar = async (pad: Page) => {
  const bar = pad.locator("footer.bt-bar--bottom");
  await expect(bar).toBeInViewport();
  const controls = bar.locator(":scope > button, :scope > span > button");
  await expect(controls.first()).toHaveAttribute("aria-label", "Help");
  await expect(controls.last()).toHaveAttribute("aria-label", "Menu");
};

/** EV-10, EV-21: "?" opens this screen's help; Close returns to the same state, unpaused. */
const expectHelp = async (pad: Page, screen: string, text: string, stage: string) => {
  await pad.locator('footer.bt-bar--bottom button[aria-label="Help"]').click();
  const sheet = pad.locator("[data-help]");
  await expect(sheet).toHaveAttribute("data-help-screen", screen);
  await expect(sheet.locator("p")).toHaveText(text);
  await expect(deviceMain(pad)).toHaveAttribute("data-paused", "false");
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toHaveCount(0);
  await expect(deviceMain(pad)).toHaveAttribute("data-chapter-stage", stage);
};

/** No Next on an auto-advancing beat (EV-11): only the toolbar's own buttons. */
const expectNoNext = async (pad: Page) => {
  await expect(
    deviceMain(pad).locator(
      'button[data-action-id="continue"], button[data-action-id="next"], button[data-action-id="done"]',
    ),
  ).toHaveCount(0);
  await expect(deviceMain(pad).locator("[data-tick-auto]")).toHaveText("Moves on by itself.");
};

/** Presses what a table presses between turns, and moves the clock when nothing is offered. */
const playUntilStamp = async (table: Table) => {
  await table.host.host.applyTestSeed("~test-quests-done:herald+ambush");
  for (let guard = 0; guard < 150; guard += 1) {
    if ((await deviceMain(table.pad).getAttribute("data-chapter-stage")) === "stamp") return;
    const next = table.pad
      .locator(
        'button[data-action-id="continue"]:enabled, button[data-action-id="record"]:enabled, button[data-action-id="end-turn"]:enabled',
      )
      .first();
    if ((await next.count()) > 0) {
      await next.click({ force: true, timeout: 2_000 }).catch((error: unknown) => {
        // A lost click is the panel swapping out; the loop looks again, and the stage check
        // after it fails the test when the state is wrong.
        const lost =
          error instanceof Error &&
          (error.name === "TimeoutError" || /not visible|detached/.test(error.message));
        if (!lost) throw error;
      });
    } else {
      table.clock.advance(4_000);
    }
    await table.pad.waitForTimeout(150);
  }
  await stageIs(table, "stamp");
};

/** Every Menu row with its state and text, then the Menu closed again (EV-15). */
const menuStates = async (pad: Page) => {
  await pad.locator('[data-action="menu"]').click();
  const rows = pad.locator("[data-menu] button[data-gear-item]");
  await expect(rows.first()).toBeVisible();
  const states = await rows.evaluateAll((els) =>
    els.map((el) => ({
      id: el.getAttribute("data-gear-item"),
      disabled: (el as HTMLButtonElement).disabled,
      text: (el.textContent ?? "").trim(),
    })),
  );
  await pad.locator("[data-menu]").getByRole("button", { name: "Close" }).click();
  await expect(pad.locator("[data-menu]")).toHaveCount(0);
  return states;
};

/** A new host on the same database, its iPad on Continue (the restart in EV-15). */
const resumeTable = async (
  browser: Browser,
  testInfo: TestInfo,
  databasePath: string,
): Promise<{ pad: Page; board: Page; close: () => Promise<void> }> => {
  const host = await startAcceptanceHost(testInfo, { databasePath, seed: SEED, fakeWait: true });
  const padContext = await browser.newContext({ baseURL: host.baseURL, ...PORTRAIT });
  const boardContext = await browser.newContext({ baseURL: host.baseURL, viewport: BOARD_SIZE });
  const pad = await padContext.newPage();
  const board = await boardContext.newPage();
  await board.goto("/board");
  await installSessionSocketHook(pad);
  await pad.goto(`/join?code=${host.host.joinCode}`);
  await clickAct(pad, "continue", "continue-saved-game");
  // Continue seats the saved party on the iPads joined now (CU/16).
  await holdHeroesFromTest(pad, ["hero-a"]);
  await finishPieceCheck(pad);
  return {
    pad,
    board,
    close: async () => {
      await padContext.close();
      await boardContext.close();
      await host.host.close();
    },
  };
};

const shot = async (page: Page, testInfo: TestInfo, name: string) => {
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`) });
};

test.describe("C3/15 the chapter card and the chapter end", { tag: "@ipad-only" }, () => {
  test("EV-01, EV-04, EV-05, EV-06, EV-08 to EV-12: card, stamp and close Scroll in C3", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const table = await openTable(browser, testInfo, { c3: true });
    try {
      const { pad, board, clock } = table;
      // EV-01: the card for The Roads, painting, name and goal; no Next; it moves on by itself.
      await stageIs(table, "card");
      const card = board.locator('[data-chapter-beat="card"]');
      await expect(card.locator("[data-painting]")).toBeVisible();
      await expect(card.locator("[data-chapter-label]")).toHaveText("Chapter 1");
      await expect(card.locator("[data-chapter-name]")).toHaveText("The Roads");
      await expect(card.locator("[data-chapter-goal]")).toHaveText(
        "Hear the herald in Greyford. Then open the forest road.",
      );
      await expect(card).toHaveAttribute("data-cue", "CUE-004");
      await expect(deviceMain(pad).locator("[data-chapter-name]")).toHaveText("The Roads");
      await expectNoNext(pad);
      await expectToolbar(pad);
      await expectHelp(pad, "chapter-card", HELP_CARD, "card");
      await shot(board, testInfo, "board-card");
      await shot(pad, testInfo, "ipad-card");
      // EV-11: 4 s with no audio; not before.
      clock.advance(3_800);
      await pad.waitForTimeout(300);
      await expect(deviceMain(pad)).toHaveAttribute("data-chapter-stage", "card");
      clock.advance(200);
      await expect(deviceMain(pad)).not.toHaveAttribute("data-chapter-stage", "card", {
        timeout: 20_000,
      });

      // EV-05: the stamped card, then the close Scroll, then the outcome.
      await playUntilStamp(table);
      const stamped = board.locator('[data-chapter-beat="stamp"]');
      await expect(stamped.locator("[data-chapter-stamp]")).toHaveText("Cleared");
      await expect(stamped).toHaveAttribute("data-cue", "CUE-005");
      await expectNoNext(pad);
      await expectToolbar(pad);
      await expectHelp(pad, "chapter-card", HELP_CARD, "stamp");
      await shot(board, testInfo, "board-stamped");
      await shot(pad, testInfo, "ipad-stamped");
      clock.advance(4_000);
      await stageIs(table, "close");
      await expect(board.locator("[data-chapter-close]")).toHaveText("The roads are quiet again.");
      await expect(pad.locator("[data-chapter-close]")).toHaveText("The roads are quiet again.");
      await expectNoNext(pad);
      await expectToolbar(pad);
      await expectHelp(pad, "chapter-card", HELP_CARD, "close");
      // No seal and no skull prompt in C3.
      await expect(board.locator('[data-chapter-beat="reveal"], [data-set-table]')).toHaveCount(0);
      await expect(pad.locator('button[data-prompt-id^="skull-record--"]')).toHaveCount(0);
      clock.advance(4_000);
      // C3/16: the win outcome (scene -> chapter-1 closing -> summary) follows the close Scroll.
      for (const stage of ["scene", "closing", "summary"]) {
        await expect(deviceMain(pad)).toHaveAttribute("data-outcome-stage", stage, {
          timeout: 20_000,
        });
        clock.advance(4_000);
      }
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", {
        timeout: 20_000,
      });
      // EV-09: the gear and help were never needed to get here (help was opened by the checks
      // only, and each Close returned to the same state).
      await expect(board.locator('[data-chapter-beat="reveal"]')).toHaveCount(0);
    } finally {
      await table.close();
    }
  });

  test("EV-12: with narration the card waits for its audio end, not the timer", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(180_000);
    const table = await openTable(browser, testInfo, {
      c3: true,
      seed: `${SEED}~test-chapter-line:chapter.line-1`,
    });
    try {
      await stageIs(table, "card");
      table.clock.advance(4_500);
      await table.pad.waitForTimeout(500);
      await stageIs(table, "card");
      await table.board.evaluate((id) => {
        const socket = (window as unknown as { __btBoardSocket?: WebSocket }).__btBoardSocket;
        if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error("No board socket.");
        socket.send(JSON.stringify({ v: 2, type: "narration-ended", payload: { lineId: id } }));
      }, "chapter.line-1");
      await expect(deviceMain(table.pad)).not.toHaveAttribute("data-chapter-stage", "card", {
        timeout: 20_000,
      });
    } finally {
      await table.close();
    }
  });

  test("EV-03, EV-07, EV-16 to EV-22, EV-24: no tower: chapter 2's card, then Set the table", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const table = await openTable(browser, testInfo);
    try {
      const { pad, board, clock } = table;
      await stageIs(table, "card");
      clock.advance(4_000);
      await playUntilStamp(table);
      clock.advance(4_000);
      await stageIs(table, "close");
      clock.advance(4_000);
      // EV-07, EV-16: chapter 2's card (The Keep) comes before any chore.
      await stageIs(table, "card");
      await expect(board.locator("[data-chapter-name]")).toHaveText("The Keep");
      await expect(board.locator("[data-chapter-goal]")).toHaveText(
        "Go down into the barrow under the old keep. Find the shrine on the road beside it.",
      );
      await expect(pad.locator("[data-set-table]")).toHaveCount(0);
      await expectNoNext(pad);
      clock.advance(4_000);
      // EV-17b, EV-03: Set the table with the quest tokens only, no seal row.
      await stageIs(table, "table");
      const rows = deviceMain(pad).locator("[data-set-table] [data-table-row]");
      await expect(rows).toHaveCount(1);
      await expect(rows.first()).toHaveAttribute("data-table-row", "tokens");
      await expect(rows.first()).toHaveText("Quest tokens: The Barrow, The Shrine");
      // EV-20: the words from the Copy table, on the iPad and the board.
      await expect(pad.locator("[data-table-title]")).toHaveText("Set the table");
      await expect(board.locator("[data-table-title]")).toHaveText("Set the table");
      await expect(board.locator("[data-set-table] [data-table-row]")).toHaveText([
        "Quest tokens: The Barrow, The Shrine",
      ]);
      await expect(pad.locator("body")).not.toContainText("[COPY:");
      await expect(board.locator("body")).not.toContainText("[COPY:");
      // EV-18: no glyph, drum or traitor rows.
      await expect(pad.locator("[data-set-table]")).not.toContainText(/glyph|drum|traitor/i);
      // EV-21: the toolbar and this step's own help.
      await expectToolbar(pad);
      await expectHelp(pad, "set-the-table", HELP_TABLE, "table");
      // EV-19: it never moves on by itself; no auto tick line.
      clock.advance(30_000);
      await pad.waitForTimeout(500);
      await stageIs(table, "table");
      await expect(pad.locator("[data-tick-auto]")).toHaveCount(0);
      // EV-22: the screenshots, without the tower.
      await shot(board, testInfo, "board-set-table-no-tower");
      await shot(pad, testInfo, "ipad-set-table-no-tower");
      // EV-24: Done is enabled with no row ticked; one press ends the step and a day starts.
      const done = pad.locator("button[data-table-done]");
      await expect(done).toHaveText("Done");
      await expect(done).toBeEnabled();
      await expect(deviceMain(pad).locator("button.bt-primary")).toHaveCount(1);
      await done.click();
      await expect(deviceMain(pad)).not.toHaveAttribute("data-chapter-stage", "table", {
        timeout: 20_000,
      });
      await expect(pad.locator('button[data-action-id="continue"]').first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(pad.locator("[data-set-table]")).toHaveCount(0);
    } finally {
      await table.close();
    }
  });

  test("EV-02, EV-04, EV-17a, EV-22, EV-24: with the tower: Reveal, then the seal and tokens rows", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const table = await openTable(browser, testInfo, { tower: true, seed: `${SEED}~test-seals` });
    try {
      const { pad, board, clock } = table;
      await stageIs(table, "card");
      clock.advance(4_000);
      await playUntilStamp(table);
      clock.advance(4_000);
      await stageIs(table, "close");
      clock.advance(4_000);
      await stageIs(table, "card");
      // Nothing of the seal before chapter 2's card.
      await expect(pad.locator("[data-set-table]")).toHaveCount(0);
      clock.advance(4_000);
      // EV-02: the Reveal right after the card, a story beat before Set the table.
      await stageIs(table, "reveal");
      const reveal = board.locator('[data-chapter-beat="reveal"]');
      await expect(reveal.locator("[data-seal-boon]")).toHaveText(
        /^Its glyph lends you strength: .+\.$/,
      );
      await expectNoNext(pad);
      await expectToolbar(pad);
      await shot(board, testInfo, "board-seal");
      await shot(pad, testInfo, "ipad-seal");
      clock.advance(4_000);
      await stageIs(table, "table");
      const rows = deviceMain(pad).locator("[data-set-table] [data-table-row]");
      await expect(rows).toHaveCount(2);
      await expect(rows.nth(0)).toHaveAttribute("data-table-row", "seal");
      await expect(rows.nth(0)).toHaveText(/^(The Road Seal|The Keep Seal|The Warden's Seal)$/);
      await expect(rows.nth(1)).toHaveText("Quest tokens: The Barrow, The Shrine");
      await shot(board, testInfo, "board-set-table");
      await shot(pad, testInfo, "ipad-set-table");
      // EV-24 (b): tick only the tokens row; Done stays enabled and one press ends the step.
      await pad.locator('[data-table-tick="tokens"]').click();
      await expect(pad.locator('[data-table-tick="tokens"]')).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(pad.locator("button[data-table-done]")).toBeEnabled();
      await pad.locator("button[data-table-done]").click();
      await expect(deviceMain(pad)).not.toHaveAttribute("data-chapter-stage", "table", {
        timeout: 20_000,
      });
      // No skulls were held, so none were freed: no skull prompt after Done either.
      await expect(pad.locator('button[data-prompt-id^="skull-record--"]')).toHaveCount(0);
    } finally {
      await table.close();
    }
  });

  test("EV-15, EV-23: a restart in Set the table comes back with the Menu and panels closed", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const table = await openTable(browser, testInfo);
    let closed = false;
    try {
      const { pad, clock } = table;
      await stageIs(table, "card");
      clock.advance(4_000);
      await playUntilStamp(table);
      clock.advance(4_000);
      await stageIs(table, "close");
      clock.advance(4_000);
      await stageIs(table, "card");
      clock.advance(4_000);
      await stageIs(table, "table");
      const before = await menuStates(pad);
      expect(before.length).toBeGreaterThan(3);
      // A gear panel is open when the host stops.
      await pad.locator('[data-action="menu"]').click();
      await pad.locator('[data-menu] button[data-gear-item="current-party"]').click();
      await expect(table.board.locator('[data-panel="current-party"]')).toBeVisible({
        timeout: 20_000,
      });
      const { databasePath } = table.host;
      await table.close();
      closed = true;
      const again = await resumeTable(browser, testInfo, databasePath);
      try {
        await expect(deviceMain(again.pad)).toHaveAttribute("data-chapter-stage", "table", {
          timeout: 30_000,
        });
        await expect(again.pad.locator("[data-menu]")).toHaveCount(0);
        await expect(again.pad.locator("[data-panel], [data-gear-panel]")).toHaveCount(0);
        await expect(again.board.locator("[data-panel]")).toHaveCount(0);
        await expect(deviceMain(again.pad)).toHaveAttribute("data-paused", "false");
        await expectToolbar(again.pad);
        expect(await menuStates(again.pad)).toEqual(before);
        // EV-23: the same rows, Done offered again, and one press ends the step.
        await expect(again.pad.locator("[data-set-table] [data-table-row]")).toHaveText([
          "Quest tokens: The Barrow, The Shrine",
        ]);
        await again.pad.locator("button[data-table-done]").click();
        await expect(deviceMain(again.pad)).not.toHaveAttribute("data-chapter-stage", "table", {
          timeout: 20_000,
        });
      } finally {
        await again.close();
      }
    } finally {
      if (!closed) await table.close();
    }
  });
});
