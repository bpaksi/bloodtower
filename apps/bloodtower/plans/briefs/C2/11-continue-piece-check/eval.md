Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C2 / 11-continue-piece-check — Continue's piece check

- Brief: ./plan.md
- Mockup: ./mockup.html
- Risk: High. Restore and tower-safety evals included (EV-04 to EV-07, EV-10 to EV-12).

## Checks

### EV-01 — The check runs between the tower block and the resumed chapter (Amended 2026-11-14 (PT-08))
- Requirement: Continue runs the piece check after the tower block and before the saved chapter (DEC-283, DEC-710).
- Method: playwright
- How: new `c2-continue-check.spec.ts`, "continue after a restart": play to day 2 with the mock tower, quit, restart the host; the session resumes with tonight's tower choice and no Enter (no tower question); press Continue on the session screen. Seed the mock so no skull record has target `inside`.
- Pass evidence: the mock tower stays connected across the restart; order is hero-minis, skulls, quest-tokens (the day-2 save has open quests, PT-08), day 2, with no tower block. No step of Game settings, Claim heroes or the pack setup shows.
- Fails if: the game resumes with no check, the check runs before the tower block, or a setup screen shows.

### EV-02 — Each step shows where the save has the pieces
- Requirement: each picture shows the saved place of the pieces it covers (DEC-710).
- Method: unit
- How: engine test "piece check from a save": a save with heroes on two named spaces, 1 skull on the village and 2 on the bazaar, no foes, no broken seal.
- Pass evidence: the board view for step 1 names both heroes and their spaces (for example `S-howling-desert`); step 2 lists the village 1 and the bazaar 2. There is no foes step and no seals step.
- Fails if: a step shows the default start, a count of zero for a building with skulls, or an empty foes or seals step.

### EV-03 — Done confirms, Skip leaves it unconfirmed
- Requirement: a press confirms each step; a skipped step stays unconfirmed (MEC-018).
- Method: playwright
- How: same spec: Done on the hero-minis step, Skip on the skulls step.
- Pass evidence: in play, the top band shows the unconfirmed outline badge beside Tower with a count of skipped steps and does not mark the heroes. The event log has one confirm event for the minis and one skip event for the skulls. With two iPads, both show Done and Skip on each step; the first press wins and the second changes nothing.
- Fails if: a skip reads as confirmed, or a confirm is not logged.

### EV-04 — No rotate without the press
- Requirement: nothing turns on its own; one press sends one rotate per drum that is off (DEC-716, tower safety).
- Method: unit
- How: server test with the mock tower: a save with the top drum at position 2 and the middle at 1, bottom at home. Reach the drums step and wait 5 s; then press Turn the drums.
- Pass evidence: no tower command during the wait. After the press, exactly two `mechanics.rotate-drum` commands, top then middle, each with the saved position; none for the bottom drum.
- Fails if: a rotate is sent before the press, a drum already in place is sent a rotate, or the order differs.

### EV-05 — No drums step when nothing is off
- Requirement: the drums step shows only when a saved position differs from where calibration left it (DEC-716).
- Method: unit
- How: engine test: a save with every drum at home; and a save written before this feature (no drum field).
- Pass evidence: no drums step in either case, and no rotate is sent. For the no-drum-field save, step 5 is hidden with no line (drums read as at home).
- Fails if: the step shows, or a rotate is sent.

### EV-06 — A failed rotate is shown and not retried
- Requirement: a rotate the tower rejects is logged, shown on the iPad that pressed with its error code, toasted on the Story board, and never retried on its own (decision 0003, tower safety).
- Method: unit
- How: server test with the mock tower set to fail the second rotate.
- Pass evidence: one error log line with a code; the pressing iPad's view carries the code; the board view carries a toast; no third command is sent. The step offers Turn the drums again and Skip. After top ok and middle fails, the autosave has the top's new position and the middle's and bottom's old ones.
- Fails if: the error is swallowed, the rotate is retried with no press, or the step moves on as if done.

