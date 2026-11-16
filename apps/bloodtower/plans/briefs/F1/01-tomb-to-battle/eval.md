# Evals: F1 / 01-tomb-to-battle — One entry effect, terminal entries end the battle, retreat keeps the room uncleared

- Brief: ./plan.md
- Mockup: none
- Risk: High (battle, fall and game-loss state; restore). Negative and restore evals are included.

All Tomb fixtures: own-turn Tomb visit, zero corruptions unless set, no companion, guard, conditional Advantage, item or story effect unless named. Foe level and status fixed; status draw forced no-step where a count is asserted. Use direct fixture state and injected card and RNG outcomes; no new simulator. Assert no unintended normal round or card resolution, not that every RNG stream is untouched. Rewards are release-appropriate (no gear, potion or treasure deck loot in 1.0). Source of the cases: docs/audits/2026-11-12-f1-tomb-to-battle-package.md section 4.

## Checks

### EV-01 — Bold, foe survives (TB-01)
- Requirement: DEC-607: Bold removes one head/wound before round 1, no card draw.
- Method: unit
- How: unit test `TB-01` in the battle tests (Anvil names the file). Fixture: Tomb room, foe count 5, no pre-round ability; fresh Bold entry; stop before the first round.
- Pass evidence: Count 4; exactly one cut; zero round-card reveals from Bold; no round resolved.
- Fails if: A second cut (caller and callee both apply it), a card drawn for Bold, or a round started.

### EV-02 — Bold kills the foe on entry (TB-02)
- Requirement: DEC-607, DEC-119, CB-01: a terminal entry ends the battle as won with no action UI.
- Method: unit
- How: unit test `TB-02` in the battle tests (Anvil names the file). Fixture: Non-guardian room, foe count 1; fresh Bold entry; let the gate finish.
- Pass evidence: Foe 0, result won, room cleared; no Fight/Retreat or hero-action prompt; no Strike, round roll or landed card; the battle reward once.
- Fails if: The battle opens Fight/Retreat or rolls a round after the foe is gone, or the reward is paid twice or not at all.

### EV-03 — Bold kills a foe that has an entry ability (TB-03)
- Requirement: DEC-907 (Gamewright ruling, 2026-11-13): a foe killed by Bold never uses its later pre-round ability.
- Method: unit
- How: unit test `TB-03` in the battle tests (Anvil names the file). Fixture: Foe count 1 with Ambush, and again with Fire breath; Bold.
- Pass evidence: Result won before any ability runs; hero HP unchanged by the ability; the ability is not logged as used.
- Fails if: The dead foe's Ambush or Fire breath still hits or logs.

### EV-04 — On guard entry is survivable (TB-04)
- Requirement: DEC-607, DEC-650: On guard lands one next-card attack.
- Method: unit
- How: unit test `TB-04` in the battle tests (Anvil names the file). Fixture: One hero 5 HP, no modifiers; stub the next card to one 2-HP hit; enter On guard; stop before the first round.
- Pass evidence: Hero 3 HP; one card consumed and landed; no second entry attack from the caller; battle still active.
- Fails if: The hit lands twice (caller and callee), or no card is consumed.

### EV-05 — On guard fells the whole group (TB-05)
- Requirement: DEC-119, CB-01: all fallen ends the battle before any action UI.
- Method: unit
- How: unit test `TB-05` in the battle tests (Anvil names the file). Fixture: One hero 1 HP, no corruptions, no companion; stub entry card to a 2-HP hit; enter On guard; let the close finish.
- Pass evidence: One fall and one corruption; no action picker or round; closes fallen; hero restored to 1 HP; room uncleared, foe stays; no retreat last attack; the gold penalty once.
- Fails if: A round card or Fight/Retreat appears, a second last attack runs, or the room clears.

### EV-06 — A pre-round ability fells the group (TB-06)
- Requirement: DEC-553, DEC-119: the gate runs after a before-round-1 ability.
- Method: unit
- How: unit test `TB-06` in the battle tests (Anvil names the file). Fixture: One hero 1 HP, no corruptions, no companion; Dragon; Bold leaves the foe alive.
- Pass evidence: One cut, then Fire breath once; all-fallen gate before any action UI; fallen close; room uncleared.
- Fails if: Action UI opens after the ability, or the ability runs twice.

### EV-07 — An entry fall that is the third corruption (TB-07)
- Requirement: DEC-676, DEC-905, DEC-907: the game loss comes first.
- Method: unit
- How: unit test `TB-07` in the battle tests (Anvil names the file). Fixture: One hero at 2 corruptions, own-turn Tomb entry, lethal entry damage, no companion.
- Pass evidence: The existing game-loss unwind, once; no round, reward, other group turn or second corruption; outcome recorded through the existing loss path.
- Fails if: The battle closes as ordinary fallen, a reward or round runs, or the corruption counts twice.

### EV-08 — Partial entry fall (TB-08)
- Requirement: DEC-119: a fallen hero sits out and returns at battle end.
- Method: unit
- How: unit test `TB-08` in the battle tests (Anvil names the file). Fixture: Two heroes, 1 HP and 5 HP; one 2-HP entry hit on the first; On guard.
- Pass evidence: First sits out with one corruption; second stands; the battle continues with only the standing hero eligible; the fallen hero is not targeted again; restored at battle end.
- Fails if: The fallen hero acts or is hit again, or the battle ends early.

