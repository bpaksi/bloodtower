import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { classify, describe as describeScope } from "./ci-scope.mjs";

const flags = (paths) => {
  const { needs_full_ci, needs_cards, needs_packs, needs_e2e } = classify(paths);
  return { needs_full_ci, needs_cards, needs_packs, needs_e2e };
};

const NONE = { needs_full_ci: false, needs_cards: false, needs_packs: false, needs_e2e: false };

describe("ci-scope", () => {
  it("runs only Gitleaks for docs and app icons", () => {
    assert.deepEqual(flags(["docs/sdlc.md", "assets/app-icon/icon.png"]), NONE);
    assert.deepEqual(flags(["assets/stories/dracula/scripts/ch1.md"]), NONE);
  });

  it("runs the card lint for a card-only change", () => {
    assert.deepEqual(flags(["research/game-design/cards/DEC-880.md"]), {
      ...NONE,
      needs_cards: true,
    });
    assert.deepEqual(flags(["research/game-design/glossary.md", "docs/sdlc.md"]), {
      ...NONE,
      needs_cards: true,
    });
  });

  it("runs the pack checks and the e2e suite for a pack-only change", () => {
    assert.deepEqual(flags(["packs/dracula/cast.yaml"]), {
      ...NONE,
      needs_packs: true,
      needs_e2e: true,
    });
  });

  it("runs both lite checks when a change touches cards and packs (PR #420)", () => {
    assert.deepEqual(
      flags(["packs/dracula/script.yaml", "research/game-design/cards/DEC-884.md"]),
      { needs_full_ci: false, needs_cards: true, needs_packs: true, needs_e2e: true },
    );
  });

  it("runs pnpm check, and not the lite checks, once any path leaves the allowlist", () => {
    assert.deepEqual(
      flags(["apps/bloodtower/src/engine/step.ts", "research/game-design/cards/DEC-001.md"]),
      { needs_full_ci: true, needs_cards: false, needs_packs: false, needs_e2e: true },
    );
  });

  it("runs the e2e suite for anything that can reach the Bloodtower build", () => {
    for (const path of [
      "apps/bloodtower/src/web/app/page.tsx",
      "packages/tower/src/index.ts",
      "pnpm-lock.yaml",
      "package.json",
      "scripts/wt.mjs",
      ".github/workflows/check.yml",
      "tsconfig.base.json",
    ]) {
      assert.equal(classify([path]).needs_e2e, true, path);
      assert.equal(classify([path]).needs_full_ci, true, path);
    }
  });

  it("skips the e2e suite for other apps, hooks and root documents, which still run pnpm check", () => {
    for (const path of [
      "apps/tower-poc/src/server/server.ts",
      "apps/game-workbench/src/web/lib/cards.ts",
      ".claude/hooks/lib.mjs",
      "CLAUDE.md",
      "research/decisions/0003-error-logging.md",
    ]) {
      assert.deepEqual(flags([path]), { ...NONE, needs_full_ci: true }, path);
    }
  });

  it("skips the e2e suite for Bloodtower's plans, notes and markdown, which still run pnpm check", () => {
    for (const path of [
      "apps/bloodtower/README.md",
      "apps/bloodtower/spec.md",
      "apps/bloodtower/plans/C3-ruined-keep.md",
      "apps/bloodtower/plans/briefs/C3/04-day-clock/eval.md",
      "apps/bloodtower/plans/briefs/C3/11-day-on-the-board/mockup.html",
      "apps/bloodtower/plans/briefs/C3/11-day-on-the-board/mockup.png",
      "apps/bloodtower/docs/playtests/2026-10-31-G-C1.md",
      "apps/bloodtower/docs/playtests/2026-10-20-1120.json",
      "apps/bloodtower/public/ipad/README.md",
    ]) {
      assert.deepEqual(flags([path]), { ...NONE, needs_full_ci: true }, path);
    }
  });

  it("still runs the e2e suite when a Bloodtower docs change comes with code or assets", () => {
    for (const path of [
      "apps/bloodtower/package.json",
      "apps/bloodtower/src/server/index.ts",
      "apps/bloodtower/src/e2e/tests/smoke.spec.ts",
      "apps/bloodtower/public/ipad/corner.png",
      "apps/bloodtower/plans.ts",
      "apps/bloodtower/docs.json",
    ]) {
      assert.equal(classify([path]).needs_e2e, true, path);
      assert.equal(classify(["apps/bloodtower/README.md", path]).needs_e2e, true, path);
    }
  });

  it("does not take a look-alike folder for an allowlisted tree", () => {
    assert.equal(classify(["docs-old/notes.md"]).needs_full_ci, true);
    assert.equal(classify(["packs2/x.yaml"]).needs_full_ci, true);
    assert.equal(classify(["apps/bloodtower-tools/x.ts"]).needs_e2e, false);
    assert.equal(classify(["apps/bloodtower/plans-old/x.ts"]).needs_e2e, true);
    assert.equal(classify(["packs/dracula/CONVERSION-NOTES.md"]).needs_e2e, true);
  });

  it("ignores blank lines and repeated paths, and an empty change runs nothing", () => {
    assert.deepEqual(flags([]), NONE);
    assert.deepEqual(flags(["", "  "]), NONE);
    assert.equal(classify(["docs/a.md", "docs/a.md", ""]).count, 1);
  });

  it("lists the paths that forced the full suite", () => {
    assert.deepEqual(classify(["docs/a.md", "scripts/wt.mjs"]).outside, ["scripts/wt.mjs"]);
  });

  it("says what runs in one sentence", () => {
    assert.match(describeScope(classify(["docs/a.md"])), /Runs: Gitleaks only\.$/);
    assert.match(
      describeScope(classify(["packs/test/pack.yaml"])),
      /Runs: the pack checks, the e2e suite\.$/,
    );
    assert.match(describeScope(classify(["package.json"])), /Runs: pnpm check, the e2e suite\.$/);
  });

  it("prints name=value lines for GITHUB_OUTPUT from paths on stdin", () => {
    const out = execFileSync("node", [fileURLToPath(new URL("./ci-scope.mjs", import.meta.url))], {
      input: "research/game-design/cards/Q-001.md\npacks/test/pack.yaml\n",
      encoding: "utf8",
    });
    assert.deepEqual(out.trim().split("\n").slice(0, 4), [
      "needs_full_ci=false",
      "needs_cards=true",
      "needs_packs=true",
      "needs_e2e=true",
    ]);
    assert.match(out, /^detail=Every changed path is docs/m);
  });
});
