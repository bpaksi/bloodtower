import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import {
  doneEverySetupStep,
  startAcceptanceHost,
  waitForBoardAnimationsSettled,
} from "./support/acceptance.ts";
import { copyToE2eArtifacts } from "./support/e2e-artifacts.ts";

const device = (page: Page) => ({
  button: (action: string) => page.locator(`button[data-action="${action}"]`),
  hold: (hunter: string) => page.locator(`button[data-hunter="${hunter}"]`),
});

/** Portrait, caption, and all four cartouches sit fully in the viewport; the document does not scroll. */
const assertBoardFits = async (page: Page, opts?: { keeper?: boolean }) => {
  const carts = page.locator(".bt-cart");
  await expect(carts).toHaveCount(4);
  for (let i = 0; i < 4; i += 1) {
    await expect(carts.nth(i)).toBeInViewport({ ratio: 1 });
  }
  if (opts?.keeper) {
    const portrait = page.getByRole("img", { name: "The Keeper" });
    const caption = page.locator("[data-board-caption]");
    await expect(portrait).toBeVisible();
    await expect(caption).toBeVisible();
    await expect(caption).toContainText("The Keeper:");
    await expect(portrait).toBeInViewport({ ratio: 1 });
    await expect(caption).toBeInViewport({ ratio: 1 });
  }
  // The play roll: a corruption column reading unavailable (never 0) and no invented acting hunter.
  if (await page.locator(".bt-cart-roll").count()) {
    const cor = page.locator(".bt-cart-cor");
    await expect(cor).toHaveCount(4);
    for (let i = 0; i < 4; i += 1) {
      await expect(cor.nth(i)).toHaveText("—");
      await expect(cor.nth(i)).toHaveAttribute("data-unavailable", "");
      await expect(cor.nth(i)).toBeInViewport({ ratio: 1 });
    }
    await expect(page.locator(".bt-cart-act")).toHaveCount(0);
  }
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  }));
  expect(overflow.y, "board must not scroll vertically").toBeLessThanOrEqual(0);
  expect(overflow.x, "board must not scroll sideways").toBeLessThanOrEqual(0);
};

/**
 * Keeper cinema (visuals step 11; R3-UI-33, R3-UI-33b): the Keeper is in the visual layer's 16:9
 * well on void with no plate rule; his caption is in the lower third of that well, below the
 * portrait (clear of the face), at least 1/25 of the screen's height, and on by default.
 */
const assertKeeperCinema = async (page: Page, key: string) => {
  const m = await page.evaluate(() => {
    const plate = document.querySelector("[data-visual-layer] > [data-keeper-plate]");
    const portrait = plate?.querySelector("[data-talking-avatar] > div");
    const caption = plate?.querySelector("[data-board-caption]");
    if (!plate || !portrait || !caption) return null;
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, h: r.height };
    };
    const style = getComputedStyle(plate);
    return {
      vh: window.innerHeight,
      well: box(plate),
      portrait: box(portrait),
      caption: box(caption),
      font: Number.parseFloat(getComputedStyle(caption).fontSize),
      border: style.borderTopWidth,
      outline: style.outlineStyle,
      background: style.backgroundColor,
    };
  });
  expect(
    m,
    `${key}: the Keeper plate, portrait and caption are in the visual layer`,
  ).not.toBeNull();
  if (!m) return;
  expect(m.border, `${key}: no plate rule`).toBe("0px");
  expect(m.outline, `${key}: no plate outline`).toBe("none");
  expect(m.background, `${key}: on void`).toBe("rgb(11, 8, 6)");
  expect(m.font, `${key}: caption at least 1/25 of the screen height`).toBeGreaterThanOrEqual(
    m.vh / 25 - 0.5,
  );
  const third = m.well.top + (m.well.h * 2) / 3;
  expect(m.caption.top, `${key}: caption in the lower third`).toBeGreaterThanOrEqual(third - 1);
  expect(m.caption.bottom, `${key}: caption inside the well`).toBeLessThanOrEqual(
    m.well.bottom + 1,
  );
  expect(m.portrait.bottom, `${key}: caption clear of the face`).toBeLessThanOrEqual(
    m.caption.top + 1,
  );
  expect(m.portrait.h, `${key}: the portrait takes the top of the well`).toBeGreaterThan(
    m.well.h / 2,
  );
};

