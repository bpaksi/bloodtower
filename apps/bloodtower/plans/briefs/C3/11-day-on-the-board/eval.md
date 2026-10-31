Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 11-day-on-the-board — The day on the board: day roll, days left, threat bar, effects panel

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Risk: Med.

## Checks

### EV-01 — The day roll panel
- Requirement: UI-021, DEC-615.
- Method: playwright
- How: new `c3-day.spec.ts`, seed `c3-day-1`, 2 groups: group A holds one helping virtue; group B's most corrupted hero has 1 corruption. Read each group's raw 2d3 from the engine's seeded roll (test hook).
- Pass evidence: the board reads "Day 1"; one line per group, in group order, exactly `<Group name>: <total>` followed by one parenthesised term per modifier in the order virtue, terrain, corruption, each as `(+N virtue)`, `(+N terrain)`, `(−N corruption)` with a real minus sign; total = raw + modifiers, floored at 2. So A reads `A: <raw+1> (+1 virtue)`, B reads `B: <max(raw−1,2)> (−1 corruption)`; a group with no modifier shows the total alone.
- Fails if: a modifier is missing, mis-signed or out of order, the total differs from the engine, or a floor case shows below 2.

### EV-02 — Days left on the edge band
- Requirement: UI-028, DEC-686.
- Method: playwright
- How: after day 1's drop with 2 heroes.
- Pass evidence: the band reads days left 23 (24 − 1), not "23 skulls".
- Fails if: skulls shown instead of days.

### EV-03 — A won quest shows +1 day
- Requirement: DEC-699, UI-022.
- Method: playwright
- How: win The Herald on day 2.
- Pass evidence: the effects panel lists "+1 day" and no drop line; days left unchanged.
- Fails if: a drop line shows.

### EV-04 — Effects panel: one line per effect, no totals or recap
- Requirement: DEC-115, DEC-699, UI-022.
- Method: playwright
- How: day 2's end with a fixed seed where one Cleanse happened and one skull dropped.
- Pass evidence: line count = effect count (2); the Cleanse line reads "+1 day" (allowed, DEC-699); no totals row; no recap text; one primary button, Next, on the iPad; pressing it runs the chapter exit check and day 3 starts.
- Fails if: a totals row or recap shows, line count ≠ effect count, "+1 day" is missing, or Next does not advance.

### EV-05 — Regroup on the iPad only
- Requirement: DEC-640, SCR-016.
- Method: playwright
- How: 2 heroes, day 2 start.
- Pass evidence: each iPad offers split or join; the board shows the Regroup line `[COPY: regroup]` (spec: "A new day. Stay together, or split up?" is sample text) and the groups; nothing on the board is pressable.
- Fails if: the board takes a press.

### EV-06 — Screenshots match the screen spec
- Requirement: SCR-014, UI-021, UI-022, UI-028, UI-047.
- Method: screenshot
- How: board 1920×1080 and iPad 768×1024 portrait (locked by Bob) at: day roll, mid-turn, effects panel; compare side by side with ./mockup.html (Illusionist, from ./screen-spec.md) sections `#roll`, `#band`, `#effects`.
- Pass evidence: six images, parts and order matching.
- Fails if: a part is missing.

### EV-07 — The threat bar shows the coming drop only
- Requirement: UI-047; Q-C3-19 (Bob approved 2026-10-31).
- Method: playwright
- How: 4 heroes, mid-turn on night 1 (drop 1) and night 2 (drop 2).
- Pass evidence: the bar shows 1 then 2 coming skulls; no later nights shown.
- Fails if: the bar is absent, wrong, or shows more than the coming drop.

### EV-08 — Hero panel shows corruptions
- Requirement: UI-030.
- Method: playwright
- How: a hero holding Feral and Lost.
- Pass evidence: that hero's panel on the board shows 2 corruptions with both names; other heroes show none.
- Fails if: a count or name is missing or on the wrong hero.

### EV-09 — Skull placement on the iPad, including a fall
- Requirement: DEC-064, DEC-092, DEC-093.
- Method: playwright
- How: seeded drop into a kingdom with a 3-skull building; place the skull there.
- Pass evidence: board names the kingdom; iPad lists exactly that kingdom's standing buildings; after the press the board shows the building falling and it leaves the iPad list.
- Fails if: other kingdoms' or fallen buildings are listed, or the fall is not shown.

### EV-10 — Without the tower, the board shows the drop's kingdom
- Requirement: DEC-305.
- Method: playwright
- How: tower off; end a day with a fixed seed.
- Pass evidence: the board names the seeded kingdom the skull landed in.
- Fails if: no kingdom is shown, or it differs from the engine's.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — Continue shows the same clock
- Requirement: DEC-686.
- Method: playwright
- How: quit on day 3, Continue.
- Pass evidence: the band reads the same days left; buildings show the same skulls.
- Fails if: the count resets.

## Assumptions surfaced

- EV-06 needs ./mockup.html, which Illusionist draws from ./screen-spec.md before approval.

## OPEN questions

- ANSWERED Q-C3-04 (Bob approved 2026-10-31): count the actual nights the 1,2,1,2 pattern gives. (days left for 3–4 heroes)
- ANSWERED Q-C3-19 (Bob approved 2026-10-31): the threat bar shows only the coming drop.
