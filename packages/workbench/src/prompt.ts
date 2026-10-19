/**
 * Prompt starters. A workbench is read-only: changes are made by pasting a prompt into Claude.
 * A starter fixes the scope (file, section, lines, IDs) so Bob only has to write the idea.
 */

export type PromptMode = "change" | "add" | "ask";

export const MODE_LABEL: Record<PromptMode, string> = {
  change: "Change",
  add: "Add",
  ask: "Ask",
};

export type PromptScope = {
  /** Repo-relative file, or null for a new idea with no file yet. */
  file: string | null;
  /** Heading path inside the file; empty for the whole file. */
  section: string[];
  lines: { start: number; end: number } | null;
  ids: string[];
};

/** One workbench's prompt wording. Plain strings, so it can be handed to the browser. */
export type PromptConfig = {
  /** The rules line per mode. */
  rules: Record<PromptMode, string>;
  /** What "Scope:" says for a new idea with no file yet. */
  newScope: string;
};

const MAX_IDS = 40;

const LEAD: Record<PromptMode, string> = {
  change: "Change",
  add: "Idea to add",
  ask: "Question",
};

export function scopeLines(scope: PromptScope, config: PromptConfig): string[] {
  const out: string[] = [];
  out.push(`Scope: ${scope.file ?? config.newScope}`);
  if (scope.section.length > 0) {
    const where = scope.lines ? ` (lines ${scope.lines.start}–${scope.lines.end})` : "";
    out.push(`Section: ${scope.section.join(" › ")}${where}`);
  }
  if (scope.ids.length > 0) {
    const shown = scope.ids.slice(0, MAX_IDS).join(", ");
    const more = scope.ids.length > MAX_IDS ? ` and ${scope.ids.length - MAX_IDS} more` : "";
    out.push(`IDs in scope: ${shown}${more}`);
  }
  return out;
}

export function buildPrompt(
  scope: PromptScope,
  mode: PromptMode,
  idea: string,
  config: PromptConfig,
): string {
  return [
    ...scopeLines(scope, config),
    "",
    `Rules: ${config.rules[mode]}`,
    "",
    `${LEAD[mode]}: ${idea.trim()}`,
  ].join("\n");
}
