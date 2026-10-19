import { describe, expect, it, vi } from "vitest";
import { turnAround } from "./VisualLayer.tsx";

const END = 800;

/**
 * Just enough of a Web Animation, with the spec's play() auto-rewind: playing backwards from
 * time 0 (or an unresolved time) jumps to the end, playing forwards from the end jumps to 0.
 */
class FakeAnimation {
  playbackRate = 1;
  currentTime: number | null;
  playState: "running" | "finished" | "idle";
  effect = { getComputedTiming: () => ({ endTime: END }) };
  constructor(time: number | null, rate: number, state: "running" | "finished") {
    this.currentTime = time;
    this.playbackRate = rate;
    this.playState = state;
  }
  play() {
    const t = this.currentTime;
    if (this.playbackRate < 0 && (t === null || t <= 0)) this.currentTime = END;
    if (this.playbackRate > 0 && (t === null || t >= END)) this.currentTime = 0;
    this.playState = "running";
  }
  cancel() {
    this.currentTime = null;
    this.playState = "idle";
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
      const animation = new FakeAnimation(time, 1, "running");
      const { element, onGone } = turn(animation, "out");
      expect(animation.currentTime, `time ${time}`).not.toBe(END);
      expect(animation.playState).toBe("idle");
      expect(element.style.opacity).toBe("0");
      expect(onGone).toHaveBeenCalledOnce();
    }
  });

  it("leaves a zoom out that has not moved yet fully shown when the visual comes back", () => {
    const animation = new FakeAnimation(END, -1, "running");
    const { onGone } = turn(animation, "in");
    expect(animation.currentTime).toBe(END);
    expect(animation.playbackRate).toBe(1);
    expect(onGone).not.toHaveBeenCalled();
  });

  it("turns a running zoom around from where it is, both ways", () => {
    const going = new FakeAnimation(300, 1, "running");
    turn(going, "out");
    expect([going.currentTime, going.playbackRate]).toEqual([300, -1]);
    const coming = new FakeAnimation(500, -1, "running");
    turn(coming, "in");
    expect([coming.currentTime, coming.playbackRate]).toEqual([500, 1]);
  });

  it("zooms a finished zoom in out from its end, and a finished zoom out in from its start", () => {
    const shown = new FakeAnimation(END, 1, "finished");
    turn(shown, "out");
    expect([shown.currentTime, shown.playbackRate, shown.playState]).toEqual([END, -1, "running"]);
    const hidden = new FakeAnimation(0.5, -1, "finished");
    turn(hidden, "in");
    expect([hidden.currentTime, hidden.playbackRate, hidden.playState]).toEqual([
      0.5,
      1,
      "running",
    ]);
  });
});
