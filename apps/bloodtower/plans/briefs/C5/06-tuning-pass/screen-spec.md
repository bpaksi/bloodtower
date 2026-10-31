# Screen spec: C5 / 06-tuning-pass — The tuning pass: placeholder numbers become 1.0 numbers

- Brief: ./plan.md
- Evals: ./evals.md
- Cards: DEC-500, DEC-131, DEC-699 to DEC-703

## Rules for every screen

- Viewports: Story board 1920×1080 (Samsung TV); iPad 768×1024, portrait, locked by Bob.
- iPad bottom toolbar on every iPad screen: **?** (help) at the left, the **gear** at the right. Help text is `[COPY: help, <screen>]`.
- Gear panels display on the Story board; their picks are made on the iPad. The gear never opens a panel on the iPad alone.
- No Next-only screens: every iPad screen carries a real choice, or the board advances on its own after its beat. A lone "Next" button is a failed build.
- The board is display only and never scrolls or clips (SCR-013); every story line shows on the board (SCR-014, DEC-057). One primary button per step (SCR-016).
- All story and help text is `[COPY: ...]` until the story pass.

## Purpose

No new screen: engine work, proved by unit evals and the headless simulator. Any text it emits is a `[COPY: ...]` key that a C5 screen feature shows. The rules below bind the screens that display its state.

## OPEN questions

- OPEN Q-C5-05: How is the tuning pass (DEC-500) run? Options: (a) 300 headless simulator games at 2, 3 and 4 heroes, then two table playtests; numbers move only on both; (b) table playtests only. Gamewright pick: (a) (Gamewright pick, pending Bob).
