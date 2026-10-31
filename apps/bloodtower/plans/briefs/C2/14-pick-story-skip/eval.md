Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C2 / 14-pick-story-skip — Bugfix: Pick story always shows and waits for a press

- Brief: ./plan.md
- Risk: Medium. One restore eval (EV-05).

## Checks

### EV-01 — The reproducing test fails before the fix and passes after
- Requirement: the bug is reproduced test-first (`bugfix` skill).
- Method: playwright
- How: the test from step 2 of plan.md, in `w3-pick-story.spec.ts`; the PR's first commit holds it alone.
- Pass evidence: the PR body has the failing run on the first commit and the passing run on the fix commit, both quoted.
- Fails if: the test was written after the fix, or passes on the first commit.

### EV-02 — Pick story waits for a press
- Requirement: Pick story always shows and waits before Game settings (DEC-715).
- Method: playwright
- How: cold start with the mock tower, the Enter, New game. Wait 5 s on Pick story.
- Pass evidence: the board still shows Pick story after the wait, and Game settings shows only after an iPad press.
- Fails if: Game settings or any later screen shows with no press.

### EV-03 — Every loaded story is a door
- Requirement: Pick story shows every loaded story, Dracula included (DEC-715, SCR-007).
- Method: unit
- How: server test: load `packs/` as the host does, project the Pick story view.
- Pass evidence: the view has one door per story pack (Proving Grounds and Dracula today), Dracula marked not playable. A pack that fails to load is logged as an error with its id.
- Fails if: a story pack is missing from the doors with no error logged.

### EV-04 — The iPad shows the carousel controls
- Requirement: with two or more doors the iPad shows previous and next and the Choose button (UI-016).
- Method: playwright
- How: same as EV-02, at the ipad viewport.
- Pass evidence: previous and next move the focused door and wrap; the board's focused cover follows; choosing Dracula stops on not-ready (SCR-009) and binds nothing.
- Fails if: the iPad shows only one button, or the board does not follow.

## Survival evals (one per survival invariant in plan.md)

### EV-05 — Continue and the focus survive a restart on Pick story
- Requirement: Continue stays on Pick story while an autosave exists, and the focused door survives a host restart (DEC-283).
- Method: playwright
- How: quit a game, New game, focus Dracula, restart the host, rejoin.
- Pass evidence: Pick story shows with Dracula focused and Continue offered above the stories.
- Fails if: the focus resets, Continue is gone, or the flow skips Pick story.

## Assumptions surfaced

- The bug may already be gone after features 05 to 08, which rework the same flow. Then the developer stops at step 2 and reports, and this feature closes with no code → `bugfix` skill, step 2.
