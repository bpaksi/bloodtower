# Burgomaster's Funeral POC (n2-burgomasters-funeral, Gamewright, 2026-10-14)

> **1.0 cut (2026-10-28):** this describes the full Dracula. For 1.0, [DEC-508](../../game-design/cards/DEC-508.md) overrides it where they differ. The full version is kept in [dracula-v2](../dracula-v2/poc-funeral.md).
Goal: prove the engine end to end on one set piece in about 10 minutes, using the Mac, the tower, the Dashboard, and 2 or more iPads/phones. Uses the reviewed script as written (not a rewrite).

## Moment IDs (cue sheet source)

| Moment ID | Kind | Target | Tower / props | POC covers |
|---|---|---|---|---|
| `n2-burgomasters-funeral.01` | clip | storyboard | music, sfx | dusk open still/clip |
| `n2-burgomasters-funeral.02` | still | storyboard | — | two-speaker talk |
| `n2-burgomasters-funeral.02~no-wren` | still | storyboard | — | cast variant |
| `n2-burgomasters-funeral.03` | still | storyboard | sfx | two-speaker talk |
| `n2-burgomasters-funeral.03~no-emeric` | still | storyboard | — | cast variant |
| `n2-burgomasters-funeral.04` | clip | storyboard | `dim-all`, `heartbeat`, sfx | auto tower cues + screen fallback |
| `n2-burgomasters-funeral.04~holy-symbol` | clip | storyboard | same cues | item-gated variant |
| `n2-burgomasters-funeral.05` | clip | storyboard | — | two-speaker (Dorka / Agnes) |
| `n2-burgomasters-funeral.05~no-agnes` | clip | storyboard | — | cast variant |
| `n2-burgomasters-funeral.06` | clip | storyboard | sfx, music | fight spawn; Dorka's lead ("lady's rooms… won't stop saying no") → story flag |
| `n2-burgomasters-funeral.06~no-tomas` | clip | storyboard | same | cast variant |
| `n2-burgomasters-funeral.07` | still | storyboard | — | win-the-fight branch |
| `n2-burgomasters-funeral.07~fight-lost` | still | storyboard | — | cost branch (corruption / item / skull drop per mechanics) |
| `n2-burgomasters-funeral.07~no-wren` | still | storyboard | — | cast variant |
| `n2-burgomasters-funeral.08` | still | storyboard | — | carry-forward line |
| `n2-burgomasters-funeral.08~no-agnes` | still | storyboard | — | cast variant |
| `n2-burgomasters-funeral.09.private.agnes` | still | `ipad:agnes` | — | private |
| `n2-burgomasters-funeral.09.private.tomas` | still | `ipad:tomas` | — | private |
| `n2-burgomasters-funeral.09.private.wren` | still | `ipad:wren` | — | private |
| `n2-burgomasters-funeral.09.private.emeric` | still | `ipad:emeric` | — | private |
| `n2-burgomasters-funeral.10` | still | storyboard | prop: `pressed-flower` | dusk/dawn clue still (Story board); pressed-flower private clue is the night's dusk clue from the engine, not a funeral-only line |

## POC mapping vs Loremaster's verbal sketch
The reviewed script already packs the systems we need: open clip, two-speaker talks, auto tower cues on `.04`, a real branch on `.07` / `.07~fight-lost`, Dorka's lead on `.06`, private thoughts on `.09.*`, pressed flower on `.10`. There is no separate "watch coffin / follow mourner" choice in the script; the engine test for a costly choice is the fight outcome (and `.04~holy-symbol`). If we want that verbal choice as well, Loremaster would add an event moment; until then, build against this table.

## In scope
1. Short wizard stub: QR join (R-WIZ-10), tower connect + calibrate (R-WIZ-9).
2. Play moments `.01`–`.10` with variants as cast/items dictate.
3. Screen fallbacks for `dim-all` and `heartbeat`.
4. Private routing for all four `.09.private.*` lines; nothing private on the Dashboard.
5. On `.07~fight-lost`: apply the cost (corruption or story item) under the instant-loss guard, and one skull drop (counts toward the 2/night cap).
6. Set story flag from Dorka's lead on `.06`.
7. Night transition (phase clock), mini summary, SQLite stats rows.

## Success criteria
- Plays start to finish with the tower, and again with "play without tower".
- No private text ever appears on the Dashboard.
- A rejoin mid-scene restores that hunter's private state.
- Stats rows let us replay what happened.
- Players call the fight branch tense.

## Out of scope
Full wizard, multi-night saves, 1981 bookends (stub only), final art (draft art is fine). Cast variants beyond the hunters in the playtest party can wait.

## Lid choice (added)
`.lid-choice` plays between `.03` and `.04` on the Dashboard, with `~nailed` and `~watched`. Effects are in rulings.md. Nailing is hidden if no stake is held.
