Keep this a checklist; do not write a second design doc.

# Brief: C4 / 09-battle-board — The battle on the board: horn, foe panel, round results

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 09-battle-board
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, UI-026, CUE-010, UI-030, UI-036, DEC-466
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet; Illusionist draws ./mockup.html from ./screen-spec.md before Bob approves the evals
- Depends on: 02, 05, C3 11, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/Battle*.tsx` (new), `apps/bloodtower/src/web/components/board/FoePanel.tsx` (new), `apps/bloodtower/src/e2e/tests/c4-battle.spec.ts`
- Builds: UI-026, CUE-010
- Deps change: no
- Runs: cloud

## What it does

UI-026 on the board: the foe painting (one placeholder per level (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET), Q-C4-15), traits, strength left, the present heroes; each round's result; the horn, hit and victory cues (CUE-010), on the board speakers when no tower (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C4-14). A Cursed hero's panel shows "4 of N count" (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C4-05).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - After Continue mid-battle the board redraws the same foe, wounds and heroes.
  - After a restart and Continue, the Menu and any gear panel come back closed.
  - A beat interrupted by restart shows again or the next one shows, its effect applied once.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-16 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] UI-026: closed before coding (`decided`).
- [ ] CUE-010: closed before coding (`decided`).
- [ ] UI-030: closed before coding (`decided`).
- [ ] UI-036: closed before coding (`decided`).
- [ ] DEC-466: closed before coding (`decided`).

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-12. Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `board.foe` | Foe: {foe}. Strength left: {N}. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 2 | `board.round-won` | Round {N}: {hero} struck for {N}. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 3 | `board.round-lost` | Round {N}: the foe hit {hero}. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 4 | `board.cursed` | {hero} is Cursed: 4 of {N} count. | locked 2026-10-31 (Loremaster); same text in screen-spec (Q-C4-05) |
| 5 | `board.victory` | The foe falls. Victory. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 6 | `chip.cursed` | 4 of {N} | mockup.html (the Cursed hero's panel chip; Q-C4-05) |
| 7 | `chip.lost-round` | −{foe level} hit points | screen-spec (Tokens; DEC-703) |
| 8 | `chip.traits` | Beast, Magic, Humanoid, Melee, Undead, Stealth | DEC-068 (the foe trait names; two per foe) |
| 9 | `tick.auto` | Moves on by itself. | locked 2026-10-31 (Loremaster) |
| 10 | `ipad.see-board` | See the Story board. | new - Loremaster (first drawn in mockup.html) for an iPad that has no choice to make |
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
| 21 | `help.battle-board` | Pick Fight or Retreat on your iPad, then Attack, Cast a spell, Spend an Advantage, Drink a potion or Guard. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 22 | `help.close` | Close | C2 feature 04 |

## OPEN questions

- Resolved Q-C4-17: Does the C2-04 auto-advance rule (advance when narration or cue ends, or after 4 s with no audio) also apply to battle round results and Reveals? Options: (a) yes, every beat in C4 and C5 (round results, victory, reward/retreat/fall, trap, close Scroll, glyph/boon Reveal, boss phase show, win line) follows it; (b) battle beats wait for a press on any iPad; (c) round results hold 2 s, other beats follow the rule. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET). (features C4 09, 11, 12, 13; C5 08, 09)

- Resolved Q-C4-14: The battle horn and hits (CUE-010) with no tower connected: Options: (a) play them through the Story board's speakers; (b) silent; the board shows the hit only. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C4-15 **[Bob taste call]**: Foe paintings in C4, before the A1 art run (C5): Options: (a) one placeholder painting per foe level, swapped by A1 in C5; (b) A1 draft art now, as the art lands. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C4-05: Cursed (DEC-466): does the board show which 4 Advantages counted? Options: (a) yes: the hero panel shows "4 of N count" and dims the rest during the round; (b) no: the app picks silently; only the round result shows. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

## Eval approval

- See ./approval.md (must be filled before coding).
