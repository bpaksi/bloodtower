Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 03-ruined-keep-pack — The Ruined Keep pack: chapters, quests, scenes and endings as data

- Brief: ./plan.md
- Mockup: none
- Risk: Med.

## Checks

### EV-01 — The pack lints clean
- Requirement: The Ruined Keep pack passes pack lint (DEC-697).
- Method: unit
- How: `pnpm -F bloodtower pack:lint packs/test`.
- Pass evidence: zero issues.
- Fails if: any issue.

### EV-02 — Three chapters, six quests, in DEC-662's places
- Requirement: The skeleton is DEC-636 as DEC-662 words it.
- Method: unit
- How: lint test "ruined keep skeleton".
- Pass evidence: chapter 1 The Roads: The Herald (village), The Ambush (wild); chapter 2 The Keep: The Barrow (Tomb), The Shrine (sanctuary); chapter 3 The Tower: The Lock, The Last Stand, then the finale. Kingdoms open as DEC-662 says (Arisilon, then Brynthia, then the whole board).
- Fails if: a quest is in the wrong chapter or type, or a seventh quest exists.

### EV-03 — Plain scene options obey DEC-692 and DEC-693
- Requirement: 1 to 3 effects, at most one battle; costs only gold, hit points or corruption.
- Method: unit
- How: lint test: a copy of The Ambush with a fourth effect, and one with an item cost.
- Pass evidence: both fail lint with the option's ID; the shipped pack passes.
- Fails if: lint accepts either bad copy.

### EV-04 — The endings branch on a flag
- Requirement: The last choice sets a flag; the win scene picks its line by that flag (DEC-664).
- Method: unit
- How: lint test reads the Tower end hook and the win scene.
- Pass evidence: two options, each setting a distinct flag; two win lines, each conditioned on one flag; one loss scene per way to lose (DEC-144, DEC-043).
- Fails if: a win line has no condition, or a loss way has no scene.

### EV-05 — Copy stays placeholder
- Requirement: No story copy is invented in this feature.
- Method: unit
- How: scan every player-facing string in the pack.
- Pass evidence: each starts with `[COPY:`.
- Fails if: a string is written prose.

### EV-06 — The title players see
- Requirement: The Ruined Keep is the shown title; Proving Grounds the ID (DEC-665, DEC-666).
- Method: playwright
- How: `w3-pick-story.spec.ts`.
- Pass evidence: the cover reads The Ruined Keep; the URL/state pack ID is `test`.
- Fails if: the cover still reads Proving Grounds.

## Survival evals (one per survival invariant in plan.md)

### EV-07 — An autosave still matches the pack
- Requirement: DEC-666: nothing gets renamed.
- Method: unit
- How: autosave on the old slice pack; load the new pack.
- Pass evidence: the autosave is matched to pack `test` (it may be refused as an older version per feature 01's rule, never mismatched to another story).
- Fails if: the autosave points at a missing pack.

## Assumptions surfaced

- The quest places, item effects and kingdoms come only from DEC-662, DEC-672 to DEC-674; anything those cards do not name stays a `[COPY: ...]` or OPEN.

## OPEN questions

- Q-C3-09: DEC-666 says the pack ID is Proving Grounds, but the folder's `pack_id` is `test`. Rename to `proving-grounds`, or keep `test`?
- Q-C3-10: which spaces hold The Ambush ("a wild space"), The Lock and The Last Stand? DEC-662 names the kingdom only; P-003 used Muted Forest, Howling Desert and The Grass Sea. Are the probe's spaces the ruling?
- Q-C3-22: with Fight hidden, The Ambush finishes only by paying the toll (DEC-662). The toll amount is not carded, and a group that cannot pay cannot win chapter 1. What is the toll, and what happens when the purse is short?
- Q-C3-11: The Last Stand's foe: DEC-647 draws a random level-3 foe. Is that the intent, or does the story name the oathsworn guard?
