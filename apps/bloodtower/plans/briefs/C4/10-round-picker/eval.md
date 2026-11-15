Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 10-round-picker — The round picker on the iPad: Fight or Retreat, then one action

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-21; survival evals last (EV-11 … EV-12, EV-19).

## Checks

### EV-01 — Fight or Retreat first
- Requirement: UI-027, DEC-118.
- Method: playwright
- How: start a round.
- Pass evidence: both buttons; no actions yet.
- Fails if: actions first.

### EV-02 — All pick at once (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: Q-C4-16.
- Method: playwright
- How: 3 iPads.
- Pass evidence: all three pickers open in the same frame (open timestamps within 100 ms); the board ticks each hero as they pick.
- Fails if: any picker opens only after another iPad's pick (open timestamps over 100 ms after a pick).

### EV-03 — A sat-out hero gets no picker
- Requirement: DEC-119.
- Method: playwright
- How: hero at 0.
- Pass evidence: that iPad shows "You are sitting out this battle. Watch the board." (Copy table: ipad.sitting-out) and no buttons.
- Fails if: picker shown.

### EV-04 — Screenshots match
- Requirement: UI-027.
- Method: screenshot
- How: iPad 768×1024 portrait, mockup `#choice`, `#actions`.
- Pass evidence: pixel diff under 1% against `#choice` and `#actions`.
- Fails if: any image over 1% diff.

### EV-05 — The group's Fight or Retreat is the first press
- Requirement: the plan's rule: the first press on any present iPad decides; the others' buttons disable.
- Method: playwright
- How: 3 iPads; iPad A presses Retreat, then iPad B presses Fight 200 ms later.
- Pass evidence: the battle retreats; iPad B's press is ignored and its buttons are disabled with "The group chose Retreat." (Copy table: ipad.group-chose-retreat).
- Fails if: B's Fight wins, or both are applied.

