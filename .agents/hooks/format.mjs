// PostToolUse (write_file|edit_file|write_to_file|replace_file_content|multi_replace_file_content):
// format the edited file and apply Biome's safe fixes so it matches pre-commit `biome check`.
// Never blocks; always outputs `{}` on stdout.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { repoRoot } from "../../.claude/hooks/lib.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}");
  const args = input.toolCall?.args ?? {};
  const file = args.Path ?? args.TargetFile ?? input.tool_input?.file_path ?? "";
  const cwd = input.cwd || input.workspacePaths?.[0] || REPO_ROOT;

  if (file) {
    const filePath = resolve(cwd, file);
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      const root = repoRoot(cwd) || REPO_ROOT;
      const biome = [
        resolve(root, "node_modules/.bin/biome"),
        resolve(REPO_ROOT, "node_modules/.bin/biome"),
      ].find((candidate) => existsSync(candidate));
      if (biome) {
        execFileSync(
          biome,
          ["check", "--write", "--no-errors-on-unmatched", "--files-ignore-unknown=true", filePath],
          { cwd: root, stdio: "ignore" },
        );
      }
    }
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`format hook skipped: ${message}\n`);
}

process.stdout.write("{}\n");
