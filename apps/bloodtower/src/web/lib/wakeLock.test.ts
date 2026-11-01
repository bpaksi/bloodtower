import { describe, expect, it } from "vitest";
import { WAKE_LOCK_REFUSED, WAKE_LOCK_UNAVAILABLE } from "./pageLogCodes.ts";
import {
  releaseScreenWakeLock,
  requestScreenWakeLock,
  type ScreenWakeSentinel,
} from "./wakeLock.ts";

describe("screen wake lock", () => {
  it("no API reports wake-lock-unavailable", async () => {
    const navigator = { wakeLock: undefined };
    const outcome = await requestScreenWakeLock(navigator);
    expect(outcome).toEqual({ ok: false, code: WAKE_LOCK_UNAVAILABLE });
  });

  it("release on leave", async () => {
    let released = false;
    let calls = 0;
    const sentinel: ScreenWakeSentinel = {
      get released() {
        return released;
      },
      release: async () => {
        calls += 1;
        released = true;
      },
    };
    const outcome = await requestScreenWakeLock({
      wakeLock: {
        request: async () => sentinel,
      },
    });
    if (!outcome.ok) throw new Error("expected the screen wake lock to be acquired");
    await releaseScreenWakeLock(outcome.sentinel);
    expect(calls).toBe(1);
    expect(outcome.sentinel.released).toBe(true);
  });

  it("a rejected request is wake-lock-refused and does not throw", async () => {
    const outcome = await requestScreenWakeLock({
      wakeLock: {
        request: async () => {
          throw new DOMException("Wake Lock permission request denied", "NotAllowedError");
        },
      },
    });
    expect(outcome).toEqual({ ok: false, code: WAKE_LOCK_REFUSED });
  });
});
