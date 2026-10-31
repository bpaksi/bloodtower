# Screen spec: C4 / 04-fight-in-play — Fight in events and scenes: foes, disasters, The Ambush, The Last Stand

- Brief: ./plan.md
- Evals: ./evals.md
- Cards: DEC-023, DEC-028, DEC-647, DEC-662

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

- OPEN Q-C4-02: Where does Fight show once `fight_enabled` is on? Options: (a) on every foes and disaster event and on every plain-scene option that holds a battle, always enabled; (b) on foes events only; disasters stay Go around / Pay them off until C5. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-03: The disaster event's boss-level foe (DEC-028): what level in 1.0? Options: (a) level 4, one under The Warden's 5, as `events.disaster_foe_level` in base tuning; (b) level 5, The Warden's level. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-04: The Ambush with Fight on (DEC-662): keep the C3 short-purse toll rule (Q-C3-22)? Options: (a) keep it: Fight or pay the toll; a short group still pays all gold + 2 HP per present hero; (b) drop it: a short group must Fight. Gamewright pick: (a) (Gamewright pick, pending Bob).