/**
 * Play chrome must not cost header height or break words in the zone labels. The baseline is the
 * same page with the play attribute removed (the startup header layout), measured in place.
 */
const assertPlayHeader = async (page: Page) => {
  const measure = () =>
    page.evaluate(() => {
      const header = document.querySelector(".bt-board-header") as HTMLElement;
      const copies = [...document.querySelectorAll(".bt-zone-copy > *")] as HTMLElement[];
      return {
        height: header.getBoundingClientRect().height,
        // One line each: a word broken mid-word makes the element taller than its line height.
        broken: copies.filter((el) => {
          const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight);
          return el.getBoundingClientRect().height > lineHeight * 1.5;
        }).length,
        overflow: copies.filter((el) => el.scrollWidth > el.clientWidth + 1).length,
      };
    });
  const main = page.locator("main");
  const play = await measure();
  await main.evaluate((el) => el.removeAttribute("data-board-mode"));
  const base = await measure();
  await main.evaluate((el) => el.setAttribute("data-board-mode", "play"));
  expect(play.broken, "zone labels stay on one line per element").toBe(0);
  expect(play.overflow, "zone labels do not overflow their column").toBe(0);
  expect(play.height, "play header is no taller than the base header").toBeLessThanOrEqual(
    base.height + 2,
  );
};

/**
 * The waiting board (visuals step 9; R3-UI-30): a small centred DialogFrame (the real SVG frame)
 * holds the moment text and the blood-band prompt; no parchment column, no plate. The party items
 * zone still reads unavailable (never a count) under it on tall boards.
 */
