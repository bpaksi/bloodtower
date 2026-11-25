import {
  type Browser,
  type BrowserContext,
  errors,
  expect,
  type Page,
  type TestInfo,
  test,
} from "@playwright/test";
import {
  enterWithoutTower,
  finishPieceCheck,
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";

/**
 * CU/16: Continue seats the saved party on the iPads joined now (DEC-952), and the iPad-drop
 * pause gets the Pick rows (DEC-953). Party size 2, hero A and hero B, no tower, `graceMs` 100.
 * Buttons are found by their `data-hunter` and `data-prompt-id`, never by their words.
 */

const STORY_ID = "test";
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SEED = "cu16-continue-repick";
/** `sessionStorage` key the iPad keeps its device token under (web/lib/session.ts). */
const DEVICE_TOKEN_KEY = "bloodtower.deviceToken";

type WireTable = {
  day: number;
  health?: unknown;
  purse?: unknown;
  daysLeft?: number | null;
  phase?: string | null;
  groups?: { heroId: string; spaceId: string }[];
};
type HookWindow = {
  __btLastBoardView?: { table?: WireTable | null };
  __btSessionSocket?: WebSocket;
  __btLastDeviceView?: { actions: { promptId: string; actionId: string; open: boolean }[] };
};

const deviceMain = (page: Page) => page.locator("main.bt-device");
const boardMain = (page: Page) => page.locator("main.bt-board");
const panel = (page: Page, heroId: string) =>
  deviceMain(page).locator(`section[data-hero-panel="${heroId}"]`);
const hunter = (page: Page, heroId: string) =>
  deviceMain(page).locator(`button[data-hunter="${heroId}"]`);

const installBoardHook = async (page: Page) => {
  await page.addInitScript(() => {
    const Native = window.WebSocket;
    class BoardTrackingWebSocket extends Native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        if (!String(url).includes("/ws")) return;
        this.addEventListener("message", (event) => {
          let message: { type?: string; payload?: unknown } | null = null;
          try {
            message = JSON.parse(String(event.data));
          } catch (error) {
            console.error("board hook: frame is not JSON", error);
            return;
          }
          if (message?.type === "boardView") {
            (window as unknown as HookWindow).__btLastBoardView = message.payload as {
              table?: WireTable;
            };
          }
        });
      }
    }
    window.WebSocket = BoardTrackingWebSocket;
  });
};

/** A granted screen wake lock, as on a real iPad, so no keep-awake notice covers the Menu. */
const grantWakeLock = async (page: Page) => {
  await page.addInitScript(() => {
    const wakeLock = {
      request: async () => ({
        released: false,
        release: async () => undefined,
        addEventListener: () => undefined,
      }),
    };
    Object.defineProperty(navigator, "wakeLock", { configurable: true, get: () => wakeLock });
  });
};

const wireTable = (page: Page) =>
  page.evaluate(() => (window as unknown as HookWindow).__btLastBoardView?.table ?? null);

