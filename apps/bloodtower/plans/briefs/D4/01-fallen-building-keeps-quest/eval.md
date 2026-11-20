Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: D4 / 01-fallen-building-keeps-quest — A fallen building keeps its quest: Enter, then Quest and Leave

- Brief: ./plan.md
- Mockup: none
- Risk: Med (quest reachability and progress; restore). Negative and restore evals are included.

All fixtures: the test pack (`packs/test/pack.yaml`): chapter 1's village quest `herald` at `N-egans-end`, chapter 2's village quest `shrine` at `E-greater-tombstones`. "Fallen" is 4 skulls (`setBuildingSkulls` or `~test-skulls:`), with fewer than 4 fallen in all so the game is not lost (DEC-915). One group of one hero with moves to spare unless named. "Open" is `openQuestAt` (live this chapter, not done). Tests are in `fallenQuest.test.ts` unless named. Source: DEC-910's R05 fixture.

## Checks

### EV-01 — Enter is offered at a fallen building with an open quest
- Requirement: DEC-910, DEC-641, MEC-036 Enter.
- Method: unit
- How: "EV-01". `N-egans-end` at 4 skulls, `herald` open; the group walks onto it with moves left.
- Pass evidence: an `enter--<group>--N-egans-end` prompt is offered; pressing it puts the group inside (`insideBuilding` true).
- Fails if: no Enter is offered, or `applyEnter` refuses.

### EV-02 — The menu is Quest, then Leave; nothing else
- Requirement: DEC-910, DEC-093, DEC-377, DEC-083.
- Method: unit
- How: "EV-02". After EV-01, open the menu; then try a Rally, Cleanse and Virtue-draw pick by id.
- Pass evidence: the menu labels are exactly `["Quest", "Leave"]`; each other pick is refused `not-offered` and changes no gold, move or skull.
- Fails if: Cleanse or any place's pick appears or is accepted, or Quest is not first.

### EV-03 — The quest keeps its progress; the pick costs 1 move
- Requirement: DEC-910, DEC-151.
- Method: unit
- How: "EV-03". Start `herald` at the standing building and Leave after its first step; skull the building to 4; come back, Enter, pick Quest.
- Pass evidence: the moves left drop by exactly 1; the quest resumes at the step it was left on (same quest id, same progress), not from the start.
- Fails if: progress resets, a new quest id appears, or the pick costs 0 or 2 moves.

### EV-04 — Done once
- Requirement: DEC-910 ("credit is paid once"), DEC-041.
- Method: unit
- How: "EV-04". Finish `herald` at the fallen site.
- Pass evidence: `herald` is in the done list once; the day's quests-won count rises by 1 once; the chapter's quests-done count includes it once.
- Fails if: it is counted twice, or not at all.

### EV-05 — After the quest is done, the space is plain fallen
- Requirement: DEC-910 (an unfinished marker only), DEC-943.
- Method: unit
- How: "EV-05". After EV-04, walk off and back on.
- Pass evidence: no Enter prompt; `openMenu` refuses `fallen`.
- Fails if: Enter is still offered, or an empty menu opens.

### EV-06 — No quest, or a marker not live: no Enter
- Requirement: DEC-093; C3/13 EV-10; C3/19 (a marker is live only in its chapter); DEC-943.
- Method: unit
- How: "EV-06". In chapter 1: (a) a fallen village with no marker; (b) `E-greater-tombstones` at 4 skulls, holding chapter 2's `shrine`, not live.
- Pass evidence: in both, no Enter prompt and `openMenu` refuses `fallen`.
- Fails if: either is enterable.

### EV-07 — The acting iPad's view: no fallen note while the quest is open
- Requirement: DEC-943.
- Method: unit
- How: "EV-07". Read the device view's acting group at (a) EV-01's space, (b) EV-05's space, (c) EV-06 (a)'s space.
- Pass evidence: (a) the flag that draws the fallen note is not set (or the sibling flag says the quest is open) and Enter is in the actions; (b) and (c) the fallen note's flag is set and Enter is not offered.
- Fails if: (a) carries the fallen note, or (b) or (c) loses it.

### EV-08 — A later chapter's quest on an already fallen building
- Requirement: DEC-942, DEC-613, DEC-088.
- Method: unit
- How: `chapter.test.ts` "D4 EV-08". In chapter 1 skull `E-greater-tombstones` to 4; win chapter 1 (no tower, `c3End: false`); chapter 2 enters.
- Pass evidence: `shrine`'s marker is on `E-greater-tombstones` (`openQuestAt` returns `shrine`); a group there is offered Enter; the menu is `["Quest", "Leave"]`; no other space holds `shrine`.
- Fails if: the marker is skipped or moved, or the space is not enterable.

### EV-09 — A fallen building still takes no skull and still counts
- Requirement: DEC-910, DEC-915, DEC-093.
- Method: unit
- How: "EV-09". EV-01's state; with the tower, list the skull-record prompts; without it, simulate 20 seeded drops into kingdom N (other N buildings standing).
- Pass evidence: no `skull-record--` prompt for `N-egans-end`; no simulated skull lands on it; the fallen-buildings count includes it.
- Fails if: it takes a fifth skull, or drops out of the fallen count because it holds a quest.

### EV-10 — Landing with no moves left
- Requirement: DEC-910 ("as any place"), MEC-036.
- Method: unit
- How: "EV-10". The group's last move lands on EV-01's space.
- Pass evidence: Enter and End turn are offered, as at a standing building; inside, Quest is listed and disabled for want of a move; Leave works.
- Fails if: Enter is not offered, or Quest can be picked with 0 moves.

### EV-11 — End to end on the iPad
- Requirement: DEC-910, DEC-943.
- Method: playwright
- How: `apps/bloodtower/src/e2e/tests/d4-fallen-quest.spec.ts`, iPad 768x1024 portrait. Seed with `~test-skulls:N-egans-end=4` and `~test-at:N-egans-end`; play to the first group's move map; press Enter; press Quest.
- Pass evidence: the move map shows Enter and no `[data-fallen-box]`; the menu shows exactly two rows, Quest then Leave; Quest opens `herald`'s first step.
- Fails if: the fallen note shows, Enter is missing, or the menu has any other row.

## Survival evals (one per survival invariant in plan.md)

### EV-12 — Continue keeps the marker, the progress and the result
- Requirement: survival invariants 1 and 2; DEC-675.
- Method: unit
- How: "EV-12". Save and restore (a) after EV-03's Leave with the building fallen; (b) after EV-04.
- Pass evidence: (a) skulls 4, `herald` open with the same progress; Enter and the two-row menu offered; (b) `herald` done once; the space plain fallen (no Enter).
- Fails if: a restore loses the marker or progress, re-opens a done quest, or counts it twice.

## Assumptions surfaced
- The test pack's `herald` and `shrine` stand in for any village quest; the rule is the same for any building type.
- Entering is free and the Quest pick costs 1 move, as at any place (DEC-910).
- The device change is a flag in the view; no new component, copy or mockup state (DEC-943).
