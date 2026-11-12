Keep this a checklist; do not write a second design doc.

# Brief: C5 / 07-tower-screens — The Tower on screen: level map, room view, the iPad's doors

## Meta

- Plan: [C5-finale-polish.md](../../../C5-finale-polish.md)
- Feature: 07-tower-screens
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, MEC-076, DEC-566, DEC-583
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet; Illusionist draws ./mockup.html from ./screen-spec.md before Bob approves the evals
- Depends on: 01, C4 12, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/Tower*.tsx` (new), `apps/bloodtower/src/web/components/device/TowerPicker.tsx` (new)
- Builds: MEC-076 (screens; UI cards to be filed)
- Deps change: no
- Runs: cloud

## What it does

The Tower reuses the Tomb's two halves: the level's room map and the room view (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C5-01). The iPad: Open the next door, Rest (at a found shrine), Retreat.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - After Continue the map shows the same level and cleared rooms.
  - After a restart and Continue, the Menu and any gear panel come back closed.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-12 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; 1.1 work (DEC-502).

## AREA / DEC checklist

- [ ] MEC-076: closed before coding (`decided`).
- [ ] DEC-566: closed before coding (`decided`).
- [ ] DEC-583: closed before coding (`decided`).

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-12. Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `tower.opening` | The Tower door stands open. Inside, the stairs climb into the dark. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) ('tower opening'; MEC-076) |
| 2 | `board.title` | The Tower. Level {N}. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 3 | `board.rooms` | Rooms found: {N}. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 4 | `board.door` | A door, shut and cold. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 5 | `board.shrine` | A shrine. You can rest here. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 6 | `board.stairs` | The stairs climb on. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 7 | `trap.line` | Every hero loses 2 hit points. | locked by Loremaster, 2026-10-31 (second sentence of C4-12's rocks line) |
| 8 | `ipad.level` | Level {N} | mockup.html |
| 9 | `ipad.title` | The Tower | mockup.html |
| 10 | `button.open-door` | Open the next door | screen-spec (exact label) |
| 11 | `button.rest` | Rest | screen-spec (exact label; only at a found shrine) |
| 12 | `button.retreat` | Retreat | screen-spec (exact label) |
| 13 | `ipad.stairs.title` | Stairs | mockup.html |
| 14 | `button.climb` | Climb | screen-spec (Gamewright ruling) |
| 15 | `button.fight` | Fight | screen-spec; C4-10's round picker |
| 16 | `tick.auto` | Moves on by itself. | locked 2026-10-31 (Loremaster) |
| 17 | `toolbar.help` | ? | C2 feature 04 (Bob 2026-10-31 10:37); aria-label "Help" |
| 18 | `toolbar.menu` | (gear icon, aria-label "Menu") | C2 feature 04 (Bob 2026-10-31 10:37); icon, no visible text |
| 19 | `help.title` | Help | C2 feature 04 |
| 20 | `help.tower-screens` | Tap Open the next door to go deeper. Tap Rest at a shrine, or Retreat to fall back. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 21 | `help.close` | Close | C2 feature 04 |

## OPEN questions

- Resolved Q-C5-01 **[Bob taste call]**: The Tower has no screen cards. What does the board show in the Tower (MEC-076)? Options: (a) reuse the Tomb's two halves (DEC-583): the level's room map left, the room view right; Gamewright files UI cards for it in a design session; (b) the room map only, full width. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

## Eval approval

- See ./approval.md (must be filled before coding).
