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
- Pass evidence: line count = effect count (2); the Cleanse line reads "+1 day" (allowed, DEC-699); no totals row; no recap text; no Next on the iPad (body shows no buttons); it auto-advances when its narration or cue ends (4 s with no audio; Bob 2026-10-31 10:38 AM ET), then runs the chapter exit check and day 3 starts.
- Fails if: a totals row or recap shows, line count ≠ effect count, "+1 day" is missing, or the panel does not auto-advance.

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
- Pass evidence: board names the kingdom; iPad lists exactly that kingdom's standing buildings; the step does not auto-advance (fake clock: still on skull placement 5 s after it shows, with or without audio end); after the press the board shows the building falling and it leaves the iPad list.
- Fails if: other kingdoms' or fallen buildings are listed, the step advances without a press, or the fall is not shown.

### EV-10 — Without the tower, the board shows the drop's kingdom
- Requirement: DEC-305.
- Method: playwright
- How: tower off; end a day with a fixed seed.
- Pass evidence: the board names the seeded kingdom the skull landed in.
- Fails if: no kingdom is shown, or it differs from the engine's.

### EV-11 — The toolbar is on every state
- Requirement: every iPad state of this screen has the bottom toolbar, "?" at the left and the gear at the right (Bob 2026-10-31 10:37 AM ET; Bob 2026-10-31 10:38 AM ET).
- Method: playwright
- How: (iPad portrait 768×1024) stop on each state: Day start (Regroup), day roll, mid-turn, skull placement, effects panel.
- Pass evidence: on each stop, `footer.bt-bar--bottom` is visible in the viewport; its first control is "?" and its last is the gear; no body element covers them.
- Fails if: any state lacks the toolbar, "?" or the gear.

### EV-12 — The happy path never needs the gear
- Requirement: this screen's happy path uses only the iPad body's flow buttons (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: play this screen's happy path through Day start (Regroup), day roll, mid-turn, skull placement, effects panel, counting Menu and help opens.
- Pass evidence: Menu open count 0 and help open count 0; the screen reaches its next screen.
- Fails if: any step can only be reached through the gear or help.

### EV-13 — Help matches this screen
- Requirement: "?" opens a help sheet on the iPad for this screen; Close returns to the same state; help does not pause and sends nothing (Bob 2026-10-31 10:38 AM ET).
- Method: playwright
- How: on each state (Day start (Regroup), day roll, mid-turn, skull placement, effects panel) press "?", then Close.
- Pass evidence: the sheet's `data-help-screen` is `day-on-the-board` and its text is exactly "A new day begins. Move your heroes, then choose where to go." (Loremaster 2026-10-31); the host sends nothing and `paused` is unchanged; after Close the same state shows.
- Fails if: help is missing, shows another screen's text, pauses the game or changes state.

### EV-14 — Next-only steps auto-advance
- Requirement: the effects panel has no Next; it advances when its narration or cue ends, or after 4 s when it has no audio (Bob 2026-10-31 10:38 AM ET).
- Method: playwright
- How: (fake clock) reach the effects panel; once with narration (mock audio end event), once with audio off.
- Pass evidence: the iPad shows no Next button there; the screen advances on the audio end event, and 4 s (±200 ms) after it shows when there is no audio; the step's outcome is the same as the old Next.
- Fails if: a Next button shows, it advances early, or it waits for a press.

### EV-15 — Gear actions open on the Story board
- Requirement: split/rejoin and use a potion or item start from the gear and show on the Story board; the game pauses while open (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: (board 1920×1080 + iPad 768×1024, mid-turn, a hero holding a potion) gear → Split party; Done. Gear → Use a potion or item; pick the hero, then the potion; Done.
- Pass evidence: while open, the iPad body shows "See the Story board", the pick buttons (split: one button per group choice; use-item: one button per hero, then one per item that hero holds) and Done/Back; the board shows `[data-panel="split"]` then `[data-panel="use-item"]` (hero step, then item step) with 0 `button` elements, mirroring each iPad press (DEC-278; (Gamewright pick, pending Bob Q-GEAR-1)); host `paused: true` while open and `false` after Done; after the split, the board shows two groups (two `[data-group]` elements, each with its heroes); after the potion, that hero's HP is higher by exactly the potion's amount and the potion is gone from the hero's inventory on the host and in the Current party panel.
- Fails if: a panel shows on the iPad, the game runs while open, the board does not show two groups after the split, HP does not rise by the potion amount, or the potion stays in the inventory or is used twice.

### EV-16 — A disabled item shows its reason
- Requirement: an item is enabled only when it works now; a disabled item shows a one-line reason (DEC-227; Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: open the gear mid-turn with no hero holding a potion or item, and with the whole party in one group.
- Pass evidence: "Use a potion or item" is disabled with one reason line ("No potions or items to use.", Loremaster, locked); item 4 is one button reading exactly "Split party" (no number prefix), enabled, and there is no separate "Rejoin party" item; after a split, the same item reads "Rejoin party" (one item whose label toggles, C2 feature 04); enabled items have no reason line.
- Fails if: a disabled item has no reason, or a working item is greyed.

### EV-17 — Narrated steps do not advance before their audio ends
- Requirement: a Next-only step with narration advances only on its audio-end event, never on a timer (Bob 2026-10-31 10:38 AM ET).
- Method: playwright
- How: (fake clock, mock audio) reach the effects panel with narration longer than 4.5 s; advance the clock 4.5 s without firing the audio-end event; then fire it.
- Pass evidence: after 4.5 s the iPad and the board are still on the step; it advances only after the audio-end event fires.
- Fails if: the step advances before its audio ends, or does not advance after the audio-end event.

### EV-18 — Restart and Continue during an auto-advancing step apply its effect once
- Requirement: a restart or a Continue during an auto-advancing step resumes that step and applies its effect exactly once (Bob 2026-10-31 10:38 AM ET).
- Method: playwright
- How: (fake clock) two runs: (1) on the effects panel, before it advances, restart the host and Continue; (2) on the same step, quit and Continue from the session screen. In each run let the step advance.
- Pass evidence: in each run the same step shows again and auto-advances once; each effect on the panel (gold, HP, days left) is applied exactly once (host state and event log show one application).
- Fails if: the step is skipped without its effect, repeats its effect, or stalls.

## Survival evals (one per survival invariant in plan.md)

### EV-19 — Continue shows the same clock
- Requirement: DEC-686.
- Method: playwright
- How: quit on day 3, Continue.
- Pass evidence: the band reads the same days left; buildings show the same skulls.
- Fails if: the count resets.

### EV-20 — The gear Menu survives a restart closed
- Requirement: after a restart and Continue on this screen, the Menu and any gear panel come back closed, the game is not paused, the toolbar is back on every iPad, and every item's enabled state is recomputed (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: on this screen, open a gear panel (Volume), restart the host, Continue.
- Pass evidence: no `[data-menu]` or `[data-panel]`; `paused: false`; every iPad shows the toolbar with "?" and the gear; the Menu's enabled and disabled items and reasons match those before the restart.
- Fails if: the Menu or panel reopens, the game stays paused, the toolbar is missing, or item states are stale.

## Assumptions surfaced

- EV-06 needs ./mockup.html, which Illusionist draws from ./screen-spec.md before approval.

## OPEN questions

- ANSWERED Q-C3-04 (Bob approved 2026-10-31): count the actual nights the 1,2,1,2 pattern gives. (days left for 3–4 heroes)
- ANSWERED Q-C3-19 (Bob approved 2026-10-31): the threat bar shows only the coming drop.
