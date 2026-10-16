// Feeds each guard hook the JSON a tool call would send and checks whether it blocks (exit 2).
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { splitCommands, UNKNOWN_FOLDER, walkCommands } from "./lib.mjs";

// Git sets GIT_DIR and GIT_INDEX_FILE when it runs a hook, and the pre-commit hook runs these
// tests. Left in place they would point every git call below at the real repo.
for (const name of Object.keys(process.env)) {
  if (name.startsWith("GIT_")) delete process.env[name];
}

const HOOKS = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HOOKS, "../..");
const BLOCKED = 2;
const ALLOWED = 0;

const run = (hook, input) =>
  spawnSync("node", [join(HOOKS, `${hook}.mjs`)], { input: JSON.stringify(input) }).status;
const shell = (hook, command, cwd = REPO) =>
  run(hook, { tool_name: "Bash", cwd, tool_input: { command } });
const edit = (hook, file_path, old_string = "a", new_string = "b", cwd = REPO) =>
  run(hook, { tool_name: "Edit", cwd, tool_input: { file_path, old_string, new_string } });

const cases = (hook, call, expected, list) => {
  for (const item of list) {
    const label = Array.isArray(item) ? item.join(" → ") : item;
    it(`${expected === BLOCKED ? "blocks" : "allows"}: ${label}`, () => {
      assert.equal(call(hook, ...(Array.isArray(item) ? item : [item])), expected);
    });
  }
};

// Throwaway repos: one on main, one on a feature branch, one on fix/* with and without a commit.
let tmp;
let onMain;
let onFeature;
let fixFresh;
let fixCommitted;

const gitIn = (dir, ...args) =>
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], {
    cwd: dir,
    stdio: "ignore",
  });
const makeRepo = (name, branch, extraCommits = 0) => {
  const dir = join(tmp, name);
  mkdirSync(dir);
  gitIn(dir, "init", "-q", "-b", "main");
  gitIn(dir, "commit", "-q", "--allow-empty", "-m", "init");
  writeFileSync(join(dir, "notes.txt"), "x");
  if (branch !== "main") gitIn(dir, "checkout", "-q", "-b", branch);
  for (let i = 0; i < extraCommits; i++) gitIn(dir, "commit", "-q", "--allow-empty", "-m", "c");
  return dir;
};

before(() => {
  tmp = mkdtempSync(join(tmpdir(), "dark-tower-hooks-"));
  onMain = makeRepo("main", "main");
  onFeature = makeRepo("feature", "feat/app-thing");
  fixFresh = makeRepo("fix-fresh", "fix/app-bug");
  fixCommitted = makeRepo("fix-committed", "fix/app-bug", 1);
});
after(() => rmSync(tmp, { recursive: true, force: true }));

describe("splitCommands", () => {
  it("splits at separators and keeps quoted text together", () => {
    const [first, second] = splitCommands(`git commit -m "a; b && c" && echo 'x | y'`);
    assert.deepEqual(first.words, ["git", "commit", "-m", "a; b && c"]);
    assert.deepEqual(second.words, ["echo", "x | y"]);
  });

  it("records redirect targets and ignores descriptor duplication", () => {
    const [segment] = splitCommands("cmd arg > out.txt 2>&1");
    assert.deepEqual(segment, {
      words: ["cmd", "arg"],
      redirects: ["out.txt"],
      end: "",
      scope: [],
    });
    assert.deepEqual(splitCommands("cmd 2>/dev/null >>log")[0].redirects, ["/dev/null", "log"]);
  });

  it("records how each command ended and which subshell it is in", () => {
    const segments = splitCommands("(cd a && b | c); d & e || f");
    assert.deepEqual(
      segments.map(({ words, end, scope }) => [words.join(" "), end, scope.length]),
      [
        ["cd a", "&&", 1],
        ["b", "|", 1],
        ["c", ")", 1],
        ["d", "&", 0],
        ["e", "||", 0],
        ["f", "", 0],
      ],
    );
  });
});

