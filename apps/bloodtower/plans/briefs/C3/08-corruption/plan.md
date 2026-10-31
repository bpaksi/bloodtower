Keep this a checklist; do not write a second design doc.

# Brief: C3 / 08-corruption — Corruption: gaining it, its 1.0 effects, the third one loses

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 08-corruption
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, MEC-080
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no screen change)
- Risk: High
- Depends on: C3 feature 06 merged, C3 feature 07 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/rules/corruption/**` (new), `apps/bloodtower/src/engine/loops/{day,group-turn,encounter}/**` (hook calls only)
- Builds: MEC-080, DEC-676, DEC-684, DEC-468, DEC-470 to DEC-477 (the 1.0 set less DEC-467, DEC-469)
- Deps change: no
- Runs: cloud

## What it does

A hero's corruptions (MEC-080): gained from a scene cost (DEC-693) and, from C4, from battle; removed one at a time by the sanctuary (feature 06). Each takes the shift on its group's move roll through the most corrupted hero (DEC-684). The third corruption loses the game at once wherever it lands, stopping the open loops (DEC-676). The named corruptions Bob accepted for 1.0 apply their effects: Uncertain, Cruel, Greedy, Feral, Lost, Feeble, Feverish, Selfish, Tempted (DEC-468, DEC-470 to DEC-477); Cursed (DEC-466) is battle-only and lands in C4. DEC-467 and DEC-469 are 1.1 (DEC-718).

C3 numbers (Gamewright proposal, pending Bob), from tuning: Cruel, Greedy and Feral cost 2 gold each on their trigger; Lost costs 1 gold; Tempted adds +2 gold to each buy the holder's group makes. The named corruption comes from a seeded draw over the C3 set (Uncertain, Cruel, Greedy, Feral, Lost, Feeble, Feverish, Selfish, Tempted), never one the hero already holds (Q-C3-15, Q-C3-16).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - Each hero's corruptions, and which named ones they are, survive Continue (EV-07) and a host restart (EV-10).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-10 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] MEC-080: closed before coding (`decided`).
- [ ] DEC-019: closed before coding (`decided`).
- [ ] DEC-466: closed before coding (`decided`).
- [ ] DEC-468: closed before coding (`decided`).
- [ ] DEC-470: closed before coding (`decided`).
- [ ] DEC-471: closed before coding (`decided`).
- [ ] DEC-472: closed before coding (`decided`).
- [ ] DEC-473: closed before coding (`decided`).
- [ ] DEC-474: closed before coding (`decided`).
- [ ] DEC-475: closed before coding (`decided`).
- [ ] DEC-476: closed before coding (`decided`).
- [ ] DEC-477: closed before coding (`decided`).
- [ ] DEC-676: closed before coding (`decided`).
- [ ] DEC-684: closed before coding (`decided`).
- [ ] DEC-718: closed before coding (`decided`).
- [ ] DEC-043: closed before coding (`decided`).
- [ ] DEC-170: closed before coding (`decided`).

## OPEN questions

- Q-C3-15: how is the named corruption picked when a hero takes one: a seeded draw from the 1.0 set, the story's choice (MEC-059), or the group's? And can a hero draw the same one twice? Gamewright proposal, pending Bob: seeded draw from the C3 set, no repeats per hero.
- Q-C3-16: the gold amounts for Cruel, Greedy, Feral, Lost and Tempted are not in DEC-703's table. Which numbers? Gamewright proposal, pending Bob: Cruel/Greedy/Feral 2, Lost 1, Tempted +2 per buy.

## Eval approval

- See ./approval.md (must be filled before coding).