### EV-09 — Retreat keeps the room uncleared (TB-09)
- Requirement: DEC-497, DEC-651, QD-01: a living foe stays, count kept, no board token, no move cost.
- Method: unit
- How: unit test `TB-09` in the battle tests (Anvil names the file). Fixture: Living foe, count 7; forced retreat status draw no-step; a last-attack fixture that changes nothing; retreat and return to the Tomb.
- Pass evidence: Room uncleared; count 7; no external foe token; Tomb result left; group stays on the Tomb space; no move spent.
- Fails if: The room clears, the count resets or drops, or a move is charged.

### EV-10 — Another group meets the same foe (TB-10)
- Requirement: DEC-151, DEC-602, DEC-651, DEC-682: same room and foe, one fresh Bold cut.
- Method: unit
- How: unit test `TB-10` in the battle tests (Anvil names the file). Fixture: Continue from the TB-09 save; second group of the same size; same level and status; new genuine visit with Bold.
- Pass evidence: Same room and foe identity (not regenerated); one cut 7 to 6; room not pre-cleared.
- Fails if: The foe is refilled or regenerated, or the room starts cleared.

### EV-11 — Retreat's last attack fells everyone (TB-11)
- Requirement: DEC-671, DEC-497, QD-01.
- Method: unit
- How: unit test `TB-11` in the battle tests (Anvil names the file). Fixture: Standing foe, one hero 1 HP, no corruption or companion; lethal retreat card; forced status no-step.
- Pass evidence: Classified fallen and outside the Tomb; the foe stays, room uncleared; fall penalties once; no second last attack on return through the caller.
- Fails if: A second last attack, a cleared room, or penalties twice.

### EV-12 — Continue after an applied Bold cut (TB-12)
- Requirement: DEC-675, DEC-682: Continue is not a new entry.
- Method: unit
- How: unit test `TB-12` in the battle tests (Anvil names the file). Fixture: Save after the one cut (count 4, any pending ability in the save); restore; resume the next node.
- Pass evidence: No second cut or entry cue or ability replay; count unchanged except a genuinely pending future effect; stream and deck position kept.
- Fails if: Restore cuts again or replays the entry cue.

### EV-13 — Continue after an On guard attack (TB-13)
- Requirement: DEC-675, LC-04 (intended behaviour, not crash-atomicity).
- Method: unit
- How: unit test `TB-13` in the battle tests (Anvil names the file). Fixture: Save after the entry card landed (hero 3 HP, card consumed); restore.
- Pass evidence: No duplicate card, damage or corruption; deck consumption kept; only the pending node runs.
- Fails if: The card is drawn again or damage repeats.

### EV-14 — Leave, and a guardian falling to Bold (TB-14)
- Requirement: DEC-490, DEC-491, DEC-494, DEC-821, QD-01.
- Method: unit
- How: unit test `TB-14` in the battle tests (Anvil names the file). Fixture: A: Leave before opening the next room. B: the guardian falls to entry Bold in a safe fixture.
- Pass evidence: A: exits with no room, foe or reward change. B: guardian cleared, Tomb done, battle close once; only the quest wrapper pays the quest reward.
- Fails if: Leave clears a room or pays out, or the battle reward and quest reward double up.

### EV-15 — Entry, retreat and re-entry end to end (R01 minus EE-01)
- Requirement: R01: exactly one stance effect, no actions after a terminal entry, a retreat leaves the room uncleared. The quest turn-end clause of R01 is EE-01 and is out of scope.
- Method: playwright
- How: one spec under `apps/bloodtower/src/e2e/tests/` with seeded state. (a) Bold into a count-1 foe: the page goes straight to the won result with no Fight/Retreat buttons. (b) On guard into a 1-HP hero: straight to the fallen result with no action buttons. (c) A count-7 foe, Retreat, back at the Tomb: the room shows uncleared, then a second visit with Bold shows count 6. (d) Reload mid-battle after the cut and Continue: the count does not drop again.
- Pass evidence: each state is reached with the named buttons absent or present as stated; the counts are 0, 7 and 6 as stated; the reload leaves the count unchanged.
- Fails if: any action control shows after a terminal entry, the room clears on retreat, or Continue cuts again.

## Survival evals (one per survival invariant in plan.md)

### EV-16 — Continue and restore keep the entry and the room
- Requirement: the survival invariants on saved battles and uncleared rooms.
- Method: unit
- How: save and restore at four points (after the cut, after the On guard attack, after a retreat, after a fall); resume; compare the state with an uninterrupted run.
- Pass evidence: counts, HP, corruptions, room flag, card and deck position equal the uninterrupted run; no entry effect is logged twice.
- Fails if: a restore repeats an entry effect or loses an uncleared room.

### EV-17 — Loss, reward and penalty happen once
- Requirement: DEC-676 and DEC-905 (one game-loss unwind), DEC-119 and DEC-120 (battle close once), quest wrapper owns the quest reward.
- Method: unit
- How: run TB-02, TB-05, TB-07 and TB-14 B with a counter on the game-loss exit, the battle-end hook, the battle reward and the fall penalty.
- Pass evidence: each counter is exactly 1 where it applies and 0 elsewhere (game loss only in TB-07; no battle reward in TB-05 or TB-07).
- Fails if: any counter is 2, or a loss and a normal close both fire.

## Assumptions surfaced
- The gate order game loss, foe gone, all fallen → DEC-907 (Gamewright, 2026-11-13).
- TB-03 is a ruling, not only a reading of card order → DEC-907.
- Same-size groups for TB-10; different-size foe rescaling is unresolved and out of scope → D-series, not this brief.
- TB-13 states intended behaviour only; it does not prove crash-safe physical state (LC-04).
- If the code already conforms, EV-01 to EV-17 land as tests with no code change.
