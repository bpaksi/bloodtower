# Screen spec: C4 / 01-tuning-switches — The C4 switches: Fight on, all chapters on, the C4 end rule

- Brief: ./plan.md
- Evals: ./evals.md
- Cards: DEC-500, DEC-133, DEC-662, DEC-144

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

- OPEN Q-C4-01: What ends a C4 game won, before the C5 finale exists? Options: (a) chapter 3 won (The Lock and The Last Stand done) ends the game won, behind tuning switch `c4_end_after_chapter_3` (on in C4, off in C5), with the DEC-144 win scene and `[COPY: chapter 3 win, Loremaster = "The last seal of the lowlands is broken. Vellmoor sleeps easier tonight. The Count does not."]`; (b) chapter 3 has no end: the game plays until it is lost, and the win is tested only by fixture until C5. Gamewright pick: (a) (Gamewright pick, pending Bob).
