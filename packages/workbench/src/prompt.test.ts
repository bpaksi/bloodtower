import { describe, expect, it } from "vitest";
import {
  buildPrompt,
  MODE_LABEL,
  type PromptConfig,
  type PromptScope,
  scopeLines,
} from "./prompt.ts";

const config: PromptConfig = {
  rules: { change: "R-change", add: "R-add", ask: "R-ask" },
  newScope: "a new idea, no file yet",
};
const empty: PromptScope = { file: null, section: [], lines: null, ids: [] };

describe("scopeLines", () => {
  it("uses the config's newScope when there is no file", () => {
    expect(scopeLines(empty, config)).toEqual(["Scope: a new idea, no file yet"]);
  });

  it("lists file only for a whole-file scope", () => {
    expect(scopeLines({ ...empty, file: "a/b.md" }, config)).toEqual(["Scope: a/b.md"]);
  });

  it("joins the section path and adds the line range when known", () => {
    const s = { ...empty, file: "a.md", section: ["One", "Two"] };
    expect(scopeLines(s, config)[1]).toBe("Section: One › Two");
    expect(scopeLines({ ...s, lines: { start: 3, end: 9 } }, config)[1]).toBe(
      "Section: One › Two (lines 3–9)",
    );
  });

  it("omits lines when there is no section", () => {
    const s = { ...empty, file: "a.md", lines: { start: 1, end: 2 } };
    expect(scopeLines(s, config)).toEqual(["Scope: a.md"]);
  });

  it("lists ids and truncates beyond 40 with a count of the rest", () => {
    const ids = Array.from({ length: 43 }, (_, i) => `ID-${i + 1}`);
    const line = scopeLines({ ...empty, file: "a.md", ids }, config).at(-1);
    expect(line).toBe(`IDs in scope: ${ids.slice(0, 40).join(", ")} and 3 more`);
    const exact = scopeLines({ ...empty, file: "a.md", ids: ids.slice(0, 40) }, config).at(-1);
    expect(exact).not.toContain("more");
  });
});

describe("buildPrompt", () => {
  const scope: PromptScope = { file: "a.md", section: ["S"], lines: null, ids: ["X-1"] };

  it("builds scope, rules and a mode-specific lead", () => {
    expect(buildPrompt(scope, "change", "  tweak it \n", config)).toBe(
      "Scope: a.md\nSection: S\nIDs in scope: X-1\n\nRules: R-change\n\nChange: tweak it",
    );
    expect(buildPrompt(scope, "add", "x", config)).toContain("Rules: R-add\n\nIdea to add: x");
    expect(buildPrompt(scope, "ask", "x", config)).toContain("Rules: R-ask\n\nQuestion: x");
  });

  it("has a label for every mode", () => {
    expect(MODE_LABEL).toEqual({ change: "Change", add: "Add", ask: "Ask" });
  });
});
