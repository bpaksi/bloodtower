// PreToolUse (Edit|Write|MultiEdit|Bash): on fix/* branches the failing test is committed first.
// After that first commit, test files are locked so the fix cannot bend the test.
// One edit stays open: removing a `.fails` marker (`it.fails(` → `it(`) once the fix is in.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  block,
  commitsAheadOfMain,
  currentBranch,
  editedPath,
  findShellWrite,
  runGuard,
  textAfter,
} from "./lib.mjs";

const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

const FAILS_MARKER = /\b(it|test)\.fails\b/g;

/** True when the edit removes one or more `.fails` markers and changes nothing else. */
const onlyRemovesFailsMarker = (input, path) => {
  if (!existsSync(path)) return false;
  const before = readFileSync(path, "utf8");
  const after = textAfter(input, before);
  const count = (text) => (text.match(FAILS_MARKER) ?? []).length;
  const unmarked = (text) => text.replace(FAILS_MARKER, "$1");
  return count(after) < count(before) && unmarked(after) === unmarked(before);
};

const WHY =
  "This fix/* branch already has its failing-test commit. Fix the code, not the test (/bugfix). If the test itself is wrong, tell Bob.";

runGuard("test-lock", (input) => {
  const shell = input.tool_name === "Bash";
  const file = shell ? "" : editedPath(input);
  if (!shell && !TEST_FILE.test(file)) return;

  if (!currentBranch(input.cwd).startsWith("fix/")) return;
  if (commitsAheadOfMain(input.cwd) < 1) return;

  if (!shell) {
    if (onlyRemovesFailsMarker(input, resolve(input.cwd || ".", file))) return;
    block(`${file} is a test file. ${WHY} The one edit allowed here is removing a .fails marker.`);
  }

  const reason = findShellWrite(input.tool_input?.command ?? "", input.cwd, (path) =>
    TEST_FILE.test(path),
  );
  if (reason) block(`${reason}, which is a test file. ${WHY}`);
});
