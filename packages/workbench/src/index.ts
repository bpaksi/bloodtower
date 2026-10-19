/** Everything that runs anywhere (no Node imports). Disk access is in ./server.ts. */
export { buildGraph, type CardSchema, parseCard, splitFrontMatter } from "./cards.ts";
export * from "./graph-types.ts";
export { extractIds, type IdScheme, idFamily, makeIdScheme } from "./ids.ts";
export { labelPoint, layout, type Neighbour, neighbours, type Placed } from "./layout.ts";
export { chipHtml, type LinkTarget, linkTarget, makeRenderer } from "./markdown.ts";
export {
  buildPrompt,
  MODE_LABEL,
  type PromptConfig,
  type PromptMode,
  type PromptScope,
  scopeLines,
} from "./prompt.ts";
export { anchorMaker, parseSections, type Section, slugify } from "./sections.ts";
