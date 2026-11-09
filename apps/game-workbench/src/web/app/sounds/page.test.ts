import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SoundsPage from "./page.tsx";

const render = async (q: { tone?: string } = {}) =>
  renderToStaticMarkup(await SoundsPage({ searchParams: Promise.resolve(q) }));

// Each render parses all 113 real card files (about 0.35 s alone), so the unfiltered page is
// rendered once and shared. Under machine load the default 5 s was not enough for the first parse.
let unfiltered: Promise<string> | undefined;
const renderAll = (): Promise<string> => {
  unfiltered ??= render();
  return unfiltered;
};
const SLOW = { timeout: 30_000 };

describe("/sounds on the real cards", () => {
  it("lists all 113 tower sounds under their 11 categories", SLOW, async () => {
    const html = await renderAll();
    expect(html.match(/data-sound="SND-\d{3}"/g)).toHaveLength(113);
    expect(html.match(/<h2>/g)).toHaveLength(11);
    expect(html).toContain('data-sound="SND-090"');
  });

  it("shows unavailable, never 0, for a sound with no feel recorded", SLOW, async () => {
    const html = await renderAll();
    const row = /<tr data-sound="SND-001">(.*?)<\/tr>/.exec(html)?.[1] ?? "";
    expect(row.match(/>unavailable</g)).toHaveLength(3);
    expect(row).not.toMatch(/>0(\.0)?( s)?</);
  });

  it("marks the chosen filter", SLOW, async () => {
    const html = await render({ tone: "bad" });
    expect(html).toMatch(/aria-current="true" href="\/sounds\?tone=bad"/);
    expect(html).not.toContain('aria-current="false"');
  });
});
