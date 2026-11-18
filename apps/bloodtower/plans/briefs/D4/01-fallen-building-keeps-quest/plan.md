Keep this a checklist; do not write a second design doc.

# Brief: D4 / 01-fallen-building-keeps-quest — A fallen building keeps its quest: Enter, then Quest and Leave

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (section "Nov 12 audit fold-in", decision D4)
- Feature: 01-fallen-building-keeps-quest
- Kind: fix (engine and one device flag; the ruling is already on main)
- Owner: Gamewright (brief, evals); Anvil (build, inspect first)
- Related AREA/docs: issue #504; finding QD-06 and test R05 in [docs/audits/2026-11-12-dark-tower-consolidated-audit.md](../../../../../../docs/audits/2026-11-12-dark-tower-consolidated-audit.md); ruling DEC-910 (#509); DEC-942 and DEC-943 (this brief); index [research/game-design/audit-rulings-2026-11-13.md](../../../../../../research/game-design/audit-rulings-2026-11-13.md) section D4
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no new screen state: the existing Enter button and the existing building menu with two rows, DEC-943)
- Risk: Med (quest reachability and progress; restore)
- Depends on: its approval.md on main (normal brief approval). No step dependency: everything it changes is on main at 9ccd052.
- Builds: DEC-910, DEC-942, DEC-943 (R05); MEC-036 Enter as the card now reads
- Deps change: no
- Runs: cloud

### Touches (checked against main 9ccd052)

"An open quest marker" below is `openQuestAt(play, spaceId)` in `loops/quest/quest.ts` (live this chapter, not done). The menu's own marker list (`setQuestMarker` / picks `quests`) must agree with it; the runner uses one source and says which.

- `apps/bloodtower/src/engine/loops/group-turn/loop.ts`: the five fallen gates (lines ~128 and ~155, offering Enter; ~225 and ~257, landing with no moves left; ~289, `applyEnter`) also let a fallen building with an open quest marker through.
- `apps/bloodtower/src/engine/loops/encounter/picks.ts`: `openMenu` (line ~247) builds Quest, Leave for a fallen building with an open quest marker instead of refusing `fallen`; any other pick there is refused `not-offered` by `pickGate`.
- `apps/bloodtower/src/engine/loops/day/rules.ts`: `buildingMenu` at 4 skulls returns `["Quest", "Leave"]` when the quest flag is set, `[]` otherwise (as now).
- `apps/bloodtower/src/engine/loops/session/view.ts`: the acting group's `fallen` flag (line ~602) is not set, or a sibling flag says the quest is open, so the device does not draw the fallen note (DEC-943).
- `apps/bloodtower/src/web/components/device/CoreDeviceScreen.tsx` (line ~1074): only if the view adds a sibling flag rather than dropping `fallen`.
- Tests: `apps/bloodtower/src/engine/loops/encounter/fallenQuest.test.ts` (new, EV-01 to EV-07, EV-09, EV-10); `apps/bloodtower/src/engine/loops/chapter/chapter.test.ts` (EV-08, a new `it` block); the existing `building.test.ts`, `encounter.test.ts`, `group-turn/loop.test.ts` unchanged and passing.
- e2e: `apps/bloodtower/src/e2e/tests/d4-fallen-quest.spec.ts` (new, EV-11), using the existing `~test-skulls:` and `~test-at:` markers; `support/acceptance.ts` read only.
- Cards: DEC-942, DEC-943 (new, this brief). DEC-910's card edits were made in #509.

### Overlaps and merge order

- **No F1 overlap.** F1 works in the battle and Tomb loops; D4 touches neither.
- **No D2 (#559) or D3 overlap.**
- **POSSIBLE OVERLAP D1 (#558): `apps/bloodtower/src/engine/loops/group-turn/loop.ts`**, only if D1's build swaps its `isCorruptionLoss` stop (lines ~192, ~252, ~268) for a general loss read. D4's gates are at ~128, ~155, ~225, ~257, ~289; ~252 and ~257 sit in the same `exit` function. Whichever lands second rebases.
- **OVERLAP D1 (#558), tests only: `apps/bloodtower/src/engine/loops/chapter/chapter.test.ts`** (D1 adds EV-05 and EV-11 blocks; D4 adds EV-08). Separate `it` blocks; the second rebases.
- **Not a file overlap, a behaviour one: C3/13 (#555, #557, merged).** Its approved EV-10 ("a fallen building is not enterable", a village with no quest) still holds; D4 adds the quest exception and does not edit C3/13's eval.md.
- **Merge order:** independent of F1, D2 and D3. With D1, either order; the second rebases.

## What it does

1. **The marker stays** (DEC-910). When the 4th skull destroys a building holding an open quest marker, the space is still a place to Enter. Its menu is the quest, then Leave. Every other place and person is gone; no Cleanse.
2. **The quest keeps its identity and progress** (DEC-151). Picking it costs 1 move, as any quest pick. Done is credited once.
3. **A later chapter's quest on an already fallen building** is placed there anyway and works the same (DEC-942).
4. **On the iPad** (DEC-943): Enter shows and the fallen note does not, while the quest is open. Once it is done or not live, the space is plain fallen again.
5. **Unchanged:** a fallen building takes no skull; it still counts toward the 4 fallen buildings (DEC-915); event draws at a skulled building are as before.

**Inspect first.** If part of this already conforms, that part lands as tests only. A contradicted rule: stop that case and report it. Do not invent a rule.

**Out of scope** (do not widen): any relocation or destination rule (parked with moving quests, DEC-777, MEC-025); caravans; new copy; the Tomb's own quest (its entry is a wild marker already, DEC-641).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The fallen building's skull count, the quest marker on its space and the quest's progress; after a restore the space still offers Enter with Quest and Leave (EV-12).
  - A quest done at a fallen site stays done once; after a restore the space is plain fallen (EV-12).
- The tower is not touched.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 to EV-10 pass (verifier table on PR).
- [ ] EV-11 (e2e, Playwright) passes.
- [ ] EV-12 (survival) passes.
- [ ] Anvil's report lists changed files, test commands and results, and any drift found.
- Not required: a relocation; a physical Tower run; new art or copy.

## AREA / DEC checklist

- [ ] DEC-910, DEC-942 and DEC-943 read; this brief follows them.
- [ ] DEC-093 (as trimmed by DEC-910), DEC-613, DEC-088, DEC-641, DEC-151, DEC-083, DEC-377, DEC-915, DEC-777 read.
- [ ] MEC-036 (Enter, .1 to .4) and MEC-035 read; no further card edit is needed.
- [ ] C3/13 EV-10 (approved) stands for a fallen building with no open quest; its eval.md is not edited.
- [ ] **Bob lock touched (already flagged to Warden on 2026-11-13):** DEC-910 trims DEC-093's "a quest marker there moves" (Bob, 2026-10-21) in favour of DEC-613's "a 1.0 quest stays on its one site" (Bob, 2026-10-29). It settles two Bob cards by the later one and reverses neither. Bob's approval of this eval.md accepts it; if he wants a relocation in 1.0, DEC-910 flips and this brief is withdrawn.
- [ ] DEC-942 and DEC-943 reverse no Bob lock and touch none of DEC-821, 822, 824 or 826.

## Open questions

- None open. A quest whose building fell before its chapter: DEC-942 (EV-08). What the iPad shows: DEC-943 (EV-06, EV-07, EV-11).

## Eval approval

- See ./approval.md (must be filled before coding).
