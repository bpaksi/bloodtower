import type { PromptScope } from "../lib/prompt.ts";

/**
 * Publishes the prompt scopes of this page for PromptStarter. A button with data-prompt="<key>"
 * opens the starter with scopes[key].
 */
export function PromptScopes({ scopes }: { scopes: Record<string, PromptScope> }) {
  return (
    <script
      type="application/json"
      data-prompt-scopes=""
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON data block, `<` escaped below.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(scopes).replace(/</g, "\\u003c") }}
    />
  );
}
