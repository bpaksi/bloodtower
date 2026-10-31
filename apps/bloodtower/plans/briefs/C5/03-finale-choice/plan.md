Keep this a checklist; do not write a second design doc.

# Brief: C5 / 03-finale-choice — The last choice: break the seal or swear the oath

## Meta

- Plan: [C5-finale-polish.md](../../../C5-finale-polish.md)
- Feature: 03-finale-choice
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, DEC-663, DEC-664, DEC-540, DEC-642, DEC-290, MEC-077
- Evals: ./evals.md
- Screen spec: none (engine only; screens are in this cycle's screen features)
- Mockup: none (no screen change)
- Depends on: 02, C3 07, and its `approval.md` on `main`
- Touches: `packs/test/**` (the end-hook scene), `apps/bloodtower/src/engine/loops/scene/vote.ts` (new)
- Builds: DEC-663, DEC-664
- Deps change: no
- Runs: cloud

## What it does

DEC-664: the Tower loop's end hook plays a plain scene with DEC-663's two options; each sets a flag. Each present hero votes; a tie re-votes once, then the seeded draw breaks it (Gamewright pick, pending Bob) (Q-C5-03). Copy: `[COPY: last choice, Warden falls = "The Warden falls. Beneath the keep lies the shard he swore to guard. Shatter it for good, or swear his oath and guard it in his place."]`, `[COPY: option, break the seal = "Break the seal"]`, `[COPY: option, swear the oath = "Swear the oath"]`.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The resolved finale flag survives Continue (vote collection is owned by C5 09).

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-04 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; 1.1 work (DEC-502).

## AREA / DEC checklist

- [ ] DEC-663: closed before coding (`decided`).
- [ ] DEC-664: closed before coding (`decided`).
- [ ] DEC-540: closed before coding (`decided`).
- [ ] DEC-642: closed before coding (`decided`).
- [ ] DEC-290: closed before coding (`decided`).
- [ ] MEC-077: closed before coding (`decided`).

## OPEN questions

- OPEN Q-C5-03 **[Bob taste call]**: Who makes the last choice in the Tower (DEC-663)? Options: (a) each present hero votes on their iPad; a tie re-votes once, then the seeded draw (DEC-011) breaks it; (b) the hero who struck the last blow chooses; (c) the vote must be unanimous; it repeats until it is. Gamewright pick: (a) (Gamewright pick, pending Bob).

## Eval approval

- See ./approval.md (must be filled before coding).

> Note (DEC-663, DEC-667): the last-choice and finale-win lines were changed from Loremaster's copy to fit the decided story: the choice is to shatter the shard under the keep or swear The Warden's oath and guard it, and the oath ending echoes his fall. Loremaster to review. Button labels Break the seal / Swear the oath and the flags `seal_broken` / `oath_sworn` are unchanged.
