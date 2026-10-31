Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 07-quests-plain-scenes — Quests and plain scenes: markers, the one choice, costs, effects and items

- Brief: ./plan.md
- Mockup: none
- Risk: High. Restore evals included.

## Checks

### EV-01 — The Herald pays as DEC-672 says
- Requirement: Ask for pay: 10 gold; take the job: Tomas's Map.
- Method: unit
- How: `scene.test.ts` on the pack's Herald, both options.
- Pass evidence: pay option: purse +10, no item; job option: the group picks a hero, who holds Tomas's Map; with a party of 3 where 1 hero is in another group, only the 2 present heroes are pickable.
- Fails if: the item goes to the first hero without a pick, or an absent hero is pickable.

### EV-02 — An item option is disabled without the item
- Requirement: DEC-654.
- Method: unit
- How: The Lock with and without a present hero holding the Signet.
- Pass evidence: without: the option is offered disabled; with: enabled; after use the Signet is kept (DEC-674).
- Fails if: the option hides, or the Signet is spent.

### EV-03 — A hit-point cost stops at 1
- Requirement: DEC-714.
- Method: unit
- How: an option costing 3 hit points; heroes at 2 and 8.
- Pass evidence: 2 → 1, 8 → 5; nobody falls.
- Fails if: a hero reaches 0.

### EV-04 — A corruption cost goes to one picked hero
- Requirement: DEC-693.
- Method: unit
- How: an option costing a corruption; 2 present heroes.
- Pass evidence: a prompt to pick one; only that hero +1 corruption.
- Fails if: both heroes take it, or the engine picks.

### EV-05 — Effects apply in listed order
- Requirement: DEC-692.
- Method: unit
- How: an option with gold −10 then a flag.
- Pass evidence: the purse drops, then the flag is set; with too little gold the option is disabled.
- Fails if: effects run in another order.

### EV-06 — A done quest pays quest gold and counts
- Requirement: DEC-700, DEC-041.
- Method: unit
- How: finish The Herald with 2 present heroes.
- Pass evidence: each present hero +5 (on top of the option's reward); chapter 1 shows 1 of 2 done; the day is marked won-quest.
- Fails if: absent heroes get the 5, or the chapter count is unchanged.

### EV-07 — The board waits during a quest
- Requirement: No world time passes (DEC-084).
- Method: unit
- How: run a quest step.
- Pass evidence: no drop, event or day change between enter and end.
- Fails if: the clock moves inside a quest.

### EV-08 — The Ambush in C3: no Fight, the toll finishes it
- Requirement: Q-C3-02 (Bob, 2026-10-31), DEC-662.
- Method: unit
- How: `scene.test.ts` on the pack's Ambush, toll 10 gold (Gamewright proposal, pending Bob, Q-C3-22). Case A: purse 14, 2 present heroes. Case B: purse 6, 2 present heroes at 2 and 9 hit points. Also lint the pack.
- Pass evidence: one option offered (pay the toll); "Fight them" absent from the options; lint accepts this one-option scene as the documented C3 exception (Gamewright default, Bob to confirm) and still rejects a one-option scene with no hidden battle option. A: purse 14 → 4, quest done and counted for chapter 1. B: purse 6 → 0, heroes 2 → 1 and 9 → 7 (−2 each, never below 1), quest done and counted.
- Fails if: "Fight them" is offered or shown disabled, paying leaves the quest open, a short purse blocks the toll or goes below 0, or a hero drops below 1.

## Survival evals (one per survival invariant in plan.md)

### EV-09 — Continue keeps quest progress and items
- Requirement: DEC-151, DEC-653.
- Method: unit
- How: finish The Herald, autosave, Continue.
- Pass evidence: The Herald is done; Tomas's Map is with the same hero.
- Fails if: the quest reopens or the item moves.

### EV-10 — Continue keeps a part-done quest
- Requirement: DEC-151.
- Method: unit
- How: enter a quest, take one step that sets its progress (a flag or step index), Leave before its end; autosave; Continue.
- Pass evidence: the quest is still open, not done and not counted; its progress (flag/step) equals the saved one; re-entering resumes from that step, not the start.
- Fails if: progress is lost, the quest resets, or it counts as done.

## Assumptions surfaced

- A battle option is hidden in C3 (Q-C3-02); its scene stays playable through its other options.
- The Ambush may have one option while Fight is hidden, as a documented C3 exception to the 2–3 option rule (Gamewright default, Bob to confirm).
- Toll 10 gold; short purse pays all + 2 hit points per present hero, never below 1 (Gamewright proposal, pending Bob).

## OPEN questions

- ANSWERED Q-C3-02 (Bob, 2026-10-31 10:09 AM ET): hide Fight until C4.
- Q-C3-22: with Fight hidden, The Ambush finishes only by paying the toll (DEC-662). The toll amount is not carded, and a group that cannot pay cannot win chapter 1. What is the toll, and what happens when the purse is short? Gamewright proposal, pending Bob: 10 gold; short group pays all + 2 HP per present hero, never below 1.
