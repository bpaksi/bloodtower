import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import {
  doneEverySetupStep,
  startAcceptanceHost,
  waitForBoardAnimationsSettled,
} from "./support/acceptance.ts";
import { copyToE2eArtifacts } from "./support/e2e-artifacts.ts";

// Visuals step 2: slow, irregular candle flicker in the landing painting's lit windows and
// lanterns (R3-UI-02), four layers inside .bt-board-backdrop, stepped, in the painting only.

const VIEWPORTS = [
  { width: 1024, height: 594 },
  { width: 1180, height: 820 },
  // Playwright has no 1920x1080 project; the TV size is set here.
  { width: 1920, height: 1080 },
] as const;

const device = (page: Page) => ({
  button: (action: string) => page.locator(`button[data-action="${action}"]`),
});

const GLOWS = ".bt-board-backdrop > .bt-window-glow";

/** Four layers a to d, each stepped and registered with the backdrop at the current size. */
const assertGlowLayers = async (page: Page) => {
  await expect(page.locator(".bt-board-backdrop")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(GLOWS)).toHaveCount(4);
  const layers = await page.evaluate((sel) => {
    const backdrop = document.querySelector(".bt-board-backdrop") as HTMLElement;
    const b = backdrop.getBoundingClientRect();
    return [...document.querySelectorAll<HTMLElement>(sel)].map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        group: el.dataset.group,
        aria: el.getAttribute("aria-hidden"),
        rect: [r.left - b.left, r.top - b.top, r.width - b.width, r.height - b.height],
        size: cs.backgroundSize,
        position: cs.backgroundPosition,
        blend: cs.mixBlendMode,
        name: cs.animationName,
        timing: cs.animationTimingFunction,
        duration: cs.animationDuration,
        delay: cs.animationDelay,
        mask: getComputedStyle(backdrop).getPropertyValue("--bt-window-mask").trim(),
      };
    });
  }, GLOWS);
  expect(layers.map((l) => l.group)).toEqual(["a", "b", "c", "d"]);
  expect(new Set(layers.map((l) => l.duration)).size, "distinct durations").toBe(4);
  for (const l of layers) {
    expect(l.aria).toBe("true");
    expect(l.rect, `${l.group} fills the backdrop`).toEqual([0, 0, 0, 0]);
    expect(l.size).toBe("cover");
    expect(l.position).toMatch(/^(0px|0%) (0px|0%)$/);
    expect(l.blend).toBe("screen");
    expect(l.name).toBe("bt-window-flicker");
    // Chrome writes steps(1, end) as steps(1); both are one jump at the end of the step.
    expect(l.timing).toMatch(/^steps\(1(, end)?\)$/);
    expect(l.mask).toBe('url("/landing/window-mask/window-mask.png")');
  }
};

/** The glow PNGs and the mask the page names are all served. */
const assertAssetsServed = async (page: Page, baseURL: string) => {
  const urls = await page.evaluate((sel) => {
    const mask = getComputedStyle(document.querySelector(".bt-board-backdrop") as Element)
      .getPropertyValue("--bt-window-mask")
      .trim();
    const glows = [...document.querySelectorAll<HTMLElement>(sel)].map(
      (el) => getComputedStyle(el).backgroundImage,
    );
    return [mask, ...glows].map((v) => /url\("?([^")]+)"?\)/.exec(v)?.[1] ?? "");
  }, GLOWS);
  expect(urls).toHaveLength(5);
  for (const raw of urls) {
    // Computed background images come back absolute; the mask custom property stays as written.
    const url = new URL(raw, baseURL).pathname;
    expect(url, "a url").toMatch(/^\/landing\/window-mask\/.+\.png$/);
    const res = await page.request.get(new URL(url, baseURL).href);
    expect(res.status(), url).toBe(200);
    expect(res.headers()["content-type"], url).toContain("image/png");
  }
};

