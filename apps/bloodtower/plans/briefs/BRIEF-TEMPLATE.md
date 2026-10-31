Keep this a checklist; do not write a second design doc.

# Brief: <plan-name> / <##-feature> — <title>

## Meta

- Plan:
- Feature: <##-feature>
- Owner:
- Related AREA/docs:
- Evals: ./eval.md
- Mockup: ./mockup.html | none (no screen change)
- Risk: Low | Med | High | Human

## Cutover

Cutover: N

- If Y: what dies or is renamed (one bullet per thing).

## Survival invariants

- Continue, restore, and restart must keep:

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-NN all pass (verifier table on PR).
- Not required: <edge cases deliberately left out>

## AREA / DEC checklist

- [ ] <AREA- or DEC- id>: closed before coding.

## Eval approval

- See ./approval.md (must be filled before coding).
