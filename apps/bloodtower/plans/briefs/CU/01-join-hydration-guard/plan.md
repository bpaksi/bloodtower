Keep this a checklist; do not write a second design doc.

# Brief: CU / 01-join-hydration-guard — Stop the /join hydration warning and keep it stopped

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md)
- Feature: 01-join-hydration-guard
- Kind: fix
- Owner: Gamewright (brief, evals); a Wright developer (build)
- Related AREA/docs: GitHub issue #414 (the report, Bob, 2026-11-10); C2-09 (JoinScreen)
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no screen change)
- Risk: Low
- Depends on: its approval.md on main
- Touches: `apps/bloodtower/src/web/app/layout.tsx`, `apps/bloodtower/src/web/components/device/JoinScreen.tsx`, `apps/bloodtower/src/web/components/device/LiveJoin.tsx` (only if an input needs the flag), one new e2e spec under `apps/bloodtower/src/e2e/tests/`
- Builds: issue #414
- Deps change: no
- Runs: cloud

## What it does

Bob saw a React hydration warning on /join (JoinScreen, iPad layout) during the C2-09 iPad test. The diff held only attributes Chrome on iOS adds before React runs: `__gchrome_remoteframetoken` on `<html>`, and `__gchrome_uniqueid` on the join forms and inputs. It is not an SSR difference.

The fix is `suppressHydrationWarning` on `<html>`, plus on the specific form and input elements the warning still names. It is never put on a wrapper that holds game content. A new e2e check injects those same attributes before hydration and fails the build if /join logs a hydration error, so the warning cannot return unseen.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - No server-rendered output changes: the same HTML is sent for /join before and after (no SSR behaviour change, #414 acceptance).
  - The join code form and the token form still submit and still pre-fill from the link exactly as before.
  - No real hydration error is hidden: the flag sits only on `<html>` and on the inputs and forms the warning named, so a real mismatch elsewhere still logs.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-04 all pass (verifier table on PR).
- Not required: a real Chrome iOS run in CI (Bob confirms on the iPad after merge; see EV-04).

## AREA / DEC checklist

- [ ] Issue #414: report read; acceptance is "no hydration warning on /join in Chrome iOS or Safari iPad, and no SSR behavior change". Closed before coding.
- [ ] No AREA or DEC card applies: this changes no rule and no screen. Closed.

## Eval approval

- See ./approval.md (must be filled before coding).