### EV-07 — Trapped skulls: the count comes from the "inside" records
- Requirement: the step asks the table to drop back as many skulls as the save recorded as "stayed inside" (DEC-717).
- Method: unit
- How: engine test: a save with skull records on days 1 to 3, two of them with target `inside`; and a save with none.
- Pass evidence: the first save shows "Drop 2 skulls back in the top of the tower." The second shows no trapped-skull step.
- Fails if: the count includes skulls that landed on buildings, or the step shows with 0.

### EV-08 — Without the tower, the tower steps drop out (Amended 2026-11-14 (PT-08))
- Requirement: without the tower, the drums and trapped-skull steps are left out (DEC-305, DEC-306).
- Method: playwright
- How: same spec: a save from a tower game with a drum off and one skull inside; Continue with Play without Tower.
- Pass evidence: the check shows the minis, skulls and quest-tokens steps only (PT-08; the save has no foes or seals); no tower command is sent; the game resumes.
- Fails if: a tower step shows, or the check refuses to go on without the tower.

### EV-09 — Screenshots match the mockup
- Requirement: the minis step, the drums step before and after the press, and the trapped-skull step (mockup).
- Method: screenshot
- How: screenshot the board at 1920×1080 and an iPad at 1024×768 for each; compare with ./mockup.html mockup.html#s=N (tab names per EV-16).
- Pass evidence: eight images attached, each matching its section's parts and order.
- Fails if: a part is missing or out of order.

### EV-13 — Drums confirm after the press
- Requirement: P:36.
- Method: unit
- How: (server test) Turn the drums succeeds, then Done.
- Pass evidence: the board view's step shows the expected side per drum; Done logs one confirm event for drums.
- Fails if: no picture or no confirm event.

### EV-14 — Foes and seals when present
- Requirement: P:33–34.
- Method: unit
- How: (engine test) a save with one foe and one broken seal.
- Pass evidence: steps in order minis, skulls, foes, seals.
- Fails if: a step is missing or out of order.

### EV-15 — Drum field updated by the check's rotate
- Requirement: the piece check updates the saved drum positions (Bob 2026-10-31).
- Method: unit
- How: (server test) Turn the drums succeeds.
- Pass evidence: the autosave's drum positions equal the sent positions.
- Fails if: the autosave keeps the old positions.

### EV-16 — Steps match mockup (M tabs 1–6, "Skipped mark") (Amended 2026-11-14 (PT-08))
- Requirement: DEC-710 per the mockup; board 1920×1080, iPad 768×1024.
- Method: playwright
- How: walk every step; skip one. (The fixture save has no open quest tokens; the quest-tokens step is EV-17 and EV-18.)
- Pass evidence: lines: 1 "Set each hero on their saved space."; 2 "Put the skulls back on each building."; 3 "Set the foes back where they stood."; 4 "Mark the broken seals."; 5 title "Turn the drums to the saved game"; 6 "Drop N skulls back in the top of the tower." (N real). Each board step has `img|svg|canvas` and 0 buttons. iPad 1–4 and 6: "Done" (primary), "Skip". Step 5: "Turn the drums" (primary), Done and Skip shown together as in the mockup, Done disabled until the press succeeded. After a skip, the board top band shows the outline badge beside Tower with count = skipped steps. (Body buttons only: `[data-screen] button`, excluding the bottom-bar Menu gear `bt-iconbtn`.)
- Fails if: a line differs, a step lacks a picture, the board shows a button, or Done is pressable on step 5 before the drums turned.

