import { describe, expect, it, vi } from "vitest";
import { ranOut, turnAround } from "./VisualLayer.tsx";

const END = 800;

/**
 * Just enough of a Web Animation, with the spec's play() auto-rewind: playing backwards from
 * time 0 (or an unresolved time) jumps to the end, playing forwards from the end jumps to 0.
 * Like a browser, it reads "finished" whenever its time is at the end it is playing towards,
 * straight after a seek or a change of rate too. An unresolved time is a pending play: "running".
 */
class FakeAnimation {
  playbackRate = 1;
  currentTime: number | null;
  private cancelled = false;
  effect = { getComputedTiming: () => ({ endTime: END }) };
  constructor(time: number | null, rate: number) {
    this.currentTime = time;
    this.playbackRate = rate;
  }
  get playState(): "running" | "finished" | "idle" {
    if (this.cancelled) return "idle";
    const t = this.currentTime;
    if (t !== null && this.playbackRate > 0 && t >= END) return "finished";
    if (t !== null && this.playbackRate < 0 && t <= 0) return "finished";
    return "running";
  }
  play() {
    const t = this.currentTime;
    if (this.playbackRate < 0 && (t === null || t <= 0)) this.currentTime = END;
    if (this.playbackRate > 0 && (t === null || t >= END)) this.currentTime = 0;
    this.cancelled = false;
  }
  cancel() {
    this.currentTime = null;
    this.cancelled = true;
  }
}

const turn = (animation: FakeAnimation, phase: "in" | "out") => {
  const element = { style: { opacity: "" } };
  const onGone = vi.fn();
  turnAround(animation as unknown as Animation, phase, element as unknown as HTMLElement, onGone);
  return { element, onGone };
};

describe("turnAround", () => {
  it("drops a zoom in that has not moved yet instead of rewinding it to fully shown", () => {
    for (const time of [0, null]) {
      const animation = new FakeAnimation(time, 1);
      const { element, onGone } = turn(animation, "out");
      expect(animation.currentTime, `time ${time}`).not.toBe(END);
      expect(animation.playState).toBe("idle");
      expect(element.style.opacity).toBe("0");
      expect(onGone).toHaveBeenCalledOnce();
    }
  });

  it("leaves a zoom out that has not moved yet fully shown when the visual comes back", () => {
    const animation = new FakeAnimation(END, -1);
    const { onGone } = turn(animation, "in");
    expect(animation.currentTime).toBe(END);
    expect(animation.playbackRate).toBe(1);
    expect(animation.playState).toBe("finished");
    expect(onGone).not.toHaveBeenCalled();
  });

  it("turns a running zoom around from where it is, both ways", () => {
    const going = new FakeAnimation(300, 1);
    turn(going, "out");
    expect([going.currentTime, going.playbackRate]).toEqual([300, -1]);
    const coming = new FakeAnimation(500, -1);
    turn(coming, "in");
    expect([coming.currentTime, coming.playbackRate]).toEqual([500, 1]);
  });

  it("zooms a finished zoom in out from its end, and a finished zoom out in from its start", () => {
    const shown = new FakeAnimation(END, 1);
    expect(shown.playState).toBe("finished");
    turn(shown, "out");
    expect([shown.currentTime, shown.playbackRate, shown.playState]).toEqual([END, -1, "running"]);
    const hidden = new FakeAnimation(0, -1);
    expect(hidden.playState).toBe("finished");
    turn(hidden, "in");
    expect([hidden.currentTime, hidden.playbackRate, hidden.playState]).toEqual([0, 1, "running"]);
  });
});

describe("ranOut", () => {
  it("is true only for a zoom out back at its start", () => {
    expect(ranOut(new FakeAnimation(0, -1) as unknown as Animation)).toBe(true);
    expect(ranOut(new FakeAnimation(null, -1) as unknown as Animation)).toBe(true);
    expect(ranOut(new FakeAnimation(300, -1) as unknown as Animation)).toBe(false);
    expect(ranOut(new FakeAnimation(END, 1) as unknown as Animation)).toBe(false);
  });

  it("ignores the finish of a zoom out turned back at its end, once the phase flips out again", () => {
    // Out from fully in, turned back before it moved (left finished at the end, finish queued),
    // then out again before that finish event arrives: the event must not drop the layer.
    const animation = new FakeAnimation(END, 1);
    turn(animation, "out");
    turn(animation, "in");
    turn(animation, "out");
    expect(animation.playbackRate).toBe(-1);
    expect(ranOut(animation as unknown as Animation)).toBe(false);
  });
});
