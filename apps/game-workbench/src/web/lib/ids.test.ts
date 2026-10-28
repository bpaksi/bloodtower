import { describe, expect, it } from "vitest";
import { extractIds, idFamily, idKind } from "./ids.ts";
import { linkTarget, renderMarkdown } from "./markdown.ts";

describe("design IDs", () => {
  it("finds the existing families and the new prefixes", () => {
    const text =
      "See R-ENG-20, R3-UI-4 and R-AST-ORG-1; AST-T04 and E19e; Q3. New: SCR-007, UI-014, SND-058, GLY-002, DRM-003.";
    expect(extractIds(text)).toEqual([
      "R-ENG-20",
      "R3-UI-4",
      "R-AST-ORG-1",
      "AST-T04",
      "E19e",
      "Q3",
      "SCR-007",
      "UI-014",
      "SND-058",
      "GLY-002",
      "DRM-003",
    ]);
  });

  it("does not read IDs inside longer words, ranges' tails or fenced code", () => {
    expect(extractIds("ME17 X-SCR-1 FOO-UI-2")).toEqual([]);
    expect(extractIds("```\nR-ENG-1\n```\nR-ENG-2")).toEqual(["R-ENG-2"]);
  });

  it("classifies by prefix", () => {
    expect(idKind("R-AST-ORG-1")).toBe("requirement");
    expect(idKind("AST-T04")).toBe("asset");
    expect(idKind("E17")).toBe("engine");
    expect(idKind("Q-009")).toBe("question");
    expect(idKind("Q3")).toBe("question");
    expect(idKind("CUE-031")).toBe("cue");
    expect(idKind("SK-0041")).toBe("sketch");
    expect(idKind("ART-012")).toBe("art");
    expect(idKind("GLY-001")).toBe("glyph");
    expect(idKind("SEAL-012")).toBe("seal");
    expect(idKind("LGT-024")).toBe("light");
    expect(idKind("LFX-006")).toBe("light-effect");
    expect(idKind("LSQ-021")).toBe("light-sequence");
    expect(idKind("DRM-003")).toBe("drum");
  });

  it("names families", () => {
    expect(idFamily("R-ENG-20")).toBe("R-ENG");
    expect(idFamily("AST-T04")).toBe("AST-T");
    expect(idFamily("E19e")).toBe("E");
  });
});

describe("markdown", () => {
  it("turns IDs into copyable chips, but not inside code", () => {
    const html = renderMarkdown("Rule R-ENG-20 holds. `R-ENG-21` is code.");
    expect(html).toContain('data-id="R-ENG-20"');
    expect(html).not.toContain('data-id="R-ENG-21"');
  });

  it("routes sibling docs into the workbench and marks outside paths", () => {
    expect(linkTarget("sessions.md#ending")).toEqual({ kind: "doc", href: "/doc/sessions#ending" });
    expect(linkTarget("../tower/api.md").kind).toBe("outside");
    expect(linkTarget("https://example.com").kind).toBe("external");
  });
});
