# Dark Tower

Many small apps around the *Return to Dark Tower* tower. Bob owns intent, approvals and merges; Claude plans, builds and self-verifies. The full process is in [docs/sdlc.md](docs/sdlc.md).

## Repo map

| Path | What |
|---|---|
| `apps/<app>/` | One app: `intent/` (Bob's words), `spec.md`, `plans/Mx-*.md`, `README.md` |
| `apps/<app>/src/<part>/` | Code parts, each its own package (`tower-poc`: `web`, `server`, `protocols`, `e2e`) |
| `packages/` | Shared code, only once a second app needs it |
| `research/` | Notes and findings, no code |
| `.claude/` | Hooks, agents and skills shared by every app |

## Commands

| From | Command | Does |
|---|---|---|
| root | `pnpm check` | Biome, repo checks (pins, cross-app imports, hook tests), then typecheck and unit tests in every package |
| root | `pnpm build` | Builds every app |
| root | `pnpm land <branch>` | Bob only: runs `pnpm check` on the branch, fast-forwards `main` to it and deletes the branch. Refuses inside a Claude session |
| `apps/tower-poc` | `pnpm dev` | Server (`tsx watch`, port 4747) plus `next dev` |
| `apps/tower-poc` | `pnpm build && pnpm start` | One process on port 4747 serving the built UI and `/ws` |
| `apps/tower-poc` | `pnpm e2e` | Builds, then runs Playwright on port 4748 at three viewports |

## How work flows

1. Read the app's `spec.md` and the current `plans/Mx-*.md` before changing code. If they conflict with the intent, the spec wins.
2. One branch per plan step: `<type>/<app>-<slug>` (repo-wide work: `chore/<slug>`). Never commit on `main`.
3. If the work deviates from the plan or spec, update that document in the same commit.
4. Before handing over, run `pnpm check` and the `verifier` agent, and paste the output as evidence in the commit message.
5. Run the `reviewer` agent on the branch diff before asking Bob to merge. Bob merges with `pnpm land <branch>`; never run it yourself.

## Conventions

- Conventional commits with the app as scope: `feat(tower-poc): …`.
- Dependencies are exact pins (`.npmrc` sets `save-exact`). `ultimatedarktower` stays at `7.1.2`; `scripts/pinned-versions.json` lists the pins and only Bob changes it.
- TypeScript is pinned to `6.0.3`. Version 7 was not evaluated; see the M0 plan.
- Apps never import from another app's folder. Shared code goes through `packages/`. `pnpm check` enforces this.
- Parts export TypeScript source with no build step. Relative imports use the `.ts` extension.
- Biome formats and lints. There is no ESLint or Prettier.

## Tower safety

- The UI reaches the tower only through `command{capabilityId, params}`. No message type may carry raw bytes.
- Nothing physical happens automatically: no auto-calibrate, no auto-reconnect, no automatic retry of a physical action.
- Unknown values are shown as unavailable, never as zero.

## Hooks that will stop you

| Hook | Blocks |
|---|---|
| `protect-intent` | Any edit under `apps/*/intent/`, and removing or moving an app folder |
| `no-main-commit` | Committing on `main` (`commit`, `merge`, `cherry-pick`, `revert`, `am`, `rebase`, `pull`) or moving it (`reset`, `branch -f`, `update-ref`, a `:main` refspec). On every branch: a commit that skips the pre-commit check (`--no-verify`, `-n`, `LEFTHOOK=0`, `core.hooksPath`) |
| `pin-guard` | Changing or removing a pinned version, installing another one, `up --latest` with no package names, or editing `scripts/pinned-versions.json` |
| `test-lock` | Changing test files on a `fix/*` branch after its first commit, except removing a `.fails` marker |

The hooks also read shell commands, so `sed -i`, `rm`, `mv`, a redirect or a script aimed at a protected file is blocked too. So is a git command that would throw away uncommitted work in an intent file or the pin list, such as `git clean`, `git stash`, `git checkout -- .`, `git restore <folder>` or `git reset --hard`. A hook that crashes blocks the call, and a commit or a discarding command is blocked when git cannot say which branch or folder it applies to; run it from the repo folder or with `git -C <path>`. That reading is best effort: a command the hook does not understand is not permission. The rules above hold either way.

If a hook blocks you, do not work around it. Say what you were trying to do and ask Bob.

## Known mistakes

- Stop only the processes you started. `pkill -f "next dev"` also kills Bob's other dev servers; kill by PID or by the port you opened.
- `pnpm start` does not build. Run `pnpm build` first or the server reports that the web UI is not built.
