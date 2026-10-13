# How DarkTowerWeb applies the AI-Native SDLC Playbook

Source: [The AI-Native SDLC Playbook](https://claude.com/resources/articles/the-ai-native-sdlc-playbook). This repo uses a **lean solo loop**: Bob is originator, product owner, tech lead and release manager, and Claude Code (running locally on the Mac) plans, builds and self-verifies.

## The loop

```text
intent/NNNN-*.md ──accept──► spec.md ──approve──► plans/Mx-*.md ──approve──► branch per step
     ▲                                                                          │
     │                                                       checks + verifier + reviewer
     │                                                                          ▼
 new gap / finding ◄──────────── merge to main (Bob) ◄──────── evidence pasted in commit/PR notes
```

| Playbook stage | What we do here | Artifact | Gate (Bob) |
|---|---|---|---|
| 1. Plan | New ideas and changes get an intent file in Bob's words | `intent/NNNN-*.md` | Accept intent |
| 2. Design | Claude drafts or updates the spec from the accepted intent and flags conflicts | `spec.md` (with decision log) | Approve spec |
| 3. Build | Plan mode first. One plan per milestone, and each step is one branch. Deviations update the plan **in the same commit**. | `plans/Mx-*.md`, `CLAUDE.md`, `.claude/skills`, `.claude/agents`, hooks | Approve plan |
| 4. Test | Claude runs `pnpm check` and the verifier agent before handing over, and pastes the output | Vitest, Playwright (mock mode, 3 viewports), screenshots | Judge evidence |
| 5. Deploy → **Merge** | No remote or CI yet. Lefthook runs checks on commit, and the `reviewer` subagent reviews the branch diff against REVIEW.md, spec.md and the plan. | `REVIEW.md`, `.claude/settings.json` hooks | Bob merges to `main`. Claude never commits to `main`. |
| 6. Maintain | **Skipped for the POC** (no bands.yaml or scheduled scans). Findings from hardware testing become gap entries, or a new intent if large. | Gap register | — |

## Guardrails (skills are advisory, hooks are deterministic)

| Guardrail | Mechanism |
|---|---|
| No edits to `intent/**` by Claude (Bob's words) | PreToolUse hook → exit 2 |
| No direct commits on `main` | PreToolUse hook on `git commit` while on `main` → exit 2 |
| Pinned library cannot be bumped silently | PreToolUse hook blocks edits to the `ultimatedarktower` version line in any package.json |
| No raw-bytes message type in protocol | Protocol unit test (deterministic) plus a reviewer check |
| Test-first bug fixes | `/bugfix` skill: commit the failing test first. A hook blocks edits to `*.test.ts` on `fix/*` branches after the first commit. |
| Format/lint | PostToolUse hook runs `pnpm biome check --write` (or eslint/prettier) on edited files |
| Secrets | `.env*` denied in permissions |

## Claude config to create in M0

```text
CLAUDE.md                       # < 1 page: commands, conventions, architecture map, known mistakes
REVIEW.md                       # review passes: bugs, safety (physical actions), spec/plan compliance; Important vs Nit; nit cap 5
.claude/settings.json           # hooks + permissions
.claude/hooks/*.sh
.claude/agents/verifier.md      # runs pnpm check + Playwright mock suite + screenshots; reports, never fixes
.claude/agents/reviewer.md      # read-only diff review per REVIEW.md
.claude/skills/tower-capability/SKILL.md   # how to add a capability: inventory → protocol → executor → UI → test → gap
.claude/skills/bugfix/SKILL.md             # failing test first
.claude/skills/gap-entry/SKILL.md          # how to write a gap with evidence + confidence
```

## Single-command checks (listed in CLAUDE.md with healthy output)

| Command | Runs |
|---|---|
| `pnpm check` | typecheck, lint, unit tests (all workspaces), and the inventory coverage test |
| `pnpm e2e` | Playwright against `pnpm start` in mock mode at phone, iPad and desktop viewports |
| `pnpm build` | protocol → web export → tower-service bundle |
| `pnpm start` | one-process run (`MOCK=1` for mock mode) |
| `pnpm dev` | tower-service (tsx watch) + next dev, one command |

## Metrics we'll actually glance at

- First-pass `pnpm check` success per step (leading)
- Steps whose plan had to be rewritten mid-way (leading)
- Hardware verification pass rate per capability (lagging)
- Reviewer "Important" findings per merge (lagging). Recurring ones go into CLAUDE.md as known mistakes.
