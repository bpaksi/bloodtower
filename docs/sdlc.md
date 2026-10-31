# How Bloodtower applies the AI-Native SDLC Playbook

Source: [The AI-Native SDLC Playbook](https://claude.com/resources/articles/the-ai-native-sdlc-playbook). This repo uses a **lean solo loop**: Bob is originator, product owner and tech lead, and Claude Code (running locally on the Mac) plans, builds, self-verifies and merges through pull requests on `bpaksi/bloodtower`. Bob's sign-off is required only at the named gates (below); merging is not one of them.

The repo holds many apps. **Process, guardrails and Claude config are shared at the root; intent, spec and plans belong to each app.**

## The loop (per app)

```text
apps/<app>/intent/NNNN-*.md ──accept──► apps/<app>/spec.md ──approve──► apps/<app>/plans/Mx-*.md ──approve──► batches of steps
     ▲                                                                                                    │
     │                                                                   worktree + branch + PR per step
     │                                                                   CI + verifier + adversaries on the PR (≤3 rounds)
     │                                                                                                    ▼
 new gap / finding ◄──── Bob gates (playtest, judgement, sign-off) ◄──── squash merge, one PR at a time (coordinator)
```

| Playbook stage | What we do here | Artifact | Gate (Bob) |
|---|---|---|---|
| 1. Plan | New ideas and changes get an intent file in Bob's words | `apps/<app>/intent/NNNN-*.md` | Accept intent |
| 2. Design | Claude drafts or updates the app's spec and flags conflicts. Cross-app decisions also get a record in `research/decisions/`. | `apps/<app>/spec.md` (with decision log) | Approve spec |
| 3. Build | Plan mode first. One plan per milestone; each step is one branch in its own worktree and one PR. Steps carry `Depends on`, `Touches`, `Deps change` and `Runs`, and the plan groups them into batches (see Parallel work). Deviations update the plan **in the same commit**. | `apps/<app>/plans/Mx-*.md`, root `CLAUDE.md`, `.claude/` | Approve plan (gate G-plan) |
| 4. Test | The developer runs `pnpm check` in its worktree and puts the output in the PR body. GitHub Actions runs the `check` job on every PR. It reruns `pnpm check` unless every changed path is on the lite allowlist (game-design, docs, packs, story scripts, app icons); those runs still execute Gitleaks and pass the job (Bob / Warden, 2026-10-25/26). The verifier, launched in a fresh context, posts the eval table on the PR. | Vitest, Playwright, screenshots, `.github/workflows/check.yml` | Only at a named gate (playtest, judgement) |
| 5. Deploy → **Merge** | Every change reaches `main` through a PR on `bpaksi/bloodtower`. Lefthook runs Gitleaks and `pnpm check` on commit; CI runs Gitleaks on every PR and `pnpm check` except on a lite docs/design/packs diff; one adversarial review (round 1) posts findings, the developer fixes the blockers, and fix-check rounds confirm the fixes, for up to 3 rounds in all. The coordinator squash-merges, one PR at a time, once CI is green and the latest review says `Blocking: none`, and, for a feature PR, the eval table is all-pass on the head (see Merging). | `REVIEW.md`, `.claude/settings.json` hooks, PRs | None. Bob may look at any PR; it is optional. Nobody commits to `main` directly. |
| 6. Maintain | Skipped during Explore. Findings become gap entries, research notes, or a new intent. | Gap register, `research/` | — |

## Tiers

Every app README states its tier. Explore-phase experiments shouldn't carry the full ceremony.

| | Experiment | Full |
|---|---|---|
| Use for | Throwaway prototypes, quick mechanic tests | Anything touching hardware, reused later, or shipping (`game`). Bob can place a hardware app on Experiment, as he did `tower-poc` on 2026-10-21. It keeps its existing spec and milestone plans, and the tower safety rules hold on either tier |
| Intent | One short `intent/0001-*.md` | Yes, one per change |
| Spec | Optional; README is enough | Required, with decision log |
| Plans | Optional single `plans/plan.md` | One per milestone |
| Shared hooks + `pnpm check` | Yes | Yes |
| Adversary agents | Optional (`adversary-bugs` only) | Review loop (§4) on every PR; `adversary-prd` when the step claims PRD ids |
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
| No edits to `apps/*/intent/**` by Claude (Bob's words) | PreToolUse hook on edits and shell commands → exit 2. Backstop: `adversary-bugs` checks the diff. |
| No direct commits on `main` | PreToolUse hook on git commands that commit on `main` or move it → exit 2. `main` changes only by a squash-merged PR. |
| A developer agent writes only inside its own worktree | `worktree-guard` PreToolUse hook on edits and shell writes, active in any checkout with a `.wt.json` → exit 2. Temp folders stay writable; the main checkout and other worktrees do not, even when they sit in a temp folder. |
| A PR merges only on green CI | `check` workflow on every PR. Branch protection on `main` requires the `check` status and an up-to-date branch. The coordinator also merges only when the latest review ends in `Blocking: none`, and, for a feature PR, when the eval table is all-pass on the head. |
| The ordinary ways to skip `pnpm check` on a commit are blocked | The same hook blocks `--no-verify`, `-n`, `LEFTHOOK=0` and `core.hooksPath` on committing git commands, on every branch → exit 2. Docs-only commits skip `pnpm check` by design (`lefthook.yml`). Gitleaks still scans the staged changes. CI skips the app suite the same way when a PR or a push to main stays inside the lite allowlist in `.github/workflows/check.yml` (Bob / Warden, 2026-10-25/26). The `check` job still runs Gitleaks and reports green. |
| Pinned `ultimatedarktower` cannot be bumped silently | Pins live in `scripts/pinned-versions.json`. `scripts/check-pins.mjs` in `pnpm check` fails on any other version in a `package.json` or the lockfile. A PreToolUse hook warns earlier, on the edit or install command. |
| No raw-bytes message type in a tower protocol | Protocol unit test plus an `adversary-bugs` check |
| Test-first bug fixes | `/bugfix` skill: commit the failing test first. A hook blocks edits and shell changes to test files on `fix/*` branches after the first commit. Removing a `.fails` marker, and nothing else, stays allowed so the fix can be proven. |
| Cross-app imports | Apps never import from another app's folder; shared code goes through `packages/`. `scripts/check-imports.mjs` in `pnpm check` fails on a cross-app import; `adversary-bugs` checks too. |
| Format/lint | PostToolUse hook runs `biome check --write` on edited files |
| Secrets | `.env*` denied in permissions |

## Claude config (root, created in tower-poc M0, used by every app)

```text
CLAUDE.md                       # < 1 page: repo map, commands, conventions, known mistakes
apps/<app>/CLAUDE.md            # optional, app-specific notes only (Claude loads it when working in that folder)
REVIEW.md                       # review passes: bugs, physical-action safety, spec/plan compliance; Important vs Nit; nit cap 5
.claude/settings.json           # hooks + permissions
.claude/hooks/*.mjs, format.sh    # guards, with hooks.test.mjs run by pnpm check
.claude/agents/verifier.md      # fresh context: runs the feature's eval.md and posts the eval table (screenshot EVs side by side, no pixel threshold); no eval.md: checks + Playwright + screenshots; reports, never fixes code or evals (model: haiku)
.claude/agents/adversary-bugs.md  # round 1: adversarial PR review, all REVIEW.md passes (model: opus). Rounds 2-3: fix-check only (Sonnet override). Replaced reviewer.md
.claude/agents/adversary-prd.md   # round 1 only, and only when the step claims PRD/AT/SC ids: checks them against the diff (model: haiku)
.claude/agents/developer.md     # builds one plan step in its own worktree with tests, pushes, opens the PR (model: sonnet; Opus only when the step says `Model: opus`)
.claude/agents/coordinator.md   # runs one approved batch: worktrees, developers, PR review, serial merges; stops at Bob's gates (model: sonnet)
.claude/agents/requirement-review.md  # reviews one step's requirements before build: conflicts, gaps, untestable criteria, open rulings, out-of-scope Touches (model: sonnet)
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
| root | `pnpm wt <branch>` / `pnpm wt:rm <branch>` | make / remove a step worktree at `../BloodTower-work/<branch>` with its own `.wt.json` (see Parallel work) |
| root | `pnpm land <branch>` | optional local recheck: rebase on `main`, rerun `pnpm check`, fast-forward the local `main`. Not the merge path; PRs are. Refuses inside a Claude session. |
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

## Human gates (Bob)

Bob signs off only at named gates. Each gate is a step in the plan, owned by Bob, and the next batch depends on it. Nothing after a gate starts until Bob records the sign-off (a line in the plan's Results with the date, or his words in the gate's PR/issue).

| Gate | When | What Bob does |
|---|---|---|
| G-plan | Before batch 1 | Approves the plan: steps, batches, `Touches`, open questions |
| G-playtest | After the first end-to-end run is buildable | Plays the full scene once with the tower and once with "Play without tower" (SC-1 style), writes notes. A first-time-player pass runs only at this gate: a fresh agent with no context plays the build and notes confusion. Those notes are non-blocking input to Bob's playtest |
| G-judgement | Where a success criterion needs a human verdict | Records the verdict (e.g. SC-5 fight tension) in the playtest notes |
| G-signoff | End of the milestone | Final sign-off |

An app plan names which of these it uses. Batch evidence (below) is posted for Bob to look at whenever he likes; it is not a gate and does not block merging.

## Who runs the agents

- **Coding agents are Cursor cloud agents.** Wright (Bob's Grok Bot build partner) launches one per plan step, each on its own branch. Each cloud agent follows `.claude/agents/developer.md`, runs `pnpm check`, and opens a PR on `bpaksi/bloodtower` with the plan step id and evidence.
- **Wright (Bob's Grok Bot build partner) is the coordinator** (`.claude/agents/coordinator.md`). He runs the adversary loop (§4), either by asking the step's cloud agent to run the `adversary-*` instructions or by launching separate reviewer cloud agents with them, and he merges when CI is green and nothing is blocking.
- **Claude Code on the Mac** stays valid for tower and hardware work, which needs the Bluetooth link. Local agents use the `pnpm wt` worktree flow below; cloud agents already run in their own clones, so they skip it.

## Local mode (cloud agents unavailable)

When Cursor cloud agents cannot run, a batch is built in Claude Code on Bob's Mac from a hand-off prompt in the app's `plans/` folder (for example `apps/bloodtower/plans/archive/B4-handoff.md`).

- Work only in a worktree on a new branch off `origin/main` (`pnpm wt <branch>`). Never edit, stash, or switch branches in Bob's main checkout.
- Deliver as a PR to `main`. The required `check` still gates it.
- The review loop is the one in §4 "Review loop": one Opus adversarial pass in round 1, Sonnet fix-checks after it. The developer and its fixes run on Sonnet unless the step says `Model: opus`. The developer's PR body carries the `Done when` checklist with evidence, so there is no separate spec-conformance reviewer.
- Blockers still open after round 3 get the `needs-bob` label, and the step stops.
- Claude Code never merges. Wright reviews and merges as in §4.

## Parallel work (several developer agents at once)

The loop runs plan steps in batches. Steps in a batch run at the same time, each in its own worktree; merging stays serial.

### 1. Plans declare dependencies and touch-sets

Every step in `apps/<app>/plans/Mx-*.md` carries four fields:

```markdown
### Step 3: <title>
- Depends on: 1            # step ids, gate ids, or "none"
- Touches: apps/game/src/combat/**, packages/dice/**
- Deps change: no          # yes if it edits any package.json or pnpm-lock.yaml
- Runs: cloud              # local or cloud, set by the plan author (see Step placement)
- Model: sonnet            # optional; "opus" only for tower safety, hooks, protocol or schema design, an unexplained bug, or open design choices
- Done when:               # measurable, and the only things a reviewer may block on besides the standing rules (§4)
  - <observable result, with numbers where it has any>
  - Viewports: <at most 3, named>   # UI steps
  - Not required: <edge cases and polish deliberately left out>
```

**`Done when` is the contract.** It names what the step must do and how a test proves it. A reviewer may not add viewports, timings or edge cases to it; those become follow-up issues. If a step has no eval.md: Gamewright writes one, Bob approves in chat.

**Step size.** A step expected to exceed about 400 changed lines, or that mixes a visual change with new timing or interaction behaviour, is split into two steps (for example "layer and plain zoom", then "interruptible zoom").

A **batch** is a set of steps whose dependencies are already merged (or signed off, for gates), whose `Touches` globs do not overlap, and where at most one has `Deps change: yes`. The plan lists its batches and merge order:

```markdown
## Batches
- B1: 1
- B2: 2, 3, 4   (merge order: 3, 2, 4)
- G1: Bob's gate step
- B3: 5         (depends on G1)
```

Approving the plan (G-plan) approves its batches. A step may not start before its batch's dependencies are met. Deviations that change `Touches` or dependencies update the plan in the same commit, as now. The coordinator and `adversary-bugs` check that a PR changes only files inside its step's `Touches`, and that only the step marked `Deps change: yes` changes a `package.json` or `pnpm-lock.yaml`.

**Step placement (`Runs`).** The plan author sets `Runs: local` (Bob and Claude Code on the Mac) when the step touches the core engine or session state, protocol contracts, security or tokens, the tower or other hardware, is a Bob gate, or a cloud attempt at it already ended in `needs-bob`. Everything else (UI, docs, tests, asset wiring) is `Runs: cloud` and runs on cloud agents when they are available. Before a batch starts, Wright lists each step's `Runs` value for Bob, who can flip any of them. The coordinator launches no cloud agent for a `Runs: local` step; it hands that step to Bob. Plans written before this rule are not retrofitted.

**Requirement review before build.** Requirements are checked before code, so building does not stall on a question that was answerable earlier.

- **Planning.** Before a step is scheduled, Wright and Gamewright review its requirements (PRD refs, acceptance criteria, rulings) and resolve conflicts or gaps between them. Only open items that need Bob's ruling go to Bob, as one multiple-choice question at a time.
- **Whole track, once.** Before the first batch of a plan or runbook, `requirement-review` reads every remaining step together and reports any later step that changes, hides or removes what an earlier step builds (visuals step 10 made step 8's still plate unreachable, after step 8 had spent its rounds tuning it). Fix the order or the scope before building; do not find it in review.
- **UI rulings up front.** Questions a UI step is bound to raise (what shows at small heights, what text gets cut, what is on top of what) are asked before code, not listed as "spec holes" in the PR.
- **`Runs: local` steps.** The session opens with a requirement review by Claude Code (the `requirement-review` agent) with Bob present: conflicts, missing or untestable acceptance criteria, open rulings, and `Touches` outside the step's scope. Bob's answers are recorded before building starts.
- **`Runs: cloud` steps.** The cloud agent's first action is a short requirement check against the PRD and the step. If it finds a genuine blocking question, it stops before writing code and reports the question; the coordinator relays it to Bob. Otherwise it proceeds without stopping. Escalation to Bob should be rare.
- **Record.** The findings and answers go in the PR body under `Requirement review`.

### 2. One worktree per step

- `pnpm wt <branch>` fetches `origin/main`, runs `git worktree add ../BloodTower-work/<branch> -b <branch> origin/main` (local `main` when there is no remote), `pnpm install --frozen-lockfile` there, and writes `.wt.json`: the step's offset, its ports and its SQLite folder. Up to 9 worktrees at once.
- Worktrees live in `~/Development/Personal/BloodTower-work/<branch>`, are removed with `pnpm wt:rm <branch>` after the PR merges, and the empty folder is removed too.
- `pnpm wt:rm <branch>` removes a clean worktree (node_modules, `.wt.json`, `.wt-data/` go with it) and deletes the branch once `main` holds it, including by squash-merged PR. It keeps a branch with unmerged work.
- A developer agent works only inside its own worktree. The `worktree-guard` hook blocks edits and shell writes outside it (exit 2).
- Hooks resolve the branch and repo root from the folder the command runs in, never from the main checkout. A hook test runs the main-commit guard from inside a worktree.

### 3. No shared runtime state

| Resource | Rule |
|---|---|
| Dev server / Playwright ports | `.wt.json` `ports`: dev 4747 + 10·n, e2e 4748 + 10·n, game workbench 4897 + 10·n. App configs read them from `.wt.json` when it is there, and fall back to 4747/4748 in the main checkout. |
| SQLite files | Every database file of a step lives under `.wt.json` `dataDir` (`<worktree>/.wt-data/`); never a shared absolute path. |
| `pnpm-lock.yaml` / any `package.json` | Only the one step per batch marked `Deps change: yes`. |
| Generated files / snapshots | Stay inside the worktree; never written to the main checkout. |

### 4. Merging: pull requests, serial

1. The developer commits in its worktree, pushes the branch and opens a PR with `gh pr create`. The body names the plan step id and carries the evidence (the `pnpm check` exit code and test counts, what was not verified).
2. CI (`.github/workflows/check.yml`) runs Gitleaks on the pull request's commits. It runs `pnpm check` unless every changed path is under `research/game-design/`, `docs/`, `packs/`, `assets/stories/`, or `assets/app-icon/` (lite CI; Bob / Warden, 2026-10-25/26). A push to main that also touches any other path runs the full suite. The job name stays `check`.
3. The verifier (`.claude/agents/verifier.md`) is launched in a fresh context, never in the implementer's session. It posts the eval table on each head that A/B review reads, and after each code-changing fix round.
4. **Review loop, at most 3 rounds.** Each report ends in `Blocking: none` or `Blocking: <count>`. GitHub does not let an account approve its own PR and every agent posts as Bob, so the `Blocking:` lines are what count.
   - **Round 1, adversarial (Opus).** `adversary-bugs` attacks the diff: bugs, edge cases, races, security and privacy, tower safety, weak tests, plus every `REVIEW.md` pass. If the step claims PRD, AT or SC ids, `adversary-prd` (Haiku) checks those in parallel by reading; otherwise it does not run. Docs-only PRs get one Sonnet `adversary-bugs` pass for consistency and nothing else.
   - **Rounds 2 and 3, fix-check (Sonnet).** `adversary-bugs` with a Sonnet override reads only the open findings and `git diff <last reviewed sha>..HEAD`. It confirms each finding is fixed and that the fix broke nothing next to it. It does not hunt for new problems; a new blocker is allowed only when the fix itself caused it.
   - **Trust CI.** Reviewers do not run `pnpm install`, `pnpm check` or the full e2e suite: on a change outside the lite allowlist, CI and the developer did, on the same head. A lite docs/design/packs PR did not run the app suite. A reviewer may run single spec files or a throwaway probe to prove a suspicion.
   - **What blocks** (nothing else does): a regression against `main`; a `Done when` item that is not met, or not proven by a test that can fail; a broken standing rule (tower safety, privacy, D7-style message rules, unknown shown as zero, an error eaten, hidden or not shown to the person whose action caused it, in code the PR adds or changes); a change outside `Touches` or an unflagged dependency change. Everything else is non-blocking: a nit (cap 5), a spec hole for Bob, or a follow-up the coordinator files as an issue.
   - **Short reports.** At most about 1,500 characters: findings with file, line, what breaks and how to reproduce. No restated test counts or measurement tables unless they prove a blocker. Later rounds and the developer read every report, so length costs every round after it.
   The developer fixes the blocking findings, pushes, and answers on the PR in one short comment (finding → commit). Claude Code's agent `model:` field takes an alias (`opus`, `sonnet`, `haiku`) or a full Claude model id, and the Agent tool can override it per call; that is how rounds 2 and 3 run `adversary-bugs` on Sonnet.
5. **Merge** when CI is green and the latest review says `Blocking: none` (and `adversary-prd`'s round 1 report, when it ran). A feature PR also needs the eval table all-pass on the head. Docs-only, design, art, and pack PRs have no eval table. The coordinator merges one PR at a time, in the batch's merge order: `gh pr update-branch` if `main` moved, wait for CI again, then `gh pr merge --squash --delete-branch`. A conflict or a red check after an update goes back to the developer and counts as a new round.
6. **Escalation.** If the same EV fails in 2 rounds in a row, or if round 3 ends with blocking findings still open, the coordinator labels the PR `needs-bob`, disables auto-merge on it (`gh pr merge --disable-auto`, a no-op while auto-merge is unavailable), stops that step, and reports it to Bob with the open findings. Steps that depend on it wait; the rest of the batch continues. Bob decides: fix himself, re-scope the step, override a finding, or drop it.
7. `pnpm wt:rm <branch>` after the merge.

Branch protection on `main` requires the `check` status and an up-to-date branch, so a red or stale PR cannot merge. The adversary condition stays the coordinator's to enforce. `pnpm land` stays as an optional local recheck.

### 5. Evidence per batch

When a batch has merged, the coordinator posts one summary (as a comment on the last PR of the batch, and in its report): per PR the link, CI result, verifier result, adversary rounds used and findings fixed, any `needs-bob` escalation, and the merge order used. Bob may read it; nothing waits for him unless the next step is a gate.

### 6. Coordinator

`.claude/agents/coordinator.md`:

- reads the approved plan and the next batch whose dependencies are met,
- runs `pnpm wt` for each step and starts one developer agent per worktree,
- runs the verifier in a fresh context (the eval table on each head that A/B review reads, and after each code-changing fix round) and the review loop on each PR for up to 3 rounds, merges PRs serially as in §4, and escalates with `needs-bob`,
- writes the batch summary,
- stops at a gate step and asks for Bob's sign-off,
- never commits to `main`, never edits intent, never merges a PR without green CI and `Blocking: none` from the latest review, never merges a feature PR whose eval table is not all-pass on the head, and never starts a step outside the approved plan.

Start with two or three agents per batch. Raise the cap once first-pass CI success stays high.

### 7. Token budget

Token use and wall-clock time are the same problem here: on 2026-10-19 the visuals track hit the plan's session limit twice and sat idle for about 4 h 50 m (PRs #94 and #99).

- **One heavy track at a time.** Do not run two Opus-heavy tracks (a coordinator batch and a separate Opus build session) on the same plan limit at once.
- **Fresh coordinator per batch.** Start a new coordinator session for each batch; do not keep one session running all day.
- **Link, do not paste.** Brief a developer with the PR number and the finding ids, not the text of every report.
- **Opus where it pays.** Round 1 review, and steps marked `Model: opus`. Everything else runs on Sonnet or Haiku.

## Metrics we'll actually glance at

- First-pass `pnpm check` success per step (leading)
- Steps whose plan had to be rewritten mid-way (leading)
- Hardware verification pass rate per capability (lagging, tower apps)
- Adversary blocking findings per merged PR, and rounds used (lagging). Recurring ones go into `CLAUDE.md` as known mistakes.
- PRs escalated with `needs-bob` per batch (lagging). More than one per batch means steps are too big or the plan is unclear.
- Rebase or update-branch conflicts per merged PR (leading). Recurring ones mean the `Touches` sets are too coarse.
- First-pass CI success per PR (leading).
- Batch wall-clock time vs. the same steps run serially (lagging).
- Time a PR waits between green CI and merge (lagging). It shows whether serial merging is the bottleneck.
- Gate turnaround: time from a gate step becoming ready to Bob's sign-off (lagging).
- Tokens per merged PR, from the session transcripts (lagging). Baseline for visuals steps 6-10 (PRs #89-#99): about 88M for 5 PRs.
