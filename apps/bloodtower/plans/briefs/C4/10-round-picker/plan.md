Keep this a checklist; do not write a second design doc.

# Brief: C4 / 10-round-picker — The round picker on the iPad: Fight or Retreat, then one action

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 10-round-picker
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, UI-027, DEC-118, DEC-129
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet; Illusionist draws ./mockup.html from ./screen-spec.md before Bob approves the evals
- Depends on: 02, C2 06, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/device/RoundPicker*.tsx` (new), `apps/bloodtower/src/e2e/tests/c4-round.spec.ts`
- Builds: UI-027
- Deps change: no
- Runs: cloud

## What it does

UI-027: the group picks Fight or Retreat; then each present hero picks one action, all at once (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C4-16); the board ticks each hero who has picked. No timer (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C4-11).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - A pick made before a quit is still shown after Continue.
  - After a restart and Continue, the Menu and any gear panel come back closed.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-12 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] UI-027: closed before coding (`decided`).
- [ ] DEC-118: closed before coding (`decided`).
- [ ] DEC-129: closed before coding (`decided`).

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-12. Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `board.prompt` | Fight or Retreat? | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 2 | `board.waiting` | Waiting on: {hero}. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 3 | `board.picked` | {hero} has picked. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 4 | `board.all-picked` | Everyone has picked. The round begins. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 5 | `ipad.round` | Round {N} | mockup.html (round label) |
| 6 | `ipad.prompt` | Fight or Retreat? | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 7 | `button.fight` | Fight | screen-spec (exact label) |
| 8 | `button.retreat` | Retreat | screen-spec (exact label) |
| 9 | `button.attack` | Attack | screen-spec (exact label) |
| 10 | `button.cast` | Cast a spell | screen-spec (exact label) |
| 11 | `button.advantage` | Spend an Advantage | screen-spec (exact label) |
| 12 | `button.potion` | Drink a potion | screen-spec (exact label) |
| 13 | `button.guard` | Guard | screen-spec (exact label) |
| 14 | `spell.lightning` | Lightning | screen-spec (exact label; spell names come from the pack) |
| 15 | `spell.fireball` | Fireball | screen-spec (exact label) |
| 16 | `spell.magic-missile` | Magic Missile | screen-spec (exact label) |
| 17 | `potion.target` | On {hero} | screen-spec (exact label) |
| 18 | `pick.summary` | {hero}: {action} | mockup.html (the picked state) |
| 19 | `button.change-pick` | Change pick | Q-C4-18 (Bob approved 2026-10-31) |
| 20 | `ipad.sitting-out` | You are sitting out this battle. Watch the board. | locked 2026-10-31 (Loremaster); in screen-spec and EV-04 |
| 21 | `ipad.group-chose-retreat` | The group chose Retreat. | new - Loremaster (EV-05: shown on iPad B when the group's Retreat wins) |
| 22 | `round.strike-bark.vo-01` | Now. Strike hard! | PT-31 / LQ-5 B (1.0 strike bark). Fires on the round picker's Attack button (Gamewright confirmed). Spoken by the hero who taps Strike, in that hero's voice; the engine picks one of the two at random. Caption equals the spoken text. |
| 23 | `round.strike-bark.vo-02` | Stand with me. Strike! | PT-31 / LQ-5 B (1.0 strike bark). Fires on the round picker's Attack button (Gamewright confirmed). Spoken by the hero who taps Strike, in that hero's voice; the engine picks one of the two at random. Caption equals the spoken text. |
| 24 | `toolbar.help` | ? | C2 feature 04 (Bob 2026-10-31 10:37); aria-label "Help" |
| 25 | `toolbar.menu` | (gear icon, aria-label "Menu") | C2 feature 04 (Bob 2026-10-31 10:37); icon, no visible text |
| 26 | `help.title` | Help | C2 feature 04 |
| 27 | `help.round-picker` | Choose Fight or Retreat, then each hero picks Attack, Cast a spell, Spend an Advantage, Drink a potion or Guard. The round starts when everyone has picked. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 28 | `help.close` | Close | C2 feature 04 |

## OPEN questions

- Resolved Q-C4-16 **[Bob taste call]**: Round actions on the iPads (DEC-129): all at once or in turn? Options: (a) all at once; the board ticks each hero who has picked, and the round runs when all have; (b) in turn order, one iPad at a time. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C4-11 **[Bob taste call]**: Does a battle round have a timer on the iPads? Options: (a) no timer; the round waits for every present hero; (b) 30 seconds, then a missing pick becomes a normal attack (DEC-129). Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

## Eval approval

- See ./approval.md (must be filled before coding).
