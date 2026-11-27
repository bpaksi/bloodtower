import { type Browser, expect, type Page, type TestInfo, test } from "@playwright/test";
import {
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";

/**
 * #592 / #594: every iPad screen sits on one full Theme B parchment page with dark ink,
 * local Cormorant/IM Fell fonts, chamfered double-rule buttons, bordered join inputs,
 * corner-clear toolbar rule, clear disabled states, unclipped move-map nodes, and
 * opacity-aware contrast verification at 768x1024 (phone out of 1.0 per DEC-958).
 */

const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const FOUR = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const CITADEL = "N-radiant-mountains";
const MIN_CONTRAST = 4.5;
const MIN_DISABLED_CONTRAST = 2.5;
const MIN_INPUT_BORDER_CONTRAST = 3;

const deviceMain = (page: Page) => page.locator("main.bt-device");

type PaintText = {
  text: string;
  color: string;
  ground: string;
  ratio: number;
  unblendedRatio: number;
  effectiveOpacity: number;
  disabled: boolean;
};

type PaintButton = {
  label: string;
  disabled: boolean;
  borderRadius: string;
  borderTopStyle: string;
  clipPath: string;
};

type PaintBar = {
  borderTopWidth: string;
  ruleLeft: number;
  ruleRight: number;
  blRight: number;
  brLeft: number;
  helpFontSize: number;
  back: {
    disabled: boolean;
    borderTopStyle: string;
    backgroundColor: string;
    opacity: number;
  } | null;
  replay: {
    disabled: boolean;
    borderTopStyle: string;
    backgroundColor: string;
    opacity: number;
  } | null;
};

type Paint = {
  pageColor: string;
  pageBgImage: string;
  grainToken: string;
  bodyFont: string;
  titleFonts: string[];
  labelFonts: string[];
  loadedFonts: string[];
  texts: PaintText[];
  buttons: PaintButton[];
  bar: PaintBar | null;
  corners: { image: string; text: string }[];
};

/**
 * Reads what the iPad page paints, with opacity-aware compositing through the full ancestor chain
 * so disabled controls and translucent layers are measured as actually rendered.
 */
const readPaint = (page: Page): Promise<Paint> =>
  page.evaluate(async () => {
    await document.fonts.ready;
    type Rgba = { r: number; g: number; b: number; a: number };
    const parse = (value: string): Rgba | null => {
      const m = value.match(/rgba?\(([^)]+)\)/);
      if (!m?.[1]) return null;
      const [r = 0, g = 0, b = 0, a = 1] = m[1].split(/[ ,/]+/).map(Number);
      return { r, g, b, a };
    };
    const sourceOver = (top: Rgba, bot: Rgba): Rgba => {
      const a = top.a + bot.a * (1 - top.a);
      if (a <= 0) return { r: 0, g: 0, b: 0, a: 0 };
      return {
        r: (top.r * top.a + bot.r * bot.a * (1 - top.a)) / a,
        g: (top.g * top.a + bot.g * bot.a * (1 - top.a)) / a,
        b: (top.b * top.a + bot.b * bot.a * (1 - top.a)) / a,
        a,
      };
    };
    const lum = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const f = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const contrast = (
      a: { r: number; g: number; b: number },
      b: { r: number; g: number; b: number },
    ) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
      return (hi + 0.05) / (lo + 0.05);
    };
    const BASE: Rgba = { r: 20, g: 18, b: 15, a: 1 };
    const ancestorsOf = (node: Element): Element[] => {
      const chain: Element[] = [];
      for (let el: Element | null = node; el; el = el.parentElement) chain.unshift(el);
      return chain;
    };
    const compositeText = (node: Element, fgColor: Rgba) => {
      const chain = ancestorsOf(node);
      const paintAt = (idx: number): { bg: Rgba; fg: Rgba } => {
        const el = chain[idx] as Element;
        const style = getComputedStyle(el);
        const ownBg = parse(style.backgroundColor) ?? { r: 0, g: 0, b: 0, a: 0 };
        const op = Number(style.opacity);
        const opacity = Number.isFinite(op) ? op : 1;
        if (idx === chain.length - 1) {
          const fg = sourceOver(fgColor, ownBg);
          return {
            bg: { ...ownBg, a: ownBg.a * opacity },
            fg: { ...fg, a: fg.a * opacity },
          };
        }
        const child = paintAt(idx + 1);
        const bg = sourceOver(child.bg, ownBg);
        const fg = sourceOver(child.fg, ownBg);
        return {
          bg: { ...bg, a: bg.a * opacity },
          fg: { ...fg, a: fg.a * opacity },
        };
      };
      const layered = paintAt(0);
      const ground = sourceOver(layered.bg, BASE);
      const ink = sourceOver(layered.fg, BASE);
      let effectiveOpacity = 1;
      for (const el of chain) {
        const op = Number(getComputedStyle(el).opacity);
        if (Number.isFinite(op)) effectiveOpacity *= op;
      }
      // Unblended ground (ignoring opacity) so tests can assert opacity compositing took effect.
      let unblendedGround = BASE;
      for (let i = chain.length - 1; i >= 0; i -= 1) {
        const c = parse(getComputedStyle(chain[i] as Element).backgroundColor);
        if (c && c.a > 0.5) {
          unblendedGround = c;
          break;
        }
      }
      return {
        ink,
        ground,
        effectiveOpacity,
        ratio: contrast(ink, ground),
        unblendedRatio: contrast(fgColor, unblendedGround),
      };
    };

    const main = document.querySelector("main.bt-device") as HTMLElement;
    const texts: PaintText[] = [];
    const targets = main.querySelectorAll(
      "h1, h2, p, label, button, span, article, [data-building-option]",
    );
    for (const el of targets) {
      const rect = el.getBoundingClientRect();
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());
      if (!own || rect.width <= 1 || rect.height <= 1) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden") continue;
      const fg = parse(style.color);
      if (!fg) continue;
      const comp = compositeText(el, fg);
      if (comp.effectiveOpacity <= 0) continue;
      const disabled = Boolean(el.closest(':disabled, [aria-disabled="true"]'));
      texts.push({
        text: (el.textContent ?? "").trim().slice(0, 40),
        color: `rgb(${Math.round(comp.ink.r)}, ${Math.round(comp.ink.g)}, ${Math.round(comp.ink.b)})`,
        ground: `rgb(${Math.round(comp.ground.r)}, ${Math.round(comp.ground.g)}, ${Math.round(comp.ground.b)})`,
        ratio: comp.ratio,
        unblendedRatio: comp.unblendedRatio,
        effectiveOpacity: comp.effectiveOpacity,
        disabled,
      });
    }

    const buttons: PaintButton[] = [];
    for (const el of main.querySelectorAll(".bt-primary, .bt-secondary, .bt-ghost")) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || Number(style.opacity) === 0) continue;
      buttons.push({
        label: (el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 32),
        disabled: el.matches(':disabled, [aria-disabled="true"]'),
        borderRadius: style.borderRadius,
        borderTopStyle: style.borderTopStyle,
        clipPath: style.clipPath,
      });
    }

    const titleFonts = [
      ...main.querySelectorAll("h1, h2:not(.bt-menu-dialog h2), .bt-primary, .bt-secondary"),
    ]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 1 && r.height > 1 && getComputedStyle(el).visibility !== "hidden";
      })
      .map((el) => getComputedStyle(el).fontFamily);

    const labelFonts = [
      ...main.querySelectorAll(
        ".bt-kicker, .bt-label, .bt-tower-up, .bt-bottom-bar .bt-ghost:not(.bt-help)",
      ),
    ]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 1 && r.height > 1 && getComputedStyle(el).visibility !== "hidden";
      })
      .map((el) => getComputedStyle(el).fontFamily);

    const barEl = main.querySelector("[data-bottom-bar]");
    let bar: PaintBar | null = null;
    if (barEl) {
      const barRect = barEl.getBoundingClientRect();
      const barStyle = getComputedStyle(barEl);
      const beforeStyle = getComputedStyle(barEl, "::before");
      const bl = document.querySelector('[data-ipad-corner="bl"]')?.getBoundingClientRect();
      const br = document.querySelector('[data-ipad-corner="br"]')?.getBoundingClientRect();
      const helpEl = barEl.querySelector('[data-action="help"]');
      const readBarBtn = (selector: string) => {
        const btn = barEl.querySelector(selector);
        if (!btn) return null;
        const s = getComputedStyle(btn);
        return {
          disabled: btn.matches(':disabled, [aria-disabled="true"]'),
          borderTopStyle: s.borderTopStyle,
          backgroundColor: s.backgroundColor,
          opacity: Number(s.opacity),
        };
      };
      bar = {
        borderTopWidth: barStyle.borderTopWidth,
        ruleLeft: barRect.left + Number.parseFloat(beforeStyle.left || "0"),
        ruleRight: barRect.right - Number.parseFloat(beforeStyle.right || "0"),
        blRight: bl?.right ?? 0,
        brLeft: br?.left ?? window.innerWidth,
        helpFontSize: helpEl ? Number.parseFloat(getComputedStyle(helpEl).fontSize) : 0,
        back: readBarBtn('[data-action="back"]'),
        replay: readBarBtn('[data-action="replay"]'),
      };
    }

    const style = getComputedStyle(main);
    return {
      pageColor: style.backgroundColor,
      pageBgImage: style.backgroundImage,
      grainToken: style.getPropertyValue("--bt-grain").trim(),
      bodyFont: style.fontFamily,
      titleFonts,
      labelFonts,
      loadedFonts: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family),
      texts,
      buttons,
      bar,
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
  // The iPad page paints Theme B parchment (#e9d9b4) with the SVG parchment grain (--bt-grain).
  expect(paint.pageColor).toBe("rgb(233, 217, 180)");
  expect(paint.grainToken).toContain("data:image/svg+xml");
  expect(paint.pageBgImage).toContain("data:image/svg+xml");
  // Local Theme B fonts render on iPad (Cormorant Garamond, Cormorant SC, IM Fell English SC).
  expect(paint.bodyFont).toMatch(/cormorant/i);
  expect(paint.titleFonts.length).toBeGreaterThan(0);
  for (const family of paint.titleFonts) expect(family).toMatch(/cormorant/i);
  expect(paint.labelFonts.length).toBeGreaterThan(0);
  for (const family of paint.labelFonts) expect(family).toMatch(/im.?fell/i);
  expect(paint.loadedFonts.some((f) => /cormorant/i.test(f))).toBe(true);
  expect(paint.loadedFonts.some((f) => /im.?fell/i.test(f))).toBe(true);
  for (const corner of paint.corners) {
    expect(corner.image).not.toMatch(/move-map|\.jpg/);
    expect(corner.text).toBe("");
  }
  // Chamfered double-rule buttons with square corners (border-radius: 0).
  expect(paint.buttons.length).toBeGreaterThan(0);
  for (const button of paint.buttons) {
    expect(button.borderRadius, `${button.label} border-radius`).toBe("0px");
    expect(button.clipPath, `${button.label} chamfer`).toMatch(/^polygon\(/);
    if (!button.disabled) {
      expect(button.borderTopStyle, `${button.label} double rule`).toBe("double");
    }
  }
  // Bottom bar: larger ? glyph, top rule clears both bottom corners, Replay disabled state clear.
  expect(paint.bar).not.toBeNull();
  if (paint.bar) {
    expect(paint.bar.helpFontSize).toBeGreaterThanOrEqual(28);
    expect(paint.bar.borderTopWidth).toBe("0px");
    expect(paint.bar.ruleLeft).toBeGreaterThanOrEqual(paint.bar.blRight - 1);
    expect(paint.bar.ruleRight).toBeLessThanOrEqual(paint.bar.brLeft + 1);
    expect(paint.bar.replay?.disabled).toBe(true);
    expect(paint.bar.replay?.borderTopStyle).toBe("dashed");
    expect(paint.bar.replay?.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(paint.bar.replay?.opacity ?? 1).toBeLessThan(1);
  }
  // Opacity-aware contrast: enabled text >= 4.5:1; disabled controls blended via real opacity.
  expect(paint.texts.length).toBeGreaterThan(0);
  for (const line of paint.texts) {
    if (line.disabled) {
      expect(line.effectiveOpacity, `disabled "${line.text}" opacity`).toBeLessThan(1);
      expect(line.ratio, `disabled "${line.text}" blended < unblended`).toBeLessThan(
        line.unblendedRatio,
      );
      expect(
        line.ratio,
        `disabled "${line.text}" ${line.color} on ${line.ground} (opacity ${line.effectiveOpacity})`,
      ).toBeGreaterThanOrEqual(MIN_DISABLED_CONTRAST);
    } else {
      expect(line.ratio, `"${line.text}" ${line.color} on ${line.ground}`).toBeGreaterThanOrEqual(
        MIN_CONTRAST,
      );
    }
  }
  // Dark ink: the lead text is darker than the page.
  const lead = paint.texts[0];
  expect(lead?.color).not.toBe("rgb(244, 239, 230)");
  return paint;
};

/** Verifies #594 join input borders reach >= 3:1 non-text contrast against both card and parchment. */
const expectJoinInputBorders = async (page: Page) => {
  const inputs = await page.evaluate(() => {
    const parse = (value: string) => {
      const m = value.match(/rgba?\(([^)]+)\)/);
      if (!m?.[1]) return null;
      const [r = 0, g = 0, b = 0] = m[1].split(/[ ,/]+/).map(Number);
      return { r, g, b };
    };
    const lum = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const f = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (
      a: { r: number; g: number; b: number },
      b: { r: number; g: number; b: number },
    ) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
      return (hi + 0.05) / (lo + 0.05);
    };
    const main = document.querySelector("main.bt-device") as HTMLElement;
    const pageBg = parse(getComputedStyle(main).backgroundColor) ?? { r: 233, g: 217, b: 180 };
    return [...main.querySelectorAll("input")].map((input) => {
      const s = getComputedStyle(input);
      const border = parse(s.borderTopColor) ?? { r: 0, g: 0, b: 0 };
      const fill = parse(s.backgroundColor) ?? { r: 243, g: 234, b: 210 };
      return {
        name: input.getAttribute("name") ?? "",
        width: Number.parseFloat(s.borderTopWidth),
        style: s.borderTopStyle,
        radius: s.borderRadius,
        vsPage: ratio(border, pageBg),
        vsFill: ratio(border, fill),
      };
    });
  });
  expect(inputs.map((i) => i.name).sort()).toEqual(["code", "token"]);
  for (const input of inputs) {
    expect(input.style, `${input.name} border style`).toBe("solid");
    expect(input.width, `${input.name} border width`).toBeGreaterThanOrEqual(1);
    expect(input.width, `${input.name} border width`).toBeLessThanOrEqual(2);
    expect(input.radius, `${input.name} border radius`).toBe("0px");
    expect(input.vsPage, `${input.name} border vs parchment`).toBeGreaterThanOrEqual(
      MIN_INPUT_BORDER_CONTRAST,
    );
    expect(input.vsFill, `${input.name} border vs input fill`).toBeGreaterThanOrEqual(
      MIN_INPUT_BORDER_CONTRAST,
    );
  }
};

