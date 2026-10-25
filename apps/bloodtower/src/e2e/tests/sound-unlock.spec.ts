import { chromium, expect, test } from "@playwright/test";
import { startAcceptanceHost } from "./support/acceptance.ts";

// R3-UI-03, retargeted onto `/` (W2). Trace snapshots run page scripts with user activation,
// which would hide the suspended context this file checks for.
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
