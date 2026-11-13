# research/game-design

The design of the Bloodtower game: mechanics, screens, tower cues, art and the rules every story shares.

**The cards are the truth.** [cards/](cards/) holds one small idea per file, each with a stable ID (`DEC-143`, `MEC-038`, `SCR-007`). The documents in this folder are sources the cards point into. Where a document disagrees with a card, the card wins (DEC-610).

## How to read the design

| You want | Do this |
|---|---|
| A rule, by topic | `pnpm graph find <words>`, then `pnpm graph show <ID>` |
| How a loop runs, step by step | The loop's `MEC-` card. MEC-032 to MEC-039, MEC-071, MEC-072 and MEC-076 each hold one loop as a numbered diagram, with the ruling behind every node |
| What 1.0 still has to design or build | `pnpm graph gaps`, and [release-1.0-punch-list.md](release-1.0-punch-list.md) |
| To browse | The game workbench: `pnpm --dir apps/game-workbench/src/web dev`, then http://localhost:4797 |
| The words the design uses | [glossary.md](glossary.md) |

A ruling is often refined by later ones. `pnpm graph show <ID>` lists them under "refined by"; read those before relying on the first.

## How the design changes

- **Design sessions.** The `bt-design-session` skill: a worktree and branch per session, one question at a time, one commit per ruling.
- **Card format, link rules, statuses, layers and releases:** [cards/README.md](cards/README.md).
- **New IDs** come from `pnpm card-id <PREFIX> [count]`, never from listing the folder.
- **The card lint** runs on every commit that stages a file here and on every PR (`pnpm check:cards`).
- **Releases.** A card with no `release` field is 1.0. `"1.1"` and `"1.2"` cards wait.

## What is here

### Current

| Path | What |
|---|---|
| [cards/](cards/) | Every ruling, question, mechanic, screen, UI piece, cue, art piece and tower output, as cards |
| [probes/](probes/) | Scripted games played from the cards alone, and the numbers pass (P-001 to P-006). A rules gap found there becomes a `Q-` card |
| [playtests/](playtests/) | Paper playtests: three personas walked through the screens and the table, with findings and fixes (first: 2026-11-12, v1 to v1.2) |
| [audit-rulings-2026-11-13.md](audit-rulings-2026-11-13.md) | Gamewright's rulings on D1 to D6 of the Dark Tower consolidated audit, and the two design items from Hammer's status check (DEC-905 to DEC-914) |
| [specs/](specs/) | Build specifications drawn from the cards: art specs, asset requirements, and the Dracula story's D-01 to D-06 |
| [mockups/](mockups/) | Dated screen mockups from design sessions |
| [glossary.md](glossary.md) | One meaning per word |
| [release-1.0-punch-list.md](release-1.0-punch-list.md) | What was left before and during the 1.0 build, in priority order (2026-10-28) |
| [v1-1-reconciliation.md](v1-1-reconciliation.md) | Desk audit for the 1.1 pass (2026-11-05) |
| [design-check-rtdt-review.md](design-check-rtdt-review.md) | Six strengths of RtDT to keep and six weaknesses to fix, with where Bloodtower stands on each |
| [story-toolkit.md](story-toolkit.md) | What the engine gives a story and what a pack must bring; one card per tool (MEC-040 to MEC-070) |
| [board-map.md](board-map.md), `board-map-2026-10-27.json` | The 60 board spaces: neighbours, terrain, region |
| [element-crosswalk.md](element-crosswalk.md) | RtDT and 1981 elements against Bloodtower's names |
| [item-fit.md](item-fit.md), [modifier-effects.md](modifier-effects.md) | Whether RtDT's physical items fit, and what its cards and virtues do |
| [statistics.md](statistics.md) | Per-game statistics and the data model behind them |
| [dungeon-review.md](dungeon-review.md) | How one set-piece type is reviewed by chat |
| [weekend-c1-acceptance.md](weekend-c1-acceptance.md) | The acceptance path Bob locked for the C1 weekend build (2026-10-25) |

### History

Written before the cards. Each starts with a line saying so, and lines known to be stale say "Superseded by DEC-nnn". Bob chose to keep them in place with that banner (DEC-610). Read them for background, never for a rule.

| File | What it was |
|---|---|
| [requirements.md](requirements.md) | The first requirements index (R-ENG, R-AV, R-ASSET, R-FUN, R-SES, R-SP, R-RE, R-STA) |
| [core-mechanics.md](core-mechanics.md) | Early notes on party, clock, open world and resources |
| [story-engine.md](story-engine.md), [story-pack-format.md](story-pack-format.md) | The first engine and pack design. The pack format the code reads is in `apps/bloodtower/src/protocols/pack-v2/` |
| [sessions.md](sessions.md) | Startup, play, save and ending flows |
| [encounters-and-set-pieces.md](encounters-and-set-pieces.md) | Set-piece and random-encounter templates |
| [asset-catalog.md](asset-catalog.md), [asset-organization.md](asset-organization.md) | Reusable tower and game assets, and how story assets were to be laid out |
| [tower-effects-library.md](tower-effects-library.md), [tower-sound-inventory.md](tower-sound-inventory.md) | Named tower effects and the 113 tower sounds. The sounds now have `SND-` cards |
| [landing-and-initial-screens.md](landing-and-initial-screens.md), [setup-wizard-and-summary.md](setup-wizard-and-summary.md), [look-and-feel-harness.md](look-and-feel-harness.md), [r2-screen-flow.md](r2-screen-flow.md) | Early screen lists and flows. Screens now have `SCR-` and `UI-` cards |
| [playthrough-ui-notes-2026-10-17.md](playthrough-ui-notes-2026-10-17.md) | Bob's notes from the 2026-10-17 playthrough |
| [rtdt-subsystems.md](rtdt-subsystems.md) | RtDT's subsystems, as first listed |
| [open-questions.md](open-questions.md) | The first question list. Open questions are now `Q-` cards |

## Where the design goes next

Bloodtower has no `intent/` folder: the cards stand in for it (Bob, 2026-11-07, recorded in the A1 plan's Results). A milestone plan in [apps/bloodtower/plans](../../apps/bloodtower/plans/) names the cards each feature builds as `Builds: <IDs>`, and the feature's folder under `plans/briefs/` holds its checklist and evals. Story content goes into a pack under [packs/](../../packs/).
