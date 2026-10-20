# Cards

One small idea per file. The game-workbench shows them as a graph: one card in the centre, its links around it. Long documents in `research/game-design/` stay as sources; cards point into them.

## File

`cards/<ID>.md`. The file name is the ID.

```markdown
---
type: idea            # area | idea | question | option | decision | mechanic | piece | screen | ui | cue | sound | sketch | example
title: Use the 3 RtDT quest tokens   # one line, the headline
status: open          # open | answered | proposed | decided | parked
layer: core           # core | configurable | optional | story (see Layers)
by: Bob, 2026-10-19   # who said it and when (optional)
links:
  - { rel: part-of, to: AREA-005 }
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
| area | `AREA-` (AREA-000 is the core game; areas hang off it, and an area can hold sub-areas by linking `part-of` its parent) |
| idea | `IDEA-` |
| question | `Q-` |
| option | `OPT-` (one possible answer to a question, with for and against) |
| decision | `DEC-` |
| mechanic | `MEC-` |
| piece | keeps its asset-catalog ID, `AST-Bnn` (a physical RtDT component) |
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
| `part-of` | A is part of area B | B has part A |

`to` is a card ID or an ID that already lives in a document (`E19`, `R-WIZ-5`, `AST-B08`). A link to a document ID should carry a `note`, since that ID has no card of its own.

## Status

| Status | Meaning |
|---|---|
| `open` | A question or idea nobody has settled |
| `proposed` | Drafted (usually in a design doc), waiting for Bob's call |
| `decided` | Bob ruled. Only Bob moves a card to `decided`; Claude may propose |
| `answered` | A question with a decided or proposed answer linked |
| `parked` | Dropped or postponed; left out of progress |

## Layers

Every card except areas says where it sits between "every story" and "one story":

| `layer` | Meaning | Example |
|---|---|---|
| `core` | The same in every story | Instant-loss guard, scene presence |
| `configurable` | An engine mechanism each story fills with data | Encounter tables, chapter list |
| `optional` | An engine module a story may switch on | Dungeon crawl, hunter token |
| `story` | Lives in one story pack; kept here only as an example | Dracula's 5 nights |

Every card links `part-of` at least one area, so the Map page can count it. Link a card to the most specific area that fits, so no area gets more than about 10 direct links (the graph's busy limit).

## How Claude adds a thread

Bob writes a chain of thoughts in plain words. Claude:
1. makes one card per thought, with a one-line title;
2. links each card to the one it came from, with the verb that fits, and `part-of` its area;
   sets `layer`;
3. before making a question card, checks the cards and the documents for an answer, and links the answer instead of duplicating it;
4. gives new cards the next free ID of their type, and says which IDs it made.