const assertWaitingDialog = async (page: Page) => {
  await expect(page.locator("main")).toHaveAttribute("data-board-layer", "waiting");
  const dialog = page.locator('[data-illusionist-asset="dialog-frame"][data-waiting-dialog]');
  await expect(dialog).toHaveCount(1);
  await expect(dialog.locator(".bt-wait-text[data-moment-caption]")).toBeVisible();
  await expect(dialog.locator("[data-next-band]")).toBeVisible();
  await expect(page.locator(".bt-page")).toHaveCount(0);
  await expect(page.locator(".bt-plate")).toHaveCount(0);
  const geo = await page.evaluate(() => {
    const d = document.querySelector("[data-waiting-dialog]") as HTMLElement;
    const story = document.querySelector(".bt-story") as HTMLElement;
    const text = d.querySelector(".bt-wait-text") as HTMLElement;
    const band = d.querySelector("[data-next-band]") as HTMLElement;
    const bandText = band.querySelector("b") as HTMLElement;
    const dr = d.getBoundingClientRect();
    const sr = story.getBoundingClientRect();
    const br = band.getBoundingClientRect();
    return {
      frame: getComputedStyle(d).borderImageSource,
      size: d.getAttribute("data-dialog-size"),
      bandBg: getComputedStyle(band).backgroundImage,
      bandFont: Number.parseFloat(getComputedStyle(bandText).fontSize),
      textFont: Number.parseFloat(getComputedStyle(text).fontSize),
      dx: dr.left + dr.width / 2 - (sr.left + sr.width / 2),
      dy: dr.top + dr.height / 2 - (sr.top + sr.height / 2),
      dialogInStory: dr.top >= sr.top - 1 && dr.bottom <= sr.bottom + 1,
      bandInDialog: br.left >= dr.left && br.right <= dr.right && br.bottom <= dr.bottom,
      viewW: window.innerWidth,
      viewH: window.innerHeight,
      dialogBottom: dr.bottom,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(geo.frame, "the real dialog-frame SVG draws the border").toContain(
    "/board/dialog-frame/dialog-frame.svg",
  );
  expect(["compact", "default"]).toContain(geo.size);
  expect(geo.bandBg, "prompt sits on a blood band").toContain("rgb(142, 27, 27)");
  expect(geo.bandInDialog, "the band is inside the frame").toBe(true);
  expect(geo.bandFont, "prompt is at least 28px").toBeGreaterThanOrEqual(28);
  expect(geo.textFont, "moment text is at least 28px (TV distance)").toBeGreaterThanOrEqual(28);
  expect(Math.abs(geo.dx), "dialog is centred in the story column").toBeLessThanOrEqual(2);
  expect(Math.abs(geo.dy), "dialog is centred in the story column").toBeLessThanOrEqual(2);
  expect(geo.dialogInStory, "dialog stays inside the story column").toBe(true);
  expect(geo.dialogBottom).toBeLessThanOrEqual(geo.viewH + 1);
  expect(geo.overflowX, "no horizontal scroll").toBeLessThanOrEqual(0);
  const items = page.locator("[data-party-items]");
  const tall = (page.viewportSize()?.height ?? 0) >= 1040;
  if (tall) {
    await expect(items).toBeVisible();
    await expect(items).toBeInViewport({ ratio: 1 });
    await expectItemsInside(page);
  } else {
    await expect(items).toBeHidden();
  }
  const values = items.locator(".bt-items-val");
  await expect(values).toHaveCount(3);
  for (let i = 0; i < 3; i += 1) {
    await expect(values.nth(i)).toHaveText("unavailable");
    await expect(values.nth(i)).toHaveAttribute("data-unavailable", "");
  }
  await expect(items).not.toContainText(/\b\d+\b/);
};

/** Every unavailable value sits inside the party items zone (nothing clipped at any width). */
const expectItemsInside = async (page: Page) => {
  const fit = await page.locator("[data-party-items]").evaluate((el) => {
    const box = el.getBoundingClientRect();
    return [...el.querySelectorAll(".bt-items-val")].map((v) => {
      const r = v.getBoundingClientRect();
      return r.left >= box.left - 1 && r.right <= box.right + 1;
    });
  });
  expect(fit, "each unavailable value sits inside the zone").toEqual([true, true, true]);
};

const DRAC =
  "Anton Morosz kept the valley's ledgers for thirty years. He found his daughter at the church door as a baby, wrapped in a shawl no one in Vellmoor had ever woven. Last night he stood at her door with a poker, and this morning the maid found him on the stair, white and still. The girl was gone.";
const FIVE = [
  "The burgomaster's house stands shuttered at the end of the lane, and old smoke hangs in its eaves.",
  "Someone has set a single lamp in the upper window, and it does not move when the wind comes.",
  "The door is not locked. It never was, they say, since the night the bells stopped ringing.",
  "Inside, the ledgers lie open on the desk, every column added and every sum correct to the coin.",
  "On the last page, in a hand that is not his, someone has written one word: home. Choose who goes first.",
].join(" ");
const P_DOOR = "Oil the hinge, or force it.";
const P_D30 = "Connect and calibrate the tower first";
const P90 =
  "Oil the hinge and slip inside, or force the door and wake the whole house to its long dark";
const P200 =
  "Agnes may oil the hinge and slip inside quietly, or Tomas may force the door and wake the whole house; whoever goes first carries the lantern and must draw a card from the dread deck before anyone moves";

const BUDGET_VIEWPORTS = [
  "1024x594",
  "1180x820",
  "1366x768",
  "1440x900",
  "1440x901",
  "1280x901",
  "1600x1000",
  "1680x1050",
  "1920x960",
  "1920x1080",
  "820x1180",
  "1024x1366",
];
const setNode = (page: Page, selector: string, text: string | null) =>
  page
    .locator(selector)
    .first()
    .evaluate((el, t) => {
      const node = el as HTMLElement & { __orig?: string };
      // Edit the text node in place so React can still update it on the next moment.
      if (!el.firstChild) return;
      if (node.__orig === undefined) node.__orig = el.firstChild.nodeValue ?? "";
      el.firstChild.nodeValue = t ?? node.__orig;
    }, text);

/** Put a prompt in the band, with the same length tier StoryBoard computes for a real one. */
const setPrompt = async (page: Page, text: string | null) => {
  await setNode(page, "[data-next-band] b", text);
  await page.locator("[data-next-band]").evaluate((el, t) => {
    const node = el.querySelector("b") as HTMLElement;
    const n = (t ?? node.textContent ?? "").length;
    el.setAttribute("data-len", n <= 24 ? "short" : n <= 48 ? "mid" : "long");
  }, text);
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.waitForTimeout(100);
};

/** The waiting dialog (a text moment) and its text, measured where they sit. */
const measureDialog = (page: Page) =>
  page.evaluate(() => {
    const story = document.querySelector(".bt-story") as HTMLElement;
    const dialog = document.querySelector("[data-waiting-dialog]") as HTMLElement;
    const text = dialog.querySelector("[data-moment-caption]") as HTMLElement;
    const band = document.querySelector("[data-next-band]") as HTMLElement;
    const line = Number.parseFloat(getComputedStyle(text).lineHeight);
    return {
      storyTop: story.getBoundingClientRect().top,
      storyBottom: story.getBoundingClientRect().bottom,
      dialogTop: dialog.getBoundingClientRect().top,
      dialogBottom: dialog.getBoundingClientRect().bottom,
      size: dialog.getAttribute("data-dialog-size"),
      shownH: text.clientHeight,
      fullH: text.scrollHeight,
      line,
      chars: (text.textContent ?? "").length,
      bandBottom: band.getBoundingClientRect().bottom,
      viewH: window.innerHeight,
      docY: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    };
  });

/** Tell WaitingDialog to measure again after a test edits its text node behind React's back. */
const remeasure = async (page: Page) => {
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.waitForTimeout(250);
};

/**
 * The waiting board (a text moment, no visual): the dialog stays in the story column with the
 * real text, a 294-character text (DRAC) and a 480-character text (FIVE). A text that does not
 * fit the compact frame grows it to the default size before any line is cut; what is cut is cut at
 * a whole line, with the full text still in the DOM. The band fits and shows every real prompt
 * untruncated. Since visuals step 10 a still shows in the visual layer, so its size is checked in
 * visual-layer.spec.ts, not here.
 */
const assertViewportBudget = async (
  page: Page,
  key: string,
  shot?: (name: string) => Promise<void>,
) => {
  const [w, h] = key.split("x").map(Number);
  await page.setViewportSize({ width: w as number, height: h as number });
  await page.waitForTimeout(300);
  const tall = (h as number) >= 1040;
  const texts: [string, string | null][] = [
    ["real", null],
    ["294 chars", DRAC],
    ["480 chars", FIVE],
    ["1440 chars", `${FIVE} ${FIVE} ${FIVE}`],
  ];
  for (const [name, text] of texts) {
    await setNode(page, ".bt-wait-text", text);
    await remeasure(page);
    const m = await measureDialog(page);
    const label = `${key} ${name}`;
    expect(m.dialogTop, `${label}: dialog stays in the story column`).toBeGreaterThanOrEqual(
      m.storyTop - 1,
    );
    expect(m.dialogBottom, `${label}: dialog stays in the story column`).toBeLessThanOrEqual(
      m.storyBottom + 1,
    );
    const rest = m.shownH % m.line;
    expect(Math.min(rest, m.line - rest), `${label}: the text is cut at a whole line`).toBeLessThan(
      2,
    );
    if (m.fullH > m.shownH + 1) {
      expect(m.size, `${label}: a cut text grew the dialog to the default size first`).toBe(
        "default",
      );
    }
    if (key === "1180x820" && name === "1440 chars") await shot?.("board-waiting-long-1180x820");
    if (key === "1180x820" && text === FIVE) {
      // Measured: up to 506 characters of this text fit whole at 1180x820 (default size).
      expect(m.fullH, `${label}: 480 characters fit whole`).toBeLessThanOrEqual(m.shownH + 1);
    }
    if (text) expect(m.chars, `${label}: the full text stays in the DOM`).toBe(text.length);
    // Under 960px wide the board stacks into one column and scrolls on main too (spec: TV board).
    if ((w as number) >= 960) {
      expect(m.docY, `${label}: board does not scroll`).toBeLessThanOrEqual(0);
      expect(m.bandBottom, `${label}: band on screen`).toBeLessThanOrEqual(m.viewH + 1);
    }
  }
  await setNode(page, ".bt-wait-text", null);
  await remeasure(page);
  if (tall) {
    await expect(page.locator("[data-party-items]")).toBeVisible();
    await expectItemsInside(page);
  }
  for (const prompt of [P_DOOR, P_D30, P90]) {
    await setPrompt(page, prompt);
    await page.waitForTimeout(150);
    const g = await page.evaluate(() => {
      const b = document.querySelector("[data-next-band] b") as HTMLElement;
      return {
        w: b.scrollWidth - b.clientWidth,
        h: b.scrollHeight - b.clientHeight,
        font: Number.parseFloat(getComputedStyle(b).fontSize),
      };
    });
    expect(g.w, `${key}: "${prompt.slice(0, 18)}" is not cut sideways`).toBeLessThanOrEqual(1);
    expect(g.h, `${key}: "${prompt.slice(0, 18)}" is not cut off`).toBeLessThanOrEqual(4);
    expect(g.font, `${key}: prompt font`).toBeGreaterThanOrEqual(28);
  }
  await setPrompt(page, P200);
  const long = await page.evaluate(() => {
    const band = document.querySelector("[data-next-band]") as HTMLElement;
    const b = band.querySelector("b") as HTMLElement;
    return {
      band: band.getBoundingClientRect().height,
      line: Number.parseFloat(getComputedStyle(b).lineHeight),
    };
  });
  expect(long.band, `${key}: a 200-character prompt keeps the band bounded`).toBeLessThanOrEqual(
    long.line * 3 + 24,
  );
  await setPrompt(page, null);
};

/**
 * A visual moment (visuals step 10): the board is on the visual layer, the still sits in its
 * plate inside the layer with its #78 hooks, and the moment text is the layer's caption.
 */
const assertVisualLayer = async (page: Page) => {
  await expect(page.locator("main")).toHaveAttribute("data-board-layer", "visual");
  await expect(page.locator("[data-visual-layer] .bt-plate > [data-camera-still]")).toHaveCount(1);
  await expect(page.locator("[data-visual-layer] [data-moment-caption]")).toBeInViewport({
    ratio: 1,
  });
  await expect(page.locator(".bt-page [data-camera-still]")).toHaveCount(0);
};

test("story board look at proving ground, grey-stair, and the Keeper", async ({
  browser,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "iPad-landscape board shots are captured on Chromium.");
  test.setTimeout(90_000);
  const session = await startAcceptanceHost(testInfo);
  const { baseURL, host } = session;
  const contexts: BrowserContext[] = [];
  const shot = async (page: Page, name: string) => {
    await waitForBoardAnimationsSettled(page);
    const dest = testInfo.outputPath(`${name}.png`);
    await page.screenshot({ path: dest, fullPage: false });
    copyToE2eArtifacts(testInfo, dest, `${name}.png`);
  };

  try {
    const boardContext = await browser.newContext({
      baseURL,
      viewport: { width: 1180, height: 820 },
      hasTouch: false,
    });
    contexts.push(boardContext);
    const board = await boardContext.newPage();
    const padContext = await browser.newContext({
      baseURL,
      viewport: { width: 1180, height: 820 },
      hasTouch: true,
    });
    contexts.push(padContext);
    const pad = await padContext.newPage();
    const d = device(pad);

    await board.goto("/board", { waitUntil: "domcontentloaded" });
    await expect(board.locator("main")).toHaveAttribute("data-screen", "pick-story");
    await pad.goto(`${baseURL}/join?code=${host.joinCode}`);
    await expect(pad.locator("main")).toHaveAttribute("data-screen", "pick-story");
    await d.button("continue").click();
    await expect(pad.locator("main")).toHaveAttribute("data-screen", "game-settings");
    await d.button("continue").click();
    await expect(pad.locator("main")).toHaveAttribute("data-screen", "tower-connect");
    await d.button("play-without-tower").click();
    await expect(pad.locator("main")).toHaveAttribute("data-screen", "tower-volume-test");
    await d.button("continue").click();
    await d.button("take-all").click();
    await d.button("continue").click();
    await doneEverySetupStep(pad);
    await d.button("begin").click();

    await expect(board.getByText("The proving ground is quiet.")).toBeVisible();
    // proving-ground.01 is a still: the board is on the visual layer (visuals step 10).
    await expect(board.locator("main")).toHaveAttribute("data-board-layer", "visual");
    await expect(board.locator(".bt-board-title h1")).toContainText("The Hall");
    await expect(board.locator(".bt-board-title h1 small")).toHaveText("The Proving Ground");
    await expect(board.locator("[data-status-strip]")).toHaveCount(0);
    await expect(board.getByText(/Fallback/)).toHaveCount(0);
    const cartNames = board.locator(".bt-cart-nm");
    const cartStatus = board.locator(".bt-cart-st");
    await expect(cartStatus).toHaveCount(4);
    for (let i = 0; i < 4; i += 1) {
      const name = await cartNames.nth(i).innerText();
      const status = await cartStatus.nth(i).innerText();
      expect(status, "cartouche status is the holder id, not the hunter name").not.toContain(name);
      expect(status).not.toMatch(/—/);
      expect(status, "status maps from existing fields").toMatch(/^(Waiting|Away|\S+)$/);
      expect(status.length).toBeGreaterThan(0);
    }
    await expect(board.locator(".bt-banner")).toContainText("iPads can't reach this address");
    await assertBoardFits(board);
    await assertPlayHeader(board);
    await shot(board, "board-proving-ground-landscape");

    await board.setViewportSize({ width: 1024, height: 594 });
    await expect(board.locator(".bt-banner")).toContainText("iPads can't reach this address");
    await expect(board.locator(".bt-cart-nm", { hasText: "Emeric" })).toBeVisible();
    await assertBoardFits(board);
    await assertPlayHeader(board);
    await shot(board, "board-join-warning-1024x594");
    await board.setViewportSize({ width: 1920, height: 1080 });
    await expect(board.locator("main")).toHaveAttribute("data-board-mode", "play");
    await expect(board.locator(".bt-acting")).toBeInViewport({ ratio: 1 });
    // No acting hunter, corruption or carried data exists yet: all three read unavailable.
    await expect(board.locator(".bt-acting [data-unavailable]")).toHaveCount(3);
    await expect(board.locator(".bt-qr")).toHaveCount(0);
    await assertBoardFits(board);
    await shot(board, "board-proving-ground-1920x1080");
    await board.setViewportSize({ width: 1180, height: 820 });

    await d.button("continue").click();
    await expect(board.getByText("Each hunter reads alone.")).toBeVisible();
    // A text moment: the waiting board, with the parchment page (visuals step 8) and no layer.
    await expect(board.locator("main")).toHaveAttribute("data-board-layer", "waiting");
    await expect(board.locator("[data-visual-layer]")).toHaveCount(0, { timeout: 2000 });
    await assertBoardFits(board);
    await assertWaitingDialog(board);
    await assertPlayHeader(board);
    await shot(board, "board-waiting-landscape");
    await board.setViewportSize({ width: 1024, height: 594 });
    await assertBoardFits(board);
    await assertWaitingDialog(board);
    await assertPlayHeader(board);
    await shot(board, "board-waiting-1024x594");
    await board.setViewportSize({ width: 1920, height: 1080 });
    await assertBoardFits(board);
    await assertWaitingDialog(board);
    await assertPlayHeader(board);
    await shot(board, "board-waiting-1920x1080");
    for (const key of BUDGET_VIEWPORTS)
      await assertViewportBudget(board, key, (n) => shot(board, n));
    await board.setViewportSize({ width: 1180, height: 820 });
    await d.button("continue").click();
    await expect(board.getByText("A bell marks the step.")).toBeVisible();
    // Waiting to visual and back to waiting: each layer is exactly one of the two.
    await expect(board.locator("main")).toHaveAttribute("data-board-layer", "visual");
    await expect(board.locator("[data-waiting-dialog]")).toHaveCount(0);
    await d.button("continue").click();
    await expect(board.getByText(/A grey stair climbs into the dark/)).toBeVisible();
    await expect(board.locator(".bt-board-title h1")).toContainText("A Grey Stair");
    await expect(board.locator(".bt-board-title h1 small")).toHaveText("The Grey Stair");
    await assertBoardFits(board);
    await assertVisualLayer(board);
    // Waiting to visual: the layer takes the screen and the dialog is gone from the page.
    await expect(board.locator("[data-waiting-dialog]")).toHaveCount(0);
    await shot(board, "board-grey-stair-landscape");
    await board.setViewportSize({ width: 1024, height: 594 });
    await assertBoardFits(board);
    await assertVisualLayer(board);
    await assertPlayHeader(board);
    await shot(board, "board-grey-stair-1024x594");
    await board.setViewportSize({ width: 1920, height: 1080 });
    await assertBoardFits(board);
    await assertVisualLayer(board);
    await assertPlayHeader(board);
    await shot(board, "board-grey-stair-1920x1080");
    await board.setViewportSize({ width: 1180, height: 820 });

    await d.button("continue").click();
    await expect(board.getByText(/At the top, a door/)).toBeVisible();
    await d.button("continue").click();
    await expect(board.locator('[data-talking-avatar="keeper"]')).toBeVisible();
    const keeperCaption = board.locator("[data-board-caption]");
    await expect(keeperCaption).toBeVisible();
    await expect(keeperCaption).toHaveAttribute("data-keeper-line", "ts-keeper-001");
    await expect(keeperCaption).toHaveText(
      "The Keeper: Light them if you can. The key is at the bottom. It always is.",
    );
    await expect(board.locator(".bt-board-title h1")).toContainText("The Keeper");
    await expect(board.locator(".bt-board-title h1 small")).toHaveText("The Grey Stair");
    await board.evaluate(() => {
      const audio = document.querySelector<HTMLAudioElement>("[data-keeper-plate] audio");
      if (!audio) throw new Error("Keeper audio element missing");
      audio.pause();
      audio.currentTime = 0;
      audio.dispatchEvent(new Event("timeupdate", { bubbles: true }));
    });
    await expect(keeperCaption).toHaveText(
      "The Keeper: Light them if you can. The key is at the bottom. It always is.",
    );
    await board.evaluate(() => {
      for (const audio of document.querySelectorAll("audio")) audio.pause();
    });
    await assertBoardFits(board, { keeper: true });
    await assertKeeperCinema(board, "1180x820");
    await shot(board, "board-keeper-moment-landscape");
    await board.setViewportSize({ width: 1024, height: 594 });
    await expect(board.locator("main")).toHaveAttribute("data-moment", "grey-stair.03");
    await assertBoardFits(board, { keeper: true });
    await assertKeeperCinema(board, "1024x594");
    await shot(board, "board-keeper-1024x594");
    await board.setViewportSize({ width: 1920, height: 1080 });
    await assertBoardFits(board, { keeper: true });
    await assertKeeperCinema(board, "1920x1080");
    await shot(board, "board-keeper-1920x1080");
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await host.close();
  }
});
