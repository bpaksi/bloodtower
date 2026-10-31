# Screen spec: C4 / 02-battle-loop — The battle loop: horn, rounds, Fight or Retreat, one action each

- Brief: ./plan.md
- Evals: ./evals.md
- Cards: MEC-038, MEC-024, DEC-011, DEC-015, DEC-118, DEC-119, DEC-122, DEC-128, DEC-129, DEC-130, DEC-643, DEC-649, DEC-650, DEC-655

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

- OPEN Q-C4-11 **[Bob taste call]**: Does a battle round have a timer on the iPads? Options: (a) no timer; the round waits for every present hero; (b) 30 seconds, then a missing pick becomes a normal attack (DEC-129). Gamewright pick: (a) (Gamewright pick, pending Bob).
