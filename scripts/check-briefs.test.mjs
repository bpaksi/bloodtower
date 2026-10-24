import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { checkBriefs } from "./check-briefs.mjs";

const TEMPLATE = `# Brief: <plan-id> Step <N> — <title>

## Meta

## Cutover

Cutover: N

## Survival invariants

## Done-when (e2e)

## AREA / DEC checklist
`;

let root;

const briefsDir = () => join(root, "apps/bloodtower/plans/briefs");

const write = (name, text) => writeFileSync(join(briefsDir(), name), text);

const fresh = () => {
  root = mkdtempSync(join(tmpdir(), "brief-lint-"));
  mkdirSync(briefsDir(), { recursive: true });
};

describe("checkBriefs", () => {
  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
  });

  it("accepts the template, the readme, and filled briefs with one cutover line", () => {
    fresh();
    write("BRIEF-TEMPLATE.md", `${TEMPLATE}\nCutover: Y is a placeholder mention.\n`);
    write("README.md", "# Briefs\n\nNo brief headings here.\n");
    write("C2-step-1.md", TEMPLATE.replace("Cutover: N", "Cutover: Y"));
    write("C2-step-2.md", TEMPLATE);
    write("notes.txt", "not a brief");
    assert.deepEqual(checkBriefs(root), []);
  });

  it("fails a filled brief that is missing a heading or a single cutover line", () => {
    fresh();
    write("BRIEF-TEMPLATE.md", TEMPLATE);
    write("C2-step-1.md", "## Cutover\n\nCutover: Y\nCutover: N\n");
    write("C2-step-2.md", TEMPLATE.replace("Cutover: N", "unset"));
    const errors = checkBriefs(root);
    const has = (snippet) => errors.some((error) => error.includes(snippet));
    assert.equal(has('C2-step-1.md: missing heading "## Survival invariants"'), true);
    assert.equal(has("C2-step-1.md: need exactly one"), true);
    assert.equal(has("found both"), true);
    assert.equal(has("C2-step-2.md: need exactly one"), true);
    assert.equal(has("found neither"), true);
  });

  it("checks the template headings and skips the cutover line rule", () => {
    fresh();
    write("BRIEF-TEMPLATE.md", "## Cutover\n\nCutover: Y\nCutover: N\n");
    const errors = checkBriefs(root);
    assert.match(errors.join("\n"), /BRIEF-TEMPLATE\.md: missing heading "## Done-when \(e2e\)"/);
    assert.equal(
      errors.some((error) => error.includes("exactly one")),
      false,
    );
  });

  it("fails when the briefs folder or the template is missing", () => {
    root = mkdtempSync(join(tmpdir(), "brief-lint-"));
    assert.deepEqual(checkBriefs(root), ["apps/bloodtower/plans/briefs: folder is missing."]);

    mkdirSync(briefsDir(), { recursive: true });
    write("README.md", "# Briefs\n");
    assert.deepEqual(checkBriefs(root), [
      "apps/bloodtower/plans/briefs/BRIEF-TEMPLATE.md: file is missing.",
    ]);
  });
});
