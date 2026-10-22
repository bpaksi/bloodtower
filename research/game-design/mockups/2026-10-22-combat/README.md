# Combat simulator (2026-10-22)

A thinking tool for Q-023, the combat numbers. It runs the fight loop of MEC-024 with the rulings of the 2026-10-22 session (DEC-118 to DEC-130). This is a design mockup, not an app; nothing here is built or imported by any app.

| File | What |
|---|---|
| `combat-sim.html` | Pick a party from the six classes, a foe level, matching Advantages, potions and a guard virtue. Shows win rate, rounds, hit points lost and falls over 10,000 seeded fights, the same party against levels 1 to 8, and one fight round by round. Every number in OPT-010 can be changed on the page. |
| `combat-sim.png` | Headless Chromium screenshot (1600×1000). |

## How to open

Open `combat-sim.html` in a browser. No build, no server, no network.

## How the heroes play

The page plays each hero by a fixed rule, so the results show the numbers and not good or bad play:
- The magic user always casts: their once spell (Lightning or Fireball) when the horde is 6 or more, otherwise Magic Missile.
- The healer gives a potion when a hero is at or below the foe's level and potions are left.
- The fighter guards (once per fight, if they hold a guard virtue) when a hero is at or below the foe's level.
- One non-fighter spends a conditional Advantage each round while any are left.
- Everyone else makes a normal attack.

The round cap stands in for the group running (DEC-016). Hit points per class are a placeholder; no card sets them yet.
