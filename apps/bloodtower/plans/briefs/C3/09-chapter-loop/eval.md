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
- How: fixture with `c3_end_after_chapter_1: false`, starting at chapter 2, then 3.
- Pass evidence: Brynthia opens in chapter 2; the whole board in chapter 3; foe level steps +1 a chapter (DEC-185).
- Fails if: a kingdom opens early.

### EV-04 — The seal break with the tower in play
- Requirement: DEC-303, DEC-409.
- Method: unit
- How: fixture with `c3_end_after_chapter_1: false`; win chapter 1 with the tower; seeded break frees 2 skulls.
- Pass evidence: one seal broken, its glyph's boon active, two skull placement prompts (.25 to .29) before chapter 2's enter.
- Fails if: no seal breaks, or freed skulls skip placement.

### EV-05 — Without the tower, seals drop out
- Requirement: DEC-306.
- Method: unit
- How: fixture with `c3_end_after_chapter_1: false`; win chapter 1 without the tower.
- Pass evidence: no seal node, no boon, no skull prompt.
- Fails if: a boon applies without the tower.

### EV-06 — The finale chapter does not win on its quests
- Requirement: DEC-656.
- Method: unit
- How: chapter 3 with The Lock and The Last Stand done.
- Pass evidence: not won; the Tower is unlocked; the chapter keeps running days.
- Fails if: chapter 3 is won without the Tower.

### EV-07 — In C3, clearing chapter 1 is the win
- Requirement: Q-C3-01 (Bob, 2026-10-31).
- Method: unit
- How: C3 tuning (`c3_end_after_chapter_1: true`); win chapter 1 (The Herald done, The Ambush paid off); run once with the tower in play and once without.
- Pass evidence: in both runs the chapter returns won and last; no seal node runs; no seal breaks; no skull prompt; chapter 2's enter never runs.
- Fails if: chapter 2 opens, a seal breaks, or the game keeps running days.

### EV-08 — The enter runs the challenge step and places quest tokens
- Requirement: MEC-033 enter; DEC-133, DEC-134, DEC-146.
- Method: unit
- How: start chapter 1 of The Ruined Keep with a fixed seed; read the node trace and board state.
- Pass evidence: the challenge step node runs once; exactly one token per chapter-1 quest (The Herald, The Ambush) sits on its space; no chapter-2 token is placed; board bounds are Arisilon only.
- Fails if: the challenge step is skipped, a token is missing, doubled or misplaced.

### EV-09 — The start emits cue, narration and card in order
- Requirement: MEC-033 start.
- Method: unit
- How: start chapter 1; read the emitted outputs.
- Pass evidence: in order: the chapter cue, the narration hook (a `[COPY: …]` id), the chapter card view; each exactly once, before day 1's Regroup.
- Fails if: any is missing, repeated, or out of order.

## Survival evals (one per survival invariant in plan.md)

### EV-10 — Continue skips enter and start
- Requirement: DEC-675.
- Method: unit
- How: fixture with `c3_end_after_chapter_1: false`; autosave mid chapter 2; Continue.
- Pass evidence: no chapter cue, narration or card; the saved day resumes.
- Fails if: the chapter card replays.

### EV-11 — Seals survive Continue
- Requirement: DEC-303.
- Method: unit
- How: break a seal, autosave, Continue.
- Pass evidence: the seal stays broken and the boon active.
- Fails if: the seal resets.

## Assumptions surfaced

- The C3 end is a tuning switch, so C4 lifts it without code changes; the chapter 2 and 3 evals run with it off.

## OPEN questions

- ANSWERED Q-C3-01 (Bob, 2026-10-31 10:09 AM ET): clearing chapter 1 counts as the C3 win.
- ANSWERED Q-C3-17 (Bob approved 2026-10-31): the base pack supplies the boons and the app picks; The Ruined Keep names none in 1.0. Was: which glyph boons does The Ruined Keep name for each seal break (DEC-303 "a story may name it")? Or does the app pick and the base pack supply the boons?
