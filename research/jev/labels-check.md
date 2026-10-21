# Bob's check of 20 labels

Step 1 of [plan.md](plan.md). Bob answers one at a time: does Claude's label (under today's §4) hold?

The 20 are the 14 findings where today's label and the reviewer's call disagree, plus 6 agreements spread over the labels. Full text and links are in [findings.jsonl](findings.jsonl).

Bob answered 1 to 5 on 2026-10-21, all in agreement with Claude's label. At 6 he wrote "Please use good judgement on this and the rest", so 6 to 20 are Claude's second pass, not Bob's. They are marked `bob_checked: false` in findings.jsonl.

| # | Finding | Reviewer | Claude's label | Check | Agree |
|---|---|---|---|---|---|
| 1 | F-024 test-pack copy still says Alpha/Delta | blocking | non-blocking | Bob: non-blocking | yes |
| 2 | F-031 camera clock starts on fetch, not mount | blocking | non-blocking | Bob: non-blocking | yes |
| 3 | F-037 n2 sidecar untested (data-only moment) | blocking | non-blocking | Bob: non-blocking | yes |
| 4 | F-048 Escape as first input leaves board silent | blocking | non-blocking | Bob: non-blocking | yes |
| 5 | F-051 pack with 17 options freezes the session | blocking | non-blocking | Bob: non-blocking | yes |
| 6 | F-057 end guard has no unit test that can fail (e2e does) | blocking | non-blocking | Claude: kept | — |
| 7 | F-058 stale finish event, not reachable by people | blocking | non-blocking | Claude: kept | — |
| 8 | F-017 Keeper lines 2 and 3 not proven by a test | non-blocking | done-when | Claude: kept, low confidence | — |
| 9 | F-022 "join chrome gone" test cannot fail | non-blocking | done-when | Claude: kept, low confidence | — |
| 10 | F-025 loosened lint test passes with the still missing | non-blocking | done-when | Claude: kept | — |
| 11 | F-049 no test pins the sting gate | non-blocking | done-when | Claude: kept | — |
| 12 | F-050 "board has no controls" check misses outside main | non-blocking | done-when | Claude: kept | — |
| 13 | F-070 glow-under-dialog hit-test cannot fail | non-blocking | done-when | Claude: kept | — |
| 14 | F-075 dialog frame test cannot fail | non-blocking | done-when | Claude: kept | — |
| 15 | F-006 stale battery 0 shown as 0% | blocking | standing-rule | Claude: kept | — |
| 16 | F-053 "Now acting" names a made-up hunter | blocking | standing-rule | Claude: kept | — |
| 17 | F-040 untracked stills letterbox (worked on main) | blocking | regression | Claude: kept | — |
| 18 | F-059 flaky e2e will turn CI red at random | blocking | regression | Claude: kept, low confidence | — |
| 19 | F-077 Enter on MEC-012 opens MEC-010 | blocking | done-when | Claude: kept | — |
| 20 | F-062 file outside Touches, deviation recorded in plan | non-blocking | non-blocking | Claude: kept | — |

**Agreement: 5 of 5** on the labels Bob checked. They were the hardest kind: all five were blocked by the reviewer and are non-blocking today. The gate in plan.md (18 of 20) assumed 20 human checks. Bob's delegation stands in for the other 15.

## Second pass on 6 to 20

Each label was re-read against today's §4 and against Bob's five answers. In those answers Bob consistently treats edge cases that `Done when` does not name as non-blocking. No label changed.

- **Kept with confidence (12).** The edge-case calls (6, 7) follow the same line as Bob's answers. The weak-test calls (10 to 14) follow §4's own words, "not proven by a test that can fail", where the claim is the step's main deliverable. The standing-rule, regression and done-when agreements (15 to 17, 19, 20) match the reviewer.
- **Low confidence (3).** These are the first to recheck if step 2's results look off:
  - **F-017.** Whether Keeper lines 2 and 3 were a `Done when` item of R2 step 4 depends on wording that predates measurable `Done when` fields.
  - **F-022.** The weak test backs one item in a list of follow-up fixes in #58, not the step's main claim.
  - **F-059.** A flaky test is not a behaviour break on `main`. It is labeled a regression because it would turn CI red at random for later PRs. A reasonable reader could call it non-blocking.
