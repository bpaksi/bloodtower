Keep this a checklist; do not write a second design doc.

# Brief: D3 / 01-ward-and-boss-deck — The Ward cancels the weakest spell once; a boss phase shuffles its Rend into the unrevealed cards

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (section "Nov 12 audit fold-in", decision D3)
- Feature: 01-ward-and-boss-deck
- Kind: fix (engine; the rulings are already on main)
- Owner: Gamewright (brief, evals); Anvil (build, inspect first)
- Related AREA/docs: issue #501; findings CB-04 and CB-05, test R04 in [docs/audits/2026-11-12-dark-tower-consolidated-audit.md](../../../../../../docs/audits/2026-11-12-dark-tower-consolidated-audit.md); rulings DEC-908 (CB-04) and DEC-909 (CB-05), both #509; index [research/game-design/audit-rulings-2026-11-13.md](../../../../../../research/game-design/audit-rulings-2026-11-13.md) section D3
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no screen change; the foe panel's counts are view data only)
- Risk: High (battle state, seeded deck, restore)
- Depends on: its approval.md on main (normal brief approval); F1 (#505) merged; D2 (#500) merged or rebased onto (both edit the battle loop)
- Builds: DEC-908, DEC-909; MEC-038 .8 and .28 as the cards now read
- Deps change: no
- Runs: cloud

### Touches

**Not on main at 9ccd052.** `apps/bloodtower/src/engine/` has no battle loop or battle rules today. C4-02 (#445) names `loops/battle/**` and `rules/battle/**`; C5-02 (#460) names `rules/battle/boss.ts` (new). F1 and D2 work in the same code. Anvil lists the exact files after F1 merges, as F1 does.

- OVERLAP F1, OVERLAP D2 (#559): `apps/bloodtower/src/engine/loops/battle/**` (the spells step, MEC-038 .8; the reveal, .28).
- OVERLAP F1, OVERLAP D2 (#559): `apps/bloodtower/src/engine/rules/battle/**` (the Ward; the round deck's three piles, DEC-649, and one operation "add a card to the draw pile and shuffle it, seeded").
- `apps/bloodtower/src/engine/rules/battle/boss.ts` only if it exists when D3 starts. If it does not, D3 builds the deck operation and drives it from a test phase trigger; C5-02 later calls it for The Warden (its approved EV-02, "+1 Rend each", is consistent and not edited).
- New unit tests beside the battle tests, named `R04-D3-<EV>` in their own `describe` blocks (F1 adds TB-01 to TB-14 and D2 adds `R04-EV-*` there).
- Read only: `apps/bloodtower/src/engine/loops/day/clock.ts`, `apps/bloodtower/src/engine/loops/chapter/playState.ts` (`nextPlayRng`, the seeded stream).
- Cards: none. #509 already edited DEC-553, DEC-567, DEC-649, DEC-658 and MEC-038 .8 and .28.
- **No D1 (#558) overlap:** D3 touches no `loops/day/**` or `loops/chapter/**` file.

### Merge order

- F1 first, then D2, then D3 (D2 and D3 both edit the won round and the spells in `loops/battle/**`; the later rebases).
- Proposed, as Wright ruled for D2 (Wright to confirm): D3 is its own step, ahead of C4-02 (#445) and C5-02 (#460), which rebase on it if they land first. It does not join them, so no approved eval reopens.
- If the spells step (.8) or the round deck (.28) is not on main after F1 and D2, the EVs that need it are marked blocked with that reason, as F1 allows; D3 does not build the spells or the deck from nothing.

## What it does

1. **The Ward (DEC-908).** At MEC-038 .8: (1) the Ward cancels one spell, the one with the smallest cut among the spells cast in the round it first meets; (2) the surviving flat cuts apply (DEC-655); (3) any halving applies (Colossus). The cancelled spell is cast and spent. The Ward works once per battle.
2. **Equal cuts give the same result.** The caption names the first in seat order; the result never depends on seat or tap (DEC-655).
3. **The boss deck (DEC-909).** Three piles: draw, discards, face-up. A phase adds one Rend to the draw pile and shuffles it, seeded, in the battle's stream. The discards and the face-up card stay; the face-up card resolves as it would have. Two phases in one round do it twice, in order (DEC-658).
4. **Empty draw pile.** At a reveal, every card (added Rends included) returns and is shuffled. A phase with an empty pile makes the Rend the only card.
5. **The cycle** is the cards the deck holds (9 or 10 after phases); the foe panel's view data shows cards left and Rends left.

**Inspect first.** If the code already conforms, D3 is tests only. A contradicted rule: stop that case and report it. Do not invent a rule.

**Out of scope** (do not widen): spell values and once-a-battle limits (DEC-801, as built); the boss's phase thresholds, ability growth and tower shows (C5-02); the foe panel's screen (C4-09, C5-08); F1's entry gate; D2's trap and Spines rules.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - A save after the Ward cancelled a spell resumes with the Ward used and that spell spent; no spell is cancelled again (EV-11).
  - A save after a phase added its Rend resumes with the same draw pile order, discards, face-up card and Rend count; the Rend is not added again (EV-12).
- The tower is not touched beyond today's phase cue (C5-02's).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 to EV-09 pass (verifier table on PR), or any blocked one is marked blocked with the exact reason.
- [x] EV-10 (e2e, R04 through the session): moved to C4/04 as its EV-09 (Bob, 2026-11-22). Nothing on main starts a battle from play, and this brief keeps `loops/chapter/**` read-only. D3 merges on its engine tests.
- [ ] EV-11 to EV-12 (survival) pass.
- [ ] Anvil's report lists changed files, test commands and results, and any drift found.
- Not required: the boss screen; The Warden's real thresholds and ability numbers; balance claims (DEC-908 and DEC-909 are "check in playtest").

## AREA / DEC checklist

- [ ] DEC-908 and DEC-909 read; this brief follows them; no rule is changed here.
- [ ] DEC-553 (Ward, Colossus), DEC-655 (flat before halving, never seat order), DEC-123 and DEC-801 (spells), DEC-643 (the gate after spells), DEC-649 (no repeats until all used), DEC-567 and DEC-658 (phases), DEC-557 (the deck), DEC-323 (the face-up card lands only on a lost round), DEC-011 (seeded) read.
- [ ] MEC-038 .8, .28 and .36 read; no card edit is needed (#509 already made them).
- [ ] No approved eval.md is edited: C4-02's and C5-02's evals stand; D3's evals add to them.
- [ ] No AREA or DEC card reverses a Bob lock; none is needed from Bob beyond the eval approval. DEC-908 and DEC-909 carry a "check" line for the numbers (the Striga is a little easier), not a Bob call.

## Open questions

- None for Gamewright; the cards settle every case D3 tests.
- For Wright: confirm D3's sequencing (proposed above, as for D2).

## Eval approval

- See ./approval.md (must be filled before coding).