describe("walkCommands", () => {
  // A real tree, because a `cd` to a folder that is not there is handled differently.
  let repo;
  let a;
  let b;
  before(() => {
    repo = join(tmp, "walk");
    a = join(repo, "a");
    b = join(repo, "b");
    mkdirSync(join(a, "b"), { recursive: true });
    mkdirSync(b);
  });
  const dirs = (command) => walkCommands(command, repo).map(({ dir }) => dir);

  it("follows cd, and forgets one made in a subshell", () => {
    assert.deepEqual(dirs("cd a && x; cd b; y"), [repo, a, a, join(a, "b")]);
    assert.deepEqual(dirs("cd -- a && y"), [repo, a]);
    assert.deepEqual(dirs("(cd a && x); y"), [repo, a, repo]);
    assert.deepEqual(dirs("(cd a); (cd b && x); y"), [repo, repo, b, repo]);
    assert.deepEqual(dirs("echo y | (cd a && x); y"), [repo, repo, a, repo]);
    assert.deepEqual(dirs("echo a | cd b; y"), [repo, repo, b]);
  });

  it("gives an unknown folder when only the shell knows where cd goes", () => {
    assert.deepEqual(dirs('cd "$SOMEWHERE" && y'), [repo, UNKNOWN_FOLDER]);
    assert.deepEqual(dirs("cd - && y"), [repo, UNKNOWN_FOLDER]);
    assert.deepEqual(dirs("cd a* && y"), [repo, UNKNOWN_FOLDER]);
    assert.deepEqual(dirs("cd a | cat; y"), [repo, UNKNOWN_FOLDER, UNKNOWN_FOLDER]);
    assert.deepEqual(dirs("cd a & y"), [repo, UNKNOWN_FOLDER]);
    assert.deepEqual(dirs("cd nope; y"), [repo, UNKNOWN_FOLDER]);
  });

  it("marks a folder that is yet to be made, only after &&", () => {
    const [, made] = walkCommands("cd fresh && y", repo);
    assert.deepEqual([made.dir, made.pending], [join(repo, "fresh"), true]);
    const [, there] = walkCommands("cd a && y", repo);
    assert.equal(there.pending, false);
  });

  it("lists the other folders a command might run in when the folder is not certain", () => {
    const others = (command) => walkCommands(command, repo).at(-1).others;
    assert.deepEqual(others("cd a && y"), []);
    assert.deepEqual(others('cd a && cd "$X" && y'), [a, repo]);
    assert.deepEqual(others("cd a | cat; y"), [repo, a]);
    assert.deepEqual(others("cd nope && true; y"), [repo, join(repo, "nope")]);
    // A `cd` that works does not make an uncertain folder certain: an earlier one may have failed.
    assert.deepEqual(others('cd "$X"; cd /; y'), [repo]);
    assert.deepEqual(others("cd nope && cd /; y"), [repo, join(repo, "nope")]);
    assert.deepEqual(others('cd "$X"; cd b; y'), [repo, b]);
    assert.deepEqual(dirs("cd -q a && y"), [repo, UNKNOWN_FOLDER]);
    assert.deepEqual(dirs("cd ~+ && y"), [repo, UNKNOWN_FOLDER]);
  });

  it("reads a folder whose real name has brackets as a folder, not a glob", () => {
    mkdirSync(join(repo, "[id]"));
    assert.deepEqual(dirs('cd "[id]" && y'), [repo, join(repo, "[id]")]);
  });

  it("keeps an escaped quote inside double quotes in one word", () => {
    const [segment] = splitCommands('echo "say \\"cd x\\" && git commit"');
    assert.deepEqual(segment.words, ["echo", 'say "cd x" && git commit']);
  });
});

describe("protect-intent", () => {
  const intent = "apps/tower-poc/intent/0001-tower-web.md";

  cases("protect-intent", edit, BLOCKED, [
    [join(REPO, intent)],
    [intent],
    ["apps/game/intent/0001-new.md"],
  ]);
  cases("protect-intent", edit, ALLOWED, [["apps/tower-poc/spec.md"], ["docs/intent-notes.md"]]);

  cases("protect-intent", shell, BLOCKED, [
    `sed -i '' 's/a/b/' ${intent}`,
    `perl -pi -e 's/a/b/' ${intent}`,
    `echo more >> ${intent}`,
    `cat notes.md > apps/game/intent/0001-new.md`,
    `rm ${intent}`,
    `git mv ${intent} apps/tower-poc/intent/0002.md`,
    `git rm ${intent}`,
    `git checkout HEAD~1 -- ${intent}`,
    `cp /tmp/x.md apps/tower-poc/intent/`,
    `tee ${intent} < /tmp/x`,
    `cd apps/tower-poc && rm -rf intent`,
    `rm -rf apps/tower-poc`,
    `git mv apps/tower-poc apps/tower`,
    `python3 -c "open('${intent}','w').write('x')"`,
    `bash -c "echo x > ${intent}"`,
    `find apps/tower-poc/intent -name '*.md' -delete`,
  ]);
  cases("protect-intent", shell, ALLOWED, [
    `cat ${intent}`,
    `grep -n FR-11 ${intent} | head`,
    `sed -n 1,20p ${intent}`,
    `cat ${intent} > /tmp/copy.md`,
    `git log --oneline -- ${intent}`,
    `git diff main...HEAD -- apps/tower-poc/intent`,
    `git add ${intent} && git commit -m "docs: Bob's intent"`,
    "rm -rf apps/tower-poc/src/web/out",
    "sed -i '' 's/a/b/' apps/tower-poc/spec.md",
    "pnpm check",
  ]);
});

