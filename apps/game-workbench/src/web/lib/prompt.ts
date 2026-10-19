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
    "Edit only what the scope needs in research/game-design (cards follow cards/README.md). Keep every existing ID; a new piece gets the next free ID of its kind. Follow CLAUDE.md for the branch, and tell me what changed by ID.",
  add: "Turn this into cards in research/game-design/cards (format: cards/README.md): one card per thought with a one-line title, linked to the scope with a verb (needs, raises, answers, uses, refines, affects, conflicts). If a question is already answered in a card or a document, link that answer instead of making a new card. Use the next free ID per type. Follow CLAUDE.md for the branch, and list the new IDs.",
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
