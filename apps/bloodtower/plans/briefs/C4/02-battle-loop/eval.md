Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 02-battle-loop — The battle loop: horn, rounds, Fight or Retreat, one action each

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-32; survival evals last (EV-11, EV-19, EV-32).
- Amended 2026-11-18: EV-22 to EV-32 moved from F1 / 01-tomb-to-battle (#505), Bob 2026-11-18 7:12 AM ET (F1 became cards-only). Needs Bob's new approval row.

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

### Moved from F1 (#505), Bob 2026-11-18 7:12 AM ET: entry effect and terminal gate (EV-22 to EV-31)

Source: F1 / 01-tomb-to-battle eval.md (TB-01 to TB-14) and docs/audits/2026-11-12-f1-tomb-to-battle-package.md section 4. Fixtures: own-turn Tomb visit, zero corruptions unless set, no companion, guard, conditional Advantage, item or story effect unless named. Foe level and status fixed. Use direct fixture state and injected card and RNG outcomes; no new simulator. Assert no unintended normal round or card resolution, not that every RNG stream is untouched. Rules: MEC-038 .37 to .44 (the stance, then the terminal gates .43 and .44), DEC-907 (gate order: game loss, foe gone, all fallen).

### EV-22 — Bold, foe survives (moved from F1 TB-01 / EV-01)
- Requirement: DEC-607: Bold removes one head/wound before round 1, no card draw.
- Method: unit
- How: foe count 5, no pre-round ability; fresh Bold entry; stop before the first round.
- Pass evidence: count 4; exactly one cut; zero round-card reveals from Bold; no round resolved.
- Fails if: a second cut (caller and callee both apply it), a card drawn for Bold, or a round started.

### EV-23 — Bold kills the foe on entry (moved from F1 TB-02 / EV-02)
- Requirement: DEC-607, DEC-119, CB-01: a terminal entry ends the battle as won with no action UI (MEC-038 .43).
- Method: unit
- How: non-guardian room, foe count 1; fresh Bold entry; let the gate finish.
- Pass evidence: foe 0, result won, room cleared; no Fight/Retreat or hero-action prompt; no Strike, round roll or landed card; the battle reward once.
- Fails if: the battle opens Fight/Retreat or rolls a round after the foe is gone, or the reward is paid twice or not at all.

### EV-24 — Bold kills a foe that has an entry ability (moved from F1 TB-03 / EV-03)
- Requirement: DEC-907 (Gamewright ruling, 2026-11-13): a foe killed by Bold never uses its later pre-round ability.
- Method: unit
- How: foe count 1 with Ambush, and again with Fire breath; Bold.
- Pass evidence: result won before any ability runs; hero HP unchanged by the ability; the ability is not logged as used.
- Fails if: the dead foe's Ambush or Fire breath still hits or logs.

### EV-25 — On guard entry is survivable (moved from F1 TB-04 / EV-04)
- Requirement: DEC-607, DEC-650: On guard lands one next-card attack.
- Method: unit
- How: one hero 5 HP, no modifiers; stub the next card to one 2-HP hit; enter On guard; stop before the first round.
- Pass evidence: hero 3 HP; one card consumed and landed; no second entry attack from the caller; battle still active.
- Fails if: the hit lands twice (caller and callee), or no card is consumed.

### EV-26 — On guard fells the whole group (moved from F1 TB-05 / EV-05)
- Requirement: DEC-119, CB-01: all fallen ends the battle before any action UI (MEC-038 .43).
- Method: unit
- How: one hero 1 HP, no corruptions, no companion; stub the entry card to a 2-HP hit; enter On guard; let the close finish.
- Pass evidence: one fall and one corruption; no action picker or round; closes fallen; hero restored to 1 HP; room uncleared, foe stays; no retreat last attack; the gold penalty once.
- Fails if: a round card or Fight/Retreat appears, a second last attack runs, or the room clears.

### EV-27 — A pre-round ability fells the group (moved from F1 TB-06 / EV-06)
- Requirement: DEC-553, DEC-119: the gate runs after a before-round-1 ability (MEC-038 .44).
- Method: unit
- How: one hero 1 HP, no corruptions, no companion; Dragon; Bold leaves the foe alive.
- Pass evidence: one cut, then Fire breath once; all-fallen gate before any action UI; fallen close; room uncleared.
- Fails if: action UI opens after the ability, or the ability runs twice.

### EV-28 — An entry fall that is the third corruption (moved from F1 TB-07 / EV-07)
- Requirement: DEC-676, DEC-905, DEC-907: the game loss comes first.
- Method: unit
- How: one hero at 2 corruptions, own-turn Tomb entry, lethal entry damage, no companion.
- Pass evidence: the existing game-loss unwind, once; no round, reward, other group turn or second corruption; outcome recorded through the existing loss path.
- Fails if: the battle closes as ordinary fallen, a reward or round runs, or the corruption counts twice.

### EV-29 — Partial entry fall (moved from F1 TB-08 / EV-08)
- Requirement: DEC-119: a fallen hero sits out and returns at battle end.
- Method: unit
- How: two heroes, 1 HP and 5 HP; one 2-HP entry hit on the first; On guard.
- Pass evidence: first sits out with one corruption; second stands; the battle continues with only the standing hero eligible; the fallen hero is not targeted again; restored at battle end.
- Fails if: the fallen hero acts or is hit again, or the battle ends early.

### EV-30 — Continue after an applied Bold cut (moved from F1 TB-12 / EV-12)
- Requirement: DEC-675, DEC-682: Continue is not a new entry.
- Method: unit
- How: save after the one cut (count 4, any pending ability in the save); restore; resume the next node.
- Pass evidence: no second cut or entry cue or ability replay; count unchanged except a genuinely pending future effect; stream and deck position kept.
- Fails if: restore cuts again or replays the entry cue.

### EV-31 — Continue after an On guard attack (moved from F1 TB-13 / EV-13)
- Requirement: DEC-675, LC-04 (intended behaviour, not crash-atomicity).
- Method: unit
- How: save after the entry card landed (hero 3 HP, card consumed); restore.
- Pass evidence: no duplicate card, damage or corruption; deck consumption kept; only the pending node runs.
- Fails if: the card is drawn again or damage repeats.

## Survival evals (one per survival invariant in plan.md)

### EV-32 — Continue and restore keep the entry effect (moved from F1 EV-16, Bob 2026-11-18 7:12 AM ET)
- Requirement: the F1 survival invariant on saved battles: a restore never repeats an entry effect (DEC-675).
- Method: unit
- How: save and restore at four points (after the cut, after the On guard attack, after a retreat, after a fall); resume; compare the state with an uninterrupted run. The Tomb room flag part of this check is EV-18 in C4 / 06.
- Pass evidence: counts, HP, corruptions, card and deck position equal the uninterrupted run; no entry effect is logged twice.
- Fails if: a restore repeats an entry effect.

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
