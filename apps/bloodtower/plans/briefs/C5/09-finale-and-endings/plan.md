Keep this a checklist; do not write a second design doc.

# Brief: C5 / 09-finale-and-endings — The last choice and the two endings on screen

## Meta

- Plan: [C5-finale-polish.md](../../../C5-finale-polish.md)
- Feature: 09-finale-and-endings
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, DEC-663, DEC-664, SCR-018, DEC-144
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet; Illusionist draws ./mockup.html from ./screen-spec.md before Bob approves the evals
- Depends on: 03, 04, C3 16, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/device/Vote.tsx` (new), `apps/bloodtower/src/web/components/board/Outcome*.tsx`
- Builds: DEC-663, DEC-664, SCR-018
- Deps change: no
- Runs: cloud

## What it does

The board shows "The Warden falls. Beneath the keep lies the shard he swore to guard. Shatter it for good, or swear his oath and guard it in his place." (Copy table: last-choice.line) and the two options; each iPad votes (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C5-03); the board ticks who has voted. Then the win line for the flag, voiced (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C5-07), then straight to the outcome (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C5-09).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - Votes cast survive Continue; the outcome is not shown twice.
  - After a restart and Continue, the Menu and any gear panel come back closed.
  - A beat interrupted by restart shows again or the next one shows, its effect applied once.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-14 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; 1.1 work (DEC-502).

## AREA / DEC checklist

- [ ] DEC-663: closed before coding (`decided`).
- [ ] DEC-664: closed before coding (`decided`).
- [ ] SCR-018: closed before coding (`decided`).
- [ ] DEC-144: closed before coding (`decided`).

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-12. Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `last-choice.line` | The Warden falls. Beneath the keep lies the shard he swore to guard. Shatter it for good, or swear his oath and guard it in his place. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) ('last choice, Warden falls'; DEC-663, DEC-667); locked |
| 2 | `board.together` | Choose together. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 3 | `button.shatter` | Shatter the shard | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) ('option, break the seal'); locked |
| 4 | `button.swear` | Swear the oath | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) ('option, swear the oath'); locked |
| 5 | `ipad.your-vote` | Your vote | mockup.html (iPad title) |
| 6 | `board.waiting` | Waiting on: {hero}. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 7 | `board.voted` | {hero} has voted. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 8 | `tie.line` | A tie. Vote once more. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) ('tie, vote again'); locked |
| 9 | `ipad.vote-again` | Vote again | mockup.html (iPad title on the tie) |
| 10 | `board.decided` | The choice is made. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 11 | `win.shattered` | The shard shatters. The Tower's call goes quiet, and the roads are yours. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) ('finale win, seal shattered'; DEC-663) |
| 12 | `win.holds` | You swear his oath and take up his watch. The Tower called to him once. It will call to you. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) ('finale win, seal holds'; trimmed to one breath); replaces the 10-31 line in C5-04's plan |
| 13 | `credits` | (not used) | Q-C5-09 pick (a): no credits Scroll. If Bob picks (b): "Blood Tower: The Ruined Keep. Thank you for playing." |
| 14 | `tick.auto` | Moves on by itself. | locked 2026-10-31 (Loremaster) |
| 15 | `ipad.see-board` | See the Story board. | new - Loremaster (first drawn in mockup.html) |
| 16 | `toolbar.help` | ? | C2 feature 04 (Bob 2026-10-31 10:37); aria-label "Help" |
| 17 | `toolbar.menu` | (gear icon, aria-label "Menu") | C2 feature 04 (Bob 2026-10-31 10:37); icon, no visible text |
| 18 | `help.title` | Help | C2 feature 04 |
| 19 | `help.finale-and-endings` | Each hero taps Shatter the shard or Swear the oath. A tie means one more vote, then the app draws. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 20 | `help.close` | Close | C2 feature 04 |

## OPEN questions

- Q-C4-17 (auto-advance timing, Gamewright pick (a), approved by Bob 2026-10-31 6:16 PM ET) applies to this screen; see C4 plan.

- Resolved Q-C5-03 **[Bob taste call]**: Who makes the last choice in the Tower (DEC-663)? Options: (a) each present hero votes on their iPad; a tie re-votes once, then the seeded draw (DEC-011) breaks it; (b) the hero who struck the last blow chooses; (c) the vote must be unanimous; it repeats until it is. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C5-07 **[Bob taste call]**: Which lines are voiced in 1.0 (DEC-349)? Options: (a) the Loremaster's lines only (chapter cards, seal breaks, the two win lines, the loss); (b) none; all text on Scrolls. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C5-09 **[Bob taste call]**: After a finale win line, before the outcome scene: Options: (a) nothing extra: the win line, then the outcome scene; (b) a short credits Scroll "Blood Tower: The Ruined Keep. Thank you for playing.". Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

## Eval approval

- See ./approval.md (must be filled before coding).

> Note (Q-C5-09): the pick is (a), no credits Scroll, so the credits line is not folded. If Bob picks (b): "Blood Tower: The Ruined Keep. Thank you for playing." (Credits line not folded.)

