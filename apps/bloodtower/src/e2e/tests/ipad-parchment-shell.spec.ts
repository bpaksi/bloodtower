import { type Browser, expect, type Page, type TestInfo, test } from "@playwright/test";
import {
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";

/**
 * #592: every iPad screen sits on one full parchment page with dark ink (DEC-233 theme B).
 * Before the fix the body was dark with four parchment corner windows cut from the move-map mock.
 * Screens: the join screen, the move map, and the C3/13 building menu, at 768x1024.
 */

const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const FOUR = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const CITADEL = "N-radiant-mountains";
const MIN_CONTRAST = 4.5;

const deviceMain = (page: Page) => page.locator("main.bt-device");

type Paint = {
  pageColor: string;
  texts: { text: string; color: string; ground: string; ratio: number }[];
  corners: { image: string; text: string }[];
};

/** Reads what the iPad page paints, and the ink of every visible line of text in the shell. */
const readPaint = (page: Page): Promise<Paint> =>
  page.evaluate(() => {
    const parse = (value: string) => {
      const m = value.match(/rgba?\(([^)]+)\)/);
      if (!m?.[1]) return null;
      const [r = 0, g = 0, b = 0, a = 1] = m[1].split(/[ ,/]+/).map(Number);
      return { r, g, b, a };
    };
    const lum = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const f = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const main = document.querySelector("main.bt-device") as HTMLElement;
    const groundOf = (node: Element) => {
      for (let el: Element | null = node; el; el = el.parentElement) {
        const c = parse(getComputedStyle(el).backgroundColor);
        if (c && c.a > 0.5) return c;
      }
      return { r: 20, g: 18, b: 15, a: 1 };
    };
    const texts: Paint["texts"] = [];
    const targets = main.querySelectorAll("h1, p, label, button, article, [data-building-option]");
    for (const el of targets) {
      const rect = el.getBoundingClientRect();
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());
      if (!own || rect.width === 0 || rect.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || Number(style.opacity) === 0) continue;
      const fg = parse(style.color);
      if (!fg) continue;
      const ground = groundOf(el);
      const [hi, lo] = [lum(fg), lum(ground)].sort((a, b) => b - a) as [number, number];
      texts.push({
        text: (el.textContent ?? "").trim().slice(0, 40),
        color: style.color,
        ground: `rgb(${ground.r}, ${ground.g}, ${ground.b})`,
        ratio: (hi + 0.05) / (lo + 0.05),
      });
    }
    const style = getComputedStyle(main);
    return {
      pageColor: style.backgroundColor,
      texts,
      corners: [...document.querySelectorAll("[data-ipad-corner]")].map((el) => ({
        image: getComputedStyle(el).backgroundImage,
        text: (el.textContent ?? "").trim(),
      })),
    };
  });

const expectParchmentShell = async (page: Page, shot: string) => {
  await expect(deviceMain(page)).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: test.info().outputPath(`${shot}.png`) });
  const paint = await readPaint(page);
  // The iPad page paints the theme B parchment, #e9d9b4 (same value as the board token; iPad pages do not load it).
  expect(paint.pageColor).toBe("rgb(233, 217, 180)");
  for (const corner of paint.corners) {
    expect(corner.image).not.toMatch(/move-map|\.jpg/);
    expect(corner.text).toBe("");
  }
  expect(paint.texts.length).toBeGreaterThan(0);
  for (const line of paint.texts) {
    expect(line.ratio, `"${line.text}" ${line.color} on ${line.ground}`).toBeGreaterThanOrEqual(
      MIN_CONTRAST,
    );
  }
  // Dark ink: the lead text is darker than the page.
  const lead = paint.texts[0];
  expect(lead?.color).not.toBe("rgb(244, 239, 230)");
};

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const startAtBuilding = async (browser: Browser, testInfo: TestInfo) => {
  const session = await startAcceptanceHost(testInfo, {
    seed: `ipad-shell~test-event:none~test-at:${CITADEL}`,
    lanHost: () => "192.0.2.10",
    seatTogether: true,
  });
  const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
  const pad = await context.newPage();
  const board = await context.newPage();
  await board.setViewportSize(BOARD_SIZE);
  await board.goto("/board");
  await pad.addInitScript(() => {
    const lock = {
      request: async () => ({
        released: false,
        release: async () => {},
        addEventListener: () => {},
      }),
    };
    Object.defineProperty(navigator, "wakeLock", { configurable: true, get: () => lock });
  });
  await installSessionSocketHook(pad);
  return { session, context, pad };
};

test.describe("#592 the iPad shell is one parchment page", () => {
  test.beforeEach(({ browserName: _browserName }, testInfo) => {
    test.skip(testInfo.project.name !== "ipad", "The shell is the iPad's.");
  });

  test("join screen, move map and building menu paint parchment with dark ink", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad } = await startAtBuilding(browser, testInfo);
    try {
      await pad.goto("/join");
      await expectParchmentShell(pad, "join");
      await pad.goto(`/join?code=${session.host.joinCode}`);
      await enterWithoutTower(pad);
      await clickAct(pad, "continue", "continue-pick-story-test");
      await pad.locator(`button[data-setting="party-size"][data-option="n-4"]`).click();
      await clickAct(pad, "continue", "continue-game-settings");
      await holdHeroesFromTest(pad, [...FOUR]);
      await clickAct(pad, "continue", "continue-claim-heroes");
      for (const id of SETUP_IDS) {
        await expect(deviceMain(pad)).toHaveAttribute("data-setup-step", id, { timeout: 20_000 });
        if (id === "starting-purse") await clickAct(pad, "spin", "spin-setup-starting-purse");
        await expectParchmentShell(pad, `setup-${id}`);
        await clickAct(pad, "continue", `continue-setup-${id}`);
      }
      await clickAct(pad, "continue", "continue-begin");
      for (const id of OPENING_IDS) {
        await clickAct(pad, "continue", `continue-opening-${id.replace(".", "-")}`);
      }
      await clickAct(pad, "continue");
      await expect(pad.locator("[data-move-map]")).toBeVisible({ timeout: 20_000 });
      await expectParchmentShell(pad, "move-map");
      await clickAct(pad, "enter");
      await expect(deviceMain(pad).locator("section[data-building]")).toBeVisible({
        timeout: 20_000,
      });
      await expectParchmentShell(pad, "building-menu");
    } finally {
      await context.close();
      await session.host.close();
    }
  });
});
