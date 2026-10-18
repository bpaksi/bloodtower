import { chromium, expect, test } from "@playwright/test";
import { startAcceptanceHost } from "./support/acceptance.ts";

// R3-UI-03. Trace snapshots run page scripts with user activation, which would hide the
// suspended context this file checks for.
test.use({ trace: "off" });

// An input that is not a user activation (Escape, or any untrusted event) still counts as the
// first input, but leaves the audio context suspended. A later click must still start the audio.
test("a first input that is not a gesture does not leave the board silent", async ({
  browserName: _browserName,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The Sound dialog is the Mac board's.");
  test.setTimeout(90_000);
  const session = await startAcceptanceHost(testInfo);
  const { baseURL, host } = session;
  // Desktop Chrome's policy: audio needs a user activation on the page.
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
      // The page sends its own keydown until the board has hydrated and made a context. It
      // reaches the board's listener but is never a user activation. It is sent from here
      // because Playwright's evaluate and keyboard calls give the page user activation, which
      // would hide the suspended context.
      const send = () => {
        if (made.length > 0) return;
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        setTimeout(send, 100);
      };
      window.addEventListener("load", send);
    });
    const board = await context.newPage();
    await board.goto("/board?debug=1", { waitUntil: "domcontentloaded" });
    const audio = () =>
      board.evaluate(() => {
        const made = (window as Window & { btContexts?: AudioContext[] }).btContexts ?? [];
        return { count: made.length, state: made[0]?.state ?? null };
      });

    await test.step("a non-gesture first input opens the dialog, the audio is suspended", async () => {
      // Read the state before any locator call: those give the page user activation too.
      await board.waitForTimeout(1500);
      expect(await audio()).toEqual({ count: 1, state: "suspended" });
      await expect(board.locator("[data-sound-dialog]")).toBeVisible();
    });

    await test.step("the next click resumes the same context", async () => {
      // A plain click on the dialog, not a Test button, so only the board's input listener runs.
      await board.locator("[data-sound-dialog]").click({ position: { x: 8, y: 8 } });
      await expect.poll(audio).toEqual({ count: 1, state: "running" });
    });
  } finally {
    await strict.close().catch(() => undefined);
    await host.close();
  }
});
