# How Dark Tower applies the AI-Native SDLC Playbook

Source: [The AI-Native SDLC Playbook](https://claude.com/resources/articles/the-ai-native-sdlc-playbook). This repo uses a **lean solo loop**: Bob is originator, product owner, tech lead and release manager, and Claude Code (running locally on the Mac) plans, builds and self-verifies.

The repo holds many apps. **Process, guardrails and Claude config are shared at the root; intent, spec and plans belong to each app.**

## The loop (per app)

```text
apps/<app>/intent/NNNN-*.md ──accept──► apps/<app>/spec.md ──approve──► apps/<app>/plans/Mx-*.md ──approve──► branch per step
     ▲                                                                                                    │
     │                                                                          checks + verifier + reviewer
     │                                                                                                    ▼
 new gap / finding ◄───────────────────── merge to main (Bob) ◄────────────────── evidence in commit notes
```

| Playbook stage | What we do here | Artifact | Gate (Bob) |
|---|---|---|---|
| 1. Plan | New ideas and changes get an intent file in Bob's words | `apps/<app>/intent/NNNN-*.md` | Accept intent |
| 2. Design | Claude drafts or updates the app's spec and flags conflicts. Cross-app decisions also get a record in `research/decisions/`. | `apps/<app>/spec.md` (with decision log) | Approve spec |
| 3. Build | Plan mode first. One plan per milestone, each step is one branch. Deviations update the plan **in the same commit**. | `apps/<app>/plans/Mx-*.md`, root `CLAUDE.md`, `.claude/` | Approve plan |
| 4. Test | Claude runs `pnpm check` and the verifier agent before handing over, and pastes the output | Vitest, Playwright, screenshots | Judge evidence |
| 5. Deploy → **Merge** | No remote or CI yet. Lefthook runs checks on commit; the `reviewer` subagent reviews the branch diff against `REVIEW.md` and the app's spec and plan. | `REVIEW.md`, `.claude/settings.json` hooks | Bob merges to `main`. Claude never commits to `main`. |
| 6. Maintain | Skipped during Explore. Findings become gap entries, research notes, or a new intent. | Gap register, `research/` | — |

## Tiers

Every app README states its tier. Explore-phase experiments shouldn't carry the full ceremony.

| | Experiment | Full |
|---|---|---|
| Use for | Throwaway prototypes, quick mechanic tests | Anything touching hardware, reused later, or shipping (`tower-poc`, `game`) |
| Intent | One short `intent/0001-*.md` | Yes, one per change |
| Spec | Optional; README is enough | Required, with decision log |
| Plans | Optional single `plans/plan.md` | One per milestone |
| Shared hooks + `pnpm check` | Yes | Yes |
| Reviewer agent | Optional | Every branch |
| Branch per step | Yes | Yes |

Promoting an Experiment to Full: write a spec from what was learned, then continue with milestone plans.

## Naming

| Thing | Convention |
|---|---|
| App folder | `apps/<kebab-name>/` |
| App package | `<app>` (single package) or `<app>-<part>` (e.g. `tower-poc-server`) |
| Shared package | `packages/<name>/`, package `@dark-tower/<name>` |
| Branches | `<type>/<app>-<slug>` (e.g. `feat/tower-poc-lights`); repo-wide work uses `chore/<slug>` |
| Commits | Conventional commits with the app as scope: `feat(tower-poc): …` |

## Guardrails (skills are advisory, hooks and checks enforce)

Hooks see Claude's edit tools exactly and read shell commands on a best-effort basis: they catch the ordinary ways to change a file (`sed -i`, `rm`, `mv`, redirects, scripts) but cannot follow everything a shell can do. Where a rule can be checked on the result, `pnpm check` does that too, and it gates every commit.

Reading a shell command is a guess about where it runs. When a `cd` or `git -C` cannot be read for certain (a variable, a glob, a pipe, a folder that is not there), the hooks check the command against every folder it might run in, including the one the call started in, and block if any of them is hit. A variable or a command substitution may name a folder that is none of those, so a git command that discards work across a folder is refused outright when its target is one; give it a literal path. Known limits, where the hooks do not see the change of folder at all: `pushd`, a `cd` inside `{ … }` or after `then`, a here-document, and a command substitution used as a path, quoted or not. Pipelines are read the way zsh runs them. The limits matter most for git commands that discard uncommitted work, because nothing is left for the reviewer to see.

| Guardrail | Mechanism |
|---|---|
| No edits to `apps/*/intent/**` by Claude (Bob's words) | PreToolUse hook on edits and shell commands → exit 2. Backstop: the reviewer checks the diff. |
| No direct commits on `main` | PreToolUse hook on git commands that commit on `main` or move it → exit 2 |
| The ordinary ways to skip `pnpm check` on a commit are blocked | The same hook blocks `--no-verify`, `-n`, `LEFTHOOK=0` and `core.hooksPath` on committing git commands, on every branch → exit 2. Docs-only commits skip the check by design (`lefthook.yml`). |
| Pinned `ultimatedarktower` cannot be bumped silently | Pins live in `scripts/pinned-versions.json`. `scripts/check-pins.mjs` in `pnpm check` fails on any other version in a `package.json` or the lockfile. A PreToolUse hook warns earlier, on the edit or install command. |
| No raw-bytes message type in a tower protocol | Protocol unit test plus a reviewer check |
| Test-first bug fixes | `/bugfix` skill: commit the failing test first. A hook blocks edits and shell changes to test files on `fix/*` branches after the first commit. Removing a `.fails` marker, and nothing else, stays allowed so the fix can be proven. |
| Cross-app imports | Apps never import from another app's folder; shared code goes through `packages/`. `scripts/check-imports.mjs` in `pnpm check` fails on a cross-app import; the reviewer checks too. |
| Format/lint | PostToolUse hook runs `biome check --write` on edited files |
| Secrets | `.env*` denied in permissions |

## Claude config (root, created in tower-poc M0, used by every app)

```text
CLAUDE.md                       # < 1 page: repo map, commands, conventions, known mistakes
apps/<app>/CLAUDE.md            # optional, app-specific notes only (Claude loads it when working in that folder)
REVIEW.md                       # review passes: bugs, physical-action safety, spec/plan compliance; Important vs Nit; nit cap 5
.claude/settings.json           # hooks + permissions
.claude/hooks/*.mjs, format.sh    # guards, with hooks.test.mjs run by pnpm check
.claude/agents/verifier.md      # runs checks + Playwright + screenshots for the app under change; reports, never fixes (model: haiku)
.claude/agents/reviewer.md      # read-only diff review per REVIEW.md (model: sonnet; pass an Opus override for hook or tower-safety changes)
.claude/skills/new-app/SKILL.md            # scaffold apps/<name>/ with README, intent, tier
.claude/skills/tower-capability/SKILL.md   # tower apps: inventory → protocol → executor → UI → test → gap
.claude/skills/bugfix/SKILL.md             # failing test first
.claude/skills/gap-entry/SKILL.md          # gap with evidence + confidence
.claude/skills/stitch/SKILL.md             # third-party: drives the `stitch` CLI (Stitch designs, DESIGN.md); project bound in .stitch.json
.claude/skills/scrollytelling/SKILL.md     # third-party: guidance for scroll-driven pages (layout patterns, accessibility, performance)
```

## Commands

| From | Command | Runs |
|---|---|---|
| root | `pnpm check` | lint, repo checks (pins, cross-app imports, hook tests), typecheck and unit tests across every app and package |
| root | `pnpm build` | builds every app |
| root | `pnpm -F <app> <script>` | one app's script (same as running it inside the app folder) |
| app | `pnpm dev` / `pnpm start` / `pnpm e2e` | defined per app in its README |

## App README template

```markdown
# <Title> (`<folder>`)

| | |
|---|---|
| Purpose | |
| Phase | Explore / Design / Build |
| SDLC tier | Experiment / Full |
| Status | |
| Disposable? | |
```

## Metrics we'll actually glance at

- First-pass `pnpm check` success per step (leading)
- Steps whose plan had to be rewritten mid-way (leading)
- Hardware verification pass rate per capability (lagging, tower apps)
- Reviewer "Important" findings per merge (lagging). Recurring ones go into `CLAUDE.md` as known mistakes.
