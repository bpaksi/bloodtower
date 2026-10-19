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
 * Play parchment (visuals step 8): kicker, title, ornament, justified narration with a floated
 * drop cap, a plate around any still, the party items zone reading unavailable (never a count),
 * and the blood-band next prompt. Everything measured, at whatever viewport is current.
 */
const assertPlayParchment = async (page: Page) => {
  const page_ = page.locator(".bt-page .bt-narration[data-moment-caption]");
  await expect(page.locator(".bt-page .bt-kicker")).toBeVisible();
  await expect(page.locator(".bt-page h2")).toBeVisible();
  await expect(page.locator(".bt-page .bt-orn")).toContainText("❦");
  const look = await page_.evaluate((el) => {
    const style = getComputedStyle(el);
    const cap = getComputedStyle(el, "::first-letter");
    const tallest = Math.max(
      ...[...document.querySelectorAll(".bt-page")].map((x) => x.getBoundingClientRect().bottom),
    );
    return {
      align: style.textAlign,
      capFloat: cap.float,
      capColor: cap.color,
      pageBottom: tallest,
    };
  });
  expect(look.align, "narration is justified").toBe("justify");
  expect(look.capFloat, "first paragraph has a drop cap").toBe("left");
  expect(look.capColor, "drop cap is blood").toBe("rgb(142, 27, 27)");
  const still = page.locator("[data-camera-still]");
  if (await still.count()) {
    await expect(page.locator(".bt-plate [data-camera-still]")).toHaveCount(1);
    const frame = await page.locator(".bt-plate").evaluate((el) => {
      const cs = getComputedStyle(el);
      return { border: Number.parseFloat(cs.outlineWidth), outline: cs.outlineStyle };
    });
    expect(frame.border, "plate has a rule").toBeGreaterThanOrEqual(2);
    expect(frame.outline, "plate has an offset outline").toBe("solid");
  }
  const items = page.locator("[data-party-items]");
  const tall = (page.viewportSize()?.height ?? 0) > 900;
  // Below 900px high the zone is hidden so the still keeps main's room; the unavailable values
  // stay in the DOM and are checked there too.
  if (tall) await expect(items).toBeVisible();
  else await expect(items).toBeHidden();
  if (tall) await expect(items).toBeInViewport({ ratio: 1 });
  const values = items.locator(".bt-items-val");
  await expect(values).toHaveCount(3);
  for (let i = 0; i < 3; i += 1) {
    await expect(values.nth(i)).toHaveText("unavailable");
    await expect(values.nth(i)).toHaveAttribute("data-unavailable", "");
  }
  await expect(items).not.toContainText(/\b\d+\b/);
  const fit = tall
    ? await items.evaluate((el) => ({
        valuesInside: [...el.querySelectorAll(".bt-items-val")].every((v) => {
          const r = v.getBoundingClientRect();
          const box = el.getBoundingClientRect();
          return r.left >= box.left - 1 && r.right <= box.right + 1;
        }),
      }))
    : { valuesInside: true };
  expect(fit.valuesInside, "each unavailable value sits inside the zone").toBe(true);
  if (await still.count()) {
    await assertStillRoom(page);
  }
  const band = page.locator("[data-next-band]");
  await expect(band).toBeInViewport({ ratio: 1 });
  const geo = await page.evaluate(() => {
    const b = document.querySelector("[data-next-band]") as HTMLElement;
    const it = document.querySelector("[data-party-items]") as HTMLElement;
    const story = document.querySelector(".bt-story") as HTMLElement;
    const br = b.getBoundingClientRect();
    const ir = it.getBoundingClientRect();
    const sr = story.getBoundingClientRect();
    const text = b.querySelector("b") as HTMLElement;
    return {
      bg: getComputedStyle(b).backgroundImage,
      fontPx: Number.parseFloat(getComputedStyle(text).fontSize),
      lineHeight: Number.parseFloat(getComputedStyle(text).lineHeight),
      textH: text.getBoundingClientRect().height,
      bandH: br.height,
      bandW: br.width,
      storyW: sr.width,
      bandTop: br.top,
      itemsBottom: ir.bottom,
      viewW: window.innerWidth,
    };
  });
  expect(geo.bg, "next prompt sits on a blood band").toContain("rgb(142, 27, 27)");
  expect(geo.bandW, "band spans the story column").toBeGreaterThanOrEqual(geo.storyW - 2);
  if (tall) {
    expect(geo.bandTop, "band sits under the items zone").toBeGreaterThanOrEqual(
      geo.itemsBottom - 1,
    );
  }
  expect(geo.textH, "prompt is one line").toBeLessThanOrEqual(geo.lineHeight * 1.5);
  expect(geo.fontPx, "prompt is at least 28px").toBeGreaterThanOrEqual(28);
  if (geo.viewW >= 1900) {
    expect(geo.fontPx, "prompt is 56 to 60px on the TV").toBeGreaterThanOrEqual(56);
    expect(geo.bandH).toBeGreaterThanOrEqual(60);
  }
};

/** Still well height on origin/main at the same viewport with the same moment (measured). */
const MAIN_WELL_HEIGHT: Record<string, number> = { "1180x820": 282, "1024x594": 171 };

