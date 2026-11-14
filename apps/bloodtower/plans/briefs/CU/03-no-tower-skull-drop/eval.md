Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: CU / 03-no-tower-skull-drop — A no-tower skull lands on the standing building with the fewest skulls

- Brief: ./plan.md
- Mockup: ./mockup.html
- Risk: Med

Unit tests live in `apps/bloodtower/src/engine/loops/day/day.test.ts` (day loop harness `h.play`) unless named otherwise. Each uses a test board with a kingdom die forced by seed or by a tuning copy (`kingdom_die` stays `d4`; the test seeds the stream so the die lands on a named kingdom). The test also records how many kingdom draws were used.

## Checks

### EV-01 — The fewest-skulls building takes the skull
- Requirement: PT-07, design-freeze section H: a no-tower drop goes to the standing building with the fewest skulls in the d4 kingdom.
- Method: unit
- How: test "EV-01 sim drop picks fewest skulls": kingdom N holds four standing buildings with 2, 0, 1 and 3 skulls (`clock.skulls`). Force the die to N and run `simulateSkullDrop` on 30 different seeds.
- Pass evidence: on all 30 seeds the skull lands on the building that held 0; its count is then 1; the other three counts are unchanged.
- Fails if: a seeded random pick among the kingdom's buildings (today's behaviour) or the most-skulled building is used; it would miss the 0 building on some seeds.

### EV-02 — Ties go to the seeded pick
- Requirement: PT-07: ties by seed, from the play stream so a replay lands the same (C2/08 EV-04).
- Method: unit
- How: kingdom N has buildings with 0, 0, 0 and 2 skulls. Run 60 seeds. Run seed S twice.
- Pass evidence: every landing is one of the three 0-skull buildings, never the 2-skull one; each of the three is chosen at least once across the 60 seeds; seed S lands on the same building both times.
- Fails if: the first tied building (or the lowest id) is always picked, a non-tied building is picked, or `Math.random` is used.

### EV-03 — Counts update between skulls in one night
- Requirement: PT-07 and Q3.2 (Bob, 2026-11-14, adopted): "fewest skulls" is read again after each skull in a night, so several skulls spread out.
- Method: unit
- How: a test tuning with `drops_a_night.heroes_3_to_4.each_night: 3`; four heroes; kingdom N holds three standing buildings with 1, 1 and 1 skulls; the die is forced to N each time.
- Pass evidence: the night's three skulls land on three different buildings, each ending at 2 skulls.
- Fails if: all three skulls land on one building because the counts are read once before the night.

### EV-04 — A fallen building never takes a skull
- Requirement: PT-07 says "standing"; a fallen building (`isFallen`) is not a target.
- Method: unit
- How: kingdom N holds one fallen building (4 skulls) and one standing building with 3 skulls; run 20 seeds.
- Pass evidence: every skull lands on the standing building with 3; the fallen one stays at 4.
- Fails if: the fewest-skulls rule ranks a fallen building (for example one counted as 0 skulls, or ranked before the standing check).

