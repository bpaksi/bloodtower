import { WAKE_LOCK_REFUSED, WAKE_LOCK_UNAVAILABLE } from "./pageLogCodes.ts";

/** The refused-notice copy (DEC-712, approved mockup). */
export const WAKE_LOCK_NOTICE =
  "This iPad may dim and sleep. Keep it awake in Settings to stay in the game.";

export interface ScreenWakeSentinel {
  readonly released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: "release", listener: () => void) => void;
}

export interface WakeLockHost {
  wakeLock?: {
    request: (type: "screen") => Promise<ScreenWakeSentinel>;
  };
}

export type WakeLockOutcome =
  | { ok: true; sentinel: ScreenWakeSentinel }
  | { ok: false; code: typeof WAKE_LOCK_REFUSED | typeof WAKE_LOCK_UNAVAILABLE };

/**
 * Asks the browser to keep the screen on. A missing API and a rejected request are
 * results the page shows; neither throws.
 */
export const requestScreenWakeLock = async (
  host: WakeLockHost | undefined,
): Promise<WakeLockOutcome> => {
  const api = host?.wakeLock;
  if (api == null || typeof api.request !== "function") {
    return { ok: false, code: WAKE_LOCK_UNAVAILABLE };
  }
  try {
    const sentinel = await api.request("screen");
    return { ok: true, sentinel };
  } catch (error) {
    // A throw is the refusal itself (NotAllowedError, or any other rejection). The page
    // logs and shows it. Re-throw only when there is no error value to recover from.
    if (error === undefined) throw error;
    return { ok: false, code: WAKE_LOCK_REFUSED };
  }
};

/**
 * Lets the screen sleep again. LiveDevice calls this when the iPad leaves or the
 * session is over. A sentinel the browser already released is left alone.
 */
export const releaseScreenWakeLock = async (sentinel: ScreenWakeSentinel | null): Promise<void> => {
  if (!sentinel || sentinel.released) return;
  try {
    await sentinel.release();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(detail.trim() === "" ? "The screen wake lock could not be released." : detail);
  }
};
