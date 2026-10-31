Keep this a checklist; do not write a second design doc.

# Brief: C2 / 10-tower-glyph-prototype — Tower prototype: glyphs, facing, and the drums after calibrate

## Meta

- Plan: C2 ([plan](../../../C2-session-shell.md), feature 10). Unblocks features 11 (Continue's piece check) and 12 (glyphs and facing).
- Feature: 10-tower-glyph-prototype
- Owner: Claude (brief). A Wright developer builds it in tower-poc. Bob runs it on the real tower.
- Related AREA/docs: DEC-103 (prototype the glyph prompts in tower-poc first), MEC-017 (facing), MEC-039 .13 to .19, Q-402, Q-033, Q-032, [setup-slice findings](../../../../../../research/tower/setup-slice-findings-2026-10-21.md) (chunks A and B)
- Evals: ./eval.md
- Mockup: none (a tower-poc test page; it does not ship in Bloodtower)
- Risk: Human (tower safety; the answers come from Bob's hardware run)
- Touches: `apps/tower-poc/src/web/app/setup-check/**` (new page), `apps/tower-poc/src/web/lib/setupCheck.ts` (new) and its test, `apps/tower-poc/src/web/lib/pages.ts` (nav entry only), `apps/tower-poc/src/e2e/tests/setup-check.spec.ts` (new), `research/tower/2026-11-setup-check-findings.md` (new, written after Bob's run)

## Cutover

Cutover: N

- A new tower-poc page. No Bloodtower code changes.

## Survival invariants

- Continue, restore, and restart must keep: the page's answers so far, so a run split into short chunks can stop and pick up (Bob's hardware runs go in chunks).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-06 and EV-11 all pass (verifier table on PR) with the mock tower.
- [ ] After the merge, Bob runs the page on the real tower and the findings note answers the questions in "What the run must answer". This is Bob's hardware run, not a verifier check.
- Not required: Bloodtower screens. Any automatic step: every tower action is a press.

## What the run must answer

1. After calibrate, which glyph shows on each side of each drum, compared with the library's fixed table (Q-033).
2. Which kingdom the side the library calls "north" faces when lit, and whether its light and its drum "north" are the same side (MEC-017).
3. Whether `mechanics.rotate-drum` on a press turns each drum to a chosen saved position, and lands where the library says (Q-402, option "a press that turns the drums").
4. After a box-up (tower lifted and shaken over a tray), how many skulls stay inside, over at least 10 tries (Q-032, Q-402).

Bob then rules Q-402 and the glyph prompts for MEC-039 .13 to .15 in a design session.

## AREA / DEC checklist

- [ ] DEC-103: closed before coding (`decided`). Prototype in tower-poc before Bloodtower builds the step.
- [ ] MEC-017: closed before coding (`decided`). Light one side; a player taps the kingdom it faces.
- [ ] Tower safety (root CLAUDE.md): nothing physical happens automatically. Calibrate, every light and every rotate is its own press.

## Eval approval

- See ./approval.md (must be filled before coding).
