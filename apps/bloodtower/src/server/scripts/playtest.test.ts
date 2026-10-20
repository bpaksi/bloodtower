import { describe, expect, it } from "vitest";
import {
  CHECKS,
  fillUrls,
  fixPrompt,
  nextUnanswered,
  parseArgs,
  type Results,
  renderMarkdown,
  SECTIONS,
  selectChecks,
} from "./playtest.ts";

const results = (answers: Results["answers"] = {}): Results => ({
  version: 1,
  startedAt: "2026-10-20T19:05:00.000Z",
  git: { sha: "abc1234", branch: "main", dirty: false },
  tower: false,
  setup: { server: "started by playtest on port 4787 (mock tower)" },
  preflight: [{ name: "pack:lint packs/test", ok: true, detail: ["OK test 1"] }],
  answers,
});

const at = "2026-10-20T19:10:00.000Z";

describe("CHECKS", () => {
  it("has unique ids that start with a known section", () => {
    const ids = CHECKS.map((check) => check.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const check of CHECKS) {
      expect(SECTIONS[check.section]).toBeDefined();
      expect(check.id.startsWith(check.section)).toBe(true);
      expect(check.do.length).toBeGreaterThan(0);
      expect(check.expect.length).toBeGreaterThan(0);
    }
  });
});

describe("parseArgs", () => {
  it("defaults to the mock tower, building and starting the host", () => {
    expect(parseArgs([])).toEqual({
      tower: false,
      server: true,
      build: true,
      check: false,
      e2e: false,
      help: false,
    });
  });

  it("reads every flag and ignores the -- pnpm passes through", () => {
    expect(
      parseArgs(["--", "--tower", "--only", "a,f", "--resume", "x.json", "--no-build", "--check"]),
    ).toMatchObject({ tower: true, only: ["A", "F"], resume: "x.json", build: false, check: true });
    expect(parseArgs(["--no-server", "--e2e", "-h"])).toMatchObject({
      server: false,
      e2e: true,
      help: true,
    });
  });

  it("rejects unknown flags, unknown sections and missing values", () => {
    expect(parseArgs(["--bogus"])).toBeNull();
    expect(parseArgs(["--only", "Z"])).toBeNull();
    expect(parseArgs(["--only"])).toBeNull();
    expect(parseArgs(["--resume", "--tower"])).toBeNull();
  });
});

describe("selectChecks", () => {
  it("drops tower-only checks without a tower and no-tower checks with one", () => {
    const mock = selectChecks(false).map((check) => check.id);
    const real = selectChecks(true).map((check) => check.id);
    expect(mock).toContain("E1");
    expect(mock).not.toContain("E2");
    expect(real).toContain("E2");
    expect(real).not.toContain("E1");
    expect(mock).toContain("F5");
    expect(real).toContain("F5");
  });

  it("keeps only the chosen sections, in order", () => {
    const ids = selectChecks(false, ["F", "A"]).map((check) => check.id);
    expect(ids).toEqual(["A1", "A2", "A3", "A4", "A5", "F1", "F5"]);
  });
});

describe("fillUrls", () => {
  it("fills every placeholder", () => {
    expect(
      fillUrls("{base}/ {board}?debug=1 {join}", { base: "B", board: "B/board", join: "J" }),
    ).toBe("B/ B/board?debug=1 J");
  });
});

describe("nextUnanswered", () => {
  it("finds the first open check, or the end when all are answered", () => {
    const checks = selectChecks(false, ["B"]);
    expect(nextUnanswered(checks, {})).toBe(0);
    expect(nextUnanswered(checks, { B1: { status: "pass", at } })).toBe(1);
    expect(nextUnanswered(checks, { B1: { status: "pass", at }, B2: { status: "skip", at } })).toBe(
      2,
    );
  });
});

describe("fixPrompt", () => {
  it("is null when nothing failed", () => {
    expect(fixPrompt(CHECKS, results({ A1: { status: "pass", at } }), "f.md")).toBeNull();
  });

  it("lists each failure with what was expected and what happened", () => {
    const prompt = fixPrompt(
      CHECKS,
      results({ C2: { status: "fail", note: "Next skipped a card", at } }),
      "apps/bloodtower/docs/playtests/x.md",
    );
    expect(prompt).toContain("apps/bloodtower/docs/playtests/x.md");
    expect(prompt).toContain("abc1234");
    expect(prompt).toContain("bugfix skill");
    expect(prompt).toContain("- C2 (Pick game, iPad).");
    expect(prompt).toContain("Happened: Next skipped a card");
  });
});

describe("renderMarkdown", () => {
  it("counts results, marks failures and adds the fix prompt", () => {
    const checks = selectChecks(false, ["B"]);
    const markdown = renderMarkdown(
      checks,
      results({ B1: { status: "fail", note: "QR | did not scan", at } }),
      "x.md",
    );
    expect(markdown).toContain("0 pass, 1 fail, 0 skip, 1 not run (in progress)");
    expect(markdown).toContain("| B1 | Join | iPad |");
    expect(markdown).toContain("**FAIL** | QR \\| did not scan |");
    expect(markdown).toContain("## Fix prompt");
    expect(markdown).toContain("| pack:lint packs/test | pass |");
  });

  it("has no fix prompt and no in-progress mark when everything passed", () => {
    const checks = selectChecks(false, ["J"]);
    const done = { ...results({ J1: { status: "pass", at } }), finishedAt: at };
    const markdown = renderMarkdown(checks, done, "x.md");
    expect(markdown).toContain("1 pass, 0 fail, 0 skip, 0 not run");
    expect(markdown).not.toContain("in progress");
    expect(markdown).not.toContain("## Fix prompt");
  });
});
