# M0 — Repo and SDLC scaffolding

**Status:** approved by Bob, 2026-10-13. Steps 1–8 are built; review fixes are on `chore/m0-review-fixes`. All of M0 is stacked on that one branch, so it merges to `main` as a single fast-forward. Proof was collected on 2026-10-13 (see the end of this file); one item is outstanding.

**Goal:** an empty-but-working workspace where every check command runs green and the Claude guardrails from the repo-root `docs/sdlc.md` are enforced.

> **Two layers.** The repo root (workspace, toolchain, Claude config, hooks) is shared by every app and is built once here. Everything under `apps/tower-poc/` belongs to this app only. App commands (`pnpm dev`, `pnpm start`, `pnpm e2e`) run from `apps/tower-poc/` or as `pnpm -F tower-poc <script>` from the root. Root `pnpm check` and `pnpm build` cover every app.

**Exit condition:** `pnpm check`, `pnpm build`, `pnpm dev` and `pnpm start` all succeed on a hello-world. A deliberate violation of each hook is blocked.

## Files that change

```text
# repo root (shared by all apps)
package.json, pnpm-workspace.yaml (already exists), .npmrc, .nvmrc (22.13+), tsconfig.base.json
biome.json, lefthook.yml, .gitignore
scripts/pinned-versions.json, check-pins.mjs, check-imports.mjs (+ tests)   # run by pnpm check
# this app
apps/tower-poc/package.json   # name "tower-poc", private, orchestrates dev/start/build/e2e for its parts
apps/tower-poc/src/server/      package.json, tsconfig.json, index.ts (entry), server.ts (HTTP + /ws hello), static.ts, lanUrls.ts (+ tests)
apps/tower-poc/src/web/         Next.js App Router, output:'export', Tailwind v4, shadcn/ui init, page shells
apps/tower-poc/src/protocols/   package.json, tsconfig.json, index.ts, envelope.ts, messages.ts (hello, welcome, error) (+ tests)
apps/tower-poc/src/e2e/         package.json, tsconfig.json, playwright.config.ts, tests/smoke.spec.ts
CLAUDE.md, REVIEW.md
.claude/settings.json, .claude/hooks/{protect-intent,no-main-commit,pin-guard,test-lock}.mjs, lib.mjs, hooks.test.mjs, format.sh
.claude/agents/{verifier,reviewer}.md
.claude/skills/{new-app,tower-capability,bugfix,gap-entry}/SKILL.md
```

## Order of work

1. Workspace skeleton and toolchain pins (Node ≥ 22.13, pnpm ≥ 10). Bob chose Biome over eslint+prettier. TypeScript is pinned to 6.0.3, the last 6.x release; 7.x was the latest but was not evaluated. Step 4 confirmed that Next.js 16.4 builds with 6.0.3. Moving to 7.x is a separate change.
2. `apps/tower-poc/src/protocols` with Zod and an envelope schema, plus a unit test.
3. `apps/tower-poc/src/server`: Node HTTP server that serves `apps/tower-poc/src/web/out` statically, plus a `ws` endpoint answering `hello` with `welcome`. Binds `0.0.0.0` with a configurable port (default 4747) and prints LAN URLs on start.
4. `apps/tower-poc/src/web`: Next.js static export, all page shells from spec §5 with nav, and a header placeholder.
5. Scripts. Root: `check` and `build` (recursive across all apps). `apps/tower-poc/package.json`: `dev` (concurrently: `tsx watch` service + `next dev` with WS URL env), `start`, `build`, `e2e`.
6. Lefthook pre-commit: the full `pnpm check` whenever code or config is staged; docs-only commits skip it. (Deviation: not scoped to staged workspaces, because a change to a shared root file would then go unchecked. Revisit if commits get slow.)
7. Claude config: CLAUDE.md, REVIEW.md, hooks, agents and skills. This includes the `test-lock` hook and the `new-app` skill, which `docs/sdlc.md` lists but this plan first left out. After review, the guards were rewritten in Node so they also read shell commands (best effort), and two rules moved into `pnpm check` where they can be checked on the result: pinned versions (`scripts/check-pins.mjs`) and cross-app imports (`scripts/check-imports.mjs`, in place of the lint rule `docs/sdlc.md` named).
8. Playwright config with 3 projects (phone 390×844, iPad 820×1180, desktop 1440×900), and one smoke test that loads each page shell. It lives in its own part, `src/e2e` (spec D19). Phone and iPad run on WebKit and desktop on Chromium.

## Risks

- Next static export plus a separate dev server needs the WS URL configured differently in dev and prod. Mitigation: `NEXT_PUBLIC_WS_URL` in dev; in prod derive it from `location.host`.
- Lefthook running full checks may be slow. If commits get annoying, scope it to changed packages.

## Proof

- Paste output of `pnpm check`, `pnpm build`, and `pnpm e2e` (smoke).
- Show each hook blocking: an edit to `apps/tower-poc/intent/0001…`, a commit on `main`, and a change to the `ultimatedarktower` version.
- Screenshot of the Dashboard shell at three viewports.

## Proof results (2026-10-13, at b09b7f8)

- `pnpm check` exits 0 with 172 tests passing; `pnpm build` exits 0; `pnpm e2e` reports 30 passed. `pnpm start` and `pnpm dev` both come up, and `/ws` answers `hello` with `welcome`.
- Blocked in a live Claude session, by file edit and by shell command: an edit to `apps/tower-poc/intent/0001-dark-tower-web.md` (`protect-intent`), a change to `scripts/pinned-versions.json` (`pin-guard`), and an edit to a test file on a `fix/*` branch (`test-lock`).
- **Outstanding:** `no-main-commit` has not been seen blocking in a live session. Claude Code's own permission check refused the commit on `main` before the hook ran. Fed the same commands directly, the guard exits 2. `main` has no `.claude/` folder until this branch merges, so repeat the live check in a fresh session after the merge.
- Dashboard screenshots at the three viewports were taken by the smoke test and checked by eye. They are not committed.
