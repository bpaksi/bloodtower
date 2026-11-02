import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { type Browser, expect, type Page, test } from "@playwright/test";
import { loadConfig } from "../../server/config.ts";
import { startSessionHost } from "../../server/hub/host.ts";
import { createMockTower } from "../../server/tower/mock.ts";
import { bloodtowerTowerFromMock } from "../../server/tower/testAdapter.ts";
import {
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";
import { copyToE2eArtifacts } from "./support/e2e-artifacts.ts";

const WEB_ROOT = resolve(import.meta.dirname, "../../web/out");
const STORY_ID = "test";
const HERO_IDS = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const SETUP_IDS = ["seals-and-skulls", "place-heroes"] as const;
const NOTICE = "This iPad may dim and sleep. Keep it awake in Settings to stay in the game.";
const IPAD = { width: 768, height: 1024 } as const;

// Acceptance hosts share one logs folder (the database directory). These tests
// run one at a time so a count of new lines is this iPad's line only.
test.describe.configure({ mode: "serial" });

type WakeMode = "grant" | "reject" | "missing";
type WakeCall = { type: string; path: string };

const deviceMain = (page: Page) => page.locator("main.bt-device");

const clickAct = async (page: Page, actionId: string, promptId: string) => {
  const button = page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`);
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const wakeCalls = async (page: Page): Promise<WakeCall[]> =>
  page.evaluate(() => {
    const raw = sessionStorage.getItem("bt-wake-calls");
    if (!raw) return [];
    return JSON.parse(raw) as WakeCall[];
  });

const screenCalls = (calls: WakeCall[]) => calls.filter((call) => call.type === "screen");

const installWakeLockStub = async (page: Page, mode: WakeMode) => {
  await page.addInitScript((stubMode: WakeMode) => {
    const key = "bt-wake-calls";
    const read = (): WakeCall[] => {
      const raw = sessionStorage.getItem(key);
      if (!raw) return [];
      try {
        return JSON.parse(raw) as WakeCall[];
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        sessionStorage.setItem("bt-wake-calls-error", message);
        return [];
      }
    };
    const push = (type: string) => {
      const next = read();
      next.push({ type, path: location.pathname });
      sessionStorage.setItem(key, JSON.stringify(next));
    };

    if (stubMode === "missing") {
      try {
        delete (navigator as { wakeLock?: unknown }).wakeLock;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        (window as unknown as { __btWakeDeleteError?: string }).__btWakeDeleteError = message;
      }
      Object.defineProperty(navigator, "wakeLock", {
        configurable: true,
        get: () => undefined,
      });
      return;
    }

    const sentinels: Array<{
      released: boolean;
      release: () => Promise<void>;
    }> = [];
    (window as unknown as { __btWakeSentinels: typeof sentinels }).__btWakeSentinels = sentinels;

    const wakeLock = {
      request: async (type: string) => {
        push(type);
        if (stubMode === "reject") {
          throw new DOMException("Wake Lock permission request denied", "NotAllowedError");
        }
        let released = false;
        const listeners: Array<() => void> = [];
        const sentinel = {
          get released() {
            return released;
          },
          release: async () => {
            if (released) return;
            released = true;
            push("release");
            for (const listener of listeners) listener();
          },
          addEventListener: (event: string, listener: () => void) => {
            if (event === "release") listeners.push(listener);
          },
        };
        sentinels.push(sentinel);
        return sentinel;
      },
    };
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      get: () => wakeLock,
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "hidden") return;
      for (const sentinel of [...sentinels]) void sentinel.release();
    });
  }, mode);
};

const errorLines = (databasePath: string, code: string): number => {
  const dir = join(dirname(databasePath), "logs");
  if (!existsSync(dir)) return 0;
  let count = 0;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".jsonl")) continue;
    const text = readFileSync(join(dir, name), "utf8");
    for (const line of text.split("\n")) {
      if (!line.startsWith("{")) continue;
      const entry = JSON.parse(line) as { code?: string; level?: string };
      if (entry.level === "error" && entry.code === code) count += 1;
    }
  }
  return count;
};

const joinDevice = async (page: Page, joinCode: string) => {
  await page.goto(`/join?code=${joinCode}`);
  await expect(page).toHaveURL(/\/device/);
};

const setVisibility = async (page: Page, state: "hidden" | "visible") => {
  await page.evaluate((next) => {
    const define = (key: "visibilityState" | "hidden", value: string | boolean) => {
      Object.defineProperty(document, key, { configurable: true, get: () => value });
    };
    define("visibilityState", next);
    define("hidden", next === "hidden");
    if (document.visibilityState !== next) {
      throw new Error(`visibilityState stayed ${document.visibilityState}`);
    }
    document.dispatchEvent(new Event("visibilitychange"));
  }, state);
};

const openBoard = async (browser: Browser, baseURL: string) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 900 },
  });
  const board = await context.newPage();
  await board.goto("/board");
  await expect(board.locator("main")).toBeVisible();
  return { context, board };
};

const expectNoticeLayout = async (page: Page) => {
  const layout = await page.evaluate(() => {
    const notice = document.querySelector("[data-error-code='wake-lock-refused']");
    const bar = document.querySelector("[data-bottom-bar]");
    if (!notice || !bar) return { ok: false, reason: "missing notice or bar" };
    const noticeBox = notice.getBoundingClientRect();
    const barBox = bar.getBoundingClientRect();
    const view = { width: window.innerWidth, height: window.innerHeight };
    const missed: string[] = [];
    for (const button of document.querySelectorAll("button")) {
      const box = button.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      if (x < 0 || y < 0 || x > view.width || y > view.height) continue;
      const hit = document.elementFromPoint(x, y);
      if (!hit || !button.contains(hit))
        missed.push(button.getAttribute("data-action") ?? button.textContent ?? "button");
    }
    return {
      ok: noticeBox.bottom <= barBox.top + 0.5 && missed.length === 0,
      reason: missed.length === 0 ? "" : missed.join(", "),
      noticeBottom: noticeBox.bottom,
      barTop: barBox.top,
    };
  });
  expect(layout.ok, `${layout.reason} notice ${layout.noticeBottom} bar ${layout.barTop}`).toBe(
    true,
  );
};

test("a joined iPad holds a screen wake lock", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "ipad", "One device width covers the wake lock.");
  test.setTimeout(60_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-wake-hold" });
  const context = await browser.newContext({ baseURL: session.baseURL, viewport: IPAD });
  const page = await context.newPage();
  try {
    await installWakeLockStub(page, "grant");
    await joinDevice(page, session.host.joinCode);
    await expect.poll(async () => screenCalls(await wakeCalls(page)).length).toBe(1);
    const calls = await wakeCalls(page);
    expect(screenCalls(calls).every((call) => call.path === "/device")).toBe(true);
    expect(calls.filter((call) => call.type === "release")).toHaveLength(0);
    const released = await page.evaluate(() => {
      const sentinels =
        (window as unknown as { __btWakeSentinels?: { released: boolean }[] }).__btWakeSentinels ??
        [];
      return sentinels.some((sentinel) => sentinel.released);
    });
    expect(released).toBe(false);
  } finally {
    await context.close().catch(() => undefined);
    await session.host.close();
  }
});

test("the wake lock is asked again when the page is visible", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "ipad", "One device width covers the wake lock.");
  test.setTimeout(60_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-wake-visible" });
  const context = await browser.newContext({ baseURL: session.baseURL, viewport: IPAD });
  const page = await context.newPage();
  try {
    await installWakeLockStub(page, "grant");
    await joinDevice(page, session.host.joinCode);
    await expect.poll(async () => screenCalls(await wakeCalls(page)).length).toBe(1);
    await setVisibility(page, "hidden");
    expect(screenCalls(await wakeCalls(page))).toHaveLength(1);
    await setVisibility(page, "visible");
    await expect.poll(async () => screenCalls(await wakeCalls(page)).length).toBe(2);
  } finally {
    await context.close().catch(() => undefined);
    await session.host.close();
  }
});

test("a refused wake lock is logged and shown", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "ipad", "One device width covers the wake lock.");
  test.setTimeout(60_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-wake-refused" });
  const context = await browser.newContext({ baseURL: session.baseURL, viewport: IPAD });
  const page = await context.newPage();
  const board = await openBoard(browser, session.baseURL);
  const loggedBefore = errorLines(session.databasePath, "wake-lock-refused");
  try {
    await installWakeLockStub(page, "reject");
    await joinDevice(page, session.host.joinCode);
    const banner = page.locator("[data-error-code='wake-lock-refused']");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(NOTICE);
    await expect(page.locator("[data-action='dismiss-wake-notice']")).toBeEnabled();
    await expect
      .poll(() => errorLines(session.databasePath, "wake-lock-refused") - loggedBefore)
      .toBe(1);
    await expect(board.board.locator("[data-error-code='wake-lock-refused']")).toHaveCount(1);
    await enterWithoutTower(page);
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "pick-story");
    await expect(banner).toBeVisible();
  } finally {
    await board.context.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await session.host.close();
  }
});

test("a browser with no wake lock API shows wake-lock-unavailable", async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "ipad", "One device width covers the wake lock.");
  test.setTimeout(60_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-wake-missing" });
  const context = await browser.newContext({ baseURL: session.baseURL, viewport: IPAD });
  const page = await context.newPage();
  const board = await openBoard(browser, session.baseURL);
  const loggedBefore = errorLines(session.databasePath, "wake-lock-unavailable");
  try {
    await installWakeLockStub(page, "missing");
    await joinDevice(page, session.host.joinCode);
    const banner = page.locator("[data-error-code='wake-lock-unavailable']");
    await expect(banner).toBeVisible();
    await expect
      .poll(() => errorLines(session.databasePath, "wake-lock-unavailable") - loggedBefore)
      .toBe(1);
    await expect(board.board.locator("[data-error-code='wake-lock-unavailable']")).toHaveCount(1);
    await enterWithoutTower(page);
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "pick-story");
  } finally {
    await board.context.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await session.host.close();
  }
});

test("reload of a joined iPad asks for the wake lock again", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "ipad", "One device width covers the wake lock.");
  test.setTimeout(60_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-wake-reload" });
  const context = await browser.newContext({ baseURL: session.baseURL, viewport: IPAD });
  const page = await context.newPage();
  try {
    await installWakeLockStub(page, "grant");
    await joinDevice(page, session.host.joinCode);
    await expect.poll(async () => screenCalls(await wakeCalls(page)).length).toBe(1);
    await page.reload();
    await expect(page).toHaveURL(/\/device/);
    await expect.poll(async () => screenCalls(await wakeCalls(page)).length).toBe(2);
  } finally {
    await context.close().catch(() => undefined);
    await session.host.close();
  }
});

test("Done for tonight releases the wake lock", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "ipad", "One device width covers the wake lock.");
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-wake-leave" });
  const context = await browser.newContext({ baseURL: session.baseURL, viewport: IPAD });
  const page = await context.newPage();
  try {
    await installWakeLockStub(page, "grant");
    await installSessionSocketHook(page);
    await joinDevice(page, session.host.joinCode);
    await expect.poll(async () => screenCalls(await wakeCalls(page)).length).toBe(1);
    await enterWithoutTower(page);
    await clickAct(page, "continue", `continue-pick-story-${STORY_ID}`);
    await clickAct(page, "continue", "continue-game-settings");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "claim-heroes");
    await holdHeroesFromTest(page, [...HERO_IDS]);
    await clickAct(page, "continue", "continue-claim-heroes");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "setup");
    for (const id of SETUP_IDS) {
      await expect(deviceMain(page)).toHaveAttribute("data-setup-step", id);
      await clickAct(page, "continue", `continue-setup-${id}`);
    }
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "begin");
    await clickAct(page, "continue", "continue-begin");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "play");
    await page.locator('[data-action="menu"]').click();
    await clickAct(page, "quit-story", "menu-quit");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "session");
    const beforeLeave = screenCalls(await wakeCalls(page)).length;
    await clickAct(page, "done-for-tonight", "session-done-tonight");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "goodbye");
    await expect
      .poll(async () => (await wakeCalls(page)).filter((call) => call.type === "release").length)
      .toBe(1);
    expect(screenCalls(await wakeCalls(page))).toHaveLength(beforeLeave);
    await page.waitForTimeout(700);
    expect(screenCalls(await wakeCalls(page))).toHaveLength(beforeLeave);
  } finally {
    await context.close().catch(() => undefined);
    await session.host.close();
  }
});

test("the refused notice matches the mockup and the granted iPad has none", async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "ipad", "The mockup viewport is iPad 768×1024.");
  test.setTimeout(90_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-wake-mockup" });
  const refusedContext = await browser.newContext({ baseURL: session.baseURL, viewport: IPAD });
  const grantedContext = await browser.newContext({ baseURL: session.baseURL, viewport: IPAD });
  const refused = await refusedContext.newPage();
  const granted = await grantedContext.newPage();
  try {
    await refused.setViewportSize(IPAD);
    await granted.setViewportSize(IPAD);
    await installWakeLockStub(refused, "reject");
    await installWakeLockStub(granted, "grant");
    await joinDevice(refused, session.host.joinCode);
    await joinDevice(granted, session.host.joinCode);
    const notice = refused.locator("[data-error-code='wake-lock-refused']");
    await expect(notice).toHaveCount(1);
    await expect(notice).toContainText(NOTICE);
    await expect(granted.locator("[data-error-code]")).toHaveCount(0);
    await expectNoticeLayout(refused);
    const refusedShot = testInfo.outputPath("c2-09-refused-notice.png");
    await refused.screenshot({ path: refusedShot });
    copyToE2eArtifacts(testInfo, refusedShot, "c2-09-refused-notice.png");
    const grantedShot = testInfo.outputPath("c2-09-granted-normal.png");
    await granted.screenshot({ path: grantedShot });
    copyToE2eArtifacts(testInfo, grantedShot, "c2-09-granted-normal.png");
    await refused.locator("[data-action='dismiss-wake-notice']").click();
    await expect(refused.locator("[data-error-code='wake-lock-refused']")).toHaveCount(0);
    await expect(granted.locator("[data-wake-notice]")).toHaveCount(0);
  } finally {
    await refusedContext.close().catch(() => undefined);
    await grantedContext.close().catch(() => undefined);
    await session.host.close();
  }
});

test("a host restart asks for the wake lock again", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "ipad", "One device width covers the wake lock.");
  test.setTimeout(90_000);
  const session = await startAcceptanceHost(testInfo, { seed: "c2-wake-restart" });
  const context = await browser.newContext({ baseURL: session.baseURL, viewport: IPAD });
  const page = await context.newPage();
  const port = session.host.port;
  const joinCode = session.host.joinCode;
  const { databasePath } = session;
  try {
    await installWakeLockStub(page, "grant");
    await joinDevice(page, joinCode);
    await expect.poll(async () => screenCalls(await wakeCalls(page)).length).toBe(1);
    await session.host.close();
    const tower = createMockTower();
    const restarted = await startSessionHost({
      port,
      host: "127.0.0.1",
      webRoot: WEB_ROOT,
      packsDir: loadConfig({ env: {} }).packsDir,
      databasePath,
      tower: bloodtowerTowerFromMock(tower),
      towerWatchMs: 50,
      sleep: async () => undefined,
      seed: "c2-wake-restart",
      graceMs: 100,
      joinCode,
    });
    try {
      await expect
        .poll(async () => screenCalls(await wakeCalls(page)).length, { timeout: 20_000 })
        .toBe(2);
      await expect(page.locator("button[data-prompt-id='base-board-done']")).toBeEnabled();
    } finally {
      await restarted.close();
    }
  } finally {
    await context.close().catch(() => undefined);
    await session.host.close().catch(() => undefined);
  }
});
