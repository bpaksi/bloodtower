import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { checkBriefs } from "./check-briefs.mjs";

const TEMPLATE = `# Brief: <plan-id> Step <N> — <title>

## Meta

- Plan:
- Step:
- Owner:
- Related AREA/docs:

## Cutover

Cutover: N

- If Y: what dies or is renamed (one bullet per thing).

## Survival invariants

- Continue, restore, and restart must keep:

## Done-when (e2e)

- [ ] Run: <action>. Expect: <observable result>.

## AREA / DEC checklist

- [ ] <AREA- or DEC- id>: closed before coding.
`;

const FIELDS = ["Requirement", "Method", "How", "Pass evidence", "Fails if"];

let root;

const briefsDir = () => join(root, "apps/bloodtower/plans/briefs");

const at = (path) => `apps/bloodtower/plans/briefs/${path}`;

const write = (name, text) => writeFileSync(join(briefsDir(), name), text);

const writeRel = (rel, text) => {
  const full = join(briefsDir(), rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, text);
};

const fresh = () => {
  root = mkdtempSync(join(tmpdir(), "brief-lint-"));
  mkdirSync(briefsDir(), { recursive: true });
};

const seed = () => {
  fresh();
  write("BRIEF-TEMPLATE.md", TEMPLATE);
};

const withMockup = (value) =>
  TEMPLATE.replace("- Related AREA/docs:\n", `- Related AREA/docs:\n- Mockup: ${value}\n`);

const ev = ({
  id = "EV-01",
  title = "check",
  requirement = "The board shows the chosen beat.",
  method = "unit",
  how = "beats.test.ts › shows the beat",
  pass = "the beat title is The Ruined Keep",
  fails = "the beat title is missing",
  omit = [],
  blank = [],
} = {}) => {
  const values = {
    Requirement: requirement,
    Method: method,
    How: how,
    "Pass evidence": pass,
    "Fails if": fails,
  };
  const lines = [`### ${id} — ${title}`];
  for (const field of FIELDS) {
    if (omit.includes(field)) continue;
    lines.push(`- ${field}: ${blank.includes(field) ? "" : values[field]}`);
  }
  return lines.join("\n");
};

const evalDoc = (...blocks) => `# Evals

## Checks

${blocks.join("\n\n")}
`;

const approval = ({
  by = "Bob",
  when = "2026-10-31",
  mockupBy = by,
  mockupWhen = when,
  chat = "https://example.com/chat/1",
} = {}) => `# Approval

| Item | Approved by | When (America/Detroit) | Chat link | Version (commit sha of file) |
|------|-------------|------------------------|-----------|------------------------------|
| eval.md | ${by} | ${when} | ${chat} | abc123 |
| mockup.html | ${mockupBy} | ${mockupWhen} | ${chat} | def456 |
`;

