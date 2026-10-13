# M0 — Repo and SDLC scaffolding

**Goal:** an empty-but-working workspace where every check command runs green and the Claude guardrails from the repo-root `docs/sdlc.md` are enforced.

> **Two layers.** The repo root (workspace, toolchain, Claude config, hooks) is shared by every app and is built once here. Everything under `apps/tower-poc/` belongs to this app only. App commands (`pnpm dev`, `pnpm start`, `pnpm e2e`) run from `apps/tower-poc/` or as `pnpm -F tower-poc <script>` from the root. Root `pnpm check` and `pnpm build` cover every app.
**Exit condition:** `pnpm check`, `pnpm build`, `pnpm dev` and `pnpm start` all succeed on a hello-world. A deliberate violation of each hook is blocked.

## Files that change

```text
# repo root (shared by all apps)
package.json, pnpm-workspace.yaml (already exists), .npmrc, .nvmrc (22.13+), tsconfig.base.json
biome.json (or eslint+prettier), lefthook.yml, .gitignore
# this app
apps/tower-poc/package.json   # name "tower-poc", private, orchestrates dev/start/build/e2e for its parts
apps/tower-poc/service/   package.json, tsconfig.json, src/index.ts (HTTP + /ws hello)
apps/tower-poc/web/             Next.js App Router, output:'export', Tailwind v4, shadcn/ui init, page shells
apps/tower-poc/protocol/    package.json, src/index.ts (envelope schema stub)
CLAUDE.md, REVIEW.md
.claude/settings.json, .claude/hooks/{protect-intent,no-main-commit,pin-guard,format}.sh
.claude/agents/{verifier,reviewer}.md
.claude/skills/{tower-capability,bugfix,gap-entry}/SKILL.md
```

## Order of work

1. Workspace skeleton and toolchain pins (Node ≥ 22.13, pnpm ≥ 10).
2. `apps/tower-poc/protocol` with Zod and an envelope schema, plus a unit test.
3. `apps/tower-poc/service`: Node HTTP server that serves `apps/tower-poc/web/out` statically, plus a `ws` endpoint answering `hello` with `welcome`. Binds `0.0.0.0` with a configurable port (default 4747) and prints LAN URLs on start.
4. `apps/tower-poc/web`: Next.js static export, all page shells from spec §5 with nav, and a header placeholder.
5. Scripts. Root: `check` and `build` (recursive across all apps). `apps/tower-poc/package.json`: `dev` (concurrently: `tsx watch` service + `next dev` with WS URL env), `start`, `build`, `e2e`.
6. Lefthook pre-commit: `pnpm check` on staged workspaces.
7. Claude config: CLAUDE.md, REVIEW.md, hooks, agents and skills.
8. Playwright config with 3 projects (phone 390×844, iPad 820×1180, desktop 1440×900), and one smoke test that loads each page shell.

## Risks

- Next static export plus a separate dev server needs the WS URL configured differently in dev and prod. Mitigation: `NEXT_PUBLIC_WS_URL` in dev; in prod derive it from `location.host`.
- Lefthook running full checks may be slow. If commits get annoying, scope it to changed packages.

## Proof

- Paste output of `pnpm check`, `pnpm build`, and `pnpm e2e` (smoke).
- Show each hook blocking: an edit to `apps/tower-poc/intent/0001…`, a commit on `main`, and a change to the `ultimatedarktower` version.
- Screenshot of the Dashboard shell at three viewports.
