import {
  chipHtml as chipHtmlWith,
  linkTarget as linkTargetWith,
  makeRenderer,
} from "@dark-tower/workbench";
import { GAME_IDS } from "./ids.ts";

const docHref = (slug: string) => `/doc/${slug}`;

export function chipHtml(id: string): string {
  return chipHtmlWith(id, GAME_IDS);
}

/**
 * Where a link in a design doc should go. A sibling `.md` opens in the workbench; anything else
 * relative points outside the design folder and is shown as text with its path (no dead link).
 */
export function linkTarget(href: string) {
  return linkTargetWith(href, docHref);
}

/** Renders a doc; IDs become copyable chips, sibling `.md` links stay inside the workbench. */
export const renderMarkdown = makeRenderer({ ids: GAME_IDS, docHref });
