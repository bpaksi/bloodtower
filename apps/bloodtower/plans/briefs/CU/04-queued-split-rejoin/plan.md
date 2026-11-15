Keep this a checklist; do not write a second design doc.

# Brief: CU / 04-queued-split-rejoin — Split and Rejoin are queued gear actions; no daily Regroup prompt

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (queue step 51)
- Feature: 04-queued-split-rejoin
- Kind: engine
- Owner: Gamewright (brief, evals); a Wright developer, runner anvil (build)
- Related AREA/docs: GitHub issue #477; PT-18 and PT-06 in `research/game-design/playtests/2026-11-12-paper-playtest-v1-v1.2.md`; `plans/catchup/design-freeze.md` section H; DEC-640, DEC-148, DEC-821, DEC-079, DEC-500, DEC-615, DEC-684, MEC-034, DEC-229; C2/04 (gear), C3-11 (#384, merged)
- Evals: ./eval.md
- Screen spec: none
- Mockup: ./mockup.html (a Gamewright draft for the Illusionist to replace)
- Risk: High
- Depends on: its approval.md on main; step 02 (#384 = C3-11, merged); steps 43 (#469) and 44 (#470) merged
- Touches: `apps/bloodtower/src/engine/loops/day/regroup.ts`, `apps/bloodtower/src/engine/loops/day/loop.ts`, `apps/bloodtower/src/engine/loops/day/press.ts`, `apps/bloodtower/src/engine/loops/day/roll.ts`, `apps/bloodtower/src/engine/loops/day/rules.ts`, `apps/bloodtower/src/engine/loops/chapter/playState.ts` (the queue), `apps/bloodtower/src/engine/loops/session/gear.ts`, `apps/bloodtower/src/engine/loops/session/view.ts`, `apps/bloodtower/src/engine/views/day.ts`, `apps/bloodtower/src/protocols/v2/views.ts`, `apps/bloodtower/src/protocols/pack-v2/base.ts`, `packs/base/tuning.yaml`, `apps/bloodtower/src/server/pack/tuning.test.ts`, `apps/bloodtower/src/web/components/device/gearMenu.ts`, `apps/bloodtower/src/web/components/device/CoreDeviceScreen.tsx`, `apps/bloodtower/src/web/components/board/DayPanels.tsx`, `apps/bloodtower/src/web/components/board/GearBoardPanel.tsx`, `apps/bloodtower/src/engine/loops/day/day.test.ts`, `apps/bloodtower/src/e2e/tests/c3-day.spec.ts` (the host split action, and the `fixme` on EV-15 and EV-16 removed), and the host-side action path that drives the gear queue in the test story (the developer names it: `apps/bloodtower/src/server/core/session.ts`, which logs a Split party pick so Continue replays it, and `apps/bloodtower/src/engine/loops/session/gear.ts`, which takes the same pick with no panel open as the host's action; no new package)
- Touches added (Bob, 2026-11-15, "Widen and amend", option A): `apps/bloodtower/src/e2e/tests/w1-chrome.spec.ts` (its two `greyReason(…, "split-party", "C3+")` calls read the removed C3+ state); `apps/bloodtower/src/engine/loops/session/effects.ts` (the `regroup-dropped` press-error code and its target iPad, EV-24); `apps/bloodtower/src/server/core/session.ts` (logs and toasts that code and tells the iPad that queued it, EV-24); `apps/bloodtower/src/engine/views/state.ts` (the `TableBand` groups card and the roll's split term, so a group lists its heroes, EV-10); `apps/bloodtower/src/e2e/tests/support/acceptance.ts` (the test-only `seatTogether` option that seats every hero in one group on one space; the seat itself is the seed-marked `TEST_SEAT_TOGETHER` in `playState.ts`)
- Amended 2026-11-15 (PT-18, Bob, option A): EV-09 (the standing `[data-see-board]` row is allowed; `mockup.html` `#gear-split` does not draw it, for the Illusionist), EV-28 and EV-29 edited in place (EV-29: the split halves of C3-11 EV-15/EV-16 run live, the use-item halves stay `fixme` for CU/07); EV-28 (one exported constant, `AUTO_ADVANCE_MS`, that the groups card reads and the future day-loop timer of C3-11 Ruling 1 must read; the card times itself on the board and the engine goes straight on to the roll) and EV-07 edited only where it named the old "existing 4 s auto-advance". The `c3-day.spec.ts` fixme row "EV-15, EV-16" is split: the split halves run live under CU/04, the use-item halves stay `fixme` for CU/07. Needs Bob's new approval row for eval.md.
- Builds: PT-18, PT-06 (issue #477); the host's split action that C3-11 Ruling 3 left without an owner (Bob, 2026-11-14, adopted, Q7.2): the host can queue and apply Split and Rejoin so `c3-day.spec.ts` EV-15 and EV-16 stop being `fixme`
- Deps change: no
- Runs: cloud

## What it does

Today the day loop's `regroup` phase offers split and join prompts on the iPads whenever two heroes share a space (`regroupNeeded`), so a party travelling together is asked "Stay together, or split up?" every day. The gear's "Split party" row exists but is disabled ("C3+"). PT-18 and section H:

- "Split party" and "Rejoin party" (the existing gear row, `partySplit` label) become real: picked from the gear at any time in the day, they are queued and take effect at the next day start, before the roll (DEC-640 timing unchanged).
- Split takes the hero the table picks from the gear panel, which lists the heroes in groups of 2 or more; it matches `applySplit(groupId, heroId)` (Q4.3).
- Queued actions stack and apply in the order picked; an opposite pick for the same hero cancels the queued one; the gear panel shows the queue; one that cannot apply is dropped with a logged error (Q4.2).
- No daily Regroup prompt. On a day when a queued change applied, the board shows the groups card for 4 seconds with no button; on every other day nothing shows, and it is never a question (Q4.1). The 4 s is the constant the existing 4 s auto-advance already uses (Q4.4). (MEC-034 .38 reads "a split or join was queued".)
- The host's split action (C3-11 Ruling 3, `c3-day.spec.ts` EV-15 and EV-16) is built here, so the gear queue can be driven from the host in the e2e (Q7.2).
- PT-06: splitting doubles moves, so each group's roll takes a per-split-group shift, applied to every group while the party is split, a group of one included (Q4.3): `day.shifts.per_split_group: -1` (placeholder, floor 2 stays) in `packs/base/tuning.yaml`, the pack-v2 schema and `dayTuningFrom`. The P-008 probe is parked.

Nothing physical happens on a queue or a split; the tower is not touched.

## Cutover

Cutover: Y

- The daily `regroup` phase prompt (`regroup-split--`, `regroup-join--`, `regroup-done` offers on the happy path) dies; the phase survives only to apply a queued change.
- The disabled "C3+" state of the gear's Split party row dies.
- `REGROUP_PROMPT` ("A new day. Stay together, or split up?") on `CoreDeviceScreen.tsx` is removed from the happy path. Loremaster signs it off in Copy (Removed strings); there is no replacement prompt.

## Survival invariants

- Continue, restore, and restart must keep:
  - A queued split or join survives Continue and applies at the next day start, once.
  - Groups, their spaces, turn order (oldest to newest, DEC-148) and each hero's place are the same before and after the queue is applied or Continue.
  - A party that never queues anything sees no Regroup prompt on any day and plays as before.
  - The per-group move roll for an unsplit party is unchanged (no shift when one group).
  - No tower command goes out because of a split, join or queue.
  - A queued action that cannot apply at day start (the hero fell, the groups no longer share a space) is dropped with a logged error and a message to the table, never silently.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-11, EV-21 … EV-24 and EV-25 … EV-29 all pass (verifier table on PR).
- Copy text: the Copy table below (step 45); EV-09 and EV-10 check it.
- Not required: the P-008 tuning run (parked, 1.1).

## AREA / DEC checklist

- [ ] PT-18 and PT-06 rulings recorded as DECs by step 43 (#469); closed before coding. The brief does not invent their ids.
- [ ] DEC-640 (Regroup at day start; the daily step is superseded by PT-18), DEC-148, DEC-821, DEC-079 (the shift is the modifier slot), DEC-615, DEC-684: read; closed before coding.
- [ ] MEC-034 .38 reworded by step 43 to "a split or join was queued"; closed before coding.
- [ ] Open questions below answered; closed before coding.
- [ ] Loremaster Copy table (step 45) holds the strings named in the mockup; closed before coding. Filled 2026-11-15; `split-party-none` is proposed only (the code is not edited in this docs PR).

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-15 (step 45, #471). Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `gear.item.split-party` | Split party | locked C2 feature 04 (gear item 4, Bob approved 2026-10-31); the label while the party is together. Unchanged |
| 2 | `gear.item.rejoin-party` | Rejoin party | locked C2 feature 04; the same item's label while two groups share a space (`partyIsSplit`). Unchanged |
| 3 | `split-party-help` | Pick who splits off, or who rejoins others on the same space. It takes effect at the start of the next day. Pick the other action for the same hero to cancel. | new - Loremaster. The help line on the gear panel (mockup `#gear-split`). Covers both titles, Split party and Rejoin party. Says the three rules: pick a hero, next day start (DEC-926, DEC-640), an opposite pick cancels (Q4.2). Only valid picks are listed, so the line does not mention group size |
| 4 | `button.split-off` | Split {hero} off | main (`CoreDeviceScreen.tsx`, mockup `#gear-split`); Loremaster confirms. `{hero}` is the one hero who would leave their group |
| 5 | `button.rejoin` | Rejoin {hero} | main (`CoreDeviceScreen.tsx`); Loremaster confirms. `{hero}` is the one hero whose group would merge with the older group on the same space (DEC-148) |
| 6 | `button.back` | Back | main (the panel's Back, `data-gear-back`); unchanged. Closes the panel; the queue is kept |
| 7 | `queued-confirm` | Queued: takes effect at the start of the next day. | new - Loremaster. Refines the mockup's sample "Queued: takes effect at the next day." The note stays on the panel even when the queue is empty, so it reads as a heading, not as if something is already queued |
| 8 | `board.day` | Day {N} | mockup `#day-start` and `DayPanels.tsx`; unchanged |
| 9 | `board.group-line` | Group {N}: {heroes} | mockup `#day-start` and `DayPanels.tsx`; `{heroes}` is the comma-separated names of that group's heroes. Unchanged. "Group" names a travelling set; it does not count the party |
| 10 | `day-start-groups` | This is how the party travels today. | new - Loremaster. The one line under the groups on the 4 s card (EV-07, EV-10). Shown only when a queued change just applied; never a question (Q4.1). Works for a split or a rejoin; no hunter count |
| 11 | `split-party-none` | No hero can split off or rejoin now. | new - Loremaster. Reason line for the greyed gear item when the table is in a game but no pick is on offer (no hero in a group of 2 or more, and no two groups share a space). Same short style as the gear's other reasons ("Only in a game.", "Only with the tower."). Proposed only: this docs PR does not edit `gearMenu.ts`; the string ships with the next build that touches that file |

### Removed strings

The daily Regroup prompt is cut (PT-18, DEC-926, Cutover). Loremaster confirms it is not replaced: the groups card is display only and is never a question.

| # | Slot or id | Removed text | Where it lived | Sign-off |
|---|------------|--------------|----------------|----------|
| R1 | `REGROUP_PROMPT` / C3/11 `[COPY: regroup]` | A new day. Stay together, or split up? | iPad and board at day start whenever two heroes shared a space | removed by CU/04 (PT-18, DEC-926); Loremaster, 2026-11-15, no replacement line |

## Rulings (Bob, 2026-11-14, adopted)

- Q4.1 Bob, 2026-11-14, adopted: the 4 s groups card (no button) shows only on a day when a queued change applied. Nothing on other days; never a question. Flagged for Gamewright to confirm: the PT-18 wording says the board shows the groups for 4 s every day and also that a prompt shows only when something is queued, so the ruling reads as the second.
- Q4.2 Bob, 2026-11-14, adopted: queued actions stack and apply in the order picked. An opposite pick for the same hero cancels the queued one. The gear panel shows the queue. An action that cannot apply is dropped with a logged error.
- Q4.3 Bob, 2026-11-14, adopted: Split takes the hero the table picks from the gear panel (heroes in groups of 2 or more), matching `applySplit(groupId, heroId)`. The -1 shift (floor 2) applies to every group while the party is split, a group of one included.
- Q4.4 Bob, 2026-11-14, adopted: the 4 s is a constant shared with the existing 4 s auto-advance, not a tuning key.
- Q7.2 Bob, 2026-11-14, adopted: the host split action moves here from queue step 12 (#441); the use-item host action goes to CU/07.

## Eval approval

- See ./approval.md (must be filled before coding).