const clickAct = async (page: Page, actionId: string, promptId: string) => {
  const button = page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`);
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const PREFER = ["continue", "end-turn", "record", "leave", "enter"] as const;
const SKIP = new Set([
  "quit-story",
  "reconnect",
  "go-on-without",
  "new-game",
  "done-for-tonight",
  "back",
  "tower-connect",
  "tower-calibrate",
  "split",
  "join",
  "walk",
]);
/** One open body press on the iPad's own socket. */
const pressOnce = (pad: Page) =>
  pad.evaluate(
    ({ prefer, skip }) => {
      const win = window as unknown as HookWindow;
      const socket = win.__btSessionSocket;
      const view = win.__btLastDeviceView;
      if (!socket || socket.readyState !== WebSocket.OPEN || !view) return false;
      const open = view.actions.filter((action) => action.open);
      let pick: (typeof open)[number] | null = null;
      for (const actionId of prefer) {
        if (pick) break;
        pick = open.find((action) => action.actionId === actionId) ?? null;
      }
      pick = pick ?? open.find((action) => !skip.includes(action.actionId)) ?? null;
      if (!pick) return false;
      socket.send(
        JSON.stringify({
          v: 2,
          type: "act",
          payload: { promptId: pick.promptId, actionId: pick.actionId, args: {} },
        }),
      );
      return true;
    },
    { prefer: [...PREFER], skip: [...SKIP] },
  );

const playUntil = async (pad: Page, board: Page, reached: () => Promise<boolean>, what: string) => {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await reached()) return;
    const before = JSON.stringify(await wireTable(board));
    if (!(await pressOnce(pad))) {
      await pad.waitForTimeout(50);
      continue;
    }
    try {
      await board.waitForFunction(
        (seen) =>
          JSON.stringify((window as unknown as HookWindow).__btLastBoardView?.table ?? null) !==
          seen,
        before,
        { timeout: 2_000 },
      );
    } catch (error) {
      if (!(error instanceof errors.TimeoutError)) throw error;
    }
  }
  throw new Error(`Timed out before ${what}`);
};

const atRoll = (board: Page, day: number) => async () => {
  const table = await wireTable(board);
  if (table && table.day > day) throw new Error(`Passed day ${day} (now day ${table.day})`);
  return table?.phase === "roll" && table.day === day;
};

type Rig = {
  contexts: BrowserContext[];
  open: (opts?: { token?: string }) => Promise<Page>;
  board: Page;
};

/** A fresh board and a way to open iPads, on one host. */
const rigFor = async (
  browser: Browser,
  baseURL: string,
  joinCode: string,
  contexts: BrowserContext[],
): Promise<Rig> => {
  const boardContext = await browser.newContext({ baseURL, viewport: BOARD_SIZE });
  contexts.push(boardContext);
  const board = await boardContext.newPage();
  await installBoardHook(board);
  await board.goto("/board");
  const open = async (opts: { token?: string } = {}) => {
    const context = await browser.newContext({ baseURL, ...PORTRAIT });
    contexts.push(context);
    const page = await context.newPage();
    if (opts.token) {
      await context.addInitScript(
        ([key, value]) => sessionStorage.setItem(key as string, value as string),
        [DEVICE_TOKEN_KEY, opts.token],
      );
    }
    await installSessionSocketHook(page);
    await grantWakeLock(page);
    await page.goto(`/join?code=${joinCode}`);
    await expect(page).toHaveURL(/\/device/);
    return page;
  };
  return { contexts, open, board };
};

const closeAll = async (contexts: BrowserContext[]) => {
  for (const context of contexts.splice(0)) await context.close();
};

/** iPad 1 and iPad 2 start a game of two, pick A and B, and play to day 2's roll and on. */
const startAndPlayToDay2 = async (rig: Rig) => {
  const pad1 = await rig.open();
  await enterWithoutTower(pad1);
  await clickAct(pad1, "continue", `continue-pick-story-${STORY_ID}`);
  const size = pad1.locator(
    'button[data-setting="party-size"][data-option="n-2"][data-action="set"]',
  );
  await size.click();
  await expect(size).toHaveAttribute("aria-pressed", "true");
  await clickAct(pad1, "continue", "continue-game-settings");
  const pad2 = await rig.open();
  await holdHeroesFromTest(pad1, ["hero-a"]);
  await holdHeroesFromTest(pad2, ["hero-b"]);
  await clickAct(pad1, "continue", "continue-claim-heroes");
  for (const id of SETUP_IDS) {
    await expect(deviceMain(pad1)).toHaveAttribute("data-setup-step", id, { timeout: 20_000 });
    if (id === "starting-purse") await clickAct(pad1, "spin", "spin-setup-starting-purse");
    await clickAct(pad1, "continue", `continue-setup-${id}`);
  }
  await clickAct(pad1, "continue", "continue-begin");
  for (const id of OPENING_IDS) {
    await clickAct(pad1, "continue", `continue-opening-${id.replace(".", "-")}`);
  }
  await playUntil(pad1, rig.board, atRoll(rig.board, 2), "day 2's roll");
  await clickAct(pad1, "continue", await rollPrompt(pad1));
  await expect(rig.board.locator("#band [data-day]")).toHaveText("Day 2", { timeout: 20_000 });
  return { pad1, pad2 };
};

/** The open roll press on the iPad (its prompt id carries the day). */
const rollPrompt = async (pad: Page): Promise<string> => {
  const button = pad.locator('button[data-prompt-id*="roll-done"]').first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  const id = await button.getAttribute("data-prompt-id");
  if (!id) throw new Error("The roll press has no prompt id.");
  return id;
};

/** What a game shows that must come back as it was: day, band, purse, health, where the groups stand. */
const noteGame = async (rig: Rig) => {
  const table = await wireTable(rig.board);
  if (!table) throw new Error("The board has no table to note.");
  return {
    day: table.day,
    health: table.health,
    purse: table.purse,
    daysLeft: table.daysLeft ?? null,
    groups: (table.groups ?? []).map((group) => `${group.heroId}@${group.spaceId}`),
    band: (await rig.board.locator("#band").innerText()).replace(/\s+/g, " ").trim(),
  };
};

const saveAndQuit = async (pad: Page) => {
  await pad.locator('[data-action="menu"]').click();
  await clickAct(pad, "quit-story", "menu-quit");
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", { timeout: 20_000 });
};

const expectOpenPick = async (pad: Page, text: { a: string; b: string }, count: string) => {
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "pause", { timeout: 30_000 });
  await expect(deviceMain(pad).locator("[data-pick-status]")).toHaveText(count);
  // Only the seated heroes are listed: no hero C to F.
  await expect(deviceMain(pad).locator("section[data-hero-panel]")).toHaveCount(2);
  await expect(hunter(pad, "hero-a")).toHaveText("Pick Hero A");
  await expect(hunter(pad, "hero-b")).toHaveText("Pick Hero B");
  await expect(panel(pad, "hero-a").locator("[data-claim-state]")).toHaveText(text.a);
  await expect(panel(pad, "hero-b").locator("[data-claim-state]")).toHaveText(text.b);
};

/** Both new iPads pick; play goes on by itself, and the game is as noted. */
const pickAndResume = async (
  rig: Rig,
  pickers: { a: Page; b: Page },
  noted: Awaited<ReturnType<typeof noteGame>>,
) => {
  await expect(hunter(pickers.a, "hero-a")).toBeEnabled();
  await expect(hunter(pickers.b, "hero-b")).toBeEnabled();
  await hunter(pickers.a, "hero-a").click();
  await expect(panel(pickers.a, "hero-a").locator("[data-claim-state]")).toHaveText("this iPad");
  await expect(panel(pickers.b, "hero-a").locator("[data-claim-state]")).toHaveText("another iPad");
  await expect(hunter(pickers.b, "hero-a")).toBeDisabled();
  await expect(boardMain(rig.board).locator("[data-pick-status]")).toHaveText("1 of 2 picked");
  // Play has not started with a seat empty.
  await expect(deviceMain(pickers.a)).toHaveAttribute("data-screen", "pause");
  await hunter(pickers.b, "hero-b").click();
  // The last pick ends the pause with no other press; then Continue's piece check runs (C2-11).
  await finishPieceCheck(pickers.a);
  await expect(deviceMain(pickers.a)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
  await expect(deviceMain(pickers.b)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
  await expect(boardMain(rig.board)).toHaveAttribute("data-screen", "play");
  await expect.poll(async () => (await wireTable(rig.board))?.day).toBe(noted.day);
  expect(await noteGame(rig)).toEqual(noted);
  await actsFor(rig, pickers.a, pickers.b, "hero-a");
};

/**
 * `pad` acts for `heroId`: play goes on, passing the other hero's turn on `other`, until `heroId`
 * is the acting hero; then a press on `pad` changes the board.
 */
const actsFor = async (rig: Rig, pad: Page, other: Page, heroId: string) => {
  const deadline = Date.now() + 90_000;
  const acting = () =>
    deviceMain(pad).locator("[data-step-instruction]").first().getAttribute("data-acting-hero");
  while (Date.now() < deadline) {
    const before = JSON.stringify(await wireTable(rig.board));
    const mine = (await acting()) === heroId;
    const pressed = await pressOnce(mine ? pad : other);
    await pad.waitForTimeout(150);
    if (mine && pressed && JSON.stringify(await wireTable(rig.board)) !== before) return;
  }
  throw new Error(`The iPad could not act for ${heroId}.`);
};

test.describe("CU/16 Continue re-pick", { tag: "@ipad-only" }, () => {
  test("EV-08 Save and quit, Continue on new iPads, every hero can be picked", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const session = await startAcceptanceHost(testInfo, {
      seed: SEED,
      lanHost: () => "192.0.2.10",
    });
    const contexts: BrowserContext[] = [];
    try {
      const rig = await rigFor(browser, session.baseURL, session.host.joinCode, contexts);
      const { pad1 } = await startAndPlayToDay2(rig);
      const noted = await noteGame(rig);
      expect(noted.day).toBe(2);
      await saveAndQuit(pad1);
      // iPad 1 and iPad 2 go; the grace passes.
      const old = contexts.splice(1);
      await closeAll(old);
      await rig.board.waitForTimeout(600);

      const pad3 = await rig.open();
      const pad4 = await rig.open();
      await expect(deviceMain(pad3)).toHaveAttribute("data-screen", "session", { timeout: 20_000 });
      await clickAct(pad3, "continue", "continue-saved-game");
      for (const pad of [pad3, pad4]) {
        await expectOpenPick(pad, { a: "unclaimed", b: "unclaimed" }, "0 of 2 picked");
      }
      await expect(boardMain(rig.board).locator("[data-pick-status]")).toHaveText("0 of 2 picked");
      await expect(boardMain(rig.board)).not.toContainText("The tower has gone quiet");
      await pickAndResume(rig, { a: pad3, b: pad4 }, noted);
    } finally {
      await closeAll(contexts);
      await session.host.close();
    }
  });

  /** The first sitting: a game to day 2, then the host stops with no Save and quit. */
  const firstSittingThenRestart = async (
    browser: Browser,
    testInfo: TestInfo,
    keepPad1: boolean,
  ) => {
    const first = await startAcceptanceHost(testInfo, { seed: SEED, lanHost: () => "192.0.2.10" });
    const { databasePath } = first;
    const contexts: BrowserContext[] = [];
    let noted: Awaited<ReturnType<typeof noteGame>>;
    let token: string | undefined;
    try {
      const rig = await rigFor(browser, first.baseURL, first.host.joinCode, contexts);
      const { pad1 } = await startAndPlayToDay2(rig);
      noted = await noteGame(rig);
      expect(noted.day).toBe(2);
      if (keepPad1) {
        token = (await pad1.evaluate((key) => sessionStorage.getItem(key), DEVICE_TOKEN_KEY)) ?? "";
        expect(token).not.toBe("");
      }
    } finally {
      // The host stops first, as in a crash: no iPad's drop is logged, so none is replayed.
      await first.host.close();
      await closeAll(contexts);
    }
    return { databasePath, noted, token };
  };

  const restart = async (browser: Browser, testInfo: TestInfo, databasePath: string) => {
    const restarted = await startAcceptanceHost(testInfo, {
      databasePath,
      seed: SEED,
      lanHost: () => "192.0.2.10",
    });
    const contexts: BrowserContext[] = [];
    const rig = await rigFor(browser, restarted.baseURL, restarted.host.joinCode, contexts);
    return { restarted, contexts, rig };
  };

  test("EV-09 the same after a host restart", async ({ browser }, testInfo) => {
    test.setTimeout(300_000);
    const { databasePath, noted } = await firstSittingThenRestart(browser, testInfo, false);
    const { restarted, contexts, rig } = await restart(browser, testInfo, databasePath);
    try {
      const pad3 = await rig.open();
      await expect(deviceMain(pad3)).toHaveAttribute("data-screen", "pick-story", {
        timeout: 20_000,
      });
      const pad4 = await rig.open();
      await clickAct(pad3, "continue", "continue-saved-game");
      for (const pad of [pad3, pad4]) {
        await expectOpenPick(pad, { a: "unclaimed", b: "unclaimed" }, "0 of 2 picked");
      }
      await pickAndResume(rig, { a: pad3, b: pad4 }, noted);
    } finally {
      await closeAll(contexts);
      await restarted.host.close();
    }
  });

  test("EV-10 an iPad still at the table keeps its hero", async ({ browser }, testInfo) => {
    test.setTimeout(300_000);
    const { databasePath, noted, token } = await firstSittingThenRestart(browser, testInfo, true);
    const { restarted, contexts, rig } = await restart(browser, testInfo, databasePath);
    try {
      // iPad 1 comes back as the same device (its token); iPad 2 does not.
      const pad1 = await rig.open({ token });
      await expect(deviceMain(pad1)).toHaveAttribute("data-screen", "pick-story", {
        timeout: 20_000,
      });
      const pad3 = await rig.open();
      await clickAct(pad3, "continue", "continue-saved-game");
      await expectOpenPick(pad1, { a: "this iPad", b: "unclaimed" }, "1 of 2 picked");
      await expectOpenPick(pad3, { a: "another iPad", b: "unclaimed" }, "1 of 2 picked");
      await expect(boardMain(rig.board).locator("[data-pick-status]")).toHaveText("1 of 2 picked");
      await expect(hunter(pad3, "hero-b")).toBeEnabled();
      await hunter(pad3, "hero-b").click();
      await finishPieceCheck(pad1);
      await expect(deviceMain(pad1)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
      await expect.poll(async () => (await wireTable(rig.board))?.day).toBe(noted.day);
      expect(await noteGame(rig)).toEqual(noted);
      // iPad 1 still acts for A.
      await actsFor(rig, pad1, pad3, "hero-a");
    } finally {
      await closeAll(contexts);
      await restarted.host.close();
    }
  });

  test("EV-11 a restart during the re-pick pause", async ({ browser }, testInfo) => {
    test.setTimeout(300_000);
    const { databasePath, noted } = await firstSittingThenRestart(browser, testInfo, false);
    // First re-pick pause: iPad 3 and iPad 4 join, Continue, and nobody picks.
    const second = await restart(browser, testInfo, databasePath);
    try {
      const pad3 = await second.rig.open();
      await expect(deviceMain(pad3)).toHaveAttribute("data-screen", "pick-story", {
        timeout: 20_000,
      });
      const pad4 = await second.rig.open();
      await clickAct(pad3, "continue", "continue-saved-game");
      for (const pad of [pad3, pad4]) {
        await expectOpenPick(pad, { a: "unclaimed", b: "unclaimed" }, "0 of 2 picked");
      }
    } finally {
      // The host stops first, as in a crash: no drop of these iPads is logged.
      await second.restarted.host.close();
      await closeAll(second.contexts);
    }
    // The host restarts again in the pause; the same pause comes back.
    const third = await restart(browser, testInfo, databasePath);
    try {
      const pad3 = await third.rig.open();
      await expect(deviceMain(pad3)).toHaveAttribute("data-screen", "pick-story", {
        timeout: 20_000,
      });
      const pad4 = await third.rig.open();
      await clickAct(pad3, "continue", "continue-saved-game");
      for (const pad of [pad3, pad4]) {
        await expectOpenPick(pad, { a: "unclaimed", b: "unclaimed" }, "0 of 2 picked");
      }
      await pickAndResume(third.rig, { a: pad3, b: pad4 }, noted);
    } finally {
      await closeAll(third.contexts);
      await third.restarted.host.close();
    }
  });
});
