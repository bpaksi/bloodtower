import { type StoryboardState, storyboardStatePayloadSchema } from "bloodtower-protocols";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StoryBoard } from "../components/board/StoryBoard";
import { holdingText, joinWarning, pauseText, waitingStoryboard } from "./boardView";
import { joinQrSvg } from "./qr";

const state = (): StoryboardState =>
  storyboardStatePayloadSchema.parse({
    screen: "play",
    stage: "paused",
    hunters: [
      { id: "alpha", name: "Alpha", holders: ["device-1"], disconnected: false },
      { id: "beta", name: "Beta", holders: [], disconnected: false },
    ],
    join: { code: "048213", url: "http://127.0.0.1:4787/join?code=048213", reachable: false },
    prompt: { id: "continue-0", label: "Continue" },
    moment: {
      id: "proving-ground.01",
      kind: "still",
      text: "The proving ground is quiet.",
      still: "fx.hall",
      fallbackAudio: "sfx.bell",
    },
    pause: { cause: "disconnect", hunter: "alpha" },
    tower: {
      connection: "connected",
      battery: { state: "known", percent: 0 },
      calibrated: { state: "unavailable" },
    },
    gate: { canBegin: false, unheld: ["beta"] },
    lock: null,
  });

const interactive = /<(button|input|textarea|select|a|form)\b/i;

describe("story board", () => {
  it("renders the join code, hunters, prompt, moment and tower status with no controls", () => {
    const qr = joinQrSvg("http://127.0.0.1:4787/join?code=048213");
    expect(qr).toContain("<svg");
    expect(qr).not.toContain("<script");
    expect(qr.toLowerCase()).not.toContain("private");
    const html = renderToStaticMarkup(createElement(StoryBoard, { state: state() }));
    expect(html).not.toMatch(interactive);
    expect(html).toContain("048213");
    expect(html).toContain("Alpha");
    expect(html).toContain("Beta");
    expect(html).toContain("Continue");
    expect(html).toContain("The proving ground is quiet.");
    expect(html).toContain("Fallback sfx.bell");
    expect(html).toContain("Waiting for someone to hold Alpha.");
    expect(html).toContain("Alpha — device-1");
    expect(html).toContain("Beta — waiting");
    expect(html).toContain("iPads can&#x27;t reach this address.");
    expect(html).toContain("Battery 0%");
    expect(html).toContain("Calibration unavailable");
    expect(html).not.toContain("ipad:");
    expect(html).not.toContain("data-action");
  });

  it("cannot be handed a private line", () => {
    const base = state();
    const parse = (value: unknown) => storyboardStatePayloadSchema.safeParse(value).success;
    expect(parse(base)).toBe(true);
    // The shared-moment rule: a private moment is refused by its id.
    expect(
      parse({ ...base, moment: { ...base.moment, id: "proving-ground.02.private.alpha" } }),
    ).toBe(false);
    // Strictness: the payload has no field that could carry a line, so any extra key is refused.
    expect(
      parse({
        ...base,
        moment: { ...base.moment, lines: [{ speaker: "alpha", text: "Only Alpha hears this." }] },
      }),
    ).toBe(false);
  });

  it("renders the Keeper captions for grey-stair.03 before the avatar loads", () => {
    const html = renderToStaticMarkup(
      createElement(StoryBoard, {
        state: {
          ...state(),
          moment: {
            id: "grey-stair.03",
            kind: "clip",
            text: null,
            still: "av.keeper",
            fallbackAudio: null,
          },
        },
      }),
    );
    expect(html).toContain("Light them if you can. The key is at the bottom. It always is.");
    expect(html).toContain("Mind the third step.");
    expect(html).toContain("keep the lamp lit until you");
    expect(html).not.toContain("ipad:");
    expect(html).not.toMatch(interactive);
  });

  it("shows unavailable when the session has not started", () => {
    const html = renderToStaticMarkup(createElement(StoryBoard, { state: waitingStoryboard() }));
    expect(html).not.toMatch(interactive);
    expect(html).toContain("Join code unavailable.");
    expect(html).toContain("Hunters unavailable.");
    expect(html).toContain("Battery unavailable");
    expect(html).not.toContain("0%");
    expect(pauseText(null)).toBeNull();
  });

  it("names a disconnected holder and a hunter nobody holds", () => {
    expect(
      holdingText({ id: "alpha", name: "Alpha", holders: ["device-1"], disconnected: true }),
    ).toBe("disconnected (device-1)");
    expect(holdingText({ id: "beta", name: "Beta", holders: [], disconnected: false })).toBe(
      "waiting",
    );
    expect(
      holdingText({ id: "gamma", name: "Gamma", holders: ["device-2"], disconnected: false }),
    ).toBe("device-2");
  });

  it("warns only when the join address is loopback-only", () => {
    const join = { code: "048213", url: "http://192.168.1.20:4787/join?code=048213" };
    expect(joinWarning({ ...join, reachable: true })).toBeNull();
    expect(joinWarning({ ...join, reachable: false })).toContain("Connect this Mac to Wi-Fi");
    expect(joinWarning(null)).toBeNull();
  });
});
