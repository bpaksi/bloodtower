# research/jev

Can Jev (TypeSafe's decision model) tell whether a review finding blocks under [docs/sdlc.md](../../docs/sdlc.md) §4? The plan is in [plan.md](plan.md).

| File | What |
|---|---|
| [plan.md](plan.md) | Steps, rubric, schema, Bob's answers |
| [findings.jsonl](findings.jsonl) | 85 past review findings, each labeled against today's §4 |
| [labels-check.md](labels-check.md) | Bob's check of 20 labels |

## The labeled set (step 1, 2026-10-21)

85 findings from 22 merged or closed PRs (#22 to #132), out of 218 review reports across 63 PRs. Labels are Claude's, judged against today's §4 rules, including for reports written before #102 added the "What blocks" list.

| | Count |
|---|---|
| Findings | 85 |
| Reviewer said blocking | 43 |
| Reviewer said non-blocking | 42 |
| From PRs that reached `needs-bob` or ran past round 3 (#25, #78, #99) | 24 |

By label:

| Label | Count |
|---|---|
| `done-when` | 35 |
| `regression` | 6 |
| `standing-rule` | 2 |
| `touches` | 0 |
| `non-blocking` | 42 |

By app: bloodtower 69, game-workbench 9, tower-poc 5, burgomaster-funeral-poc 2.

By period: before #102, 59; after #102, 26.

## Where today's rules and the reviewer disagree

- **Blocked then, not blocking today: 7 of 43** (16%): F-024, F-031, F-037, F-048, F-051, F-057, F-058. Each is an edge case or a detail that no `Done when` names, such as a pack with 17 options (F-051), a first key press that is Escape (F-048), or three phase changes in one frame that a reviewer said people cannot produce (F-058). Four of the seven come from two of the escalated PRs (#78, #99).
- **Not blocked then, blocking today: 7 of 42** (17%): F-017, F-022, F-025, F-049, F-050, F-070, F-075. All seven are a test that cannot fail for something the step claims. §4 counts that as an unmet `Done when`, but reviewers often filed it as a follow-up.

So the old rules did not simply block too much. They blocked edge cases and let weak tests through, about equally often. Both kinds are what step 2 asks Jev to sort.

## Limits

- One labeler. Bob's check of 20 labels is the only second opinion.
- `done_when` is empty on every row. Step 2 fills it from the plans before any Jev call.
- bloodtower supplies 81% of the findings, because most review rounds ran there.
- No `touches` finding came up in these PRs. Step 2 cannot measure that label.
