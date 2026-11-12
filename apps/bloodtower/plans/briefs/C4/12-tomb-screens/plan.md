Keep this a checklist; do not write a second design doc.

# Brief: C4 / 12-tomb-screens — The Tomb on screen: the map and the view, the iPad's three corridors

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 12-tomb-screens
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-094, DEC-583 to DEC-592, DEC-617 to DEC-620
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet; Illusionist draws ./mockup.html from ./screen-spec.md before Bob approves the evals
- Depends on: 06, 09, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/Tomb*.tsx` (new), `apps/bloodtower/src/web/components/device/TombPicker.tsx` (new)
- Builds: DEC-583, DEC-584, DEC-585, DEC-591, DEC-592
- Deps change: no
- Runs: cloud

## What it does

DEC-583's two halves side by side: the map (found rooms, current glowing, doorways, Exit, Undead Advantage count) and the view (the panning room view). The iPad shows up to three corridor cards plus Listen and Leave (DEC-591). A trap or battle replaces the view (DEC-592). Room art is placeholder (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C4-15).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - After Continue the map shows the same found and cleared rooms.
  - After a restart and Continue, the Menu and any gear panel come back closed.
  - A beat interrupted by restart shows again or the next one shows, its effect applied once.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-18 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] AREA-094: closed before coding (`decided`).
- [ ] DEC-583 to DEC-592: closed before coding (`decided`).
- [ ] DEC-617 to DEC-620: closed before coding (`decided`).

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-12. Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `board.title` | The Tomb. Rooms found: {N}. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 2 | `board.undead` | Undead Advantage: {N}. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 3 | `board.corridor` | A cold corridor. Three doors wait. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 4 | `board.listen-hint` | You hear something behind the door. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 5 | `board.trap` | A trap. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 6 | `board.battle` | Something wakes in the dark. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 7 | `board.exit` | The Exit is open. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 8 | `ipad.choose-way` | Choose a way | mockup.html (iPad prompt over the three cards) |
| 9 | `button.left` | Left | screen-spec (exact label) |
| 10 | `button.ahead` | Ahead | screen-spec (exact label) |
| 11 | `button.right` | Right | screen-spec (exact label) |
| 12 | `card.wall` | wall | mockup.html (the greyed card's note) |
| 13 | `button.listen` | Listen | screen-spec (exact label) |
| 14 | `button.bold` | Bold | screen-spec (exact label) |
| 15 | `button.on-guard` | On guard | screen-spec (exact label) |
| 16 | `button.leave` | Leave | screen-spec (exact label) |
| 17 | `listen.line` | You listen down the corridor. | locked 2026-10-31 (Loremaster); DEC-618, in screen-spec |
| 18 | `trap.pit.title` | Who takes the fall? | screen-spec (Gamewright pick; Loremaster keeps it) |
| 19 | `trap.pit` | The floor gives way. Choose one hero to take the fall and lose 4 hit points. | locked by Loremaster, 2026-10-31 (DEC-606) |
| 20 | `trap.pit.button` | {hero} | screen-spec (the hero's name, nothing else; one per present hero) |
| 21 | `trap.rocks` | Stones crash from the ceiling. Every hero loses 2 hit points. | locked by Loremaster, 2026-10-31 (DEC-606) |
| 22 | `ipad.exit.title` | The Exit | mockup.html |
| 23 | `tick.auto` | Moves on by itself. | locked 2026-10-31 (Loremaster) |
| 24 | `ipad.see-board` | See the Story board. | new - Loremaster (first drawn in mockup.html) |
| 25 | `pack.board.title` | The barrow. Rooms found: {N}. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) (Ruined Keep pack skin of board.title) |
| 26 | `pack.board.exit` | The way out is open. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) (Ruined Keep pack skin of board.exit) |
| 27 | `toolbar.help` | ? | C2 feature 04 (Bob 2026-10-31 10:37); aria-label "Help" |
| 28 | `toolbar.menu` | (gear icon, aria-label "Menu") | C2 feature 04 (Bob 2026-10-31 10:37); icon, no visible text |
| 29 | `help.title` | Help | C2 feature 04 |
| 30 | `help.tomb-screens` | Pick Left, Ahead or Right on your iPad, then Listen, Bold or On guard on that card. Tap Leave to get out. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 31 | `help.close` | Close | C2 feature 04 |

## OPEN questions

- Resolved Q-C4-17: Does the C2-04 auto-advance rule (advance when narration or cue ends, or after 4 s with no audio) also apply to battle round results and Reveals? Options: (a) yes, every beat in C4 and C5 (round results, victory, reward/retreat/fall, trap, close Scroll, glyph/boon Reveal, boss phase show, win line) follows it; (b) battle beats wait for a press on any iPad; (c) round results hold 2 s, other beats follow the rule. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET). (features C4 09, 11, 12, 13; C5 08, 09)

- Q-C4-08 ANSWERED by card DEC-603 (in commit 0005 "C4/C5 plans: fill the 14 [TBD] values"; not a Bob question). Card: "**Rooms, guardian's included:** short 4–5, standard 6–7, long 8–10, seeded within the range. / **Grid:** 4×4, 16 cells. The entrance is on an edge cell." Source: research/game-design/cards/DEC-603.md. ~~Old option (a) 7 rooms, guardian hidden in one of the last 3; Gamewright pick (a)~~ (superseded by card DEC-603).
- Resolved Q-C4-15 **[Bob taste call]**: Foe paintings in C4, before the A1 art run (C5): Options: (a) one placeholder painting per foe level, swapped by A1 in C5; (b) A1 draft art now, as the art lands. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

## Eval approval

- See ./approval.md (must be filled before coding).
