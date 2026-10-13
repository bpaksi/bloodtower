// Feeds each guard hook the JSON a tool call would send and checks whether it blocks (exit 2).
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { splitCommands } from "./lib.mjs";

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
    assert.deepEqual(segment, { words: ["cmd", "arg"], redirects: ["out.txt"] });
    assert.deepEqual(splitCommands("cmd 2>/dev/null >>log")[0].redirects, ["/dev/null", "log"]);
  });
});

describe("protect-intent", () => {
  const intent = "apps/tower-poc/intent/0001-dark-tower-web.md";

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