describe("no-main-commit", () => {
  const onMainCase = (hook, command) => shell(hook, command, onMain);
  const onFeatureCase = (hook, command) => shell(hook, command, onFeature);

  cases("no-main-commit", onMainCase, BLOCKED, [
    "git commit -m x",
    "git add . && git -c user.name=x commit -m x",
    "git merge feat/x",
    "git cherry-pick abc123",
    "git revert HEAD",
    "git reset --hard HEAD~1",
    "git checkout notes.txt && git commit -m x",
  ]);
  cases("no-main-commit", onMainCase, ALLOWED, [
    "git status && git log --grep commit",
    "git checkout -b feat/x && git commit -m x",
    "git switch -c feat/x && git commit -m x",
    "git diff",
    "git reset HEAD notes.txt",
    'echo "git commit" > note.txt',
  ]);
  cases("no-main-commit", onFeatureCase, BLOCKED, [
    "git checkout main && git commit -m x",
    "git switch main; git merge feat/app-thing",
    "git checkout - && git commit -m x",
    "git branch -f main HEAD",
    "git branch -D main",
    "git update-ref refs/heads/main HEAD",
    "git push . HEAD:main",
    "git fetch . feat/app-thing:main",
  ]);
  cases("no-main-commit", onFeatureCase, ALLOWED, [
    "git commit -m x",
    'git commit -m "merge main into the notes"',
    "git checkout main -- notes.txt && git commit -m x",
    "git merge main",
    "git rebase main",
    "git branch -D feat/old",
    "git push origin feat/app-thing",
  ]);

  it("blocks: git -C <repo on main> commit, run from a feature branch", () => {
    assert.equal(shell("no-main-commit", `git -C ${onMain} commit -m x`, onFeature), BLOCKED);
  });

  it("follows cd into a repo on main, and back out of one", () => {
    assert.equal(shell("no-main-commit", `cd ${onMain} && git commit -m x`, onFeature), BLOCKED);
    assert.equal(shell("no-main-commit", `cd ${onFeature} && git commit -m x`, onMain), ALLOWED);
  });

  describe("skipping the pre-commit check, on any branch", () => {
    cases("no-main-commit", onFeatureCase, BLOCKED, [
      "git commit --no-verify -m x",
      "git commit -n -m x",
      "git commit -anm x",
      "git merge --no-verify feat/x",
      "LEFTHOOK=0 git commit -m x",
      "export LEFTHOOK=0; git add . && git commit -m x",
      "git -c core.hooksPath=/dev/null commit -m x",
      "git commit --no-verif -m x",
    ]);
    cases("no-main-commit", onFeatureCase, ALLOWED, [
      "git commit --amend --no-edit",
      'git commit -m "-n is not a flag here"',
      "git commit -m -n",
      "git merge -n main",
      "git log -n 5 && git commit -m x",
      "LEFTHOOK=0 pnpm install",
      "LEFTHOOK=0 pnpm install; git commit -m x",
      "git commit -uno -m x",
      "git commit -mrename",
      'git commit -am "-n"',
      'git commit -m "core.hooksPath=/x is the setting"',
    ]);
  });

  it("keeps a branch switch in mind across a cd inside the same repo", () => {
    const moved = "git checkout main && cd . && git commit -m x";
    assert.equal(shell("no-main-commit", moved, onFeature), BLOCKED);
    const left = "git checkout -b feat/x && cd . && git commit -m x";
    assert.equal(shell("no-main-commit", left, onMain), ALLOWED);
  });

  it("does not let a cd in a subshell or a pipeline move the commit elsewhere", () => {
    for (const command of [
      `(cd ${onFeature} && ls); git commit -m x`,
      `cd ${onFeature} | cat; git commit -m x`,
      `cd ${onFeature} & git commit -m x`,
    ]) {
      assert.equal(shell("no-main-commit", command, onMain), BLOCKED, command);
    }
  });

  it("follows a cd that comes after a pipe", () => {
    for (const command of [
      `echo y | (cd ${onMain} && git commit -m x)`,
      `true | cd ${onMain}; git commit -m x`,
      `cd -- ${onMain} && git commit -m x`,
      'git -C "$SOMEWHERE" commit -m x',
    ]) {
      assert.equal(shell("no-main-commit", command, onFeature), BLOCKED, command);
    }
  });

  it("blocks a commit after a cd only the shell can resolve", () => {
    assert.equal(shell("no-main-commit", 'cd "$SOMEWHERE" && git commit -m x', onFeature), BLOCKED);
    assert.equal(shell("no-main-commit", "cd - && git commit -m x", onFeature), BLOCKED);
  });

  it("blocks a commit when git cannot say which branch it is on", () => {
    assert.equal(shell("no-main-commit", "git commit -m x", join(tmp, "no-such-folder")), BLOCKED);
    assert.equal(shell("no-main-commit", "git commit -m x", tmp), BLOCKED);
    assert.equal(shell("no-main-commit", "git status", tmp), ALLOWED);
  });

  it("allows the first commit in a repo that has none yet", () => {
    const empty = join(tmp, "empty");
    mkdirSync(empty);
    gitIn(empty, "init", "-q", "-b", "trunk");
    assert.equal(shell("no-main-commit", "git commit -m x", empty), ALLOWED);
  });
});

