import { describe, expect, it } from "vitest";
import { buildPrompt } from "./prompt.ts";
import { parseSections } from "./sections.ts";

const DOC = [
  "# Sessions", // 1
  "", // 2
  "## Startup", // 3
  "R-SES-1 starts.", // 4
  "### Join", // 5
  "R-SES-2 joins.", // 6
  "## Ending", // 7
  "```", // 8
  "## not a heading", // 9
  "```", // 10
  "R-SES-9 ends.", // 11
  "## Ending", // 12
].join("\n");

describe("sections", () => {
  it("gives each heading its path, line range and IDs, skipping fenced code", () => {
    const s = parseSections(DOC);
    expect(s.map((x) => x.anchor)).toEqual(["sessions", "startup", "join", "ending", "ending-2"]);
    expect(s[1]).toMatchObject({
      path: ["Sessions", "Startup"],
      startLine: 3,
      endLine: 6,
      ids: ["R-SES-1", "R-SES-2"],
    });
    expect(s[2]).toMatchObject({ path: ["Sessions", "Startup", "Join"], startLine: 5, endLine: 6 });
    expect(s[3]).toMatchObject({ startLine: 7, endLine: 11, ids: ["R-SES-9"] });
  });
});

describe("prompt starter", () => {
  const scope = {
    file: "research/game-design/sessions.md",
    section: ["Sessions", "Startup"],
    lines: { start: 3, end: 6 },
    ids: ["R-SES-1", "R-SES-2"],
  };

  it("puts the scope first and the idea last", () => {
    const p = buildPrompt(scope, "change", "  Let a late hunter join mid-night. ");
    expect(p).toMatch(/^Scope: research\/game-design\/sessions\.md\n/);
    expect(p).toContain("Section: Sessions › Startup (lines 3–6)");
    expect(p).toContain("IDs in scope: R-SES-1, R-SES-2");
    expect(p.endsWith("Change: Let a late hunter join mid-night.")).toBe(true);
  });

  it("forbids edits for a question", () => {
    expect(buildPrompt(scope, "ask", "Why?")).toContain("Do not edit any file.");
  });

  it("handles a new idea with no file", () => {
    const p = buildPrompt(
      { file: null, section: [], lines: null, ids: [] },
      "add",
      "A fog mechanic",
    );
    expect(p).toContain("no file yet");
    expect(p).not.toContain("Section:");
    expect(p).toContain("Idea to add: A fog mechanic");
  });
});
