# P-04 Encampment: trade, and the camp turning on you

**Status: awaiting Bob's play-through.** Everything below is the simulation only; nothing here is final until Bob has played `/p/camp`.

**Question:** does the camp's temper make haggling a real choice? (MEC-028, DEC-091, DEC-084, DEC-101)

## What was built

- `/p/camp`: one visit as a scene. Four wares; Buy, Haggle hard, Refuse, Steal per ware; a temper meter; a placeholder fight at full temper; one Humanoid Advantage that calms the camp once.
- The haggle die is entered by hand (1 to 6) or filled by "Roll for me" (seeded).
- Rules are in `game.ts` (pure), shared by the page and the simulation.

## Simulation (1,000 seeded visits per policy, seed "1", default tuning)

Wares list at 36 in all (10 + 6 + 8 + 12). Money saved is per visit. Policies ignore Refuse and Steal.

| Policy | Money saved | Visits where the camp attacks |
|---|---|---|
| haggle-always (no Advantage) | 5.95 | 11.9% |
| haggle-never | 0.00 | 0.0% |
| haggle-once | 1.49 | 0.0% |
| haggle-always (Advantage held, spent when the next haggle would reach full temper) | 6.05 | 0.0% |

Reading (to confirm in play): with these numbers haggling pays little (about 16% off) and costs a one-in-eight chance of a fight, so it is a modest risk; the Advantage removes that risk. An earlier default of temper 4 made haggle-always attack 100% of visits, which is not a choice at all, so the default is 6.

## Tuning values at the end (defaults, unchanged until Bob plays)

Purse 40; wares Healing draught 10, Rope 6, Lantern oil 8, Antidote 12; die discounts 0,1,1,2,2,3; full temper 6; haggle +1 (+1 more on a 1); refuse +1; steal +2, 40% caught (caught = full temper); Advantage removes 2; party Might 3 vs camp strength 6 (Might + 1d6); a lost fight costs 15 from the purse.

## Cards to update after the play-through

- MEC-028: the temper steps and what refusing and stealing add.
- DEC-091: what each die face takes off.
- Placeholder fight (MEC-024) outcome on the purse.

## Not verified

Feel, tension and whether theft is too strong (not simulated). Bob's notes go here.