describe("git commands that discard uncommitted work", () => {
  // A repo where Bob has an edited intent file and a new one, neither committed.
  let dirty;
  let clean;
  const intentRepo = (name) => {
    const dir = makeRepo(name, "feat/app-thing");
    mkdirSync(join(dir, "apps/game/intent"), { recursive: true });
    writeFileSync(join(dir, "apps/game/intent/0001-first.md"), "first");
    writeFileSync(join(dir, "apps/game/spec.md"), "spec");
    gitIn(dir, "add", "apps");
    gitIn(dir, "commit", "-q", "-m", "intent");
    return dir;
  };
  before(() => {
    clean = intentRepo("intent-clean");
    dirty = intentRepo("intent-dirty");
    writeFileSync(join(dirty, "apps/game/intent/0001-first.md"), "first, edited by Bob");
    writeFileSync(join(dirty, "apps/game/intent/0002-new.md"), "new, not yet added");
    writeFileSync(join(dirty, "apps/game/spec.md"), "spec, edited");
  });

  const inDirty = (hook, command) => shell(hook, command, dirty);
  const inClean = (hook, command) => shell(hook, command, clean);

  cases("protect-intent", inDirty, BLOCKED, [
    "git clean -fd",
    "git clean -fd apps",
    "git stash",
    "git stash -u",
    'git stash push -m "wip"',
    "git checkout -- .",
    "git checkout .",
    "git checkout -f main",
    "git restore apps/game",
    "git reset --hard",
    "git reset --hard HEAD~1",
    "cd apps && git restore .",
    "git switch -f main",
    "git switch --discard-changes main",
    "git restore 'apps/*'",
    "git restore :/",
    "git clean -fd -e build",
    "git reset --merge",
    'cd "$SOMEWHERE" && git reset --hard',
    "git checkout -f -b tmp",
    "git checkout -fb tmp",
    "true | (cd apps && git checkout -- .)",
    "cd nope; git reset --hard",
    "cd nope 2>/dev/null; git stash -u",
    "cd -- apps && git checkout -- .",
    "cd app* && git checkout -- .",
    "git -C app* checkout -- .",
    'git -C "$PWD" checkout -- .',
    'git -C "$SOMEWHERE" reset --hard',
    "git -C nope reset --hard",
    "git -C apps/game rm intent/0001-first.md",
    // The folder is not certain, so every folder the command might run in is checked.
    "cd apps/gam? && rm intent/0001-first.md",
    "cd apps/game | cat; rm intent/0001-first.md",
    "cd apps/game & rm intent/0001-first.md",
    'cd "$SOMEWHERE"; rm apps/game/spec.md intent/0001-first.md; cd apps/game && rm intent/0001-first.md',
    'git -C "$ROOT" rm apps/game/intent/0001-first.md',
    'git -C "$(git rev-parse --show-toplevel)" mv apps/game/intent/0001-first.md x.md',
    "cd nope && true; git reset --hard",
    "cd nope && ls || git reset --hard",
    "cd nope && ls\ngit checkout -- .",
    "cd ~+ && git reset --hard",
    "cd -q apps && git checkout -- .",
    "git switch -f -c tmp",
    "git switch -f -c tmp HEAD",
    "git switch --discard-changes -C tmp main",
  ]);

  it("refuses a wide discard whose folder only the shell can work out, even from a clean repo", () => {
    for (const command of [
      'cd "$SOMEWHERE" && git reset --hard',
      'cd "$SOMEWHERE" && git stash -u',
      "cd - && git clean -fd",
      'git -C "$SOMEWHERE" checkout -- .',
      'git -C "$(git rev-parse --show-toplevel)" restore apps',
      'cd "$SOMEWHERE" && bash -c "git reset --hard"',
    ]) {
      assert.equal(shell("protect-intent", command, clean), BLOCKED, command);
    }
    for (const command of [
      'cd "$SOMEWHERE" && git checkout main',
      'cd "$(git rev-parse --show-toplevel)" && git status',
      "cd nope; git reset --hard",
      "git -C nope reset --hard",
      "cd apps/gam[ && git status",
    ]) {
      assert.equal(shell("protect-intent", command, clean), ALLOWED, command);
    }
  });

  it("keeps the folder uncertain after a cd that may have been skipped", () => {
    assert.equal(
      shell("protect-intent", "cd nope && cd /tmp && true; git reset --hard", dirty),
      BLOCKED,
    );
  });

  it("checks the pin list from every folder the command might run in", () => {
    for (const command of [
      'git -C "$(git rev-parse --show-toplevel)" rm scripts/pinned-versions.json',
      "cd script? && rm pinned-versions.json",
      "cd scripts | cat; rm pinned-versions.json",
    ]) {
      assert.equal(shell("pin-guard", command), BLOCKED, command);
    }
  });

  it("blocks from another folder: cd, git -C, ~ and $CLAUDE_PROJECT_DIR", () => {
    const from = (command, env = {}) =>
      spawnSync("node", [join(HOOKS, "protect-intent.mjs")], {
        input: JSON.stringify({ tool_name: "Bash", cwd: clean, tool_input: { command } }),
        env: { ...process.env, ...env },
      }).status;
    assert.equal(from(`cd ${dirty} && git reset --hard`), BLOCKED);
    assert.equal(from(`git -C ${dirty} stash`), BLOCKED);
    assert.equal(from(`echo y | (cd ${dirty} && git clean -fd)`), BLOCKED);
    assert.equal(
      from('git -C "$CLAUDE_PROJECT_DIR" reset --hard', { CLAUDE_PROJECT_DIR: dirty }),
      BLOCKED,
    );
    assert.equal(from("cd ~/intent-dirty && git reset --hard", { HOME: tmp }), BLOCKED);
    assert.equal(
      from('cd "$CLAUDE_PROJECT_DIR" && git stash -u', { CLAUDE_PROJECT_DIR: dirty }),
      BLOCKED,
    );
    assert.equal(from("git reset --hard"), ALLOWED);
  });
  cases("protect-intent", inDirty, ALLOWED, [
    "git clean -nd",
    "git clean -fd docs",
    "git stash list",
    "git stash pop",
    "git stash push -- apps/game/spec.md",
    "git checkout main",
    "git checkout -- apps/game/spec.md",
    "git restore apps/game/spec.md",
    "git reset HEAD apps",
    "git status",
    "git restore --staged apps",
    "git restore -S apps",
    "git switch -c tmp",
    'cd "$(git rev-parse --show-toplevel)" && git checkout main',
    "git switch main",
    "git checkout -b feat/y",
    "git clone https://example.com/x.git fresh && cd fresh && git checkout main",
  ]);
  cases("protect-intent", inClean, ALLOWED, [
    "git clean -fd",
    "git stash -u",
    "git checkout -- .",
    "git reset --hard",
  ]);
});

