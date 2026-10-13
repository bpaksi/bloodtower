// PreToolUse (Edit|Write|MultiEdit|Bash): on fix/* branches the failing test is committed first.
// After that first commit, test files are locked so the fix cannot bend the test.
import {
  block,
  commitsAheadOfMain,
  currentBranch,
  editedPath,
  findShellWrite,
  runGuard,
} from "./lib.mjs";

const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

const WHY =
  "This fix/* branch already has its failing-test commit. Fix the code, not the test (/bugfix). If the test itself is wrong, tell Bob.";

runGuard("test-lock", (input) => {
  const shell = input.tool_name === "Bash";
  const file = shell ? "" : editedPath(input);
  if (!shell && !TEST_FILE.test(file)) return;

  if (!currentBranch(input.cwd).startsWith("fix/")) return;
  if (commitsAheadOfMain(input.cwd) < 1) return;

  if (!shell) block(`${file} is a test file. ${WHY}`);

  const reason = findShellWrite(input.tool_input?.command ?? "", input.cwd, (path) =>
    TEST_FILE.test(path),
  );
  if (reason) block(`${reason}, which is a test file. ${WHY}`);
});
