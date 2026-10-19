import { type Browser, type BrowserContext, expect, type Page, test } from "@playwright/test";
import {
  doneEverySetupStep,
  startAcceptanceHost,
  waitForBoardAnimationsSettled,
} from "./support/acceptance.ts";
import { copyToE2eArtifacts } from "./support/e2e-artifacts.ts";

// Visuals step 10: the visual zoom layer (R3-UI-10 layer 2, R3-UI-31, R3-UI-32; Q4 (a)).

const device = (page: Page) => ({
  button: (action: string) => page.locator(`button[data-action="${action}"]`),
});

const VIEWPORTS = [
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

/**
 * Header height on origin/main (87241f1) at each viewport, in play. The layer must not move the
 * board under it.
 */
const MAIN_HEADER: Record<string, number> = {
  "1024x594": 86,
  "820x1180": 265,
};
const mainHeader = (key: string) => MAIN_HEADER[key] ?? 100;

/** grey-stair.01's still well on origin/main (87241f1), width x height, in the parchment plate. */
const MAIN_WELL: Record<string, [number, number]> = {
  "1024x594": [482, 216],
  "1180x820": [542, 318],
  "1366x768": [628, 289],
  "1440x900": [662, 404],
  "1440x901": [662, 405],
  "1280x901": [588, 422],
  "1600x1000": [735, 484],
  "1680x1050": [777, 402],
  "1920x960": [912, 461],
  "1920x1080": [912, 447],
  "820x1180": [749, 421],
  "1024x1366": [452, 667],
};

const LAYER = "[data-visual-layer]";

/** From the Pick Story screen to Begin, on one iPad; the board shows proving-ground.01 after. */
const openBoardAtFirstMoment = async (
  browser: Browser,
  baseURL: string,
  joinCode: string,
  contexts: BrowserContext[],
  reducedMotion: "reduce" | "no-preference" = "no-preference",
) => {
  const boardContext = await browser.newContext({
    baseURL,
    viewport: { width: 1180, height: 820 },
    reducedMotion,
  });
  contexts.push(boardContext);
  const board = await boardContext.newPage();
  const padContext = await browser.newContext({
    baseURL,
    viewport: { width: 820, height: 1180 },
    hasTouch: true,
  });
  contexts.push(padContext);
  const pad = await padContext.newPage();
  const d = device(pad);
  await board.goto("/board", { waitUntil: "domcontentloaded" });
  await expect(board.locator("main")).toHaveAttribute("data-screen", "pick-story");
  await expect(board.locator("main")).toHaveAttribute("data-board-layer", "startup");
  await pad.goto(`${baseURL}/join?code=${joinCode}`);
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
  await expect(board.locator("main")).toHaveAttribute("data-board-layer", "startup");
  await d.button("begin").click();
  await expect(board.locator("main")).toHaveAttribute("data-moment", "proving-ground.01");
  return { board, pad, d };
};

/** The layer's own CSS animation: its name, length, keyframes and samples across its run. */
const layerAnimation = (page: Page) =>
  page.locator(LAYER).evaluate((el) => {
    const own = el
      .getAnimations()
      .filter(
        (a): a is CSSAnimation =>
          "animationName" in a && (a.effect as KeyframeEffect | null)?.target === el,
      );
    const animation = own.at(-1);
    if (!animation) return null;
    const timing = animation.effect?.getComputedTiming();
    const duration = Number(timing?.duration ?? 0);
    const keyframes = (animation.effect as KeyframeEffect).getKeyframes();
    animation.pause();
    const samples: { t: number; opacity: number; scale: number; transform: string }[] = [];
    for (let t = 0; t <= duration; t += duration / 16) {
      animation.currentTime = t;
      const style = getComputedStyle(el);
      const matrix = /matrix\(([-\d.e]+)/.exec(style.transform);
      samples.push({
        t,
        opacity: Number(style.opacity),
        scale: matrix ? Number(matrix[1]) : 1,
        transform: style.transform,
      });
    }
    animation.finish();
    return {
      name: animation.animationName,
      duration,
      transformKeyframes: keyframes.filter((k) => "transform" in k).length,
      samples,
    };
  });

/** The still well, the camera image's transform, and the board under the layer. */
const measureVisual = (page: Page) =>
  page.evaluate(() => {
    const layer = document.querySelector("[data-visual-layer]") as HTMLElement;
    const well = document.querySelector("[data-visual-layer] [data-camera-still]") as HTMLElement;
    const img = well.querySelector("img") as HTMLImageElement;
    const header = document.querySelector(".bt-board-header") as HTMLElement;
    const lr = layer.getBoundingClientRect();
    const wr = well.getBoundingClientRect();
    const t = getComputedStyle(img).transform;
    const m =
      /matrix\(([-\d.e]+), ([-\d.e]+), ([-\d.e]+), ([-\d.e]+), ([-\d.e]+), ([-\d.e]+)\)/.exec(t);
    return {
      vw: window.innerWidth,
      vh: window.innerHeight,
      layer: { x: lr.left, y: lr.top, w: lr.width, h: lr.height },
      well: { x: wr.left, y: wr.top, w: wr.width, h: wr.height },
      wellBg: getComputedStyle(layer).backgroundColor,
      fit: getComputedStyle(img).objectFit,
      transform: t,
      scale: m ? Number(m[1]) : 1,
      tx: m ? Number(m[5]) : 0,
      ty: m ? Number(m[6]) : 0,
      header: header.getBoundingClientRect().height,
      docY: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    };
  });

/**
 * Q4 (a): the still is whole and letterboxed. The well is the art's 16:9, as large as the screen
 * allows (it meets both sides or both the top and bottom), centred on void; the camera image
 * never drops below cover and never leaves the still; the board under it keeps main's header.
 */
const assertLetterboxed = (m: Awaited<ReturnType<typeof measureVisual>>, key: string) => {
  expect(m.layer, `${key}: layer covers the screen`).toEqual({ x: 0, y: 0, w: m.vw, h: m.vh });
  expect(m.wellBg, `${key}: letterbox is void`).toBe("rgb(11, 8, 6)");
  expect(m.fit).toBe("cover");
  expect(Math.abs(m.well.w / m.well.h - 16 / 9), `${key}: well is 16:9`).toBeLessThan(0.01);
  expect(m.well.x, `${key}: well inside`).toBeGreaterThanOrEqual(-0.5);
  expect(m.well.y, `${key}: well inside`).toBeGreaterThanOrEqual(-0.5);
  expect(m.well.x + m.well.w, `${key}: well inside`).toBeLessThanOrEqual(m.vw + 0.5);
  expect(m.well.y + m.well.h, `${key}: well inside`).toBeLessThanOrEqual(m.vh + 0.5);
  const fillsWidth = Math.abs(m.well.w - m.vw) <= 1;
  const fillsHeight = Math.abs(m.well.h - m.vh) <= 1;
  expect(fillsWidth || fillsHeight, `${key}: well as large as the screen allows`).toBe(true);
  expect(Math.abs(m.well.x + m.well.w / 2 - m.vw / 2), `${key}: centred`).toBeLessThanOrEqual(1);
  expect(Math.abs(m.well.y + m.well.h / 2 - m.vh / 2), `${key}: centred`).toBeLessThanOrEqual(1);
  // The camera transform (#78): scale at least cover, and the view stays inside the still.
  expect(m.scale, `${key}: camera never below cover`).toBeGreaterThanOrEqual(0.999);
  expect(Math.abs(m.tx), `${key}: pan stays in the still`).toBeLessThanOrEqual(
    ((m.scale - 1) * m.well.w) / 2 + 0.5,
  );
  expect(Math.abs(m.ty), `${key}: pan stays in the still`).toBeLessThanOrEqual(
    ((m.scale - 1) * m.well.h) / 2 + 0.5,
  );
  expect(m.header, `${key}: header under the layer as on main`).toBeCloseTo(mainHeader(key), 0);
  const main = MAIN_WELL[key];
  if (main) {
    expect(m.well.w * m.well.h, `${key}: still larger than main's plate`).toBeGreaterThan(
      main[0] * main[1],
    );
  }
};

test("a visual zooms to a full-screen letterboxed layer, the camera runs in it, and Continue zooms it out", async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "the Story board runs on the Mac (Chromium)");
  test.setTimeout(150_000);
  const { baseURL, host } = await startAcceptanceHost(testInfo);
  const contexts: BrowserContext[] = [];
  const shot = async (page: Page, name: string) => {
    await waitForBoardAnimationsSettled(page);
    const dest = testInfo.outputPath(`${name}.png`);
    await page.screenshot({ path: dest, fullPage: false });
    copyToE2eArtifacts(testInfo, dest, `${name}.png`);
  };
  try {
    const { board, d } = await openBoardAtFirstMoment(browser, baseURL, host.joinCode, contexts);
    const main = board.locator("main");
    const layer = board.locator(LAYER);

    await test.step("proving-ground.01 (a still) zooms in over about 0.8 s, never flashing", async () => {
      await expect(main).toHaveAttribute("data-board-layer", "visual");
      await expect(layer).toHaveAttribute("data-visual-phase", "in");
      const zoom = await layerAnimation(board);
      expect(zoom?.name).toBe("bt-visual-in");
      expect(zoom?.duration).toBeGreaterThanOrEqual(600);
      expect(zoom?.duration).toBeLessThanOrEqual(1000);
      const samples = zoom?.samples ?? [];
      expect(samples[0]?.opacity).toBeLessThan(0.05);
      expect(samples[0]?.scale).toBeLessThan(0.6);
      expect(samples.at(-1)?.opacity).toBe(1);
      expect(samples.at(-1)?.scale).toBe(1);
      expect(await layer.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
      // One steady change: opacity and size only ever grow (no flicker or bounce on the way).
      for (let i = 1; i < samples.length; i += 1) {
        expect(samples[i]?.opacity).toBeGreaterThanOrEqual((samples[i - 1]?.opacity ?? 0) - 1e-6);
        expect(samples[i]?.scale).toBeGreaterThanOrEqual((samples[i - 1]?.scale ?? 0) - 1e-6);
      }
      // Mid-zoom the layer really is between the waiting board and full screen.
      const mid = samples[8];
      expect(mid?.scale).toBeGreaterThan(0.5);
      expect(mid?.scale).toBeLessThan(1);
      // No controls in the layer.
      await expect(
        board.locator(`${LAYER} :is(button, input, textarea, select, a, [onclick])`),
      ).toHaveCount(0);
      // Action-needed messages stay above the visual (layer 1): the join warning is on top.
      const banner = board.locator(".bt-banner", { hasText: "iPads can't reach this address" });
      await expect(banner).toBeVisible();
      const onTop = await banner.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return hit !== null && el.contains(hit);
      });
      expect(onTop, "banner is above the visual layer").toBe(true);
      const m = await measureVisual(board);
      assertLetterboxed(m, "1180x820");
      await expect(board.locator(`${LAYER} [data-moment-caption]`)).toHaveText(
        "The proving ground is quiet.",
      );
      await shot(board, "visual-proving-ground-1180x820");
    });

    await test.step("Continue to a text moment zooms the visual back out to the waiting board", async () => {
      await d.button("continue").click();
      await expect(main).toHaveAttribute("data-board-layer", "waiting");
      // The last visual stays on screen for the zoom out, then the layer is gone.
      await expect(layer).toHaveAttribute("data-visual-phase", "out");
      const out = await board
        .locator(LAYER)
        .evaluate((el) => getComputedStyle(el).animationName)
        .catch(() => "gone");
      expect(["bt-visual-out", "gone"]).toContain(out);
      await expect(layer).toHaveCount(0, { timeout: 2000 });
      await expect(board.locator(".bt-page [data-moment-caption]")).toHaveText(
        "Each hunter reads alone.",
      );
      await expect(main.locator(".bt-board-header")).toBeVisible();
      await shot(board, "waiting-each-hunter-1180x820");
    });

    await test.step("grey-stair.01: the camera track pans and zooms inside the letterboxed still", async () => {
      await d.button("continue").click();
      await expect(main).toHaveAttribute("data-moment", "proving-ground.03");
      await expect(main).toHaveAttribute("data-board-layer", "visual");
      await d.button("continue").click();
      await expect(main).toHaveAttribute("data-moment", "grey-stair.01");
      const img = board.locator(`${LAYER} .bt-plate > [data-camera-still] img`);
      await expect(img).toHaveAttribute("data-camera-track", "grey-stair.01");
      const first = await measureVisual(board);
      await board.waitForTimeout(2000);
      const later = await measureVisual(board);
      expect(later.transform, "camera track moves").not.toBe(first.transform);
      for (const key of VIEWPORTS) {
        const [w, h] = key.split("x").map(Number);
        await board.setViewportSize({ width: w as number, height: h as number });
        await board.waitForTimeout(300);
        assertLetterboxed(await measureVisual(board), key);
      }
      // The track zooms past cover inside the layer (scale over 1), as it does in main's plate.
      await expect
        .poll(async () => (await measureVisual(board)).scale, { timeout: 10_000 })
        .toBeGreaterThan(1.5);
      await board.setViewportSize({ width: 1024, height: 594 });
      await shot(board, "visual-grey-stair-1024x594");
      await board.setViewportSize({ width: 1920, height: 1080 });
      await shot(board, "visual-grey-stair-1920x1080");
      await board.setViewportSize({ width: 1180, height: 820 });
      await shot(board, "visual-grey-stair-1180x820");
    });

    await test.step("a visual after a visual is a straight cut: same layer, no new zoom", async () => {
      await layer.evaluate((el) => {
        (el as HTMLElement & { __kept?: boolean }).__kept = true;
      });
      await d.button("continue").click();
      await expect(main).toHaveAttribute("data-moment", "grey-stair.02");
      await expect(board.locator(`${LAYER} [data-moment-caption]`)).toContainText(
        "At the top, a door",
      );
      const cut = await layer.evaluate((el) => ({
        kept: (el as HTMLElement & { __kept?: boolean }).__kept === true,
        running: el
          .getAnimations()
          .filter(
            (a) => (a.effect as KeyframeEffect | null)?.target === el && a.playState === "running",
          ).length,
        phase: el.getAttribute("data-visual-phase"),
      }));
      expect(cut).toEqual({ kept: true, running: 0, phase: "in" });
      await expect(
        board.locator(`${LAYER} [data-camera-still] img[data-camera-track="grey-stair.02"]`),
      ).toBeVisible();
    });

    await test.step("the Keeper plays in the layer and fits", async () => {
      await d.button("continue").click();
      await expect(main).toHaveAttribute("data-moment", "grey-stair.03");
      await board.evaluate(() => {
        for (const audio of document.querySelectorAll("audio")) audio.pause();
      });
      await expect(board.locator(`${LAYER} [data-keeper-plate]`)).toHaveCount(1);
      for (const key of ["1024x594", "1180x820", "1920x1080"]) {
        const [w, h] = key.split("x").map(Number);
        await board.setViewportSize({ width: w as number, height: h as number });
        await board.waitForTimeout(300);
        await expect(board.getByRole("img", { name: "The Keeper" })).toBeInViewport({ ratio: 1 });
        await expect(board.locator("[data-board-caption]")).toBeInViewport({ ratio: 1 });
      }
      await shot(board, "visual-keeper-1920x1080");
    });
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await host.close();
  }
});