describe("pin-guard", () => {
  let manifest;
  let unpinned;
  before(() => {
    manifest = join(tmp, "package.json");
    writeFileSync(
      manifest,
      '{\n  "dependencies": {\n    "ultimatedarktower": "7.1.2",\n    "ws": "8.22.0"\n  }\n}\n',
    );
    mkdirSync(join(tmp, "other"));
    unpinned = join(tmp, "other", "package.json");
    writeFileSync(unpinned, '{\n  "dependencies": {\n    "ws": "8.22.0"\n  }\n}\n');
  });

  const editManifest = (hook, old_string, new_string) =>
    edit(hook, manifest, old_string, new_string);

  cases("pin-guard", editManifest, BLOCKED, [
    ['"ultimatedarktower": "7.1.2"', '"ultimatedarktower": "7.2.0"'],
    ['"ultimatedarktower": "7.1.2"', '"ultimatedarktower": "^7.1.2"'],
    ['    "ultimatedarktower": "7.1.2",\n', ""],
    // The edit strings alone do not name the package. Only the resulting file shows the change.
    ["7.1.2", "8.0.0"],
    ['7.1.2",\n    "ws"', '7.1.3",\n    "ws"'],
  ]);
  cases("pin-guard", editManifest, ALLOWED, [
    ['"ws": "8.22.0"', '"ws": "8.23.0"'],
    ['"ws": "8.22.0"', '"ultimatedarktowerdata": "1.0.0",\n    "ws": "8.22.0"'],
    ['"ultimatedarktower": "7.1.2"', '"ultimatedarktower": "7.1.2"'],
  ]);

  it("allows: adding the exact pin to a package.json that has none", () => {
    const status = edit("pin-guard", unpinned, '"ws"', '"ultimatedarktower": "7.1.2",\n    "ws"');
    assert.equal(status, ALLOWED);
  });
  it("blocks: adding another version to a package.json that has none", () => {
    const status = edit("pin-guard", unpinned, '"ws"', '"ultimatedarktower": "latest",\n    "ws"');
    assert.equal(status, BLOCKED);
  });
  it("blocks: a Write that drops the pin", () => {
    const status = run("pin-guard", {
      tool_name: "Write",
      cwd: REPO,
      tool_input: { file_path: manifest, content: '{ "dependencies": { "ws": "8.22.0" } }' },
    });
    assert.equal(status, BLOCKED);
  });
  it("blocks: editing the list of pinned versions", () => {
    assert.equal(edit("pin-guard", "scripts/pinned-versions.json", "7.1.2", "8.0.0"), BLOCKED);
  });
  it("allows: an edit to a file that is not a package.json", () => {
    assert.equal(edit("pin-guard", "README.md", "a", '"ultimatedarktower": "9.9.9"'), ALLOWED);
  });

  cases("pin-guard", shell, BLOCKED, [
    "pnpm -F tower-poc-server add ultimatedarktower@7.2.0",
    "pnpm add ultimatedarktower@7.1.20",
    "pnpm -F tower-poc-server add ultimatedarktower",
    "cd x && pnpm add -E ultimatedarktower && pnpm check",
    "pnpm up ultimatedarktower",
    "pnpm remove ultimatedarktower",
    "pnpm up --latest",
    "pnpm -r up -L",
    "pnpm up --latest -F tower-poc-server",
    "npm pkg set dependencies.ultimatedarktower=8.0.0",
    "sed -i '' 's/7.1.2/8.0.0/' scripts/pinned-versions.json",
    "echo '{}' > scripts/pinned-versions.json",
  ]);
  cases("pin-guard", shell, ALLOWED, [
    "pnpm -F tower-poc-server add ultimatedarktower@7.1.2 ultimatedarktowerdata@1.0.0",
    "pnpm add ultimatedarktowerdata",
    "pnpm install && npm view ultimatedarktower version",
    "npm view ultimatedarktower@latest",
    'git commit -m "feat: add ultimatedarktower@7.1.2."',
    "pnpm up --latest zod",
    "pnpm up",
    "grep -rn ultimatedarktower apps",
    "cat scripts/pinned-versions.json",
  ]);
});

