// PreToolUse adapter for Antigravity (.agents/hooks.json).
// Translates Antigravity's camelCase `toolCall` payload into the Claude hook schema expected by
// `.claude/hooks/*.mjs` and `.agents/hooks/protect-env.mjs`, runs each requested guard in order,
// and emits Antigravity's JSON decision (`{"decision":"allow"}` or `{"decision":"deny","reason":"..."}`).
// Fails closed on any error or non-zero guard exit.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLAUDE_HOOKS = resolve(HERE, "../../.claude/hooks");
const REPO_ROOT = resolve(HERE, "../..");

const respond = (payload) => {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
  process.exit(0);
};

const deny = (reason) => respond({ decision: "deny", reason });
const allow = () => respond({ decision: "allow" });

const resolveGuard = (name) => {
  const local = resolve(HERE, `${name}.mjs`);
  if (existsSync(local)) return local;
  const shared = resolve(CLAUDE_HOOKS, `${name}.mjs`);
  if (existsSync(shared)) return shared;
  return undefined;
};

/** Translates an Antigravity PreToolUse payload into the Claude hook stdin shape. */
export const translatePayload = (input) => {
  const cwd = input.cwd || input.workspacePaths?.[0] || REPO_ROOT;
  const call = input.toolCall;
  if (!call || typeof call.name !== "string") {
    throw new Error("missing toolCall.name in PreToolUse payload");
  }
  const args = call.args ?? {};
  const name = call.name;

  if (name === "run_command") {
    const command = args.CommandLine ?? args.command ?? "";
    return { tool_name: "Bash", cwd, tool_input: { command } };
  }

  if (name === "read_file" || name === "view_file") {
    const file_path = args.Path ?? args.AbsolutePath ?? args.file_path ?? "";
    return { tool_name: "Read", cwd, tool_input: { file_path } };
  }

  if (name === "write_file" || name === "write_to_file") {
    const file_path = args.Path ?? args.TargetFile ?? args.file_path ?? "";
    const raw = args.Content ?? args.CodeContent ?? args.content ?? "";
    let content = raw;
    if (args.Append === true && file_path && !basename(file_path).startsWith(".env")) {
      const fullPath = resolve(cwd, file_path);
      const before = existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
      content = `${before}${raw}`;
    }
    return { tool_name: "Write", cwd, tool_input: { file_path, content } };
  }

  if (name === "edit_file") {
    const file_path = args.Path ?? args.file_path ?? "";
    return {
      tool_name: "Edit",
      cwd,
      tool_input: {
        file_path,
        old_string: args.Target ?? "",
        new_string: args.Replacement ?? "",
        replace_all: true,
      },
    };
  }

  if (name === "replace_file_content") {
    const file_path = args.TargetFile ?? args.Path ?? args.file_path ?? "";
    return {
      tool_name: "Edit",
      cwd,
      tool_input: {
        file_path,
        old_string: args.TargetContent ?? "",
        new_string: args.ReplacementContent ?? "",
        replace_all: Boolean(args.AllowMultiple),
      },
    };
  }

  if (name === "multi_replace_file_content") {
    const file_path = args.TargetFile ?? args.Path ?? args.file_path ?? "";
    const chunks = Array.isArray(args.ReplacementChunks) ? args.ReplacementChunks : [];
    return {
      tool_name: "MultiEdit",
      cwd,
      tool_input: {
        file_path,
        edits: chunks.map((chunk) => ({
          old_string: chunk.TargetContent ?? "",
          new_string: chunk.ReplacementContent ?? "",
          replace_all: Boolean(chunk.AllowMultiple),
        })),
      },
    };
  }

  throw new Error(`unsupported toolCall.name: ${name}`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const guards = process.argv.slice(2);
  try {
    if (guards.length === 0) {
      deny("run-guards was invoked with no guard names. Tell Bob; do not work around it.");
    }
    const raw = readFileSync(0, "utf8");
    const input = JSON.parse(raw || "{}");
    const translated = JSON.stringify(translatePayload(input));

    for (const name of guards) {
      const script = resolveGuard(name);
      if (!script) {
        deny(`guard hook "${name}" was not found. Tell Bob; do not work around it.`);
      }
      const result = spawnSync(process.execPath, [script], {
        input: translated,
        encoding: "utf8",
      });
      if (result.error) {
        deny(
          `the ${name} hook failed to launch (${result.error.message}). Tell Bob; do not work around it.`,
        );
      }
      if (result.status !== 0) {
        const message = (result.stderr || "").trim();
        deny(
          message ||
            `the ${name} hook blocked the call (exit ${result.status ?? result.signal}). Tell Bob; do not work around it.`,
        );
      }
    }
    allow();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    deny(`the run-guards hook failed (${message}). Tell Bob; do not work around it.`);
  }
}
