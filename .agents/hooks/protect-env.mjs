// PreToolUse (Read|Edit|Write|MultiEdit|Bash): secrets live in .env* files; agents never read or edit them.
import { basename, resolve } from "node:path";
import { block, editedPath, findShellWrite, runGuard } from "../../.claude/hooks/lib.mjs";

const WHY =
  "Secrets belong in env only and .env* files are off limits to agents (AGENTS.md, docs/sdlc.md). Ask Bob if a variable needs to be set.";

const isEnvFile = (path) => basename(path).startsWith(".env");

runGuard("protect-env", (input) => {
  if (input.tool_name === "Bash") {
    const reason = findShellWrite(input.tool_input?.command ?? "", input.cwd, (path) =>
      isEnvFile(path),
    );
    if (reason) block(`${reason}, which is a .env file. ${WHY}`);
    return;
  }

  const file = editedPath(input);
  if (file && isEnvFile(resolve(input.cwd || ".", file))) {
    block(`${file} is a .env file. ${WHY}`);
  }
});