describe("test-lock", () => {
  it("blocks a test edit on a fix/* branch after its first commit", () => {
    assert.equal(edit("test-lock", "a.test.ts", "a", "b", fixCommitted), BLOCKED);
    assert.equal(edit("test-lock", "tests/smoke.spec.ts", "a", "b", fixCommitted), BLOCKED);
  });
  it("allows the failing test to be written before the first commit", () => {
    assert.equal(edit("test-lock", "a.test.ts", "a", "b", fixFresh), ALLOWED);
  });
  it("allows code edits on a fix/* branch", () => {
    assert.equal(edit("test-lock", "a.ts", "a", "b", fixCommitted), ALLOWED);
  });
  it("allows test edits on other branches", () => {
    assert.equal(edit("test-lock", "a.test.ts", "a", "b", onFeature), ALLOWED);
  });

  describe("removing a .fails marker", () => {
    const body = 'it.fails("adds", () => {\n  expect(add(1, 1)).toBe(2);\n});\n';
    const lockedEdit = (old_string, new_string) => {
      writeFileSync(join(fixCommitted, "marked.test.ts"), body);
      return edit("test-lock", "marked.test.ts", old_string, new_string, fixCommitted);
    };

    it("allows: it.fails( → it( and nothing else", () => {
      assert.equal(lockedEdit('it.fails("adds"', 'it("adds"'), ALLOWED);
    });
    it("blocks: removing the marker and changing the expectation", () => {
      const status = lockedEdit(body, 'it("adds", () => {\n  expect(add(1, 1)).toBe(3);\n});\n');
      assert.equal(status, BLOCKED);
    });
    it("blocks: changing the expectation and keeping the marker", () => {
      assert.equal(lockedEdit("toBe(2)", "toBe(3)"), BLOCKED);
    });
    it("blocks: adding a marker", () => {
      writeFileSync(join(fixCommitted, "plain.test.ts"), 'it("adds", () => {});\n');
      const status = edit(
        "test-lock",
        "plain.test.ts",
        'it("adds"',
        'it.fails("adds"',
        fixCommitted,
      );
      assert.equal(status, BLOCKED);
    });
    it("blocks: a Write that replaces the file, even without the marker", () => {
      writeFileSync(join(fixCommitted, "marked.test.ts"), body);
      const status = run("test-lock", {
        tool_name: "Write",
        cwd: fixCommitted,
        tool_input: { file_path: "marked.test.ts", content: 'it("adds", () => {});\n' },
      });
      assert.equal(status, BLOCKED);
    });
  });

  const locked = (hook, command) => shell(hook, command, fixCommitted);
  cases("test-lock", locked, BLOCKED, [
    "sed -i '' 's/toBe(1)/toBe(2)/' src/a.test.ts",
    "rm src/a.test.ts",
    "git checkout main -- src/a.test.ts",
    "echo '' > src/a.test.ts",
    "git mv src/a.test.ts src/b.test.ts",
  ]);
  cases("test-lock", locked, ALLOWED, [
    "pnpm vitest run src/a.test.ts > /tmp/log.txt 2>&1",
    "cat src/a.test.ts",
    "sed -i '' 's/a/b/' src/a.ts",
    "git add src/a.test.ts && git commit -m x",
  ]);
  it("allows stashing and restoring with an uncommitted test edit on a locked branch", () => {
    writeFileSync(join(fixCommitted, "marked.test.ts"), "it('adds', () => {});\n");
    for (const command of ["git stash -u", "git stash pop", "git checkout -- .", "git clean -fd"]) {
      assert.equal(shell("test-lock", command, fixCommitted), ALLOWED, command);
    }
  });
  it("allows shell edits to tests before the first commit", () => {
    assert.equal(shell("test-lock", "rm src/a.test.ts", fixFresh), ALLOWED);
  });
});

