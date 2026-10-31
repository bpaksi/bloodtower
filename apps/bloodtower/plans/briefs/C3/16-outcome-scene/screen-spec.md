# Screen spec: C3 / 16-outcome-scene — The outcome scene: win or loss

- Brief: ./plan.md
- Evals: ./eval.md
- Cards: SCR-018, UI-046, DEC-144, DEC-627, DEC-663, DEC-664, CUE-003
- Viewports: Story board 1920×1080 (Samsung TV), iPad 1024×768
- Rules for every screen: the board is display only and never scrolls or clips (SCR-013); iPads carry choices and taps only, and every story line shows on the board (SCR-014, DEC-057); one step, one primary button on the iPad (SCR-016); Menu on every device (UI-018). Story copy stays `[COPY: ...]`.

## Purpose

Deliver the ending (SCR-018).

## States

- **Win** (DEC-663, DEC-664): the ending Painting, "Chapter cleared. The seal is shattered, and the dark loosens its hold." or "Chapter cleared. The seal holds, and you stand guard over it.".
- **Loss** (DEC-144): one scene per way to lose: skulls, corruption, fallen buildings. Skulls: "Too many skulls. The kingdom falls to the dark." Corruption: `[COPY: ...]` (open, corruption name). Fallen buildings: `[COPY: ...]` (open, Q-C3-05).
- **Summary line** (DEC-627): "{N} days. {Q} quests done. {S} skulls on the board." and Next.

## Player actions

- iPad: Next.

## Mechanics behind it

SCR-018: the story's win or loss Painting and narration (UI-046, DEC-144), the win line picked by the last choice's flag (DEC-664), a one-line summary that hands off to Game stats; iPads show Next (DEC-627).

## What happens next

Game stats (feature 17), then the session screen (C2 06).

## OPEN questions

- Q-C3-01