### EV-17 — A quest-tokens step lists the open quest tokens (PT-08)
- Requirement: PT-08 (1.0 half): the piece check lists every piece the 1.0 game keeps on the physical board; quest tokens are one.
- Method: unit
- How: engine test "piece check from a save": chapter 2 entered, tokens on The Barrow and The Shrine spaces, The Shrine quest done, no foes, no broken seal.
- Pass evidence: a quest-tokens step names the open token (The Barrow) on its space and does not list the done quest; with both quests done, or a save before chapter 1's tokens exist, there is no quest-tokens step.
- Fails if: a done quest's token is listed, an open one is missing, or the step shows empty.

### EV-18 — The step order and its confirm/skip behave like the others (PT-08)
- Requirement: PT-08 (Bob, 2026-11-14, adopted): the step order is board pieces, then quest tokens, then the tower steps; the "4a" insertion is kept so the approved step and EV numbers hold. MEC-018 (a skip stays unconfirmed).
- Method: playwright
- How: `c2-continue-check.spec.ts`: two runs. (a) A save with minis, skulls, one foe, one broken seal and open quest tokens, with the mock tower, a drum off and one skull inside; Done on each step but Skip on quest tokens. (b) The same save with Play without Tower.
- Pass evidence: (a) steps in order: minis, skulls, foes, seals, quest tokens, then drums, then trapped skulls; quest tokens come before both tower steps and after the seals step; the tower steps keep their numbers 5 and 6 and the quest-tokens step is numbered 4a (the numbered lines of EV-16 hold); (b) minis, skulls, foes, seals, quest tokens only. Each board step has a picture and 0 buttons; every iPad shows Done and Skip; the skip adds to the top band's badge count; the log has one confirm per confirmed step and one skip for the quest tokens.
- Fails if: the step lands after the drums or trapped-skulls step, lands before the seals step, renumbers the tower steps, has no Skip, or a skip reads as confirmed.

### EV-19 — App-only state needs no step (PT-08)
- Requirement: PT-08: app-only state (loyalty, clues, items, purse, corruption, virtues, flags) needs no check.
- Method: unit
- How: a save with gold, items, corruption, virtues and story flags set and nothing physical beyond the minis.
- Pass evidence: the step list holds no step for any of them.
- Fails if: a step is made for app-only state.

### EV-20 — Every physical piece kind has a step, and no 1.1 piece (PT-08)
- Requirement: PT-08: the check lists every piece the 1.0 game keeps on the board and no other.
- Method: unit
- How: `pieceCheck.test.ts`: a list of the physical piece kinds kept in the autosave (hero minis, skulls on buildings, foes, broken seals, quest tokens, drums, trapped skulls); the test builds a save with each kind present and one with an adversary, lieutenant or hunter field set (a 1.1 shape).
- Pass evidence: exactly one step per physical kind present; the 1.1 shape yields no step in 1.0; a physical kind added to the save without a step fails the test.
- Fails if: a kind has no step, or the Warden, hunters, captain or a drum-of-1.1 step shows.

### EV-21 — Without the tower the quest tokens step stays
- Requirement: DEC-305, DEC-306; PT-08: quest tokens are a board piece, not a tower piece.
- Method: playwright
- How: Continue with Play without Tower on a save with open quest tokens.
- Pass evidence: the quest-tokens step shows; the drums and trapped steps do not; no tower command is sent.
- Fails if: the step is hidden without the tower.

### EV-22 — Screenshots of the quest-tokens step match
- Requirement: PT-08.
- Method: screenshot
- How: board 1920×1080 and iPad 1024×768 as EV-09; compare with ./mockup.html `#s=7` (a new tab the Illusionist adds; mockup.html is not edited by the brief PR).
- Pass evidence: two images, picture and line in the same order as the other steps.
- Fails if: a part is missing or the tab is missing.

## Survival evals (one per survival invariant in plan.md)

### EV-10 — The save is unchanged by the check
- Requirement: running, skipping or abandoning the check does not change the saved drums or trapped count.
- Method: unit
- How: server test: read the autosave, run the check to the drums step, restart; read it again; then skip every step and read it again.
- Pass evidence: the "inside" records are byte-equal across the three reads until the first new day is played. The drum positions change only by a successful Turn the drums during the check, which writes the sent positions to the autosave (Bob 2026-10-31).
- Fails if: the check writes the 'inside' records, or writes drum positions other than by a successful Turn the drums.

