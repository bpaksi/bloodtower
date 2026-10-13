# 0001 — Multi-app repository layout
Date: 2026-10-13 · Status: accepted

## Context
The repo started as a single deliverable (the tower controller POC), with `intent/`, `spec.md` and `plans/` at the root. The project will produce several websites: the POC, a new-game test, and the final game, plus more experiments.

## Decision
- Every website lives in `apps/<name>/` and owns its own `README.md`, `intent/`, `spec.md` and `plans/`.
- An app may be one package or several parts (`apps/<name>/<part>/`); the workspace globs cover both.
- Repo-wide process, Claude config, hooks and toolchain live at the root and apply to every app.
- Shared code moves to `packages/` only once a second app needs it.
- Research is shared across apps in `research/`. Cross-app decisions go in `research/decisions/`; single-app decisions stay in that app's spec decision log.
- Initial apps: `tower-poc`, `game-test`, `game`.

## Consequences
- The POC's planned `apps/tower-service`, `apps/web` and `packages/protocol` become `apps/tower-poc/service`, `apps/tower-poc/web` and `apps/tower-poc/protocol`.
- POC spike and observability write-ups go to `research/tower/` so later apps can use them.
- Hooks must protect `apps/*/intent/**` instead of a root `intent/`.