const filledFeature = (folder, { plan, evalText, approvalText, mockup }) => {
  writeRel(`${folder}/plan.md`, plan);
  writeRel(`${folder}/eval.md`, evalText);
  writeRel(`${folder}/approval.md`, approvalText);
  if (mockup !== undefined) writeRel(`${folder}/mockup.html`, mockup);
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

describe("checkBriefs feature folders", () => {
  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
  });

  it("accepts legacy step briefs and feature folders, with or without a screen change", () => {
    seed();
    write("README.md", "# Briefs\n\nNo brief headings here.\n");
    write("EVAL-TEMPLATE.md", "# Evals template\n\nNo brief headings and no cutover line.\n");
    write("APPROVAL-TEMPLATE.md", "# Approval template\n");
    write("C1-step-10.md", TEMPLATE);
    write("notes.txt", "not a brief");
    writeRel("C2/readme.md", "loose note\n");
    mkdirSync(join(briefsDir(), "C2/misc"), { recursive: true });
    mkdirSync(join(briefsDir(), "C2/1-one-digit"), { recursive: true });

    filledFeature("C2/01-pick-beat", {
      plan: withMockup("mockup.html"),
      evalText: evalDoc(
        ev({ id: "EV-01", title: "rejects an unknown beat" }),
        ev({
          id: "EV-02",
          title: "reaches the board",
          method: "playwright",
          how: "open the story and choose the beat",
          pass: "the beat title is visible on the board",
          fails: "the player stays on the menu",
        }),
        ev({
          id: "EV-03",
          title: "board matches the mockup",
          method: "Screenshot",
          how: "screenshot the board at 1280x720, compare side by side with ./mockup.html",
          pass: "the beat title is present, the order matches, and both images are attached",
          fails: "the beat title is missing or the layout differs",
        }),
      ),
      approvalText: approval(),
      mockup: "<!doctype html><title>pick beat</title>\n",
    });
    writeRel("C2/01-pick-beat/notes.md", "extra note\n");

    filledFeature("C2/02-quiet", {
      plan: withMockup("none (no screen change)"),
      evalText: evalDoc(
        ev({ id: "EV-01", method: "unit" }),
        ev({ id: "EV-02", method: "playwright", how: "open the menu" }),
      ),
      approvalText: approval({
        when: "10/31/2026",
        mockupBy: "n/a",
        mockupWhen: "n/a",
      }),
    });

    filledFeature("W4/03-copied", {
      plan: TEMPLATE,
      evalText: evalDoc(ev()),
      approvalText: approval(),
    });

    assert.deepEqual(checkBriefs(root), []);
  });

  it("fails a feature folder that is missing plan.md, eval.md, or approval.md", () => {
    seed();
    mkdirSync(join(briefsDir(), "C2/01-pick-beat"), { recursive: true });
    assert.deepEqual(checkBriefs(root), [
      at("C2/01-pick-beat: missing plan.md."),
      at("C2/01-pick-beat: missing eval.md."),
      at("C2/01-pick-beat: missing approval.md."),
    ]);
  });

  it("fails a feature plan.md for a missing heading or a cutover line that is not exactly one", () => {
    seed();
    filledFeature("C2/01-missing-heading", {
      plan: withMockup("none").replace("## Survival invariants\n", ""),
      evalText: evalDoc(ev()),
      approvalText: approval(),
    });
    filledFeature("C2/02-both", {
      plan: withMockup("none").replace("Cutover: N", "Cutover: Y\nCutover: N"),
      evalText: evalDoc(ev()),
      approvalText: approval(),
    });
    filledFeature("C2/03-neither", {
      plan: withMockup("none").replace("Cutover: N", "Cutover: later"),
      evalText: evalDoc(ev()),
      approvalText: approval(),
    });

    assert.deepEqual(checkBriefs(root), [
      at('C2/01-missing-heading/plan.md: missing heading "## Survival invariants".'),
      at('C2/02-both/plan.md: need exactly one of "Cutover: Y" or "Cutover: N" (found both).'),
      at(
        'C2/03-neither/plan.md: need exactly one of "Cutover: Y" or "Cutover: N" (found neither).',
      ),
    ]);
  });

  it("fails an eval.md with no EV ids, a duplicate id, a bad method, or a missing field", () => {
    seed();
    filledFeature("C2/01-no-ids", {
      plan: withMockup("none"),
      evalText: `# Evals

# EV-01 — a title heading does not count

EV-01 is mentioned in prose.

- Requirement: orphan
- Method: unit
- How: beats.test.ts › orphan
- Pass evidence: orphan
- Fails if: orphan
`,
      approvalText: approval(),
    });
    filledFeature("C2/02-duplicate", {
      plan: withMockup("none"),
      evalText: evalDoc(
        ev({ id: "EV-01", title: "first" }),
        ev({ id: "EV-01", title: "again" }),
        ev({ id: "EV-02" }),
      ),
      approvalText: approval(),
    });
    filledFeature("C2/03-method", {
      plan: withMockup("none"),
      evalText: evalDoc(ev({ method: "a careful look" })),
      approvalText: approval(),
    });

    assert.deepEqual(checkBriefs(root), [
      at("C2/01-no-ids/eval.md: no EV ids."),
      at('C2/02-duplicate/eval.md: duplicate EV id "EV-01".'),
      at(
        'C2/03-method/eval.md: EV-01 Method must be unit, playwright, or screenshot (found "a careful look").',
      ),
    ]);
  });

  it("fails an EV that omits a field or leaves it blank", () => {
    seed();
    for (const field of FIELDS) {
      filledFeature("C2/01-field", {
        plan: withMockup("none"),
        evalText: evalDoc(ev({ omit: [field] })),
        approvalText: approval(),
      });
      assert.deepEqual(checkBriefs(root), [at(`C2/01-field/eval.md: EV-01 missing ${field}.`)]);
    }

    filledFeature("C2/01-field", {
      plan: withMockup("none"),
      evalText: evalDoc(ev({ blank: ["Pass evidence"] })),
      approvalText: approval(),
    });
    assert.deepEqual(checkBriefs(root), [at("C2/01-field/eval.md: EV-01 missing Pass evidence.")]);
  });

  it("fails when a screen change names a missing mockup, or mockup.html has no screenshot EV", () => {
    seed();
    filledFeature("C2/01-unset", {
      plan: withMockup("./mockup.html | none (no screen change)"),
      evalText: evalDoc(ev({ method: "screenshot", how: "compare with ./mockup.html" })),
      approvalText: approval(),
    });
    writeRel("C2/mockup.html", "<!doctype html>parent\n");
    filledFeature("C2/02-outside", {
      plan: withMockup("../mockup.html"),
      evalText: evalDoc(ev({ method: "screenshot" })),
      approvalText: approval(),
    });
    filledFeature("C2/03-board", {
      plan: withMockup("board.html"),
      evalText: evalDoc(ev({ method: "unit" })),
      approvalText: approval(),
    });
    filledFeature("C2/04-no-shot", {
      plan: withMockup("./mockup.html"),
      evalText: evalDoc(ev({ fails: "a screenshot of the wrong screen still passes" })),
      approvalText: approval(),
      mockup: "<!doctype html><title>board</title>\n",
    });

    assert.deepEqual(checkBriefs(root), [
      at('C2/01-unset/plan.md: Mockup names missing file "mockup.html".'),
      at("C2/02-outside/plan.md: Mockup names a file outside the feature folder."),
      at('C2/02-outside/plan.md: Mockup names missing file "mockup.html".'),
      at('C2/03-board/plan.md: Mockup names missing file "board.html".'),
      at('C2/03-board/plan.md: Mockup names missing file "mockup.html".'),
      at("C2/04-no-shot/mockup.html: no EV with method screenshot."),
    ]);
  });

  it("fails an approval.md with no approver, no date, or the two split across rows", () => {
    seed();
    const quiet = (folder, approvalText) =>
      filledFeature(folder, {
        plan: withMockup("none"),
        evalText: evalDoc(ev()),
        approvalText,
      });

    quiet("C2/01-blank", approval({ by: "", when: "", mockupBy: "n/a", mockupWhen: "n/a" }));
    quiet(
      "C2/02-no-date",
      approval({
        when: "",
        chat: "https://example.com/2026-10-31",
        mockupBy: "n/a",
        mockupWhen: "n/a",
      }),
    );
    quiet("C2/03-no-approver", approval({ by: "", mockupBy: "n/a", mockupWhen: "n/a" }));
    quiet(
      "C2/04-split",
      `# Approval

| Item | Approved by | When (America/Detroit) | Chat link | Version |
|------|-------------|------------------------|-----------|---------|
| eval.md | Bob |  |  |  |
| mockup.html |  | 2026-10-31 |  |  |
`,
    );

    assert.deepEqual(checkBriefs(root), [
      at("C2/01-blank/approval.md: no approver."),
      at("C2/01-blank/approval.md: no date."),
      at("C2/02-no-date/approval.md: no date."),
      at("C2/03-no-approver/approval.md: no approver."),
      at("C2/04-split/approval.md: no row with both an approver and a date."),
    ]);
  });

  it("reports a legacy step-brief failure and a feature-folder failure together", () => {
    seed();
    write("C2-step-1.md", "## Cutover\n\nCutover: Y\nCutover: N\n");
    mkdirSync(join(briefsDir(), "C2/01-pick-beat"), { recursive: true });
    const errors = checkBriefs(root);
    const has = (snippet) => errors.some((error) => error.includes(snippet));
    assert.equal(has('C2-step-1.md: missing heading "## Done-when (e2e)"'), true);
    assert.equal(has("C2-step-1.md: need exactly one"), true);
    assert.equal(has("found both"), true);
    assert.equal(has("C2/01-pick-beat: missing plan.md."), true);
    assert.equal(has("C2/01-pick-beat: missing eval.md."), true);
    assert.equal(has("C2/01-pick-beat: missing approval.md."), true);
  });
});
