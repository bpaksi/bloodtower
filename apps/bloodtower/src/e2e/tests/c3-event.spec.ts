import {
  type Browser,
  type BrowserContext,
  expect,
  type Page,
  type TestInfo,
  test,
} from "@playwright/test";
import {
  enterWithoutTower,
  enterWithoutTowerKeepSound,
  holdHeroesFromTest,
  installSessionSocketHook,
  passChapterCard,
  setSoundAndKeep,
  startAcceptanceHost,
} from "./support/acceptance.ts";

/**
 * C3/12 PR 2 (UI-041): the event scene on the board and the iPad, through the real host. A group
 * ends its turn on a building with a skull and the test seed `~test-event:<name>` draws the
 * event. Time runs on the host's fake wait clock (`fakeWait`).
 */

const STORY_ID = "test";
const FOUR = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const VILLAGE = "N-egans-end";
const BUILDINGS = ["N-radiant-mountains", "N-upper-ice-fangs", VILLAGE, "N-dayside"] as const;
const HELP_LINE =
  "Something happened on the road. Make a choice if one is shown; the scene moves on by itself.";

/** Every hero at the same hit points and gold, so whichever group acts, the numbers are known. */
const each = (marker: string, value: (id: string) => string) =>
  `${marker}${FOUR.map((id) => `${id}=${value(id)}`).join(",")}`;
const HP = each("~test-hp:", () => "9/9");
const GOLD = (value: (id: string) => number) => each("~test-gold:", (id) => String(value(id)));
const SKULLS = `~test-skulls:${BUILDINGS.map((id) => `${id}=1`).join(",")}`;

const seedFor = (event: string, extra = "", at = true) =>
  `c3-ev~test-event:${event}${at ? `~test-at:${VILLAGE}` : ""}${SKULLS}${HP}${extra}`;

type Layout = "together" | "two-pads" | "apart";

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

/** Presses an option on the page's own session socket, as its button would. */
const sendAct = (page: Page, promptId: string, actionId: string) =>
  page.evaluate(
    ({ promptId: prompt, actionId: action }) => {
      const socket = (window as unknown as { __btSessionSocket?: WebSocket }).__btSessionSocket;
      if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error("No session socket.");
      socket.send(
        JSON.stringify({
          v: 2,
          type: "act",
          payload: { promptId: prompt, actionId: action, args: {} },
        }),
      );
    },
    { promptId, actionId },
  );

const deviceMain = (page: Page) => page.locator("main.bt-device");

const grantWakeLock = async (page: Page) => {
  await page.addInitScript(() => {
    const lock = {
      request: async () => ({
        released: false,
        release: async () => {},
        addEventListener: () => {},
      }),
    };
    Object.defineProperty(navigator, "wakeLock", { configurable: true, get: () => lock });
  });
};

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const startGame = async (
  browser: Browser,
  testInfo: TestInfo,
  options: { seed: string; layout?: Layout; databasePath?: string },
) => {
  const layout = options.layout ?? "together";
  const session = await startAcceptanceHost(testInfo, {
    seed: options.seed,
    databasePath: options.databasePath,
    lanHost: () => "192.0.2.10",
    seatTogether: layout !== "apart",
    fakeWait: true,
  });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const pad = await context.newPage();
  const board = await context.newPage();
  await board.setViewportSize(BOARD_SIZE);
  await installBoardSocket(board);
  await board.goto("/board");
  await installSessionSocketHook(pad);
  await installSendCounter(pad);
  await grantWakeLock(pad);
  await pad.goto(`/join?code=${session.host.joinCode}`);
  let pad2: Page | null = null;
  let context2: BrowserContext | null = null;
  if (layout !== "together") {
    await enterWithoutTowerKeepSound(pad);
    context2 = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
    pad2 = await context2.newPage();
    await installSessionSocketHook(pad2);
    await grantWakeLock(pad2);
    await pad2.goto(`/join?code=${session.host.joinCode}`);
    await expect(pad2).toHaveURL(/\/device/);
    await setSoundAndKeep(pad);
  } else {
    await enterWithoutTower(pad);
  }
  await clickAct(pad, "continue", `continue-pick-story-${STORY_ID}`);
  const size = pad.locator(
    `button[data-setting="party-size"][data-option="n-4"][data-action="set"]`,
  );
  await size.click();
  await expect(size).toHaveAttribute("aria-pressed", "true");
  await clickAct(pad, "continue", "continue-game-settings");
  if (pad2) {
    await holdHeroesFromTest(pad, FOUR.slice(0, -1));
    await holdHeroesFromTest(pad2, FOUR.slice(-1));
  } else {
    await holdHeroesFromTest(pad, [...FOUR]);
  }
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
  await passChapterCard(pad, session.waitClock);
  await clickAct(pad, "continue");
  await expect(board.locator("#band [data-days-left]")).toBeVisible({ timeout: 20_000 });
  return { session, context, pad, board, pad2, context2 };
};

