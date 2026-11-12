Keep this a checklist; do not write a second design doc.

# Brief: C3 / 15-chapter-card — The chapter card and the chapter end with the seal break

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 15-chapter-card
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, UI-020, UI-044, MEC-033
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet: the screen changes, see ./screen-spec.md. Illusionist draws ./mockup.html from it before Bob approves the evals
- Risk: Med
- Depends on: C3 feature 09 merged, C2 feature 06 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/ChapterCard.tsx` (new), `apps/bloodtower/src/web/components/board/SealBreak.tsx` (new), `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-chapter.spec.ts`
- Builds: UI-020, UI-044
- Deps change: no
- Runs: cloud

## What it does

UI-020 at each chapter's start (painting, name, goal) and stamped won at its end; UI-044: the chapter's close on a Scroll, then the seal break on a Reveal with the glyph and its boon (DEC-303), then the freed-skull placement (DEC-409). Without the tower the seal part is skipped (DEC-306).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The gear Menu and any gear panel come back closed, the game not paused, the toolbar on every iPad, and item states recomputed (EV-15).
  - Continue does not replay a chapter card already shown (DEC-675).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-15 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] UI-020: closed before coding (`decided`).
- [ ] UI-044: closed before coding (`decided`).
- [ ] MEC-033: closed before coding (`decided`).
- [ ] DEC-303: closed before coding (`decided`).
- [ ] DEC-302: closed before coding (`decided`).
- [ ] DEC-306: closed before coding (`decided`).
- [ ] DEC-409: closed before coding (`decided`).
- [ ] CUE-004: closed before coding (`decided`).
- [ ] CUE-005: closed before coding (`decided`).

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-12. Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `chapter.label` | Chapter {N} | mockup.html (the card's small label above the name) |
| 2 | `chapter.1.name` | The Roads | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) |
| 3 | `chapter.1.goal` | Hear the herald in Greyford. Then open the forest road. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) |
| 4 | `tick.auto` | Moves on by itself. | locked 2026-10-31 (Loremaster); the auto-advance tick (Bob 2026-10-31 10:38) |
| 5 | `chapter.stamp.won` | Cleared | new - Loremaster (the stamp on the won card; mockup drew 'won' as a stand-in); DRAFT - needs Gamewright |
| 6 | `chapter.close-scroll` | The roads are quiet again. | locked: the close line (Bob approved 2026-10-31, screen-spec); mockup's longer sample is not used |
| 7 | `chapter.2.name` | The Keep | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) (C4+; the card is the same view) |
| 8 | `chapter.2.goal` | Go down into the barrow under the old keep. Find the shrine on the road beside it. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) (C4+) |
| 9 | `chapter.3.name` | The Tower | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) (C4+) |
| 10 | `chapter.3.goal` | Open the sealed gate on the Tower road. Break his guard on the Grass Sea. Then climb. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) (C4+) |
| 11 | `seal.boon` | Its glyph lends you strength: {boon}. | new - Loremaster (C4+ only, shown when c3_end_after_chapter_1 is off; the app picks the boon, Q-C3-17);; replaces the old placeholder; DRAFT - needs Gamewright |
| 12 | `seal.done` | Done | C3 button; C4-13 replaces it with 'Seal broken' (C4+ only) |
| 13 | `skulls.prompt` | Skulls are freed. Choose a kingdom. | C4-13 board line (C4+ only; same view) |
| 14 | `toolbar.help` | ? | C2 feature 04 (Bob 2026-10-31 10:37); aria-label "Help" |
| 15 | `toolbar.menu` | (gear icon, aria-label "Menu") | C2 feature 04 (Bob 2026-10-31 10:37); icon, no visible text |
| 16 | `help.title` | Help | C2 feature 04 |
| 17 | `help.chapter-card` | This is your chapter goal. Finish it before the days run out. | locked 2026-10-31 (Loremaster); same text in screen-spec and EV-12 |
| 18 | `help.close` | Close | C2 feature 04 |

## OPEN questions

- ANSWERED Q-C3-17 (Bob approved 2026-10-31): the base pack supplies the boons and the app picks; The Ruined Keep names none in 1.0. (which boons)

## Eval approval

- See ./approval.md (must be filled before coding).
