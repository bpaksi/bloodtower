import { expect, type Page, test } from "@playwright/test";
import {
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";
import { copyToE2eArtifacts } from "./support/e2e-artifacts.ts";

const HEROES = ["hero-a", "hero-b", "hero-c", "hero-d", "hero-e", "hero-f"] as const;
const PARTY = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const VIEWPORTS = [
  { width: 1920, height: 1080, label: "1920x1080" },
  { width: 3840, height: 2160, label: "3840x2160" },
] as const;

const FIXTURE_LINES = Array.from(
  { length: 12 },
  (_, index) =>
    `Setup line ${index + 1}. Lay the kingdoms edge to edge, sort every hero, foe, and skull, and leave the drums where the card shows them so this line stays whole.`,
);

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

type Gap = {
  screen: string;
  viewport: string;
  frames: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
  font: number;
  width: number;
  height: number;
  areaRatio: number;
};

const readGaps = (page: Page) =>
  page.evaluate(() => {
    const board = document.querySelector("main.bt-board");
    if (!(board instanceof HTMLElement)) return null;
    const frames = [...board.querySelectorAll<HTMLElement>(".bt-dialog-frame")];
    const boardRect = board.getBoundingClientRect();
    const scrolling = document.scrollingElement;
    const textCuts: string[] = [];
    const scrollers: string[] = [];
    for (const frame of frames) {
      for (const el of frame.querySelectorAll<HTMLElement>("*")) {
        const overflow = getComputedStyle(el).overflowY;
        if (overflow === "auto" || overflow === "scroll") {
          scrollers.push(`${el.tagName}.${el.className}`);
        }
        const own = [...el.childNodes].some(
          (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim().length > 0,
        );
        if (!own || el.hidden) continue;
        if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) {
          textCuts.push(
            `${el.tagName}.${el.className} ${el.scrollWidth}/${el.clientWidth} ${el.scrollHeight}/${el.clientHeight}`,
          );
        }
      }
    }
    return {
      screen: board.getAttribute("data-screen"),
      step: board.getAttribute("data-setup-step"),
      background: getComputedStyle(board).backgroundImage,
      buttons: board.querySelectorAll("button").length,
      pageButtons: document.querySelectorAll("button").length,
      scrollHeight: scrolling?.scrollHeight ?? 0,
      innerHeight: window.innerHeight,
      frames: frames.map((frame) => {
        const rect = frame.getBoundingClientRect();
        return {
          top: rect.top - boardRect.top,
          bottom: boardRect.bottom - rect.bottom,
          left: rect.left - boardRect.left,
          right: boardRect.right - rect.right,
          font: Number.parseFloat(getComputedStyle(frame).fontSize),
          width: rect.width,
          height: rect.height,
          area: rect.width * rect.height,
        };
      }),
      board: { width: boardRect.width, height: boardRect.height },
      textCuts,
      scrollers,
    };
  });

const settle = async (board: Page) => {
  await board.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  await expect
    .poll(async () => board.locator(".bt-dialog-frame").first().getAttribute("data-fit-ready"), {
      timeout: 10_000,
    })
    .toBe("true");
};

test("every board dialog keeps the DEC-705 border", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The TV sizes are set on the board page.");
  test.setTimeout(240_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-dialog-border" });
  const boardContext = await browser.newContext({
    baseURL: session.baseURL,
    viewport: { width: 1920, height: 1080 },
  });
  const deviceContext = await browser.newContext({
    baseURL: session.baseURL,
    viewport: { width: 820, height: 1180 },
    hasTouch: true,
  });
  const measured: Gap[] = [];
  const shot = async (board: Page, name: string) => {
    const dest = testInfo.outputPath(`${name}.png`);
    await board.screenshot({ path: dest, fullPage: false });
    copyToE2eArtifacts(testInfo, dest, `${name}.png`);
  };

  try {
    const board = await boardContext.newPage();
    const device = await deviceContext.newPage();
    await installSessionSocketHook(device);
    await board.goto("/board");
    await device.goto(`/join?code=${session.host.joinCode}`);
    await expect(board.locator("main.bt-board")).toHaveAttribute("data-screen", "splash");
    await expect(device.locator("main.bt-device")).toHaveAttribute("data-screen", "splash");

    const measure = async (screen: string) => {
      for (const viewport of VIEWPORTS) {
        await board.setViewportSize({ width: viewport.width, height: viewport.height });
        await settle(board);
        const geo = await readGaps(board);
        expect(geo, screen).not.toBeNull();
        if (!geo) return;
        expect(
          geo.frames.length,
          `${screen} ${viewport.label}: at least one dialog`,
        ).toBeGreaterThan(0);
        expect(geo.scrollers, `${screen} ${viewport.label}: no dialog scrollbar`).toEqual([]);
        expect(geo.textCuts, `${screen} ${viewport.label}: no clipped text`).toEqual([]);
        expect(
          geo.scrollHeight,
          `${screen} ${viewport.label}: the page does not scroll`,
        ).toBeLessThanOrEqual(geo.innerHeight + 1);
        expect(geo.background, `${screen}: landing painting on the board`).toContain(
          "/landing/hero.webp",
        );
        const boardArea = geo.board.width * geo.board.height;
        for (const frame of geo.frames) {
          expect(frame.top, `${screen} ${viewport.label}: top gap`).toBeGreaterThanOrEqual(
            geo.board.height * 0.05 - 1,
          );
          expect(frame.bottom, `${screen} ${viewport.label}: bottom gap`).toBeGreaterThanOrEqual(
            geo.board.height * 0.05 - 1,
          );
          expect(frame.left, `${screen} ${viewport.label}: left gap`).toBeGreaterThanOrEqual(
            geo.board.width * 0.05 - 1,
          );
          expect(frame.right, `${screen} ${viewport.label}: right gap`).toBeGreaterThanOrEqual(
            geo.board.width * 0.05 - 1,
          );
          measured.push({
            screen,
            viewport: viewport.label,
            frames: geo.frames.length,
            top: frame.top,
            bottom: frame.bottom,
            left: frame.left,
            right: frame.right,
            font: frame.font,
            width: frame.width,
            height: frame.height,
            areaRatio: frame.area / boardArea,
          });
        }
        if (screen === "tower-connect" || screen === "claim-heroes" || screen === "tower-quiet") {
          await shot(board, `${screen}-${viewport.label}`);
        }
        if (screen === "tower-quiet" && viewport.label === "1920x1080") {
          expect(geo.frames[0]?.area, "the painting shows around the dialog").toBeLessThan(
            boardArea * 0.81,
          );
          expect(geo.buttons, "the board has no buttons").toBe(0);
          expect(geo.pageButtons, "the board page has no buttons").toBe(0);
        }
      }
    };

    await measure("splash");
    await clickAct(device, "continue", "splash-play");
    await expect(board.locator("main")).toHaveAttribute("data-screen", "pick-story");
    await measure("pick-story");
    await clickAct(device, "continue", "continue-pick-story-test");
    await expect(board.locator("main")).toHaveAttribute("data-screen", "game-settings");
    await measure("game-settings");
    await clickAct(device, "continue", "continue-game-settings");
    await expect(board.locator("main")).toHaveAttribute("data-screen", "tower-connect");
    await measure("tower-connect");
    await device.locator('button[data-action="play-without-tower"]').click();
    await expect(board.locator("main")).toHaveAttribute("data-screen", "claim-heroes");
    await expect(board.locator("[data-hero]")).toHaveCount(6);
    for (const heroId of HEROES) {
      await expect(board.locator(`[data-hero="${heroId}"]`)).toBeVisible();
    }
    await holdHeroesFromTest(device, [...PARTY]);
    await measure("claim-heroes");
    await clickAct(device, "continue", "continue-claim-heroes");

    const steps: string[] = [];
    for (let guard = 0; guard < 6; guard += 1) {
      await expect(board.locator("main")).toHaveAttribute("data-screen", "setup");
      const step = (await board.locator("main").getAttribute("data-setup-step")) ?? "setup";
      steps.push(step);
      await measure(`setup:${step}`);
      const prompt = device.locator(
        'button[data-prompt-id^="continue-setup-"][data-action-id="continue"]',
      );
      await expect(prompt).toBeEnabled();
      await prompt.click();
      await expect(board.locator("main")).not.toHaveAttribute("data-setup-step", step);
      const next = await board.locator("main").getAttribute("data-screen");
      if (next !== "setup") break;
    }
    expect(steps, "the base board setup dialog has three steps").toEqual([
      "seals-and-skulls",
      "lay-out-board",
      "place-heroes",
    ]);

    await expect(board.locator("main")).toHaveAttribute("data-screen", "begin");
    await measure("begin");
    await clickAct(device, "continue", "continue-begin");

    for (let guard = 0; guard < 6; guard += 1) {
      const moment = await board.locator("main").getAttribute("data-moment");
      if (!moment) break;
      await clickAct(device, "continue");
    }
    await expect(board.locator("[data-play-waiting]")).toBeVisible({ timeout: 20_000 });
    await measure("play-waiting");

    await device.close();
    await expect(board.locator("main")).toHaveAttribute("data-screen", "pause", {
      timeout: 20_000,
    });
    await expect(board.locator("[data-tower-quiet]")).toBeVisible();
    await measure("tower-quiet");

    const again = await deviceContext.newPage();
    await installSessionSocketHook(again);
    await again.goto(`/join?code=${session.host.joinCode}`);
    await expect(again.locator('button[data-action-id="quit-story"]')).toBeVisible({
      timeout: 20_000,
    });
    await again.locator('button[data-action-id="quit-story"]').click();
    await expect(board.locator("main")).toHaveAttribute("data-screen", "session");
    await measure("session");

    await board.setViewportSize({ width: 1920, height: 1080 });
    await board.evaluate((lines) => {
      window.dispatchEvent(new CustomEvent("bt-dialog-fixture", { detail: { lines, art: 600 } }));
    }, FIXTURE_LINES);
    await expect
      .poll(async () =>
        board.evaluate(() => {
          const frame = document.querySelector(".bt-dialog-frame");
          const art = frame?.querySelector("[data-dialog-art]");
          if (!(art instanceof HTMLImageElement)) return null;
          return {
            ready: frame?.getAttribute("data-fit-ready"),
            natural: art.naturalHeight,
            shown: Math.round(art.getBoundingClientRect().height),
            hidden: frame?.querySelectorAll("[data-dialog-line][data-fit-hidden]").length ?? 0,
            lines: [...(frame?.querySelectorAll("[data-dialog-line]") ?? [])].map((el) => ({
              text: el.textContent ?? "",
              hidden: el.hasAttribute("data-fit-hidden"),
              cut:
                !el.hasAttribute("data-fit-hidden") &&
                (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1),
            })),
          };
        }),
      )
      .toMatchObject({ ready: "true", natural: 600 });
    const fitted = await board.evaluate(() => {
      const frame = document.querySelector(".bt-dialog-frame");
      const art = frame?.querySelector("[data-dialog-art]");
      if (!(art instanceof HTMLImageElement) || !frame) return null;
      const scrolling = document.scrollingElement;
      return {
        natural: art.naturalHeight,
        shown: art.getBoundingClientRect().height,
        hidden: [...frame.querySelectorAll("[data-dialog-line][data-fit-hidden]")].map(
          (el) => el.textContent ?? "",
        ),
        shownLines: [...frame.querySelectorAll("[data-dialog-line]:not([data-fit-hidden])")].map(
          (el) => ({
            text: el.textContent ?? "",
            cut: el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1,
          }),
        ),
        scroll: (scrolling?.scrollHeight ?? 0) <= window.innerHeight + 1,
      };
    });
    expect(fitted).not.toBeNull();
    if (!fitted) return;
    expect(fitted.natural, "the fixture art is 600 px intrinsic").toBe(600);
    expect(fitted.shown, "art shrinks before any line is removed").toBeLessThan(fitted.natural);
    expect(fitted.hidden.length, "lines are removed once the art is small").toBeGreaterThan(0);
    expect(fitted.scroll, "the fixture does not scroll the board").toBe(true);
    for (const line of fitted.shownLines) {
      expect(FIXTURE_LINES, "a shown line is a whole fixture line").toContain(line.text);
      expect(line.cut, "a shown line is not clipped").toBe(false);
    }
    for (const line of fitted.hidden) {
      expect(FIXTURE_LINES, "a removed line is a whole fixture line").toContain(line);
    }
    await measure("fixture");

    const screens = [...new Set(measured.map((row) => row.screen))];
    expect(screens.length, screens.join(", ")).toBeGreaterThanOrEqual(10);
    for (const viewport of VIEWPORTS) {
      const names = measured
        .filter((row) => row.viewport === viewport.label)
        .map((row) => row.screen);
      for (const screen of [
        "splash",
        "pick-story",
        "game-settings",
        "tower-connect",
        "claim-heroes",
        "setup:seals-and-skulls",
        "setup:lay-out-board",
        "setup:place-heroes",
        "begin",
        "play-waiting",
        "tower-quiet",
        "session",
      ]) {
        expect(names, `${viewport.label} measured ${screen}`).toContain(screen);
      }
    }

    const fontAt = (screen: string, viewport: string) =>
      measured.find((row) => row.screen === screen && row.viewport === viewport)?.font;
    const widthAt = (screen: string, viewport: string) =>
      measured.find((row) => row.screen === screen && row.viewport === viewport)?.width;
    for (const screen of ["tower-connect", "claim-heroes"]) {
      const small = fontAt(screen, "1920x1080");
      const large = fontAt(screen, "3840x2160");
      expect(small, `${screen} font at 1080p`).toBeGreaterThan(0);
      expect(large, `${screen} font at 4K`).toBeGreaterThan(0);
      if (small == null || large == null) continue;
      expect(Math.abs(large / small - 2), `${screen} font doubles at 4K`).toBeLessThanOrEqual(0.05);
      const narrow = widthAt(screen, "1920x1080");
      const wide = widthAt(screen, "3840x2160");
      expect(narrow && wide ? wide / narrow : 0, `${screen} box grows at 4K`).toBeGreaterThan(1.5);
    }
  } finally {
    await boardContext.close().catch(() => undefined);
    await deviceContext.close().catch(() => undefined);
    await session.host.close().catch(() => undefined);
  }
});
