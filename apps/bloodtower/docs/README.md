# Bloodtower docs

| Path | What |
|---|---|
| [../spec.md](../spec.md) | R1 spec, decision log and traceability (step 2) |
| [../plans/R1-step1-foundation.md](../plans/R1-step1-foundation.md) | The approved step 1 plan |
| [../README.md](../README.md) | How to run it |
| [ipad-door-pick-diagnosis.md](ipad-door-pick-diagnosis.md) | QA: door pick-card (`ipad:all`) never reaches `/device` |
| [playtests/2026-10-20-1120.md](playtests/2026-10-20-1120.md) | Playtest 1 (mock tower, 4K TV, iPad and phone); its fixes and polish are [../plans/playtest-1-runbook.md](../plans/playtest-1-runbook.md) |

Playtest results land in [playtests/](playtests/), one `.json` and `.md` per run of `pnpm --dir apps/bloodtower playtest` (see [../README.md](../README.md#playtest)). There is no separate intent file; the approved plan is the source until Bob writes one.
