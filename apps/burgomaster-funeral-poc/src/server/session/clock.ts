/** Time source for the scene. Tests pass a clock they can move; the host uses the system clock. */
export interface Clock {
  now: () => Date;
  schedule: (ms: number, run: () => void) => { cancel: () => void };
}

export const systemClock = (): Clock => ({
  now: () => new Date(),
  schedule: (ms, run) => {
    const id = setTimeout(run, ms);
    return { cancel: () => clearTimeout(id) };
  },
});

interface Scheduled {
  at: number;
  run: () => void;
  dead: boolean;
}

/** A clock whose timers run only when `advance` says so. */
export class FakeClock implements Clock {
  private time = Date.parse("2026-10-14T18:00:00.000Z");
  private readonly items: Scheduled[] = [];

  now = (): Date => new Date(this.time);

  schedule = (ms: number, run: () => void) => {
    const item = { at: this.time + ms, run, dead: false };
    this.items.push(item);
    return {
      cancel: () => {
        item.dead = true;
      },
    };
  };

  /** Moves forward by `ms`, running every timer that comes due, including ones they schedule. */
  advance(ms: number) {
    const target = this.time + ms;
    for (;;) {
      const due = this.items
        .filter((item) => !item.dead && item.at <= target)
        .sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      due.dead = true;
      this.time = due.at;
      due.run();
    }
    this.time = target;
  }
}
