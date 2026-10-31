# Screen spec: C3 / 16-outcome-scene — The outcome scene: win or loss

- Brief: ./plan.md
- Evals: ./eval.md
- Cards: SCR-018, UI-046, DEC-144, DEC-627, DEC-663, DEC-664, CUE-003
- Viewports: Story board 1920×1080 (Samsung TV), iPad 768×1024 portrait (locked by Bob)
- Rules for every screen: the board is display only and never scrolls or clips (SCR-013); iPads carry choices and taps only, and every story line shows on the board (SCR-014, DEC-057); one step, one primary button on the iPad (SCR-016); Menu on every device (UI-018). Story copy stays `[COPY: ...]`.

## Purpose

Deliver the ending (SCR-018).

## States

- **Win, C3** (Q-C3-01): chapter 1 cleared; scene and line OPEN Q-C3-23.
- **Win, finale (from C5)** (DEC-663, DEC-664): the ending Painting, `[COPY: finale win, seal shattered]` or `[COPY: finale win, seal holds]`.
- **Loss** (DEC-144): one scene per way to lose: skulls, corruption, fallen buildings. Skulls: `[COPY: skulls loss]`. Corruption: `[COPY: ...]` (open, corruption name). Fallen buildings: `[COPY: ...]` (4 fallen buildings, Gamewright proposal, pending Bob, Q-C3-05). Story text on this screen is `[COPY: ...]` per the rule (Gamewright default, Bob to confirm).
- **Summary line** (DEC-627): the format `{N} days. {Q} quests done. {S} skulls on the board.` (a data template, not story copy) and Next.

## Player actions

- iPad: Next.

## Mechanics behind it

SCR-018: the story's win or loss Painting and narration (UI-046, DEC-144), the win line picked by the last choice's flag (DEC-664), a one-line summary that hands off to Game stats; iPads show Next (DEC-627).

## What happens next

Game stats (feature 17), then the session screen (C2 06).

## OPEN questions

- ANSWERED Q-C3-01 (Bob, 2026-10-31 10:09 AM ET): clearing chapter 1 counts as the C3 win.
- Q-C3-23: which win scene and line play for the C3 win? DEC-663 and DEC-664 write the win for the finale, after the last choice, which C3 never reaches. Use a placeholder `[COPY: chapter 1 win]`, or the finale's win scene without the line?
