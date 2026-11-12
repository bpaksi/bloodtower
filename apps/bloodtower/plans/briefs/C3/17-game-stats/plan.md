Keep this a checklist; do not write a second design doc.

# Brief: C3 / 17-game-stats — Game stats: the game in numbers

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 17-game-stats
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, SCR-019, SCR-021
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet: the screen changes, see ./screen-spec.md. Illusionist draws ./mockup.html from it before Bob approves the evals
- Risk: Low
- Depends on: C3 feature 16 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/GameStats.tsx` (extends C2 07's quit-game stats), `apps/bloodtower/src/web/components/device/**`, `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-stats.spec.ts`
- Builds: SCR-019, DEC-116
- Deps change: no
- Runs: cloud

## What it does

SCR-019 as its own screen after the outcome (DEC-627): outcome, time played, days, quests done, corruptions taken, gold left, key moments (no Seals broken in C3: no seal breaks, Q-C3-01), and the optional 1–5 fun rating that never blocks Play again or Back; DEC-116's active length against the best and the average.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The gear Menu and any gear panel come back closed, the game not paused, the toolbar on every iPad, and item states recomputed (EV-12).
  - The fun rating, once given, is stored with the game and shown on drill-in from tonight's games.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-12 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] SCR-019: closed before coding (`decided`).
- [ ] DEC-116: closed before coding (`decided`).
- [ ] DEC-117: closed before coding (`decided`).
- [ ] DEC-627: closed before coding (`decided`).
- [ ] SCR-021: closed before coding (`decided`).

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-12. Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `stats.title` | Tonight's tale | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 2 | `stats.outcome` | Outcome: {outcome} | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31); {outcome} is Won or Lost (screen-spec) |
| 3 | `stats.outcome.won` | Won | screen-spec (Outcome: Won or Lost) |
| 4 | `stats.outcome.lost` | Lost | screen-spec (Outcome: Won or Lost) |
| 5 | `stats.time` | Time played: {T} | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 6 | `stats.days` | Days: {N} | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 7 | `stats.quests` | Quests done: {Q} | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 8 | `stats.corruptions` | Corruptions: {C} | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 9 | `stats.gold` | Gold: {G} | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 10 | `stats.moments.title` | Key moments | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 11 | `stats.moment.quest` | Day {N}: {quest} done. | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) (Q-C3-18) |
| 12 | `stats.moment.corruption` | Day {N}: {hero} took a corruption. | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) (Q-C3-18) |
| 13 | `stats.moment.item` | Day {N}: {hero} gained {item}. | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) (Q-C3-18) |
| 14 | `stats.moment.building` | Day {N}: {building} fell. | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) (Q-C3-18) |
| 15 | `stats.moment.chapter` | Day {N}: Chapter won. | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) (Q-C3-18) |
| 16 | `stats.length` | Length: {L} (best {B} · average {A}) | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) (SCR-019, DEC-116) |
| 17 | `rating.label` | How was tonight? | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) (Q-C3-21) |
| 18 | `rating.values` | 1 2 3 4 5 | screen-spec (optional 1-5 on the iPads) |
| 19 | `rating.board` | {R1} · {R2} | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) (the TV shows each seat's rating, e.g. "4 · 2") |
| 20 | `button.play-again` | Play again | screen-spec (pinned order: first) |
| 21 | `button.back` | Back | screen-spec (pinned order: second) |
| 22 | `toolbar.help` | ? | C2 feature 04 (Bob 2026-10-31 10:37); aria-label "Help" |
| 23 | `toolbar.menu` | (gear icon, aria-label "Menu") | C2 feature 04 (Bob 2026-10-31 10:37); icon, no visible text |
| 24 | `help.title` | Help | C2 feature 04 |
| 25 | `help.game-stats` | Here's how tonight went. Rate it if you like, then tap Play again. | locked 2026-10-31 (Loremaster); same text in screen-spec and EV-12 |
| 26 | `help.close` | Close | C2 feature 04 |

## OPEN questions

- ANSWERED Q-C3-18 (Bob approved 2026-10-31): key moments are quest done, item gained, building fallen, corruption taken, chapter won. (key moments)
- ANSWERED Q-C3-21 (Bob approved 2026-10-31): the fun rating is per iPad, shown per seat.

## Eval approval

- See ./approval.md (must be filled before coding).
