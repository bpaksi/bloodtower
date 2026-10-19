/**
 * Prompt starters. The workbench is read-only: changes are made by pasting a prompt into Claude.
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

const MAX_IDS = 40;

const RULES: Record<PromptMode, string> = {
  change:
    "Edit only what the scope needs, in research/game-design. Keep every existing ID; give a new piece the next free ID of its kind (SCR-, UI-, CUE-, SND-, MEC-, IDEA-, SK-, EX-, Q-). Follow CLAUDE.md for the branch, and tell me what changed by ID.",
  add: "Add this as a new piece in research/game-design, near the scope. Give it the next free ID of its kind (SCR-, UI-, CUE-, SND-, MEC-, IDEA-, SK-, EX-, Q-) and link it to the related IDs. Follow CLAUDE.md for the branch, and tell me the new ID.",
  ask: "Answer only. Do not edit any file. Cite IDs and file lines.",
};

const LEAD: Record<PromptMode, string> = {
  change: "Change",
  add: "Idea to add",
  ask: "Question",
};

export function scopeLines(scope: PromptScope): string[] {
  const out: string[] = [];
  out.push(`Scope: ${scope.file ?? "research/game-design (no file yet; pick the right place)"}`);
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

export function buildPrompt(scope: PromptScope, mode: PromptMode, idea: string): string {
  return [
    ...scopeLines(scope),
    "",
    `Rules: ${RULES[mode]}`,
    "",
    `${LEAD[mode]}: ${idea.trim()}`,
  ].join("\n");
}
