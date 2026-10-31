Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 09-chapter-loop — Chapters: open, play days, win on every quest, the seal break

- Brief: ./plan.md
- Mockup: none
- Risk: High. Restore evals included.

## Checks

### EV-01 — A chapter is won when every quest is done
- Requirement: DEC-041.
- Method: unit
- How: `chapter.test.ts`: chapter 1 with The Herald done, then The Ambush done.
- Pass evidence: after the first: not won, next day; after the second: won at that day's .11.
- Fails if: won after one quest.

### EV-02 — A loss on the same day as a finish is a loss
- Requirement: MEC-033 .11.
- Method: unit
- How: last quest done on a day whose drop empties the supply.
- Pass evidence: lost, reason `skulls`.
- Fails if: won.

### EV-03 — Board bounds open per chapter
- Requirement: DEC-134, DEC-146, DEC-662.
- Method: unit
- How: enter chapter 2 then 3.
- Pass evidence: Brynthia opens in chapter 2; the whole board in chapter 3; foe level steps +1 a chapter (DEC-185).
- Fails if: a kingdom opens early.

### EV-04 — The seal break with the tower in play
- Requirement: DEC-303, DEC-409.
- Method: unit
- How: win chapter 1 with the tower; seeded break frees 2 skulls.
- Pass evidence: one seal broken, its glyph's boon active, two skull placement prompts (.25 to .29) before chapter 2's enter.
- Fails if: no seal breaks, or freed skulls skip placement.

### EV-05 — Without the tower, seals drop out
- Requirement: DEC-306.
- Method: unit
- How: win chapter 1 without the tower.
- Pass evidence: no seal node, no boon, no skull prompt.
- Fails if: a boon applies without the tower.

### EV-06 — The finale chapter does not win on its quests
- Requirement: DEC-656.
- Method: unit
- How: chapter 3 with The Lock and The Last Stand done.
- Pass evidence: not won; the Tower is unlocked; the chapter keeps running days.
- Fails if: chapter 3 is won without the Tower.

## Survival evals (one per survival invariant in plan.md)

### EV-07 — Continue skips enter and start
- Requirement: DEC-675.
- Method: unit
- How: autosave mid chapter 2; Continue.
- Pass evidence: no chapter cue, narration or card; the saved day resumes.
- Fails if: the chapter card replays.

### EV-08 — Seals survive Continue
- Requirement: DEC-303.
- Method: unit
- How: break a seal, autosave, Continue.
- Pass evidence: the seal stays broken and the boon active.
- Fails if: the seal resets.

## Assumptions surfaced

- None beyond the cards cited.

## OPEN questions

- Q-C3-01: G-C3 is "The Ruined Keep played to a win", but chapter 3 is won only by the Tower (DEC-656, C5) and chapter 2 needs the Barrow, a Tomb (C4). What does a C3 win look like?
- Q-C3-17: which glyph boons does The Ruined Keep name for each seal break (DEC-303 "a story may name it")? Or does the app pick and the base pack supply the boons?
