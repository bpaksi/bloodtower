Keep this a checklist; do not write a second design doc.

# Brief: C5 / 05-art-through-a1 — The Ruined Keep's art and voice through the A1 adapter

## Meta

- Plan: [C5-finale-polish.md](../../../C5-finale-polish.md)
- Feature: 05-art-through-a1
- Kind: pack
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, A1 plan, DEC-199, DEC-202, DEC-349, DEC-386, DEC-593
- Evals: ./evals.md
- Screen spec: none (engine only; screens are in this cycle's screen features)
- Mockup: none (no screen change)
- Depends on: A1 plan merged, C4 09, C4 12, and its `approval.md` on `main`
- Touches: `packs/test/assets/**`, `packs/test/pack.yaml` (`assets[]`)
- Builds: AREA-097, DEC-593
- Deps change: no
- Runs: cloud

## What it does

Run `pnpm assets:needs|render|pack test` for every painting, foe (C4 placeholders swapped), the Tomb style, the Tower levels, The Warden's phases and the endings; AI drafts then Bob approves each final (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C5-06). Voiced: the Loremaster's lines only (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C5-07).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - A game saved with placeholder art loads with the new art; IDs are stable (DEC-202).

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-05 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; 1.1 work (DEC-502).

## AREA / DEC checklist

- [ ] A1 plan: closed before coding (`decided`).
- [ ] DEC-199: closed before coding (`decided`).
- [ ] DEC-202: closed before coding (`decided`).
- [ ] DEC-349: closed before coding (`decided`).
- [ ] DEC-386: closed before coding (`decided`).
- [ ] DEC-593: closed before coding (`decided`).

## OPEN questions

- OPEN Q-C5-06 **[Bob taste call]**: How is the 1.0 art made through A1? Options: (a) A1 AI mode for drafts, then Bob approves each final in the studio; (b) studio mode only, Bob directing each piece. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- OPEN Q-C5-07 **[Bob taste call]**: Which lines are voiced in 1.0 (DEC-349)? Options: (a) the Loremaster's lines only (chapter cards, seal breaks, the two win lines, the loss); (b) none; all text on Scrolls. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

## Eval approval

- See ./approval.md (must be filled before coding).
