Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 19-quest-type-and-markers — A scene quest may omit `quest_type`; markers per chapter; one quest per space

- Brief: ./plan.md
- Mockup: none
- Risk: Med.

## Checks

### EV-01 — A scene quest may omit `quest_type`
- Requirement: Bob's ruling (2026-11-14): `quest_type` is optional.
- Method: unit
- How: schema test parses a quest with a `scene` and no `quest_type`.
- Pass evidence: it parses, and the loaded quest has no type.
- Fails if: the parse fails, or a default type is invented.

### EV-02 — A quest with neither type nor scene fails lint
- Requirement: Omitting the type is only allowed for a scene quest.
- Method: unit
- How: lint test with a quest that has no `quest_type` and no `scene`.
- Pass evidence: lint fails naming the quest id.
- Fails if: lint accepts it.

### EV-03 — Existing packs load unchanged
- Requirement: No pack changes meaning.
- Method: unit
- How: `pnpm -F bloodtower-server pack:lint` over `packs/base`, `packs/dracula` and `packs/test` as on main, and the existing schema and quest tests unedited.
- Pass evidence: zero issues; no existing test edited.
- Fails if: any pack gains an issue or an existing test needs editing.

### EV-04 — A chapter's markers are live only in that chapter
- Requirement: A quest in chapter 3 cannot open in chapter 1.
- Method: unit
- How: configure the quest store from a pack with a quest in chapter 1 and one in chapter 3; look up each quest's space while chapter 1 is current, then while chapter 3 is current.
- Pass evidence: in chapter 1 only the chapter-1 quest resolves; in chapter 3 only the chapter-3 quest resolves; the other space resolves to nothing.
- Fails if: either chapter's quest resolves while another chapter is current.

### EV-05 — Two quests may not share a space
- Requirement: One marker per space.
- Method: unit
- How: lint test with two quests on the same `place.space` in one story.
- Pass evidence: lint fails and names both quest ids; two quests on different spaces pass.
- Fails if: lint accepts the pair, or names only one quest.

## Survival evals (one per survival invariant in plan.md)

### EV-06 — An older autosave restores its markers
- Requirement: Continue keeps working.
- Method: unit
- How: snapshot a quest store with the pre-step shape, restore it, then look up a marker in the chapter it was saved in.
- Pass evidence: restores whole; the marker resolves to the same quest as before the step.
- Fails if: restore throws, or the marker is lost or resolves to another quest.

## Assumptions surfaced

- How the quest store learns the current chapter is the developer's choice; EV-04 pins the behaviour.

## OPEN questions

- None.

## Eval approval

- See ./approval.md (must be filled before coding).
