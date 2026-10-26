import { describe, expect, it } from "vitest";
import { extractIds, idFamily, makeIdScheme } from "./ids.ts";

// Shapes chosen so one is a prefix-overlap of another (R-ENG vs ENG) and one has a letter suffix.
const make = (sources: string[]) =>
  makeIdScheme({
    sources,
    kindOf: (id) => (id.startsWith("R-") ? "rule" : "thing"),
    labels: { rule: "Rule" },
  });

const scheme = make([String.raw`R-ENG-\d+`, String.raw`ENG-\d+`, String.raw`E\d+[a-z]?`]);

describe("makeIdScheme", () => {
  it("builds a global pattern and a non-global start-anchored pattern", () => {
    expect(scheme.pattern.global).toBe(true);
    expect(scheme.atStart.global).toBe(false);
    expect(scheme.atStart.source.startsWith("^")).toBe(true);
  });

  it("atStart matches only at the start and only a whole ID", () => {
    expect(scheme.atStart.exec("R-ENG-20 rest")?.[0]).toBe("R-ENG-20");
    expect(scheme.atStart.exec("E17.")?.[0]).toBe("E17");
    expect(scheme.atStart.exec(" E17")).toBeNull();
    expect(scheme.atStart.exec("see E17")).toBeNull();
    expect(scheme.atStart.exec("E17-x")).toBeNull();
    expect(scheme.atStart.exec("E17_")).toBeNull();
    expect(scheme.atStart.exec("")).toBeNull();
  });

  it("atStart keeps no state between calls (not global)", () => {
    for (let i = 0; i < 3; i++) expect(scheme.atStart.exec("E1")?.[0]).toBe("E1");
    expect(scheme.atStart.lastIndex).toBe(0);
  });

  it("matches each source shape with word boundaries", () => {
    const hits = (s: string) => [...s.matchAll(scheme.pattern)].map((m) => m[0]);
    expect(hits("R-ENG-20")).toEqual(["R-ENG-20"]);
    expect(hits("ENG-3 and E17 and E9b")).toEqual(["ENG-3", "E17", "E9b"]);
    // Hyphen and word characters on either side disqualify a match.
    expect(hits("XE17")).toEqual([]);
    expect(hits("E17x9")).toEqual([]);
    expect(hits("E17-")).toEqual([]);
    expect(hits("-E17")).toEqual([]);
    expect(hits("_E17")).toEqual([]);
    expect(hits("E17_")).toEqual([]);
    // Sentence punctuation, brackets and quotes are boundaries.
    expect(hits("(E17), [E18]; “E19”: E20.")).toEqual(["E17", "E18", "E19", "E20"]);
  });

  it("reads R-ENG-20 whole, never as ENG-20, whatever the source order", () => {
    const longFirst = make([String.raw`R-ENG-\d+`, String.raw`ENG-\d+`]);
    const shortFirst = make([String.raw`ENG-\d+`, String.raw`R-ENG-\d+`]);
    for (const s of [longFirst, shortFirst]) {
      expect(extractIds("R-ENG-20 and ENG-20", s)).toEqual(["R-ENG-20", "ENG-20"]);
      expect(s.atStart.exec("R-ENG-20")?.[0]).toBe("R-ENG-20");
    }
  });

  it("prefers the longer alternative when two sources match the same start", () => {
    // `E\d` alone would stop at E1; the lookahead rejects that, so the longer form is used.
    const s = make([String.raw`E\d+-\d+`, String.raw`E\d+`]);
    expect(s.atStart.exec("E1-22 x")?.[0]).toBe("E1-22");
    expect(extractIds("E1-22 E1", s)).toEqual(["E1-22", "E1"]);
  });

  it("matches nothing for a scheme whose sources never apply", () => {
    expect(extractIds("E17 R-ENG-1", make([String.raw`QQ-\d+`]))).toEqual([]);
  });

  it("delegates kindOf to the caller's classifier", () => {
    expect(scheme.kindOf("R-ENG-20")).toBe("rule");
    expect(scheme.kindOf("E17")).toBe("thing");
  });

  it("label uses the table, and falls back to the kind itself", () => {
    expect(scheme.label("rule")).toBe("Rule");
    expect(scheme.label("thing")).toBe("thing");
    expect(scheme.label("")).toBe("");
  });
});

