import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Browser, expect, type Page, type TestInfo, test } from "@playwright/test";
import { openDatabase } from "../../server/db/client.ts";
import { projectGameRecords } from "../../server/events/gameStats.ts";
import { createEventStore } from "../../server/events/store.ts";
import {
  enterWithoutTower,
  enterWithTower,
  finishPieceCheck,
  holdHeroesFromTest,
  installSessionSocketHook,
  passChapterCard,
  startAcceptanceHost,
  type WaitClock,
  waitForBoardAnimationsSettled,
} from "./support/acceptance.ts";

/**
 * C3/16 (SCR-018, UI-046): the outcome scene on the Story board (1920×1080) and iPad portrait
 * (768×1024). Covers EV-01 through EV-15 plus PT-02 (four fallen buildings). Waits run on the
 * host's fake clock (`fakeWait: true`).
 */

const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const BASE_SEED = "c316-e2e~test-event:none";

const COPY = {
  winScene: "Chapter cleared.",
  winChapter1:
    "The roads are open. On the far hill, a fire burns in the old keep, where no one has lived for forty years.",
  winFinaleShattered: "The shard shatters. The Tower's call goes quiet, and the roads are yours.",
  winFinaleHolds:
    "You swear his oath and take up his watch. The Tower called to him once. It will call to you.",
  lossSkulls:
    "The last skull falls. The Tower's shadow covers the land, and the roads are his for good.",
  lossCorruption:
    "One of you hears the Tower call, and goes to it. Without them, the hunt is over.",
  lossBuildings:
    "Four strongholds have fallen. There is nowhere left to hold, and his raiders own the land.",
  tickAuto: "Moves on by itself.",
  help: "The chapter is over. See how it ended; the game stats come next.",
} as const;

const SUMMARY_RE = /^\d+ days\. \d+ quests done\. \d+ skulls on the board\.$/;

type Space = { id: string; kingdom: string; building: string | null };
const EAST_BUILDINGS = (
  JSON.parse(
    readFileSync(join(import.meta.dirname, "../../../../../packs/base/board/spaces.json"), "utf8"),
  ) as { spaces: Space[] }
).spaces.filter((space) => space.kingdom === "E" && space.building);
if (EAST_BUILDINGS.length < 4) throw new Error("The base board needs four buildings in E.");

const deviceMain = (page: Page) => page.locator("main.bt-device");
const boardMain = (page: Page) => page.locator("main.bt-board");

