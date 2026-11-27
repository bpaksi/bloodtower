// Tests the Antigravity hook adapters (.agents/hooks.json -> run-guards.mjs, protect-env.mjs, format.mjs).
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { translatePayload } from "./run-guards.mjs";

// Git sets GIT_DIR and GIT_INDEX_FILE when it runs a hook; clear them so temp repos work in pre-commit.
for (const name of Object.keys(process.env)) {
  if (name.startsWith("GIT_")) delete process.env[name];
}

const HOOKS = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HOOKS, "../..");
const RUN_GUARDS = join(HOOKS, "run-guards.mjs");
const FORMAT = join(HOOKS, "format.mjs");
const PINS = JSON.parse(readFileSync(join(REPO, "scripts/pinned-versions.json"), "utf8"));

const runGuards = (guards, payload) => {
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  const res = spawnSync(process.execPath, [RUN_GUARDS, ...guards], {
    input: raw,
    encoding: "utf8",
  });
  assert.equal(res.status, 0, `adapter must exit 0, stderr: ${res.stderr}`);
  return JSON.parse(res.stdout);
};

const call = (name, args, cwd = REPO) => ({
  hookEventName: "PreToolUse",
  cwd,
  workspacePaths: [cwd],
  toolCall: { id: "toolu_test", name, args },
});

let tmp;
let onMain;
let onFeature;
let fixCommitted;
let stepWorktree;

const gitIn = (dir, ...args) =>
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], {
    cwd: dir,
    stdio: "ignore",
  });

const makeRepo = (name, branch, extraCommits = 0) => {
  const dir = join(tmp, name);
  mkdirSync(dir, { recursive: true });
  gitIn(dir, "init", "-q", "-b", "main");
  gitIn(dir, "commit", "-q", "--allow-empty", "-m", "init");
  writeFileSync(join(dir, "notes.txt"), "x\n");
  if (branch !== "main") gitIn(dir, "checkout", "-q", "-b", branch);
  for (let i = 0; i < extraCommits; i++) gitIn(dir, "commit", "-q", "--allow-empty", "-m", "c");
  return dir;
};

before(() => {
  tmp = mkdtempSync(join(tmpdir(), "dark-tower-agy-hooks-"));
  onMain = makeRepo("main", "main");
  onFeature = makeRepo("feature", "feat/app-thing");
  fixCommitted = makeRepo("fix-committed", "fix/app-bug", 1);
  stepWorktree = join(tmp, "BloodTower-work", "feat", "app-step");
  gitIn(onMain, "worktree", "add", "-q", "-b", "feat/app-step", stepWorktree, "main");
  writeFileSync(join(stepWorktree, ".wt.json"), JSON.stringify({ ports: { dev: 4757 } }));
});

after(() => rmSync(tmp, { recursive: true, force: true }));

describe("Antigravity hooks.json config", () => {
  it("parses as valid JSON and registers PreToolUse and PostToolUse handlers", () => {
    const config = JSON.parse(readFileSync(join(REPO, ".agents/hooks.json"), "utf8"));
    assert.ok(Array.isArray(config["bloodtower-guards"].PreToolUse));
    assert.ok(Array.isArray(config["bloodtower-format"].PostToolUse));
  });
});

describe("translatePayload", () => {
  it("translates run_command, read_file, write_file, edit_file, and IDE/CLI file tools", () => {
    assert.deepEqual(translatePayload(call("run_command", { CommandLine: "git status" })), {
      tool_name: "Bash",
      cwd: REPO,
      tool_input: { command: "git status" },
    });
    assert.deepEqual(translatePayload(call("read_file", { Path: "/a/.env" })), {
      tool_name: "Read",
      cwd: REPO,
      tool_input: { file_path: "/a/.env" },
    });
    assert.deepEqual(translatePayload(call("view_file", { AbsolutePath: "/a/.env.local" })), {
      tool_name: "Read",
      cwd: REPO,
      tool_input: { file_path: "/a/.env.local" },
    });
    assert.deepEqual(
      translatePayload(call("edit_file", { Path: "/a/x.ts", Target: "a", Replacement: "b" })),
      {
        tool_name: "Edit",
        cwd: REPO,
        tool_input: { file_path: "/a/x.ts", old_string: "a", new_string: "b", replace_all: true },
      },
    );
    assert.deepEqual(
      translatePayload(
        call("multi_replace_file_content", {
          TargetFile: "/a/x.ts",
          ReplacementChunks: [
            { TargetContent: "x", ReplacementContent: "y", AllowMultiple: false },
          ],
        }),
      ),
      {
        tool_name: "MultiEdit",
        cwd: REPO,
        tool_input: {
          file_path: "/a/x.ts",
          edits: [{ old_string: "x", new_string: "y", replace_all: false }],
        },
      },
    );
  });
});

describe("protect-env", () => {
  it("denies reading or editing .env* files across Antigravity tools", () => {
    for (const payload of [
      call("read_file", { Path: ".env" }),
      call("view_file", { AbsolutePath: join(REPO, "apps/bloodtower/.env.local") }),
      call("write_file", { Path: ".env.production", Content: "KEY=1" }),
      call("edit_file", { Path: ".env", Target: "a", Replacement: "b" }),
      call("run_command", { CommandLine: "echo KEY=1 > .env.local" }),
    ]) {
      const out = runGuards(["protect-env"], payload);
      assert.equal(out.decision, "deny", JSON.stringify(payload));
      assert.match(out.reason, /\.env/);
    }
  });

  it("allows normal files whose names merely contain env", () => {
    for (const payload of [
      call("read_file", { Path: "src/env.ts" }),
      call("edit_file", { Path: "next-env.d.ts", Target: "a", Replacement: "b" }),
      call("run_command", { CommandLine: "echo ok > notes.txt" }),
    ]) {
      assert.equal(runGuards(["protect-env"], payload).decision, "allow");
    }
  });
});

