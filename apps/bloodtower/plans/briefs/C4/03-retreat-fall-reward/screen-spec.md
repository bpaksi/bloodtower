# Screen spec: C4 / 03-retreat-fall-reward — Battle ends: the reward, the retreat, the group's fall

- Brief: ./plan.md
- Evals: ./evals.md
- Cards: DEC-120, DEC-016, DEC-177, DEC-670, DEC-671

## Rules for every screen

- Viewports: Story board 1920×1080 (Samsung TV); iPad 768×1024, portrait, locked by Bob.
- iPad bottom toolbar on every iPad screen: **?** (help) at the left, the **gear** at the right. Help text is `[COPY: help, <screen>]`.
- Gear panels display on the Story board; their picks are made on the iPad. The gear never opens a panel on the iPad alone.
- No Next-only screens: every iPad screen carries a real choice, or the board advances on its own after its beat. A lone "Next" button is a failed build.
- The board is display only and never scrolls or clips (SCR-013); every story line shows on the board (SCR-014, DEC-057). One primary button per step (SCR-016).
- All story and help text is `[COPY: ...]` until the story pass.

## Purpose

No new screen: engine work, proved by unit evals and the headless simulator. Any text it emits is a `[COPY: ...]` key that a C4 screen feature shows. The rules below bind the screens that display its state.

## OPEN questions

- OPEN Q-C4-12: A fallen group's gold loss (DEC-177): how much? Options: (a) half the purse, rounded down, as `battle.fall_gold_loss` = 0.5; (b) a flat 10 gold, never below 0. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-13: A foe that stays and grows (DEC-016): is the growth capped? Options: (a) capped at +2 levels over its start; (b) no cap. Gamewright pick: (a) (Gamewright pick, pending Bob).
