import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Placeholder } from "./Placeholder.tsx";

describe("Placeholder", () => {
  it("shows the asset it stands for and exposes it to tests", () => {
    const html = renderToStaticMarkup(
      <Placeholder label="Hero portrait: Paladin" width={120} height={80} />,
    );
    expect(html).toContain("Hero portrait: Paladin");
    expect(html).toContain('data-placeholder="Hero portrait: Paladin"');
    expect(html).toContain("width:120px");
  });
});
