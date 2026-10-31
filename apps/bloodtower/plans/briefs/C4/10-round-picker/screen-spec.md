# Screen spec: C4 / 10-round-picker — The round picker on the iPad: Fight or Retreat, then one action

- Brief: ./plan.md
- Evals: ./eval.md
- Cards: UI-027, DEC-118, DEC-129

## Rules for every screen

- Viewports: Story board 1920×1080 (Samsung TV); iPad 768×1024, portrait, locked by Bob.
- iPad bottom toolbar on every iPad screen: **?** (help) at the left, the **gear** at the right. Help text is `[COPY: help, <screen>]`.
- Gear panels display on the Story board; their picks are made on the iPad. The gear never opens a panel on the iPad alone.
Auto-advance: no beat on this screen auto-advances; every step waits for a named button. "All picked" is not a held beat: once the last present hero picks, the round runs and the board goes straight to the round result (C4 09) (Gamewright ruling).
- The board is display only and never scrolls or clips (SCR-013); every story line shows on the board (SCR-014, DEC-057). One primary button per step (SCR-016).
- All story and help text is `[COPY: ...]` until the story pass.

## Purpose

UI-027: the group picks Fight or Retreat; then each present hero picks one action, all at once (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C4-16); the board ticks each hero who has picked. No timer (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C4-11).

## States and player actions

- Board: shows the state and every line `[COPY: round-picker, board = "Fight or Retreat? / Waiting on: {hero}. / {hero} has picked. / Everyone has picked. The round begins."]`; never scrolls.
- Gear: opens its panel on the Story board; picks on the iPad. Toolbar: **?** left, gear right.
- Help (?): a help sheet on the iPad, `[COPY: help, round-picker = "Choose Fight or Retreat, then each hero picks Attack, Cast a spell, Spend an Advantage, Drink a potion or Guard. The round starts when everyone has picked."]`, `data-help-screen` = `round-picker`; it sends nothing to the host and does not pause.

## Buttons (exact labels)

- Step 1, the group (every present iPad): **Fight**, **Retreat**.
- Step 2, each present hero: **Attack**, **Cast a spell** (then the spell: **Lightning**, **Fireball**, **Magic Missile**), **Spend an Advantage**, **Drink a potion** (then **On {hero}**), **Guard** (guard virtue). An action the hero cannot take is greyed with its label. After picking: **Change pick** until the last present hero has picked (approved by Bob 2026-10-31 6:16 PM ET, Q-C4-18).
- A sat-out hero: no buttons; `[COPY: sitting out = "You are sitting out this battle. Watch the board."]`.

## Tokens

- {hero}, {N}

## What happens next

Back to the loop that called it (see ./plan.md).

## Values (filled from cards)

- Changing a pick: after picking, a hero sees **Change pick** (label and rule approved by Bob 2026-10-31 6:16 PM ET, Q-C4-18); a hero may change their pick until the last present hero has picked; then the round runs (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C4-18). DEC-129 is silent.

## OPEN questions

- Resolved Q-C4-18 **[Bob taste call]**: Can a hero change a pick before the round runs (DEC-129)? Options: (a) yes, until the last present hero has picked; (b) no, a pick locks on tap. Gamewright pick: (a). Resolved: (a), approved by Bob 2026-10-31 6:16 PM ET ("Approve all").

- Resolved Q-C4-16 **[Bob taste call]**: Round actions on the iPads (DEC-129): all at once or in turn? Options: (a) all at once; the board ticks each hero who has picked, and the round runs when all have; (b) in turn order, one iPad at a time. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C4-11 **[Bob taste call]**: Does a battle round have a timer on the iPads? Options: (a) no timer; the round waits for every present hero; (b) 30 seconds, then a missing pick becomes a normal attack (DEC-129). Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
