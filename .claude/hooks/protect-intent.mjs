// PreToolUse (Edit|Write|MultiEdit|NotebookEdit|Bash): intent files are Bob's words. Claude never edits them.
import { resolve } from "node:path";
import { block, editedPath, findShellWrite, runGuard } from "./lib.mjs";

const INTENT = /\/apps\/[^/]+\/intent(\/|$)/;
// Removing or moving `apps` or `apps/<app>` takes the intent folder with it.
const ABOVE_INTENT = /\/apps(\/[^/]+)?\/?$/;

const WHY =
  "Intent is written by Bob only (docs/sdlc.md). Put design changes in the app's spec.md, or ask Bob to write a new intent.";

runGuard("protect-intent", (input) => {
  if (input.tool_name === "Bash") {
    const reason = findShellWrite(
      input.tool_input?.command ?? "",
      input.cwd,
      (path, { moves }) => INTENT.test(path) || (moves && ABOVE_INTENT.test(path)),
    );
    if (reason) block(`${reason}, which touches an intent folder. ${WHY}`);
    return;
  }

  const file = editedPath(input);
  if (file && INTENT.test(resolve(input.cwd || ".", file))) {
    block(`${file} is an intent file. ${WHY}`);
  }
});
