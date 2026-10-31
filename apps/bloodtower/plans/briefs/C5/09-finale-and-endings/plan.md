Keep this a checklist; do not write a second design doc.

# Brief: C5 / 09-finale-and-endings — The last choice and the two endings on screen

## Meta

- Plan: [C5-finale-polish.md](../../../C5-finale-polish.md)
- Feature: 09-finale-and-endings
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, DEC-663, DEC-664, SCR-018, DEC-144
- Evals: ./evals.md
- Screen spec: ./screen-spec.md
- Mockup: none yet; Illusionist draws ./mockup.html from ./screen-spec.md before Bob approves the evals
- Depends on: 03, 04, C3 16, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/device/Vote.tsx` (new), `apps/bloodtower/src/web/components/board/Outcome*.tsx`
- Builds: DEC-663, DEC-664, SCR-018
- Deps change: no
- Runs: cloud

## What it does

The board shows `[COPY: last choice, Warden falls = "The Warden falls. Beneath the keep lies the shard he swore to guard. Shatter it for good, or swear his oath and guard it in his place."]` and the two options; each iPad votes (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C5-03); the board ticks who has voted. Then the win line for the flag, voiced (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C5-07), then straight to the outcome (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C5-09).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - Votes cast survive Continue; the outcome is not shown twice.
  - After a restart and Continue, the Menu and any gear panel come back closed.
  - A beat interrupted by restart shows again or the next one shows, its effect applied once.

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-14 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; 1.1 work (DEC-502).

## AREA / DEC checklist

- [ ] DEC-663: closed before coding (`decided`).
- [ ] DEC-664: closed before coding (`decided`).
- [ ] SCR-018: closed before coding (`decided`).
- [ ] DEC-144: closed before coding (`decided`).

## OPEN questions

- Q-C4-17 (auto-advance timing, Gamewright pick (a), approved by Bob 2026-10-31 6:16 PM ET) applies to this screen; see C4 plan.

- Resolved Q-C5-03 **[Bob taste call]**: Who makes the last choice in the Tower (DEC-663)? Options: (a) each present hero votes on their iPad; a tie re-votes once, then the seeded draw (DEC-011) breaks it; (b) the hero who struck the last blow chooses; (c) the vote must be unanimous; it repeats until it is. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C5-07 **[Bob taste call]**: Which lines are voiced in 1.0 (DEC-349)? Options: (a) the Loremaster's lines only (chapter cards, seal breaks, the two win lines, the loss); (b) none; all text on Scrolls. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C5-09 **[Bob taste call]**: After a finale win line, before the outcome scene: Options: (a) nothing extra: the win line, then the outcome scene; (b) a short credits Scroll `[COPY: credits]`. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

## Eval approval

- See ./approval.md (must be filled before coding).

> Note (Q-C5-09): the pick is (a), no credits Scroll, so `[COPY: credits]` is not folded. If Bob picks (b): "Blood Tower: The Ruined Keep. Thank you for playing." (Credits line not folded.)

