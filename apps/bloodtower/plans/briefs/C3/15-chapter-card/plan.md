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
- Mockup: none yet: the screen changes, see ./screen-spec.md. Illusionist draws ./mockup.html from it before Bob approves the evals. Amended 2026-11-14 (PT-21): a new "Set the table" state after the next chapter's card, with and without the seal row; the Illusionist adds `#set-table` and `#set-table-no-tower` (EV-22).
- Risk: Med
- Depends on: C3 feature 09 merged, C2 feature 06 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/ChapterCard.tsx` (new), `apps/bloodtower/src/web/components/board/SealBreak.tsx` (new), `apps/bloodtower/src/web/components/board/SetTheTable.tsx` (new), `apps/bloodtower/src/engine/loops/chapter/**` (the chapter end order), `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-chapter.spec.ts`
- Touches amended 2026-11-23 (C3/15 build): the beats needed wiring outside the list above. `apps/bloodtower/src/protocols/v2/views.ts` (the `chapterBeat` band field), `apps/bloodtower/src/engine/loops/session/view.ts` and `stepShell.ts` (the band, the help screen, the Done label, the chapter wait's end and its offer after a restore), `apps/bloodtower/src/engine/loops/play/presses.ts` (Done and skull presses reach the chapter frame), `apps/bloodtower/src/engine/loops/game/loop.ts` (a loss from chapter 2's frame names chapter 1), `apps/bloodtower/src/server/core/session.ts` (the host timer runs the chapter wait), `apps/bloodtower/src/web/components/board/CoreStoryBoard.tsx`, `apps/bloodtower/src/web/components/device/CoreDeviceScreen.tsx` and `gearMenu.ts` (render the beats, the Set the table help line), plus the unit tests those files already had, `apps/bloodtower/src/server/core/chapterCard.test.ts` (new), and `apps/bloodtower/src/e2e/tests/support/acceptance.ts` with the fake-clock specs `c3-building`, `c3-day`, `c3-event`, `c3-quest`, `d6-fortunate` and `f1-04-chapter-one-win` (chapter 1's card now comes after the opening and only moves on when their fake clock moves).
- Builds: UI-020, UI-044
- Deps change: no
- Runs: cloud
- Amended 2026-11-14 for PT-21 (step 44): added EV-16 to EV-24; edited EV-02 and EV-07 in place (EV-02 marked Amended 2026-11-14 (PT-21): Reveal right after the seal break, freed-skull picks after Done); six Copy slots as `[COPY: ...]`. Needs Bob's new approval row. Illusionist adds mockup states `#set-table` and `#set-table-no-tower`.

## What it does

UI-020 at each chapter's start (painting, name, goal) and stamped won at its end; UI-044: the chapter's close on a Scroll, then the seal break on a Reveal with the glyph and its boon (DEC-303), then the freed-skull placement (DEC-409). Without the tower the seal part is skipped (DEC-306). PT-21: the story comes first (stamped card, close Scroll, the next chapter's card and opening); then one "Set the table" step holds the 1.0 chores (lit seal, freed skulls, quest tokens), one check each and one Done.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The gear Menu and any gear panel come back closed, the game not paused, the toolbar on every iPad, and item states recomputed (EV-15).
  - Continue does not replay a chapter card already shown (DEC-675).
  - Continue in Set the table resumes it and applies nothing twice (EV-23).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-24 all pass (verifier table on PR).
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
- [ ] PT-21 ruling recorded as a DEC by step 43 (#469); closed before coding.

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-12; rows 19–24 filled 2026-11-18 (step 45), reusing C4/13. Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `chapter.label` | Chapter {N} | mockup.html (the card's small label above the name) |
| 2 | `chapter.1.name` | The Roads | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) |
| 3 | `chapter.1.goal` | Hear the herald in Greyford. Then open the forest road. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) |
| 4 | `tick.auto` | Moves on by itself. | locked 2026-10-31 (Loremaster); the auto-advance tick (Bob 2026-10-31 10:38) |
| 5 | `chapter.stamp.won` | Cleared | new - Loremaster (the stamp on the won card; mockup drew 'won' as a stand-in); final |
| 6 | `chapter.close-scroll` | The roads are quiet again. | locked: the close line (Bob approved 2026-10-31, screen-spec); mockup's longer sample is not used |
| 7 | `chapter.2.name` | The Keep | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) (C4+; the card is the same view) |
| 8 | `chapter.2.goal` | Go down into the barrow under the old keep. Find the shrine on the road beside it. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) (C4+) |
| 9 | `chapter.3.name` | The Tower | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) (C4+) |
| 10 | `chapter.3.goal` | Open the sealed gate on the Tower road. Break his guard on the Grass Sea. Then climb. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) (C4+) |
| 11 | `seal.boon` | Its glyph lends you strength: {boon}. | placeholder - reconfirm at C4 boons (approved placeholder; C4+ only, shown when c3_end_after_chapter_1 is off; the app picks the boon, Q-C3-17) |
| 12 | `seal.done` | Done | C3 button; C4-13 keeps Done, which now confirms Set the table (PT-21, DEC-929), and the seal break follows |
| 13 | `skulls.prompt` | Skulls are freed. Choose a kingdom. | C4-13 board line (C4+ only; same view) |
| 14 | `toolbar.help` | ? | C2 feature 04 (Bob 2026-10-31 10:37); aria-label "Help" |
| 15 | `toolbar.menu` | (gear icon, aria-label "Menu") | C2 feature 04 (Bob 2026-10-31 10:37); icon, no visible text |
| 16 | `help.title` | Help | C2 feature 04 |
| 17 | `help.chapter-card` | This is your chapter goal. Finish it before the days run out. | locked 2026-10-31 (Loremaster); same text in screen-spec and EV-12 |
| 18 | `help.close` | Close | C2 feature 04 |
| 19 | `table.title` | Set the table | ruling PT-21 and DEC-929 name the step "Set the table"; Loremaster confirms the words. Same slot as C4/13 `table.title` |
| 20 | `table.row.seal` | {seal} | new - Loremaster (PT-21, DEC-929). Reuses C4/13 `table.row.seal`. `{seal}` is the locked name (The Road Seal, The Keep Seal, The Warden's Seal). The row is absent with no tower (DEC-306, EV-16). C4+ |
| 21 | `table.row.tokens` | Quest tokens: {quests} | new - Loremaster (PT-21, DEC-929). Reuses C4/13 `table.row.tokens`. `{quests}` is the comma-separated names of the next chapter's quest tokens, as in EV-17 ("The Barrow, The Shrine") |
| 22 | `table.row.skulls` | Freed skulls: {N} | new - Loremaster (PT-21, DEC-929, DEC-409). Reuses C4/13 `table.row.skulls`. `{N}` is how many skulls were freed. Shown only when skulls were freed; absent with no tower (EV-16). The kingdom-then-building picks come after Done. C4+ only |
| 23 | `table.done` | Done | new - Loremaster; the one primary button (C2/04, PT-21, EV-24). Unchanged from every other physical-confirm Done. Same slot as C4/13 `table.done` |
| 24 | `help.set-the-table` | Tick the rows that show as an aid, then tap Done. You do not have to tick them all. | new - Loremaster (PT-21, DEC-929, EV-21, EV-24). Help for this step only (`data-help-screen` = `set-the-table`). Rows that do not apply are absent (no tower, or no skulls freed), so the line does not name them. Done is not gated on the ticks |

## OPEN questions

- ANSWERED Q-C3-17 (Bob approved 2026-10-31): the base pack supplies the boons and the app picks; The Ruined Keep names none in 1.0. (which boons)

## Eval approval

- See ./approval.md (must be filled before coding).
