import { mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { type BrowserContext, chromium, expect, type Page, test } from "@playwright/test";
import { loadConfig } from "../../server/config.ts";
import { type SessionHost, startSessionHost } from "../../server/hub/host.ts";
import { createMockTower } from "../../server/tower/mock.ts";
import { bloodtowerTowerFromMock } from "../../server/tower/testAdapter.ts";
import { levelToGain } from "../../web/lib/audio/levels.ts";
import {
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";

declare global {
  interface Window {
    __btAudio?: {
      contextState: AudioContextState | null;
      ambientPlaying: boolean;
      gains: { music: number; ambient: number; voice: number };
    };
  }
}

const STORY_ID = "test";
const HERO_IDS = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const SETUP_IDS = ["seals-and-skulls", "lay-out-board", "place-heroes"] as const;
const WEB_ROOT = resolve(import.meta.dirname, "../../web/out");

const clickAct = async (page: Page, actionId: string, promptId: string) => {
  const button = page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`);
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const spyAudioContexts = () => {
  const Original = window.AudioContext;
  const made: AudioContext[] = [];
  (window as Window & { btContexts?: AudioContext[] }).btContexts = made;
  window.AudioContext = class extends Original {
    constructor(options?: AudioContextOptions) {
      super(options);
      made.push(this);
    }
  };
};

const readBed = (page: Page) =>
  page.evaluate(() => {
    const hook = window.__btAudio;
    const made = (window as Window & { btContexts?: AudioContext[] }).btContexts ?? [];
    const ctx = made[0];
    return {
      count: made.length,
      contextState: hook?.contextState ?? null,
      ctxState: ctx?.state ?? null,
      same: hook != null && ctx != null && hook.contextState === ctx.state,
      ambientPlaying: hook?.ambientPlaying ?? false,
      gains: hook?.gains ?? null,
      navs: performance.getEntriesByType("navigation").length,
      path: location.pathname,
    };
  });

const expectBed = async (page: Page) => {
  await expect
    .poll(async () => {
      const bed = await readBed(page);
      return bed.contextState === "running" && bed.ambientPlaying;
    })
    .toBe(true);
};

/** The acceptance host again, on the same port, so this page's saved levels stay put. */
const restartHost = async (port: number): Promise<SessionHost> => {
  const config = loadConfig({ env: {} });
  const dir = join(config.dataDir, "e2e-acceptance");
  mkdirSync(dir, { recursive: true });
  const databasePath = join(dir, `ambient-restart-${port}.sqlite`);
  for (const suffix of ["", "-wal", "-shm"]) rmSync(`${databasePath}${suffix}`, { force: true });
  const tower = createMockTower();
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await startSessionHost({
        port,
        host: "127.0.0.1",
        webRoot: WEB_ROOT,
        packsDir: config.packsDir,
        databasePath,
        tower: bloodtowerTowerFromMock(tower),
        towerWatchMs: 50,
        sleep: async () => undefined,
        graceMs: 100,
      });
    } catch (error) {
      lastError = error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
    }
  }
  throw lastError;
};

// R3-UI-03, retargeted onto `/` (W2). Trace snapshots run page scripts with user activation,
// which would hide the suspended context this file checks for.
// C2/02 runs this file (EV-01, EV-02, EV-03, EV-06, EV-11), so it is not in testIgnore.
test.use({ trace: "off" });

const trackContexts = () => {
  const Original = window.AudioContext;
  const made: AudioContext[] = [];
  (window as Window & { btContexts?: AudioContext[] }).btContexts = made;
  window.AudioContext = class extends Original {
    constructor(options?: AudioContextOptions) {
      super(options);
      made.push(this);
    }
  };
  // An untrusted key is not a user activation. It is sent from the page, because Playwright's
  // evaluate and keyboard calls give the page user activation and would hide a suspended context.
  // Keep sending until the landing listener has made a context, the same way the board spec did.
  const send = () => {
    const made = (window as Window & { btContexts?: AudioContext[] }).btContexts ?? [];
    if (made.length > 0) return;
    if (document.querySelector('[data-action="sound"]')) {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    }
    window.setTimeout(send, 100);
  };
  window.addEventListener("load", send);
};

test("a first input that is not a gesture does not start audio on the landing", async ({
  browserName: _browserName,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The Sound dialog is the Mac landing's.");
  test.setTimeout(90_000);
  const session = await startAcceptanceHost(testInfo);
  const { baseURL, host } = session;
  const strict = await chromium.launch({
    args: ["--autoplay-policy=document-user-activation-required"],
  });
  try {
    const context = await strict.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
    await context.addInitScript(trackContexts);
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const audio = () =>
      page.evaluate(() => {
        const made = (window as Window & { btContexts?: AudioContext[] }).btContexts ?? [];
        const playing = [...document.querySelectorAll("audio")].some(
          (element) => !element.paused && !element.ended && element.currentTime > 0,
        );
        return {
          count: made.length,
          state: made[0]?.state ?? null,
          playing,
          dialogs: document.querySelectorAll("[data-sound-dialog]").length,
        };
      });

    await test.step("before a trusted click or key, nothing is playing", async () => {
      // One read, after the page's own Escape loop. An earlier evaluate would grant
      // user activation and let that untrusted key resume the context.
      await page.waitForTimeout(1500);
      const early = await audio();
      expect(early.playing).toBe(false);
      expect(early.count).toBeGreaterThan(0);
      expect(early.state).toBe("suspended");
      expect(early.dialogs).toBe(0);
      await expect(page).toHaveURL(/\/$/);
    });

    await test.step("a real key stays on / and the context is running only after it", async () => {
      await expect(page.locator('[data-action="sound"]')).toBeVisible();
      const before = await audio();
      expect(before.state).not.toBe("running");
      await page.keyboard.press("a");
      await expect(page).toHaveURL(/\/$/);
      await expect.poll(audio).toMatchObject({ state: "running", playing: false });
    });
  } finally {
    await strict.close().catch(() => undefined);
    await host.close();
  }
});

test("a real click on Sound stays on / with the dialog and a running context", async ({
  browserName: _browserName,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The Sound dialog is the Mac landing's.");
  test.setTimeout(90_000);
  const session = await startAcceptanceHost(testInfo);
  const { baseURL, host } = session;
  const strict = await chromium.launch({
    args: ["--autoplay-policy=document-user-activation-required"],
  });
  try {
    const context = await strict.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => {
      const Original = window.AudioContext;
      const made: AudioContext[] = [];
      (window as Window & { btContexts?: AudioContext[] }).btContexts = made;
      window.AudioContext = class extends Original {
        constructor(options?: AudioContextOptions) {
          super(options);
          made.push(this);
        }
      };
    });
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator('[data-action="sound"]').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("[data-sound-dialog]")).toHaveCount(1);
    await expect(page.locator("[data-sound-dialog]")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const made = (window as Window & { btContexts?: AudioContext[] }).btContexts ?? [];
          return made[0]?.state ?? null;
        }),
      )
      .toBe("running");
  } finally {
    await strict.close().catch(() => undefined);
    await host.close();
  }
});

test("the bed carries from / onto /board with one gesture", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The landing opens the board on the Mac.");
  test.setTimeout(240_000);
  const session = await startAcceptanceHost(testInfo);
  const { baseURL, host } = session;
  const contexts: BrowserContext[] = [];
  let pad: Page | null = null;
  try {
    const mac = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
    contexts.push(mac);
    await mac.addInitScript(spyAudioContexts);
    const page = await mac.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-screen="title"]')).toBeVisible();

    await test.step("one click unlocks and opens the board in this document", async () => {
      await page.locator("[data-banner]").click({ position: { x: 8, y: 8 } });
      await expect(page).toHaveURL(/\/board$/);
      await expect(page.locator("main.bt-board")).toBeVisible();
      await page.waitForTimeout(3_000);
      const bed = await readBed(page);
      expect(bed.path).toBe("/board");
      expect(bed.navs).toBe(1);
      expect(bed.count).toBe(1);
      expect(bed.contextState).toBe("running");
      expect(bed.ctxState).toBe("running");
      expect(bed.same).toBe(true);
      expect(bed.ambientPlaying).toBe(true);
    });

    const padContext = await browser.newContext({
      baseURL,
      viewport: { width: 820, height: 1180 },
      hasTouch: true,
    });
    contexts.push(padContext);
    pad = await padContext.newPage();
    await installSessionSocketHook(pad);
    await pad.goto(`/join?code=${host.joinCode}`);
    await expect(pad).toHaveURL(/\/device/);

    await test.step("pick-story", async () => {
      await clickAct(pad as Page, "tower-connect", "tower-connect");
      await clickAct(pad as Page, "tower-calibrate", "tower-calibrate");
      await clickAct(pad as Page, "new-game", "new-pick-game");
      await expect(page.locator("main.bt-board")).toHaveAttribute("data-screen", "pick-story");
      await expectBed(page);
    });

    await test.step("setup", async () => {
      await clickAct(pad as Page, "continue", `continue-pick-story-${STORY_ID}`);
      await clickAct(pad as Page, "continue", "continue-game-settings");
      await expect((pad as Page).locator("main.bt-device")).toHaveAttribute(
        "data-screen",
        "claim-heroes",
      );
      await holdHeroesFromTest(pad as Page, [...HERO_IDS]);
      await clickAct(pad as Page, "continue", "continue-claim-heroes");
      await expect(page.locator("main.bt-board")).toHaveAttribute("data-screen", "setup");
      await expectBed(page);
      for (const id of SETUP_IDS) {
        await expect((pad as Page).locator("main.bt-device")).toHaveAttribute(
          "data-setup-step",
          id,
        );
        await clickAct(pad as Page, "continue", `continue-setup-${id}`);
      }
    });

    await test.step("play", async () => {
      await expect((pad as Page).locator("main.bt-device")).toHaveAttribute("data-screen", "begin");
      await clickAct(pad as Page, "continue", "continue-begin");
      await expect(page.locator("main.bt-board")).toHaveAttribute("data-screen", "play", {
        timeout: 20_000,
      });
      await expectBed(page);
    });

    await test.step("pause", async () => {
      await pad?.close();
      pad = null;
      await expect(page.locator("main.bt-board")).toHaveAttribute("data-screen", "pause", {
        timeout: 20_000,
      });
      await expectBed(page);
    });

    await test.step("session", async () => {
      const rejoined = await padContext.newPage();
      pad = rejoined;
      await installSessionSocketHook(rejoined);
      await rejoined.goto(`/join?code=${host.joinCode}`);
      await expect(rejoined).toHaveURL(/\/device/);
      const device = rejoined.locator("main.bt-device");
      await expect(device).toHaveAttribute("data-screen", "pause", { timeout: 20_000 });
      const quit = device.locator('button[data-action-id="quit-story"]');
      await expect(quit).toBeEnabled();
      const promptId = await quit.getAttribute("data-prompt-id");
      expect(promptId).toBeTruthy();
      await clickAct(rejoined, "quit-story", promptId ?? "");
      await expect(page.locator("main.bt-board")).toHaveAttribute("data-screen", "session", {
        timeout: 20_000,
      });
      await expectBed(page);
    });
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await host.close();
  }
});

test("the landing page levels apply on the board", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The Sound dialog is the Mac landing's.");
  test.setTimeout(90_000);
  const session = await startAcceptanceHost(testInfo);
  const { baseURL, host } = session;
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
  try {
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator('[data-action="sound"]').click();
    await page.locator("#bt-sound-ambient").fill("20");
    await page.locator("#bt-sound-music").fill("0");
    await page.locator("#bt-sound-voice").fill("50");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("[data-banner]").click({ position: { x: 8, y: 8 } });
    await expect(page).toHaveURL(/\/board$/);
    await expect.poll(() => page.evaluate(() => window.__btAudio?.gains ?? null)).toBeTruthy();
    const gains = await page.evaluate(() => window.__btAudio?.gains ?? null);
    expect(gains).not.toBeNull();
    expect(Math.abs((gains?.ambient ?? 1) - levelToGain(0.2))).toBeLessThanOrEqual(0.01);
    expect(Math.abs(gains?.music ?? 1)).toBeLessThanOrEqual(0.01);
    expect(Math.abs((gains?.voice ?? 1) - levelToGain(0.5))).toBeLessThanOrEqual(0.01);
  } finally {
    await context.close().catch(() => undefined);
    await host.close();
  }
});

test("the levels survive a host restart", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The Sound dialog is the Mac landing's.");
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo);
  const { baseURL, host } = session;
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
  let restarted: SessionHost | null = null;
  try {
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator('[data-action="sound"]').click();
    await page.locator("#bt-sound-ambient").fill("20");
    await page.locator("#bt-sound-voice").fill("50");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("[data-banner]").click({ position: { x: 8, y: 8 } });
    await expect(page).toHaveURL(/\/board$/);
    const before = await page.evaluate(() => window.__btAudio?.gains ?? null);
    expect(before).not.toBeNull();
    expect(Math.abs((before?.ambient ?? 1) - levelToGain(0.2))).toBeLessThanOrEqual(0.01);
    expect(Math.abs((before?.voice ?? 1) - levelToGain(0.5))).toBeLessThanOrEqual(0.01);

    const port = host.port;
    await host.close();
    restarted = await restartHost(port);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("main.bt-board")).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.__btAudio?.gains?.ambient ?? null))
      .not.toBeNull();
    const after = await page.evaluate(() => window.__btAudio?.gains ?? null);
    expect(after).not.toBeNull();
    expect(Math.abs((after?.ambient ?? 1) - (before?.ambient ?? 0))).toBeLessThanOrEqual(0.01);
    expect(Math.abs((after?.voice ?? 1) - (before?.voice ?? 0))).toBeLessThanOrEqual(0.01);
  } finally {
    await context.close().catch(() => undefined);
    if (restarted) await restarted.close();
    else await host.close().catch(() => undefined);
  }
});