### EV-06 — The toolbar is on every state
- Requirement: every iPad state has the bottom toolbar, "?" at the left and the gear at the right (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: (iPad portrait 768×1024) stop on each state: Fight or Retreat, actions, waiting, sitting out.
- Pass evidence: on each stop `footer.bt-bar--bottom` is visible in the viewport; its first control is "?" and its last is the gear; no body element covers them.
- Fails if: any state lacks the toolbar, "?" or the gear.

### EV-07 — The happy path never needs the gear
- Requirement: this screen's happy path uses only the iPad body's flow buttons (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: play the happy path through Fight or Retreat, actions, waiting, sitting out, counting Menu and help opens.
- Pass evidence: Menu open count 0 and help open count 0; the screen reaches its next screen.
- Fails if: a Menu or help open is needed.

### EV-08 — Help matches this screen
- Requirement: "?" opens a help sheet on the iPad for this screen; Close returns to the same state; help does not pause and sends nothing (C2-04, C3 rule).
- Method: playwright
- How: on each state (Fight or Retreat, actions, waiting, sitting out) press "?", then Close.
- Pass evidence: the sheet's `data-help-screen` is `round-picker` and its text is exactly "Choose Fight or Retreat, then each hero picks Attack, Cast a spell, Spend an Advantage, Drink a potion or Guard. The round starts when everyone has picked." (Loremaster 2026-10-31); the host receives 0 messages from the iPad while it is open and `paused` is unchanged; after Close the same state shows.
- Fails if: help is missing, shows on the board, shows another screen's text, sends a message, pauses the game or changes state.

### EV-09 — A hero can change a pick until the last hero picks (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: Q-C4-18.
- Method: playwright
- How: 2 heroes; hero 1 picks Attack, changes to Cast a spell; hero 2 picks Attack.
- Pass evidence: after picking, hero 1's iPad shows **Change pick** (label approved by Bob 2026-10-31 6:16 PM ET, Q-C4-18); tapping it brings the actions back, and the round uses hero 1's Cast a spell; once hero 2 has picked, **Change pick** is gone and hero 1's buttons are disabled.
- Fails if: the old pick is used, or a change is possible after the last pick.

### EV-10 — "All picked" goes straight to the round result
- Requirement: Gamewright ruling: All picked does not hold.
- Method: playwright
- How: (fake clock) 2 heroes; the last hero picks; do not advance the clock.
- Pass evidence: the board shows the round result line in the same tick; no "All picked" hold and no Next.
- Fails if: the board holds on "All picked", waits for a timer, or shows a Next.

### EV-13 — "Pick for <hero>" shows on the other iPads after 30 s (PT-20)
- Requirement: PT-20 (Bob, 2026-11-14, adopted): a seat silent for 30 s gives every other iPad of the acting group, the iPads of sat-out heroes included, "Pick for <hero>", only for standing heroes who have not picked.
- Method: playwright
- How: `c4-round.spec.ts`, (fake clock) 4 iPads A, B, C, D: D's hero sits out at 0 HP (its iPad shows "You are sitting out this battle. Watch the board."); A and B pick; C does not; read each iPad at 29.9 s and at 30.0 s.
- Pass evidence: at 29.9 s no Pick for button anywhere; at 30.0 s A, B and D each show one button `[data-pick-for]` reading the Copy table's `button.pick-for` with C's hero name, and no button for A, B or D's hero; C's iPad shows none; D's iPad still shows the sitting-out line with the button; the board still reads "Waiting on: {C's hero}." (Copy table: board.waiting). The Copy table's `ipad.pick-for.note` sits with the button.
- Fails if: the button shows early, on C's own iPad, is missing from the sat-out hero's iPad, is offered for a hero who picked or sits out, has the wrong name, or the board stops naming C.

### EV-14 — Tapping it picks Guard for that hero (PT-20)
- Requirement: PT-20 (Bob, 2026-11-14, adopted): "Pick for <hero>" sets Guard if the hero can Guard, otherwise a normal attack (DEC-129's no-pick default; EV-20 holds the no-Guard case).
- Method: playwright
- How: C's hero has a guard virtue. After EV-13, A taps Pick for C; B taps it 200 ms later.
- Pass evidence: the board ticks C ("{hero} has picked."); the round runs; C's pick is Guard in the log and the result; A's iPad shows the pick summary "{C}: Guard" (Copy table: pick.summary); B's button is gone or disabled and its tap is ignored (first press wins).
- Fails if: the pick is another action though C can Guard, two picks are logged, or the round does not start.

### EV-15 — The button leaves when the hero answers
- Requirement: PT-20.
- Method: playwright
- How: Pick for C showing; C picks Attack.
- Pass evidence: the button is removed from A and B at once; C's pick is Attack; a stale tap does nothing.
- Fails if: the button stays, or Guard replaces Attack.

### EV-16 — Two silent seats give two buttons, each for its own hero
- Requirement: PT-20.
- Method: playwright
- How: 4 iPads; C and D silent; at 30 s A taps Pick for D.
- Pass evidence: A and B each show two buttons (C and D); C and D's own iPads show none for themselves (each shows the other's); after the tap only D is picked and C's button remains.
- Fails if: one button covers both, or a tap picks the wrong hero.

### EV-17 — The new state keeps the toolbar, and help stays this screen's
- Requirement: every iPad state has the bottom toolbar, "?" left and gear right (C3 rule, Bob 2026-10-31 10:37 AM ET); help does not pause and sends nothing.
- Method: playwright
- How: (iPad portrait 768×1024) on A's iPad with the Pick for button showing: check the toolbar; press "?", then Close.
- Pass evidence: `footer.bt-bar--bottom` visible with "?" first and the gear last; the sheet's `data-help-screen` is `round-picker` with the existing Copy text; `paused` unchanged; the button is still there after Close.
- Fails if: the toolbar is covered, help sends a message or pauses, or the button disappears.

### EV-18 — Screenshots of the Pick for state match
- Requirement: PT-20.
- Method: screenshot
- How: A's iPad 768×1024 portrait with the Pick for button; compare with ./mockup.html `#pick-for` (the Illusionist adds it; mockup.html is not edited by the brief PR).
- Pass evidence: pixel diff under 1% against `#pick-for`; the button sits with the waiting state's parts in the mockup's order.
- Fails if: over 1% diff, or the mockup id is missing.

### EV-20 — Tapping it for a hero who cannot Guard picks a normal attack (PT-20)
- Requirement: PT-20 (Bob, 2026-11-14, adopted): a hero without a guard virtue gets a normal attack from "Pick for".
- Method: playwright
- How: C's hero has no guard virtue; A and B picked; at 30 s A taps Pick for C.
- Pass evidence: C's pick is a normal attack in the log and the result; A's iPad shows the pick summary "{C}: Attack"; the round runs.
- Fails if: C gets Guard, any other action, or no pick.

### EV-21 — No Pick for on Fight or Retreat (PT-20)
- Requirement: PT-20 (Bob, 2026-11-14, adopted): round pick only; Fight or Retreat stays first press wins (EV-05).
- Method: playwright
- How: (fake clock) 3 iPads at the Fight or Retreat choice, no one presses; advance 300 s.
- Pass evidence: no `[data-pick-for]` on any iPad; both buttons stay enabled; nothing is chosen.
- Fails if: a Pick for button shows at Fight or Retreat, or anything is chosen without a press.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — Pick survives Continue
- Requirement: DEC-675.
- Method: playwright
- How: pick, quit, Continue.
- Pass evidence: pick still ticked.
- Fails if: lost.

### EV-12 — The gear comes back closed after a restart
- Requirement: after a restart and Continue on this screen the Menu and any gear panel come back closed, the game is not paused and the toolbar is back (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: on this screen open a gear panel (Volume), restart the host, Continue.
- Pass evidence: no `[data-menu]` or `[data-panel]`; `paused: false`; every iPad shows the toolbar with "?" and the gear.
- Fails if: the Menu or panel reopens, the game stays paused, or the toolbar is missing.

### EV-19 — The offer is recomputed after Continue; picks are kept
- Requirement: DEC-675; PT-20.
- Method: playwright
- How: A and B picked, C silent, button showing; restart the host; Continue.
- Pass evidence: A's and B's picks still tick; the button is not shown at once and returns 30 s after Continue, the clock restarting at 0 (Bob, 2026-11-14, adopted; shared with C4/02 EV-19).
- Fails if: a pick is lost, the button returns early (clock resumed), or a stale button taps a hero who has picked.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.
- PT-20 (picker side): the offer is a button, not a gear item or a dialog; its words are the Copy table's `button.pick-for` ("Pick for {hero}"), taken from the ruling's "Pick for <hero>".
- The round engine, the 30 s value and the Guard default are C4/02; this brief only shows and sends the press.

## OPEN questions

- Resolved Q-C4-16 **[Bob taste call]**: Round actions on the iPads (DEC-129): all at once or in turn? Options: (a) all at once; the board ticks each hero who has picked, and the round runs when all have; (b) in turn order, one iPad at a time. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C4-11 **[Bob taste call]**: Does a battle round have a timer on the iPads? Options: (a) no timer; the round waits for every present hero; (b) 30 seconds, then a missing pick becomes a normal attack (DEC-129). Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- ANSWERED (PT-20; Loremaster, 2026-11-15, step 45): yes, a short note is wanted. Copy table `ipad.pick-for.note`: "Sets Guard, or a normal attack if they cannot Guard."
- ANSWERED (PT-20, Bob, 2026-11-14, adopted): a sat-out hero's iPad shows Pick for too, for standing heroes who have not picked (EV-13); round pick only (EV-21).
- ANSWERED (PT-20, Bob, 2026-11-14, adopted): a hero without a guard virtue gets a normal attack (EV-14, EV-20).
