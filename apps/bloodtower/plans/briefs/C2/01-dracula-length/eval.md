Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C2 / 01-dracula-length — Take Long out of the Dracula settings

- Brief: ./plan.md
- Mockup: none
- Risk: Low

## Checks

### EV-01 — Dracula offers Short and Standard only
- Requirement: Dracula's Length setting has the options Short and Standard, default Standard (DEC-502, DEC-508).
- Method: unit
- How: a new test in `apps/bloodtower/src/server/pack/load.test.ts`, "dracula offers short and standard only", that loads `packs/dracula/pack.yaml` from the repo (not a fixture).
- Pass evidence: the length option ids are exactly `["short", "standard"]` in that order, and the default is `standard`.
- Fails if: Long is still listed, an option was renamed, or the default changed.

### EV-02 — Choose on Dracula skips straight to Not playable yet
- Requirement: Dracula keeps the live skip: Choose on Dracula goes straight to the "Not playable yet" screen, with no Game settings screen (Bob ruling 2026-10-31 19:28; DEC-508 cut is data-only).
- Method: playwright
- How: the existing `w3-pick-story.spec.ts` test "Choose on Dracula stops, and Back still chooses Proving Grounds", plus all of `w4-party.spec.ts`, on PR head, unchanged.
- Pass evidence: after `continue-pick-story-dracula` the heading "Not playable yet" is visible, no "Game settings" heading appears, and both specs pass.
- Fails if: a Game settings screen (or any length buttons) shows between Choose and "Not playable yet", or either spec is edited to pass.

### EV-03 — The test pack is untouched
- Requirement: only Dracula changes (DEC-502 scopes the cut to Dracula's settings).
- Method: unit
- How: the existing `load.test.ts` case "loads the test pack with its cover, tower and settings".
- Pass evidence: `git diff origin/main...HEAD -- packs/test apps/bloodtower/src/server/pack/__fixtures__` is empty, and the test-pack case passes.
- Fails if: the build edits a fixture or `packs/test` to make a test pass.

### EV-04 — The pack still lints
- Requirement: the edited pack is valid.
- Method: unit
- How: `pnpm check` on the PR head (it runs the pack loader tests).
- Pass evidence: exit 0.
- Fails if: the YAML is broken or a test elsewhere still expects Long.

### EV-05 — w3-pick-story still green
- Requirement: no spec expects Long (P:14).
- Method: playwright
- How: `w3-pick-story.spec.ts` on PR head.
- Pass evidence: passes; `rg -n 'data-option="long"|"Long"' apps/bloodtower/src/e2e/tests` returns 0 hits.
- Fails if: any spec still expects Long.

### EV-06 — Choose on Dracula lands on Not playable yet (screenshot)
- Requirement: Dracula keeps the live skip; the YAML cut (Short and Standard, default Standard, Long removed, proven by EV-01 in `load.test.ts`) adds no screen (Bob ruling 2026-10-31 19:28). The Game settings mockup (mockup.html) is superseded by this ruling.
- Method: screenshot
- How: (iPad portrait 768×1024) the screen captured by `w3-pick-story.spec.ts` "Choose on Dracula stops, and Back still chooses Proving Grounds" right after Choose on Dracula.
- Pass evidence: heading "Not playable yet"; no heading "Game settings"; no element with text "Length", "Short", "Standard" or "Long" in `[data-screen]`; EV-01 passes on the same head.
- Fails if: any Game settings screen or length button appears after Choose on Dracula, or EV-01 fails.

## Survival evals (one per survival invariant in plan.md)

None: Dracula cannot be played, so it has no autosave.

## Assumptions surfaced

- The default stays Standard → DEC-508.
