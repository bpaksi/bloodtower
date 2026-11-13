# Screen spec: C3 / 16-outcome-scene — The outcome scene: win or loss

- Brief: ./plan.md
- Evals: ./eval.md
- Cards: SCR-018, UI-046, DEC-144, DEC-627, DEC-663, DEC-664, CUE-003
- Viewports: Story board 1920×1080 (Samsung TV), iPad 768×1024 portrait (locked by Bob)
- Rules for every screen: the board is display only and never scrolls or clips (SCR-013); iPads carry choices and taps only, and every story line shows on the board (SCR-014, DEC-057); one step, one primary button on the iPad (SCR-016); the bottom toolbar on every iPad state, "?" help at the left and the gear (Menu) at the right (C2 feature 04; Bob 2026-10-31 10:37/10:38); the happy path never needs the gear. Help text (Loremaster 2026-10-31): "The chapter is over. See how it ended; the game stats come next.". Story copy is in the Copy table in ./plan.md.

## Purpose

Deliver the ending (SCR-018).

## States

- **Win, C3** (Q-C3-01): chapter 1 cleared; the DEC-144 win scene, then the Loremaster line "The roads are open. On the far hill, a fire burns in the old keep, where no one has lived for forty years." (Q-C3-23, Bob approved 2026-10-31).
- **Win, finale (from C5)** (DEC-663, DEC-664): the ending Painting, "The shard shatters. The Tower's call goes quiet, and the roads are yours." or "You swear his oath and take up his watch. The Tower called to him once. It will call to you.".
- **Loss** (DEC-144): one scene per way to lose: skulls, corruption, fallen buildings. Skulls: "The last skull falls. The Tower's shadow covers the land, and the roads are his for good." Corruption: "One of you hears the Tower call, and goes to it. Without them, the hunt is over." Fallen buildings: "Four strongholds have fallen. There is nowhere left to hold, and his raiders own the land." (4 fallen buildings, Bob approved 2026-10-31, Q-C3-05). All story text on this screen is in the Copy table in ./plan.md.
- **Summary line** (DEC-627): the format `{N} days. {Q} quests done. {S} skulls on the board.` (a data template, not story copy); no Next.

## Player actions

- iPad: no body buttons. The scene auto-advances when its narration or cue ends (4 s with no audio; Bob 2026-10-31 10:38 AM ET); the summary line then holds 4 s and auto-advances to Game stats (feature 17).

## Mechanics behind it

SCR-018: the story's win or loss Painting and narration (UI-046, DEC-144), the win line picked by the last choice's flag (DEC-664), a one-line summary that hands off to Game stats; it auto-advances to Game stats, no Next (DEC-627; Bob 2026-10-31 10:38 AM ET).

## What happens next

Game stats (feature 17), then the session screen (C2 06).

## OPEN questions

- ANSWERED Q-C3-01 (Bob, 2026-10-31 10:09 AM ET): clearing chapter 1 counts as the C3 win.
- ANSWERED Q-C3-23 (Bob approved 2026-10-31): the DEC-144 win scene plays, then the Loremaster line "The roads are open. On the far hill, a fire burns in the old keep, where no one has lived for forty years.". Was: which win scene and line play for the C3 win? DEC-663 and DEC-664 write the win for the finale, after the last choice, which C3 never reaches. Use a placeholder line, or the finale's win scene without the line?
