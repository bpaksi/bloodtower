Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 14-quest-scene — The quest scene: the track, the choice, the item hand-off

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Risk: Med.

## Checks

### EV-01 — The Herald's two options
- Requirement: DEC-672, UI-042.
- Method: playwright
- How: `c3-quest.spec.ts`: reach The Herald.
- Pass evidence: board: painting and `[COPY: ...]` narration; iPad: exactly two options: 'Ask for pay' → '+10 gold'; 'Take the job' → 'Tomas's Map'.
- Fails if: options on the board, or either gain label differs.

### EV-02 — Item option disabled
- Requirement: DEC-654.
- Method: playwright
- How: The Lock without the Signet.
- Pass evidence: the option greyed with the item's name.
- Fails if: hidden.

### EV-03 — The item hand-off
- Requirement: DEC-653, UI-036.
- Method: playwright
- How: take the job.
- Pass evidence: a Reveal of Tomas's Map; the iPads pick the hero; the hero panel shows the item.
- Fails if: the item is assigned without a pick.

### EV-04 — Quest gold shown
- Requirement: DEC-700.
- Method: playwright
- How: finish a quest with 2 present.
- Pass evidence: the rewards panel lists +5 to each present hero.
- Fails if: no quest gold line.

### EV-05 — Screenshots match
- Requirement: UI-042, UI-025, UI-036.
- Method: screenshot
- How: board and iPad at choice, item Reveal, rewards; compare with ./mockup.html `#choice`, `#item`, `#rewards`.
- Pass evidence: six images matching.
- Fails if: a part out of order.

### EV-06 — Battle options are not drawn
- Requirement: Q-C3-02 (Bob, 2026-10-31).
- Method: playwright
- How: open The Ambush on the iPad and the board.
- Pass evidence: no "Fight them" choice on either device; the toll choice is the one primary button and reads "10 gold" (Gamewright proposal, pending Bob); with purse 6 and 2 present heroes it reads "6 gold · 2 hit points each" and stays enabled.
- Fails if: a Fight choice shows, enabled or disabled.

### EV-08 — Corruption cost: pick the hero who takes it
- Requirement: DEC-693.
- Method: playwright
- How: a quest option costing a corruption, 2 present heroes (test fixture pack).
- Pass evidence: after the option, the iPads list the 2 present heroes; the picked hero's panel shows +1 corruption; the other's is unchanged.
- Fails if: no pick, or the wrong hero takes it.

### EV-09 — The quest track
- Requirement: UI-025.
- Method: playwright
- How: open The Herald; finish it.
- Pass evidence: the board shows the track with 1 step to come; after the choice it shows 1 step done.
- Fails if: no track, or the count is wrong.

### EV-10 — End hook, then back to the building menu
- Requirement: MEC-037 end.
- Method: playwright
- How: finish The Herald from its village; press Next after rewards.
- Pass evidence: the board shows the end hook `[COPY: …]`; the next press returns the iPad to the village's building menu with the quest marker gone.
- Fails if: the end hook is skipped, or the iPad lands elsewhere.

## Survival evals (one per survival invariant in plan.md)

### EV-07 — Continue reopens the choice
- Requirement: DEC-151, DEC-675.
- Method: playwright
- How: quit at The Herald's choice; Continue.
- Pass evidence: the same choice, no narration replay.
- Fails if: the narration replays or the quest is lost.

## Assumptions surfaced

- None beyond the cards cited.

## OPEN questions

- ANSWERED Q-C3-02 (Bob, 2026-10-31 10:09 AM ET): hide Fight until C4.
- Q-C3-22: with Fight hidden, The Ambush finishes only by paying the toll (DEC-662). The toll amount is not carded, and a group that cannot pay cannot win chapter 1. What is the toll, and what happens when the purse is short? Gamewright proposal, pending Bob: 10 gold; short group pays all + 2 HP per present hero, never below 1.
