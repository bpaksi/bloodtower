Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 02-battle-loop — The battle loop: horn, rounds, Fight or Retreat, one action each

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-11; survival evals last (EV-11).

## Checks

### EV-01 — Rounds follow MEC-038's order
- Requirement: MEC-038.
- Method: unit
- How: fixed seed, 2 heroes vs level-2 foe.
- Pass evidence: ordered log events: `battle.abilities`, `battle.stance`, `round.choice`, `round.actions`, `round.spells`, `round.card`, `round.result`.
- Fails if: any step out of order.

### EV-02 — Round cards never repeat before 8
- Requirement: DEC-649.
- Method: unit
- How: run 8 rounds.
- Pass evidence: 8 distinct cards, then a reshuffle.
- Fails if: a repeat in 8.

### EV-03 — A spell kill ends the round
- Requirement: DEC-643.
- Method: unit
- How: foe at 1 wound, a damage spell.
- Pass evidence: battle ends before the card draw.
- Fails if: card drawn.

### EV-04 — A hero at 0 sits out with a corruption
- Requirement: DEC-119.
- Method: unit
- How: hit a hero at 1 HP.
- Pass evidence: hero out of later rounds, one corruption gained.
- Fails if: still acts.

### EV-05 — No timer (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Amended 2026-11-14 (PT-20))
- Requirement: Q-C4-11; PT-20 adds an offer after 30 s (EV-12), never an automatic pick.
- Method: unit
- How: one hero never picks.
- Pass evidence: round waits; no auto action; any "Pick for" offer is only an offer until an iPad presses it (EV-14).
- Fails if: auto attack, or any pick made without a press.

### EV-06 — Headless battles finish
- Requirement: MEC-038.
- Method: unit
- How: (sim) 1,000 seeded battles.
- Pass evidence: every battle exits won, retreated or fallen; no hang.
- Fails if: a hang or crash.

### EV-07 — Foe abilities fire before round 1
- Requirement: DEC-553.
- Method: unit
- How: fixture foe with a start ability (−1 HP to each present hero).
- Pass evidence: each present hero −1 HP and log `battle.abilities` before the first `round.choice`.
- Fails if: the ability fires in round 1 or not at all.

### EV-08 — Bold and on guard apply before round 1
- Requirement: DEC-607.
- Method: unit
- How: enter bold; then a second run entered on guard.
- Pass evidence: bold: +1 strength in round 1 only; on guard: a lost round 1 hits no one.
- Fails if: either applies after round 1 or in every round.

### EV-09 — Retreat by the group ends the battle
- Requirement: DEC-118.
- Method: unit
- How: the group picks Retreat in round 2.
- Pass evidence: battle ends `retreated` with no `round.actions` in round 2; foe wounds kept.
- Fails if: actions are asked or the foe resets.

### EV-10 — A won round cuts, a lost round hits
- Requirement: MEC-024 step 5, DEC-703, DEC-563.
- Method: unit
- How: a level-2 foe, 1 hero present (8 wounds); seed with round 1 won at round strength 3 and round 2 lost; heroes at full.
- Pass evidence: after round 1 the foe has 6 wounds (cut = half of 3 rounded up = 2, at least 2); after round 2 exactly one present hero has lost 2 HP, the foe's level (0 if a guard virtue was used).
- Fails if: a won round hits a hero, or a lost round cuts the foe.