describe("shared guards via run-guards.mjs", () => {
  it("enforces protect-intent on edit_file, write_file, and run_command", () => {
    assert.equal(
      runGuards(["protect-intent"], call("edit_file", { Path: "apps/bloodtower/intent/0001.md" }))
        .decision,
      "deny",
    );
    assert.equal(
      runGuards(["protect-intent"], call("run_command", { CommandLine: "rm -rf apps/bloodtower" }))
        .decision,
      "deny",
    );
    assert.equal(
      runGuards(["protect-intent"], call("edit_file", { Path: "apps/bloodtower/spec.md" }))
        .decision,
      "allow",
    );
  });

  it("enforces no-main-commit on run_command", () => {
    assert.equal(
      runGuards(
        ["no-main-commit"],
        call("run_command", { CommandLine: 'git commit -m "x"' }, onMain),
      ).decision,
      "deny",
    );
    assert.equal(
      runGuards(
        ["no-main-commit"],
        call("run_command", { CommandLine: 'git commit --no-verify -m "x"' }, onFeature),
      ).decision,
      "deny",
    );
    assert.equal(
      runGuards(
        ["no-main-commit"],
        call("run_command", { CommandLine: 'git commit -m "x"' }, onFeature),
      ).decision,
      "allow",
    );
  });

  it("enforces pin-guard on edit_file, write_file (including Append), and run_command", () => {
    const pkgPath = join(tmp, "package.json");
    const [pinnedName, pinnedVersion] = Object.entries(PINS)[0];
    writeFileSync(pkgPath, JSON.stringify({ dependencies: { [pinnedName]: pinnedVersion } }));

    assert.equal(
      runGuards(
        ["pin-guard"],
        call("edit_file", { Path: pkgPath, Target: pinnedVersion, Replacement: "9.9.9" }),
      ).decision,
      "deny",
    );
    assert.equal(
      runGuards(
        ["pin-guard"],
        call("write_file", {
          Path: pkgPath,
          Content: `,"${pinnedName}": "9.9.9"`,
          Append: true,
        }),
      ).decision,
      "deny",
    );
    assert.equal(
      runGuards(
        ["pin-guard"],
        call("run_command", { CommandLine: `pnpm add ${pinnedName}@latest` }),
      ).decision,
      "deny",
    );
    assert.equal(
      runGuards(
        ["pin-guard"],
        call("write_file", {
          Path: pkgPath,
          Content: JSON.stringify({ dependencies: { [pinnedName]: pinnedVersion } }),
        }),
      ).decision,
      "allow",
    );
  });

  it("enforces test-lock on fix/* branches while allowing .fails removal via edit_file", () => {
    const testPath = join(fixCommitted, "sample.test.ts");
    writeFileSync(testPath, 'it.fails("repro", () => {});\n');

    assert.equal(
      runGuards(
        ["test-lock"],
        call(
          "edit_file",
          { Path: testPath, Target: "repro", Replacement: "changed" },
          fixCommitted,
        ),
      ).decision,
      "deny",
    );
    assert.equal(
      runGuards(
        ["test-lock"],
        call(
          "edit_file",
          { Path: testPath, Target: "it.fails(", Replacement: "it(" },
          fixCommitted,
        ),
      ).decision,
      "allow",
    );
  });

  it("enforces worktree-guard inside a .wt.json worktree", () => {
    assert.equal(
      runGuards(
        ["worktree-guard"],
        call("write_file", { Path: join(onMain, "outside.ts"), Content: "x" }, stepWorktree),
      ).decision,
      "deny",
    );
    assert.equal(
      runGuards(
        ["worktree-guard"],
        call("write_file", { Path: join(stepWorktree, "inside.ts"), Content: "x" }, stepWorktree),
      ).decision,
      "allow",
    );
    assert.equal(
      runGuards(
        ["worktree-guard"],
        call("write_file", { Path: join(tmpdir(), "scratch.txt"), Content: "x" }, stepWorktree),
      ).decision,
      "allow",
    );
  });

  it("fails closed on malformed input, missing guards, or unsupported tools", () => {
    assert.equal(runGuards(["protect-env"], "{not-json").decision, "deny");
    assert.equal(runGuards([], call("run_command", { CommandLine: "echo hi" })).decision, "deny");
    assert.equal(
      runGuards(["nonexistent-guard"], call("run_command", { CommandLine: "echo hi" })).decision,
      "deny",
    );
    assert.equal(
      runGuards(["protect-env"], call("unknown_tool", { Path: "foo.ts" })).decision,
      "deny",
    );
  });
});

describe("PostToolUse format.mjs", () => {
  it("outputs {} and formats a supported file without failing on missing files", () => {
    const file = join(tmp, "unformatted.json");
    writeFileSync(file, '{"a":1,"b":2}\n');

    const res = spawnSync(process.execPath, [FORMAT], {
      input: JSON.stringify({
        hookEventName: "PostToolUse",
        cwd: REPO,
        toolCall: { id: "toolu_fmt", name: "write_file", args: { Path: file } },
      }),
      encoding: "utf8",
    });
    assert.equal(res.status, 0);
    assert.deepEqual(JSON.parse(res.stdout), {});

    const missing = spawnSync(process.execPath, [FORMAT], {
      input: JSON.stringify({
        hookEventName: "PostToolUse",
        cwd: REPO,
        toolCall: { id: "toolu_fmt2", name: "write_file", args: { Path: join(tmp, "nope.ts") } },
      }),
      encoding: "utf8",
    });
    assert.equal(missing.status, 0);
    assert.deepEqual(JSON.parse(missing.stdout), {});
  });
});
