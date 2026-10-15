import type { UltimateDarkTower } from "ultimatedarktower";

/** A write that sits this long is abandoned. Far inside the library queue's 30 s stall. */
export const FLASH_WRITE_TIMEOUT_MS = 400;

export interface FlashEdge {
  /** Milliseconds from the start of the burst. */
  atMs: number;
  on: boolean;
}

/**
 * On and off edges for `flashesPerSecond` across `durationMs`, starting with `startOn`.
 * Consecutive edges always differ, and the count is `rate × seconds × 2`.
 */
export const flashEdges = (
  flashesPerSecond: number,
  durationMs: number,
  startOn: boolean,
): FlashEdge[] => {
  const count = flashesPerSecond * (durationMs / 1000) * 2;
  if (!Number.isInteger(count) || count < 2) {
    throw new Error(
      `Flash rate ${flashesPerSecond} Hz over ${durationMs} ms is not a whole number of edges.`,
    );
  }
  const halfMs = 1000 / (flashesPerSecond * 2);
  return Array.from({ length: count }, (_, index) => ({
    atMs: index * halfMs,
    on: index % 2 === 0 ? startOn : !startOn,
  }));
};

const LIGHT_ON = 1;
const LIGHT_OFF = 0;

export interface FlashParams {
  layerIndex: number;
  lightIndex: number;
  flashesPerSecond: number;
  durationMs: number;
}

export interface FlashClock {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}

const withTimeout = (call: Promise<void>, ms: number) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Light write did not finish within ${ms} ms.`)),
      ms,
    );
    call
      .then(
        () => resolve(),
        (error: unknown) => reject(error),
      )
      .finally(() => clearTimeout(timer));
  });

/**
 * Toggles one light for the burst. Every write changes that light's effect, so a no-op cannot
 * hold the library queue. Writes go through `sendTowerState`, which skips that queue; each one
 * gives up after `writeTimeoutMs` instead of waiting 30 s.
 * The light is left off when the burst ends, if that is itself a change.
 */
export const flashOneLight = async (
  tower: UltimateDarkTower,
  params: FlashParams,
  clock: FlashClock,
  writeTimeoutMs = FLASH_WRITE_TIMEOUT_MS,
) => {
  const { layerIndex, lightIndex, flashesPerSecond, durationMs } = params;
  const read = () => {
    const light = tower.getCurrentTowerState().layer[layerIndex]?.light[lightIndex];
    if (!light) {
      throw new Error(`Light ${layerIndex}/${lightIndex} is not in the tower state.`);
    }
    return light.effect === LIGHT_ON;
  };

  const write = async (on: boolean) => {
    const state = tower.getCurrentTowerState();
    const light = state.layer[layerIndex]?.light[lightIndex];
    if (!light) {
      throw new Error(`Light ${layerIndex}/${lightIndex} is not in the tower state.`);
    }
    const effect = on ? LIGHT_ON : LIGHT_OFF;
    // A write that changes nothing is not sent. The tower stays silent for those, and a
    // queued command would then sit for 30 s.
    if (light.effect === effect) return false;
    light.effect = effect;
    light.loop = on;
    await withTimeout(tower.sendTowerState(state), writeTimeoutMs);
    return true;
  };

  const currentOn = read();
  const edges = flashEdges(flashesPerSecond, durationMs, !currentOn);
  const halfMs = 1000 / (flashesPerSecond * 2);
  const started = clock.now();
  let lastOn = currentOn;
  let sent = 0;

  for (const edge of edges) {
    const target = started + edge.atMs;
    // A write that ran long has already missed this edge. Skipping it keeps the rate
    // instead of dumping the late edges in a row.
    if (clock.now() > target + halfMs) continue;
    const wait = target - clock.now();
    if (wait > 0) await clock.sleep(wait);
    if (edge.on === lastOn) continue;
    if (await write(edge.on)) {
      sent += 1;
      lastOn = edge.on;
    }
  }

  if (lastOn && (await write(false))) sent += 1;
  if (sent === 0) {
    throw new Error("No light command changed the tower, so nothing was sent.");
  }
};
