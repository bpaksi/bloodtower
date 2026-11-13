Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 18-pack-v2-scene-data — Pack v2 holds quests with places, plain scenes, items and endings

- Brief: ./plan.md
- Mockup: none
- Risk: High.

## Checks

### EV-01 — Existing packs still load
- Requirement: New fields are optional; no pack changes meaning.
- Method: unit
- How: schema test and `pnpm -F bloodtower-server pack:lint` over `packs/base`, `packs/dracula` and `packs/test` as they stand on main.
- Pass evidence: zero issues on all three; their loaded form is unchanged.
- Fails if: any existing pack gains an issue or a changed load.

### EV-02 — A quest holds its place and type
- Requirement: A quest names its space, and its type can be village or wild.
- Method: unit
- How: schema test parses a quest with `place` and each type; a quest with an unknown type or an unknown key fails.
- Pass evidence: both parse and read back; the bad ones fail with the field named.
- Fails if: the place is dropped on load, or an unknown key is accepted.

### EV-03 — A scene holds options, costs, items and effects
- Requirement: The pack can state everything `PlainScene` states.
- Method: unit
- How: schema test round-trips the Herald, Ambush and Lock scenes from `quest/fixtures.ts` (YAML to loaded form to the same `PlainScene`).
- Pass evidence: each loaded scene deep-equals its fixture.
- Fails if: any option, cost, needed item, effect or battle flag is lost or changed.

### EV-04 — Lint enforces DEC-692
- Requirement: 1 to 3 effects, at most one battle, 2 to 3 options (the one C3 exception only).
- Method: unit
- How: lint test with copies of a scene: a fourth effect, no effects, two battles in one option, one option with no hidden battle beside it, four options.
- Pass evidence: each fails lint naming the scene and option ID; the one-visible-plus-hidden-battle Ambush shape passes.
- Fails if: lint accepts any bad copy, or rejects the Ambush shape.

### EV-05 — Lint enforces DEC-693
- Requirement: Costs only gold, hit points or corruption (and the Ambush toll).
- Method: unit
- How: lint test with an option whose cost is an item, and one whose cost kind is unknown.
- Pass evidence: both fail lint naming the option; gold, hp, corruption and toll pass.
- Fails if: an item cost passes.

### EV-06 — Items, win lines and loss scenes are checked
- Requirement: Every declared item has a real giving quest and option; every win line has a flag condition; every way to lose has a scene.
- Method: unit
- How: lint test with an item no quest gives, an item given by a missing quest, a win line with no condition, and a loss way with no scene.
- Pass evidence: each fails lint naming the item, line or loss way.
- Fails if: any passes.

### EV-07 — The engine reads the pack
- Requirement: The scene and quest stores take their data from the loaded pack, not only fixtures.
- Method: unit
- How: load a small test pack carrying one scene and quest with the new fields; start the quest and run the scene through its option.
- Pass evidence: the option's cost and effects apply as in the fixture-based tests; the same test with the pack's scene altered changes the result.
- Fails if: the stores still read only fixtures (altering the pack changes nothing).

## Survival evals (one per survival invariant in plan.md)

### EV-08 — A pack without the new fields plays as before
- Requirement: No behaviour change for existing packs.
- Method: unit
- How: the existing quest and scene test suites and the headless simulator, run unchanged.
- Pass evidence: all pass with no test edits except additions.
- Fails if: any existing test needs editing to pass.

## Assumptions surfaced

- Field names and the YAML layout are the developer's choice within the shapes of `PlainScene`; EV-03's round trip is what pins them.

## OPEN questions

- None.

## Eval approval

- See ./approval.md (must be filled before coding).
