Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 07-chapters-and-seals — Chapters 2 and 3 in play, the seal break and the seal lines

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-08; survival evals last (EV-08).

## Checks

### EV-01 — Chapter 2 opens after chapter 1
- Requirement: MEC-033.
- Method: sim
- How: win chapter 1.
- Pass evidence: chapter 2 card; Brynthia opens.
- Fails if: game ends.

### EV-02 — One seal per chapter win
- Requirement: DEC-303.
- Method: unit
- How: win chapters 1 and 2 with tower.
- Pass evidence: 2 seals broken.
- Fails if: other count.

### EV-03 — Seal line per chapter (Gamewright pick, pending Bob)
- Requirement: Q-C4-10.
- Method: unit
- How: break each seal.
- Pass evidence: the chapter's own `[COPY: seal break chN, Loremaster]` key.
- Fails if: shared or missing key.

### EV-04 — No seal without the tower
- Requirement: DEC-306.
- Method: unit
- How: no tower, win chapter 1.
- Pass evidence: no seal, no freed skulls.
- Fails if: seal step.

### EV-05 — The Lock needs the Signet
- Requirement: DEC-662.
- Method: sim
- How: reach The Lock without, then with, the Signet.
- Pass evidence: without the Signet The Lock's option is `enabled: false` with the reason `[COPY: needs the Warden's Signet]`; with it, The Lock is done.
- Fails if: The Lock opens without the Signet, or no reason is given.

### EV-06 — Chapter 3 plays
- Requirement: DEC-662.
- Method: sim
- How: fixed seed; win chapter 2.
- Pass evidence: chapter 3 opens with the whole board; quests The Lock and The Last Stand are live; both done wins the chapter.
- Fails if: chapter 3 missing a quest, or won early.

### EV-07 — The boon applies, then the freed skulls
- Requirement: DEC-303, Q-C3-17.
- Method: unit
- How: tower; win chapter 1 with a fixture glyph whose boon is +1 move.
- Pass evidence: state shows the boon active (next roll +1) before the first freed-skull prompt; freed skulls = `seals.freed[1]` = 2.
- Fails if: no boon, or skulls before the boon.

## Survival evals (one per survival invariant in plan.md)

### EV-08 — Seal break survives Continue
- Requirement: DEC-675.
- Method: playwright
- How: quit after stamp, before seal; Continue.
- Pass evidence: seal break shows.
- Fails if: skipped.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C4-10 **[Bob taste call]**: Who speaks the seal-break line at each chapter win? Options: (a) the Loremaster, one line per chapter: `[COPY: seal break ch1, Loremaster = "The roads are clear and a seal breaks. Ahead stands the Ruined Keep."]`, `[COPY: seal break ch2, Loremaster = "The Keep gives up its dead, and a second seal cracks. The Tower waits."]`; (b) the Narrator, one shared line `[COPY: seal break, Narrator]`. Gamewright pick: (a) (Gamewright pick, pending Bob).

> Note (Q-C4-10): the docs use pick (a), the Loremaster per chapter. If Bob picks (b), the Narrator line kept for it is: "A seal breaks. The tower shudders."