type Game = Awaited<ReturnType<typeof startGame>>;

/** Ends the acting group's turn (on whichever iPad holds it); the event opens on the board. */
const reachEvent = async (game: Game) => {
  const pads = [game.pad, game.pad2].filter((page): page is Page => page !== null);
  const end = (page: Page) => page.locator('button[data-action-id="end-turn"]');
  await expect
    .poll(
      async () => (await Promise.all(pads.map((page) => end(page).count()))).some((n) => n > 0),
      {
        timeout: 20_000,
      },
    )
    .toBe(true);
  for (const page of pads) {
    if ((await end(page).count()) > 0) {
      await end(page).first().click();
      break;
    }
  }
  await expect(game.board.locator("[data-event-scene]")).toBeVisible({ timeout: 20_000 });
};

const play = async (browser: Browser, testInfo: TestInfo, seed: string, layout?: Layout) => {
  const game = await startGame(browser, testInfo, { seed, layout });
  await reachEvent(game);
  return game;
};

const closeAll = async (game: {
  context: BrowserContext;
  session: { host: { close: () => Promise<void> } };
}) => {
  await game.context.close();
  await game.session.host.close();
};

const scene = (board: Page) => board.locator("[data-event-scene]");
const words = (board: Page) => board.locator("[data-event-words] [data-dialog-line]");
const options = (pad: Page) => pad.locator("main.bt-device [data-event-option]");
/** Every button of the iPad body except the toolbar. */
const bodyButtons = (pad: Page) => deviceMain(pad).locator("button");
const health = (board: Page, heroId: string) =>
  board.locator(`#band [data-hero-panel="${heroId}"] [data-health]`);

/**
 * The edge band shows hit points only while an event is open (C3/12). After
 * `[data-event-scene]` is gone, the same numbers are on Current party.
 */
const expectPartyHealth = async (pad: Page, board: Page, hp: string) => {
  await pad.locator('[data-action="menu"]').click();
  const row = pad.locator('[data-menu] button[data-gear-item="current-party"]');
  await expect(row).toBeEnabled({ timeout: 20_000 });
  await row.click();
  for (const id of FOUR) {
    await expect(
      board.locator(`[data-panel="current-party"] [data-hero="${id}"] [data-hp]`),
    ).toHaveText(`HP ${hp}`, { timeout: 20_000 });
  }
};

/** Time on the host's fake clock, then a beat for the views to arrive. */
const tick = async (game: Game, ms: number) => {
  game.session.waitClock?.advance(ms);
  await game.pad.waitForTimeout(300);
};

const expectToolbar = async (page: Page) => {
  const footer = page.locator("footer.bt-bar--bottom");
  await expect(footer).toBeVisible();
  await expect(footer).toBeInViewport();
  const buttons = footer.locator("button");
  await expect(buttons.first()).toHaveText("?");
  await expect(buttons.last()).toHaveAttribute("data-action", "menu");
  for (const end of [buttons.first(), buttons.last()]) {
    const box = await end.boundingBox();
    expect(box).not.toBeNull();
    if (!box) continue;
    const onTop = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest("footer.bt-bar--bottom") != null,
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    );
    expect(onTop).toBe(true);
  }
};

/** "?" then Close: the event-scene sheet, nothing sent, the same state after (EV-12). */
const checkHelp = async (pad: Page, board: Page) => {
  const sentBefore = await sentCount(pad);
  const paused = await deviceMain(pad).getAttribute("data-paused");
  const before = await words(board).allInnerTexts();
  await pad.locator('footer.bt-bar--bottom [data-action="help"]').click();
  const sheet = pad.locator("[data-help]");
  await expect(sheet).toHaveAttribute("data-help-screen", "event-scene");
  await expect(sheet.locator("p")).toHaveText(HELP_LINE);
  await expect(deviceMain(pad)).toHaveAttribute("data-paused", paused ?? "false");
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toHaveCount(0);
  expect(await sentCount(pad)).toBe(sentBefore);
  expect(await words(board).allInnerTexts()).toEqual(before);
};

