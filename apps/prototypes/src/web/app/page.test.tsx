import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Index from "./page.tsx";

describe("index page", () => {
  it("links every prototype by ID and name", () => {
    const html = renderToStaticMarkup(<Index />);
    for (const [id, name, path] of [
      ["P-01", "Story board layouts", "/p/board"],
      ["P-08", "A day&#x27;s turn loop", "/p/turn"],
      ["P-02", "Tomb", "/p/tomb"],
      ["P-03", "Cave", "/p/cave"],
      ["P-04", "Encampment", "/p/camp"],
      ["P-05", "Fortress", "/p/fortress"],
    ]) {
      expect(html).toContain(`href="${path}"`);
      expect(html).toContain(id);
      expect(html).toContain(name);
    }
  });
});