/** Verifies Fivepint, Lodestone Mountains, and all visible compass nodes clear the bottom bar. */
const expectMoveMapClearsBar = async (page: Page) => {
  const layout = await page.evaluate(() => {
    const bar = document.querySelector("[data-bottom-bar]")?.getBoundingClientRect();
    const scroll = document.querySelector(".bt-scroll")?.getBoundingClientRect();
    const nodes = [...document.querySelectorAll("[data-move-map] [data-slot] button")].map(
      (btn) => {
        const r = btn.getBoundingClientRect();
        return {
          name: (btn.textContent ?? "").trim(),
          slot: btn.closest("[data-slot]")?.getAttribute("data-slot") ?? "",
          top: r.top,
          bottom: r.bottom,
        };
      },
    );
    return {
      barTop: bar?.top ?? 0,
      scrollBottom: scroll?.bottom ?? 0,
      nodes,
    };
  });
  const names = layout.nodes.map((n) => n.name);
  expect(names).toContain("Fivepint");
  expect(names).toContain("Lodestone Mountains");
  for (const node of layout.nodes) {
    expect(
      node.bottom,
      `${node.name} (${node.slot}) bottom ${node.bottom} vs bar top ${layout.barTop}`,
    ).toBeLessThanOrEqual(layout.barTop);
    expect(
      node.bottom,
      `${node.name} (${node.slot}) bottom ${node.bottom} vs scroll bottom ${layout.scrollBottom}`,
    ).toBeLessThanOrEqual(layout.scrollBottom);
  }
};