### EV-11 — The resumed game matches the save
- Requirement: after the check, the game is the saved one (DEC-675).
- Method: playwright
- How: same spec as EV-01, all steps Done.
- Pass evidence: day, group positions, purse, claims and seed match the quit game; the seed is not shown.
- Fails if: any of them differs, or the game restarts at day 1.

### EV-12 — A restart mid-check resumes at the same step
- Requirement: the check's progress survives a host restart.
- Method: unit
- How: server test: confirm the minis step, restart the host, rebuild from the event log.
- Pass evidence: the board view is on the skulls step, and the minis step stays confirmed.
- Fails if: the check starts again at the minis, or skips ahead.

### EV-23 — The check does not change the saved quest tokens
- Requirement: the save is unchanged by the check (EV-10) for the new step.
- Method: unit
- How: read the autosave's quest state; run, skip and abandon the quest-tokens step; read again.
- Pass evidence: tokens, done quests and flags are byte-equal.
- Fails if: the check writes quest state.

### EV-24 — A restart on the quest-tokens step resumes there
- Requirement: the check's progress survives a host restart (EV-12).
- Method: unit
- How: confirm minis, skulls, foes and seals, restart, rebuild from the log.
- Pass evidence: the board view is on the quest-tokens step; earlier steps stay confirmed.
- Fails if: it starts again at the minis, or skips past the step.

## Assumptions surfaced

- The steps go in a fixed order: minis, skulls, foes, seals, drums, trapped skulls. DEC-710 lists the pieces but not the order → Claude's order, pieces on the board first, then the tower; the quest-tokens step joins it between the seals and the drums (PT-08, below).
- Steps with nothing to set (no foes, no broken seal, no drum off, no trapped skull) are left out, not shown empty → follows the "show only when" wording in DEC-716 and DEC-717.
- An autosave from before this feature reads its drums as at home. Nothing in C1 turns a drum (DEC-108), so that is true for every save today.
- A skipped step shows in the top band until the next chapter-end check. MEC-018 says "stays unconfirmed" but not where → the top band, as DEC-186's outer-loop segment.
- In 1.0 the drums step may rarely show: glyphs wait for 1.1 (DEC-601), and only a 1.0 cue that turns a drum (DEC-006) makes one differ from home. The step is built and tested from seeded saves so a 1.0 cue can use it.
- PT-08 (Bob, 2026-11-14, adopted): quest tokens go after the other board pieces and before the tower steps (board pieces, quest tokens, tower steps; EV-18). The "4a" insertion is kept so the approved step and EV numbers hold.
- PT-08: in 1.0 the pieces are the minis, skulls, foes, broken seals and quest tokens, plus the existing drums and trapped-skull steps. The Warden, hunters and drums half of PT-08 is parked with 1.1.
- The quest-tokens step is numbered 4a, so the tower steps stay numbered 5 and 6 in every save (Bob, 2026-11-14, adopted); EV-16's line numbers describe a save with none (fixture note added to EV-16).
- EV-01, EV-08 and EV-16 are edited in place for this (quest tokens are present in any chapter save) and marked Amended 2026-11-14 (PT-08).

## OPEN questions

- ANSWERED (PT-08, Bob, 2026-11-14, adopted): step order board pieces, quest tokens, tower steps; "4a" kept (EV-18).
- OPEN (PT-08): the board line for the quest-tokens step is a Loremaster call: `[COPY: Put the quest tokens back on their spaces.]` (proposal only, in the style of the other lines; step 45). The tab number in the mockup is the Illusionist's.
- OPEN (PT-08): after calibration the playtest says the app re-turns drums or lists them as a step; step 5 (DEC-716) already does this, so nothing new is added here.
