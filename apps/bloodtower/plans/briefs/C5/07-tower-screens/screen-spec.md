# Screen spec: C5 / 07-tower-screens — The Tower on screen: level map, room view, the iPad's doors

- Brief: ./plan.md
- Evals: ./evals.md
- Cards: MEC-076, DEC-566, DEC-583

## Rules for every screen

- Viewports: Story board 1920×1080 (Samsung TV); iPad 768×1024, portrait, locked by Bob.
- iPad bottom toolbar on every iPad screen: **?** (help) at the left, the **gear** at the right. Help text is `[COPY: help, <screen>]`.
- Gear panels display on the Story board; their picks are made on the iPad. The gear never opens a panel on the iPad alone.
- No Next-only screens: every iPad screen carries a real choice, or the board advances on its own after its beat. A lone "Next" button is a failed build.
- The board is display only and never scrolls or clips (SCR-013); every story line shows on the board (SCR-014, DEC-057). One primary button per step (SCR-016).
- All story and help text is `[COPY: ...]` until the story pass.

## Purpose

The Tower reuses the Tomb's two halves: the level's room map and the room view (Gamewright pick, pending Bob) (Q-C5-01). The iPad: Open the next door, Rest (at a found shrine), Retreat.

## States and player actions

- Board: shows the state and every line `[COPY: tower-screens, board = "The Tower. Level {N}. / Rooms found: {N}. / A door, shut and cold. / A shrine. You can rest here. / The stairs climb on."]`; never scrolls.
- Gear: opens its panel on the Story board; picks on the iPad. Toolbar: **?** left, gear right.
- Help (?): `[COPY: help, tower-screens = "Tap Open the next door to go deeper. Tap Rest at a shrine, or Retreat to fall back."]` on the board.

## Buttons (exact labels)

- **Open the next door**, **Rest** (only at a found shrine; greyed otherwise), **Retreat**.
- A guard or stair battle hands to the round picker (C4 10).

## Tokens

- {N}

## What happens next

Back to the loop that called it (see ./plan.md).

## OPEN questions

- OPEN Q-C5-01 **[Bob taste call]**: The Tower has no screen cards. What does the board show in the Tower (MEC-076)? Options: (a) reuse the Tomb's two halves (DEC-583): the level's room map left, the room view right; Gamewright files UI cards for it in a design session; (b) the room map only, full width. Gamewright pick: (a) (Gamewright pick, pending Bob).
