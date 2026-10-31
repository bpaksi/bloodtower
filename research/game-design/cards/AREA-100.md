---
type: area
title: "The evening walkthrough: one session played end to end, the spec for the C2 session shell"
status: open
layer: core
by: "Bob, 2026-10-31"
links:
  - { rel: part-of, to: AREA-047 }
---
Bob asked for a played walkthrough of a whole evening before planning 1.0: start, set up, play, quit, a new game and the end of the night. It finds the gaps between the screens SCR-001 to SCR-022 and is the spec for the C2 session shell milestone. Bob ruled scene 3, then handed the rest to Claude ("go with your suggestions"), so DEC-709 to DEC-713 are Claude's, for Bob's review.

## The scenes

| # | Scene | Path | Rulings |
|---|---|---|---|
| 1 | First start | Splash, landing and sound (DEC-273) → the join QR, waiting for the first iPad (MEC-039 .1, DEC-274) → base board setup (SCR-022) → Connect Tower or Play without (SCR-005), calibrate, glyphs, facing, volume (SCR-006) | MEC-039 Enter |
| 2 | First game to its ending | Pick story (SCR-007) → Game settings (SCR-008) → claim heroes (SCR-010) → piece setup (SCR-011) → Begin (SCR-012) → play (SCR-014) → outcome (SCR-018) → stats (SCR-019) → session screen (SCR-021) | MEC-032, DEC-214 |
| 3 | Play again | A game in tonight's list → its stats → Play again → claims prefilled → piece setup → Begin | DEC-708 |
| 4 | Quit, then back in | Menu → Quit story, confirmed → session screen → Continue | DEC-218, DEC-709 |
| 5 | Continue another evening | Scene 1's Enter → Continue → a picture for each tracked piece, set or checked → the tower check → the saved node | DEC-710, Q-402 |
| 6 | Done for tonight | Session screen → Done for tonight, confirmed → landing painting, tower to idle, iPads released | DEC-713 |
| 7a | Tower lost | Between games: "Tower lost" on the session screen; the next start runs the tower block again. In a game: the pause (DEC-301) | DEC-711 |
| 7b | iPad sleeps or joins late | Joined iPads kept awake; a drop pauses a game (DEC-154) and blocks nothing between games; a late player joins any time | DEC-712 |

## What C2 changes in the POC

The POC's setup runs Pick Game → Pick Story → Game settings → Tower connect → Claim heroes → piece setup → Begin. The session loop changes that:

- **The tower and the base board move to the session's Enter**, before the first Pick story, and run once per session (DEC-152). Base board setup (SCR-022) is new.
- **Pick Game goes.** Continue sits on Pick story and the session screen (DEC-283, DEC-709).
- **The session screen is new** (SCR-021), with Play again (DEC-708) and Done for tonight (DEC-713).
- **Continue's piece check** shows where each piece belongs (DEC-710).
- **Joined iPads stay awake** (DEC-712).

Open: Q-402 (drums and trapped skulls on Continue after calibration) needs a real-tower check in tower-poc before the Continue step.
