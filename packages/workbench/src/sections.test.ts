import { describe, expect, it } from "vitest";
import { makeIdScheme } from "./ids.ts";
import { makeRenderer } from "./markdown.ts";
import { parseSections } from "./sections.ts";

const ids = makeIdScheme({
  sources: [String.raw`MEC-\d+`, String.raw`ZZ-CHR-\d{3}`],
  kindOf: (id) => (id.startsWith("ZZ") ? "character" : "mechanic"),
  labels: {},
});

describe("parseSections", () => {
  it("returns nothing for empty text or text without headings", () => {
    expect(parseSections("", ids)).toEqual([]);
    expect(parseSections("just prose\nMEC-1 here", ids)).toEqual([]);
  });

  it("gives 1-based inclusive line ranges that end where the next same-or-higher heading starts", () => {
    const md = ["# Top", "intro", "## A", "a1", "### A1", "deep", "## B", "b1"].join("\n");
    const s = parseSections(md, ids);
    expect(s.map((x) => [x.title, x.depth, x.startLine, x.endLine])).toEqual([
      ["Top", 1, 1, 8],
      ["A", 2, 3, 6],
      ["A1", 3, 5, 6],
      ["B", 2, 7, 8],
    ]);
  });

  it("builds the path of enclosing headings, popping when depth goes back up", () => {
    const md = "# T\n## A\n### A1\n#### A1a\n### A2\n## B\n### B1";
    const paths = parseSections(md, ids).map((x) => x.path);
    expect(paths).toEqual([
      ["T"],
      ["T", "A"],
      ["T", "A", "A1"],
      ["T", "A", "A1", "A1a"],
      ["T", "A", "A2"],
      ["T", "B"],
      ["T", "B", "B1"],
    ]);
  });

  it("handles a heading that skips levels", () => {
    const s = parseSections("# T\n#### Deep\n## Back", ids);
    expect(s[1]?.path).toEqual(["T", "Deep"]);
    expect(s[1]?.endLine).toBe(2);
    expect(s[2]?.path).toEqual(["T", "Back"]);
  });

  it("numbers repeated headings so every anchor is unique", () => {
    const s = parseSections("## Notes\n## Notes\n### Notes\n## notes", ids);
    expect(s.map((x) => x.anchor)).toEqual(["notes", "notes-2", "notes-3", "notes-4"]);
  });

  it("counts a heading whose slug is empty as 'section'", () => {
    const s = parseSections("## ???\n## !!!", ids);
    expect(s.map((x) => x.anchor)).toEqual(["section", "section-2"]);
  });

  it("ignores headings inside ``` and ~~~ fences and resumes after the fence closes", () => {
    const md = [
      "# T",
      "```",
      "# not a heading",
      "```",
      "## Real",
      "~~~",
      "## also not",
      "~~~",
    ].join("\n");
    const s = parseSections(md, ids);
    expect(s.map((x) => x.title)).toEqual(["T", "Real"]);
  });

  it("strips closing hashes and trailing spaces from the title", () => {
    const s = parseSections("## Title ##   \n#   Spaced   ", ids);
    expect(s.map((x) => x.title)).toEqual(["Title", "Spaced"]);
  });

  it("does not treat 7 hashes, a missing space or an indented-by-text line as a heading", () => {
    expect(parseSections("####### seven\n#NoSpace\ntext # not", ids)).toEqual([]);
  });

  it("collects the IDs inside each section only; a parent includes its nested sections", () => {
    const md = "# T\nMEC-1\n## A\nZZ-CHR-001 and MEC-1\n## B\nMEC-2";
    const s = parseSections(md, ids);
    expect(s.map((x) => x.ids)).toEqual([
      ["MEC-1", "ZZ-CHR-001", "MEC-2"],
      ["ZZ-CHR-001", "MEC-1"],
      ["MEC-2"],
    ]);
  });

  it("counts an ID in the heading itself, and skips IDs in fenced code", () => {
    const s = parseSections("## About MEC-7\n```\nMEC-8\n```\nMEC-9", ids);
    expect(s[0]?.ids).toEqual(["MEC-7", "MEC-9"]);
  });

  it("the last section runs to the final line, including a trailing blank line", () => {
    const s = parseSections("## A\nx\n", ids);
    expect(s[0]?.endLine).toBe(3);
  });
});

describe("prompt anchors match the renderer", () => {
  const render = makeRenderer({ ids, docHref: (slug) => `/d/${slug}` });
  const md = [
    "# Top",
    "## Rules",
    "text",
    "## Rules",
    "### Rules",
    "## Fox & Hound!",
    "## ???",
    "## Rules",
  ].join("\n");

  it("every parsed anchor is the id of a rendered heading, in order", () => {
    const anchors = parseSections(md, ids).map((s) => s.anchor);
    const rendered = [...render(md).matchAll(/<h[1-6] id="([^"]+)"/g)].map((m) => m[1]);
    expect(rendered).toEqual(anchors);
  });

  it("each non-top heading's Prompt button names its own anchor", () => {
    const anchors = parseSections(md, ids)
      .filter((s) => s.depth > 1)
      .map((s) => s.anchor);
    const buttons = [...render(md).matchAll(/data-prompt="sec:([^"]+)"/g)].map((m) => m[1]);
    expect(buttons).toEqual(anchors);
  });

  it("rendering twice restarts the repeat counter, as parsing does", () => {
    expect(render("## A\n## A")).toBe(render("## A\n## A"));
    expect(render("## A\n## A")).toContain('id="a-2"');
  });
});
