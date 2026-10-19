# @dark-tower/workbench

The shared parts of the read-only workbenches (`apps/game-workbench`, `apps/story-workbench`). Decision: [research/decisions/0002-workbench-package.md](../../research/decisions/0002-workbench-package.md).

| Entry | What | Runs in |
|---|---|---|
| `@dark-tower/workbench` | ID schemes, markdown renderer, sections, card parsing, graph building, focus layout, prompt text | anywhere (no Node imports) |
| `@dark-tower/workbench/server` | Reading docs and card folders from disk, the repo root | server only |
| `@dark-tower/workbench/components` | FocusGraph, Chip, ChipCopy, PromptStarter, PromptScopes, LineJump | React; the client ones say `"use client"` |
| `@dark-tower/workbench/styles/*.css` | `globals.css` (shell, docs, prompt starter) and `graph.css` | imported once in an app's root layout |

Each app owns its content config: which folder, its ID families (`makeIdScheme`), its card types and how their IDs look (`CardSchema`), its link verbs and its prompt rules. Client components take plain data props only (labels, base paths), since functions cannot cross from a server component to a client one.

Exports TypeScript source with no build step; an app lists it in `transpilePackages`.
