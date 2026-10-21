import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TombPage from "./page.tsx";

describe("tomb page", () => {
  it("renders the start control, the seed and the simulation", () => {
    const html = renderToStaticMarkup(<TombPage />);
    expect(html).toContain("Enter the tomb");
    expect(html).toContain("Seed");
    expect(html).toContain("Run simulation");
  });
});
