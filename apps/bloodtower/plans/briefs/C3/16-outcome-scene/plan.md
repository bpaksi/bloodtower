Keep this a checklist; do not write a second design doc.

# Brief: C3 / 16-outcome-scene — The outcome scene: win or loss

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 16-outcome-scene
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, SCR-018, UI-046
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet: the screen changes, see ./screen-spec.md. Illusionist draws ./mockup.html from it before Bob approves the evals
- Risk: Med
- Depends on: C3 feature 10 merged, C2 feature 07 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/OutcomeScene.tsx` (new), `apps/bloodtower/src/web/components/device/**`, `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-outcome.spec.ts`
- Builds: SCR-018, UI-046
- Deps change: no
- Runs: cloud

## What it does

SCR-018: the story's win or loss Painting and narration (UI-046, DEC-144), the win line picked by the last choice's flag (DEC-664), a one-line summary that hands off to Game stats; it auto-advances to Game stats, no Next (DEC-627; Bob 2026-10-31 10:38 AM ET).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The gear Menu and any gear panel come back closed, the game not paused, the toolbar on every iPad, and item states recomputed (EV-15).
  - A host restart on the outcome scene lands on the session screen with the game listed with its outcome, not on a half-shown scene.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-15 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] SCR-018: closed before coding (`decided`).
- [ ] UI-046: closed before coding (`decided`).
- [ ] DEC-144: closed before coding (`decided`).
- [ ] DEC-627: closed before coding (`decided`).
- [ ] DEC-663: closed before coding (`decided`).
- [ ] DEC-664: closed before coding (`decided`).
- [ ] CUE-003: closed before coding (`decided`).

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-12. Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `win.scene` | Chapter cleared. | new - Loremaster (the DEC-144 'win' scene's own narration, before the Loremaster line; mockup sample was 'Chapter cleared. The roads are safe, for now.') |
| 2 | `win.chapter-1` | The roads are open. On the far hill, a fire burns in the old keep, where no one has lived for forty years. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) ('chapter 1 win, Loremaster'; Q-C3-23) |
| 3 | `tick.auto` | Moves on by itself. | locked 2026-10-31 (Loremaster); the auto-advance tick (Bob 2026-10-31 10:38) |
| 4 | `loss.skulls` | The last skull falls. The Tower's shadow covers the land, and the roads are his for good. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) ('skulls loss'; DEC-144) |
| 5 | `loss.corruption` | One of you hears the Tower call, and goes to it. Without them, the hunt is over. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) ('corruption loss') |
| 6 | `loss.fallen-buildings` | Four strongholds have fallen. There is nowhere left to hold, and his raiders own the land. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) ('fallen buildings loss'; Q-C3-05) |
| 7 | `summary.line` | {N} days. {Q} quests done. {S} skulls on the board. | locked: data template (DEC-627; the EV-02 regex) |
| 8 | `win.finale.shattered` | The shard shatters. The Tower's call goes quiet, and the roads are yours. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) (C5 only; DEC-663) |
| 9 | `win.finale.holds` | You swear his oath and take up his watch. The Tower called to him once. It will call to you. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) (C5 only; trimmed to one breath, replaces the 10-31 line in C5-04's plan) |
| 10 | `toolbar.help` | ? | C2 feature 04 (Bob 2026-10-31 10:37); aria-label "Help" |
| 11 | `toolbar.menu` | (gear icon, aria-label "Menu") | C2 feature 04 (Bob 2026-10-31 10:37); icon, no visible text |
| 12 | `help.title` | Help | C2 feature 04 |
| 13 | `help.outcome-scene` | The chapter is over. See how it ended; the game stats come next. | locked 2026-10-31 (Loremaster); same text in screen-spec and EV-12 |
| 14 | `help.close` | Close | C2 feature 04 |

## OPEN questions

- ANSWERED Q-C3-01 (Bob, 2026-10-31 10:09 AM ET): clearing chapter 1 counts as the C3 win.
- ANSWERED Q-C3-23 (Bob approved 2026-10-31): the DEC-144 win scene plays, then the Loremaster line "The roads are open. On the far hill, a fire burns in the old keep, where no one has lived for forty years.". Was: which win scene and line play for the C3 win? DEC-663 and DEC-664 write the win for the finale, after the last choice, which C3 never reaches. Use a placeholder line, or the finale's win scene without the line?

## Eval approval

- See ./approval.md (must be filled before coding).
