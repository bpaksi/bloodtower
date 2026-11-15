Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: CU / 04-queued-split-rejoin — Split and Rejoin are queued gear actions; no daily Regroup prompt

- Brief: ./plan.md
- Mockup: ./mockup.html
- Risk: High

Unit tests: `apps/bloodtower/src/engine/loops/day/day.test.ts`. E2E: `apps/bloodtower/src/e2e/tests/c3-day.spec.ts` (or a new `cu-queued-split.spec.ts` beside it), iPad 768x1024 portrait, board 1920x1080. The test story seeds two or more heroes on one space (the seed hook C3-11 ruling 5 describes).

## Checks

### EV-01 — No daily Regroup prompt for a table that never splits
- Requirement: PT-18, design-freeze section H: no daily Regroup prompt; happy path has no exceptions.
- Method: playwright
- How: 2 heroes on one space, no gear use; play days 2, 3 and 4 to the roll. Record every offer on both iPads and the board's day panel `data-day-panel` values.
- Pass evidence: no offer with action `split`, `join` or `done` from a regroup prompt (`regroup-*`); no panel `regroup`; no text "Stay together, or split up?" on either iPad or the board; the roll panel follows day start directly.
- Fails if: the Regroup phase still runs when two heroes share a space (today's `regroupNeeded`), or the prompt shows once.

### EV-02 — The gear's Split party row is live and queues
- Requirement: PT-18: Split party is picked from the gear any time in the day and queued.
- Method: playwright
- How: mid-turn on day 2 with 2 heroes in one group, open the gear.
- Pass evidence: the "Split party" row is enabled (no "C3+" reason); its panel lists only heroes who are in a group of 2 or more (a lone hero is not offered); picking a hero shows the queued state, and the panel lists the queue; the groups on the board and the current party panel are unchanged for the rest of day 2.
- Fails if: the row stays disabled, a lone hero is offered, or the split happens at once.

### EV-03 — A queued split applies at the next day start, before the roll
- Requirement: PT-18; DEC-640 timing (day start, before the roll) unchanged.
- Method: unit
- How: queue a split of hero B (picked by hero id from the gear panel, so `applySplit(groupId, heroId)` gets that hero) on day 2; run the day-3 start.
- Pass evidence: at day 3 two groups exist, and the hero split off is hero B, (the split-off group is newest and plays last, DEC-148), and the day-3 roll record has two entries, one per group; the queue is empty afterwards.
- Fails if: the split applies on day 2, applies after the roll (one roll for two groups), or applies twice.

### EV-04 — Rejoin is queued the same way
- Requirement: PT-18: Rejoin party is a queued gear action.
- Method: unit
- How: two groups on one space; queue Rejoin on day 3; run day 4 start.
- Pass evidence: the row's label reads "Rejoin party" while split and "Split party" after; at day 4 one group remains, keeping the older group's place (DEC-148); the day-4 roll has one entry.
- Fails if: Rejoin applies at once, the merged group takes the newer place, or the label does not follow the state.

### EV-05 — The per-split-group shift
- Requirement: PT-06: while the party is split each group's roll takes `day.shifts.per_split_group` (-1), floor 2.
- Method: unit
- How: two groups; fix the raw roll for each (seed the stream) at 4 and at 2; one-group party with the same raws.
- Pass evidence: split groups total raw - 1, never under 2 (raw 2 gives 2), and that includes a split-off group of one hero, which also takes the -1 (Q4.3); the one-group party totals raw; the roll record shows the split shift as its own term next to virtue and corruption; the shift is read from tuning, not a constant (change the test tuning to -2 and the total moves).
- Fails if: the shift is hard-coded, is skipped for a group of one while split, applies to an unsplit group, ignores the floor, or is folded into the corruption term.

### EV-06 — The tuning key exists and is checked
- Requirement: PT-06: `day.shifts.per_split_group: -1` in the tuning file (DEC-079 modifier slot, DEC-500).
- Method: unit
- How: `apps/bloodtower/src/server/pack/tuning.test.ts`: parse `packs/base/tuning.yaml` with the pack-v2 schema; then parse a copy with the key removed and a copy with `per_split_group` misspelled.
- Pass evidence: base file parses with `per_split_group` equal to -1; both bad copies fail the strict schema; `dayTuningFrom` returns -1 for the base file.
- Fails if: the key lives only in code, or the strict schema accepts a misspelled key.

### EV-07 — The day-start card has no button
- Requirement: PT-18, Q4.1 (Bob, 2026-11-14, adopted): on a day when a queued change applied, the board shows the groups for 4 seconds and has no button.
- Method: playwright
- How: queue a split on day 2; at day 3 start read the board.
- Pass evidence: the board shows the two groups and their heroes; no `button`, link or pressable element in the card; it leaves by itself after about 4 seconds (3.5 to 6 s) and the roll panel follows; neither iPad offers a regroup choice.
- Fails if: a Continue/Done button is present, the card waits for a press, or it lasts a different time than the exported 4 s constant (EV-28 pins the constant). A day with nothing queued is EV-25.
- Amended 2026-11-15 (PT-18, Bob): "the existing 4 s auto-advance" read as the exported constant of EV-28; nothing else changed.

### EV-08 — Nothing moves mid-day
- Requirement: PT-18: the queued action takes effect at the next day start only; DEC-821 and the group's turn are not disturbed.
- Method: unit
- How: queue a split during group 1's turn with moves left; finish the turn.
- Pass evidence: the group, its moves left and its space are the same until day start; the turn order for the rest of the day is unchanged.
- Fails if: the group count changes mid-turn.

### EV-09 — Gear panel screenshot
- Requirement: the Split party panel looks as drafted (Gamewright draft; the Illusionist replaces it).
- Method: screenshot
- How: iPad 768x1024 portrait, gear open on Split party with 2 heroes; compare side by side with ./mockup.html section `#gear-split`.
- Pass evidence: both images attached; title, one pick per hero, Back, and the queued note in the same order; copy slots show the Loremaster text, not `[COPY: ...]`, once step 45 lands (the mockup keeps the slots).
- Fails if: a hero pick or Back is missing, or any other row shows.

### EV-10 — Day-start card screenshot
- Requirement: the groups card looks as drafted.
- Method: screenshot
- How: board 1920x1080 at the day-start card after a queued split; compare side by side with ./mockup.html section `#day-start`.
- Pass evidence: both images attached; "Day N", one line per group listing its heroes, no button.
- Fails if: a button shows or a group is missing.

### EV-11 — No tower command from a split, join or queue
- Requirement: CLAUDE.md tower safety: nothing physical happens automatically.
- Method: unit
- How: with the mock tower linked, queue and apply a split and a rejoin; read the commands the mock tower received.
- Pass evidence: zero commands from the queue, the apply or the day-start card.
- Fails if: any command is sent.

## Survival evals (one per survival invariant in plan.md)

### EV-21 — A queued action survives Continue and applies once
- Requirement: a queued split is part of the saved state.
- Method: playwright
- How: queue a split on day 2, quit and Continue, finish day 2, start day 3.
- Pass evidence: the split applies at day 3 start exactly once; the day-3 and day-4 starts add no further split.
- Fails if: Continue drops the queue, or it re-applies each day.

### EV-22 — Groups and turn order survive
- Requirement: groups, spaces and order (DEC-148) are the same before and after the apply and Continue.
- Method: unit
- How: apply a split, save, restore; read groups, `turnOrder`, each group's `spaceId`.
- Pass evidence: the restored values equal the saved ones; the split-off group is last.
- Fails if: order or places change on restore.

### EV-23 — An unsplit, unqueued party is unchanged
- Requirement: happy path unchanged apart from the removed prompt.
- Method: unit
- How: one group of 2 or 4 heroes plays 5 days with a fixed seed; compare each day's roll record with main.
- Pass evidence: the rolls are identical; no split shift term is present; no regroup node is noted for the day.
- Fails if: the shift applies to a single group, or the roll stream moves because the regroup step was removed.

### EV-24 — An impossible queued action is not silent
- Requirement: the root error rule: log every error, show it with its code.
- Method: unit
- How: queue a Rejoin, then make the groups stop sharing a space; and queue a split of a hero who is no longer in a group of 2 or more; run the day start.
- Pass evidence: nothing applies; one error is logged with its code and shows as a Story board toast; the iPad that queued it is told; the queue is cleared.
- Fails if: the action is skipped without a log, or the group state is corrupted.

### EV-25 — A day with nothing queued shows no groups card
- Requirement: Q4.1 (Bob, 2026-11-14, adopted): the card shows only on a day when a queued change applied; never a question.
- Method: playwright
- How: a split party (already split earlier) and an unsplit party each play days 3 and 4 with nothing queued; read the board and both iPads at each day start.
- Pass evidence: no groups card element on the board, no offer or button on either iPad, and the roll panel follows day start directly; after a queue-and-apply day the card shows once and not on the next day.
- Fails if: the card shows every day, shows on a split party's quiet days, or comes with any press.

### EV-26 — Queued actions stack and apply in order picked
- Requirement: Q4.2 (Bob, 2026-11-14, adopted).
- Method: unit
- How: four heroes in one group on one space. Queue split of A, then split of B (A and B both in the group), then rejoin; and a second case with the picks reversed. Run the next day start.
- Pass evidence: the queue holds the actions in pick order and the gear panel lists them in that order; at day start they apply in that order, and the two cases end in different group sets where the order matters; the queue is empty afterwards and every action applied once.
- Fails if: only the last pick is kept, the first pick is dropped, or they apply in another order.

### EV-27 — An opposite pick for the same hero cancels the queued one
- Requirement: Q4.2: an opposite pick for the same hero cancels the queued one; the gear panel shows the queue.
- Method: playwright
- How: queue a split of hero B; reopen the gear and pick Rejoin for hero B; read the panel; run the next day start.
- Pass evidence: the queue panel shows B's split removed (not two rows, not a split followed by a join); at day start nothing changes, no groups card shows (EV-25) and no error is logged.
- Fails if: both actions stay queued, the split still applies, or the cancel logs an error.

### EV-28 — The 4 s is the shared constant
- Amended 2026-11-15 (PT-18, Bob): no day-loop 4 s auto-advance exists yet (C3-11 Ruling 1 is unbuilt), so the constant is defined here for the groups card and that future timer must read it.
- Requirement: Q4.4 (Bob, 2026-11-14, adopted): one exported constant for the groups card's 4 s duration, which the future day-loop timer step (C3-11 Ruling 1) must read too; not a tuning key. The card times itself on the board and the engine goes straight on to the roll.
- Method: unit
- How: source check that the groups card reads the exported constant and has no literal 4000 of its own; change the constant's value in a test and replay a queue-and-apply day.
- Pass evidence: one exported constant; the card's duration on a queue-and-apply day equals it and moves when it changes; the day loop does not wait for the card (the roll is offered at once); no new key appears in `packs/base/tuning.yaml` for it (EV-06's schema copy still passes).
- Fails if: the card has its own literal 4000, a second constant, or a new tuning key.

