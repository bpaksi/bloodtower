Keep this a checklist; do not write a second design doc.

# Brief: D5 / 01-pool-pays — Any gold in the pool pays a priced choice; the heroes present pay first

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (section "Nov 12 audit fold-in", decision D5)
- Feature: 01-pool-pays
- Kind: fix (engine; no new screen state, no new copy)
- Owner: Gamewright (brief, evals); Anvil (build, inspect first)
- Related AREA/docs: issue #502; finding BE-05 and test R06 in [docs/audits/2026-11-12-dark-tower-consolidated-audit.md](../../../../../../docs/audits/2026-11-12-dark-tower-consolidated-audit.md); ruling DEC-911 (#509); DEC-944 (this brief); index [research/game-design/audit-rulings-2026-11-13.md](../../../../../../research/game-design/audit-rulings-2026-11-13.md) section D5
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no new screen state: an existing row is enabled or greyed by a different total)
- Risk: Med (gold on every hero's sheet; restore)
- Depends on: its approval.md on main (normal brief approval). No step dependency: everything it changes is on main at 618a0ff.
- Builds: DEC-911, DEC-944 (R06); DEC-176's per-hero part, which C3/08 EV-12 noted was "a later feature"
- Deps change: no
- Runs: cloud

### Touches (checked against main 618a0ff)

"Pool" below is the sum of every seated hero's sheet gold (`heroSheet(clock, id).gold`), across all groups. A hero with no gold figure adds 0 and pays 0, as now (C3/13).

- `apps/bloodtower/src/engine/rules/purse/index.ts`: add the gold helpers on the sheets, beside the starting purse: the pool; pay a priced choice in DEC-911's order; pay the toll from the present group (DEC-944); split a gain to the present group with DEC-646's leftover; a per-hero `HeroGold` on the sheets.
- `apps/bloodtower/src/engine/loops/encounter/picks.ts`: `livePurse` (line ~448) and `loadLive` (~462) load the pool; `openMenu`'s `purse < price` (~278) and `applyPick`'s `no-gold` (~330) then read it; `commitLive` (~476) pays the drop in DEC-911's order, not hero order; `applyPick` (~372) and `endGroupTurn` (~391) pass the per-hero `HeroGold`, not `groupPurseGold`. DEC-896's order stays: pay first, then each own-share loss from its holder.
- `apps/bloodtower/src/engine/loops/encounter/menu.ts`: the purse read for the refusal (~177, `refusalReason` ~162) is the pool. The words ("Not enough gold.") do not change.
- `apps/bloodtower/src/engine/rules/corruption/index.ts`: `groupPurseGold` (~120) and its "1.0 tracks one purse per group" comment go, or stay test-only; `applyPickLosses` and `applyTurnEndLosses` unchanged in shape.
- `apps/bloodtower/src/engine/loops/event/resolve.ts`: the pay-off's enabled check (~113, `purseOf` ~32) reads the pool; the `pay-off` case (~178) pays in DEC-911's order, absent heroes' sheets included; `earn` (~57, the windfall at ~140) gives the leftover to the hero holding least (DEC-646), not the first hero.
- `apps/bloodtower/src/engine/loops/event/ledger.ts`: only if the pay-off's absent part is written through the sheets here (`commitLedger` ~42 must not overwrite it).
- `apps/bloodtower/src/engine/loops/quest/quest.ts`: `isDisabled` (~68) compares `goldNeeded` with the pool; `payCost` gold (~142) pays in DEC-911's order; the toll (~148 to ~153) is paid by the present group (DEC-944), Q-C3-22's short rule unchanged; the gold effect (~118) and the quest's gold (~100) are gains to the present group.
- `apps/bloodtower/src/engine/loops/session/view.ts`: the event panel's `purse` (~528) is the pool.
- Tests: `apps/bloodtower/src/engine/rules/purse/pay.test.ts` (new, EV-01 to EV-06); `apps/bloodtower/src/engine/loops/encounter/pool.test.ts` (new, EV-07, EV-08, EV-13); `apps/bloodtower/src/engine/loops/event/pool.test.ts` (new, EV-09, EV-10); `apps/bloodtower/src/engine/loops/quest/pool.test.ts` (new, EV-11). Existing tests unchanged and passing; their fixtures have one group, so pool and group purse agree.
- e2e: `apps/bloodtower/src/e2e/tests/d5-pool.spec.ts` (new, EV-12), using the existing `~test-at:` and `~test-gold:` markers and no `~test-seat-together` (so the heroes are in separate groups).
- Cards: DEC-944 (new, this brief). DEC-911's card edits were made in #509.

### Overlaps and merge order

- **No F1 overlap.** F1 works in the battle and Tomb loops and moves no gold. A later fall loss (DEC-177) or battle gold (DEC-120) uses this brief's helpers; whichever of those steps lands after D5 calls them.
- **No D1 (#558), D2 (#559) or D3 (`docs/d3-brief-2026-11-18`) overlap.** None touches these files; D2's total fall moves no gold.
- **OVERLAP D4 (`docs/d4-brief-2026-11-18`): `loops/encounter/picks.ts` `openMenu`.** D4 changes the fallen refusal and the labels (~247 to ~262); D5 changes the `disabled` line (~278). Same function, separate hunks. Also `loops/session/view.ts`: D4 at ~602, D5 at ~528. Whichever lands second rebases.
- **OVERLAP D6 (`docs/d6-brief-2026-11-18`): `loops/encounter/picks.ts`** (`movesCost`, `pickGate`, the moves line of `applyPick`, `openMenu`'s moves check, all for Fortunate) **and `loops/encounter/menu.ts`** (the cost line). D5 touches the gold lines of the same functions. Whichever lands second rebases.
- **Merge order:** independent of F1, D1, D2 and D3. With D4 and D6, any order; the second rebases.

## What it does

1. **Affordable means the pool** (DEC-911). A building pick, an event's "Pay them off" and a quest option's gold price are enabled when every seated hero's gold together covers the price (DEC-944).
2. **Who pays** (DEC-911): the heroes present, equal shares, each leftover coin from a hero holding the most (DEC-646); a short present hero is covered by the other present heroes, a coin at a time from the hero holding the most, ties by seat; only if the present heroes together are short do the heroes not there pay the rest, the same way.
3. **The pool falls by exactly the price**; no hero goes below 0.
4. **Stays where it falls** (DEC-944): the quest toll is paid by the heroes present (Q-C3-22 unchanged); Cruel, Greedy, Feral and Lost each take only from the holder's own gold (DEC-896), never covered.
5. **Gains** go to the heroes present, each leftover coin to a hero holding the least (DEC-178, DEC-646).

**Inspect first.** If part of this already conforms, that part lands as tests only. A contradicted rule: stop that case and report it. Do not invent a rule.

**Out of scope** (do not widen): a board total for the whole pool (no new screen state); companions' prices (DEC-726, 1.1); battle gold (DEC-120) and the fall loss (DEC-177), which live in loops not on main; the toll amount or its hit points (Q-C3-22).

## Cutover

Cutover: N

- Nothing dies or is renamed. `groupPurseGold` may go; nothing outside tests and `picks.ts` calls it.

## Survival invariants

- Continue, restore, and restart must keep:
  - Every hero's gold exactly as paid; a restore or a replayed pick never pays twice (EV-13).
  - The pool after a restore is read from the sheets, so the menu's enabled rows match the saved gold (EV-13).
- The tower is not touched.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 to EV-11 pass (verifier table on PR).
- [ ] EV-12 (e2e, Playwright) passes.
- [ ] EV-13 (survival) passes.
- [ ] Anvil's report lists changed files, test commands and results, and any drift found.
- Not required: a physical Tower run; new art or copy.

## AREA / DEC checklist

- [ ] DEC-911 and DEC-944 read; this brief follows them.
- [ ] DEC-176, DEC-178, DEC-646, DEC-177, DEC-896, DEC-023, MEC-003, MEC-074 read.
- [ ] Q-C3-22 (Bob approved 2026-10-31): the toll and its short rule are unchanged (DEC-944). C3/07's and C3/14's approved toll EVs stand; their eval.md files are not edited.
- [ ] C3/08 EV-12's amendment (Bob, 2026-11-15) said the per-hero split was a later feature; this is it. C3/08's eval.md is not edited; its test-code ledger keeps passing.
- [ ] C3/05, C3/06, C3/12 and C3/13 gold EVs (approved) use one group, where the pool is the group's purse; they stand unchanged. C3/05's windfall "+2 or +3 per DEC-178's split" allows DEC-646's leftover.
- [ ] **Bob lock check:** DEC-911 reads DEC-176's "freely shared" over the present-group reading of DEC-178; both are Bob's (flagged to Warden on 2026-11-13). If Bob wants only the present group's gold to pay, DEC-911 flips and EV-01, EV-03, EV-08, EV-11 and EV-12 change. DEC-944 keeps Q-C3-22 as Bob approved it. Neither touches DEC-821, 822, 824 or 826.

## Open questions

- None open. Which gold moves the pool pays: DEC-944 (EV-08 to EV-11).

## Eval approval

- See ./approval.md (must be filled before coding).