### EV-05 — No standing building in the kingdom: reroll once
- Requirement: PT-07: if no building stands, reroll the kingdom once.
- Method: unit
- How: kingdom N has all its buildings fallen; the test stream gives the first die N and the second die E (E has a standing building). Count the kingdom draws.
- Pass evidence: the skull lands in kingdom E; exactly two kingdom draws are used for that skull; a skull in a later night starts with a fresh single draw.
- Fails if: it picks any standing building without a reroll (today's fallback), or it rerolls more than once. The case where the rerolled kingdom is also empty is EV-15.

### EV-06 — One line per skull, none cut (Amended 2026-11-14 (PT-07, Bob))
- Requirement: PT-07: the board shows one line per skull, "A skull falls on <building>.", stacked, never cut short; Bob approved the line (C2/08).
- Method: unit
- How: test in `src/engine/loops/session/towerLost.test.ts` style: a night with 5 skulls on 5 buildings with long titles (the longest building title in the test story). Read the board's skull lines from the view.
- Pass evidence: exactly 5 lines; each equals `A skull falls on <title>.` with the building's own title; the lines together are longer than 120 characters and none is truncated; two skulls on the same building give two identical lines, not one.
- Fails if: lines are joined into one string, cut at 120 characters (today's `.slice(0, 120)`), deduplicated, or the building shows as "a building".

### EV-07 — The board stacks the lines
- Requirement: PT-07, SCR-019 slice: the lines are stacked on the Story board, none hidden.
- Method: playwright
- How: Story board 1920x1080, no tower, a test tuning with 4 skulls in the night; step to the skull-sim day panel.
- Pass evidence: 4 elements (one per line) in the skull panel, each fully visible (not overflow-clipped; `scrollHeight` equals `clientHeight` on the panel), in drop order, none pressable.
- Fails if: one paragraph holds all lines, a line is clipped, or the panel takes a press.

### EV-08 — Screenshot matches the mockup
- Requirement: the stacked skull lines look as drafted (Gamewright draft; the Illusionist replaces it).
- Method: screenshot
- How: screenshot the board's skull panel at 1920x1080 with 3 lines; compare side by side with ./mockup.html section `#stacked`.
- Pass evidence: both images attached; the panel heading, then three lines one under another in drop order, spacing and order match; no line cut.
- Fails if: lines run on one row, or a line is missing or cut.

### EV-09 — No unseeded randomness
- Requirement: DEC-305 and C2/08 EV-04: the draw is seeded; a replay lands the same.
- Method: unit
- How: stub `Math.random` to throw; play the same seed and log twice, then a different seed once, over a board with ties.
- Pass evidence: no throw; the two runs land the same buildings; the different seed differs at least once across 10 tries.
- Fails if: any draw uses `Math.random` or time.

### EV-15 — Rerolled kingdom also empty: no skull, one logged error
- Requirement: Q3.1 (Bob, 2026-11-14, adopted): drop no skull and log an error; no fallback to another standing building.
- Method: unit
- How: kingdom N and kingdom E have all buildings fallen; kingdoms S and W each have a standing building. The test stream gives the first die N and the second die E. Run 20 seeds.
- Pass evidence: on every seed no skull lands anywhere (`clock.skulls` and the supply unchanged); exactly two kingdom draws are used; exactly one error is logged with its code and shows as a Story board toast; no exception; no skull line for it is shown; the next skull in the same night starts with a fresh draw.
- Fails if: a skull lands on a standing building of S or W (today's fallback), a third draw is made, or the case ends with no logged error.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — Continue lands the same
- Requirement: the same seed and event log lands the same skulls.
- Method: unit
- How: play 3 days with simulated drops, save the log, rebuild a run from the events (as C2/08 EV-12 does), and compare the landed buildings.
- Pass evidence: the rebuilt run lands on the same buildings in the same order.
- Fails if: the new draw count shifts the stream so a replay differs.

### EV-12 — Counts and supply survive Continue
- Requirement: skull counts per building, the supply and the fallen set are the same after Continue.
- Method: unit
- How: after two nights, save and restore; read `clock.skulls`, `clock.supply`, the fallen set and `nightDrops`.
- Pass evidence: the restored values equal the saved ones.
- Fails if: the new selection keeps counts that Continue does not restore.

### EV-13 — Fallen buildings stay fallen
- Requirement: a fallen building never takes a skull, before or after Continue.
- Method: unit
- How: as EV-04, then Continue, then another night.
- Pass evidence: the fallen building stays at 4 skulls and takes no new skull.
- Fails if: Continue forgets the fallen set so the building is chosen again.

### EV-14 — Tower on: the table still places the skull
- Requirement: DEC-092 on the tower path is unchanged; nothing physical runs on the simulated path.
- Method: playwright
- How: with the mock tower linked, reach the skull prompt; then play a night without the tower and read the mock tower's received commands.
- Pass evidence: with the tower, the iPad offers one record prompt per standing building and the app picks none; without it, the mock tower received zero commands.
- Fails if: the app auto-places a skull while the tower is on, or a command goes out on the simulated path.

## Assumptions surfaced

- Skulls in one night land one at a time with counts re-read between them (EV-03) → decided, Q3.2 (Bob, 2026-11-14, adopted).
- Two draws for one skull (die, then reroll) come from the same play stream, so the stream order for old logs changes → accepted, Q3.3 (Bob, 2026-11-14, adopted).
- If the rerolled kingdom is also empty → no skull and a logged error (EV-15), Q3.1 (Bob, 2026-11-14, adopted). Open for Gamewright: whether the night should also stop at the loss.
- DEC-905's body ("every building of one kingdom (DEC-044)") is amended by step 43 for PT-02; not edited here.
- "Standing" means not fallen, as `isFallen` reads it today → no new rule.
