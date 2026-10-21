# P-03 Cave: the hunt — findings

**Status: awaiting Bob's play-through.** Everything below marked "simulation" is from the bot parties; the feel (is reading signs fun, is the light fair) is Bob's to judge at `/p/cave`.

Question: is reading signs to pick a passage fun, and is the light meter fair? (MEC-027, DEC-084, Might from DEC-101.)

## How it plays

- A cave is a chain of forks (default 4 deep, 3 passages each). Each round shows 3 signs (tracks, bones, a sound from the tower); each is true with a chance and otherwise points at a wrong passage.
- A right turn costs 1 light and goes deeper; a wrong turn costs 2 and stays at the fork. At 0 light the beast ambushes. Reaching the lair first gives a surprise round.
- A Beast Advantage reads one sign for sure, once per cave.
- The fight is a placeholder: Might + 2d6 against the beast's strength + 2d6; the ambush gives the beast a bonus, the surprise gives the party one.
- "A sound from the tower" plays a WebAudio tone in the browser; the tower is not touched.

## Tuning values (defaults, as shipped; Bob's final values go here)

```json
{ "depth": 4, "branches": 3, "light": 8, "stepCost": 1, "wrongCost": 2, "signCount": 3, "trueChance": 0.7,
  "beastAdvantage": true, "might": 6, "beastStrength": 7, "ambushBonus": 3, "surpriseBonus": 4 }
```

## Simulation (1,000 seeded runs per party, seed "1", defaults)

| Party | Finds the lair | Ambushed | Rounds (mean) | Wins the fight |
|---|---|---|---|---|
| Follows the signs (majority; uses its Advantage on sign 1) | 93.3% | 6.7% | 4.69 | 79.2% |
| Guesses | 9.1% | 90.9% | 4.93 | 22.9% |

Reading: the signs matter a great deal at these numbers. A party that follows them almost always finds the lair, so the light may be too generous for a good reader. Raise the wrong-turn cost or lower the chance a sign is true to make the light bite. Nothing here says it is fun; that needs the play-through.

## Card updates (after the play-through)

- MEC-027: record the final light, wrong-turn cost and sign reliability.
- DEC-101: note whether Wits (tracking) should help read signs; the prototype uses the Beast Advantage only.
