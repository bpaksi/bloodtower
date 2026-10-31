# Screen spec: C4 / 12-tomb-screens — The Tomb on screen: the map and the view, the iPad's three corridors

- Brief: ./plan.md
- Evals: ./evals.md
- Cards: AREA-094, DEC-583 to DEC-592, DEC-617 to DEC-620

## Rules for every screen

- Viewports: Story board 1920×1080 (Samsung TV); iPad 768×1024, portrait, locked by Bob.
- iPad bottom toolbar on every iPad screen: **?** (help) at the left, the **gear** at the right. Help text is `[COPY: help, <screen>]`.
- Gear panels display on the Story board; their picks are made on the iPad. The gear never opens a panel on the iPad alone.
- No Next-only screens: every iPad screen carries a real choice, or the board advances on its own after its beat. A lone "Next" button is a failed build.
- The board is display only and never scrolls or clips (SCR-013); every story line shows on the board (SCR-014, DEC-057). One primary button per step (SCR-016).
- All story and help text is `[COPY: ...]` until the story pass.

## Purpose

DEC-583's two halves side by side: the map (found rooms, current glowing, doorways, Exit, Undead Advantage count) and the view (the panning room view). The iPad shows up to three corridor cards plus Listen and Leave (DEC-591). A trap or battle replaces the view (DEC-592). Room art is placeholder (Gamewright pick, pending Bob) (Q-C4-15).

## States and player actions

- Board: shows the state and every line `[COPY: tomb-screens, board = "The Tomb. Rooms found: {N}. / Undead Advantage: {N}. / A cold corridor. Three doors wait. / You hear something behind the door. / A trap. / Something wakes in the dark. / The Exit is open."]`; never scrolls.
- Gear: opens its panel on the Story board; picks on the iPad. Toolbar: **?** left, gear right.
- Help (?): `[COPY: help, tomb-screens = "Tap Left, Ahead or Right on your iPad to move to the next room, Bold or On guard to say how you go in. Use Listen to hear what waits ahead, or Leave to get out."]` on the board.

## Buttons (exact labels)

- Three direction cards **Left**, **Ahead**, **Right** (a wall greys its card); on each open card **Listen**, **Bold**, **On guard** (Bold struck out after Listen, DEC-587).
- **Leave** below the cards.
- A trap or battle in the view hands to its own buttons (C4 10 for a battle; a trap advances on the board).

## Tokens

- {N}

## What happens next

Back to the loop that called it (see ./plan.md).

## OPEN questions

- OPEN Q-C4-08: How many rooms does a 1.0 Tomb deal (DEC-491)? Options: (a) 7 rooms, guardian hidden in one of the last 3; (b) 5 rooms; (c) 9 rooms. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-15 **[Bob taste call]**: Foe paintings in C4, before the A1 art run (C5): Options: (a) one placeholder painting per foe level, swapped by A1 in C5; (b) A1 draft art now, as the art lands. Gamewright pick: (a) (Gamewright pick, pending Bob).
