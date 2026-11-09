# A1 + P2 build runbook

Builds asset-studio P2 S3-fix to S9 (release 0.2), then Bloodtower A1 steps 2 to 8, up to Bob's G-A1. Claude is the manager only: it makes worktrees, briefs and launches subagents, runs the review loop, merges, and keeps this file current. It writes no product code itself.

**Bob's rulings, 2026-11-08:** every code-writing subagent runs on Sonnet ("use Sennett for the code writing sub agents"). No art generation today: no real image-provider call, no A1-4 render and no G-A1 art run until Bob lifts the hold; code and tests with fake providers go on. Claude handles S9, the 0.2 release, on Bob's npm login ("Can you handle S9"). "Yes, merge on green": Claude squash-merges once CI is green and the latest review says `Blocking: none`. S7 Touches widened ("Grant all four"). "Let's go with your recommendations, can review after build": multi-profile keys `<id>~<profile>`, job sounds stored as drafts, and the manager's later defaults.

**Assumption, not a ruling:** Claude runs asset-studio's remaining P2 steps, since Bob asked for this plan to build them. Before each step starts, Claude checks for an open PR or `agent/*` branch on that step and stops it if one exists.

Sources: [P2 plan](https://github.com/bpaksi/asset-studio/blob/main/plans/P2-asset-studio.md), [A1 plan](A1-asset-adapter.md), [A1-P2 requirements](../../../research/game-design/specs/A1-P2-requirements.md), asset-studio briefs `plans/briefs/P2-step-{3-store-correctness,5,7}.md`. P2 S10 to S15 and A1 steps 9, 10 and G-A1b (1.1) are out of scope.

## Waves

Each wave starts when everything it depends on has merged. Steps in one wave run in parallel, each in its own worktree with its own developer.

| Wave | Repo | Steps (parallel) | Depends on | Notes |
|---|---|---|---|---|
| W0 | asset-studio | **S3-fix** store correctness (brief in #20) · **S3-seam** `render`/`export`/`studio` command registry in `bin/` · briefs for S4, S6, S8, S9 (docs) | #20 merged | S3-seam is new: it lets S4, S5, S7 and S8 each register a command without touching `bin/`. A small tweak to P2, recorded in P2 in the same PR |
| W1 | asset-studio | **S4** voice · **S5** pictures/glow · **S7** studio · **S8** export | W0 | Merge order S5, S4, S8, S7 (S5 owns the `sharp` lockfile change; S7 rebases its lockfile after) |
| W2 | asset-studio | **S6** AI pictures/stills/masks | S5 | Can start as soon as S5 merges, while S4, S7 and S8 are still in review |
| W3 | asset-studio | **S9** release prep PR | S4–S8 | Claude: first hand publish of `@asset-studio/cli` and `/studio` on Bob's npm login, their trusted publishers, the tag, and the fresh-folder install check |
| W4 | bloodtower | **A1-2** `assets:needs` | S9 on npm | |
| W5 | bloodtower | **A1-3** lint · **A1-4** render · **A1-6** import/retirements | A1-2 | Merge order 3, 4, 6. A1-4 and A1-6 are `Runs: local`; their code and fake-provider tests run in subagents, the paid-key and OneDrive evidence waits for Bob's OK |
| W6 | bloodtower | **A1-5** `assets:pack` | A1-3, A1-4 | |
| W7 | bloodtower | **A1-7** board asset ID · **A1-8** `bt-assets` skill | A1-5 (A1-8 also 4, 6) | |
| G-A1 | — | Bob's sign-off on the Mac and the TV | A1-7, A1-8 | Stop here |

At most four developers run at once.

## Per-step loop

1. **Brief check.** Before a wave starts, one `requirement-review` subagent reads every brief in it against P2/A1, the requirements doc and the Touches of the other steps in the wave. Overlaps, gaps and questions come to Bob before any developer starts.
2. **Build.** `developer` subagent in a fresh worktree (asset-studio: `../asset-studio-work/<branch>`; bloodtower: `pnpm wt <branch>`). It builds to the brief's `Done when`, runs `pnpm install --frozen-lockfile` and `pnpm check`, pushes and opens the PR with the AC evidence. It never merges or publishes.
3. **Review.**
   - asset-studio (its AGENTS.md: two reviews on different models): round 1 is Review A, an Opus adversarial attack (bugs, races, store integrity, the brief's survival invariants), and Review B, a Sonnet review against the brief's ACs and requirement ids. Rounds 2 and 3 are Sonnet fix-checks of earlier findings only.
   - bloodtower (`docs/sdlc.md` §4): `verifier` once, then `adversary-bugs` (Opus) in round 1, plus `adversary-prd` when the step claims PRD ids; Sonnet fix-checks in rounds 2 and 3.
   - Findings go back to the same developer (SendMessage), never to a new one.
4. **Merge.** One PR at a time, squash, `--match-head-commit`, once CI is green and the latest review says `Blocking: none`. After round 3 with blockers left: label `needs-bob` and stop that step; the rest of the wave goes on. Docs-only PRs merge on green.
5. **Record.** The step's Result line in P2 or A1 and the Status table below, in the step's own PR where it can be, otherwise a docs PR at the end of the wave.

## Bob's touchpoints

- Lift the art hold before A1-4's real render and G-A1.
- Any npm or GitHub step that asks for a one-time code or a browser sign-in during S9.
- A1-6: access to the OneDrive backup.
- Any `needs-bob` PR, and G-A1.

## Status

Updated 2026-11-09.

| Step | PR | State |
|---|---|---|
| P2 S1 to S9 (bpaksi/asset-studio) | #15 to #33 | merged. 0.2.1 was partial (formats and player only); **0.2.2 published all four packages on 2026-11-09** |
| A1-2 `assets:needs` | #398 | merged |
| A1-4 `assets:render` | #399 | merged (A1-4c real render pending Bob) |
| A1-3 lint | #400 | merged |
| A1-6a `assets:import` | #401 | merged |
| A1-5 `assets:pack` | #404 | merged |
| A1-8 `bt-assets` skill, `assets:redo` | #405 | merged |
| A1-7 board asset ID | #406 | merged |
| A1-6b retirements | — | pending Bob (OneDrive backup record; guarded by `BT_TTS_BACKUP_DONE`) |
| G-A1 | — | pending Bob |

## Open for Bob

- 272 Dracula `~no-agnes` variant lines are silent as `invalid-id` (asset-studio's id pattern rejects `~` inside the id).
- The 7 `*-whisper` cast entries get duplicate portraits (35).
- `assets:needs` emits the `music` kind but the lint refuses it (A1-15).
- Partial-pack ruling A: A1-19 warns outside `--release` (D45). Confirm.
- Studio mode always fails `AS-GLOW-2` for a story with a glow mask (D43, D47).
- G-A1-01 "the board plays the line once" has no A1 step that plays a packed line. Add a playback step, or reword G-A1.
- A1-4c: the real render of 3 Dracula lines, after the art hold.
- 6b: the OneDrive backup of tts-explorer's `audio-cache/`.
- 12 e2e tests fail on main (w1-chrome 2, w4-party 4, w6-board-layers 3, w7-move-map 3). A separate fix session; the w6 test edit awaits Bob's OK.
- IMP-8 (A1-6a import test) times out at 60 s on a loaded machine; a fix PR is in progress.

## Process slip

During the A1-6a spike one dummy-key Gemini request was made (HTTP 400, no charge), against the no-provider-call rule. Later tests use a whitelisted env with no keys.
