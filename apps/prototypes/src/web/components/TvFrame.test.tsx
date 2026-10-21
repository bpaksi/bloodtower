import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { tvPx } from "../lib/tv.ts";
import { TvFrame } from "./TvFrame.tsx";

describe("TvFrame", () => {
  it("is 16:9, sizes itself from the viewport and scales type with its width", () => {
    const html = renderToStaticMarkup(
      <TvFrame>
        <p style={{ fontSize: tvPx(28) }}>hello</p>
      </TvFrame>,
    );
    expect(html).toContain("aspect-ratio:16 / 9");
    expect(html).toContain("min(100vw, calc(100vh * 16 / 9))");
    expect(html).toContain("--tv-px:calc(100cqw / 1920)");
    expect(html).toContain("font-size:calc(28 * var(--tv-px))");
    expect(html).toContain("hello");
  });
});
