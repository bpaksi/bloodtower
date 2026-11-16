Keep this a checklist; do not write a second design doc.

# Brief: C3 / 20-day-effects-wait-and-seed — The day loop's effects wait and the test-only seed hook (the C3-11 follow-up)

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md) (completes feature 11); queue step 12, order 22, [catchup/README.md](../../../catchup/README.md), issue #441
- Feature: 20-day-effects-wait-and-seed
- Kind: engine
- Owner: Gamewright (brief, evals); a Wright developer (build)
- Related AREA/docs: C3/11 [plan.md](../11-day-on-the-board/plan.md) "Bob's rulings on blocked evals (2026-11-07)", rulings 1, 4 and 5, and the 2026-11-14 cut-down (Q7.2); DEC-115, DEC-699 (the effects panel), DEC-686 (the day clock); CU/10's narrow hero-corruption seed
- Evals: ./eval.md
- Mockup: none (no screen change; the screens are C3-11's, merged)
- Risk: Med (timing and restart semantics)
- Depends on: its approval.md on main; C3-11 merged (#384); CU/07 merged (step 54 — it touches `loops/day/**` for the use-item action); CU/10 merged (step 57 — its narrow hero-corruption seed is what this step's general hook grows from)
- Touches: `apps/bloodtower/src/engine/loops/day/**` (the effects-wait step; no clock in the engine), `apps/bloodtower/src/server/**` (the wait's execution — the 4 s timer and the audio-end event; the test-seed hook), the engine test helpers (`initPlayState`, `setHeroSheet`) the hook consolidates, `apps/bloodtower/src/e2e/tests/c3-day.spec.ts` (the blocked evals go live); Touches amended 2026-11-16 by the coordinator under Bob's standing delegation (Bob to review in the PR): `apps/bloodtower/src/engine/loops/session/{events,stepShell,view}.ts` (a new logged `wait-end` event, like `hint-end`, so Continue applies the wait once), `apps/bloodtower/src/engine/views/day.ts` (map the new effects phase), `apps/bloodtower/src/engine/loops/chapter/playState.ts` (the general seed hook), `apps/bloodtower/src/e2e/tests/c3-corruption-mark.spec.ts` (CU/10's EV-04 `fixme` goes live), `apps/bloodtower/src/e2e/tests/support/acceptance.ts` (test host option, injectable timer, board-socket hook)
- Builds: C3-11's blocked evals going live
- Deps change: no
- Runs: cloud

## What it does

Two things, both from Bob's 2026-11-07 rulings on C3-11's blocked evals, kept after the 2026-11-14 cut-down:

1. The effects wait becomes an engine step of the day loop (ruling 1). The engine models the wait as a step — data, no clock, as `pnpm check` enforces. The server carries it out: the effects panel advances on its narration's audio-end event, or after 4 s when it has no audio (Bob 2026-10-31 10:38 AM ET), then runs the chapter exit check. This makes C3/11's EV-03, EV-04, EV-14, EV-17, EV-18 and EV-06's effects-panel shots live.
2. A test-only day-clock seed hook (rulings 4 and 5): skulls per building, the next kingdom, hero sheets (the virtue and corruption groups), and two heroes on one space. It grows from CU/10's narrow hero-corruption seed and the existing test helpers (`initPlayState`, `setHeroSheet`, the `seatTogether` marker), and keeps their rule: a seed is test-only and marked; real seeds never carry the marker. This makes C3/11's EV-01's seeded groups, EV-05, EV-09, and the Regroup stops of EV-11 and EV-13 live.

Not here (the cut-down and the other rulings):

- The host split action (ruling 3's first half) → CU/04, merged (#523).
- The host use-item action and its potion fixture (ruling 3's second half) → CU/07 (step 54).
- Corruption names (ruling 2) → C3-08 (step 13).
- EV-19's Continue day-clock fix (ruling 6) → already merged (#391).

## Cutover

Cutover: N

- Nothing dies or is renamed. The existing test helpers stay; the hook wraps them.

## Survival invariants

- Continue, restore, and restart must keep:
  - An auto-advancing step resumes and applies its effect exactly once (C3/11 EV-18's contract).
  - The seed hook never runs in a production game: seeded values exist only behind the test-seed path, and the marker rule holds (real seeds never carry the marker).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-06 all pass (verifier table on PR).
- [ ] C3/11's blocked evals, unmodified, go live and pass: EV-01 (its seeded groups), EV-03, EV-04, EV-05, EV-06 (its effects-panel shots), EV-09, EV-11 and EV-13 (their Regroup stops), EV-14, EV-17, EV-18. The verifier table lists each.
- Not required: corruption names (C3-08), the use-item flow (CU/07), anything C4 or C5.

## AREA / DEC checklist

- [ ] DEC-115: closed before coding (`decided`).
- [ ] DEC-699: closed before coding (`decided`).
- [ ] DEC-686: closed before coding (`decided`).
- [ ] Bob's 2026-11-07 rulings 1, 4 and 5, and the 2026-11-14 cut-down (Q7.2): recorded in C3/11's plan.md and the catch-up queue.

## Eval approval

- See ./approval.md (must be filled before coding).
