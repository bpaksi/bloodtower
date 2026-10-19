/**
 * The game workbench's prompt wording. The workbench is read-only: changes are made by pasting a
 * prompt into Claude. A starter fixes the scope (file, section, lines, IDs) so Bob only has to
 * write the idea.
 */
import {
  buildPrompt as buildPromptWith,
  type PromptConfig,
  type PromptMode,
  type PromptScope,
  scopeLines as scopeLinesWith,
} from "@dark-tower/workbench";

export { MODE_LABEL, type PromptMode, type PromptScope } from "@dark-tower/workbench";

export const GAME_PROMPT: PromptConfig = {
  rules: {
    change:
      "Edit only what the scope needs in research/game-design (cards follow cards/README.md). Keep every existing ID; a new piece gets the next free ID of its kind. Follow CLAUDE.md for the branch, and tell me what changed by ID.",
    add: "Turn this into cards in research/game-design/cards (format: cards/README.md): one card per thought with a one-line title, linked to the scope with a verb (needs, raises, answers, uses, refines, affects, conflicts). If a question is already answered in a card or a document, link that answer instead of making a new card. Use the next free ID per type. Follow CLAUDE.md for the branch, and list the new IDs.",
    ask: "Answer only. Do not edit any file. Cite IDs and file lines.",
  },
  newScope: "research/game-design (no file yet; pick the right place)",
};

export function scopeLines(scope: PromptScope): string[] {
  return scopeLinesWith(scope, GAME_PROMPT);
}

export function buildPrompt(scope: PromptScope, mode: PromptMode, idea: string): string {
  return buildPromptWith(scope, mode, idea, GAME_PROMPT);
}
