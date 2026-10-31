# Screen spec: C4 / 12-tomb-screens — The Tomb on screen: the map and the view, the iPad's three corridors

- Brief: ./plan.md
- Evals: ./evals.md
- Cards: AREA-094, DEC-583 to DEC-592, DEC-617 to DEC-620

## Rules for every screen

- Viewports: Story board 1920×1080 (Samsung TV); iPad 768×1024, portrait, locked by Bob.
- iPad bottom toolbar on every iPad screen: **?** (help) at the left, the **gear** at the right. Help text is `[COPY: help, <screen>]`.
- Gear panels display on the Story board; their picks are made on the iPad. The gear never opens a panel on the iPad alone.
Auto-advance: the trap result has no Next; each advances when its narration or cue ends, or after 4 s when it has no audio (C2-04 rule; Q-C4-17 (Gamewright pick, pending Bob)).
- The board is display only and never scrolls or clips (SCR-013); every story line shows on the board (SCR-014, DEC-057). One primary button per step (SCR-016).
- All story and help text is `[COPY: ...]` until the story pass.

## Purpose

DEC-583's two halves side by side: the map (found rooms, current glowing, doorways, Exit, Undead Advantage count) and the view (the panning room view). The iPad shows up to three corridor cards plus Listen and Leave (DEC-591). A trap or battle replaces the view (DEC-592). Room art is placeholder (Gamewright pick, pending Bob) (Q-C4-15).

## States and player actions

- Board: shows the state and every line `[COPY: tomb-screens, board = "The Tomb. Rooms found: {N}. / Undead Advantage: {N}. / A cold corridor. Three doors wait. / You hear something behind the door. / A trap. / Something wakes in the dark. / The Exit is open."]`; never scrolls.
- Gear: opens its panel on the Story board; picks on the iPad. Toolbar: **?** left, gear right.
- Help (?): a help sheet on the iPad, `[COPY: help, tomb-screens = "Pick Left, Ahead or Right on your iPad, then Listen, Bold or On guard on that card. Tap Leave to get out."]`, `data-help-screen` = `tomb-screens`; it sends nothing to the host and does not pause.

## Buttons (exact labels)

- Three direction cards **Left**, **Ahead**, **Right** (a wall greys its card); on each open card **Listen**, **Bold**, **On guard** (Bold struck out after Listen, DEC-587).
- **Leave** below the cards.
- A trap or battle in the view hands to its own buttons (C4 10 for a battle; a trap advances on the board).

## Tokens

- {N}

## What happens next

Back to the loop that called it (see ./plan.md).

## Values (filled from cards)

- Map: a 4×4 grid, entrance on an edge cell, 6–7 rooms at Standard plus the Exit; unrevealed rooms hidden (DEC-603, DEC-583).
- Listen: the room-kind sound plays on the board; the iPad shows no hint text beyond `[COPY: tomb-screens, listen = "You listen down the corridor."]` (DEC-618).
- Trap result: Pit (one hero of the group's pick, −4 HP) or Falling Rocks (each −2 HP) (DEC-606); `[COPY: tomb-screens, pit = "..."]`, `[COPY: tomb-screens, rocks = "..."]`.

## OPEN questions

- ANSWERED by DEC-603 (0005) Q-C4-08: How many rooms does a 1.0 Tomb deal (DEC-491)? Options: (a) 7 rooms, guardian hidden in one of the last 3; (b) 5 rooms; (c) 9 rooms. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-15 **[Bob taste call]**: Foe paintings in C4, before the A1 art run (C5): Options: (a) one placeholder painting per foe level, swapped by A1 in C5; (b) A1 draft art now, as the art lands. Gamewright pick: (a) (Gamewright pick, pending Bob).
