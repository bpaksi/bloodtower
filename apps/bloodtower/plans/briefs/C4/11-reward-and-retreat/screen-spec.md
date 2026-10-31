# Screen spec: C4 / 11-reward-and-retreat — The battle's end on screen: reward, retreat and fall

- Brief: ./plan.md
- Evals: ./evals.md
- Cards: UI-039, UI-040, UI-036, DEC-120, DEC-016, DEC-177

## Rules for every screen

- Viewports: Story board 1920×1080 (Samsung TV); iPad 768×1024, portrait, locked by Bob.
- iPad bottom toolbar on every iPad screen: **?** (help) at the left, the **gear** at the right. Help text is `[COPY: help, <screen>]`.
- Gear panels display on the Story board; their picks are made on the iPad. The gear never opens a panel on the iPad alone.
- No Next-only screens: every iPad screen carries a real choice, or the board advances on its own after its beat. A lone "Next" button is a failed build.
- The board is display only and never scrolls or clips (SCR-013); every story line shows on the board (SCR-014, DEC-057). One primary button per step (SCR-016).
- All story and help text is `[COPY: ...]` until the story pass.

## Purpose

UI-040: the gold and drawn card on a Reveal; the iPads pick who takes the card. UI-039: what a retreat or fall cost, the foe painting and its step-up.

## States and player actions

- Board: shows the state and every line `[COPY: reward-and-retreat, board = "Victory. You found {N} gold and a card. / Who takes {item}? / {hero} takes {item}. / You fell back. It cost {item}. / {hero} fell. It cost {item}. / The foe grows stronger."]`; never scrolls.
- Gear: opens its panel on the Story board; picks on the iPad. Toolbar: **?** left, gear right.
- Help (?): `[COPY: help, reward-and-retreat = "After a win, tap Give to {hero} on an iPad to choose who takes the card. After a retreat or a fall, this shows what it cost."]` on the board.

## Buttons (exact labels)

- Reward: **Give to {hero}**, one button per present hero.
- Retreat or fall result: no iPad button; the board advances after its beat (no Next-only screen).

## Tokens

- {N}, {item}, {hero}

## What happens next

Back to the loop that called it (see ./plan.md).

## OPEN questions

- None.
