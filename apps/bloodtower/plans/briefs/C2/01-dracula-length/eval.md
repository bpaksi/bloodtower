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
- Requirement: only Dracula changes (DEC-502 scopes the cut to Dracula's settings); the test pack (Proving Grounds) keeps all its settings, Long included.
- Method: unit
- How: on PR head, run `git diff origin/main...HEAD -- packs/test`, and run the existing `apps/bloodtower/src/server/pack/load.test.ts` case "passes the v2 test pack" (in `describe("pack:lint")`, not skipped).
- Pass evidence: the `git diff` output is empty, and the "passes the v2 test pack" case exists unskipped and unedited, runs, and passes.
- Fails if: anything under `packs/test` changes, the "passes the v2 test pack" case is skipped or edited, or it fails.

### EV-04 — The pack still lints
- Requirement: the edited pack is valid.
- Method: unit
- How: `pnpm check` on the PR head (it runs the pack loader tests).
- Pass evidence: exit 0.
- Fails if: the YAML is broken or a test elsewhere still expects Long.

### EV-05 — Long is gone from the Dracula pack only
- Requirement: Dracula's pack data lists no Long length; the lengths are exactly Short and Standard, default Standard (DEC-502, DEC-508; Bob ruling 2026-10-31 19:28). Other packs and tests keep Long (Proving Grounds under EV-03: empty `packs/test` diff plus the v2 test-pack lint case; the `w3-pick-story.spec.ts` absence check under EV-02).
- Method: unit
- How: `rg -n -i 'long' packs/dracula/pack.yaml` on PR head, plus the EV-01 test "dracula offers short and standard only" in `apps/bloodtower/src/server/pack/load.test.ts`. Specs under `apps/bloodtower/src/e2e/tests` are out of scope and stay unchanged.
- Pass evidence: the `rg` returns no length entry with id `long` or label `Long`; the Dracula length options are exactly `short` and `standard` with default `standard`, and the EV-01 test passes.
- Fails if: `packs/dracula/pack.yaml` still has a `long` length option, Long is hidden instead of removed, the cut touches another pack, or any e2e spec is edited for this change.

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