const shoot = async (testInfo: TestInfo, name: string, pad: Page, board: Page) => {
  await board.waitForTimeout(400);
  const dir = process.env.BT_SHOTS_DIR;
  if (dir) {
    await pad.screenshot({ path: `${dir}/${name}-ipad.png` });
    await board.screenshot({ path: `${dir}/${name}-board.png` });
  }
  await testInfo.attach(`${name}-ipad`, { body: await pad.screenshot(), contentType: "image/png" });
  await testInfo.attach(`${name}-board`, {
    body: await board.screenshot(),
    contentType: "image/png",
  });
};

/**
 * The iPad hands its heroes back before the host goes down. A save keeps the holder's device id,
 * and a host restart cannot log that device's drop (a quit stops the replay before it), so
 * without this the new iPad cannot take the heroes and is not at the event (DEC-019). The
 * releases are logged presses: a Continue replays them.
 */
const releaseHeroes = async (pad: Page) => {
  await pad.evaluate(
    (heroes) => {
      const socket = (window as unknown as { __btSessionSocket?: WebSocket }).__btSessionSocket;
      if (!socket || socket.readyState !== WebSocket.OPEN)
        throw new Error("Session socket is not open.");
      for (const heroId of heroes) {
        socket.send(
          JSON.stringify({
            v: 2,
            type: "act",
            payload: { promptId: "hero-hold", actionId: "release", args: { heroId } },
          }),
        );
      }
    },
    [...FOUR],
  );
  await pad.waitForTimeout(500);
};

const quitToSession = async (pad: Page) => {
  await pad.locator('[data-action="menu"]').click();
  await pad.locator('button[data-gear-item="save-and-quit"]').click();
  await pad.locator("[data-menu]").getByRole("button", { name: "Save and quit" }).click();
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "session", { timeout: 30_000 });
};

/** Closes the host, starts another on the same file, joins and Continues; the heroes are held. */
const resumeGame = async (
  browser: Browser,
  testInfo: TestInfo,
  from: { databasePath: string; seed: string },
) => {
  const session = await startAcceptanceHost(testInfo, {
    databasePath: from.databasePath,
    seed: from.seed,
    seatTogether: true,
    fakeWait: true,
  });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const pad = await context.newPage();
  const board = await context.newPage();
  await board.setViewportSize(BOARD_SIZE);
  await installBoardSocket(board);
  await board.goto("/board");
  await installSessionSocketHook(pad);
  await installSendCounter(pad);
  await grantWakeLock(pad);
  await pad.goto(`/join?code=${session.host.joinCode}`);
  await clickAct(pad, "continue", "continue-saved-game");
  await holdHeroesFromTest(pad, [...FOUR]);
  await expect(deviceMain(pad)).toHaveAttribute("data-screen", "play", { timeout: 30_000 });
  return { session, context, pad, board };
};

