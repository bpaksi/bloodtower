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

### EV-02 — Game settings for Vellmoor shows two buttons
- Requirement: the iPad's Game settings for Dracula offers two length buttons (DEC-508).
- Method: playwright
- How: `opening-screens.spec.ts`, the Vellmoor game-settings test, updated to expect `["Short", "Standard"]` and to pick Standard where it picked Long.
- Pass evidence: `[data-setting="length"] button[data-action="set"]` has exactly the texts Short, Standard. No summary line is asserted (the approved mockup has none).
- Fails if: a third button shows, or the test still clicks `data-option="long"`.

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

### EV-06 — Screen matches mockup (M "Dracula settings")
- Requirement: Game settings matches the approved mockup.
- Method: screenshot
- How: (iPad portrait 768×1024) open Game settings for Dracula.
- Pass evidence: heading "Game settings"; label "Length"; exactly two buttons under it, "Short", "Standard" in that order; "Standard" selected; no element with text "Long" in the DOM. (Body buttons only: `[data-screen] button`, excluding the bottom-bar Menu gear `bt-iconbtn`.)
- Fails if: a "Long" button exists in any state (incl. `disabled` or `display:none`).

## Survival evals (one per survival invariant in plan.md)

None: Dracula cannot be played, so it has no autosave.

## Assumptions surfaced

- The default stays Standard → DEC-508.
