# Screen spec: C4 / 13-seal-break-live — The seal break live on the board, chapters 1 and 2

- Brief: ./plan.md
- Evals: ./evals.md
- Cards: UI-044, DEC-303

## Rules for every screen

- Viewports: Story board 1920×1080 (Samsung TV); iPad 768×1024, portrait, locked by Bob.
- iPad bottom toolbar on every iPad screen: **?** (help) at the left, the **gear** at the right. Help text is `[COPY: help, <screen>]`.
- Gear panels display on the Story board; their picks are made on the iPad. The gear never opens a panel on the iPad alone.
Auto-advance: the close Scroll and the glyph/boon Reveal have no Next; each advances when its narration or cue ends, or after 4 s when it has no audio (C2-04 rule; Q-C4-17 (Gamewright pick, pending Bob)).
- The board is display only and never scrolls or clips (SCR-013); every story line shows on the board (SCR-014, DEC-057). One primary button per step (SCR-016).
- All story and help text is `[COPY: ...]` until the story pass.

## Purpose

C3 built UI-044's seal step behind the switch; C4 turns it on. The close Scroll, the lit seal, the glyph and boon on a Reveal with the Loremaster's seal line (Gamewright pick, pending Bob) (Q-C4-10), then the freed-skull prompts on the iPad (kingdom, then building). The C3 "Done" confirm becomes the real pick: the iPad confirms which seal broke on the tower.

## States and player actions

- Board: shows the state and every line `[COPY: seal-break-live, board = "The chapter is won. A seal breaks. / {hero} gained {item}. / Skulls are freed. Choose a kingdom."]`; never scrolls.
- Gear: opens its panel on the Story board; picks on the iPad. Toolbar: **?** left, gear right.
- Help (?): a help sheet on the iPad, `[COPY: help, seal-break-live = "Confirm on the iPad which seal broke on the tower, then place the freed skulls: kingdom first, then building. Tap Seal broken when the tower matches."]`, `data-help-screen` = `seal-break-live`; it sends nothing to the host and does not pause.

## Buttons (exact labels)

- Seal step: **Seal broken** (confirms the tower's seal broke; replaces C3's Done).
- Each freed skull: one button per kingdom by name (e.g. **Arisilon**), then one per building by name, then **Place skull**.

## Tokens

- {hero}, {item}

## What happens next

Back to the loop that called it (see ./plan.md).

## OPEN questions

- OPEN Q-C4-10 **[Bob taste call]**: Who speaks the seal-break line at each chapter win? Options: (a) the Loremaster, one line per chapter: `[COPY: seal break ch1, Loremaster = "One seal breaks. The old wards on the tower loosen, and the road to the Count grows shorter."]`, `[COPY: seal break ch2, Loremaster = "A second seal cracks. Somewhere above, something old opens its eyes."]`; (b) the Narrator, one shared line `[COPY: seal break, Narrator]`. Gamewright pick: (a) (Gamewright pick, pending Bob).

> Note (Q-C4-10): the docs use pick (a), the Loremaster per chapter. If Bob picks (b), the Narrator line kept for it is: "A seal breaks. The tower shudders, and Vellmoor hears it."
