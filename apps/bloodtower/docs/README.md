# Bloodtower docs

| Path | What |
|---|---|
| [../spec.md](../spec.md) | The architecture decision log and the protocol and pack contracts; its R1 sections are history |
| [../plans/1.0-milestones.md](../plans/1.0-milestones.md) | The 1.0 build: milestones C2 to C5 |
| [audit/C2-audit.md](audit/C2-audit.md) | The C1 code read against the cards (accepted by Bob at G-A, 2026-10-31) |
| [playtests/2026-10-31-G-C1.md](playtests/2026-10-31-G-C1.md) | The G-C1 sign-off playtest and its six follow-ups (GC1-01 to GC1-06) |
| [../plans/archive/R1-step1-foundation.md](../plans/archive/R1-step1-foundation.md) | The approved step 1 plan |
| [../README.md](../README.md) | How to run it |
| [ipad-door-pick-diagnosis.md](ipad-door-pick-diagnosis.md) | QA: door pick-card (`ipad:all`) never reaches `/device` |
| [playtests/2026-10-20-1120.md](playtests/2026-10-20-1120.md) | Playtest 1 (mock tower, 4K TV, iPad and phone); its fixes and polish are [../plans/playtest-1-runbook.md](../plans/playtest-1-runbook.md) |
| [playtests/2026-10-20-1325-tower.md](playtests/2026-10-20-1325-tower.md) | Playtest 1, tower run (real tower, sections E and F) |

Playtest results land in [playtests/](playtests/), one `.json` and `.md` per run of `pnpm --dir apps/bloodtower playtest` (see [../README.md](../README.md#other-commands)). There is no intent folder: the design cards stand in for it (Bob, 2026-11-07), and each milestone plan names the cards it builds.
