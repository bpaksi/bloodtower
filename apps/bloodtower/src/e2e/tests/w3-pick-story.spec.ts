import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  type Browser,
  expect,
  type Locator,
  type Page,
  type TestInfo,
  test,
} from "@playwright/test";
import { installSessionSocketHook, startAcceptanceHost } from "./support/acceptance.ts";

const BOARD_SIZES = [
  { width: 1024, height: 594 },
  { width: 1180, height: 820 },
  { width: 1920, height: 1080 },
] as const;

const TEST_COVER = join(import.meta.dirname, "../../../../../packs/test/assets/cover.png");
const DAY_SLICE = "AREA-077 day slice — Enter and Leave only.";
const COUNT_LINE = "The Count has taken Lenka. Bring her home before she's his.";
const WAITING = "Waiting for an iPad to choose a story.";
const PLAYERS = "1\u20134 players";

const deviceMain = (page: Page) => page.locator("main.bt-device");

const clickAct = async (page: Page, actionId: string, promptId: string) => {
  const button = page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`);
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const boxOf = async (locator: Locator) => {
  const box = await locator.boundingBox();
  expect(box, await locator.evaluate((node) => node.outerHTML).catch(() => "missing")).toBeTruthy();
  if (!box) throw new Error("No box.");
  return box;
};

const inside = (
  inner: { x: number; y: number; width: number; height: number },
  outer: { x: number; y: number; width: number; height: number },
) => {
  expect(inner.x).toBeGreaterThanOrEqual(outer.x - 1);
  expect(inner.y).toBeGreaterThanOrEqual(outer.y - 1);
  expect(inner.x + inner.width).toBeLessThanOrEqual(outer.x + outer.width + 1);
  expect(inner.y + inner.height).toBeLessThanOrEqual(outer.y + outer.height + 1);
};

const expectInViewport = async (page: Page, locator: Locator) => {
  const view = page.viewportSize();
  if (!view) throw new Error("No viewport.");
  inside(await boxOf(locator), { x: 0, y: 0, width: view.width, height: view.height });
};

const expectText = async (page: Page, needle: string) => {
  const hits = await page.evaluate((wanted) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const found: string[] = [];
    let node = walker.nextNode();
    while (node) {
      const text = node.textContent ?? "";
      if (text.includes(wanted)) {
        const el = node.parentElement;
        if (!el) found.push("no parent");
        else if (text.includes("\u2026")) found.push("ellipsis");
        else if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
          found.push(
            `clip ${el.tagName} ${el.scrollWidth}/${el.clientWidth} ${el.scrollHeight}/${el.clientHeight}`,
          );
        } else {
          const rect = el.getBoundingClientRect();
          const off =
            rect.top < -1 ||
            rect.left < -1 ||
            rect.right > window.innerWidth + 1 ||
            rect.bottom > window.innerHeight + 1;
          found.push(off ? `off ${rect.top},${rect.left},${rect.right},${rect.bottom}` : "ok");
        }
      }
      node = walker.nextNode();
    }
    return found;
  }, needle);
  expect(hits, needle).toContain("ok");
  expect(
    hits.filter((hit) => hit !== "ok"),
    needle,
  ).toEqual([]);
};

const expectPageStill = async (page: Page) => {
  const scroll = await page.evaluate(() => ({
    top: document.scrollingElement?.scrollTop ?? 0,
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewWidth: window.innerWidth,
    viewHeight: window.innerHeight,
  }));
  expect(scroll.top).toBe(0);
  expect(scroll.width).toBeLessThanOrEqual(scroll.viewWidth + 1);
  expect(scroll.height).toBeLessThanOrEqual(scroll.viewHeight + 1);
};

const expectBoardQuiet = async (board: Page, device: Page) => {
  await expect(board.locator("button, input, textarea, select, a, [onclick]")).toHaveCount(0);
  await expect(board.locator('[data-illusionist-asset="dialog-frame"]')).toHaveCount(1);
  await expect(board.locator(".bt-door-motif")).toHaveCount(0);
  await expect(device.locator("img")).toHaveCount(0);
  await expect(board.getByText("Pick Hero")).toHaveCount(0);
  await expect(device.getByText("Pick Hero")).toHaveCount(0);
  const srcs = await board
    .locator("img")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("src") ?? ""));
  for (const src of srcs) {
    expect(src).not.toMatch(/place-village|place-bazaar|place-citadel|place-sanctuary/);
    expect(src).not.toContain("b-engraved-ipad-move-map.jpg");
  }
  await expectPageStill(board);
};

const expectCarousel = async (board: Page) => {
  const dialog = board.locator("[data-illusionist-asset='dialog-frame']");
  const focus = board.locator("[data-story-focus]");
  const peek = board.locator("[data-story-peek]");
  const plate = board.locator(".bt-carousel-focus .bt-carousel-plate");
  const focusBox = await boxOf(focus);
  const carouselBox = await boxOf(board.locator(".bt-carousel"));
  expect(
    Math.abs(focusBox.x + focusBox.width / 2 - (carouselBox.x + carouselBox.width / 2)),
  ).toBeLessThanOrEqual(24);
  const peekBox = await boxOf(peek);
  expect(peekBox.width).toBeLessThan(focusBox.width);
  inside(peekBox, await boxOf(dialog));
  const plateBox = await boxOf(plate);
  inside(plateBox, await boxOf(dialog));
  await expectInViewport(board, plate);
  const ratio = plateBox.width / plateBox.height;
  expect(ratio).toBeGreaterThan(1.6);
  expect(ratio).toBeLessThan(1.95);
};

const expectCover = async (img: Locator, plate: Locator) => {
  await expect(img).toHaveCount(1);
  await expect
    .poll(async () => img.evaluate((node: HTMLImageElement) => node.naturalWidth))
    .toBeGreaterThan(0);
  const image = await boxOf(img);
  const focused = await boxOf(plate);
  expect(image.width).toBeLessThan(focused.width);
};

const reachPickStory = async (page: Page, joinCode: string) => {
  await installSessionSocketHook(page);
  await page.goto(`/join?code=${joinCode}`);
  await expect(page).toHaveURL(/\/device/);
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "splash");
  await clickAct(page, "continue", "splash-play");
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "pick-story");
};

const openPair = async (browser: Browser, testInfo: TestInfo, seed: string) => {
  const session = await startAcceptanceHost(testInfo, { seed });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const board = await context.newPage();
  const device = await context.newPage();
  await board.goto("/board");
  await reachPickStory(device, session.host.joinCode);
  await expect(board.locator("main")).toHaveAttribute("data-screen", "pick-story", {
    timeout: 20_000,
  });
  return { session, context, board, device };
};

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name === "desktop", "The desktop viewport is not a W3 board size.");
});

test("focused Proving Grounds fits, and only Dracula's cover is painted", async ({
  browser,
}, testInfo) => {
  test.setTimeout(90_000);
  const { session, context, board, device } = await openPair(browser, testInfo, "w3-focus-test");
  try {
    const home = await context.newPage();
    await home.goto("/");
    await expect(home.locator("[data-bottom-bar]")).toHaveCount(0);
    await expect(home.locator("[data-sound-dialog]")).toHaveCount(0);
    await expect(home.getByRole("button", { name: "Sound" })).toHaveCount(0);
    await home.close();

    await expect(board.locator("[data-story-focus]")).toHaveAttribute("data-story-focus", "test");
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "pick-story");
    for (const size of BOARD_SIZES) {
      await board.setViewportSize(size);
      await expect(board.locator("[data-story-focus] h2")).toHaveText("Proving Grounds");
      await expect(
        board.locator('[data-story-peek="dracula"][data-carousel-side="next"]'),
      ).toHaveCount(1);
      await expect(board.locator('[data-carousel-side="previous"]')).toHaveCount(0);
      await expect(board.locator('[data-story-focus="test"]')).toHaveAttribute(
        "data-playable",
        "true",
      );
      await expect(board.locator('[data-story-peek="dracula"]')).toHaveAttribute(
        "data-playable",
        "false",
      );
      const peekText = await board.locator('[data-story-peek="dracula"]').innerText();
      expect(peekText).not.toMatch(/players/i);
      expect(peekText).not.toMatch(/\b0\b/);
      await expectCarousel(board);
      for (const line of [
        "Pick a story",
        "Proving Grounds",
        "The Count of Vellmoor",
        DAY_SLICE,
        PLAYERS,
        WAITING,
      ]) {
        await expectText(board, line);
      }
      const focusCover = board.locator('[data-story-focus="test"] img.bt-carousel-cover');
      if (existsSync(TEST_COVER)) {
        await expect(focusCover).toHaveAttribute("src", /\/packs\/test\/assets\/cover\.png$/);
        await expectCover(focusCover, board.locator(".bt-carousel-focus .bt-carousel-plate"));
      } else {
        await expect(focusCover).toHaveCount(0);
      }
      const dracula = board.locator('[data-story-peek="dracula"] img.bt-carousel-cover');
      await expect(dracula).toHaveAttribute("src", /\/packs\/dracula\/assets\/cover\.png$/);
      await expectCover(dracula, board.locator(".bt-carousel-focus .bt-carousel-plate"));
      await expectBoardQuiet(board, device);
    }
    expect(session.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("Previous and Next wrap on pick-story and do not connect", async ({ browser }, testInfo) => {
  test.setTimeout(90_000);
  const { session, context, board, device } = await openPair(browser, testInfo, "w3-wrap");
  try {
    const previous = device.locator('button[data-action="story-prev"]');
    const next = device.locator('button[data-action="story-next"]');
    const choose = device.locator(
      'button[data-prompt-id="continue-pick-story-test"][data-action-id="continue"]',
    );
    await expect(previous).toHaveAccessibleName("Previous");
    await expect(next).toHaveAccessibleName("Next");
    await expect(choose).toHaveAccessibleName("Choose Proving Grounds");
    for (const button of [previous, next, choose]) {
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
      await expectInViewport(device, button);
    }
    const connects = () => session.tower.sent().filter((item) => item.type === "connect").length;
    const before = connects();
    await next.click();
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "pick-story");
    await expect(board.locator("main")).toHaveAttribute("data-screen", "pick-story");
    await expect(board.locator("[data-story-focus]")).toHaveAttribute(
      "data-story-focus",
      "dracula",
    );
    await expect(board.locator('[data-story-peek="test"][data-carousel-side="next"]')).toHaveCount(
      1,
    );
    await expect(board.locator("[data-story-peek]")).toHaveCount(1);
    const countChoose = device.locator(
      'button[data-prompt-id="continue-pick-story-dracula"][data-action-id="continue"]',
    );
    await expect(countChoose).toHaveAccessibleName("Choose The Count of Vellmoor");
    await expect(countChoose).toBeEnabled();
    await next.click();
    await expect(board.locator("[data-story-focus]")).toHaveAttribute("data-story-focus", "test");
    await previous.click();
    await expect(board.locator("[data-story-focus]")).toHaveAttribute(
      "data-story-focus",
      "dracula",
    );
    await previous.click();
    await expect(board.locator("[data-story-focus]")).toHaveAttribute("data-story-focus", "test");
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "pick-story");
    expect(connects()).toBe(before);
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("focused Dracula fits with its cover", async ({ browser }, testInfo) => {
  test.setTimeout(90_000);
  const { session, context, board, device } = await openPair(browser, testInfo, "w3-focus-count");
  try {
    await device.locator('button[data-action="story-next"]').click();
    await expect(board.locator("[data-story-focus]")).toHaveAttribute(
      "data-story-focus",
      "dracula",
    );
    for (const size of BOARD_SIZES) {
      await board.setViewportSize(size);
      await expect(board.locator("[data-story-focus] h2")).toHaveText("The Count of Vellmoor");
      await expect(board.locator("[data-story-focus]")).toHaveAttribute("data-playable", "false");
      const focusText = await board.locator("[data-story-focus]").innerText();
      expect(focusText).not.toMatch(/players/i);
      expect(focusText).not.toMatch(/\b0\b/);
      await expectText(board, COUNT_LINE);
      await expectText(board, "Not playable yet");
      await expectText(board, "Pick a story");
      await expectText(board, WAITING);
      const cover = board.locator('[data-story-focus="dracula"] img.bt-carousel-cover');
      await expect(cover).toHaveAttribute("src", /\/packs\/dracula\/assets\/cover\.png$/);
      await expect
        .poll(async () => cover.evaluate((node: HTMLImageElement) => node.naturalWidth))
        .toBeGreaterThan(0);
      await expectCarousel(board);
      await expectBoardQuiet(board, device);
    }
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("Choose on Dracula stops, and Back still chooses Proving Grounds", async ({
  browser,
}, testInfo) => {
  test.setTimeout(90_000);
  const { session, context, board, device } = await openPair(browser, testInfo, "w3-choose");
  try {
    await device.locator('button[data-action="story-next"]').click();
    await expect(board.locator("[data-story-focus]")).toHaveAttribute(
      "data-story-focus",
      "dracula",
    );
    const before = session.tower.sent().filter((item) => item.type === "connect").length;
    await clickAct(device, "continue", "continue-pick-story-dracula");
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "not-playable");
    await expect(board.locator("main")).toHaveAttribute("data-screen", "not-playable");
    await expect(board.locator("main")).not.toHaveAttribute("data-screen", "game-settings");
    await expect(board.locator('[data-startup-panel="not-playable"]')).toBeVisible();
    await expect(device.getByRole("heading", { name: "Not playable yet" })).toBeVisible();
    await expect(device.locator('button[data-action-id="continue"]')).toHaveCount(0);
    await expect(device.locator('button[data-action="story-prev"]')).toHaveCount(0);
    await expect(device.locator('button[data-action="story-next"]')).toHaveCount(0);
    await expect(device.getByRole("button", { name: /^Choose / })).toHaveCount(0);
    await expect(board.locator("[data-setting]")).toHaveCount(0);
    for (const name of ["Short", "Standard", "Long", "Difficulty"]) {
      await expect(device.getByRole("button", { name, exact: true })).toHaveCount(0);
    }
    const back = device.locator(
      'button[data-action="back"][data-action-id="back"][data-prompt-id="back-not-playable"]',
    );
    await expect(back).toBeVisible();
    await expect(back).toBeEnabled();
    expect(session.tower.sent().filter((item) => item.type === "connect").length).toBe(before);
    await expect(device.locator("img")).toHaveCount(0);
    await expect(board.locator("button, input, textarea, select, a, [onclick]")).toHaveCount(0);
    for (const size of BOARD_SIZES) {
      await board.setViewportSize(size);
      await expectText(board, "Not playable yet");
      await expectText(board, "The Count of Vellmoor");
      const panel = board.locator('[data-startup-panel="not-playable"]');
      const texts = await panel.evaluate((node) => {
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        const hits: string[] = [];
        let current = walker.nextNode();
        while (current) {
          const text = (current.textContent ?? "").trim();
          const el = current.parentElement;
          if (text && el) {
            const clipped =
              el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
            hits.push(clipped || text.includes("\u2026") ? `clip ${text}` : "ok");
          }
          current = walker.nextNode();
        }
        return hits;
      });
      expect(texts.length).toBeGreaterThan(0);
      expect(texts.filter((hit) => hit !== "ok")).toEqual([]);
      await expectInViewport(board, board.locator("[data-illusionist-asset='dialog-frame']"));
      await expectPageStill(board);
    }

    await back.click();
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "pick-story");
    await expect(board.locator("main")).toHaveAttribute("data-screen", "pick-story");
    await expect(board.locator("[data-story-focus]")).toHaveAttribute(
      "data-story-focus",
      "dracula",
    );
    const countChoose = device.locator(
      'button[data-prompt-id="continue-pick-story-dracula"][data-action-id="continue"]',
    );
    await expect(countChoose).toHaveAccessibleName("Choose The Count of Vellmoor");
    await expect(countChoose).toBeEnabled();
    await device.locator('button[data-action="story-prev"]').click();
    await expect(board.locator("[data-story-focus]")).toHaveAttribute("data-story-focus", "test");
    await clickAct(device, "continue", "continue-pick-story-test");
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "game-settings");
    await expect(board.locator("main")).toHaveAttribute("data-screen", "game-settings");
    await expect(deviceMain(device)).not.toHaveAttribute("data-screen", "not-playable");
    await expect(deviceMain(device)).not.toHaveAttribute("data-screen", "play");
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("a not-ready visit does not resume the Count", async ({ browser }, testInfo) => {
  test.setTimeout(90_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w3-restart" });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const device = await context.newPage();
  try {
    await reachPickStory(device, session.host.joinCode);
    await device.locator('button[data-action="story-next"]').click();
    await clickAct(device, "continue", "continue-pick-story-dracula");
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "not-playable");
  } finally {
    await context.close();
    await session.host.close();
  }

  const restarted = await startAcceptanceHost(testInfo, {
    databasePath: session.databasePath,
    seed: "w3-restart",
  });
  const context2 = await browser.newContext({ baseURL: restarted.baseURL });
  const page = await context2.newPage();
  const board = await context2.newPage();
  try {
    await installSessionSocketHook(page);
    await page.goto(`/join?code=${restarted.host.joinCode}`);
    await expect(deviceMain(page)).not.toHaveAttribute("data-screen", "play");
    await clickAct(page, "continue", "splash-play");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "pick-story");
    await expect(page.locator('button[data-prompt-id="continue-pick-story-test"]')).toBeVisible();
    await expect(page.locator("main.bt-device p").first()).toHaveText("Proving Grounds");
    await expect(page.getByRole("heading", { name: "The Count of Vellmoor" })).toHaveCount(0);
    await board.goto("/board");
    await expect(board.locator("main")).toHaveAttribute("data-screen", "pick-story");
    await expect(board.locator("[data-story-focus]")).toHaveAttribute("data-story-focus", "test");
    await expect(board.locator("[data-story-focus] h2")).toHaveText("Proving Grounds");
    expect(restarted.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);
  } finally {
    await context2.close();
    await restarted.host.close();
  }
});
