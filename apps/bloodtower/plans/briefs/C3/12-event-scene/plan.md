Keep this a checklist; do not write a second design doc.

# Brief: C3 / 12-event-scene — The event scene: the painting, the words and the choice

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 12-event-scene
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, UI-041, UI-035, MEC-072
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet: the screen changes, see ./screen-spec.md. Illusionist draws ./mockup.html from it before Bob approves the evals
- Risk: Low
- Depends on: C3 feature 05 merged, C2 feature 06 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/EventScene.tsx` (new), `apps/bloodtower/src/web/components/device/**` (choice list), `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-event.spec.ts`
- Builds: UI-041
- Deps change: no
- Runs: cloud

## What it does

UI-041: a painting with the event's words on a Scroll (UI-035), the choices on the iPad, the present heroes choosing together (DEC-019).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The gear Menu and any gear panel come back closed, the game not paused, the toolbar on every iPad, and item states recomputed (EV-17).
  - An open event shows the same card and choices after Continue.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-17 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] UI-041: closed before coding (`decided`).
- [ ] UI-035: closed before coding (`decided`).
- [ ] MEC-072: closed before coding (`decided`).
- [ ] DEC-019: closed before coding (`decided`).
- [ ] DEC-022: closed before coding (`decided`).
- [ ] DEC-027: closed before coding (`decided`).
- [ ] DEC-018: closed before coding (`decided`).
- [ ] DEC-023: closed before coding (`decided`).

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-12. Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `event.words (sample)` | Smoke on the road ahead. Something burned here last night. | sample for The Roads; every event's own words come from the pack's event entry, not from this brief (mockup.html, Loremaster 2026-10-31) |
| 2 | `tick.auto` | Moves on by itself. | locked 2026-10-31 (Loremaster); the auto-advance tick (Bob 2026-10-31 10:38) |
| 3 | `event.quiet` | The road is still. Nothing comes. | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 4 | `event.windfall` | Fortune smiles. You find {reward}. | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 5 | `reveal.gain` | +{N} gold | EV-06 ("+5 gold"); "+N" in mockup |
| 6 | `event.hazard` | Trouble on the road. {effect}. | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 7 | `hazard.saved` | {counter} saved you. Nothing is lost. | new - Loremaster. {counter} is the item or ability name when there is one (e.g. "The lantern saved you."), otherwise the hero's name (EV-07) |
| 8 | `hazard.cost.hp.label` | Lose {N} hit points | EV-01; a 1.0 hazard costs hit points only (Gamewright confirmed); the board then shows the line in the next row |
| 9 | `hazard.cost.hp` | −2 hit points each | EV-01 (verbatim) |
| 10 | `event.foes` | Foes block the way. Stand fast or turn back. | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31); the disaster event uses the same line (C4-14 does the same) |
| 11 | `choice.go-around` | Go around | DEC-023, DEC-028 (named in the spec) |
| 12 | `choice.pay-off` | Pay them off (5 gold) | final: DEC-023; cost from events.pay_off = 5 gold (Bob approved 2026-10-31); label form matches C4-14 |
| 13 | `event.people.rumour` | A stranger leans close. '{rumour}' | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 14 | `event.people.trick` | A stranger smiles too wide. You've been tricked: {effect}. | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 15 | `choice.listen` | Listen | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31); pending Bob (Gamewright default) |
| 16 | `choice.walk-on` | Walk on | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31); pending Bob (Gamewright default) |
| 17 | `waiting.other-group` | The other group is deciding. | new - Loremaster (EV-03: the waiting line on absent heroes' iPads) |
| 18 | `toolbar.help` | ? | C2 feature 04 (Bob 2026-10-31 10:37); aria-label "Help" |
| 19 | `toolbar.menu` | (gear icon, aria-label "Menu") | C2 feature 04 (Bob 2026-10-31 10:37); icon, no visible text |
| 20 | `help.title` | Help | C2 feature 04 |
| 21 | `help.event-scene` | Something happened on the road. Make a choice if one is shown; the scene moves on by itself. | locked 2026-10-31 (Loremaster); same text in screen-spec and EV-12 |
| 22 | `help.close` | Close | C2 feature 04 |

## OPEN questions

- ANSWERED Q-C3-02 (Bob, 2026-10-31 10:09 AM ET): hide Fight until C4.
- ANSWERED Q-C3-03 (Bob approved 2026-10-31): in 1.0 people events offer rumour and trick only; the people weight stays 10. (people offers in 1.0)

## Eval approval

- See ./approval.md (must be filled before coding).
