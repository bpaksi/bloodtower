# Screen spec: C4 / 05-cursed — Cursed: at most 4 Advantages count in a round

- Brief: ./plan.md
- Evals: ./evals.md
- Cards: DEC-466, DEC-324, DEC-365, MEC-080

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

- OPEN Q-C4-05: Cursed (DEC-466): does the board show which 4 Advantages counted? Options: (a) yes: the hero panel shows "4 of N count" and dims the rest during the round; (b) no: the app picks silently; only the round result shows. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-06: Cursed in the corruption draw (Q-C3-15's seeded set): Options: (a) from C4 the set includes Cursed for every draw (battle, event, scene); (b) Cursed is drawn only when a hero falls in battle. Gamewright pick: (a) (Gamewright pick, pending Bob).
