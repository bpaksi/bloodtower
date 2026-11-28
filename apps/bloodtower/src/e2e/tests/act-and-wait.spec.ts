import { expect, test } from "@playwright/test";
import { installSessionSocketHook, startAcceptanceHost } from "./support/acceptance.ts";
import { act, deviceMain, pressOpen, readStatus, untilScreen } from "./support/device.ts";

const IPAD = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };

type HookWindow = {
  __btSessionSocket?: WebSocket;
  __btLastDeviceView?: { screen: string; seq?: number; acked?: number };
};

test.describe("CU17 act-and-wait helpers (EV-06, EV-07)", { tag: "@ipad-only" }, () => {
  test("CU17 EV-06: act waits for the press, untilScreen tracks another pad, missing button fails with diagnostics", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(90_000);
    const session = await startAcceptanceHost(testInfo, { seed: "cu17-ev06" });
    const ctx1 = await browser.newContext({ baseURL: session.baseURL, ...IPAD });
    const ctx2 = await browser.newContext({ baseURL: session.baseURL, ...IPAD });
    const pad1 = await ctx1.newPage();
    const pad2 = await ctx2.newPage();
    try {
      await pad1.goto(`/join?code=${session.host.joinCode}`);
      await pad2.goto(`/join?code=${session.host.joinCode}`);
      await untilScreen(pad1, "base-board");
      await untilScreen(pad2, "base-board");

      await act(pad1, "base-board-done", "board-set-up");
      await act(pad1, "play-without-tower", "play-without-tower");
      await untilScreen(pad1, "pick-story");
      await untilScreen(pad2, "pick-story");

      // On pick-story, act the test story's continue; plain read right after must be game-settings.
      const seqAfter = await act(pad1, "continue-pick-story-test", "continue");
      expect(await deviceMain(pad1).getAttribute("data-screen")).toBe("game-settings");

      // Missing status attributes come back null, never 0 or ""; seq matches the rendered view.
      const status = await readStatus(pad1);
      expect(status.seq).toBe(seqAfter);
      expect(status.day).toBeNull();
      expect(status.moves).toBeNull();
      expect(status.building).toBeNull();

      // Press on pad2 while pad1 is idle; untilScreen catches the transition on pad1.
      await act(pad2, "continue-game-settings", "continue");
      await untilScreen(pad1, "claim-heroes");
      expect(await deviceMain(pad1).getAttribute("data-screen")).toBe("claim-heroes");

      // Missing button fails in ~2 s with a diagnostic message naming prompt, action, screen and seq.
      const startedAt = Date.now();
      let caught: Error | null = null;
      try {
        await act(pad1, "nonexistent-prompt", "continue", { timeout: 2_000 });
      } catch (error: unknown) {
        caught = error instanceof Error ? error : new Error(String(error));
      }
      const elapsedMs = Date.now() - startedAt;
      expect(caught).not.toBeNull();
      expect(elapsedMs).toBeGreaterThanOrEqual(1_500);
      expect(elapsedMs).toBeLessThan(10_000);
      expect(caught?.message).toContain("nonexistent-prompt");
      expect(caught?.message).toContain("continue");
      expect(caught?.message).toContain("claim-heroes");
      expect(caught?.message).toMatch(/seq=\d+/);
    } finally {
      await ctx1.close();
      await ctx2.close();
      await session.host.close();
    }
  });

  test("CU17 EV-07: reconnect keeps seq rising, DOM matches rendered deviceView, waiting placeholder omits both", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(90_000);
    const session = await startAcceptanceHost(testInfo, { seed: "cu17-ev07" });
    const waitingCtx = await browser.newContext({ baseURL: session.baseURL, ...IPAD });
    const padCtx = await browser.newContext({ baseURL: session.baseURL, ...IPAD });
    const waitingPad = await waitingCtx.newPage();
    const pad = await padCtx.newPage();
    try {
      // Opening /device without a stored token renders the waiting placeholder (no seq or acked).
      await waitingPad.goto("/device");
      await expect(deviceMain(waitingPad)).toHaveAttribute("data-screen", "splash", {
        timeout: 15_000,
      });
      expect(await deviceMain(waitingPad).getAttribute("data-view-seq")).toBeNull();
      expect(await deviceMain(waitingPad).getAttribute("data-acked")).toBeNull();

      // Join a live pad and advance via pressOpen (which routes through act).
      await installSessionSocketHook(pad);
      await pad.goto(`/join?code=${session.host.joinCode}`);
      await untilScreen(pad, "base-board");
      const firstPress = await pressOpen(pad, { prefer: ["board-set-up"] });
      expect(firstPress?.promptId).toBe("base-board-done");
      const secondPress = await pressOpen(pad, { prefer: ["play-without-tower"] });
      expect(secondPress?.promptId).toBe("play-without-tower");
      expect(await deviceMain(pad).getAttribute("data-screen")).toBe("pick-story");

      const before = await readStatus(pad);
      expect(before.seq).not.toBeNull();
      expect(before.acked).toBe(2);
      const seqBefore = before.seq ?? 0;

      // Close the pad's socket so openSession reconnects with its stored token to the same host.
      await pad.evaluate(() => {
        const socket = (window as unknown as HookWindow).__btSessionSocket;
        if (!socket) throw new Error("No session socket to close.");
        socket.close();
      });

      const seqAfter = await untilScreen(pad, "pick-story", { afterSeq: seqBefore });
      expect(seqAfter).toBeGreaterThan(seqBefore);

      // DOM data-view-seq and data-acked match the last rendered deviceView payload.
      await expect
        .poll(async () =>
          pad.evaluate(() => {
            const main = document.querySelector("main.bt-device");
            const last = (window as unknown as HookWindow).__btLastDeviceView;
            if (!main || !last) return null;
            return {
              domSeq: main.getAttribute("data-view-seq"),
              domAcked: main.getAttribute("data-acked"),
              viewSeq: last.seq !== undefined ? String(last.seq) : null,
              viewAcked: last.acked !== undefined ? String(last.acked) : null,
            };
          }),
        )
        .toEqual(
          expect.objectContaining({
            domSeq: expect.stringMatching(/^\d+$/),
            domAcked: "2",
          }),
        );

      const matched = await pad.evaluate(() => {
        const main = document.querySelector("main.bt-device");
        const last = (window as unknown as HookWindow).__btLastDeviceView;
        return {
          domSeq: main?.getAttribute("data-view-seq") ?? null,
          domAcked: main?.getAttribute("data-acked") ?? null,
          viewSeq: last?.seq !== undefined ? String(last.seq) : null,
          viewAcked: last?.acked !== undefined ? String(last.acked) : null,
        };
      });
      expect(matched.domSeq).toBe(matched.viewSeq);
      expect(matched.domAcked).toBe(matched.viewAcked);
      expect(Number(matched.domSeq)).toBeGreaterThan(seqBefore);
    } finally {
      await waitingCtx.close();
      await padCtx.close();
      await session.host.close();
    }
  });
});