/** Holds every glow layer at the start of its cycle so a shot is the same each run. */
const pauseGlow = (page: Page) =>
  page.evaluate((sel) => {
    for (const el of document.querySelectorAll(sel)) {
      for (const a of el.getAnimations()) {
        a.pause();
        a.currentTime = 0;
      }
    }
  }, GLOWS);

/** The element on top at the middle of `target` is inside `target`: nothing glows over it. */
const assertOnTopAtCentre = async (page: Page, selector: string) => {
  const top = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return "missing";
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return hit && el.contains(hit) ? "inside" : (hit?.className?.toString() ?? "none");
  }, selector);
  expect(top, `${selector} is on top at its centre`).toBe("inside");
};

test("the backdrop flickers in four stepped layers under every dialog and layer", async ({
  browser,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "Board shots are captured on Chromium.");
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo);
  const { baseURL, host } = session;
  const contexts: BrowserContext[] = [];
  try {
    const boardContext = await browser.newContext({ baseURL, viewport: VIEWPORTS[1] });
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
    await pad.goto(`${baseURL}/join?code=${host.joinCode}`);
    await expect(pad.locator("main")).toHaveAttribute("data-screen", "pick-story");

    await test.step("Start-up: four layers, assets served, dialog on top, shots", async () => {
      await waitForBoardAnimationsSettled(board);
      await assertGlowLayers(board);
      await assertAssetsServed(board, baseURL);
      await assertOnTopAtCentre(board, ".bt-dialog-frame");
      // The device screens carry no backdrop or images (R3-UI-51).
      await expect(pad.locator(".bt-board-backdrop, .bt-window-glow, img")).toHaveCount(0);
      // The flicker runs: every layer has a running, infinite animation.
      const running = await board.evaluate((sel) => {
        return [...document.querySelectorAll(sel)].map((el) =>
          el
            .getAnimations()
            .some(
              (a) => a.playState === "running" && a.effect?.getTiming().iterations === Infinity,
            ),
        );
      }, GLOWS);
      expect(running).toEqual([true, true, true, true]);
      for (const viewport of VIEWPORTS) {
        await board.setViewportSize(viewport);
        await assertGlowLayers(board);
        await pauseGlow(board);
        const key = `${viewport.width}x${viewport.height}`;
        const dest = testInfo.outputPath(`backdrop-startup-${key}.png`);
        await board.screenshot({ path: dest, fullPage: false });
        copyToE2eArtifacts(testInfo, dest, `backdrop-startup-${key}.png`);
      }
      await board.setViewportSize(VIEWPORTS[1]);
    });

    await test.step("Reduced motion: no animation, a steady glow", async () => {
      await board.emulateMedia({ reducedMotion: "reduce" });
      const held = await board.evaluate((sel) => {
        return [...document.querySelectorAll(sel)].map((el) => {
          const cs = getComputedStyle(el);
          return {
            name: cs.animationName,
            opacity: Number.parseFloat(cs.opacity),
            animations: el.getAnimations().length,
          };
        });
      }, GLOWS);
      expect(held).toHaveLength(4);
      for (const h of held) {
        expect(h.name).toBe("none");
        expect(h.animations).toBe(0);
        expect(h.opacity).toBeCloseTo(0.9, 2);
      }
      await board.emulateMedia({ reducedMotion: "no-preference" });
    });

    await d.button("continue").click();
    await d.button("continue").click();
    await d.button("play-without-tower").click();
    await expect(pad.locator("main")).toHaveAttribute("data-screen", "tower-volume-test");
    await d.button("continue").click();
    await d.button("take-all").click();
    await d.button("continue").click();
    await doneEverySetupStep(pad);
    await d.button("begin").click();

    await test.step("Play: the layers are there and the visual layer covers them", async () => {
      await expect(board.locator("main")).toHaveAttribute("data-board-layer", "visual");
      await assertGlowLayers(board);
      await assertOnTopAtCentre(board, "[data-visual-layer]");
    });
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
  }
});
