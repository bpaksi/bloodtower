Keep this a checklist; do not write a second design doc.

# Brief: C5 / 08-boss-screen — The Warden on screen: phases and the tower show

## Meta

- Plan: [C5-finale-polish.md](../../../C5-finale-polish.md)
- Feature: 08-boss-screen
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, DEC-567, DEC-327, UI-026
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet; Illusionist draws ./mockup.html from ./screen-spec.md before Bob approves the evals
- Depends on: 02, C4 09, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/BossPhase.tsx` (new)
- Builds: DEC-567, DEC-327
- Deps change: no
- Runs: cloud

## What it does

The foe panel for The Warden with a phase change: new painting (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C5-02) and a full tower show; with no tower, a board-only show (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C5-08).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The phase painting is redrawn after Continue.
  - After a restart and Continue, the Menu and any gear panel come back closed.
  - A beat interrupted by restart shows again or the next one shows, its effect applied once.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-15 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; 1.1 work (DEC-502).

## AREA / DEC checklist

- [ ] DEC-567: closed before coding (`decided`).
- [ ] DEC-327: closed before coding (`decided`).
- [ ] UI-026: closed before coding (`decided`).

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-12. Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `boss.opening` | The Warden waits at the top, in what is left of his armour. "I kept it forty years," he says. "Then it spoke." | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) ('boss-screen, opening'; DEC-661, DEC-667) |
| 2 | `board.foe` | The Warden. Strength left: {N}. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 3 | `board.round` | Round {N}: {hero} struck for {N}. | C4-09 board line; Gamewright keeps 'struck for {N}' (mockup) |
| 4 | `board.phase` | The Warden changes. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 5 | `board.falls` | The Warden falls. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 6 | `chip.traits` | Melee, Humanoid | DEC-688 |
| 7 | `chip.ability` | Crushing blow | DEC-688 |
| 8 | `ipad.warden` | The Warden | mockup.html (iPad title) |
| 9 | `tick.auto` | Moves on by itself. | locked 2026-10-31 (Loremaster) |
| 10 | `ipad.see-board` | See the Story board. | new - Loremaster (first drawn in mockup.html) |
| 11 | `button.fight` | Fight | screen-spec (exact label) |
| 12 | `button.retreat` | Retreat | screen-spec (exact label) |
| 13 | `button.attack` | Attack | screen-spec (exact label) |
| 14 | `button.cast` | Cast a spell | screen-spec (exact label) |
| 15 | `button.advantage` | Spend an Advantage | screen-spec (exact label) |
| 16 | `button.potion` | Drink a potion | screen-spec (exact label) |
| 17 | `button.guard` | Guard | screen-spec (exact label) |
| 18 | `toolbar.help` | ? | C2 feature 04 (Bob 2026-10-31 10:37); aria-label "Help" |
| 19 | `toolbar.menu` | (gear icon, aria-label "Menu") | C2 feature 04 (Bob 2026-10-31 10:37); icon, no visible text |
| 20 | `help.title` | Help | C2 feature 04 |
| 21 | `help.boss-screen` | The Warden's last battle. Pick Fight or Retreat on your iPad, then your action. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 22 | `help.close` | Close | C2 feature 04 |

## OPEN questions

- Q-C4-17 (auto-advance timing, Gamewright pick (a), approved by Bob 2026-10-31 6:16 PM ET) applies to this screen; see C4 plan.

- Resolved Q-C5-02 **[Bob taste call]**: The Warden's three phases (DEC-567): three paintings or one? Options: (a) three paintings, one per phase; (b) one painting, darkening at each phase. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C5-08: The boss's full tower show (DEC-567, DEC-327) with no tower connected: Options: (a) a board-only show: the painting change, a shake and the sound on the board speakers; (b) skip the show. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

## Eval approval

- See ./approval.md (must be filled before coding).
