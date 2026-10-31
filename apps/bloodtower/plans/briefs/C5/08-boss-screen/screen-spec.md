# Screen spec: C5 / 08-boss-screen — The Warden on screen: phases and the tower show

- Brief: ./plan.md
- Evals: ./evals.md
- Cards: DEC-567, DEC-327, UI-026

## Rules for every screen

- Viewports: Story board 1920×1080 (Samsung TV); iPad 768×1024, portrait, locked by Bob.
- iPad bottom toolbar on every iPad screen: **?** (help) at the left, the **gear** at the right. Help text is `[COPY: help, <screen>]`.
- Gear panels display on the Story board; their picks are made on the iPad. The gear never opens a panel on the iPad alone.
Auto-advance: each phase show, the round result and "The Warden falls" have no Next; each advances when its narration or cue ends, or after 4 s when it has no audio (C2-04 rule; Q-C4-17 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)).
- The board is display only and never scrolls or clips (SCR-013); every story line shows on the board (SCR-014, DEC-057). One primary button per step (SCR-016).
- All story and help text is `[COPY: ...]` until the story pass.

## Purpose

The foe panel for The Warden with a phase change: new painting (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C5-02) and a full tower show; with no tower, a board-only show (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C5-08).

## States and player actions

- Board: shows the state and every line `[COPY: boss-screen, board = "The Warden. Strength left: {N}. / The Warden changes. / The Warden falls."]`; never scrolls.
- Round result: after each round the board shows the result line, then advances per the Auto-advance line above (no Next).
- Gear: opens its panel on the Story board; picks on the iPad. Toolbar: **?** left, gear right.
- Help (?): a help sheet on the iPad, `[COPY: help, boss-screen = "The Warden's last battle. Pick Fight or Retreat on your iPad, then your action."]`, `data-help-screen` = `boss-screen`; it sends nothing to the host and does not pause.

## Buttons (exact labels)

- The board has no buttons. The iPad shows the round picker (C4 10) with the same labels: **Fight**, **Retreat**, **Attack**, **Cast a spell**, **Spend an Advantage**, **Drink a potion**, **Guard**. A phase change has no button; the board advances after the show.

## Tokens

- {N}

## What happens next

Back to the loop that called it (see ./plan.md).

## Values (filled from cards)

- Trait chips: each chip carries `[data-foe-trait]` (placeholder attribute until the C4-09 build names it); The Warden shows Melee and Humanoid.
- The Warden: level 5, Melee + Humanoid, Crushing blow +1/+2/+3 by phase; phases at 2/3 and 1/3 wounds left (DEC-688, DEC-567, DEC-703).

## OPEN questions

- OPEN Q-C5-02 **[Bob taste call]**: The Warden's three phases (DEC-567): three paintings or one? Options: (a) three paintings, one per phase; (b) one painting, darkening at each phase. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- OPEN Q-C5-08: The boss's full tower show (DEC-567, DEC-327) with no tower connected: Options: (a) a board-only show: the painting change, a shake and the sound on the board speakers; (b) skip the show. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
