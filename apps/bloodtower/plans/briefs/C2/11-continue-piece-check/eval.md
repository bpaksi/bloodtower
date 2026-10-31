Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C2 / 11-continue-piece-check — Continue's piece check

- Brief: ./plan.md
- Mockup: ./mockup.html
- Risk: High. Restore and tower-safety evals included (EV-04 to EV-07, EV-10 to EV-12).

## Checks

### EV-01 — The check runs between the tower block and the resumed chapter
- Requirement: Continue runs the piece check after the tower block and before the saved chapter (DEC-283, DEC-710).
- Method: playwright
- How: new `c2-continue-check.spec.ts`, "continue after a restart": play to day 2 with the mock tower, quit, restart the host, run the Enter, press Continue on the session screen. Seed the mock so no skull record has target `inside`.
- Pass evidence: the screens come in this order: the tower choice, then the hero-minis step, then the skulls step, then day 2 in play. No step of Game settings, Claim heroes or the pack setup shows.
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
- Pass evidence: one error log line with a code; the pressing iPad's view carries the code; the board view carries a toast; no third command is sent. The step offers Turn the drums again and Skip.
- Fails if: the error is swallowed, the rotate is retried with no press, or the step moves on as if done.

### EV-07 — Trapped skulls: the count comes from the "inside" records
- Requirement: the step asks the table to drop back as many skulls as the save recorded as "stayed inside" (DEC-717).
- Method: unit
- How: engine test: a save with skull records on days 1 to 3, two of them with target `inside`; and a save with none.
- Pass evidence: the first save shows "Drop 2 skulls back in the top of the tower." The second shows no trapped-skull step.
- Fails if: the count includes skulls that landed on buildings, or the step shows with 0.

### EV-08 — Without the tower, the tower steps drop out
- Requirement: without the tower, the drums and trapped-skull steps are left out (DEC-305, DEC-306).
- Method: playwright
- How: same spec: a save from a tower game with a drum off and one skull inside; Continue with Play without Tower.
- Pass evidence: the check shows the minis and skulls steps only; no tower command is sent; the game resumes.
- Fails if: a tower step shows, or the check refuses to go on without the tower.

### EV-09 — Screenshots match the mockup
- Requirement: the minis step, the drums step before and after the press, and the trapped-skull step (mockup).
- Method: screenshot
- How: screenshot the board at 1920×1080 and an iPad at 1024×768 for each; compare with ./mockup.html sections `#minis`, `#drums`, `#drums-confirm`, `#trapped`.
- Pass evidence: eight images attached, each matching its section's parts and order.
- Fails if: a part is missing or out of order.

### EV-13 — Drums confirm after the press
- Requirement: P:36.
- Method: server test
- How: Turn the drums succeeds, then Done.
- Pass evidence: the board view's step shows the expected side per drum; Done logs one confirm event for drums.
- Fails if: no picture or no confirm event.

### EV-14 — Foes and seals when present
- Requirement: P:33–34.
- Method: engine test
- How: a save with one foe and one broken seal.
- Pass evidence: steps in order minis, skulls, foes, seals.
- Fails if: a step is missing or out of order.

### EV-15 — Drum field updated by the check's rotate
- Requirement: the piece check updates the saved drum positions (Bob 2026-10-31).
- Method: server test
- How: Turn the drums succeeds.
- Pass evidence: the autosave's drum positions equal the sent positions.
- Fails if: the autosave keeps the old positions.

### EV-16 — Steps match mockup (M tabs 1–6, "Skipped mark")
- Requirement: DEC-710 per the mockup; board 1920×1080, iPad 768×1024.
- Method: playwright
- How: walk every step; skip one.
- Pass evidence: lines: 1 "Set each hero on their saved space."; 2 "Put the skulls back on each building."; 3 "Set the foes back where they stood."; 4 "Mark the broken seals."; 5 title "Turn the drums to the saved game"; 6 "Drop N skulls back in the top of the tower." (N real). Each board step has `img|svg|canvas` and 0 buttons. iPad 1–4 and 6: "Done" (primary), "Skip". Step 5: "Turn the drums" (primary), Done and Skip shown together as in the mockup, Done disabled until the press succeeded. After a skip, the board top band shows the outline badge beside Tower with count = skipped steps. (Body buttons only: `[data-screen] button`, excluding the bottom-bar Menu gear `bt-iconbtn`.)
- Fails if: a line differs, a step lacks a picture, the board shows a button, or Done is pressable on step 5 before the drums turned.

## Survival evals (one per survival invariant in plan.md)

### EV-10 — The save is unchanged by the check
- Requirement: running, skipping or abandoning the check does not change the saved drums or trapped count.
- Method: unit
- How: server test: read the autosave, run the check to the drums step, restart; read it again; then skip every step and read it again.
- Pass evidence: the "inside" records are byte-equal across the three reads until the first new day is played. The drum positions change only by a successful Turn the drums during the check, which writes the sent positions to the autosave (Bob 2026-10-31).
- Fails if: the check writes either field.

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

## Assumptions surfaced

- The steps go in a fixed order: minis, skulls, foes, seals, drums, trapped skulls. DEC-710 lists the pieces but not the order → Claude's order, pieces on the board first, then the tower. Bob: OK?
- Steps with nothing to set (no foes, no broken seal, no drum off, no trapped skull) are left out, not shown empty → follows the "show only when" wording in DEC-716 and DEC-717.
- An autosave from before this feature reads its drums as at home. Nothing in C1 turns a drum (DEC-108), so that is true for every save today.
- A skipped step shows in the top band until the next chapter-end check. MEC-018 says "stays unconfirmed" but not where → the top band, as DEC-186's outer-loop segment.
- In 1.0 the drums step may rarely show: glyphs wait for 1.1 (DEC-601), and only a 1.0 cue that turns a drum (DEC-006) makes one differ from home. The step is built and tested from seeded saves so a 1.0 cue can use it.
