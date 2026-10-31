# Screen spec: C4 / 09-battle-board — The battle on the board: horn, foe panel, round results

- Brief: ./plan.md
- Evals: ./evals.md
- Cards: UI-026, CUE-010, UI-030, UI-036, DEC-466

## Rules for every screen

- Viewports: Story board 1920×1080 (Samsung TV); iPad 768×1024, portrait, locked by Bob.
- iPad bottom toolbar on every iPad screen: **?** (help) at the left, the **gear** at the right. Help text is `[COPY: help, <screen>]`.
- Gear panels display on the Story board; their picks are made on the iPad. The gear never opens a panel on the iPad alone.
- No Next-only screens: every iPad screen carries a real choice, or the board advances on its own after its beat. A lone "Next" button is a failed build.
- The board is display only and never scrolls or clips (SCR-013); every story line shows on the board (SCR-014, DEC-057). One primary button per step (SCR-016).
- All story and help text is `[COPY: ...]` until the story pass.

## Purpose

UI-026 on the board: the foe painting (one placeholder per level (Gamewright pick, pending Bob), Q-C4-15), traits, strength left, the present heroes; each round's result; the horn, hit and victory cues (CUE-010), on the board speakers when no tower (Gamewright pick, pending Bob) (Q-C4-14). A Cursed hero's panel shows "4 of N count" (Gamewright pick, pending Bob) (Q-C4-05).

## States and player actions

- Board: shows the state and every line `[COPY: battle-board, board]`; never scrolls.
- iPad: the picks named in "Purpose"; each screen has a real choice (no Next-only screen); toolbar ? left, gear right.
- Gear: opens its panel on the Story board; picks on the iPad.
- Help (?): `[COPY: help, battle-board]` on the board.

## What happens next

Back to the loop that called it (see ./plan.md).

## OPEN questions

- OPEN Q-C4-14: The battle horn and hits (CUE-010) with no tower connected: Options: (a) play them through the Story board's speakers; (b) silent; the board shows the hit only. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-15 **[Bob taste call]**: Foe paintings in C4, before the A1 art run (C5): Options: (a) one placeholder painting per foe level, swapped by A1 in C5; (b) A1 draft art now, as the art lands. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-05: Cursed (DEC-466): does the board show which 4 Advantages counted? Options: (a) yes: the hero panel shows "4 of N count" and dims the rest during the round; (b) no: the app picks silently; only the round result shows. Gamewright pick: (a) (Gamewright pick, pending Bob).
