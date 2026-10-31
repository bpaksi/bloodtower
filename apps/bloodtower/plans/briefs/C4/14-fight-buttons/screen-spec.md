# Screen spec: C4 / 14-fight-buttons — Fight on the event and quest scenes

- Brief: ./plan.md
- Evals: ./evals.md
- Cards: UI-041, UI-042, DEC-023, DEC-028

## Rules for every screen

- Viewports: Story board 1920×1080 (Samsung TV); iPad 768×1024, portrait, locked by Bob.
- iPad bottom toolbar on every iPad screen: **?** (help) at the left, the **gear** at the right. Help text is `[COPY: help, <screen>]`.
- Gear panels display on the Story board; their picks are made on the iPad. The gear never opens a panel on the iPad alone.
Auto-advance: no beat on this screen auto-advances; every step waits for a named button.
- The board is display only and never scrolls or clips (SCR-013); every story line shows on the board (SCR-014, DEC-057). One primary button per step (SCR-016).
- All story and help text is `[COPY: ...]` until the story pass.

## Purpose

C3 hid Fight (Q-C3-02). C4 shows it on foes and disaster events and on battle options in scenes (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C4-02); a Fight pick hands to the battle (features 09, 10).

## States and player actions

- Board: shows the state and every line `[COPY: fight-buttons, board = "Foes block the road. / Fight, or find another way."]`; never scrolls.
- Gear: opens its panel on the Story board; picks on the iPad. Toolbar: **?** left, gear right.
- Help (?): a help sheet on the iPad, `[COPY: help, fight-buttons = "Tap Fight to start a battle, or Go around or Pay them off to avoid it. At The Ambush, Pay the toll instead. In a scene, Fight sits beside the scene's other choice."]`, `data-help-screen` = `fight-buttons`; it sends nothing to the host and does not pause.

## Buttons (exact labels)

- Foes or disaster event: **Fight**, **Go around**, **Pay them off (5 gold)** (greyed when short).
- The Ambush: **Fight**, **Pay the toll (10 gold)**.
- A plain scene's battle option: **Fight** plus the scene's other option labels (the C4 test scene: **Slip past**, **Talk them down**).

## Tokens

- none

## What happens next

Back to the loop that called it (see ./plan.md).

## Values (filled from cards)

- Plain scene: the story's narration plus 2–3 options, each from battle, cost, gold, item or flag (DEC-642, MEC-077).
- Narration and option labels are story text: `[COPY: fight-buttons, plain-scene = "Shapes move on the road ahead. They have seen you."]`, `[COPY: fight-buttons, plain-option-2 = "Slip past"]`, `[COPY: fight-buttons, plain-option-3 = "Talk them down"]`.

## OPEN questions

- OPEN Q-C4-02: Where does Fight show once `fight_enabled` is on? Options: (a) on every foes and disaster event and on every plain-scene option that holds a battle, always enabled; (b) on foes events only; disasters stay Go around / Pay them off until C5. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

