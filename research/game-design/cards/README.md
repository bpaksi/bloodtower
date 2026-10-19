# Cards

One small idea per file. The game-workbench shows them as a graph: one card in the centre, its links around it. Long documents in `research/game-design/` stay as sources; cards point into them.

## File

`cards/<ID>.md`. The file name is the ID.

```markdown
---
type: idea            # idea | question | decision | mechanic | screen | ui | cue | sound | sketch | example
title: Use the 3 RtDT quest tokens   # one line, the headline
status: open          # open | answered | proposed | decided | parked
by: Bob, 2026-10-19   # who said it and when (optional)
links:
  - { rel: needs, to: SCR-001, note: setup has to set them }
  - { rel: raises, to: Q-001 }
sources:
  - { file: story-engine.md, lines: 131-147, note: E19 }
---
A few lines at most. Bob's own words where they exist.
```

## IDs

Prefix by type, three digits, never reused or renumbered. A retired card stays, with `status: parked`.

| Type | Prefix |
|---|---|
| idea | `IDEA-` |
| question | `Q-` |
| decision | `DEC-` |
| mechanic | `MEC-` |
| screen | `SCR-` |
| ui | `UI-` |
| cue | `CUE-` |
| sound | `SND-` (number = tower index) |
| sketch | `SK-` |
| example | `EX-` |

## Links

A link is written on one card and read both ways.

| `rel` | Reads | Reverse |
|---|---|---|
| `needs` | A needs B | B is needed by A |
| `raises` | A raises question B | B is raised by A |
| `answers` | A answers B | B is answered by A |
| `uses` | A uses B | B is used by A |
| `refines` | A refines / details B | B is refined by A |
| `affects` | A affects B | B is affected by A |
| `conflicts` | A conflicts with B | B conflicts with A |

`to` is a card ID or an ID that already lives in a document (`E19`, `R-WIZ-5`, `AST-B08`). A link to a document ID should carry a `note`, since that ID has no card of its own.

## How Claude adds a thread

Bob writes a chain of thoughts in plain words. Claude:
1. makes one card per thought, with a one-line title;
2. links each card to the one it came from, with the verb that fits;
3. before making a question card, checks the cards and the documents for an answer, and links the answer instead of duplicating it;
4. gives new cards the next free ID of their type, and says which IDs it made.