test.describe("C3/12 the event scene: the painting, the words and the choice", {
  tag: "@ipad-only",
}, () => {
  test("EV-01, EV-10, EV-12: a hazard shows two costs and waits for a press", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const game = await play(
      browser,
      testInfo,
      seedFor("hazard-storm", "~test-event-line:event.hazard.1"),
    );
    const { pad, board } = game;
    try {
      // The board: the painting, then the words on a Scroll.
      await expect(board.locator("[data-event-painting]")).toBeVisible();
      await expect(board.locator("[data-event-words][data-scroll]")).toBeVisible();
      await expect(words(board)).toHaveText("Trouble on the road. Lose 2 hit points.");
      // The iPad: two cost buttons.
      await expect(options(pad)).toHaveCount(2);
      await expect(options(pad).nth(0)).toHaveText("Lose 2 hit points");
      await expect(options(pad).nth(1)).toBeVisible();
      await expect(pad.getByRole("button", { name: "Next" })).toHaveCount(0);
      await expectToolbar(pad);
      await checkHelp(pad, board);
      await shoot(testInfo, "ev05-hazard", pad, board);
      // 5 s on the clock, with and without an audio end: still on the choice.
      await tick(game, 5_000);
      await expect(options(pad)).toHaveCount(2);
      await reportNarrationEnded(board, "event.hazard.1");
      await tick(game, 5_000);
      await expect(options(pad)).toHaveCount(2);
      await expect(board.locator("[data-event-cost]")).toHaveCount(0);
      await expect(health(board, "hero-a")).toHaveAttribute("data-health", "9/9");
      // The hit-point cost: the cost line, and −2 on every present hero.
      await options(pad).nth(0).click();
      await expect(board.locator("[data-event-cost]")).toHaveText("−2 hit points each");
      for (const id of FOUR) await expect(health(board, id)).toHaveAttribute("data-health", "7/9");
      await expectToolbar(pad);
      await checkHelp(pad, board);
    } finally {
      await closeAll(game);
    }
  });

  test("EV-02, EV-05: foes offer Go around and Pay them off, no Fight; the purse gates the pay-off", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(420_000);
    for (const [gold, enabled] of [
      [4, false],
      [5, true],
    ] as const) {
      const game = await play(
        browser,
        testInfo,
        seedFor(
          "foes",
          GOLD((id) => (id === "hero-a" ? gold : 0)),
        ),
      );
      const { pad, board } = game;
      try {
        await expect(words(board)).toHaveText("Foes block the way. Stand fast or turn back.");
        await expect(options(pad)).toHaveCount(2);
        await expect(pad.locator('[data-event-option="go-around"]')).toHaveText("Go around");
        const pay = pad.locator('[data-event-option="pay-off"]');
        await expect(pay).toHaveText("Pay them off (5 gold)");
        if (enabled) await expect(pay).toBeEnabled();
        else await expect(pay).toBeDisabled();
        await expect(pad.locator('[data-event-option="go-around"]')).toBeEnabled();
        await expect(deviceMain(pad).getByRole("button", { name: /fight/i })).toHaveCount(0);
        await expect(pad.locator('[data-event-option="fight"]')).toHaveCount(0);
        await tick(game, 5_000);
        await expect(options(pad)).toHaveCount(2);
        if (enabled) await shoot(testInfo, "ev05-foes", pad, board);
      } finally {
        await closeAll(game);
      }
    }
  });

  test("EV-03, EV-09: only a present hero's iPad chooses; the first of two presses wins", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(420_000);
    // Apart: every group starts at the village (~test-at), so the first group in the turn order
    // draws the event. The acting group's iPad chooses, the other iPad shows the waiting line.
    const apart = await play(browser, testInfo, seedFor("hazard-storm"), "apart");
    try {
      const { pad, pad2 } = apart;
      if (!pad2) throw new Error("No second iPad.");
      const decide = (page: Page) => page.locator("[data-event-choices], [data-event-waiting]");
      await expect(decide(pad)).toBeVisible({ timeout: 20_000 });
      await expect(decide(pad2)).toBeVisible({ timeout: 20_000 });
      const padChooses = (await options(pad).count()) > 0;
      const [chooser, absent] = padChooses ? [pad, pad2] : [pad2, pad];
      await expect(options(chooser)).toHaveCount(2);
      await expect(absent.locator("[data-event-waiting]")).toHaveText(
        "The other group is deciding.",
      );
      await expect(options(absent)).toHaveCount(0);
      await expect(bodyButtons(absent).filter({ hasText: /Lose|Go around|Pay/ })).toHaveCount(0);
      await expectToolbar(absent);
    } finally {
      await closeAll(apart);
      await apart.context2?.close();
    }
    // Two iPads at one group: cost 1 on iPad A, then cost 2 on iPad B at once. Cost 1 wins.
    const game = await play(browser, testInfo, seedFor("hazard-storm"), "two-pads");
    try {
      const { pad, pad2, board } = game;
      if (!pad2) throw new Error("No second iPad.");
      await expect(options(pad)).toHaveCount(2);
      await expect(options(pad2)).toHaveCount(2);
      const first = await options(pad).nth(0).getAttribute("data-prompt-id");
      const second = await options(pad2).nth(1).getAttribute("data-prompt-id");
      if (!first || !second) throw new Error("No option prompt ids.");
      await sendAct(pad, first, "choose");
      await sendAct(pad2, second, "choose");
      await expect(board.locator("[data-event-cost]")).toHaveText("−2 hit points each");
      for (const id of FOUR) await expect(health(board, id)).toHaveAttribute("data-health", "7/9");
      await expect(board.locator('[data-event-scene][data-event-result="lose-turn"]')).toHaveCount(
        0,
      );
      // Both iPads moved on to the same step: no buttons left to press.
      await expect(options(pad)).toHaveCount(0);
      await expect(options(pad2)).toHaveCount(0);
      await tick(game, 4_100);
      await expect(scene(board)).toHaveCount(0, { timeout: 20_000 });
      await expect(options(pad2)).toHaveCount(0);
    } finally {
      await closeAll(game);
      await game.context2?.close();
    }
  });

  test("EV-07: a healer in the group saves the hero from a plague: the saved line, no buttons, no loss", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const game = await play(browser, testInfo, seedFor("hazard-plague"));
    const { pad, board } = game;
    try {
      await expect(board.locator("[data-event-result='saved']")).toBeVisible();
      await expect(words(board)).toHaveText(/ saved you\. Nothing is lost\.$/);
      await expect(board.locator("[data-event-cost]")).toHaveCount(0);
      await expect(options(pad)).toHaveCount(0);
      await expect(bodyButtons(pad).filter({ hasText: /Next|Continue/ })).toHaveCount(0);
      await expect(deviceMain(pad).locator("[data-action-id]")).toHaveCount(0);
      for (const id of FOUR) await expect(health(board, id)).toHaveAttribute("data-health", "9/9");
      await tick(game, 4_100);
      await expect(scene(board)).toHaveCount(0, { timeout: 20_000 });
      await expectPartyHealth(pad, board, "9/9");
    } finally {
      await closeAll(game);
    }
  });

  test("EV-04, EV-13: Quiet is a mood line with no Next; it moves on by itself after 4 s", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const game = await play(browser, testInfo, seedFor("quiet"));
    const { pad, board } = game;
    try {
      await expect(words(board)).toHaveText("The road is still. Nothing comes.");
      await expect(board.locator("[data-event-cost]")).toHaveCount(0);
      await expect(board.locator("[data-reveal]")).toHaveCount(0);
      await expect(options(pad)).toHaveCount(0);
      await expect(pad.getByRole("button", { name: "Next" })).toHaveCount(0);
      await expect(bodyButtons(pad).filter({ hasText: /Next|Continue/ })).toHaveCount(0);
      await expect(board.locator("[data-event-tick]")).toHaveText("Moves on by itself.");
      await expectToolbar(pad);
      await checkHelp(pad, board);
      await tick(game, 3_800);
      await expect(scene(board)).toBeVisible();
      await tick(game, 300);
      await expect(scene(board)).toHaveCount(0, { timeout: 20_000 });
    } finally {
      await closeAll(game);
    }
  });

  test("EV-05: the board and the iPad keep the mockup's order", async ({ browser }, testInfo) => {
    test.setTimeout(300_000);
    const game = await play(browser, testInfo, seedFor("hazard-storm"));
    const { pad, board } = game;
    try {
      // Board: painting, then Scroll. iPad: the two costs, in the engine's order, above the toolbar.
      const order = await board
        .locator("[data-event-scene] > *")
        .evaluateAll((nodes) =>
          nodes.map((node) =>
            node.getAttribute("data-event-painting") !== null ? "painting" : "scroll",
          ),
        );
      expect(order).toEqual(["painting", "scroll"]);
      expect(await options(pad).allInnerTexts()).toEqual(["Lose 2 hit points", "Lose a turn"]);
      const choices = await options(pad).first().boundingBox();
      const toolbar = await pad.locator("footer.bt-bar--bottom").boundingBox();
      expect(choices && toolbar && choices.y < toolbar.y).toBe(true);
      await shoot(testInfo, "ev05-hazard-order", pad, board);
    } finally {
      await closeAll(game);
    }
  });

  test("EV-06, EV-10, EV-11: a windfall shows a Reveal with +5 gold and moves on by itself", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const game = await play(
      browser,
      testInfo,
      seedFor(
        "windfall",
        GOLD(() => 2),
      ),
    );
    const { pad, board } = game;
    try {
      await expect(board.locator("[data-reveal]")).toHaveText("+5 gold");
      await expect(words(board)).toHaveText("Fortune smiles. You find 5 gold.");
      await expect(board.locator("#band [data-purse]")).toHaveAttribute("data-purse", "13");
      await expect(options(pad)).toHaveCount(0);
      await expect(bodyButtons(pad).filter({ hasText: /Next|Continue/ })).toHaveCount(0);
      await expect(deviceMain(pad).locator("[data-action-id]")).toHaveCount(0);
      await expectToolbar(pad);
      await checkHelp(pad, board);
      await tick(game, 4_100);
      await expect(scene(board)).toHaveCount(0, { timeout: 20_000 });
      // The happy path never opened the Menu or help (EV-11).
      await expect(pad.locator("[data-menu]")).toHaveCount(0);
      await expect(pad.locator("[data-help]")).toHaveCount(0);
    } finally {
      await closeAll(game);
    }
  });

  test("EV-08: a disaster offers Go around and Pay them off only", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const game = await play(
      browser,
      testInfo,
      seedFor(
        "disaster",
        GOLD(() => 5),
      ),
    );
    const { pad, board } = game;
    try {
      await expect(words(board)).toHaveText("Foes block the way. Stand fast or turn back.");
      await expect(options(pad)).toHaveCount(2);
      expect(await options(pad).allInnerTexts()).toEqual(["Go around", "Pay them off (5 gold)"]);
      await expect(deviceMain(pad).getByRole("button", { name: /fight/i })).toHaveCount(0);
      await tick(game, 5_000);
      await expect(options(pad)).toHaveCount(2);
      await expectToolbar(pad);
    } finally {
      await closeAll(game);
    }
  });

  test("EV-13, EV-14: the cost's result and a narrated Quiet wait for their audio end", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(420_000);
    // The result step after a pick, no audio: 4 s.
    const hazard = await play(browser, testInfo, seedFor("hazard-storm"));
    try {
      await options(hazard.pad).nth(0).click();
      await expect(hazard.board.locator("[data-event-cost]")).toBeVisible();
      await expect(bodyButtons(hazard.pad).filter({ hasText: /Next|Continue/ })).toHaveCount(0);
      await tick(hazard, 3_800);
      await expect(scene(hazard.board)).toBeVisible();
      await tick(hazard, 300);
      await expect(scene(hazard.board)).toHaveCount(0, { timeout: 20_000 });
    } finally {
      await closeAll(hazard);
    }
    // Narrated Quiet: no timer, only its own line's end.
    const quiet = await play(browser, testInfo, seedFor("quiet", "~test-event-line:event.quiet.1"));
    try {
      await tick(quiet, 4_500);
      await expect(scene(quiet.board)).toBeVisible();
      await reportNarrationEnded(quiet.board, "another.line");
      await quiet.pad.waitForTimeout(300);
      await expect(scene(quiet.board)).toBeVisible();
      await reportNarrationEnded(quiet.board, "event.quiet.1");
      await expect(scene(quiet.board)).toHaveCount(0, { timeout: 20_000 });
    } finally {
      await closeAll(quiet);
    }
  });

  for (const how of ["restart", "quit"] as const) {
    test(`EV-15: a ${how} during the cost result resumes it and applies it once`, async ({
      browser,
    }, testInfo) => {
      test.setTimeout(420_000);
      const seed = seedFor("hazard-storm");
      const first = await play(browser, testInfo, seed);
      const { databasePath } = first.session;
      try {
        await options(first.pad).nth(0).click();
        await expect(first.board.locator("[data-event-cost]")).toBeVisible();
        if (how === "quit") await quitToSession(first.pad);
      } finally {
        await closeAll(first);
      }
      const again = await resumeGame(browser, testInfo, { databasePath, seed });
      try {
        await expect(again.board.locator("[data-event-cost]")).toHaveText("−2 hit points each", {
          timeout: 30_000,
        });
        // 9 − 2 = 7, once (a second application would read 5).
        for (const id of FOUR) {
          await expect(health(again.board, id)).toHaveAttribute("data-health", "7/9");
        }
        again.session.waitClock?.advance(4_100);
        await expect(scene(again.board)).toHaveCount(0, { timeout: 20_000 });
        await expectPartyHealth(again.pad, again.board, "7/9");
      } finally {
        await closeAll(again);
      }
    });
  }

  for (const how of ["restart", "quit"] as const) {
    test(`EV-15: a ${how} during a windfall Reveal resumes it and pays the gold once`, async ({
      browser,
    }, testInfo) => {
      test.setTimeout(420_000);
      const seed = seedFor(
        "windfall",
        GOLD(() => 2),
      );
      const first = await play(browser, testInfo, seed);
      const { databasePath } = first.session;
      try {
        await expect(first.board.locator("[data-reveal]")).toHaveText("+5 gold");
        if (how === "quit") await quitToSession(first.pad);
      } finally {
        await closeAll(first);
      }
      const again = await resumeGame(browser, testInfo, { databasePath, seed });
      try {
        await expect(again.board.locator("[data-reveal]")).toHaveText("+5 gold", {
          timeout: 30_000,
        });
        // 4 × 2 + 5 = 13, once (a second application would read 18).
        await expect(again.board.locator("#band [data-purse]")).toHaveAttribute("data-purse", "13");
        again.session.waitClock?.advance(4_100);
        await expect(scene(again.board)).toHaveCount(0, { timeout: 20_000 });
      } finally {
        await closeAll(again);
      }
    });
  }

  test("EV-16: Continue keeps the open event: the same painting and two costs", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(420_000);
    const seed = seedFor("hazard-storm");
    const first = await play(browser, testInfo, seed);
    const { databasePath } = first.session;
    let before: string[] = [];
    try {
      await expect(options(first.pad)).toHaveCount(2, { timeout: 30_000 });
      before = await options(first.pad).allInnerTexts();
      expect(before).toHaveLength(2);
      await releaseHeroes(first.pad);
      await quitToSession(first.pad);
    } finally {
      await closeAll(first);
    }
    const again = await resumeGame(browser, testInfo, { databasePath, seed });
    try {
      await expect(options(again.pad)).toHaveCount(2, { timeout: 30_000 });
      expect(await options(again.pad).allInnerTexts()).toEqual(before);
      await expect(again.board.locator("[data-event-painting]")).toBeVisible();
      await expect(words(again.board)).toHaveText("Trouble on the road. Lose 2 hit points.");
      await expect(scene(again.board)).toHaveAttribute("data-event-stage", "choose");
    } finally {
      await closeAll(again);
    }
  });

  test("EV-17: a Volume panel open at a restart comes back closed, unpaused, with the toolbar", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(420_000);
    const seed = seedFor("hazard-storm");
    const first = await play(browser, testInfo, seed);
    const { databasePath } = first.session;
    const readMenu = (page: Page) =>
      page.locator("[data-menu] [data-gear-item]").evaluateAll((items) =>
        items.map((item) => ({
          id: item.getAttribute("data-gear-item"),
          enabled: !(item as HTMLButtonElement).disabled,
          reason: item.querySelector("[data-reason]")?.textContent ?? null,
        })),
      );
    let menuBefore: Awaited<ReturnType<typeof readMenu>> = [];
    try {
      await first.pad.locator('[data-action="menu"]').click();
      menuBefore = await readMenu(first.pad);
      expect(menuBefore.length).toBeGreaterThan(0);
      const volume = first.pad.locator('[data-menu] button[data-gear-item="volume"]');
      if (await volume.isEnabled()) await volume.click();
      else await first.pad.locator('[data-menu] button[data-gear-item="current-party"]').click();
      await expect(first.board.locator("[data-panel]")).toBeVisible({ timeout: 20_000 });
      await releaseHeroes(first.pad);
    } finally {
      await closeAll(first);
    }
    const again = await resumeGame(browser, testInfo, { databasePath, seed });
    try {
      await expect(options(again.pad)).toHaveCount(2, { timeout: 30_000 });
      await expect(again.pad.locator("[data-menu]")).toHaveCount(0);
      await expect(again.pad.locator("[data-panel]")).toHaveCount(0);
      await expect(again.board.locator("[data-panel]")).toHaveCount(0);
      await expect(deviceMain(again.pad)).toHaveAttribute("data-paused", "false");
      await expectToolbar(again.pad);
      await again.pad.locator('[data-action="menu"]').click();
      expect(await readMenu(again.pad)).toEqual(menuBefore);
    } finally {
      await closeAll(again);
    }
  });
});
