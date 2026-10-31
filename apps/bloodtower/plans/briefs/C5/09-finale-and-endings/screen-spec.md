# Screen spec: C5 / 09-finale-and-endings — The last choice and the two endings on screen

- Brief: ./plan.md
- Evals: ./evals.md
- Cards: DEC-663, DEC-664, SCR-018, DEC-144

## Rules for every screen

- Viewports: Story board 1920×1080 (Samsung TV); iPad 768×1024, portrait, locked by Bob.
- iPad bottom toolbar on every iPad screen: **?** (help) at the left, the **gear** at the right. Help text is `[COPY: help, <screen>]`.
- Gear panels display on the Story board; their picks are made on the iPad. The gear never opens a panel on the iPad alone.
- No Next-only screens: every iPad screen carries a real choice, or the board advances on its own after its beat. A lone "Next" button is a failed build.
- The board is display only and never scrolls or clips (SCR-013); every story line shows on the board (SCR-014, DEC-057). One primary button per step (SCR-016).
- All story and help text is `[COPY: ...]` until the story pass.

## Purpose

The board shows `[COPY: last choice, Warden falls]` and the two options; each iPad votes (Gamewright pick, pending Bob) (Q-C5-03); the board ticks who has voted. Then the win line for the flag, voiced (Gamewright pick, pending Bob) (Q-C5-07), then straight to the outcome (Gamewright pick, pending Bob) (Q-C5-09).

## States and player actions

- Board: shows the state and every line `[COPY: finale-and-endings, board]`; never scrolls.
- iPad: the picks named in "Purpose"; each screen has a real choice (no Next-only screen); toolbar ? left, gear right.
- Gear: opens its panel on the Story board; picks on the iPad.
- Help (?): `[COPY: help, finale-and-endings]` on the board.

## What happens next

Back to the loop that called it (see ./plan.md).

## OPEN questions

- OPEN Q-C5-03 **[Bob taste call]**: Who makes the last choice in the Tower (DEC-663)? Options: (a) each present hero votes on their iPad; a tie re-votes once, then the seeded draw (DEC-011) breaks it; (b) the hero who struck the last blow chooses; (c) the vote must be unanimous; it repeats until it is. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C5-07 **[Bob taste call]**: Which lines are voiced in 1.0 (DEC-349)? Options: (a) the Loremaster's lines only (chapter cards, seal breaks, the two win lines, the loss); (b) none; all text on Scrolls. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C5-09 **[Bob taste call]**: After a finale win line, before the outcome scene: Options: (a) nothing extra: the win line, then the outcome scene; (b) a short credits Scroll `[COPY: credits]`. Gamewright pick: (a) (Gamewright pick, pending Bob).