describe("extractIds", () => {
  it("returns IDs in first-seen order, not sorted", () => {
    expect(extractIds("E9 R-ENG-2 E1 ENG-5", scheme)).toEqual(["E9", "R-ENG-2", "E1", "ENG-5"]);
  });

  it("dedupes, keeping the first position", () => {
    expect(extractIds("E2 E1 E2 E1 E3 E2", scheme)).toEqual(["E2", "E1", "E3"]);
  });

  it("treats IDs differing only in case or digits as different", () => {
    expect(extractIds("E1 E01 E1a E1b", scheme)).toEqual(["E1", "E01", "E1a", "E1b"]);
  });

  it("returns [] for empty text and for text with no IDs", () => {
    expect(extractIds("", scheme)).toEqual([]);
    expect(extractIds("nothing to see here, 17 and E", scheme)).toEqual([]);
  });

  it("finds IDs across lines, in headings, lists and tables", () => {
    const md = "# E1 title\n- R-ENG-2\n| E3 | ENG-4 |\n> E5";
    expect(extractIds(md, scheme)).toEqual(["E1", "R-ENG-2", "E3", "ENG-4", "E5"]);
  });

  it("skips fenced code blocks, including multi-line ones and ones with a language", () => {
    const md = "E1\n```ts\nconst x = 'E2';\nE3\n```\nE4\n```\nR-ENG-9\n```\nE5";
    expect(extractIds(md, scheme)).toEqual(["E1", "E4", "E5"]);
  });

  it("only hides an ID inside a fence when it is not also outside one", () => {
    expect(extractIds("```\nE1\n```\nE1", scheme)).toEqual(["E1"]);
  });

  it("does not skip inline code (only fences)", () => {
    expect(extractIds("use `E2` here", scheme)).toEqual(["E2"]);
  });

  it("does not skip an unclosed fence", () => {
    expect(extractIds("E1\n```\nE2", scheme)).toEqual(["E1", "E2"]);
  });

  it("is repeatable: the global pattern's lastIndex never leaks between calls", () => {
    const md = "E1 E2 E3";
    expect(extractIds(md, scheme)).toEqual(["E1", "E2", "E3"]);
    expect(extractIds(md, scheme)).toEqual(["E1", "E2", "E3"]);
    expect(scheme.pattern.lastIndex).toBe(0);
  });

  it("works with the pattern directly via a fresh matchAll after use", () => {
    scheme.pattern.lastIndex = 0;
    expect([..."E1 E2".matchAll(scheme.pattern)]).toHaveLength(2);
  });
});

describe("idFamily", () => {
  it.each([
    ["R-ENG-20", "R-ENG"],
    ["AST-T04", "AST-T"],
    ["E17", "E"],
    ["DRA-CHR-004", "DRA-CHR"],
  ])("%s → %s", (id, family) => {
    expect(idFamily(id)).toBe(family);
  });

  it("strips one trailing lowercase letter after the digits", () => {
    expect(idFamily("MEC-5b")).toBe("MEC");
    expect(idFamily("E9a")).toBe("E");
  });

  it("leaves an uppercase suffix or a second letter alone", () => {
    expect(idFamily("MEC-5B")).toBe("MEC-5B");
    expect(idFamily("MEC-5bc")).toBe("MEC-5bc");
  });

  it("only strips the last digit run, and one trailing hyphen", () => {
    expect(idFamily("ABC-12-3")).toBe("ABC-12");
    expect(idFamily("ABC-12-")).toBe("ABC-12");
  });

  it("returns an ID with no digits unchanged", () => {
    expect(idFamily("RULE")).toBe("RULE");
    expect(idFamily("A-B")).toBe("A-B");
  });

  it("handles degenerate input", () => {
    expect(idFamily("")).toBe("");
    expect(idFamily("42")).toBe("");
    expect(idFamily("-7")).toBe("");
  });

  it("gives every ID in a numbered run the same family", () => {
    const fam = new Set(["R-ENG-1", "R-ENG-20", "R-ENG-300"].map(idFamily));
    expect([...fam]).toEqual(["R-ENG"]);
  });

  it("agrees with extractIds: families of extracted IDs", () => {
    const fams = extractIds("R-ENG-20 ENG-3 E17 E18", scheme).map(idFamily);
    expect(fams).toEqual(["R-ENG", "ENG", "E", "E"]);
  });
});
