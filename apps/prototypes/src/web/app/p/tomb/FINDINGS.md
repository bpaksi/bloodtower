# P-02 Tomb: the dungeon crawl — findings

**Status: awaiting Bob's play-through.** Everything below the play-through section is from the simulation only. Page: `/p/tomb`.

Question: does "deeper or leave" make a tense scene in about 5-10 minutes?

## Built

- A scene (DEC-084): rooms revealed one at a time, each costing hit points, money and corruption (DEC-039). Cleared rooms stay cleared; the last room is the target room (The Final Guardian) and finishes the tomb; the party may leave at any doorway (MEC-026).
- One Undead Advantage held by default softens one room (cuts every cost by the "soften" share).
- The 12 RtDT tomb rooms (names and flavour). The printed warrior/spirit costs were re-costed by guess in HP / money / corruption.
- A money cost the party cannot pay is paid in hit points (invented rule). Corruption is only tracked; it has no effect yet.
- Pure rules in `game.ts`, shared by the page and the simulation.

## Tuning values used (defaults; copy from the panel to change)

`hp` 24, `money` 8, `advantages` 1, `soften` 0.5, `depth` 5 (rooms to clear, incl. the target), `moneyScale` 1, `corruptionScale` 1, per-room HP costs as in `game.ts` (Ossuary 8 ... Final Guardian 6), simulation policy `leaveBelow` 8, `advantageMinHp` 5.

## Simulation (seed "1", 1000 runs, defaults, policy "leave when HP below X")

Awaiting Bob's play-through: the numbers show the shape only; they say nothing about whether it feels tense.

| Leave below | Finish | Leave | 0 HP | Rooms entered per run |
|---|---|---|---|---|
| 0 (never leave) | 90.2% | 0% | 9.8% | 5.00 |
| 6 | 90.2% | 5.4% | 4.4% | 4.95 |
| 8 (default) | 82.1% | 17.9% | 0% | 4.82 |
| 10 | 59.9% | 40.1% | 0% | 4.57 |
| 12 | 31.3% | 68.7% | 0% | 4.16 |
| 14 | 2.8% | 97.2% | 0% | 3.66 |

Read: at these defaults the tomb is easy (90% finish with no leaving), so the leave decision only bites if the player is cautious. Tension needs costs near the party's HP: try lower `hp`, a deeper `depth`, or higher room costs.

## To fill in after the play-through

- Time taken: 
- Felt tense (yes/no, why): 
- Values ended with (paste JSON): 
- Card IDs to update: MEC-026, DEC-039 (re-costed rooms), and a card for the "money shortfall paid in HP" rule if kept.
