import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PackedLine } from "../../lib/audio/packedLine.ts";
import { PackedLineScene } from "./PackedLineScene.tsx";

const LINE_ID = "seal-break.01~vo-01";
const CAPTION =
  "The roads are clear, and a seal breaks like an old oath giving way. Ahead stands the Ruined Keep.";
const ORIGIN = "http://127.0.0.1:4788";

const full: PackedLine = {
  packId: "test",
  lineId: LINE_ID,
  caption: CAPTION,
  audio: LINE_ID,
  painting: "painting.cover",
  glow: "glow.cover",
  play: 1,
};

const render = (line: PackedLine) =>
  renderToStaticMarkup(
    createElement(PackedLineScene, { line, volume: 0.8, origin: ORIGIN, onDone: () => {} }),
  );

describe("A1-8b-2 PackedLineScene", () => {
  it("shows the exact caption (EV-01)", () => {
    const markup = render(full);
    expect(markup).toContain(`data-packed-caption="">${CAPTION}</p>`);
  });

  it("plays the voice from an audio element fetched by asset id (EV-01, EV-04)", () => {
    const markup = render(full);
    expect(markup).toContain(
      `<audio data-packed-audio="${LINE_ID}" preload="auto" src="${ORIGIN}/packs/test/by-id/seal-break.01~vo-01">`,
    );
    expect(markup).not.toMatch(/base64|data:/u);
  });

  it("draws the cover and its glow as two layers of one box, the glow over the cover (EV-02)", () => {
    const markup = render(full);
    const painting = markup.indexOf('data-packed-painting="painting.cover"');
    const glow = markup.indexOf('data-packed-glow="glow.cover"');
    expect(painting).toBeGreaterThan(-1);
    expect(glow).toBeGreaterThan(painting);
    expect(markup).toContain(`src="${ORIGIN}/packs/test/by-id/painting.cover"`);
    expect(markup).toContain(`src="${ORIGIN}/packs/test/by-id/glow.cover"`);
    // Both layers share the one class that sizes and places them.
    expect(markup.match(/class="bt-packed-layer[^"]*"/gu)).toHaveLength(2);
  });

  it("asks for no portrait, mouth or avatar (EV-02)", () => {
    expect(render(full)).not.toMatch(/portrait|mouth|avatar/iu);
  });

  it("with no glow packed draws the cover alone", () => {
    const markup = render({ ...full, glow: null });
    expect(markup).toContain("data-packed-painting");
    expect(markup).not.toContain("data-packed-glow");
  });

  it("caption only: no audio element and no picture when nothing is packed (EV-05)", () => {
    const markup = render({ ...full, audio: null, painting: null, glow: null });
    expect(markup).not.toContain("<audio");
    expect(markup).not.toContain("<img");
    expect(markup).toContain(`data-packed-caption="">${CAPTION}</p>`);
  });

  it("the CSS stacks both layers in the same box and blends the glow over the cover", () => {
    const css = readFileSync(join(import.meta.dirname, "board.css"), "utf8");
    const layer = /\.bt-packed-layer\s*\{([^}]*)\}/u.exec(css)?.[1] ?? "";
    expect(layer).toMatch(/position:\s*absolute/u);
    expect(layer).toMatch(/inset:\s*0/u);
    expect(layer).toMatch(/object-fit:\s*cover/u);
    const glow = /\.bt-packed-glow\s*\{([^}]*)\}/u.exec(css)?.[1] ?? "";
    expect(glow).toMatch(/mix-blend-mode:\s*screen/u);
    expect(glow).not.toMatch(/inset|transform|top|left|width|height/u);
  });
});
