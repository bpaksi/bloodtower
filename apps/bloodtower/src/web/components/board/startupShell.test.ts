import { type StoryboardState, storyboardStatePayloadSchema } from "bloodtower-protocols";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NOT_CHOSEN } from "../../lib/screens";
import { StoryBoard, SummaryPanel } from "./StoryBoard";

type Summary = NonNullable<StoryboardState["summary"]>;

const TOWER: StoryboardState["tower"] = {
  connection: "connected",
  battery: { state: "unavailable" },
  calibrated: { state: "known", calibrated: true },
};

const EMPTY: Summary = { game: null, settings: null, tower: null, hunters: null, setup: [] };

const FILLED: Summary = {
  game: { id: "test", title: "Proving ground", cover: null },
  settings: [{ id: "length", label: "Length", value: "Long" }],
  tower: "connected",
  hunters: [
    { id: "alpha", name: "Agnes", holders: ["device-1"] },
    { id: "beta", name: "Tomas", holders: [] },
  ],
  setup: [
    { id: "a", label: "Lay out the board.", done: true },
    { id: "b", label: "Ready the decks.", done: false },
  ],
};

const card = (id: string, title: string) => ({
  id,
  title,
  blurb: null,
  tagline: `${title} tagline.`,
  cover: null,
  players: { min: 1, max: 4 },
  playable: true,
  loadable: true,
  tower: "optional" as const,
});

const state = (over: Partial<StoryboardState>): StoryboardState =>
  storyboardStatePayloadSchema.parse({
    screen: "pick-story",
    stage: "lobby",
    hunters: [{ id: "alpha", name: "Agnes", holders: ["device-1"], disconnected: false }],
    join: { code: "048213", url: "http://192.168.1.5:4787/join?code=048213", reachable: true },
    prompt: null,
    moment: null,
    pause: null,
    tower: TOWER,
    gate: { canBegin: true, unheld: [] },
    lock: null,
    ...over,
  });

const render = (s: StoryboardState) =>
  renderToStaticMarkup(createElement(StoryBoard, { state: s }));

/** Each summary row's text, keyed by its `data-summary-item`. */
const rows = (html: string): Record<string, { empty: boolean; text: string }> =>
  Object.fromEntries(
    [...html.matchAll(/data-summary-item="(\w+)"([^>]*)>(.*?)<\/div>/g)].map((match) => [
      match[1],
      { empty: (match[2] ?? "").includes('data-empty="true"'), text: match[3] ?? "" },
    ]),
  );

describe("SummaryPanel (R3-UI-25)", () => {
  it("reads not chosen yet on every row before anything is chosen", () => {
    const html = renderToStaticMarkup(
      createElement(SummaryPanel, { summary: EMPTY, tower: TOWER }),
    );
    expect(html).toContain('data-summary=""');
    const items = rows(html);
    expect(Object.keys(items)).toEqual(["game", "settings", "tower", "hunters", "setup"]);
    for (const item of Object.values(items)) {
      expect(item.empty).toBe(true);
      expect(item.text).toContain(NOT_CHOSEN);
    }
  });

  it("shows each filled row, the setup row styled like the others", () => {
    const html = renderToStaticMarkup(
      createElement(SummaryPanel, { summary: FILLED, tower: TOWER }),
    );
    const items = rows(html);
    expect(items.game).toEqual({ empty: false, text: expect.stringContaining("Proving ground") });
    expect(items.settings?.text).toContain("Length: Long");
    expect(items.tower?.text).toContain("Connected");
    expect(items.hunters?.text).toContain("device-1: Agnes");
    expect(items.hunters?.text).toContain(`${NOT_CHOSEN}: Tomas`);
    expect(items.setup?.text).toContain("1 of 2 done");
    // The steps' labels are TV-only detail: present, but marked so CSS shows them on the TV only.
    expect(items.setup?.text).toContain(
      '<span class="bt-summary-detail">Lay out the board.</span>',
    );
    // Every row has the same shape: one label, one value holding its lines.
    for (const item of Object.values(items)) {
      expect(item.empty).toBe(false);
      expect(item.text.match(/<dt class="bt-lbl">/g)).toHaveLength(1);
      expect(item.text.match(/<dd>/g)).toHaveLength(1);
    }
  });
});

describe("start-up shell", () => {
  it("puts the screen in one dialog frame, the summary and join in the right column", () => {
    const html = render(state({ screen: "game-settings", summary: FILLED }));
    expect(html).toContain('data-board-mode="startup"');
    expect(html.match(/data-illusionist-asset="dialog-frame"/g)).toHaveLength(1);
    expect(html).not.toContain('class="bt-hunters"');
    const side = html.slice(html.indexOf('class="bt-startup-side"'));
    expect(side).toContain('data-summary=""');
    expect(side).toContain('class="bt-qr"');
    // The next prompt sits under the dialog, inside the story column.
    const story = html.slice(html.indexOf('class="bt-story"'), html.indexOf("bt-startup-side"));
    expect(story.indexOf("dialog-frame")).toBeLessThan(story.indexOf("data-next-band"));
  });

  it("keeps quit out of both modes: the base layout, with any summary sent and the join block", () => {
    const html = render(state({ screen: "quit", stage: "ended", summary: FILLED }));
    expect(html).not.toContain("data-board-mode");
    expect(html).not.toContain("dialog-frame");
    expect(html).toContain('data-summary=""');
    expect(html).toContain('class="bt-pub bt-panel"');
  });

  it("shows two packs with the other one peeking once, on the right", () => {
    const html = render(
      state({
        stories: {
          cards: [card("test", "Proving ground"), card("dracula", "The Count of Vellmoor")],
          focus: "test",
          current: "test",
        },
      }),
    );
    const carousel = html.slice(html.indexOf('class="bt-carousel"'));
    expect(carousel.match(/data-story-peek=/g)).toHaveLength(1);
    expect(carousel).toContain('data-carousel-side="next" data-story-peek="dracula"');
    expect(carousel).toContain("<h2>Proving ground</h2>");
    expect(carousel).toContain("4 hunters");
    expect(carousel).toContain("Proving ground tagline.");
  });
});