const wellKey = (page: Page) => {
  const v = page.viewportSize();
  return `${v?.width}x${v?.height}`;
};

/**
 * The still well keeps main's height (so the camera track keeps its zoom), the plate stays fully
 * in view, and the camera frame is a zoom (scale above 1), not a clamped pan.
 */
const assertStillRoom = async (page: Page, opts?: { text?: string }) => {
  if (opts?.text) {
    await page.locator("[data-moment-caption]").evaluate((el, text) => {
      // Edit the text node in place so React can still update it on the next moment.
      if (el.firstChild) el.firstChild.nodeValue = text;
    }, opts.text);
    await page.waitForTimeout(400);
  }
  const plate = page.locator(".bt-plate");
  await expect(plate).toBeInViewport({ ratio: 1 });
  const m = await page.evaluate(() => {
    const well = document.querySelector("[data-camera-still]") as HTMLElement;
    const page_ = document.querySelector(".bt-page") as HTMLElement;
    const plateEl = document.querySelector(".bt-plate") as HTMLElement;
    const r = well.getBoundingClientRect();
    const pr = plateEl.getBoundingClientRect();
    const img = well.querySelector("img") as HTMLElement;
    const t = getComputedStyle(img).transform;
    const scale = t === "none" ? 1 : Number.parseFloat(t.slice(7));
    return {
      h: r.height,
      plateBottom: pr.bottom,
      pageBottom: page_.getBoundingClientRect().bottom,
      scale,
    };
  });
  expect(m.plateBottom, "plate is not clipped by the page").toBeLessThanOrEqual(m.pageBottom + 1);
  expect(m.scale, "camera track keeps a zoom (scale above 1)").toBeGreaterThan(1);
  const base = MAIN_WELL_HEIGHT[wellKey(page)];
  if (base && !opts?.text)
    expect(m.h, "still well is as tall as main's").toBeGreaterThanOrEqual(base - 3);
};

/** The prompt band stays one line and a bounded height for short and long prompts. */
const assertBandLine = async (page: Page, label: string) => {
  await page.locator("[data-next-band] b").evaluate((el, text) => {
    if (el.firstChild) el.firstChild.nodeValue = text;
  }, label);
  const g = await page.evaluate(() => {
    const b = document.querySelector("[data-next-band]") as HTMLElement;
    const t = b.querySelector("b") as HTMLElement;
    return {
      band: b.getBoundingClientRect().height,
      text: t.getBoundingClientRect().height,
      line: Number.parseFloat(getComputedStyle(t).lineHeight),
    };
  });
  expect(g.text, `"${label.slice(0, 20)}" is one line`).toBeLessThanOrEqual(g.line * 1.2);
  expect(g.band, "band height is bounded").toBeLessThanOrEqual(g.line + 40);
};

const LONG_CAPTION =
  "The burgomaster's house stands shuttered at the end of the lane, and the smell of old smoke hangs in its eaves. Someone has set a single lamp in the upper window, and it does not move when the wind comes. The door is not locked. It never was, they say, since the night the bells stopped.";
const LONG_PROMPT =
  "Oil the hinge and slip inside, or force the door and wake the whole house to its long dark";

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
    await d.button("continue").click();
    await expect(board.getByText("A bell marks the step.")).toBeVisible();
    await d.button("continue").click();
    await expect(board.getByText(/A grey stair climbs into the dark/)).toBeVisible();
    await expect(board.locator(".bt-board-title h1")).toContainText("A Grey Stair");
    await expect(board.locator(".bt-board-title h1 small")).toHaveText("The Grey Stair");
    await assertBoardFits(board);
    await assertPlayParchment(board);
    await assertBandLine(board, "Oil the hinge, or force it.");
    await assertBandLine(board, LONG_PROMPT);
    await assertStillRoom(board, { text: LONG_CAPTION });
    await shot(board, "board-grey-stair-landscape");
    await board.setViewportSize({ width: 1024, height: 594 });
    await assertBoardFits(board);
    await assertPlayParchment(board);
    await assertPlayHeader(board);
    await assertBandLine(board, "Oil the hinge, or force it.");
    await assertBandLine(board, LONG_PROMPT);
    await assertStillRoom(board, { text: LONG_CAPTION });
    await shot(board, "board-grey-stair-1024x594");
    await board.setViewportSize({ width: 1920, height: 1080 });
    await assertBoardFits(board);
    await assertPlayParchment(board);
    await assertPlayHeader(board);
    await assertBandLine(board, "Oil the hinge, or force it.");
    await assertBandLine(board, LONG_PROMPT);
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
    await shot(board, "board-keeper-moment-landscape");
    await board.setViewportSize({ width: 1024, height: 594 });
    await expect(board.locator("main")).toHaveAttribute("data-moment", "grey-stair.03");
    await assertBoardFits(board, { keeper: true });
    await shot(board, "board-keeper-1024x594");
    await board.setViewportSize({ width: 1920, height: 1080 });
    await assertBoardFits(board, { keeper: true });
    await shot(board, "board-keeper-1920x1080");
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await host.close();
  }
});
