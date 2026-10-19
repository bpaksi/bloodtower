import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { startAcceptanceHost, waitForBoardAnimationsSettled } from "./support/acceptance.ts";
import { copyToE2eArtifacts } from "./support/e2e-artifacts.ts";

// Visuals steps 3 to 5: before play the board is one centred dialog in the Illusionist frame
// over the landing painting, the next prompt under it, and "Tonight's game" plus the join QR in a
// right column (Q3 (a)). Measured at the laptop, iPad-landscape and TV sizes.

const VIEWPORTS = [
  { width: 1024, height: 594 },
  { width: 1180, height: 820 },
  // Playwright has no 1920x1080 project; the TV size is set here.
  { width: 1920, height: 1080 },
] as const;

const device = (page: Page) => ({
  button: (action: string) => page.locator(`button[data-action="${action}"]`),
});

type Box = { left: number; right: number; top: number; bottom: number };

/** The shell at the current size: frame, prompt, column and every summary row sit on screen. */
const assertShellFits = async (page: Page, label: string) => {
  const main = page.locator("main");
  await expect(main).toHaveAttribute("data-board-mode", "startup");
  const frame = page.locator('[data-illusionist-asset="dialog-frame"]');
  await expect(frame).toHaveCount(1);
  await expect(page.locator(".bt-hunters")).toHaveCount(0);
  const geo = await page.evaluate(() => {
    const box = (el: Element | null): Box | null => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    };
    const frameEl = document.querySelector(
      '[data-illusionist-asset="dialog-frame"]',
    ) as HTMLElement;
    const cs = getComputedStyle(frameEl);
    const rows = [...document.querySelectorAll("[data-summary-item]")];
    return {
      scrollX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      scrollY: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      viewW: window.innerWidth,
      viewH: window.innerHeight,
      frame: box(frameEl),
      frameClipped: frameEl.scrollHeight - frameEl.clientHeight,
      borderImage: cs.borderImageSource,
      band: box(document.querySelector("[data-next-band]")),
      side: box(document.querySelector(".bt-startup-side")),
      qr: box(document.querySelector(".bt-startup-side .bt-qr")),
      summary: box(document.querySelector(".bt-summary")),
      rows: rows.map((row) => box(row)),
      rowFonts: rows.map((row) =>
        Number.parseFloat(getComputedStyle(row.querySelector("dd") as Element).fontSize),
      ),
      carousel: box(document.querySelector(".bt-carousel")),
      focus: box(document.querySelector(".bt-carousel-focus")),
      cover: box(document.querySelector(".bt-carousel-focus .bt-carousel-plate")),
      peeks: [...document.querySelectorAll(".bt-carousel-peek")].map((el) => box(el)),
    };
  });
  const inView = (b: Box | null) =>
    b !== null &&
    b.left >= -1 &&
    b.top >= -1 &&
    b.right <= geo.viewW + 1 &&
    b.bottom <= geo.viewH + 1;
  const inside = (b: Box | null, outer: Box | null) =>
    b !== null &&
    outer !== null &&
    b.left >= outer.left - 1 &&
    b.right <= outer.right + 1 &&
    b.top >= outer.top - 1 &&
    b.bottom <= outer.bottom + 1;
  expect(geo.scrollX, `${label}: no horizontal scroll`).toBeLessThanOrEqual(0);
  expect(geo.scrollY, `${label}: no vertical scroll`).toBeLessThanOrEqual(0);
  expect(geo.borderImage, `${label}: the frame is the Illusionist SVG`).toContain(
    "/board/dialog-frame/dialog-frame.svg",
  );
  expect(inView(geo.frame), `${label}: dialog on screen`).toBe(true);
  expect(geo.frameClipped, `${label}: dialog content not cut off`).toBeLessThanOrEqual(1);
  expect(inView(geo.band), `${label}: next prompt on screen`).toBe(true);
  expect(geo.band?.top ?? 0, `${label}: next prompt under the dialog`).toBeGreaterThanOrEqual(
    (geo.frame?.bottom ?? 0) - 1,
  );
  expect(inView(geo.side), `${label}: right column on screen`).toBe(true);
  expect(geo.side?.left ?? 0, `${label}: column right of the dialog`).toBeGreaterThanOrEqual(
    (geo.frame?.right ?? 0) - 1,
  );
  expect(inView(geo.qr), `${label}: join QR on screen`).toBe(true);
  for (const [index, row] of geo.rows.entries()) {
    expect(inView(row), `${label}: summary row ${index} on screen`).toBe(true);
    expect(inside(row, geo.summary), `${label}: summary row ${index} not cut off`).toBe(true);
    const rowH = (row?.bottom ?? 0) - (row?.top ?? 0);
    expect(rowH, `${label}: summary row ${index} at least one line high`).toBeGreaterThanOrEqual(
      28,
    );
    expect(geo.rowFonts[index], `${label}: summary row ${index} TV type`).toBeGreaterThanOrEqual(
      28,
    );
  }
  if (geo.carousel) {
    expect(inside(geo.carousel, geo.frame), `${label}: carousel inside the dialog`).toBe(true);
    expect(inside(geo.focus, geo.frame), `${label}: focused card inside the dialog`).toBe(true);
    for (const peek of geo.peeks) {
      expect(inside(peek, geo.frame), `${label}: peek inside the dialog`).toBe(true);
      const peekW = (peek?.right ?? 0) - (peek?.left ?? 0);
      const focusW = (geo.focus?.right ?? 0) - (geo.focus?.left ?? 0);
      expect(peekW, `${label}: peek smaller than the focus`).toBeLessThan(focusW);
    }
    if (geo.cover) {
      const w = geo.cover.right - geo.cover.left;
      const h = geo.cover.bottom - geo.cover.top;
      expect(w / h, `${label}: cover plate is 16:9`).toBeGreaterThan(1.6);
      expect(w / h).toBeLessThan(1.95);
    }
  }
};

