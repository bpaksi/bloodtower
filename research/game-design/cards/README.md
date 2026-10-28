# Cards

One small idea per file. The game-workbench shows them as a graph: one card in the centre, its links around it. Long documents in `research/game-design/` stay as sources; cards point into them.

## File

`cards/<ID>.md`. The file name is the ID.

```markdown
---
type: idea            # area | idea | question | option | decision | mechanic | piece | screen | ui | cue | sound | glyph | seal | light | light-effect | light-sequence | drum | art | sketch | example
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
| glyph | `GLY-` (tower glyph) |
| seal | `SEAL-` (tower seal) |
| light | `LGT-` (one tower light) |
| light-effect | `LFX-` (a light effect: breathe, flicker…) |
| light-sequence | `LSQ-` (a built-in light sequence) |
| drum | `DRM-` (tower drum) |
| art | `ART-` (one picture to make: a card, tile or token image, made in the game's look) |
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

## Link rules

Each verb may join only certain types. The card lint (`pnpm check`) fails a link that no rule allows. `needs` is the only verb that sets build order: "A needs B" means B must be settled or built before A. `needs` and `part-of` must not loop back on themselves.

Bob set the first table on 2026-10-21. It allows every shape the cards used 5 or more times on that day, plus the rules by meaning below. The code is `apps/game-workbench/src/web/lib/link-rules.ts`. Below, "built" means decision, option, mechanic, piece, screen, ui, cue, art or a tower output (sound, glyph, seal, light, light-effect, light-sequence, drum). A document ID is written `ref:<kind>`, for example `ref:requirement` for `R-WIZ-5`.

| Verb | Sets build order | No loops | Allowed by meaning | Also allowed (common shapes) |
|---|---|---|---|---|
| `needs` | yes | yes | built or idea → built or question; question → question | question → question |
| `raises` | no | no | — | decision → question; idea → question |
| `answers` | no | no | anything → question | decision → idea, question; option → question |
| `uses` | no | no | screen, ui, cue → ui, cue or a tower output | area → piece; decision → decision, idea, mechanic; glyph → drum; idea → piece; mechanic → decision, mechanic, piece; piece → mechanic; question → decision, mechanic; seal → drum |
| `refines` | no | no | — | area → ref:asset; decision → decision, idea, mechanic, piece, ref:engine, ref:requirement; idea → decision, idea, mechanic, piece, ref:requirement; mechanic → idea, mechanic, ref:engine, ref:requirement; piece → piece, ref:engine; question → decision; screen → ref:requirement; ui → ref:requirement |
| `affects` | no | no | — | decision → decision, mechanic, piece; idea → decision, mechanic, piece, question; question → decision, idea, mechanic, piece, question |
| `conflicts` | no | no | anything → anything | — |
| `part-of` | no | yes | anything → area | — |

**Old links.** The 134 links that broke these rules on 2026-10-21 are listed in [`.link-baseline.json`](.link-baseline.json), one `from|rel|to` key each, and the lint lets them pass. A new link must follow the rules. When an old link is fixed or removed, delete its line: the lint also fails on an entry that is no longer a break. The link review (game-workbench plan, Later) empties the baseline. To allow a new shape, change the table here and in `link-rules.ts` in the same PR.

## Sound feel

A `sound` card may carry a `feel:` block: how the sound came across when Bob heard it on the tower (game-workbench plan, step 7). Bob records it in the sound review tool (`apps/sound-review-tool`), which saves to `~/Desktop/sound-feel.json` as he goes; Claude copies each sound into its card from that file. The `/sounds` page in the workbench lists them and filters by tone.

```yaml
feel:
  soundsLike: low growl, then a crack # a few of Bob's own words
  tone: bad                           # good | bad | neutral
  lengthMs: 2300                      # from Bob's Play press to his Stopped press; the tower does not report when a sound ends
```

Every field is optional. One that was not recorded is left out, never written as 0 or "". The block records only the feeling. Which mechanics or cues use a sound is decided later, when the mechanics are prototyped (Bob, 2026-10-21). The card lint (`pnpm check`) fails a `feel:` block on a card that is not a sound, an unknown field, or a tone outside the list above. The older fields (mood, readsAs, strength, answerLengthMs, note) were dropped on 2026-10-26, when the review moved out of tower-poc. The code is `apps/game-workbench/src/web/lib/feel.ts`.

## Status

| Status | Meaning |
|---|---|
| `open` | A question or idea nobody has settled |
| `proposed` | Drafted (usually in a design doc), waiting for Bob's call |
| `decided` | Bob ruled. Only Bob moves a card to `decided`; Claude may propose |
| `answered` | A question with a decided or proposed answer linked |
| `parked` | Dropped or postponed; left out of progress |

**Replaced rulings (DEC-352).** When a newer ruling replaces a whole card, park the old card and start its body with "Replaced by DEC-x (Bob, date)." When it replaces only part, the old card stays `decided`, its title is cut to what still holds, and its body says what DEC-x replaced. Either way the newer card links `refines` to the old one, with a note saying what it replaces.

**Deliverables (DEC-355).** `SCR-`, `UI-`, `CUE-`, `MEC-` and `ART-` cards are the deliverables: one card per thing that gets built. Every decided ruling is reached from at least one of them by `needs` or `uses`, and each plan step lists the deliverable cards it builds as `Builds: <IDs>`.

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
