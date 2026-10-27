import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  CARDS_DIR,
  formatId,
  idNumber,
  pruneReservations,
  RESERVED,
  reserveIds,
} from "./card-id.mjs";

// Git sets GIT_DIR and GIT_INDEX_FILE when it runs a hook, and the pre-commit hook runs these
// tests. Left in place they would point every git call below at the real repo.
for (const name of Object.keys(process.env)) {
  if (name.startsWith("GIT_")) delete process.env[name];
}

let base;
let root;
const git = (dir, ...args) =>
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "core.hooksPath=/dev/null",
      ...args,
    ],
    { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
const card = (dir, id) => {
  mkdirSync(join(dir, CARDS_DIR), { recursive: true });
  writeFileSync(join(dir, CARDS_DIR, `${id}.md`), id);
};
const commitCard = (dir, id) => {
  card(dir, id);
  git(dir, "add", CARDS_DIR);
  git(dir, "commit", "--quiet", "-m", id);
};
const reserved = () =>
  git(root, "for-each-ref", "--format=%(refname:lstrip=2)", RESERVED).split("\n").filter(Boolean);

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), "dark-tower-card-id-"));
  root = join(base, "Repo");
  mkdirSync(root);
  git(root, "init", "--quiet", "--initial-branch=main");
  commitCard(root, "DEC-010");
});
afterEach(() => rmSync(base, { recursive: true, force: true }));

describe("pnpm card-id", () => {
  it("reads the number from a file name or a bare ID, and pads to three digits", () => {
    assert.equal(idNumber("DEC", `${CARDS_DIR}/DEC-042.md`), 42);
    assert.equal(idNumber("DEC", "DEC-1203"), 1203);
    assert.equal(idNumber("Q", "QX-001.md"), undefined);
    assert.equal(formatId("Q", 7), "Q-007");
  });

  it("reserves the IDs after the highest on main and holds them as refs", () => {
    assert.deepEqual(reserveIds({ root, prefix: "DEC", count: 2 }), ["DEC-011", "DEC-012"]);
    assert.deepEqual(reserved(), ["DEC-011", "DEC-012"]);
  });

  it("never hands out the same ID twice, as two sessions asking in turn", () => {
    const first = reserveIds({ root, prefix: "DEC" });
    const second = reserveIds({ root, prefix: "DEC" });
    assert.deepEqual([first, second], [["DEC-011"], ["DEC-012"]]);
  });

  it("counts cards on other branches and uncommitted cards in other worktrees", () => {
    git(root, "switch", "--quiet", "-c", "other");
    commitCard(root, "DEC-020");
    git(root, "switch", "--quiet", "main");
    const wt = join(base, "wt");
    git(root, "worktree", "add", "--quiet", "-b", "session", wt);
    card(wt, "DEC-030");
    assert.deepEqual(reserveIds({ root, prefix: "DEC" }), ["DEC-031"]);
  });

  it("keeps each prefix apart", () => {
    assert.deepEqual(reserveIds({ root, prefix: "Q" }), ["Q-001"]);
    assert.deepEqual(reserveIds({ root, prefix: "DEC" }), ["DEC-011"]);
  });

  it("prunes the reservations whose card main holds", () => {
    reserveIds({ root, prefix: "DEC", count: 2 });
    commitCard(root, "DEC-011");
    assert.deepEqual(pruneReservations(root), ["DEC-011"]);
    assert.deepEqual(reserved(), ["DEC-012"]);
    assert.deepEqual(reserveIds({ root, prefix: "DEC" }), ["DEC-013"]);
  });

  it("refuses a bad prefix or count", () => {
    assert.throws(() => reserveIds({ root, prefix: "dec" }), /Usage/);
    assert.throws(() => reserveIds({ root, prefix: "DEC", count: 0 }), /not a count/);
  });
});
