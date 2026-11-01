# Screen spec: C4 / 11-reward-and-retreat — The battle's end on screen: reward, retreat and fall

- Brief: ./plan.md
- Evals: ./eval.md
- Cards: UI-039, UI-040, UI-036, DEC-120, DEC-016, DEC-177

## Rules for every screen

- Viewports: Story board 1920×1080 (Samsung TV); iPad 768×1024, portrait, locked by Bob.
- iPad bottom toolbar on every iPad screen: **?** (help) at the left, the **gear** at the right. Help text is `[COPY: help, <screen>]`.
- Gear panels display on the Story board; their picks are made on the iPad. The gear never opens a panel on the iPad alone.
Auto-advance: "Card taken" (after a Give to {hero} press), the retreat result and the fall result have no Next; the reward Reveal does not auto-advance: a screen with a choice waits for that choice, so it waits for the **Give to {hero}** pick (Gamewright ruling); each advances when its narration or cue ends, or after 4 s when it has no audio (C2-04 rule; Q-C4-17 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)).
- The board is display only and never scrolls or clips (SCR-013); every story line shows on the board (SCR-014, DEC-057). One primary button per step (SCR-016).
- All story and help text is `[COPY: ...]` until the story pass.

## Purpose

UI-040: the gold and drawn card on a Reveal; the iPads pick who takes the card. UI-039: what a retreat or fall cost, the foe painting and its step-up.

## States and player actions

- Board: shows the state and every line `[COPY: reward-and-retreat, board = "Victory. You found {N} gold and a card. / Who takes {item}? / {hero} takes {item}. / You fell back. It cost {item}. / {hero} fell. It cost {item}. / The foe grows stronger."]`; never scrolls.
- Gear: opens its panel on the Story board; picks on the iPad. Toolbar: **?** left, gear right.
- Help (?): a help sheet on the iPad, `[COPY: help, reward-and-retreat = "Tap Give to {hero} on an iPad to choose who takes the card."]`, `data-help-screen` = `reward-and-retreat`; it sends nothing to the host and does not pause.

## Buttons (exact labels)

- Reward: **Give to {hero}**, one button per present hero.
- Card taken: no iPad button; the board advances after its beat (Sentinel recheck 4).
- Retreat or fall result: no iPad button; the board advances after its beat (no Next-only screen).

## Tokens

- {N}, {item}, {hero}

## What happens next

Back to the loop that called it (see ./plan.md).

## Values (filled from cards)

- Reward: 2 gold × foe level (DEC-547).
- Retreat cost: a move in a group's turn, none at day close; the foe's last attack; back a space (DEC-313, DEC-670).
- Fall cost: 2 × foe level split and capped; corruption, back at 1 HP (DEC-177, DEC-179, DEC-119).
- Step-up shown only when the 1-in-3 roll hits: `[data-foe-level]` `N → N+1` (DEC-555).

## OPEN questions

- None.
