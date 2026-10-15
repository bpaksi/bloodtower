import { describe, expect, it } from "vitest";
import { activeMillis, pausedMillis, spanMillis, timingMarkSchema } from "./index.ts";

const session = "session-1";

const raw = (overrides: Record<string, unknown> = {}) => ({
  sessionId: session,
  kind: "moment",
  subject: "proving-ground.01",
  startMonoMs: 0,
  endMonoMs: 1000,
  startWall: "2026-10-15T17:00:00.000Z",
  endWall: "2026-10-15T17:00:01.000Z",
  deviceId: null,
  cause: null,
  hunter: null,
  result: null,
  ...overrides,
});

const mark = (overrides: Record<string, unknown> = {}) => timingMarkSchema.parse(raw(overrides));

describe("timing marks", () => {
  it("accepts each PRD-41 kind with monotonic and wall time", () => {
    expect(mark().kind).toBe("moment");
    expect(
      mark({
        kind: "phase",
        subject: "night",
      }).kind,
    ).toBe("phase");
    expect(
      mark({
        kind: "pick",
        subject: "look",
        hunter: "alpha",
        deviceId: "device-1",
      }).hunter,
    ).toBe("alpha");
    expect(mark({ kind: "table-talk", subject: "share" }).kind).toBe("table-talk");
    expect(mark({ kind: "cue", subject: "bell" }).kind).toBe("cue");
    expect(
      mark({
        kind: "battle-screen",
        subject: "fight",
        result: "won",
      }).result,
    ).toBe("won");
    expect(
      mark({
        kind: "pause",
        subject: "alpha",
        cause: "unheld-hunter",
        hunter: "alpha",
      }).cause,
    ).toBe("unheld-hunter");
  });

  it("keeps an open mark unknown instead of ending it at zero", () => {
    const open = mark({ endMonoMs: null, endWall: null });
    expect(open.endMonoMs).toBeNull();
    expect(spanMillis(open)).toBeNull();
    expect(
      timingMarkSchema.safeParse({ ...open, endMonoMs: null, endWall: open.startWall }).success,
    ).toBe(false);
  });

  it("rejects a pause without a cause and a cause on any other kind", () => {
    expect(timingMarkSchema.safeParse(raw({ kind: "pause", cause: null })).success).toBe(false);
    expect(timingMarkSchema.safeParse(raw({ kind: "moment", cause: "host-pause" })).success).toBe(
      false,
    );
    expect(
      timingMarkSchema.safeParse(raw({ kind: "pause", cause: "host-pause", hunter: "alpha" }))
        .success,
    ).toBe(false);
    expect(
      timingMarkSchema.safeParse(raw({ kind: "pause", cause: "disconnect", hunter: null })).success,
    ).toBe(false);
  });

  it("rejects a non-finite offset and an end before the start", () => {
    expect(timingMarkSchema.safeParse(raw({ startMonoMs: Number.NaN })).success).toBe(false);
    expect(timingMarkSchema.safeParse(raw({ endMonoMs: Number.POSITIVE_INFINITY })).success).toBe(
      false,
    );
    expect(timingMarkSchema.safeParse(raw({ startMonoMs: 50, endMonoMs: 10 })).success).toBe(false);
  });

  it("excludes pauses from active time and does not turn an open pause into zero", () => {
    const moment = mark();
    const pause = mark({
      kind: "pause",
      subject: "alpha",
      cause: "unheld-hunter",
      hunter: "alpha",
      startMonoMs: 0,
      endMonoMs: 100,
      startWall: "2026-10-15T17:00:00.000Z",
      endWall: "2026-10-15T17:00:00.100Z",
    });
    const overlap = mark({
      kind: "pause",
      subject: "beta",
      cause: "disconnect",
      hunter: "beta",
      startMonoMs: 50,
      endMonoMs: 150,
      startWall: "2026-10-15T17:00:00.050Z",
      endWall: "2026-10-15T17:00:00.150Z",
    });
    expect(pausedMillis([pause, overlap])).toBe(150);
    expect(activeMillis(1000, [moment, pause, overlap])).toBe(850);
    expect(
      pausedMillis([mark({ kind: "pause", cause: "host-pause", endMonoMs: null, endWall: null })]),
    ).toBe(null);
    expect(activeMillis(10, [pause])).toBeNull();
    expect(activeMillis(0, [])).toBe(0);
  });
});