/** Verifies Menu dialog and Help sheet render on the Theme B parchment/ink tokens at 768x1024. */
const expectDialogsOnThemeB = async (page: Page, prefix: string) => {
  const bar = page.locator("[data-bottom-bar]");
  await bar.locator('[data-action="menu"]').click();
  const menu = page.locator("[data-menu]");
  await expect(menu).toBeVisible();
  const menuStyle = await menu.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      bg: s.backgroundColor,
      borderStyle: s.borderTopStyle,
      radius: s.borderRadius,
      bgImage: s.backgroundImage,
    };
  });
  expect(menuStyle.bg).toBe("rgb(243, 234, 210)");
  expect(menuStyle.borderStyle).toBe("double");
  expect(menuStyle.radius).toBe("0px");
  expect(menuStyle.bgImage).toContain("data:image/svg+xml");
  const menuPaint = await expectParchmentShell(page, `${prefix}-menu`);
  expect(menuPaint.texts.some((t) => t.disabled)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);

  await bar.locator('[data-action="help"]').click();
  const help = page.locator("[data-help]");
  await expect(help).toBeVisible();
  const helpStyle = await help.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      bg: s.backgroundColor,
      borderStyle: s.borderTopStyle,
      radius: s.borderRadius,
      bgImage: s.backgroundImage,
    };
  });
  expect(helpStyle.bg).toBe("rgb(243, 234, 210)");
  expect(helpStyle.borderStyle).toBe("double");
  expect(helpStyle.radius).toBe("0px");
  expect(helpStyle.bgImage).toContain("data:image/svg+xml");
  await expectParchmentShell(page, `${prefix}-help`);
  await help.getByRole("button", { name: "Close" }).click();
  await expect(help).toHaveCount(0);
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

