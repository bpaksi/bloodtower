# Bob's check of 20 labels

Step 1 of [plan.md](plan.md). Bob answers one at a time: does Claude's label (under today's §4) hold?

The 20 are the 14 findings where today's label and the reviewer's call disagree, plus 6 agreements spread over the labels. Full text and links are in [findings.jsonl](findings.jsonl).

| # | Finding | Reviewer | Claude's label | Bob | Agree |
|---|---|---|---|---|---|
| 1 | F-024 test-pack copy still says Alpha/Delta | blocking | non-blocking | | |
| 2 | F-031 camera clock starts on fetch, not mount | blocking | non-blocking | | |
| 3 | F-037 n2 sidecar untested (data-only moment) | blocking | non-blocking | | |
| 4 | F-048 Escape as first input leaves board silent | blocking | non-blocking | | |
| 5 | F-051 pack with 17 options freezes the session | blocking | non-blocking | | |
| 6 | F-057 end guard has no unit test that can fail (e2e does) | blocking | non-blocking | | |
| 7 | F-058 stale finish event, not reachable by people | blocking | non-blocking | | |
| 8 | F-017 Keeper lines 2 and 3 not proven by a test | non-blocking | done-when | | |
| 9 | F-022 "join chrome gone" test cannot fail | non-blocking | done-when | | |
| 10 | F-025 loosened lint test passes with the still missing | non-blocking | done-when | | |
| 11 | F-049 no test pins the sting gate | non-blocking | done-when | | |
| 12 | F-050 "board has no controls" check misses outside main | non-blocking | done-when | | |
| 13 | F-070 glow-under-dialog hit-test cannot fail | non-blocking | done-when | | |
| 14 | F-075 dialog frame test cannot fail | non-blocking | done-when | | |
| 15 | F-006 stale battery 0 shown as 0% | blocking | standing-rule | | |
| 16 | F-053 "Now acting" names a made-up hunter | blocking | standing-rule | | |
| 17 | F-040 untracked stills letterbox (worked on main) | blocking | regression | | |
| 18 | F-059 flaky e2e will turn CI red at random | blocking | regression | | |
| 19 | F-077 Enter on MEC-012 opens MEC-010 | blocking | done-when | | |
| 20 | F-062 file outside Touches, deviation recorded in plan | non-blocking | non-blocking | | |

Agreement: pending. Step 2 starts only at 18 of 20 or better (plan.md, step 1).
