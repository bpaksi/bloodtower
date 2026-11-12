Keep this a checklist; do not write a second design doc.

# Brief: C3 / 14-quest-scene — The quest scene: the track, the choice, the item hand-off

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 14-quest-scene
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, UI-042, UI-025, UI-036, MEC-037, MEC-077
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet: the screen changes, see ./screen-spec.md. Illusionist draws ./mockup.html from it before Bob approves the evals
- Risk: Med
- Depends on: C3 feature 07 merged, C2 feature 06 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/QuestScene.tsx` (new), `apps/bloodtower/src/web/components/device/**`, `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-quest.spec.ts`
- Builds: UI-042, UI-025, UI-036
- Deps change: no
- Runs: cloud

## What it does

UI-042: the quest's painting and narration on a Scroll, the 2 or 3 options on the iPad with their costs, a disabled option for a missing item (DEC-654), the item Reveal and the hero pick (UI-036, DEC-653), the rewards (MEC-037 .9) and the quest track (UI-025).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The gear Menu and any gear panel come back closed, the game not paused, the toolbar on every iPad, and item states recomputed (EV-17).
  - A quest left mid-choice reopens at its choice after Continue.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-17 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] UI-042: closed before coding (`decided`).
- [ ] UI-025: closed before coding (`decided`).
- [ ] UI-036: closed before coding (`decided`).
- [ ] MEC-037: closed before coding (`decided`).
- [ ] MEC-077: closed before coding (`decided`).
- [ ] DEC-642: closed before coding (`decided`).
- [ ] DEC-653: closed before coding (`decided`).
- [ ] DEC-654: closed before coding (`decided`).
- [ ] DEC-692: closed before coding (`decided`).
- [ ] DEC-693: closed before coding (`decided`).
- [ ] DEC-714: closed before coding (`decided`).
- [ ] DEC-700: closed before coding (`decided`).

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-12. Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `quest.herald.title` | The Herald | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) (quest name on the track) |
| 2 | `quest.herald.opening` | Tomas the herald meets you at the well. "They take a cart a week now. Will you go?" | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) |
| 3 | `tick.auto` | Moves on by itself. | locked 2026-10-31 (Loremaster); the auto-advance tick (Bob 2026-10-31 10:38) |
| 4 | `choice.prompt` | Will you help? | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) (engine prompt over the options) |
| 5 | `quest.herald.option.take-the-job` | Take the job | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06); shows its reward "Tomas's Map" (EV-01) |
| 6 | `quest.herald.option.ask-for-pay` | Ask for pay first | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06); shows its reward "+10 gold" (EV-01) |
| 7 | `option.needs-item` | Needs {item} | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) (disabled option, DEC-654) |
| 8 | `option.use-item` | Use {item} | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) (the same row once the item is held) |
| 9 | `option.cost` | cost: {N} gold | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) (cost shown beside an option; mockup sample "Help · cost: 2 gold") |
| 10 | `corruption.pick` | Who takes the corruption? | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 11 | `item.pick` | Who takes the reward? | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 12 | `pick.hero` | {hero} | one button per present hero (DEC-693, DEC-653); the hero's name, nothing else |
| 13 | `quest.herald.take-the-job` | Tomas hands you a map of the keep's old ways. "My father drew it. Bring it back if you can." | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) |
| 14 | `quest.herald.ask-for-pay` | Tomas counts ten gold out of the village box. It doesn't take long. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) |
| 15 | `rewards.line` | You gain: {reward} | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 16 | `rewards.badge.gold` | +{N} | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 17 | `rewards.badge.quest-gold` | quest +{N} | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 18 | `quest.herald.end-hook` | "The forest road," Tomas says. "That's where they wait." | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) |
| 19 | `quest.ambush.title` | The Ambush | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) (quest name on the track) |
| 20 | `quest.ambush.opening.1` | Felled trees block the forest road. Men step out from behind them, bows drawn. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) ('the ambush opening', first caption) |
| 21 | `quest.ambush.opening.2` | Their shields have had a crest scratched off. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) ('the ambush opening', second caption; split so each caption stays at or under 120 characters) |
| 22 | `quest.ambush.option.pay-the-toll` | Pay the toll (10 gold) | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) (label); toll 10 gold (Q-C3-22, Bob approved 2026-10-31); Fight is hidden in C3 (Q-C3-02) |
| 23 | `quest.ambush.toll-paid` | "Ten gold, and you walk." You pay, and they melt back into the trees. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) |
| 24 | `quest.ambush.toll-short` | You don't have ten. They take what you have, and a beating for the rest. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) |
| 25 | `quest.ambush.end-hook` | The road is clear. Past the trees, the old keep stands on its hill. | research/stories/ruined-keep/script.md (Bob accepted 2026-11-06) |
| 26 | `toolbar.help` | ? | C2 feature 04 (Bob 2026-10-31 10:37); aria-label "Help" |
| 27 | `toolbar.menu` | (gear icon, aria-label "Menu") | C2 feature 04 (Bob 2026-10-31 10:37); icon, no visible text |
| 28 | `help.title` | Help | C2 feature 04 |
| 29 | `help.quest-scene` | A quest is in front of you. Pick one of its options. | locked 2026-10-31 (Loremaster); same text in screen-spec and EV-12 |
| 30 | `help.close` | Close | C2 feature 04 |

## OPEN questions

- ANSWERED Q-C3-02 (Bob, 2026-10-31 10:09 AM ET): hide Fight until C4.
- ANSWERED Q-C3-22 (Bob approved 2026-10-31): 10 gold; a short group pays all its gold plus 2 HP per present hero, never below 1 HP, and the quest finishes. Was: with Fight hidden, The Ambush finishes only by paying the toll (DEC-662). The toll amount is not carded, and a group that cannot pay cannot win chapter 1. What is the toll, and what happens when the purse is short?

## Eval approval

- See ./approval.md (must be filled before coding).