test("start-up shell: one framed dialog, summary column, at laptop, iPad and TV sizes", async ({
  browser,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "Board shots are captured on Chromium.");
  test.setTimeout(120_000);
  const { baseURL, host } = await startAcceptanceHost(testInfo);
  const contexts: BrowserContext[] = [];
  const shoot = async (page: Page, name: string) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await waitForBoardAnimationsSettled(page);
      const key = `${viewport.width}x${viewport.height}`;
      await assertShellFits(page, `${name} ${key}`);
      const dest = testInfo.outputPath(`board-${name}-${key}.png`);
      await page.screenshot({ path: dest, fullPage: false });
      copyToE2eArtifacts(testInfo, dest, `board-${name}-${key}.png`);
    }
  };

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

    await test.step("Pick Game: the carousel in the dialog, the other pack peeking once", async () => {
      await expect(board.locator(".bt-dialog-frame .bt-carousel")).toBeVisible();
      await expect(board.locator("[data-story-peek]")).toHaveCount(1);
      await expect(board.locator('[data-carousel-side="next"]')).toHaveAttribute(
        "data-story-peek",
        "dracula",
      );
      await expect(board.locator(".bt-carousel-focus")).toContainText("4 hunters");
      await expect(board.locator("button, input, textarea, select, a, [onclick]")).toHaveCount(0);
      // Devices show no images (R3-UI-51).
      await expect(pad.locator("img")).toHaveCount(0);
      await shoot(board, "pick-story");
    });

    await test.step("Reduced motion: a carousel step does not animate; a new dialog only fades", async () => {
      await board.emulateMedia({ reducedMotion: "reduce" });
      const carouselAnimations = () =>
        board.evaluate(
          () =>
            [...document.querySelectorAll(".bt-carousel, .bt-carousel *")].flatMap((el) =>
              el.getAnimations(),
            ).length,
        );
      await d.button("story-next").click();
      await expect(board.locator(".bt-carousel-focus h2")).toHaveText("The Count of Vellmoor");
      expect(await carouselAnimations(), "no slide on a carousel step").toBe(0);
      await d.button("story-next").click();
      await expect(board.locator(".bt-carousel-focus h2")).toHaveText("Proving ground");
      expect(await carouselAnimations()).toBe(0);
    });

    await test.step("Game settings in the dialog", async () => {
      await d.button("continue").click();
      await expect(board.locator("main")).toHaveAttribute("data-screen", "game-settings");
      // Under reduced motion the new dialog fades in (opacity only, at most 300 ms), no ink-in.
      const motion = await board.locator(".bt-dialog-frame").evaluate((el) => {
        const cs = getComputedStyle(el);
        return { name: cs.animationName, duration: Number.parseFloat(cs.animationDuration) };
      });
      expect(motion.name).toBe("bt-fade-in");
      expect(motion.duration).toBeLessThanOrEqual(0.3);
      await expect(board.locator(".bt-dialog-frame [data-setting]")).toHaveCount(2);
      await expect(board.locator('[data-summary-item="game"]')).toContainText("Proving ground");
      await shoot(board, "game-settings");
    });

    await test.step("Claim Hunters with the summary filled after Game settings and Connect Tower", async () => {
      await d.button("continue").click();
      await expect(pad.locator("main")).toHaveAttribute("data-screen", "tower-connect");
      await d.button("play-without-tower").click();
      await expect(pad.locator("main")).toHaveAttribute("data-screen", "tower-volume-test");
      await d.button("continue").click();
      await expect(board.locator("main")).toHaveAttribute("data-screen", "party-join");
      const summary = (item: string) => board.locator(`[data-summary-item="${item}"]`);
      await expect(summary("game")).toContainText("Proving ground");
      await expect(summary("settings")).toContainText("Length:");
      await expect(summary("tower")).toContainText("Playing without tower");
      await d.button("take-all").click();
      await expect(board.getByText("4 of 4 hunters claimed")).toBeVisible();
      await expect(summary("hunters")).toContainText("Agnes:");
      await expect(summary("setup")).toContainText("not chosen yet");
      await expect(board.locator(".bt-dialog-frame .bt-cart")).toHaveCount(4);
      await expect(pad.locator("img")).toHaveCount(0);
      await shoot(board, "party-join");
    });
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
  }
});
