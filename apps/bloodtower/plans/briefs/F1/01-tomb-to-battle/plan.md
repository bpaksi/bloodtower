Keep this a checklist; do not write a second design doc.

# Brief: F1 / 01-tomb-to-battle — One entry effect, terminal entries end the battle, retreat keeps the room uncleared

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (section "F1: Tomb-to-battle contracts")
- Feature: 01-tomb-to-battle
- Kind: fix (conformance repair; may end as docs and tests only)
- Owner: Gamewright (brief, evals); Anvil (build, inspect first)
- Related AREA/docs: issue #505; findings QD-03, CB-01, QD-01; source package [docs/audits/2026-11-12-f1-tomb-to-battle-package.md](../../../../../../docs/audits/2026-11-12-f1-tomb-to-battle-package.md); DEC-907 (Gamewright's two Nov 13 confirmations, incl. TB-03)
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no screen change)
- Risk: High (battle, fall and game-loss state; restore)
- Depends on: its approval.md on main; Bob lifted the F1 hold on 2026-11-16
- Touches: MEC-026 and MEC-038 (cards, and the matching battle-loop and Tomb code and fixtures in `apps/bloodtower/src/engine/`), new unit tests TB-01 to TB-14 beside the existing battle tests, one e2e spec under `apps/bloodtower/src/e2e/tests/`. Anvil lists the exact files after inspecting.
- Builds: issue #505
- Deps change: no
- Runs: cloud

## What it does

Fixes the Tomb-to-battle hand-off so that:

1. **One owner of the entry effect.** MEC-038 alone applies the stance (Bold cut or On guard attack, DEC-607), once, on a genuine entry. MEC-026 passes the stance and the room foe and applies nothing.
2. **Terminal entries stop at once.** After each entry effect (the stance, then any before-round-1 ability) the gate runs in this order: game loss, then foe gone = won, then all fallen = fallen close (DEC-907). A terminal entry gets no Fight/Retreat, no round card and no roll.
3. **A foe killed by Bold never uses its later pre-round ability** (Ambush, Fire breath or any other). Gamewright's ruling on TB-03 (DEC-907, 2026-11-13).
4. **A room clears only on won.** Retreat or fall leaves it uncleared with the foe's count kept. Leave before entering clears nothing.
5. **Continue replays nothing.** A genuine new visit applies its one entry effect (DEC-675, DEC-682).

**Inspect first.** Anvil reads the current cards, code and tests, then compares them with the package. If the code already conforms, the build is docs and tests only (the 14 regressions plus the e2e). Material drift or a contradicted rule: stop that case and report it. Do not invent a rule.

**Out of scope** (do not widen): D1 to D6 (#499 to #504), mutual Spines and trap zero/shortfall (D2/CB-06, QD-05), skull-loss dispatch (D1/LC-01), CB-02, CB-03, QD-02, QD-04, EE-01 (the quest turn-end; R01's quest clause waits on it), balance retunes, any 1.1 content. New node ids come from the diagram tooling, not by hand; DEC-680 reserves .42 and up.

## Cutover

Cutover: N

- Nothing dies or is renamed. MEC-026 .16 changes meaning (context only, no cut or attack); node ids stay, or move through the project tooling with references rechecked.

## Survival invariants

- Continue, restore, and restart must keep:
  - A saved battle after the stance cut or the On guard attack resumes at the next pending node with the foe count, HP, card and deck position unchanged. No second cut, attack or ability (TB-12, TB-13).
  - A retreated or fallen battle leaves the Tomb room uncleared with its living foe's count (TB-09, TB-10, TB-11).
  - The third-corruption game loss still goes through the one existing unwind, once (TB-07).
  - Battle rewards, fall penalties and the battle-end hook happen once; the quest reward stays with the quest wrapper (TB-02, TB-14).
- The tower is not touched; no physical state changes.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 to EV-14 (TB-01 to TB-14) all pass (verifier table on PR), or any blocked one is marked blocked with the exact reason.
- [ ] EV-15 (e2e, R01 minus EE-01) passes.
- [ ] EV-16 to EV-17 (survival) pass.
- [ ] Anvil's report lists changed files, test commands and actual results, the card and diagram reference check, and any drift found.
- Not required: a physical Tower run; any claim about balance.

## AREA / DEC checklist

- [ ] DEC-907 (the gate order; TB-03) read; this brief follows it.
- [ ] DEC-607, DEC-650, DEC-533 (stance), DEC-119 (fallen sit out, all fallen ends the battle), DEC-497 and DEC-651 (retreat leaves the foe), DEC-675 and DEC-682 (Continue vs re-entry), DEC-676 and DEC-905 (third corruption loses at once), DEC-671 (last attack), DEC-553 (pre-round abilities) read; no rule is changed here.
- [ ] MEC-026 and MEC-038 edited only for ownership and result handling; no new DEC is created to restate an approved rule (DEC-352, DEC-610). Any genuinely new choice goes to Gamewright first.
- [ ] No AREA or DEC card reverses a Bob lock; none is needed from Bob beyond the eval approval.

## Eval approval

- See ./approval.md (must be filled before coding).
