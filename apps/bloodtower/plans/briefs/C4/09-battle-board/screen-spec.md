# Screen spec: C4 / 09-battle-board — The battle on the board: horn, foe panel, round results

- Brief: ./plan.md
- Evals: ./evals.md
- Cards: UI-026, CUE-010, UI-030, UI-036, DEC-466

## Rules for every screen

- Viewports: Story board 1920×1080 (Samsung TV); iPad 768×1024, portrait, locked by Bob.
- iPad bottom toolbar on every iPad screen: **?** (help) at the left, the **gear** at the right. Help text is `[COPY: help, <screen>]`.
- Gear panels display on the Story board; their picks are made on the iPad. The gear never opens a panel on the iPad alone.
Auto-advance: the round result (won or lost) and victory have no Next; each advances when its narration or cue ends, or after 4 s when it has no audio (C2-04 rule; Q-C4-17 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)).
- The board is display only and never scrolls or clips (SCR-013); every story line shows on the board (SCR-014, DEC-057). One primary button per step (SCR-016).
- All story and help text is `[COPY: ...]` until the story pass.

## Purpose

UI-026 on the board: the foe painting (one placeholder per level (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET), Q-C4-15), traits, strength left, the present heroes; each round's result; the horn, hit and victory cues (CUE-010), on the board speakers when no tower (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C4-14). A Cursed hero's panel shows "4 of N count" (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C4-05).

## States and player actions

- Board: shows the state and every line `[COPY: battle-board, board = "Foe: {foe}. Strength left: {N}. / Round {N}: {hero} struck for {N}. / Round {N}: the foe hit {hero}. / {hero} is Cursed: 4 of {N} count. / The foe falls. Victory."]`; never scrolls.
- Gear: opens its panel on the Story board; picks on the iPad. Toolbar: **?** left, gear right.
- Help (?): a help sheet on the iPad, `[COPY: help, battle-board = "Pick Fight or Retreat on your iPad, then Attack, Cast a spell, Spend an Advantage, Drink a potion or Guard."]`, `data-help-screen` = `battle-board`; it sends nothing to the host and does not pause.

## Buttons (exact labels)

- The board has no buttons. The iPad shows the round picker (C4 10): **Fight**, **Retreat**, then **Attack**, **Cast a spell**, **Spend an Advantage**, **Drink a potion**, **Guard**.

## Tokens

- {foe}, {N}, {hero}, {foe level}
- A won round shows the cut: `{N}` in "struck for {N}" is the wounds cut (DEC-703). A lost round shows −{foe level} hit points beside the hit hero (DEC-703; Gamewright ruling).

## What happens next

Back to the loop that called it (see ./plan.md).

## Values (filled from cards)

- Trait chips: each chip carries `[data-foe-trait]` (placeholder attribute until the build names it).
- Foe traits: two trait chips per foe from DEC-068's set (Beast, Magic, Humanoid, Melee, Undead, Stealth), read from the pack's foe entry (DEC-579, UI-026).
- The Warden's traits: Melee, Humanoid; ability Crushing blow (DEC-688).
- Strength left: the foe's wounds, 4 per level +1 per present hero after the first (DEC-563, DEC-703).

## OPEN questions

- Resolved Q-C4-14: The battle horn and hits (CUE-010) with no tower connected: Options: (a) play them through the Story board's speakers; (b) silent; the board shows the hit only. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C4-15 **[Bob taste call]**: Foe paintings in C4, before the A1 art run (C5): Options: (a) one placeholder painting per foe level, swapped by A1 in C5; (b) A1 draft art now, as the art lands. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C4-05: Cursed (DEC-466): does the board show which 4 Advantages counted? Options: (a) yes: the hero panel shows "4 of N count" and dims the rest during the round; (b) no: the app picks silently; only the round result shows. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

## Audio ids

- `snd.battle_start`: the horn, Tower sound 37 (SND-037, CUE-010). Played on the board when no tower is connected (Q-C4-14).
