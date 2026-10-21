# P-05 Fortress: the duel ladder - findings

**Status: awaiting Bob's play-through.** Everything below is the simulation only; the "felt like a grind" side is Bob's to record.

Question: how many rungs, and how steep, before the ladder feels like a grind? Cards: MEC-029, DEC-084, DEC-101 (Might).

## How it plays
Page `/p/fortress`. A visit is a scene of up to N duels against the champion on the party's rung. A duel is party dice + Might vs champion dice + strength (ties to the champion). A win climbs a rung; a loss drops `lossDrop` rungs (MEC-029: one) and ends the visit; "Next visit" starts the next. Beating the top rung finishes the fortress. A held Melee Advantage, armed before a duel, adds the softening bonus to that one duel.

## Tuning values at the end (all invented except where a card says)
```json
{ "rungs": 5, "baseStrength": 1, "stepStrength": 1, "partyDice": "1d6", "championDice": "1d6",
  "partyWinsTies": false, "duelsPerVisit": 2, "lossDrop": 1, "advantages": 1, "soften": 3,
  "simRuns": 1000, "visitCap": 200 }
```

## Simulation (seed "1", 1,000 runs per Might, visits to top the ladder, cap 200)
The sim spends the Advantage on the first duel at or above the middle rung. "Mean" is over runs that topped the ladder; "capped" runs did not by 200 visits (so the mean understates the grind where capped is high).

| Might | Mean visits | Within 5 visits | Capped |
|---|---|---|---|
| 1 | 86.8 | 0% | 98.3% |
| 2 | 91.5 | 1.2% | 73.8% |
| 3 | 64.4 | 4.3% | 7.9% |
| 4 | 19.5 | 19.0% | 0.1% |
| 5 | 8.0 | 44.2% | 0% |
| 6 | 5.0 | 72.0% | 0% |

Variants (same seed, mean visits, Might 3 / 4 / 5 / 6): without the Advantage 66.2 / 20.9 / 8.6 / 5.3; 3 duels per visit 58.5 / 16.4 / 6.4 / 3.8; steeper (+2 per rung) is unreachable below Might 5 (capped 100%); 10 rungs is capped at 99% even for Might 6.

## What the numbers say
- The ladder is a cliff, not a slope: with a drop of one rung per loss and a 50/50-ish duel, the walk stalls once champion strength passes the party's Might. A party two Might short effectively never finishes.
- The Advantage barely matters (about 1 visit saved at Might 4+). To be felt, "softens" would need to be much bigger or come back.
- Rung count and steepness matter far more than the Advantage: 10 rungs or +2 per rung is a grind at every Might in 1-6.
- Proposal to test in play: 5 rungs, champion strength about Might-1 to Might+2 across the ladder, 2-3 duels per visit.

## Card IDs to update after the play-through
MEC-029 (rungs, steepness, duels per visit), DEC-101 (the Might scale needs a range), MEC-024 (how a duel is decided; here a placeholder).

## Bob's play-through
(not yet played)
