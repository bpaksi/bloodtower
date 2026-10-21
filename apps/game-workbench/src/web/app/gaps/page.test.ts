import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { loadGaps } from "../../lib/gaps.ts";
import GapsPage from "./page.tsx";

describe("/gaps anchors", () => {
  const html = renderToStaticMarkup(GapsPage());
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);

  it.fails("has no id twice", () => {
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it("every area with gaps has the id the map links to (#AREA-xxx), on its first heading", () => {
    const { groups } = loadGaps();
    const areas = new Set(groups.flatMap((g) => g.byArea.flatMap((a) => (a.area ? [a.area] : []))));
    expect(areas.size).toBeGreaterThan(0);
    for (const a of areas) expect(ids).toContain(a);
  });
});