describe("a guard that cannot read its input", () => {
  it("blocks instead of waving the call through", () => {
    const status = spawnSync("node", [join(HOOKS, "protect-intent.mjs")], { input: "not json" });
    assert.equal(status.status, BLOCKED);
  });
});

describe("the hook commands in settings.json", () => {
  const settings = JSON.parse(readFileSync(join(REPO, ".claude/settings.json"), "utf8"));
  const guards = settings.hooks.PreToolUse.flatMap((group) => group.hooks).map(
    (hook) => hook.command,
  );
  const input = JSON.stringify({ tool_name: "Bash", cwd: ".", tool_input: { command: "ls" } });
  // Runs each settings command in a throwaway repo whose hook files hold `source`.
  const runIn = (name, source) => {
    const dir = makeRepo(name, "feat/app-thing");
    if (source !== undefined) {
      mkdirSync(join(dir, ".claude/hooks"), { recursive: true });
      for (const hook of [
        "worktree-guard",
        "protect-intent",
        "no-main-commit",
        "pin-guard",
        "test-lock",
      ]) {
        writeFileSync(join(dir, `.claude/hooks/${hook}.mjs`), source);
      }
    }
    return guards.map((command) => spawnSync("sh", ["-c", command], { cwd: dir, input }).status);
  };

  it("covers every guard entry: four on edits, five on shell commands", () => {
    assert.equal(guards.length, 9);
  });

  it("blocks when a guard cannot load or crashes before it decides", () => {
    assert.deepEqual(new Set(runIn("hook-syntax", "this is not javascript")), new Set([BLOCKED]));
    assert.deepEqual(
      new Set(runIn("hook-import", 'import "./missing-lib.mjs";')),
      new Set([BLOCKED]),
    );
    assert.deepEqual(new Set(runIn("hook-exit", "process.exit(1);")), new Set([BLOCKED]));
  });

  it("allows when the guard allows, and in a checkout that has no hooks at all", () => {
    assert.deepEqual(new Set(runIn("hook-ok", "")), new Set([ALLOWED]));
    assert.deepEqual(new Set(runIn("hook-none", undefined)), new Set([ALLOWED]));
  });
});

