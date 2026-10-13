# Dark Tower

Many small apps around the *Return to Dark Tower* tower. Bob owns intent, approvals and merges; Claude plans, builds and self-verifies. The full process is in [docs/sdlc.md](docs/sdlc.md).

## Repo map

| Path | What |
|---|---|
| `apps/<app>/` | One app: `intent/` (Bob's words), `spec.md`, `plans/Mx-*.md`, `README.md` |
| `apps/<app>/src/<part>/` | Code parts, each its own package (`tower-poc`: `web`, `server`, `protocols`) |
| `packages/` | Shared code, only once a second app needs it |
| `research/` | Notes and findings, no code |
| `.claude/` | Hooks, agents and skills shared by every app |

## Commands

| From | Command | Does |
|---|---|---|
| root | `pnpm check` | Biome, then typecheck and unit tests in every package |
| root | `pnpm build` | Builds every app |
| `apps/tower-poc` | `pnpm dev` | Server (`tsx watch`, port 4747) plus `next dev` |
| `apps/tower-poc` | `pnpm build && pnpm start` | One process on port 4747 serving the built UI and `/ws` |
| `apps/tower-poc` | `pnpm e2e` | Playwright, mock mode, three viewports |

## How work flows

1. Read the app's `spec.md` and the current `plans/Mx-*.md` before changing code. If they conflict with the intent, the spec wins.
2. One branch per plan step: `<type>/<app>-<slug>` (repo-wide work: `chore/<slug>`). Never commit on `main`.
3. If the work deviates from the plan or spec, update that document in the same commit.
4. Before handing over, run `pnpm check` and the `verifier` agent, and paste the output as evidence in the commit message.
5. Run the `reviewer` agent on the branch diff before asking Bob to merge.

## Conventions

- Conventional commits with the app as scope: `feat(tower-poc): …`.
- Dependencies are exact pins (`.npmrc` sets `save-exact`). `ultimatedarktower` stays at `7.1.2`.
- Apps never import from another app's folder. Shared code goes through `packages/`.
- Parts export TypeScript source with no build step. Relative imports use the `.ts` extension.
- Biome formats and lints. There is no ESLint or Prettier.

## Tower safety

- The UI reaches the tower only through `command{capabilityId, params}`. No message type may carry raw bytes.
- Nothing physical happens automatically: no auto-calibrate, no auto-reconnect, no automatic retry of a physical action.
- Unknown values are shown as unavailable, never as zero.

## Hooks that will stop you

| Hook | Blocks |
|---|---|
| `protect-intent` | Any edit under `apps/*/intent/` |
| `no-main-commit` | `git commit`, `merge`, `cherry-pick`, `revert` or `am` on `main` |
| `pin-guard` | Changing or removing the `ultimatedarktower` version, or installing another version |
| `test-lock` | Editing test files on a `fix/*` branch after its first commit |

If a hook blocks you, do not work around it. Say what you were trying to do and ask Bob.

## Known mistakes

- Stop only the processes you started. `pkill -f "next dev"` also kills Bob's other dev servers; kill by PID or by the port you opened.
- `pnpm start` does not build. Run `pnpm build` first or the server reports that the web UI is not built.
