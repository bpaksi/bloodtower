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
- Pass evidence: pay option: purse +10, no item; job option: the group picks a hero, who holds Tomas's Map.
- Fails if: the item goes to the first hero without a pick.

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

## Survival evals (one per survival invariant in plan.md)

### EV-08 — Continue keeps quest progress and items
- Requirement: DEC-151, DEC-653.
- Method: unit
- How: finish The Herald, autosave, Continue.
- Pass evidence: The Herald is done; Tomas's Map is with the same hero.
- Fails if: the quest reopens or the item moves.

## Assumptions surfaced

- A plain scene whose option holds a battle cannot be played in C3. OPEN Q-C3-02.

## OPEN questions

- Q-C3-02 (as feature 05): The Ambush's "Fight them" and The Last Stand are battle options (DEC-692, MEC-077 .4). In C3 is the option disabled, auto-resolved, or is C3 blocked on C4's battle?
