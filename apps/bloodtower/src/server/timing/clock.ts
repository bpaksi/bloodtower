/** Monotonic milliseconds from a session origin, and a UTC wall time. */
export interface Clock {
  monoMs: () => number;
  wall: () => string;
}

/** `performance.now` offset from the moment this clock is created. Wall time is UTC. */
export const systemClock = (): Clock => {
  const origin = performance.now();
  return {
    monoMs: () => performance.now() - origin,
    wall: () => new Date().toISOString(),
  };
};

/** A clock tests can move. Both times start at the given UTC instant. */
export const stepClock = (
  startWall = "2026-10-15T18:00:00.000Z",
): Clock & {
  advance: (ms: number) => void;
} => {
  let mono = 0;
  let wallMs = Date.parse(startWall);
  return {
    monoMs: () => mono,
    wall: () => new Date(wallMs).toISOString(),
    advance(ms: number) {
      if (!Number.isFinite(ms) || ms < 0) throw new Error("A clock advances by a finite pause.");
      mono += ms;
      wallMs += ms;
    },
  };
};