const c3Packs = (): string => {
  const root = mkdtempSync(join(tmpdir(), "c3-outcome-packs-"));
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

const reportNarrationEnded = (board: Page, lineId: string) =>
  board.evaluate((id) => {
    const socket = (window as unknown as { __btBoardSocket?: WebSocket }).__btBoardSocket;
    if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error("No board socket.");
    socket.send(JSON.stringify({ v: 2, type: "narration-ended", payload: { lineId: id } }));
  }, lineId);

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
  options: { c3?: boolean; tower?: boolean; seed?: string; hints?: "on" | "off" } = {},
): Promise<Table> => {
  const packsDir = options.c3 ? c3Packs() : undefined;
  const host = await startAcceptanceHost(testInfo, {
    seed: options.seed ?? BASE_SEED,
    fakeWait: true,
    ...(packsDir ? { packsDir } : {}),
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
  if ((options.hints ?? "off") === "off") {
    const hintsOff = pad.locator('button[data-setting="hints"][data-option="off"]');
    await hintsOff.click();
    await expect(hintsOff).toHaveAttribute("aria-pressed", "true");
  } else {
    const hintsOnBtn = pad.locator('button[data-setting="hints"][data-option="on"]');
    await expect(hintsOnBtn).toHaveAttribute("aria-pressed", "true");
  }
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

/** EV-10: "?" opens outcome-scene help, sends nothing, does not pause, Close returns cleanly. */
const expectHelp = async (pad: Page, stage: string, sceneId: string) => {
  const beforeSent = await sentCount(pad);
  await pad.locator('footer.bt-bar--bottom button[aria-label="Help"]').click();
  const sheet = pad.locator("[data-help]");
  await expect(sheet).toHaveAttribute("data-help-screen", "outcome-scene");
  await expect(sheet.locator("p")).toHaveText(COPY.help);
  await expect(deviceMain(pad)).toHaveAttribute("data-paused", "false");
  expect(await sentCount(pad)).toBe(beforeSent);
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toHaveCount(0);
  expect(await sentCount(pad)).toBe(beforeSent);
  await expect(deviceMain(pad)).toHaveAttribute("data-outcome-stage", stage);
  await expect(deviceMain(pad)).toHaveAttribute("data-outcome-scene", sceneId);
};

/** EV-01 & EV-11: no Next/Done body buttons on the outcome scene, and auto-advance tick shown. */
const expectNoNext = async (pad: Page) => {
  await expect(deviceMain(pad).locator(".bt-scroll button")).toHaveCount(0);
  await expect(
    deviceMain(pad).locator(
      'button[data-action-id="continue"], button[data-action-id="next"], button[data-action-id="done"]',
    ),
  ).toHaveCount(0);
  await expect(deviceMain(pad).locator("[data-tick-auto]")).toHaveText(COPY.tickAuto);
};

/** Play turns and advance chapter beats until the outcome scene appears on both screens. */
const playUntilOutcome = async (table: Table) => {
  for (let guard = 0; guard < 150; guard += 1) {
    if (await deviceMain(table.pad).getAttribute("data-outcome-stage")) {
      await expect(boardMain(table.board)).toHaveAttribute("data-outcome-stage", /.+/, {
        timeout: 20_000,
      });
      return;
    }
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
  await expect(deviceMain(table.pad)).toHaveAttribute("data-outcome-stage", "scene", {
    timeout: 20_000,
  });
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

const inspectRecords = (databasePath: string) => {
  const opened = openDatabase(databasePath);
  try {
    const store = createEventStore(opened.db);
    const records = projectGameRecords(store);
    const gameId = records[0]?.gameId ?? "";
    const gameRecords = gameId
      ? store.listEvents(gameId).filter((row) => row.kind === "game-record")
      : [];
    return { records, gameRecords, autosave: store.getAutosave() };
  } finally {
    opened.close();
  }
};

const shot = async (page: Page, testInfo: TestInfo, name: string) => {
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`) });
};

test.describe("C3/16 outcome scene: win or loss (SCR-018, UI-046)", { tag: "@ipad-only" }, () => {
  test("EV-01, EV-04, EV-06, EV-07, EV-08, EV-09, EV-10, EV-11: skulls loss, CUE-003, toolbar, help, 4 s hold to Game stats", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const table = await openTable(browser, testInfo, {
      tower: true,
      seed: `${BASE_SEED}~test-supply:1~test-kingdom:E`,
    });
    try {
      const { pad, board, clock } = table;
      await playUntilOutcome(table);
      await outcomeStageIs(table, "scene");

      // EV-09: happy path reached the outcome scene with 0 gear opens.
      await expect(boardMain(board)).toHaveAttribute("data-gear-opens", "0");

      // EV-01: loss-skulls scene, Painting, exact Loremaster line, no Next.
      const scene = board.locator(
        '.bt-dialog-frame[data-outcome-scene="loss-skulls"][data-outcome-stage="scene"]',
      );
      await expect(scene).toBeVisible();
      await expect(scene.locator("[data-painting]")).toBeVisible();
      await expect(scene.locator("[data-outcome-caption]")).toHaveText(COPY.lossSkulls);
      await expectNoNext(pad);

      // EV-07: CUE-003 fired once on the tower for this loss.
      await expect(scene).toHaveAttribute("data-cue", "CUE-003");
      const defeats = table.host.tower
        .sent()
        .filter((entry) => entry.type === "sequence" && entry.sequence === "defeat");
      expect(defeats).toEqual([{ type: "sequence", sequence: "defeat", soundIndex: 96 }]);

      // EV-04: loss screenshots (board + iPad).
      await waitForBoardAnimationsSettled(board);
      await shot(board, testInfo, "board-loss");
      await shot(pad, testInfo, "ipad-loss");

      // EV-08 & EV-10: toolbar + Help on loss scene.
      await expectToolbar(pad);
      await expectHelp(pad, "scene", "loss-skulls");

      // EV-11: 4 s (±200 ms) auto-advance without audio.
      clock.advance(3_800);
      await pad.waitForTimeout(250);
      await outcomeStageIs(table, "scene");
      clock.advance(200);
      await outcomeStageIs(table, "summary");

      // EV-01: exact summary line matching regex and fixture numbers; no painting, no Next.
      const summary = board.locator('.bt-dialog-frame[data-outcome-stage="summary"]');
      await expect(summary.locator("[data-painting]")).toHaveCount(0);
      const summaryText = (await summary.locator("[data-outcome-summary]").innerText()).trim();
      expect(summaryText).toMatch(SUMMARY_RE);
      expect(summaryText).toBe("1 days. 0 quests done. 1 skulls on the board.");
      await expectNoNext(pad);

      // EV-08 & EV-10: toolbar + Help on summary line.
      await expectToolbar(pad);
      await expectHelp(pad, "summary", "loss-skulls");

      // EV-06 & EV-11: summary holds 4 s (±200 ms), then moves both devices to Game stats (not session list).
      clock.advance(3_800);
      await pad.waitForTimeout(250);
      await outcomeStageIs(table, "summary");
      clock.advance(200);
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", { timeout: 20_000 });
      await expect(pad.locator("[data-game-stats]")).toBeVisible({ timeout: 20_000 });
      await expect(pad.locator("[data-session-buttons]")).toHaveCount(0);
      await expect(board.locator('[data-startup-panel="game-stats"]')).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      await table.close();
    }
  });

  test("PT-02: fourth fallen building plays loss-buildings with exact Copy table line", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const skulls = EAST_BUILDINGS.slice(0, 4)
      .map((space, index) => `${space.id}=${index < 3 ? 4 : 3}`)
      .join(",");
    const table = await openTable(browser, testInfo, {
      seed: `${BASE_SEED}~test-skulls:${skulls}~test-kingdom:E`,
    });
    try {
      await playUntilOutcome(table);
      await outcomeStageIs(table, "scene");
      const scene = table.board.locator(
        '.bt-dialog-frame[data-outcome-scene="loss-buildings"][data-outcome-stage="scene"]',
      );
      await expect(scene).toBeVisible();
      await expect(scene.locator("[data-painting]")).toBeVisible();
      await expect(scene.locator("[data-outcome-caption]")).toHaveText(COPY.lossBuildings);
      table.clock.advance(4_000);
      await outcomeStageIs(table, "summary");
      await expect(table.board.locator("[data-outcome-summary]")).toHaveText(SUMMARY_RE);
    } finally {
      await table.close();
    }
  });

  test("EV-02: third corruption in a quest scene reaches loss-corruption at once, before day end", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const table = await openTable(browser, testInfo, {
      seed: `${BASE_SEED}~test-at:N-dayside~test-quest:N-dayside=curse~test-named:hero-a=feral+lost`,
    });
    try {
      const { pad, board } = table;
      await clickAct(pad, "continue", "day-1-roll-done");
      await clickAct(pad, "enter", "enter--hero-a--N-dayside");
      await pad.locator('button[data-prompt-id$="--pick--quest"]').click();
      await pad.locator('button[data-prompt-id$="--qopt--take-the-curse"]').click();
      await pad.locator('button[data-prompt-id$="--qhero--hero-a"]').click();

      // Immediately on loss-corruption: no skull drop or day end first, and no place still covering it.
      await outcomeStageIs(table, "scene");
      const scene = board.locator(
        '.bt-dialog-frame[data-outcome-scene="loss-corruption"][data-outcome-stage="scene"]',
      );
      await expect(scene).toBeVisible();
      await expect(scene.locator("[data-painting]")).toBeVisible();
      await expect(scene.locator("[data-outcome-caption]")).toHaveText(COPY.lossCorruption);
      await expect(board.locator(".bt-place-still")).toHaveCount(0);
      await expect(pad.locator('button[data-prompt-id^="skull-record--"]')).toHaveCount(0);
    } finally {
      await table.close();
    }
  });

  test("EV-04, EV-05, EV-07, EV-08, EV-09, EV-10: C3 win plays win scene, win.chapter-1 (no finale line), summary, Game stats; no CUE-003", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const table = await openTable(browser, testInfo, { c3: true, tower: true });
    try {
      const { pad, board, clock } = table;
      await table.host.host.applyTestSeed("~test-quests-done:herald+ambush");
      await playUntilOutcome(table);
      await outcomeStageIs(table, "scene");

      // EV-09: happy path reached win scene with 0 gear opens.
      await expect(boardMain(board)).toHaveAttribute("data-gear-opens", "0");

      // EV-05: win scene first.
      const scene = board.locator(
        '.bt-dialog-frame[data-outcome-scene="win"][data-outcome-stage="scene"]',
      );
      await expect(scene).toBeVisible();
      await expect(scene.locator("[data-painting]")).toBeVisible();
      await expect(scene.locator("[data-outcome-caption]")).toHaveText(COPY.winScene);
      await expect(scene).not.toHaveAttribute("data-cue", "CUE-003");
      await expectNoNext(pad);

      // EV-07: CUE-003 never fires on a win.
      expect(
        table.host.tower
          .sent()
          .filter((entry) => entry.type === "sequence" && entry.sequence === "defeat"),
      ).toEqual([]);

      // EV-04: win screenshots (board + iPad).
      await waitForBoardAnimationsSettled(board);
      await shot(board, testInfo, "board-win");
      await shot(pad, testInfo, "ipad-win");

      // EV-08 & EV-10: toolbar + Help on win scene.
      await expectToolbar(pad);
      await expectHelp(pad, "scene", "win");

      // EV-05: Loremaster C3 chapter-1 closing line next (never a finale line).
      clock.advance(4_000);
      await outcomeStageIs(table, "closing");
      const closing = board.locator(
        '.bt-dialog-frame[data-outcome-scene="win"][data-outcome-stage="closing"]',
      );
      await expect(closing.locator("[data-outcome-caption]")).toHaveText(COPY.winChapter1);
      await expect(closing).not.toContainText(COPY.winFinaleShattered);
      await expect(closing).not.toContainText(COPY.winFinaleHolds);
      await expectNoNext(pad);

      // EV-05: summary line third.
      clock.advance(4_000);
      await outcomeStageIs(table, "summary");
      await expect(board.locator("[data-outcome-summary]")).toHaveText(
        "1 days. 2 quests done. 1 skulls on the board.",
      );
      await expectNoNext(pad);
      await expectToolbar(pad);
      await expectHelp(pad, "summary", "win");

      // EV-06: auto-advances to Game stats; still zero defeat cues on the tower.
      clock.advance(4_000);
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", { timeout: 20_000 });
      await expect(pad.locator("[data-game-stats]")).toBeVisible({ timeout: 20_000 });
      await expect(board.locator('[data-startup-panel="game-stats"]')).toBeVisible({
        timeout: 20_000,
      });
      expect(
        table.host.tower
          .sent()
          .filter((entry) => entry.type === "sequence" && entry.sequence === "defeat"),
      ).toEqual([]);
    } finally {
      await table.close();
    }
  });

  test("EV-03: finale win with ending-break vs ending-oath plays two distinct closing lines", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const runFinale = async (flag: string): Promise<string> => {
      const table = await openTable(browser, testInfo);
      try {
        await table.host.host.applyTestSeed(`~test-finale~test-flag:${flag}`);
        await playUntilOutcome(table);
        await outcomeStageIs(table, "scene");
        table.clock.advance(4_000);
        await outcomeStageIs(table, "closing");
        return (await table.board.locator("[data-outcome-caption]").innerText()).trim();
      } finally {
        await table.close();
      }
    };
    const shattered = await runFinale("ending-break");
    const holds = await runFinale("ending-oath");
    expect(shattered).toBe(COPY.winFinaleShattered);
    expect(holds).toBe(COPY.winFinaleHolds);
    expect(shattered).not.toBe(holds);
  });

  test("EV-06, EV-11, EV-12: narrated outcome waits past 4.5 s for audio-end, then summary holds 4 s to Game stats", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const table = await openTable(browser, testInfo, {
      seed: `${BASE_SEED}~test-supply:1~test-kingdom:E~test-outcome-line:outcome.loss-1`,
    });
    try {
      const { pad, board, clock } = table;
      await playUntilOutcome(table);
      await outcomeStageIs(table, "scene");
      await expectNoNext(pad);

      // EV-12: 4.5 s on the fake clock without audio-end does NOT advance.
      clock.advance(4_500);
      await pad.waitForTimeout(350);
      await outcomeStageIs(table, "scene");

      // Another line's end does nothing.
      await reportNarrationEnded(board, "unrelated.line");
      await pad.waitForTimeout(250);
      await outcomeStageIs(table, "scene");

      // Its own narration-ended moves to summary.
      await reportNarrationEnded(board, "outcome.loss-1");
      await outcomeStageIs(table, "summary");

      // EV-06: summary holds 4 s (±200 ms), then moves to Game stats.
      clock.advance(3_800);
      await pad.waitForTimeout(250);
      await outcomeStageIs(table, "summary");
      clock.advance(200);
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", { timeout: 20_000 });
      await expect(pad.locator("[data-game-stats]")).toBeVisible({ timeout: 20_000 });
      await expect(board.locator('[data-startup-panel="game-stats"]')).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      await table.close();
    }
  });

  test("EV-13 (run 1), EV-14, EV-15: restart on outcome lands on session screen (lost), Continue closes panels and applies outcome once", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const seed = `${BASE_SEED}~test-supply:1~test-kingdom:E`;
    const first = await openTable(browser, testInfo, { seed });
    const { databasePath } = first.host;
    let menuBefore: Awaited<ReturnType<typeof readMenu>> = [];
    try {
      await playUntilOutcome(first);
      await outcomeStageIs(first, "scene");
      menuBefore = await readMenu(first.pad);
      expect(menuBefore.length).toBeGreaterThan(3);

      // Open a gear panel while on the outcome scene before stopping the host.
      await first.pad.locator('[data-action="menu"]').click();
      await first.pad.locator('[data-menu] button[data-gear-item="current-party"]').click();
      await expect(first.board.locator('[data-panel="current-party"]')).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      await first.close();
    }

    // Restart the host on the same database.
    const restarted = await startAcceptanceHost(testInfo, { databasePath, seed, fakeWait: true });
    const clock = restarted.waitClock;
    if (!clock) throw new Error("The restarted host has no fake wait clock.");
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

      // EV-14: lands on the session screen with the game listed as lost (not half-shown, not in progress).
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", { timeout: 20_000 });
      await expect(pad.locator("[data-session-buttons]")).toBeVisible({ timeout: 20_000 });
      await expect(pad.locator("[data-game-stats]")).toHaveCount(0);
      await expect(board.locator("[data-outcome-stage]")).toHaveCount(0);
      const rowTexts = (await pad.locator("[data-game-row]").allInnerTexts()).map((t) =>
        t.trim().replace(/\s+/g, " "),
      );
      expect(rowTexts).toContain("Game 1 lost");
      await expect(board.locator("[data-session-row='game']").first()).toContainText(/lost/i);

      // Continue resumes the outcome scene.
      await clickAct(pad, "continue", "continue-saved-game");
      await holdHeroesFromTest(pad, ["hero-a"]);
      await finishPieceCheck(pad);
      await outcomeStageIs({ pad, board }, "scene");

      // EV-15: Menu and panels are closed, unpaused, toolbar present, menu items recomputed identically.
      await expect(pad.locator("[data-menu]")).toHaveCount(0);
      await expect(pad.locator("[data-panel], [data-gear-panel]")).toHaveCount(0);
      await expect(board.locator("[data-panel]")).toHaveCount(0);
      await expect(deviceMain(pad)).toHaveAttribute("data-paused", "false");
      await expectToolbar(pad);
      expect(await readMenu(pad)).toEqual(menuBefore);

      // EV-13 (run 1): auto-advances once through scene -> summary -> Game stats, one record written.
      clock.advance(4_000);
      await outcomeStageIs({ pad, board }, "summary");
      clock.advance(4_000);
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", { timeout: 20_000 });
      await expect(pad.locator("[data-game-stats]")).toBeVisible({ timeout: 20_000 });
      const db = inspectRecords(databasePath);
      expect(db.records).toHaveLength(1);
      expect(db.records[0]).toMatchObject({ outcome: "lost", sceneId: "loss-skulls" });
      expect(db.gameRecords).toHaveLength(1);
      expect(db.autosave).toBeNull();
    } finally {
      await padContext.close();
      await boardContext.close();
      await restarted.host.close();
    }
  });

  test("EV-15 (Volume panel with tower): Volume open at restart comes back closed with Volume recomputed", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const seed = `${BASE_SEED}~test-supply:1~test-kingdom:E`;
    const first = await openTable(browser, testInfo, { tower: true, seed });
    const { databasePath } = first.host;
    try {
      await playUntilOutcome(first);
      await outcomeStageIs(first, "scene");
      await first.pad.locator('[data-action="menu"]').click();
      const volume = first.pad.locator('[data-menu] button[data-gear-item="volume"]');
      await expect(volume).toBeEnabled();
      await volume.click();
      await expect(first.pad.locator('[data-gear-panel="volume"]')).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      await first.close();
    }

    const restarted = await startAcceptanceHost(testInfo, { databasePath, seed, fakeWait: true });
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
      await clickAct(pad, "continue", "continue-saved-game");
      // A saved game that used the tower asks whether to reconnect or go on without on Continue.
      await clickAct(pad, "play-without-tower", "play-without-tower");
      await holdHeroesFromTest(pad, ["hero-a"]);
      await finishPieceCheck(pad);
      await outcomeStageIs({ pad, board }, "scene");

      await expect(pad.locator("[data-menu]")).toHaveCount(0);
      await expect(pad.locator("[data-panel], [data-gear-panel]")).toHaveCount(0);
      await expect(board.locator("[data-panel]")).toHaveCount(0);
      await expect(deviceMain(pad)).toHaveAttribute("data-paused", "false");
      await expectToolbar(pad);
      const afterMenu = await readMenu(pad);
      expect(afterMenu.find((row) => row.id === "volume")).toEqual({
        id: "volume",
        disabled: true,
        reason: "Only with the tower.",
      });
      expect(afterMenu.find((row) => row.id === "tower")).toEqual({
        id: "tower",
        disabled: false,
        reason: null,
      });
    } finally {
      await padContext.close();
      await boardContext.close();
      await restarted.host.close();
    }
  });

  test("EV-13 (run 2): quit on outcome summary and Continue resumes summary and applies outcome once", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const table = await openTable(browser, testInfo, {
      seed: `${BASE_SEED}~test-supply:1~test-kingdom:E`,
    });
    try {
      const { pad, board, clock } = table;
      await playUntilOutcome(table);
      await outcomeStageIs(table, "scene");
      clock.advance(4_000);
      await outcomeStageIs(table, "summary");

      // Quit from the gear Menu while on summary.
      await pad.locator('[data-action="menu"]').click();
      await pad.locator('[data-menu] button[data-gear-item="save-and-quit"]').click();
      await pad.locator("[data-menu]").getByRole("button", { name: "Save and quit" }).click();
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", { timeout: 20_000 });
      await expect(pad.locator("[data-session-buttons]")).toBeVisible({ timeout: 20_000 });

      // Continue from the session screen resumes the exact summary step and advances once.
      await clickAct(pad, "continue", "continue-saved-game");
      await holdHeroesFromTest(pad, ["hero-a"]);
      await finishPieceCheck(pad);
      await outcomeStageIs(table, "summary");
      clock.advance(4_000);
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", { timeout: 20_000 });
      await expect(pad.locator("[data-game-stats]")).toBeVisible({ timeout: 20_000 });
      await expect(board.locator('[data-startup-panel="game-stats"]')).toBeVisible({
        timeout: 20_000,
      });

      const db = inspectRecords(table.host.databasePath);
      expect(db.records).toHaveLength(1);
      expect(db.records[0]).toMatchObject({ outcome: "lost", sceneId: "loss-skulls" });
      const finished = db.gameRecords.filter(
        (row) => (JSON.parse(row.payload) as { outcome?: string }).outcome !== "quit",
      );
      expect(finished).toHaveLength(1);
      expect(db.autosave).toBeNull();
    } finally {
      await table.close();
    }
  });

  test("Hints On: Day 1 losses (corruption and skulls) show the outcome scene without being hidden by hint.first-day-end", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    // (1) Day 1 corruption loss in a quest scene with default Hints: On.
    const corruptionTable = await openTable(browser, testInfo, {
      hints: "on",
      seed: `${BASE_SEED}~test-at:N-dayside~test-quest:N-dayside=curse~test-named:hero-a=feral+lost`,
    });
    try {
      const { pad, board, clock } = corruptionTable;
      await clickAct(pad, "continue", "day-1-roll-done");
      await clickAct(pad, "enter", "enter--hero-a--N-dayside");
      // First building hint runs on the 4 s real timer; wait until the quest option is enabled.
      const questBtn = pad.locator('button[data-prompt-id$="--pick--quest"]');
      await expect(questBtn).toBeEnabled({ timeout: 20_000 });
      await questBtn.click();
      await pad.locator('button[data-prompt-id$="--qopt--take-the-curse"]').click();
      await pad.locator('button[data-prompt-id$="--qhero--hero-a"]').click();

      await outcomeStageIs(corruptionTable, "scene");
      await expect(boardMain(board)).not.toHaveAttribute("data-hint-hold", "true");
      await expect(board.locator("[data-hint]")).toHaveCount(0);
      const scene = board.locator(
        '.bt-dialog-frame[data-outcome-scene="loss-corruption"][data-outcome-stage="scene"]',
      );
      await expect(scene).toBeVisible();
      await expect(scene.locator("[data-outcome-caption]")).toHaveText(COPY.lossCorruption);
      clock.advance(3_800);
      await pad.waitForTimeout(250);
      await outcomeStageIs(corruptionTable, "scene");
      clock.advance(200);
      await outcomeStageIs(corruptionTable, "summary");
    } finally {
      await corruptionTable.close();
    }

    // (2) Day 1 skulls loss with default Hints: On.
    const skullsTable = await openTable(browser, testInfo, {
      hints: "on",
      tower: true,
      seed: `${BASE_SEED}~test-supply:1~test-kingdom:E`,
    });
    try {
      const { pad, board, clock } = skullsTable;
      await clickAct(pad, "continue", "day-1-roll-done");
      await clickAct(pad, "end-turn", "end-turn--hero-a");
      // First skull-drop hint runs on the 4 s real timer; wait until skull-drop continue enables,
      // then record the skull landing.
      const dropBtn = pad.locator('button[data-action-id="continue"]').first();
      await expect(dropBtn).toBeEnabled({ timeout: 20_000 });
      await dropBtn.click();
      const recordBtn = pad.locator('button[data-action-id="record"]').first();
      await expect(recordBtn).toBeEnabled({ timeout: 20_000 });
      await recordBtn.click();

      await outcomeStageIs(skullsTable, "scene");
      await expect(boardMain(board)).not.toHaveAttribute("data-hint-hold", "true");
      await expect(board.locator("[data-hint]")).toHaveCount(0);
      const scene = board.locator(
        '.bt-dialog-frame[data-outcome-scene="loss-skulls"][data-outcome-stage="scene"]',
      );
      await expect(scene).toBeVisible();
      await expect(scene.locator("[data-outcome-caption]")).toHaveText(COPY.lossSkulls);
      clock.advance(3_800);
      await pad.waitForTimeout(250);
      await outcomeStageIs(skullsTable, "scene");
      clock.advance(200);
      await outcomeStageIs(skullsTable, "summary");
      clock.advance(4_000);
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", { timeout: 20_000 });
      await expect(pad.locator("[data-game-stats]")).toBeVisible({ timeout: 20_000 });
    } finally {
      await skullsTable.close();
    }
  });
});