test("under reduced motion the visual only fades: no zoom, and the camera holds its frame", async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "the Story board runs on the Mac (Chromium)");
  test.setTimeout(120_000);
  const { baseURL, host } = await startAcceptanceHost(testInfo);
  const contexts: BrowserContext[] = [];
  try {
    const { board, d } = await openBoardAtFirstMoment(
      browser,
      baseURL,
      host.joinCode,
      contexts,
      "reduce",
    );
    const main = board.locator("main");
    const layer = board.locator(LAYER);
    await expect(main).toHaveAttribute("data-board-layer", "visual");
    const fade = await layerAnimation(board);
    expect(fade?.name).toBe("bt-fade-in");
    expect(fade?.transformKeyframes, "no zoom keyframes").toBe(0);
    expect(fade?.duration).toBeLessThanOrEqual(300);
    for (const sample of fade?.samples ?? []) expect(sample.transform).toBe("none");
    assertLetterboxed(await measureVisual(board), "1180x820");

    await d.button("continue").click();
    await expect(main).toHaveAttribute("data-board-layer", "waiting");
    const out = await layer
      .evaluate((el) => ({
        name: getComputedStyle(el).animationName,
        transform: getComputedStyle(el).transform,
      }))
      .catch(() => null);
    if (out) expect(out).toEqual({ name: "bt-fade-out", transform: "none" });
    await expect(layer).toHaveCount(0, { timeout: 2000 });

    await d.button("continue").click();
    await d.button("continue").click();
    await expect(main).toHaveAttribute("data-moment", "grey-stair.01");
    const img = board.locator(`${LAYER} [data-camera-still] img`);
    await expect(img).toHaveAttribute("data-camera-reduced", "true");
    const first = await measureVisual(board);
    await board.waitForTimeout(1500);
    const later = await measureVisual(board);
    expect(later.transform, "reduced motion holds the camera's last frame").toBe(first.transform);
    assertLetterboxed(later, "1180x820");
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await host.close();
  }
});
