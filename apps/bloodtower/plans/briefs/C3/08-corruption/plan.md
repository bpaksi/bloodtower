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
- Touches: `apps/bloodtower/src/engine/rules/corruption/**` (new), `apps/bloodtower/src/engine/loops/{day,group-turn,encounter}/**` (hook calls only; retained in full).
- Touches repair: **PROPOSED / UNRESOLVED** as an implementation path contract; exact mechanical additions and evidence in [gate-correction.md](./gate-correction.md). No broader behavior or compatibility approval is implied.
- Correction basis (Wright relay, 2026-11-08 America/Detroit): Bob's Nov 1 rule permits small tweaks to an already approved plan without new review. This repair is limited to the tuning/schema/loader-test files EV-05 already needs and quest/scene hook seams EV-01 already needs. Source eval approval remains [approval.md](./approval.md); no eval or amount changes. New semantic choices remain unresolved.
- Builds: MEC-080, DEC-676, DEC-684, DEC-468, DEC-470 to DEC-477 (the 1.0 set less DEC-467, DEC-469)
- Deps change: no
- Runs: cloud

## What it does

A hero's corruptions (MEC-080): gained from a scene cost (DEC-693) and, from C4, from battle; removed one at a time by the sanctuary (feature 06). Each takes the shift on its group's move roll through the most corrupted hero (DEC-684). The third corruption loses the game at once wherever it lands, stopping the open loops (DEC-676). The named corruptions Bob accepted for 1.0 apply their effects: Uncertain, Cruel, Greedy, Feral, Lost, Feeble, Feverish, Selfish, Tempted (DEC-468, DEC-470 to DEC-477); Cursed (DEC-466) is battle-only and lands in C4. DEC-467 and DEC-469 are 1.1 (DEC-718).

C3 numbers (Bob approved 2026-10-31), from tuning: Cruel, Greedy and Feral cost 2 gold each on their trigger; Lost costs 1 gold; Tempted adds +2 gold to each buy the holder's group makes. The named corruption comes from a seeded draw over the C3 set (Uncertain, Cruel, Greedy, Feral, Lost, Feeble, Feverish, Selfish, Tempted), never one the hero already holds (Q-C3-15, Q-C3-16).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - Each hero's corruptions, and which named ones they are, survive Continue (EV-09) and a host restart (EV-10).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-10 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [x] [MEC-080](../../../../../../research/game-design/cards/MEC-080.md): closed: named corruptions and hero state; card lines 36–40; Q-C3-15 in this brief fixes the C3 draw.
- [x] [DEC-019](../../../../../../research/game-design/cards/DEC-019.md): closed: present heroes agree on event options; card line 11. Does not invent a new giving action.
- [x] [DEC-466](../../../../../../research/game-design/cards/DEC-466.md): deferred to C4, owner Wright: battle-only Cursed, card lines 18–21; C3 exclusion is already locked in eval EV-08 / Assumptions surfaced.
- [x] [DEC-468](../../../../../../research/game-design/cards/DEC-468.md): closed: building pick ends the holder's group turn, card lines 19–21.
- [x] [DEC-470](../../../../../../research/game-design/cards/DEC-470.md): closed: village-pick trigger, card lines 19–21; −2 from approved Q-C3-16, not the card's unnumbered placeholder.
- [x] [DEC-471](../../../../../../research/game-design/cards/DEC-471.md): closed: bazaar-pick trigger, card lines 19–21; −2 from approved Q-C3-16.
- [x] [DEC-472](../../../../../../research/game-design/cards/DEC-472.md): closed: end turn on building space, card lines 19–21; −2 from approved Q-C3-16.
- [x] [DEC-473](../../../../../../research/game-design/cards/DEC-473.md): closed: end turn in home kingdom, card lines 19–21; −1 from approved Q-C3-16.
- [x] [DEC-474](../../../../../../research/game-design/cards/DEC-474.md): closed: holder's virtues/gear give no move-roll bonus, card lines 20–22; not a second corruption penalty.
- [x] [DEC-475](../../../../../../research/game-design/cards/DEC-475.md): closed: no Cleanse at 3 skulls; other removal still works, card lines 20–22; preserve EV-04 disabled presentation.
- [x] [DEC-476](../../../../../../research/game-design/cards/DEC-476.md): closed ruling: cannot give, can receive, card lines 19–21. EV-07 action/DEC-544 conflict remains UNRESOLVED with Gamewright → Wright → Warden; see correction. Closing the card is not closing the gate.
- [x] [DEC-477](../../../../../../research/game-design/cards/DEC-477.md): closed: buy surcharge after haggle, card lines 20–22; +2 from approved Q-C3-16. No new stacking/discount rule here.
- [x] [DEC-676](../../../../../../research/game-design/cards/DEC-676.md): closed: third corruption stops all open loops immediately, card lines 15–22; no later quest effect or drop.
- [x] [DEC-684](../../../../../../research/game-design/cards/DEC-684.md): closed: most-corrupted hero, not sum; floor 2, card lines 15–22; accepted despite older proposal wording.
- [x] [DEC-718](../../../../../../research/game-design/cards/DEC-718.md): closed exclusion: Suspicious / Weak return in 1.1, owner Wright for that later delivery; card lines 14–20. This does not defer the nine-card C3 set.
- [x] [DEC-043](../../../../../../research/game-design/cards/DEC-043.md): closed: third corruption is a loss (card title line 3), refined to immediate by DEC-676 lines 16–18.
- [x] [DEC-170](../../../../../../research/game-design/cards/DEC-170.md): deferred delivery to feature 06, owner Wright: one-at-a-time cure, card line 13; DEC-552 lines 15–22 caps the rise. Held second-cure pricing is separate, not an 08 gate change.

- AREA-097: C3 context decided (card lines 10–12). AREA-099 remains `open` (card line 4); only Q-C3-15/16 are closed here, not the whole numbers pass. See [correction](./gate-correction.md) for unresolved gate items.

## OPEN questions

- UNRESOLVED (Gamewright → Wright → Warden): EV-07 has no located giving action and conflicts with DEC-544's no-tile-trades ruling; old tuning/count-only save compatibility and multi-holder/discount interactions are not decided by the approved single-holder evals. See [gate-correction.md](./gate-correction.md). No eval is waived or edited.

- ANSWERED Q-C3-15 (Bob approved 2026-10-31): a seeded draw from the C3 set, never one the hero already holds. Was: how is the named corruption picked when a hero takes one: a seeded draw from the 1.0 set, the story's choice (MEC-059), or the group's? And can a hero draw the same one twice?
- ANSWERED Q-C3-16 (Bob approved 2026-10-31): Cruel, Greedy and Feral −2 gold on their trigger; Lost −1; Tempted +2 on each buy. Was: the gold amounts for Cruel, Greedy, Feral, Lost and Tempted are not in DEC-703's table. Which numbers?

## Eval approval

- See ./approval.md (must be filled before coding).