### EV-12 — A seat silent for 30 s draws "Pick for <hero>" on the other iPads (PT-20)
- Requirement: PT-20 (Bob, 2026-11-14, adopted): a seat silent for 30 s in battle gives the other iPads of the acting group, the iPads of sat-out heroes included, "Pick for <hero>", only for standing heroes who have not picked.
- Method: unit
- How: (fake clock) 4 heroes in the acting group: A, B, C standing, D sat out at 0 HP (D's iPad still in the group); A and B pick; C does not. Read the offers at 29.9 s and at 30.0 s after the action step opened.
- Pass evidence: at 29.9 s no `pick-for` offer exists; at 30.0 s an offer for hero C is on the iPads of A, B and D and not on C's iPad, and no offer exists for A, B or D; the waiting line still names C.
- Fails if: the offer shows early, shows on C's own iPad, is missing from the sat-out hero's iPad, is made for a hero who picked or sits out, names the wrong hero, or never shows.

### EV-13 — Pressing it sets Guard, and the round goes on (PT-20)
- Requirement: PT-20 (Bob, 2026-11-14, adopted): "Pick for <hero>" sets Guard if hero C can Guard (DEC-129's guard action); a hero who cannot Guard gets a normal attack (EV-20).
- Method: unit
- How: C has a guard virtue. After EV-12's offer, A's iPad presses `pick-for` C; then B's iPad presses it a moment later.
- Pass evidence: C's pick is Guard, logged with the pressing iPad and the hero it was for; A's press wins (first press, DEC-019) and B's changes nothing and logs nothing; the round then runs with all picks (`round.actions`).
- Fails if: C's pick is a normal attack or any other action though C can Guard, two picks are logged, or the round stays waiting.

### EV-14 — Nothing is picked without a press (Q-C4-11 kept)
- Requirement: Q-C4-11 (no timer on the round) as amended by PT-20: the 30 s draws an offer only.
- Method: unit
- How: (fake clock) hero C silent; advance the clock 300 s with no press.
- Pass evidence: the offer shows from 30 s; C's pick stays empty; no `round.actions`; no hero is hit.
- Fails if: C is auto-picked, or the round resolves.

### EV-15 — The 30 s is a tuning value, not a constant
- Requirement: PT-20: 30 s is a tuning placeholder in the tuning file.
- Method: unit
- How: load a test copy of the tuning file with the silent-seat value set to 10 s (key under `battle:`, name chosen in the PR and listed in `packs/base/tuning.yaml`); repeat EV-12.
- Pass evidence: the offer shows at 10 s and not at 9.9 s; the base file carries 30 with a placeholder comment; the engine holds no literal 30 for this.
- Fails if: the offer stays at 30 s, or the number is hard-coded.

### EV-16 — The silence clock only runs for a hero who can answer, and stops on a pause
- Requirement: PT-20; DEC-154 (a dropped iPad pauses the game); DEC-119 (a fallen hero sits out).
- Method: unit
- How: (a) C picks at 20 s; (b) a hero at 0 HP sits out; (c) pause the game at 25 s for 60 s and resume.
- Pass evidence: (a) no offer is ever made for C; (b) no offer is made for the sat-out hero (its own iPad still shows offers for others, EV-12); (c) the offer shows 5 s after the resume, not at 30 s of wall time.
- Fails if: an offer is made for a hero who picked or sits out, or paused time counts.

### EV-17 — The hero's own pick cancels the offer
- Requirement: PT-20: the offer is for a silent seat.
- Method: unit
- How: offer showing for C; C picks Attack before anyone presses.
- Pass evidence: the offer is withdrawn on the other iPads; C's pick is Attack; a late press on the old offer does nothing.
- Fails if: Guard overwrites C's Attack, or the offer stays.

### EV-18 — Pick for sends nothing to the tower
- Requirement: tower safety (root CLAUDE.md): nothing physical happens on its own.
- Method: unit
- How: repeat EV-12 and EV-13 with the mock tower recording commands.
- Pass evidence: no tower command is sent by the offer or by its press beyond what a Guard pick already sends.
- Fails if: the offer or the silence triggers any tower command.

### EV-20 — "Pick for" a hero who cannot Guard sets a normal attack (PT-20)
- Requirement: PT-20 (Bob, 2026-11-14, adopted): "Pick for <hero>" sets Guard if the hero can Guard, otherwise a normal attack (DEC-129's no-pick default). Q-C4-11 (a) "no round timer" stands; the 30 s offer never picks automatically.
- Method: unit
- How: (fake clock) heroes A (guard virtue) and C (no guard virtue) silent, B picked; at 30 s A's iPad is not offered its own hero; B's iPad presses `pick-for` C, then `pick-for` A.
- Pass evidence: C's pick is a normal attack and A's pick is Guard, each logged with the pressing iPad and the hero it was for; neither is any other action.
- Fails if: C gets Guard, A gets a normal attack, or either gets a pick the hero's cards do not allow.

### EV-21 — The offer is for the round pick only (PT-20)
- Requirement: PT-20 (Bob, 2026-11-14, adopted): round pick only; Fight or Retreat is already first press wins (DEC-019).
- Method: unit
- How: (fake clock) the group's Fight or Retreat is unanswered for 300 s.
- Pass evidence: no `pick-for` offer exists on any iPad and nothing is picked; the first Fight or Retreat press from any iPad still decides it.
- Fails if: a `pick-for` offer shows for Fight or Retreat, or anything is chosen without a press.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — Continue resumes mid-round
- Requirement: DEC-675.
- Method: playwright
- How: quit after 1 of 2 picks; Continue.
- Pass evidence: same round, foe wounds, the 1 pick kept.
- Fails if: restart or lost pick.

### EV-19 — Continue during the wait keeps the picks and shows no stale offer
- Requirement: DEC-675; PT-20.
- Method: playwright
- How: A and B picked, C silent; quit at 20 s; restart; Continue.
- Pass evidence: A's and B's picks are kept; no offer shows at once; the silence clock restarts at 0 on Continue (Bob, 2026-11-14, adopted), so the offer shows 30 s after Continue, not at 10 s.
- Fails if: a pick is lost, an offer shows immediately, the clock resumes at 20 s, or the offer never returns.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.
- PT-20 applies to each hero's action pick (MEC-038 .6 and .7), not to the group's Fight or Retreat, which any iPad can answer.
- The silence clock restarts at 0 on Continue (Bob, 2026-11-14, adopted; EV-19).
- EV-05 is edited in place: it still proves no auto pick; it now also allows the PT-20 offer.

## OPEN questions

- Resolved Q-C4-11 **[Bob taste call]**: Does a battle round have a timer on the iPads? Options: (a) no timer; the round waits for every present hero; (b) 30 seconds, then a missing pick becomes a normal attack (DEC-129). Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- ANSWERED (PT-20, Bob, 2026-11-14, adopted): "Pick for <hero>" sets Guard if the hero can Guard, otherwise a normal attack (DEC-129's no-pick default); EV-13, EV-20.
- ANSWERED (PT-20, Bob, 2026-11-14, adopted): any iPad of the acting group shows the offer, sat-out heroes' iPads included, only for standing heroes who have not picked; round pick only (EV-12, EV-21).
- ANSWERED (PT-20, Bob, 2026-11-14, adopted): the tuning key name for the 30 s is left to the PR (e.g. under the battle tuning block).
- Amended 2026-11-14 note on Q-C4-11: (a) no timer on the round stands; PT-20 adds an offer after 30 s, never an automatic pick.
