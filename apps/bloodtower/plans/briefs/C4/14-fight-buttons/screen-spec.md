# Screen spec: C4 / 14-fight-buttons — Fight on the event and quest scenes

- Brief: ./plan.md
- Evals: ./evals.md
- Cards: UI-041, UI-042, DEC-023, DEC-028

## Rules for every screen

- Viewports: Story board 1920×1080 (Samsung TV); iPad 768×1024, portrait, locked by Bob.
- iPad bottom toolbar on every iPad screen: **?** (help) at the left, the **gear** at the right. Help text is `[COPY: help, <screen>]`.
- Gear panels display on the Story board; their picks are made on the iPad. The gear never opens a panel on the iPad alone.
- No Next-only screens: every iPad screen carries a real choice, or the board advances on its own after its beat. A lone "Next" button is a failed build.
- The board is display only and never scrolls or clips (SCR-013); every story line shows on the board (SCR-014, DEC-057). One primary button per step (SCR-016).
- All story and help text is `[COPY: ...]` until the story pass.

## Purpose

C3 hid Fight (Q-C3-02). C4 shows it on foes and disaster events and on battle options in scenes (Gamewright pick, pending Bob) (Q-C4-02); a Fight pick hands to the battle (features 09, 10).

## States and player actions

- Board: shows the state and every line `[COPY: fight-buttons, board]`; never scrolls.
- iPad: the picks named in "Purpose"; each screen has a real choice (no Next-only screen); toolbar ? left, gear right.
- Gear: opens its panel on the Story board; picks on the iPad.
- Help (?): `[COPY: help, fight-buttons]` on the board.

## What happens next

Back to the loop that called it (see ./plan.md).

## OPEN questions

- OPEN Q-C4-02: Where does Fight show once `fight_enabled` is on? Options: (a) on every foes and disaster event and on every plain-scene option that holds a battle, always enabled; (b) on foes events only; disasters stay Go around / Pay them off until C5. Gamewright pick: (a) (Gamewright pick, pending Bob).