test.describe("#592 / #594 the iPad shell is one Theme B parchment page", {
  tag: "@ipad-only",
}, () => {
  test("join screen, setup, move map, dialogs, and building menu meet Theme B & contrast rules", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { session, context, pad } = await startAtBuilding(browser, testInfo);
    try {
      await pad.goto("/join");
      const joinPaint = await expectParchmentShell(pad, "join");
      expect(joinPaint.bar?.back?.disabled).toBe(true);
      expect(joinPaint.bar?.back?.borderTopStyle).toBe("dashed");
      expect(joinPaint.bar?.back?.backgroundColor).toBe("rgba(0, 0, 0, 0)");
      expect(joinPaint.bar?.back?.opacity ?? 1).toBeLessThan(1);
      await expectJoinInputBorders(pad);
      await expectDialogsOnThemeB(pad, "join");

      await pad.goto(`/join?code=${session.host.joinCode}`);
      await enterWithoutTower(pad);
      await clickAct(pad, "continue", "continue-pick-story-test");
      await expect(deviceMain(pad)).toHaveAttribute("data-screen", "game-settings", {
        timeout: 20_000,
      });
      // Back is enabled here while Replay stays disabled: check distinct enabled vs disabled styling.
      const settingsPaint = await expectParchmentShell(pad, "game-settings");
      expect(settingsPaint.bar?.back?.disabled).toBe(false);
      expect(settingsPaint.bar?.back?.borderTopStyle).toBe("double");
      expect(settingsPaint.bar?.back?.backgroundColor).toBe("rgb(243, 234, 210)");
      expect(settingsPaint.bar?.back?.opacity).toBe(1);

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
      await expectMoveMapClearsBar(pad);
      await expectDialogsOnThemeB(pad, "move-map");

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
