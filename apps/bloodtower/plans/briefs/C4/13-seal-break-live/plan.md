Keep this a checklist; do not write a second design doc.

# Brief: C4 / 13-seal-break-live — The seal break live on the board, chapters 1 and 2

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 13-seal-break-live
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, UI-044, DEC-303
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet; Illusionist draws ./mockup.html from ./screen-spec.md before Bob approves the evals
- Depends on: 07, C3 15, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/SealBreak.tsx`, `apps/bloodtower/src/web/components/device/SkullPlacer.tsx`
- Builds: UI-044
- Deps change: no
- Runs: cloud

## What it does

C3 built UI-044's seal step behind the switch; C4 turns it on. The close Scroll, the lit seal, the glyph and boon on a Reveal with the Loremaster's seal line (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C4-10), then the freed-skull prompts on the iPad (kingdom, then building). The C3 "Done" confirm becomes the real pick: the iPad confirms which seal broke on the tower.

## Cutover

Cutover: N

- Nothing dies or is renamed beyond the tuning switches named above.

## Survival invariants

- Continue, restore, and restart must keep:
  - A half-placed set of freed skulls resumes at the next skull.
  - After a restart and Continue, the Menu and any gear panel come back closed.
  - A beat interrupted by restart shows again or the next one shows, its effect applied once.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-16 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] UI-044: closed before coding (`decided`).
- [ ] DEC-303: closed before coding (`decided`).

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-12. Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `board.won` | The chapter is won. A seal breaks. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 2 | `seal.1.name` | The Road Seal | locked 2026-10-31 (Loremaster); EV-04, EV-07 |
| 3 | `seal.2.name` | The Keep Seal | locked 2026-10-31 (Loremaster); EV-04, EV-07 |
| 4 | `seal.3.name` | The Warden's Seal | locked 2026-10-31 (Loremaster); EV-04, EV-07 |
| 5 | `button.seal-broken` | Seal broken | screen-spec (exact label; replaces C3's Done) |
| 6 | `seal.line.1` | The roads are clear, and a seal breaks like an old oath giving way. Ahead stands the Ruined Keep. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06); replaces the 10-31 line "The roads are clear and a seal breaks. Ahead stands the Ruined Keep." (Q-C4-10 pick a) |
| 7 | `seal.line.2` | The Keep gives up its dead, and a second seal cracks. The Tower waits. | locked 2026-10-31 (Loremaster); kept in research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) (Q-C4-10 pick a) |
| 8 | `seal.line.3` | The last stand holds, and the third seal breaks. Only the Warden remains. | locked 2026-10-31 (Loremaster); kept in research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) (Q-C4-10 pick a) |
| 9 | `board.gained` | {hero} gained {item}. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 10 | `board.skulls` | Skulls are freed. Choose a kingdom. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 11 | `ipad.skulls.title` | Skulls | mockup.html |
| 12 | `kingdom.arisilon` | Arisilon | DEC-226, DEC-579 (kingdom names) |
| 13 | `kingdom.brynthia` | Brynthia | DEC-226, DEC-579 |
| 14 | `kingdom.durnin` | Durnin | DEC-226, DEC-579 |
| 15 | `kingdom.zenon` | Zenon | DEC-226, DEC-579 |
| 16 | `ipad.choose-kingdom` | Choose a kingdom | mockup.html |
| 17 | `building.citadel` | Citadel | DEC-579 (building names) |
| 18 | `building.sanctuary` | Sanctuary | DEC-579 |
| 19 | `building.village` | Village | DEC-579 |
| 20 | `building.bazaar` | Bazaar | DEC-579 |
| 21 | `building.tavern` | Tavern | DEC-579 |
| 22 | `ipad.choose-building` | Choose a building | mockup.html |
| 23 | `button.place-skull` | Place skull | screen-spec (exact label) |
| 24 | `tick.auto` | Moves on by itself. | locked 2026-10-31 (Loremaster) |
| 25 | `ipad.see-board` | See the Story board. | new - Loremaster (first drawn in mockup.html) |
| 26 | `toolbar.help` | ? | C2 feature 04 (Bob 2026-10-31 10:37); aria-label "Help" |
| 27 | `toolbar.menu` | (gear icon, aria-label "Menu") | C2 feature 04 (Bob 2026-10-31 10:37); icon, no visible text |
| 28 | `help.title` | Help | C2 feature 04 |
| 29 | `help.seal-break-live` | Tap Seal broken once the tower's seal breaks. Then pick a kingdom and a building for each freed skull and tap Place skull. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 30 | `help.close` | Close | C2 feature 04 |

## OPEN questions

- Resolved Q-C4-17: Does the C2-04 auto-advance rule (advance when narration or cue ends, or after 4 s with no audio) also apply to battle round results and Reveals? Options: (a) yes, every beat in C4 and C5 (round results, victory, reward/retreat/fall, trap, close Scroll, glyph/boon Reveal, boss phase show, win line) follows it; (b) battle beats wait for a press on any iPad; (c) round results hold 2 s, other beats follow the rule. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET). (features C4 09, 11, 12, 13; C5 08, 09)

- Resolved Q-C4-10 **[Bob taste call]**: Who speaks the seal-break line at each chapter win? Options: (a) the Loremaster, one line per chapter: "The roads are clear, and a seal breaks like an old oath giving way. Ahead stands the Ruined Keep." (Copy table: seal.line.1), "The Keep gives up its dead, and a second seal cracks. The Tower waits." (Copy table: seal.line.2), "The last stand holds, and the third seal breaks. Only the Warden remains." (Copy table: seal.line.3); (b) the Narrator, one shared line "A seal breaks. The tower shudders.". Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

## Eval approval

- See ./approval.md (must be filled before coding).

> Note (Q-C4-10): the docs use pick (a), the Loremaster per chapter. If Bob picks (b), the Narrator line kept for it is: "A seal breaks. The tower shudders."