// A main checkout plus two step worktrees made the way `pnpm wt` makes them (.wt.json at the root).
describe("worktree-guard and hooks inside a step worktree", () => {
  let home;
  let mainCheckout;
  let mine;
  let theirs;
  before(() => {
    home = mkdtempSync(join(tmpdir(), "dark-tower-wtguard-"));
    mainCheckout = join(home, "Repo");
    mkdirSync(mainCheckout);
    gitIn(mainCheckout, "init", "-q", "-b", "main");
    gitIn(mainCheckout, "commit", "-q", "--allow-empty", "-m", "init");
    mine = join(home, "BloodTower-work", "feat", "app-a");
    theirs = join(home, "BloodTower-work", "feat", "app-b");
    for (const [dir, branch] of [
      [mine, "feat/app-a"],
      [theirs, "feat/app-b"],
    ]) {
      gitIn(mainCheckout, "worktree", "add", "-q", "-b", branch, dir, "main");
      writeFileSync(join(dir, ".wt.json"), JSON.stringify({ branch, root: dir }));
      mkdirSync(join(dir, "src"));
    }
  });
  after(() => rmSync(home, { recursive: true, force: true }));

  const inMine = (hook, command) => shell(hook, command, mine);
  const editFromMine = (hook, file) => edit(hook, file, "a", "b", mine);

  it("blocks edits outside the worktree and allows edits inside it", () => {
    assert.equal(editFromMine("worktree-guard", join(mine, "src/a.ts")), ALLOWED);
    assert.equal(editFromMine("worktree-guard", "src/new/b.ts"), ALLOWED);
    assert.equal(editFromMine("worktree-guard", join(mainCheckout, "a.ts")), BLOCKED);
    assert.equal(editFromMine("worktree-guard", join(theirs, "src/a.ts")), BLOCKED);
    assert.equal(editFromMine("worktree-guard", "../app-b/src/a.ts"), BLOCKED);
    assert.equal(editFromMine("worktree-guard", join(tmpdir(), "scratch.txt")), ALLOWED);
  });

  cases("worktree-guard", inMine, ALLOWED, [
    "echo x > src/a.ts",
    "pnpm check > /tmp/check.log 2>&1",
    "rm -rf src/old",
    "git add -A && git commit -m x",
    "cat ../../../Repo/README.md",
  ]);
  cases("worktree-guard", inMine, BLOCKED, [
    "echo x > ../app-b/src/a.ts",
    "cp src/a.ts ../../../Repo/a.ts",
    "cd ../../../Repo && rm notes.txt",
    "sed -i '' s/a/b/ ../app-b/src/a.ts",
    "git -C ../../../Repo checkout -- .",
  ]);

  it("does nothing outside a step worktree", () => {
    assert.equal(shell("worktree-guard", "echo x > ../elsewhere.txt", mainCheckout), ALLOWED);
    assert.equal(edit("worktree-guard", join(mine, "src/a.ts"), "a", "b", mainCheckout), ALLOWED);
  });

  it("no-main-commit reads the worktree's own branch, not the main checkout's", () => {
    // The main checkout is on main; a commit from the worktree is on feat/app-a and allowed.
    assert.equal(inMine("no-main-commit", "git commit -m x"), ALLOWED);
    assert.equal(shell("no-main-commit", "git commit -m x", mainCheckout), BLOCKED);
  });
});
