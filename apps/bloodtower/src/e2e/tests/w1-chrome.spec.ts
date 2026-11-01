import { expect, type Locator, type Page, test } from "@playwright/test";
import {
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";

const STORY_ID = "test";
const HERO_IDS = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;

const deviceMain = (page: Page) => page.locator("main.bt-device");

const clickAct = async (page: Page, actionId: string, promptId: string) => {
  const button = page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`);
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const box = async (locator: Locator) => {
  const found = await locator.boundingBox();
  if (!found) throw new Error("No box.");
  return found;
};

const expectBar = async (page: Page, ipad: boolean) => {
  const bar = page.locator("[data-bottom-bar]");
  await expect(bar).toHaveCount(1);
  await expect(bar).toBeVisible();
  const view = page.viewportSize();
  if (!view) throw new Error("No viewport.");
  const barBox = await box(bar);
  expect(Math.abs(view.height - (barBox.y + barBox.height))).toBeLessThanOrEqual(8);
  const help = await box(bar.locator('[data-action="help"]'));
  const back = await box(bar.locator('[data-action="back"]'));
  const replay = await box(bar.locator('[data-action="replay"]'));
  const menu = await box(bar.locator('[data-action="menu"]'));
  expect(help.x).toBeLessThan(back.x);
  expect(back.x).toBeLessThan(replay.x);
  expect(replay.x).toBeLessThan(menu.x);
  const left = help.x;
  const right = view.width - (menu.x + menu.width);
  expect(Math.abs(left - right)).toBeLessThanOrEqual(12);
  if (ipad) {
    expect(left).toBeGreaterThanOrEqual(24);
    expect(right).toBeGreaterThanOrEqual(24);
  }
  await expect(bar.locator("button").first()).toHaveText("?");
  await expect(bar.locator("button").last()).toHaveAttribute("data-action", "menu");
};

const expectMuted = async (page: Page) => {
  const media = await page.evaluate(() => ({
    videos: [...document.querySelectorAll("video")].map((v) => ({
      muted: v.muted,
      volume: v.volume,
    })),
    playing: [...document.querySelectorAll("audio")].filter((a) => !a.paused).length,
  }));
  for (const video of media.videos) {
    expect(video.muted).toBe(true);
    expect(video.volume).toBe(0);
  }
  expect(media.playing).toBe(0);
};

const toClaim = async (page: Page, joinCode: string, ipad: boolean) => {
  await installSessionSocketHook(page);
  await page.goto(`/join?code=${joinCode}`);
  await expect(page).toHaveURL(/\/device/);
  const walk = [
    ["splash", "splash-play"],
    ["pick-story", `continue-pick-story-${STORY_ID}`],
    ["game-settings", "continue-game-settings"],
  ] as const;
  for (const [screen, promptId] of walk) {
    await expect(deviceMain(page)).toHaveAttribute("data-screen", screen);
    await expectBar(page, ipad);
    await expectMuted(page);
    await clickAct(page, "continue", promptId);
  }
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "tower-connect");
  await expectBar(page, ipad);
  await expectMuted(page);
  await clickAct(page, "play-without-tower", "play-without-tower");
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "claim-heroes");
  await expectBar(page, ipad);
  await expectMuted(page);
};

test("W1 /join with no code shows the bar, a disabled Back and Replay, and the gear", async ({
  page,
}, testInfo) => {
  const ipad = testInfo.project.name === "ipad";
  await page.goto("/join");
  await expect(page.getByRole("heading", { name: "Join" })).toBeVisible();
  await expect(
    page.locator('input[name="code"], input[inputmode="numeric"]').first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter the table" })).toBeVisible();
  await expectBar(page, ipad);
  const bar = page.locator("[data-bottom-bar]");
  await expect(bar.locator('[data-action="back"]')).toHaveText("Back");
  await expect(bar.locator('[data-action="back"]')).toBeDisabled();
  await expect(bar.locator('[data-action="replay"]')).toHaveText("Replay");
  await expect(bar.locator('[data-action="replay"]')).toBeDisabled();
  const menu = bar.locator('[data-action="menu"]');
  await expect(menu).toBeEnabled();
  await expect(menu).toHaveAccessibleName("Menu");
  expect((await menu.innerText()).trim()).toBe("");
  await expect(menu.locator("svg, img")).toHaveCount(1);
  expect(await bar.innerText()).not.toMatch(/claim|hold|pick/i);
  await expectMuted(page);

  await menu.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveCount(1);
  const view = page.viewportSize();
  if (!view) throw new Error("No viewport.");
  const dialogBox = await box(dialog);
  expect(Math.abs(dialogBox.x + dialogBox.width / 2 - view.width / 2)).toBeLessThanOrEqual(24);
  expect(Math.abs(dialogBox.y + dialogBox.height / 2 - view.height / 2)).toBeLessThanOrEqual(24);
  expect(dialogBox.x).toBeGreaterThan(0);
  expect(dialogBox.y).toBeGreaterThan(0);
  expect(dialogBox.x + dialogBox.width).toBeLessThan(view.width);
  expect(dialogBox.y + dialogBox.height).toBeLessThan(view.height);
  for (const name of ["Look up", "Table", "Leave"]) {
    await expect(dialog.getByRole("heading", { name })).toHaveCount(1);
    await expect(page.getByRole("heading", { name })).toHaveCount(1);
  }
  await expect(dialog.locator('[data-action="back"], [data-action="replay"]')).toHaveCount(0);
  await expect(bar).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await menu.click();
  await expect(dialog).toHaveCount(1);
  await menu.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Join" })).toBeVisible();
});

test("W1 the bar, Menu dialog, pinned Continue and no page scroll on claim-heroes", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const ipad = testInfo.project.name === "ipad";
  const session = await startAcceptanceHost(testInfo, { seed: "w1-chrome" });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const page = await context.newPage();
  try {
    await toClaim(page, session.host.joinCode, ipad);
    const bar = page.locator("[data-bottom-bar]");

    await bar.locator('[data-action="menu"]').click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveCount(1);
    await expect(dialog.getByRole("heading", { name: "Look up" })).toHaveCount(1);
    await expect(dialog.getByRole("heading", { name: "Table" })).toHaveCount(1);
    await expect(dialog.getByRole("heading", { name: "Leave" })).toHaveCount(1);
    await expect(dialog.locator('[data-action="back"], [data-action="replay"]')).toHaveCount(0);
    await expect(bar).toBeVisible();
    const view = page.viewportSize();
    if (!view) throw new Error("No viewport.");
    const dialogBox = await box(dialog);
    expect(Math.abs(dialogBox.x + dialogBox.width / 2 - view.width / 2)).toBeLessThanOrEqual(24);
    expect(Math.abs(dialogBox.y + dialogBox.height / 2 - view.height / 2)).toBeLessThanOrEqual(24);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "claim-heroes");

    if (testInfo.project.name === "phone") {
      await holdHeroesFromTest(page, [...HERO_IDS]);
      await page.locator(".bt-scroll").evaluate((node) => {
        const spacer = document.createElement("div");
        spacer.style.height = "3000px";
        node.appendChild(spacer);
        node.scrollTop = node.scrollHeight;
      });
      const scroller = await page.evaluate(() => ({
        top: document.scrollingElement?.scrollTop ?? 0,
        height: document.scrollingElement?.scrollHeight ?? 0,
        inner: window.innerHeight,
      }));
      expect(scroller.top).toBe(0);
      expect(scroller.height).toBeLessThanOrEqual(scroller.inner);
      const barBox = await box(bar);
      expect(Math.abs(view.height - (barBox.y + barBox.height))).toBeLessThanOrEqual(8);
      const next = page.locator('button[data-action-id="continue"]');
      await expect(next).toHaveCount(1);
      const nextBox = await box(next);
      expect(nextBox.y).toBeGreaterThanOrEqual(0);
      expect(nextBox.y + nextBox.height).toBeLessThanOrEqual(view.height);
      const inScroll = await next.evaluate((node) => node.closest(".bt-scroll") !== null);
      expect(inScroll).toBe(false);
      await expect(bar.locator('[data-action="back"]')).toBeVisible();
    }
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("W1 a held hero, the Menu and a restart survive Continue", async ({ browser }, testInfo) => {
  test.setTimeout(120_000);
  const ipad = testInfo.project.name === "ipad";
  const session = await startAcceptanceHost(testInfo, { seed: "w1-survive" });
  const { databasePath } = session;
  const context = await browser.newContext({ baseURL: session.baseURL });
  const page = await context.newPage();
  try {
    await toClaim(page, session.host.joinCode, ipad);
    await holdHeroesFromTest(page, ["hero-a"]);
    await expect(page.locator('button[data-hunter="hero-a"]')).toHaveAttribute(
      "data-claim",
      "yours",
    );
    await page.locator('[data-action="menu"]').click();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await page.locator('[data-action="menu"]').click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } finally {
    await context.close();
    await session.host.close();
  }
  expect(session.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);

  const restarted = await startAcceptanceHost(testInfo, { databasePath, seed: "w1-survive" });
  const context2 = await browser.newContext({ baseURL: restarted.baseURL });
  const again = await context2.newPage();
  try {
    await installSessionSocketHook(again);
    await again.goto(`/join?code=${restarted.host.joinCode}`);
    await clickAct(again, "continue", "splash-play");
    await expect(again.locator("[data-menu]")).toHaveCount(0);
    await expect(again.locator('[data-action="menu"]')).toHaveCount(1);
    // The party pick is restored. This is a new iPad, so Hero A is taken by the one that sat down.
    await expect(deviceMain(again)).toHaveAttribute("data-screen", "claim-heroes");
    await expect(again.locator("[data-pick-status]")).toHaveText("1 of 4 picked");
    await expect(again.locator('button[data-hunter="hero-a"]')).toHaveAttribute(
      "data-claim",
      "taken",
    );
    await expectBar(again, ipad);
    await again.locator('[data-action="menu"]').click();
    await again.locator('[data-action="menu"]').click();
    await expect(deviceMain(again)).toHaveAttribute("data-screen", "claim-heroes");
    expect(restarted.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);
  } finally {
    await context2.close();
    await restarted.host.close();
  }
});

const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const SETUP_IDS = ["seals-and-skulls", "lay-out-board", "place-heroes"] as const;

const skipUnlessIpad = (testInfo: { project: { name: string } }) => {
  test.skip(testInfo.project.name !== "ipad", "The approved mockup is iPad portrait.");
};

const armActs = async (page: Page) => {
  await page.waitForFunction(() => {
    const socket = (window as unknown as { __btSessionSocket?: WebSocket }).__btSessionSocket;
    return socket != null && socket.readyState === WebSocket.OPEN;
  });
  await page.evaluate(() => {
    const win = window as unknown as {
      __btSessionSocket?: WebSocket & { __armed?: boolean };
      __btActs?: number;
    };
    const socket = win.__btSessionSocket;
    if (!socket || socket.__armed) return;
    const send = socket.send.bind(socket);
    win.__btActs = 0;
    socket.send = (data) => {
      if (String(data).includes('"type":"act"')) win.__btActs = (win.__btActs ?? 0) + 1;
      return send(data);
    };
    socket.__armed = true;
  });
};

const actCount = (page: Page) =>
  page.evaluate(() => (window as unknown as { __btActs?: number }).__btActs ?? 0);

const resetActs = (page: Page) =>
  page.evaluate(() => {
    (window as unknown as { __btActs?: number }).__btActs = 0;
  });

const openMenu = async (page: Page) => {
  const menu = page.locator('[data-action="menu"]');
  if ((await page.locator("[data-menu]").count()) === 0) await menu.click();
  await expect(page.locator("[data-menu]")).toHaveCount(1);
};

const gearLabels = async (page: Page) =>
  page.locator("[data-menu] [data-gear-item] .bt-gear-label").allTextContents();

const expectToolbar = async (page: Page) => {
  const footer = page.locator("footer.bt-bar--bottom");
  await expect(footer).toBeVisible();
  const view = page.viewportSize();
  const footerBox = await footer.boundingBox();
  if (!view || !footerBox) throw new Error("No toolbar box.");
  expect(footerBox.y).toBeGreaterThanOrEqual(0);
  expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(view.height + 1);
  const buttons = footer.locator("button");
  await expect(buttons.first()).toHaveText("?");
  await expect(buttons.last()).toHaveAttribute("data-action", "menu");
  const gear = await box(footer.locator('[data-action="menu"]'));
  const hit = await page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return {
        gear: Boolean(el?.closest("[data-action='menu']")),
        scrim: Boolean(el?.closest("[data-menu-scrim]")),
        dialog: Boolean(el?.closest("[data-menu]")),
      };
    },
    { x: gear.x + gear.width / 2, y: gear.y + gear.height / 2 },
  );
  expect(hit.dialog).toBe(false);
  expect(hit.gear || hit.scrim).toBe(true);
};

const gaveUp = (error: unknown): false => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Timeout")) return false;
  throw error;
};

const advanceOpenings = async (page: Page) => {
  for (let i = 0; i < 6; i += 1) {
    const day = page.locator(
      'button[data-prompt-id*="roll-done"], button[data-action-id="walk"], button[data-action-id="end-turn"]',
    );
    if ((await day.count()) > 0) return;
    const opening = page.locator('button[data-prompt-id^="continue-opening-"]');
    if ((await opening.count()) === 0) return;
    const button = opening.first();
    const enabled = await button.isEnabled({ timeout: 1_000 }).catch(gaveUp);
    if (!enabled) return;
    const clickable = await button
      .click({ trial: true, timeout: 1_000 })
      .then(() => true)
      .catch(gaveUp);
    if (!clickable) return;
    const clicked = await button
      .click({ timeout: 3_000 })
      .then(() => true)
      .catch(gaveUp);
    if (!clicked) return;
  }
};

const reach = async (
  page: Page,
  joinCode: string,
  tower: "connect" | "skip",
  stop: "claim" | "setup" | "play",
) => {
  await installSessionSocketHook(page);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(`/join?code=${joinCode}`);
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "splash");
  await clickAct(page, "continue", "splash-play");
  await clickAct(page, "continue", `continue-pick-story-${STORY_ID}`);
  await clickAct(page, "continue", "continue-game-settings");
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "tower-connect");
  if (tower === "connect") await clickAct(page, "tower-connect", "tower-connect");
  else await clickAct(page, "play-without-tower", "play-without-tower");
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "claim-heroes");
  if (stop === "claim") return;
  await holdHeroesFromTest(page, [...HERO_IDS]);
  await clickAct(page, "continue", "continue-claim-heroes");
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "setup");
  if (stop === "setup") return;
  for (const id of SETUP_IDS) await clickAct(page, "continue", `continue-setup-${id}`);
  await clickAct(page, "continue", "continue-begin");
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "play");
  await advanceOpenings(page);
};

const lastMenuButton = (page: Page) => page.locator("[data-menu] button").last();

const expectCloseLast = async (page: Page) => {
  const close = lastMenuButton(page);
  await expect(close).toHaveAccessibleName("Close");
  const leave = page.locator('[data-menu] section[aria-label="Leave"]');
  const closeBox = await box(close);
  const leaveBox = await box(leave);
  expect(closeBox.y).toBeGreaterThanOrEqual(leaveBox.y);
};

test("the Menu ends with Close on every screen it opens from", async ({ browser }, testInfo) => {
  skipUnlessIpad(testInfo);
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-04-close" });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const page = await context.newPage();
  try {
    await page.goto("/join");
    await openMenu(page);
    await expectCloseLast(page);
    await page.locator('[data-action="menu"]').click();

    await installSessionSocketHook(page);
    await page.goto(`/join?code=${session.host.joinCode}`);
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "splash");
    await clickAct(page, "continue", "splash-play");
    await clickAct(page, "continue", `continue-pick-story-${STORY_ID}`);
    await clickAct(page, "continue", "continue-game-settings");
    await clickAct(page, "tower-connect", "tower-connect");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "claim-heroes");
    await openMenu(page);
    await expectCloseLast(page);
    await page.locator('[data-action="menu"]').click();

    await holdHeroesFromTest(page, [...HERO_IDS]);
    await clickAct(page, "continue", "continue-claim-heroes");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "setup");
    await openMenu(page);
    await expectCloseLast(page);
    await page.locator('[data-action="menu"]').click();

    for (const id of SETUP_IDS) await clickAct(page, "continue", `continue-setup-${id}`);
    await clickAct(page, "continue", "continue-begin");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "play");
    await openMenu(page);
    await expectCloseLast(page);
    await page.locator('[data-action="menu"]').click();

    session.tower.loseConnection();
    session.host.syncTower();
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "pause", { timeout: 20_000 });
    await openMenu(page);
    await expectCloseLast(page);
  } finally {
    await context.close();
    await session.host.close();
  }
});

const GEAR_LIST = [
  "Current party",
  "Look up",
  "Game board setup",
  "Volume",
  "Split party",
  "Use a potion or item",
  "Change who holds whom",
  "Join another iPad",
  "Tower",
  "Pause/Resume",
  "Save and quit",
] as const;

const greyReason = async (page: Page, id: string, reason: string) => {
  const item = page.locator(`[data-menu] [data-gear-item="${id}"]`);
  await expect(item).toBeDisabled();
  await expect(item.locator("[data-reason]")).toHaveText(reason);
  await expect(item).toHaveClass(/bt-row--disabled/);
  await expect(item).toHaveAttribute("aria-disabled", "true");
  await expect(item).toHaveCSS("opacity", "0.5");
};

const outsidePoint = async (page: Page, target: Locator) => {
  const targetBox = await box(target);
  const dialogBox = await box(page.locator("[data-menu]"));
  const candidates = [
    { x: targetBox.x + 2, y: targetBox.y + targetBox.height / 2 },
    { x: targetBox.x + targetBox.width - 2, y: targetBox.y + targetBox.height / 2 },
    { x: targetBox.x + targetBox.width / 2, y: targetBox.y + 2 },
    { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height - 2 },
  ];
  const hit = candidates.find(
    (point) =>
      point.x < dialogBox.x ||
      point.x > dialogBox.x + dialogBox.width ||
      point.y < dialogBox.y ||
      point.y > dialogBox.y + dialogBox.height,
  );
  if (!hit) throw new Error("The actionable button sits entirely under the dialog.");
  return hit;
};

test("Close, a tap outside and the gear each close the Menu", async ({ browser }, testInfo) => {
  skipUnlessIpad(testInfo);
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-04-tap" });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const page = await context.newPage();
  try {
    await reach(page, session.host.joinCode, "skip", "claim");
    await armActs(page);
    const pick = page.locator('button[data-hunter="hero-a"]');
    await expect(pick).toBeEnabled();
    const status = page.locator("[data-pick-status]");
    const beforeStatus = await status.innerText();

    await resetActs(page);
    await openMenu(page);
    await page.locator("[data-menu]").getByRole("button", { name: "Close" }).tap();
    await expect(page.locator("[data-menu]")).toHaveCount(0);
    await expect(page.locator('[data-action="menu"]')).toHaveAttribute("aria-expanded", "false");
    expect(await actCount(page)).toBe(0);

    await resetActs(page);
    await openMenu(page);
    const point = await outsidePoint(page, pick);
    await page.touchscreen.tap(point.x, point.y);
    await expect(page.locator("[data-menu]")).toHaveCount(0);
    await expect(page.locator('[data-action="menu"]')).toHaveAttribute("aria-expanded", "false");
    await expect(status).toHaveText(beforeStatus);
    await expect(pick).toHaveAttribute("data-claim", "open");
    expect(await actCount(page)).toBe(0);

    await resetActs(page);
    await openMenu(page);
    await page.locator('[data-action="menu"]').tap();
    await expect(page.locator("[data-menu]")).toHaveCount(0);
    await expect(page.locator('[data-action="menu"]')).toHaveAttribute("aria-expanded", "false");
    expect(await actCount(page)).toBe(0);
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("Escape closes the Menu and sends no act", async ({ browser }, testInfo) => {
  skipUnlessIpad(testInfo);
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-04-esc" });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const page = await context.newPage();
  try {
    await reach(page, session.host.joinCode, "skip", "claim");
    await armActs(page);
    await resetActs(page);
    await openMenu(page);
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-menu]")).toHaveCount(0);
    await expect(page.locator('[data-action="menu"]')).toHaveAttribute("aria-expanded", "false");
    expect(await actCount(page)).toBe(0);
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "claim-heroes");
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("the open Menu matches the gear list in play", async ({ browser }, testInfo) => {
  skipUnlessIpad(testInfo);
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-04-list" });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const page = await context.newPage();
  try {
    await reach(page, session.host.joinCode, "connect", "play");
    await openMenu(page);
    expect(await gearLabels(page)).toEqual([...GEAR_LIST]);
    await expect(page.locator("[data-menu] h2")).toHaveText(["Look up", "Table", "Leave"]);
    await greyReason(page, "tower", "The tower is connected.");
    await greyReason(page, "split-party", "C3+");
    await greyReason(page, "use-potion", "C3+");
    await expect(page.locator("[data-menu] [data-version]")).toHaveText(/^v\d+\.\d+\.\d+/);
    await expectCloseLast(page);
    const menuBox = await box(page.locator("[data-menu]"));
    const footerBox = await box(page.locator("footer.bt-bar--bottom"));
    const closeBox = await box(page.locator("[data-menu]").getByRole("button", { name: "Close" }));
    expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(footerBox.y);
    expect(closeBox.y + closeBox.height).toBeLessThanOrEqual(footerBox.y);
    await expect(page.locator('[data-gear-item="rejoin-party"]')).toHaveCount(0);
    await expectToolbar(page);
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("before Begin, game items are greyed with a reason", async ({ browser }, testInfo) => {
  skipUnlessIpad(testInfo);
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-04-before" });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const page = await context.newPage();
  try {
    await page.goto("/join");
    await openMenu(page);
    await expect(page.locator("[data-menu] h2").first()).toHaveText("Look up");
    await greyReason(page, "current-party", "Only in a game.");
    await expect(page.locator('[data-gear-item="look-up"]')).toBeEnabled();
    await expect(page.locator('[data-gear-item="look-up"] [data-reason]')).toHaveCount(0);
    await greyReason(page, "pause-resume", "Only in a game.");
    await greyReason(page, "save-and-quit", "Only in a game.");
    await expect(page.locator('[data-gear-item="tower"]')).toBeEnabled();
    await expect(page.locator('[data-gear-item="tower"] [data-reason]')).toHaveCount(0);
    await expectCloseLast(page);

    await reach(page, session.host.joinCode, "skip", "claim");
    await openMenu(page);
    await greyReason(page, "current-party", "Only in a game.");
    await expect(page.locator('[data-gear-item="look-up"]')).toBeEnabled();
    await greyReason(page, "pause-resume", "Only in a game.");
    await greyReason(page, "save-and-quit", "Only in a game.");
    await expect(page.locator('[data-gear-item="tower"]')).toBeEnabled();
    await expect(page.locator('[data-gear-item="tower"] [data-reason]')).toHaveCount(0);
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("Save and quit asks to confirm", async ({ browser }, testInfo) => {
  skipUnlessIpad(testInfo);
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-04-confirm" });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const page = await context.newPage();
  try {
    await reach(page, session.host.joinCode, "skip", "play");
    await armActs(page);
    await resetActs(page);
    await openMenu(page);
    await page.locator('[data-gear-item="save-and-quit"]').click();
    const confirm = page.locator("[data-menu]");
    await expect(confirm.getByRole("heading", { name: "Save and quit" })).toBeVisible();
    await expect(confirm).toContainText("Are you sure?");
    const buttons = confirm.getByRole("button");
    await expect(buttons).toHaveCount(2);
    await expect(buttons.nth(0)).toHaveText("Save and quit");
    await expect(buttons.nth(0)).toHaveClass(/bt-primary/);
    await expect(buttons.nth(1)).toHaveText("Back");
    await buttons.nth(1).click();
    await expect(page.locator("[data-menu]")).toHaveCount(1);
    await expect(page.locator('[data-gear-item="save-and-quit"]')).toBeVisible();
    expect(await actCount(page)).toBe(0);
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "play");
  } finally {
    await context.close();
    await session.host.close();
  }
});

const HELP_STOPS: Record<string, string> = {
  join: "Scan the code with each iPad to join the table.",
  waiting: "The table is getting ready. This iPad will move on by itself.",
  "pick-story": "Tap the story you want to play tonight.",
  "story-settings": "Choose the game length and options for tonight's story.",
  "tower-choice": "Tap Connect Tower to play with the tower, or Play without Tower for tonight.",
  claim: "Tap Pick for the hero this iPad speaks for at the table.",
  "base-board-setup":
    "Lay out the board and pieces as shown. Tap Board is set up when the table is ready.",
  play: "The game is on. Follow the prompts on this iPad and the Story board.",
  "tower-lost": "The tower stopped answering and the game waits. Tap Reconnect, or Go on without.",
  "session-screen": "Your saved games are here. Tap Continue for the last one, or New game.",
  "session-over": "The game is over and saved. You can close the app for tonight.",
};

const checkHelp = async (page: Page, helpId: string) => {
  const line = HELP_STOPS[helpId];
  if (!line) throw new Error(`No help line for ${helpId}.`);
  await expectToolbar(page);
  const main = page.locator("main").first();
  const screen = await main.getAttribute("data-screen");
  const paused = await main.getAttribute("data-paused");
  const hasSocket = await page.evaluate(
    () =>
      (window as unknown as { __btSessionSocket?: WebSocket }).__btSessionSocket?.readyState === 1,
  );
  if (hasSocket) await armActs(page);
  const before = hasSocket ? await actCount(page) : 0;
  await page
    .locator("footer.bt-bar--bottom")
    .locator('[data-action="help"]')
    .click({ timeout: 10_000 });
  const sheet = page.locator("[data-help]");
  await expect(sheet).toHaveAttribute("data-help-screen", helpId);
  await expect(sheet.locator("p")).toHaveText(line);
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toHaveCount(0);
  await expect(main).toHaveAttribute("data-screen", screen ?? "");
  expect(await main.getAttribute("data-paused")).toBe(paused);
  if (hasSocket) expect(await actCount(page)).toBe(before);
};

test("the toolbar is on every iPad screen, and ? help matches the current screen", async ({
  browser,
}, testInfo) => {
  skipUnlessIpad(testInfo);
  test.setTimeout(300_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-04-toolbar" });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const page = await context.newPage();
  try {
    await page.goto("/join");
    await checkHelp(page, "join");

    await installSessionSocketHook(page);
    await page.goto(`/join?code=${session.host.joinCode}`);
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "splash");
    await checkHelp(page, "waiting");
    await clickAct(page, "continue", "splash-play");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "pick-story");
    await checkHelp(page, "pick-story");
    await clickAct(page, "continue", `continue-pick-story-${STORY_ID}`);
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "game-settings");
    await checkHelp(page, "story-settings");
    await clickAct(page, "continue", "continue-game-settings");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "tower-connect");
    await checkHelp(page, "tower-choice");
    await clickAct(page, "tower-connect", "tower-connect");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "claim-heroes");
    await checkHelp(page, "claim");
    await holdHeroesFromTest(page, [...HERO_IDS]);
    await clickAct(page, "continue", "continue-claim-heroes");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "setup");
    await checkHelp(page, "base-board-setup");
    for (const id of SETUP_IDS) await clickAct(page, "continue", `continue-setup-${id}`);
    await clickAct(page, "continue", "continue-begin");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "play");
    await advanceOpenings(page);
    await checkHelp(page, "play");

    session.tower.loseConnection();
    session.host.syncTower();
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "pause", { timeout: 20_000 });
    await checkHelp(page, "tower-lost");

    await openMenu(page);
    await page.locator('[data-gear-item="save-and-quit"]').click();
    await page.locator("[data-menu]").getByRole("button", { name: "Save and quit" }).click();
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "session", { timeout: 20_000 });
    await checkHelp(page, "session-screen");
    await clickAct(page, "done-for-tonight", "session-done-tonight");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "goodbye");
    await checkHelp(page, "session-over");
  } finally {
    await context.close();
    await session.host.close();
  }
});

const finishFromClaim = async (page: Page) => {
  await clickAct(page, "continue", "continue-claim-heroes");
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "setup");
  for (const id of SETUP_IDS) await clickAct(page, "continue", `continue-setup-${id}`);
  await clickAct(page, "continue", "continue-begin");
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "play");
  await advanceOpenings(page);
};

const resumeSavedGame = async (page: Page) => {
  await clickAct(page, "continue", "splash-play");
  await expect(deviceMain(page)).not.toHaveAttribute("data-screen", "splash");
  if ((await deviceMain(page).getAttribute("data-screen")) === "pick-game") {
    await clickAct(page, "continue", "continue-pick-game");
  }
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "play", { timeout: 20_000 });
};

const openGear = async (page: Page, id: string) => {
  await openMenu(page);
  await page.locator(`[data-menu] [data-gear-item="${id}"]`).click();
};

test("gear actions open on the Story board and pause the game", async ({ browser }, testInfo) => {
  skipUnlessIpad(testInfo);
  test.setTimeout(240_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-04-panels" });
  const { databasePath } = session;
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const boardContext = await browser.newContext({
    baseURL: session.baseURL,
    viewport: { width: 1920, height: 1080 },
  });
  const device = await context.newPage();
  const other = await context.newPage();
  const board = await boardContext.newPage();
  let holderA = "";
  let holderB = "";
  try {
    await board.goto("/board");
    await reach(device, session.host.joinCode, "skip", "claim");
    await installSessionSocketHook(other);
    await other.setViewportSize({ width: 768, height: 1024 });
    await other.goto(`/join?code=${session.host.joinCode}`);
    await expect(deviceMain(other)).toHaveAttribute("data-screen", "claim-heroes");
    await holdHeroesFromTest(device, ["hero-a", "hero-c"]);
    await holdHeroesFromTest(other, ["hero-b", "hero-d"]);
    await finishFromClaim(device);
    const boardMain = board.locator("main.bt-board");

    const openPanel = async (id: string) => {
      await openGear(device, id);
      const panel = board.locator(`[data-panel="${id}"]`);
      await expect(panel).toBeVisible();
      await expect(panel.locator("button, input, textarea, select, a")).toHaveCount(0);
      await expect(boardMain).toHaveAttribute("data-paused", "true");
      await expect(device.getByText("See the Story board")).toBeVisible();
      await expect(
        device.locator("[data-gear-panel]").getByRole("button", { name: "Done" }),
      ).toBeVisible();
      return panel;
    };
    const donePanel = async () => {
      await device.locator("[data-gear-panel]").getByRole("button", { name: "Done" }).click();
      await expect(board.locator("[data-panel]")).toHaveCount(0);
      await expect(boardMain).toHaveAttribute("data-paused", "false");
      await expect(deviceMain(device)).toHaveAttribute("data-screen", "play");
    };

    const setup = await openPanel("game-board-setup");
    await expect(setup.locator("ol li")).not.toHaveCount(0);
    await expect(setup).toHaveAttribute("data-piece-checks", "1");
    await donePanel();

    const party = await openPanel("current-party");
    const heroA = party.locator('[data-hero="hero-a"]');
    await expect(heroA.locator("[data-name]")).toHaveText("Hero A");
    await expect(heroA.locator("[data-hp]")).toContainText("unavailable");
    await expect(heroA.locator("[data-gold]")).toContainText("unavailable");
    await expect(heroA.locator("[data-items]")).toContainText("unavailable");
    await expect(heroA.locator("[data-corruptions]")).toContainText("unavailable");
    holderA = (await heroA.getAttribute("data-holder")) ?? "";
    holderB = (await party.locator('[data-hero="hero-b"]').getAttribute("data-holder")) ?? "";
    expect(holderA).not.toBe("");
    expect(holderB).not.toBe("");
    expect(holderA).not.toBe(holderB);
    await donePanel();

    await openPanel("volume");
    await device.getByRole("button", { name: "Volume 0" }).click();
    await expect(board.locator("[data-picked]")).toHaveAttribute("data-picked", "Volume 0", {
      timeout: 500,
    });
    await device.getByRole("button", { name: "Keep" }).click();
    await expect(boardMain).toHaveAttribute("data-volume", "0");
    await donePanel();
    await openPanel("volume");
    await expect(boardMain).toHaveAttribute("data-volume", "0");
    await donePanel();

    await openPanel("look-up");
    await device.getByRole("button", { name: "Rules of the tower" }).click();
    await expect(board.locator("[data-picked]")).toHaveAttribute(
      "data-picked",
      "Rules of the tower",
      {
        timeout: 500,
      },
    );
    await expect(board.locator("[data-card]")).toHaveText("Rules of the tower");
    await donePanel();

    await openPanel("join-another-ipad");
    await expect(board.locator("[data-qr] svg")).toBeVisible();
    await expect(board.locator("[data-join-url]")).toContainText(session.host.joinCode);
    await donePanel();

    await openPanel("change-who-holds-whom");
    await device.getByRole("button", { name: "Hero A" }).click();
    await expect(board.locator("[data-picked]")).toHaveAttribute("data-picked", "Hero A", {
      timeout: 500,
    });
    await device.getByRole("button", { name: "Hero B" }).click();
    await expect(board.locator("[data-picked]")).toHaveAttribute("data-picked", "Hero B", {
      timeout: 500,
    });
    await donePanel();
    const after = await openPanel("current-party");
    await expect(after.locator('[data-hero="hero-a"]')).toHaveAttribute(
      "data-holder",
      holderB ?? "",
    );
    await expect(after.locator('[data-hero="hero-b"]')).toHaveAttribute(
      "data-holder",
      holderA ?? "",
    );
    await donePanel();
  } finally {
    await boardContext.close();
    await context.close();
    await session.host.close();
  }

  const restarted = await startAcceptanceHost(testInfo, { databasePath, seed: "c2-04-panels" });
  const context2 = await browser.newContext({ baseURL: restarted.baseURL, ...PORTRAIT });
  const boardContext2 = await browser.newContext({
    baseURL: restarted.baseURL,
    viewport: { width: 1920, height: 1080 },
  });
  const again = await context2.newPage();
  const board2 = await boardContext2.newPage();
  try {
    await board2.goto("/board");
    await installSessionSocketHook(again);
    await again.goto(`/join?code=${restarted.host.joinCode}`);
    await resumeSavedGame(again);
    await openGear(again, "current-party");
    const party = board2.locator('[data-panel="current-party"]');
    await expect(party.locator('[data-hero="hero-a"]')).toBeVisible();
    await expect(party.locator('[data-hero="hero-a"]')).toHaveAttribute("data-holder", holderB);
    await expect(party.locator('[data-hero="hero-b"]')).toHaveAttribute("data-holder", holderA);
  } finally {
    await boardContext2.close();
    await context2.close();
    await restarted.host.close();
  }
});

test("the happy path never needs the Menu", async ({ browser }, testInfo) => {
  skipUnlessIpad(testInfo);
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-04-happy" });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const page = await context.newPage();
  try {
    await reach(page, session.host.joinCode, "skip", "play");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "play");
    await expect(page.locator("[data-menu]")).toHaveCount(0);
    await expect(page.locator("[data-help]")).toHaveCount(0);
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("a disabled item shows its reason", async ({ browser }, testInfo) => {
  skipUnlessIpad(testInfo);
  test.setTimeout(180_000);
  const playing = await startAcceptanceHost(testInfo, { seed: "c2-04-reason-play" });
  const playContext = await browser.newContext({ baseURL: playing.baseURL, ...PORTRAIT });
  const playPage = await playContext.newPage();
  try {
    await reach(playPage, playing.host.joinCode, "connect", "play");
    await openMenu(playPage);
    await greyReason(playPage, "split-party", "C3+");
    await greyReason(playPage, "use-potion", "C3+");
    await greyReason(playPage, "tower", "The tower is connected.");
    await expect(playPage.locator('[data-gear-item="volume"]')).toBeEnabled();
    await expect(playPage.locator('[data-gear-item="volume"]')).not.toHaveClass(/bt-row--disabled/);
    await expect(playPage.locator('[data-gear-item="volume"] [data-reason]')).toHaveCount(0);
  } finally {
    await playContext.close();
    await playing.host.close();
  }

  const between = await startAcceptanceHost(testInfo, { seed: "c2-04-reason-session" });
  const betweenContext = await browser.newContext({ baseURL: between.baseURL, ...PORTRAIT });
  const page = await betweenContext.newPage();
  try {
    await reach(page, between.host.joinCode, "skip", "play");
    await openMenu(page);
    await page.locator('[data-gear-item="save-and-quit"]').click();
    await page.locator("[data-menu]").getByRole("button", { name: "Save and quit" }).click();
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "session", { timeout: 20_000 });
    await openMenu(page);
    await greyReason(page, "look-up", "Only in a game.");
    await greyReason(page, "pause-resume", "Only in a game.");
    await expect(page.locator('[data-gear-item="tower"]')).toBeEnabled();
    await expect(page.locator('[data-gear-item="tower"] [data-reason]')).toHaveCount(0);
  } finally {
    await betweenContext.close();
    await between.host.close();
  }
});

test("two iPads pressing Volume open one panel", async ({ browser }, testInfo) => {
  skipUnlessIpad(testInfo);
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-04-race" });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const boardContext = await browser.newContext({
    baseURL: session.baseURL,
    viewport: { width: 1920, height: 1080 },
  });
  const first = await context.newPage();
  const second = await context.newPage();
  const board = await boardContext.newPage();
  try {
    await board.goto("/board");
    await reach(first, session.host.joinCode, "skip", "claim");
    await installSessionSocketHook(second);
    await second.goto(`/join?code=${session.host.joinCode}`);
    await expect(deviceMain(second)).toHaveAttribute("data-screen", "claim-heroes");
    await openMenu(first);
    await openMenu(second);
    await Promise.all([
      first.locator('[data-gear-item="volume"]').click(),
      second.locator('[data-gear-item="volume"]').click(),
    ]);
    await expect(board.locator('[data-panel="volume"]')).toHaveCount(1);
    await expect(board.locator("main.bt-board")).toHaveAttribute("data-gear-opens", "1");
    const firstSees = await first.getByText("See the Story board").count();
    const secondSees = await second.getByText("See the Story board").count();
    expect(firstSees + secondSees).toBe(1);
    const loser = firstSees === 0 ? first : second;
    await openMenu(loser);
    await greyReason(loser, "volume", "Open on another iPad.");
  } finally {
    await boardContext.close();
    await context.close();
    await session.host.close();
  }
});

test("a gear panel survives a restart closed", async ({ browser }, testInfo) => {
  skipUnlessIpad(testInfo);
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-04-restart" });
  const { databasePath } = session;
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const boardContext = await browser.newContext({
    baseURL: session.baseURL,
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();
  const board = await boardContext.newPage();
  let reasons: string[] = [];
  try {
    await board.goto("/board");
    await reach(page, session.host.joinCode, "skip", "play");
    await openMenu(page);
    reasons = await page.locator("[data-menu] [data-gear-item]").evaluateAll((nodes) =>
      nodes.map((node) => {
        const reason = node.querySelector("[data-reason]")?.textContent ?? "";
        const disabled = (node as HTMLButtonElement).disabled;
        return `${node.getAttribute("data-gear-item")}:${disabled ? "off" : "on"}:${reason}`;
      }),
    );
    await page.locator('[data-action="menu"]').click();
    await openGear(page, "volume");
    await expect(board.locator('[data-panel="volume"]')).toBeVisible();
    await expect(board.locator("main.bt-board")).toHaveAttribute("data-paused", "true");
  } finally {
    await boardContext.close();
    await context.close();
    await session.host.close();
  }

  const restarted = await startAcceptanceHost(testInfo, { databasePath, seed: "c2-04-restart" });
  const context2 = await browser.newContext({ baseURL: restarted.baseURL, ...PORTRAIT });
  const boardContext2 = await browser.newContext({
    baseURL: restarted.baseURL,
    viewport: { width: 1920, height: 1080 },
  });
  const again = await context2.newPage();
  const board2 = await boardContext2.newPage();
  try {
    await board2.goto("/board");
    await installSessionSocketHook(again);
    await again.goto(`/join?code=${restarted.host.joinCode}`);
    await resumeSavedGame(again);
    await expect(board2.locator("[data-panel]")).toHaveCount(0);
    await expect(board2.locator("main.bt-board")).toHaveAttribute("data-paused", "false");
    await expectToolbar(again);
    await openMenu(again);
    const after = await again.locator("[data-menu] [data-gear-item]").evaluateAll((nodes) =>
      nodes.map((node) => {
        const reason = node.querySelector("[data-reason]")?.textContent ?? "";
        const disabled = (node as HTMLButtonElement).disabled;
        return `${node.getAttribute("data-gear-item")}:${disabled ? "off" : "on"}:${reason}`;
      }),
    );
    expect(after).toEqual(reasons);
  } finally {
    await boardContext2.close();
    await context2.close();
    await restarted.host.close();
  }
});