### EV-29 — The host drives the queue
- Requirement: Q7.2 (Bob, 2026-11-14, adopted): the host's split action is built here; `c3-day.spec.ts` EV-15 and EV-16 stop being `fixme`.
- Method: playwright
- How: with the real host and a test story with 2 heroes on one space, the host queues a split and a rejoin through its action; run to the next day start; check `c3-day.spec.ts` for the `fixme` on EV-15 and EV-16.
- Pass evidence: both effects occur exactly as with an iPad pick (same queue entries, same day-start apply); the `fixme` rows for EV-15 and EV-16 are gone and those specs run and pass.
- Fails if: the host action splits at once, bypasses the queue, or the two `fixme` rows remain.

## Assumptions surfaced

- The 4-second card shows only on a day when a queued change applied → decided, Q4.1 (Bob, 2026-11-14, adopted). Gamewright to confirm: PT-18's wording contradicts itself and the ruling picks one reading.
- Queued actions stack in the order picked; an opposite pick cancels (EV-26, EV-27) → decided, Q4.2 (Bob, 2026-11-14, adopted).
- The per-split-group shift applies to every group while split, a group of one included (EV-05) → decided, Q4.3 (Bob, 2026-11-14, adopted).
- The 4 s is a shared constant, not tuning (EV-28) → decided, Q4.4 (Bob, 2026-11-14, adopted).
- The host split action lives here (EV-29) → Q7.2 (Bob, 2026-11-14, adopted); the use-item host action is in CU/07.
- The PT-18 and PT-06 DEC ids → step 43 (#469); not invented here.
