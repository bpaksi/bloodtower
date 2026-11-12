# Screen spec: C5 / 09-finale-and-endings — The last choice and the two endings on screen

- Brief: ./plan.md
- Evals: ./eval.md
- Cards: DEC-663, DEC-664, SCR-018, DEC-144

## Rules for every screen

- Viewports: Story board 1920×1080 (Samsung TV); iPad 768×1024, portrait, locked by Bob.
- iPad bottom toolbar on every iPad screen: **?** (help) at the left, the **gear** at the right. Help text is this screen's help line in the Copy table in ./plan.md.
- Gear panels display on the Story board; their picks are made on the iPad. The gear never opens a panel on the iPad alone.
Auto-advance: the win line has no Next; each advances when its narration or cue ends, or after 4 s when it has no audio (C2-04 rule; Q-C4-17 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)).
- The board is display only and never scrolls or clips (SCR-013); every story line shows on the board (SCR-014, DEC-057). One primary button per step (SCR-016).
- All story and help text is in the Copy table in ./plan.md (Loremaster, 2026-11-12).

## Purpose

The board shows "The Warden falls. Beneath the keep lies the shard he swore to guard. Shatter it for good, or swear his oath and guard it in his place." (Copy table: last-choice.line) and the two options; each iPad votes (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C5-03); the board ticks who has voted. Then the win line for the flag, voiced (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C5-07), then straight to the outcome (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C5-09).

## States and player actions

- Board: shows the state and every line "Choose together. / Waiting on: {hero}. / {hero} has voted. / The choice is made." (Copy table: board.* rows); never scrolls.
- Gear: opens its panel on the Story board; picks on the iPad. Toolbar: **?** left, gear right.
- Help (?): a help sheet on the iPad, "Each hero taps Shatter the shard or Swear the oath. A tie means one more vote, then the app draws." (Copy table: help.finale-and-endings), `data-help-screen` = `finale-and-endings`; it sends nothing to the host and does not pause.

## Buttons (exact labels)

- Vote: **Shatter the shard**, **Swear the oath** on each present iPad. A tie shows the same two again under "A tie. Vote once more." (Copy table: tie.line).
- The win line and the outcome: no button; the board advances (no credits, Q-C5-09 pick a).

## Tokens

- {hero}

## What happens next

Back to the loop that called it (see ./plan.md).

## OPEN questions

- Resolved Q-C5-03 **[Bob taste call]**: Who makes the last choice in the Tower (DEC-663)? Options: (a) each present hero votes on their iPad; a tie re-votes once, then the seeded draw (DEC-011) breaks it; (b) the hero who struck the last blow chooses; (c) the vote must be unanimous; it repeats until it is. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C5-07 **[Bob taste call]**: Which lines are voiced in 1.0 (DEC-349)? Options: (a) the Loremaster's lines only (chapter cards, seal breaks, the two win lines, the loss); (b) none; all text on Scrolls. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C5-09 **[Bob taste call]**: After a finale win line, before the outcome scene: Options: (a) nothing extra: the win line, then the outcome scene; (b) a short credits Scroll "Blood Tower: The Ruined Keep. Thank you for playing.". Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

> Note (Q-C5-09): the pick is (a), no credits Scroll, so the credits line is not folded. If Bob picks (b): "Blood Tower: The Ruined Keep. Thank you for playing." (Credits line not folded.)

