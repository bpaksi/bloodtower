Keep this a checklist; do not write a second design doc.

# Brief: C4 / 14-fight-buttons — Fight on the event and quest scenes

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 14-fight-buttons
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, UI-041, UI-042, DEC-023, DEC-028
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet; Illusionist draws ./mockup.html from ./screen-spec.md before Bob approves the evals
- Depends on: 04, C3 12, C3 14, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/device/{EventChoice,SceneChoice}.tsx`
- Builds: UI-041, UI-042
- Deps change: no
- Runs: cloud

## What it does

C3 hid Fight (Q-C3-02). C4 shows it on foes and disaster events and on battle options in scenes (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C4-02); a Fight pick hands to the battle (features 09, 10).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - After Continue at an event, Fight is still offered.
  - After a restart and Continue, the Menu and any gear panel come back closed.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-11 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] UI-041: closed before coding (`decided`).
- [ ] UI-042: closed before coding (`decided`).
- [ ] DEC-023: closed before coding (`decided`).
- [ ] DEC-028: closed before coding (`decided`).

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-12. Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `board.foes` | Foes block the road. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 2 | `board.choice` | Fight, or find another way. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 3 | `button.fight` | Fight | screen-spec (exact label) |
| 4 | `button.go-around` | Go around | screen-spec (exact label) |
| 5 | `button.pay-off` | Pay them off (5 gold) | screen-spec (exact label; greyed when short) |
| 6 | `ambush.opening.1` | Felled trees block the forest road. Men step out from behind them, bows drawn. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) ('the ambush opening', first caption) |
| 7 | `ambush.opening.2` | Their shields have had a crest scratched off. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) ('the ambush opening', second caption; split to stay at or under 120 characters) |
| 8 | `ambush.button.toll` | Pay the toll (10 gold) | screen-spec (exact label); research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) ('Pay the toll') |
| 9 | `plain.scene` | Shapes move on the road ahead. They have seen you. | locked 2026-10-31 (Loremaster); the C4 test scene |
| 10 | `plain.option-2` | Slip past | locked 2026-10-31 (Loremaster); the C4 test scene |
| 11 | `plain.option-3` | Talk them down | locked 2026-10-31 (Loremaster); the C4 test scene |
| 12 | `battle.foe` | Foe: {foe}. Strength left: {N}. | locked 2026-10-31 (Loremaster); same text in screen-spec (C4-09's board line after a Fight) |
| 13 | `ipad.see-board` | See the Story board. | new - Loremaster (first drawn in mockup.html) |
| 14 | `toolbar.help` | ? | C2 feature 04 (Bob 2026-10-31 10:37); aria-label "Help" |
| 15 | `toolbar.menu` | (gear icon, aria-label "Menu") | C2 feature 04 (Bob 2026-10-31 10:37); icon, no visible text |
| 16 | `help.title` | Help | C2 feature 04 |
| 17 | `help.fight-buttons` | Tap Fight to start a battle, or Go around or Pay them off to avoid it. At The Ambush, Pay the toll instead. In a scene, Fight sits beside the scene's other choice. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 18 | `help.close` | Close | C2 feature 04 |

## OPEN questions

- Resolved Q-C4-02: Where does Fight show once `fight_enabled` is on? Options: (a) on every foes and disaster event and on every plain-scene option that holds a battle, always enabled; (b) on foes events only; disasters stay Go around / Pay them off until C5. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

## Eval approval

- See ./approval.md (must be filled before coding).
