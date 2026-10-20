import {
  FLOW_SCREENS,
  KEEPER_MOMENT_ID,
  type StoryboardState,
  storyboardStatePayloadSchema,
} from "bloodtower-protocols";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { isVisualMoment } from "../../lib/audio/layers.ts";
import { boardLayer } from "./boardLayer.ts";
import { StoryBoard } from "./StoryBoard";

type Moment = StoryboardState["moment"];

const moment = (over: Partial<NonNullable<Moment>>): NonNullable<Moment> => ({
  id: "grey-stair.01",
  kind: "text-card",
  text: "A line.",
  still: null,
  fallbackAudio: null,
  ...over,
});

const MOMENTS: [string, Moment][] = [
  ["none", null],
  ["text card", moment({})],
  ["pick card", moment({ kind: "pick-card" })],
  ["still", moment({ kind: "still", still: "fx.stair" })],
  ["still kind without an asset", moment({ kind: "still" })],
  ["clip", moment({ kind: "clip" })],
  ["text card with a screen half", moment({ still: "fx.bell" })],
  ["Keeper", moment({ id: KEEPER_MOMENT_ID, kind: "clip", text: null })],
];

describe("boardLayer", () => {
  it("is startup on every screen but play, whatever the moment", () => {
    for (const screen of FLOW_SCREENS.filter((s) => s !== "play")) {
      for (const [, m] of MOMENTS) expect(boardLayer({ screen, moment: m })).toBe("startup");
    }
  });

  it("is visual in play exactly when LiveBoard's audio takes the visual path", () => {
    for (const screen of FLOW_SCREENS) {
      for (const [name, m] of MOMENTS) {
        // The same expression LiveBoard passes to pickLayers({ visual }).
        const audioVisual = screen === "play" && isVisualMoment(m);
        expect(boardLayer({ screen, moment: m }) === "visual", `${screen} ${name}`).toBe(
          audioVisual,
        );
      }
    }
  });

  it("is waiting in play with no moment or a text-only moment", () => {
    expect(boardLayer({ screen: "play", moment: null })).toBe("waiting");
    expect(boardLayer({ screen: "play", moment: moment({}) })).toBe("waiting");
    expect(boardLayer({ screen: "play", moment: moment({ kind: "pick-card" }) })).toBe("waiting");
    expect(boardLayer({ screen: "play", moment: moment({ kind: "still", still: "x" }) })).toBe(
      "visual",
    );
  });
});

const playState = (m: Moment): StoryboardState =>
  storyboardStatePayloadSchema.parse({
    screen: "play",
    stage: "playing",
    hunters: [{ id: "alpha", name: "Agnes", holders: ["device-1"], disconnected: false }],
    join: { code: "048213", url: "http://192.168.1.5:4787/join?code=048213", reachable: true },
    prompt: { id: "continue-0", label: "Continue" },
    moment: m,
    pause: null,
    tower: {
      connection: "connected",
      battery: { state: "unavailable" },
      calibrated: { state: "unavailable" },
    },
    gate: { canBegin: true, unheld: [] },
    lock: null,
    packId: "test",
  });

const render = (state: StoryboardState) =>
  renderToStaticMarkup(createElement(StoryBoard, { state }));

/** The markup inside the visual layer, or null when there is none. */
const layerHtml = (html: string) => {
  const start = html.indexOf('data-visual-layer=""');
  return start < 0 ? null : html.slice(start, html.lastIndexOf("</main>"));
};

describe("StoryBoard visual layer", () => {
  it("puts a still, its camera well and the moment text in the layer, not in the page", () => {
    const html = render(
      playState(
        moment({
          kind: "still",
          still: "fx.stair",
          text: "A grey stair climbs into the dark. [pause 1] Someone has left the lamps unlit.",
        }),
      ),
    );
    expect(html).toContain('data-board-layer="visual"');
    const layer = layerHtml(html);
    expect(layer).not.toBeNull();
    expect(layer).toContain('data-visual-phase="in"');
    expect(layer).toContain('class="bt-plate"');
    expect(layer).toContain("data-camera-still");
    expect(layer).toContain('data-still="fx.stair"');
    expect(layer).toContain('data-moment-caption=""');
    expect(layer).toContain("A grey stair climbs into the dark. Someone has left the lamps unlit.");
    // One camera well and one copy of the text on the whole board.
    expect(html.match(/data-camera-still/g)).toHaveLength(1);
    expect(html.match(/A grey stair climbs/g)).toHaveLength(1);
    // The page under the layer keeps the scene heading for the zoom.
    expect(html).toContain('data-under-visual=""');
    expect(html).toContain("A Grey Stair");
    // No controls in the layer (the board has none but the Sound dialog's).
    expect(layer).not.toMatch(/<(button|input|textarea|select|a|form)\b/i);
  });

  it("puts the Keeper in the layer and leaves the page under it bare", () => {
    const html = render(
      playState(moment({ id: KEEPER_MOMENT_ID, kind: "clip", text: null, still: "av.keeper" })),
    );
    expect(html).toContain('data-board-layer="visual"');
    const layer = layerHtml(html);
    expect(layer).toContain('class="bt-keeper"');
    expect(layer).toContain('data-board-caption=""');
    expect(layer).not.toContain("data-camera-still");
    expect(html.match(/class="bt-keeper"/g)).toHaveLength(1);
    expect(html).not.toContain("data-waiting-dialog");
    expect(html).toContain('data-keeper-stage=""');
  });

  it("reads unavailable for a clip it cannot draw, and never shows a caption it does not have", () => {
    const html = render(playState(moment({ id: "grey-stair.09", kind: "clip", text: null })));
    const layer = layerHtml(html);
    expect(layer).toContain("Visual unavailable.");
    expect(layer).toContain('data-unavailable=""');
    expect(layer).not.toContain("data-moment-caption");
  });

  it("has no layer for a text moment or a start-up screen", () => {
    const text = render(playState(moment({ text: "A bell marks the step." })));
    expect(text).toContain('data-board-layer="waiting"');
    expect(layerHtml(text)).toBeNull();
    // The waiting dialog (visuals step 9): the real frame holds the text and the prompt band.
    expect(text).toContain('data-illusionist-asset="dialog-frame" data-dialog-size="compact"');
    expect(text).toContain('<p class="bt-wait-text" data-moment-caption="">A bell marks the step.');
    expect(text.indexOf("data-waiting-dialog")).toBeLessThan(text.indexOf("data-next-band"));
    expect(text.match(/data-next-band/g)).toHaveLength(1);
    expect(text).not.toContain('class="bt-page');
    const startup = render({ ...playState(null), screen: "begin" });
    expect(startup).toContain('data-board-layer="startup"');
    expect(layerHtml(startup)).toBeNull();
  });
});
