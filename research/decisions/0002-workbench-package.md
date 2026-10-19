# 0002 — Shared workbench package
Date: 2026-10-19 · Status: accepted

## Context
`apps/game-workbench` shows the game design (`research/game-design/`) as documents and a graph of linked cards, and turns every change into a prompt for Claude. Bob wants a second workbench for stories (`apps/story-workbench`): several stories side by side, each kept apart, with the story code in every ID (`DRA-CHR-004`). Bob ruled that it is a separate app and that the shared code moves to `packages/` first, once the game-workbench graph work is merged.

## Decision
- `packages/workbench` (`@dark-tower/workbench`) holds what both workbenches need:
  - ID schemes (`makeIdScheme`)
  - the markdown renderer with ID chips, and sections
  - card parsing against a `CardSchema`, and graph building
  - the focus layout and the prompt text
  - the disk loaders (`/server`)
  - the React parts: FocusGraph, Chip, ChipCopy, PromptStarter, PromptScopes, LineJump (`/components`)
  - the shared CSS (`/styles`)
- Each app keeps its own content config: folder, ID families, card types and ID shapes, layers, link verbs, prompt rules, document groups, and its pages.
- Client components take plain-data props (labels, base paths, prompt wording), because a server page cannot pass functions to them.
- The link verbs travel on the graph (`graph.rels`), so an app can add verbs (story-workbench: `appears-in`, `leads-to`, `foreshadows`).
- `loadCards` returns `{ cards, errors }` instead of throwing. Pages show the broken files in a banner instead of failing, and each app's card lint still fails on them.

## Consequences
- game-workbench behaves as before:
  - same pages, same prompt text, byte-identical screenshots
  - one tooltip on outside links now reads "Outside this folder"
  - a bad card file no longer takes every page down
- story-workbench builds on the package and does not import from game-workbench (`scripts/check-imports.mjs`).
- A change to the package's components or CSS shows in both apps, so it is checked in both.
