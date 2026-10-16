# Dracula (Vellmoor): scene scripts

Story only (Loremaster). Mechanics are Gamewright's; "per mechanics" marks a beat without defining it.

## Story premise (D-DRA-10)
Lenka Morosz, the burgomaster's foundling daughter, was taken by the Count the night before play begins. Her father Anton died trying to stop it. There is no mid-game snatch. Each dusk a pressed violet she smuggles out gives one hunter a private clue to where she is held. Rescuing her and destroying Vlad are one goal: in the final confrontation she is freed, refuses him to his face, and Sergiu's sword finishes him.

## Format rules
- One scene per file. Moment IDs are `scene.moment`; each is marked [still] or [clip].
- **Targets:** untagged moments, lines and cues play on `storyboard` (the Story board: Mac screen and speakers, display only; all taps, votes and picks are on the iPads). `ipad:<hunter>` plays only on that iPad. Private moments (`.private.<hunter>`) never play on the Story board and always have a line for all four hunters.
- **Variants (R-AST-ORG-10):** `scene.moment~variant` replaces the base moment of the same number when its condition (written after the dash) holds. Private and variant combine as `scene.moment.private.<hunter>~<variant>`. A base moment that lists only cues and "one variant by …" has no line of its own; one variant always plays. No speaker or text placeholders remain in any script: kingdoms and lair rooms are shown, never spoken, and buildings, objectives, nights and absent hunters each have their own variant.
- **Event moments:** `scene.<event-name>` (e.g. `n5-final-confrontation.blade-lost`) plays once when its trigger happens and replaces nothing.
- **Spotlight (R-AST-ORG-11):** the procession uses concrete IDs per hunter: `.04.private.<hunter>` (choice), `~answer`, `~turn-away`, and `.04.private.<hunter>-watched`.
- **Absent hunters:** each scene names its replacement per moment (`~no-<hunter>`). If a replacement speaker is also absent and no combined variant exists, the line is cut.
- **Speaker labels → cast ids:** the label before the parenthesis is the cast id (The Count → `count`, Agnes → `agnes`, Vadoma → `vadoma`, Mother Ursula → `ursula`, Sergeant Dorn → `dorn`, Jozef Kessel → `jozef`, Gerhardt → `gerhardt`, Anton → `anton`, Ludmila → `ludmila`). The parenthesis, e.g. "(thought)", "(whisper)", "(close, low)", "(from the page)", is a style direction for that voice. "Narrator (private)" is the narrator voice on one iPad.
- At most two characters speak in one exchange; the narrator does not count.
- Stoker quotes are marked *(Stoker)*; adaptations are marked *(after Stoker)* or *(adapted from Stoker)*.

## Tower cue names
Scripts use only these names (Illusionist maps them in `shared/tower/cues.json`; screen fallbacks live in the cue library and asset map §1b, not in the scripts):
`dim-all` (all lights off) · `low` (one light on) · `all-on` · `heartbeat` (breathe) · `heartbeat-fast` (breatheFast) · `heartbeat-half` (breathe50percent) · `flicker` · `seal-sequence` (light sequence 14, no seal broken) · `break-seal` · `drum-top` / `drum-middle` / `drum-bottom` (rotateWithState; a story cue turns a drum only when the turn sets a glyph the game rules then read: the fortune reading, the open grave and the finale assault. Drum turns just for show become lights and sound) · `skull-drop` (players drop a skull).
Rules: no calibration in any scene (it belongs to the setup wizard). Drum cues are calibrated-only and are skipped and logged otherwise. Successive drum moves are spaced from the previous move's state reply, not from when it was sent. A change of rate is written as "A then B", and the app times it. There are no red lights.
**Story skull drops:** at most 2 per night. Before any story drop, if fewer than 6 skulls remain in supply, the drop becomes "+1 foe on night 5" instead.

## Props
Recurring props have stable IDs and are tagged `[prop: <id>]` on every moment that shows or mentions them. Reference sheets live under `props/<prop-id>/ref/` (see [props.md](props.md)): `sergiu-blade`, `pressed-flower`, `ludmila-tome`.

## Play order

| # | Scene | Night / slot | Summary |
|---|---|---|---|
| 1 | [n1-lantern-and-bell](n1-lantern-and-bell.md) | 1 / K1 Village | Four hunters, four letters from a dead priest, the margin riddle; the mist swallows the road; the burgomaster's girl is gone. |
| 2 | [n1-burgomasters-house](n1-burgomasters-house.md) | 1 / K1 Citadel | Anton Morosz died at his daughter's door; Lenka was carried off; she left a pressed violet on the sill. |
| 3 | [nx-pressed-flower](nx-pressed-flower.md) | 1–4 dusk | A violet she smuggles out each dusk: a Story board still plus one hunter's private clue to where she is held. |
| 4 | [n1-open-grave](n1-open-grave.md) | 1 / K1 Sanctuary | Oskar's grave dug from inside, his map, then Oskar risen, warning that the Count will call Lenka by another name. |
| 5 | [nx-midnight-procession](nx-midnight-procession.md) | 1–4 midnight | The dead hunters walk; one ghost stops for one hunter. Answer: a tie clue. Turn away: a Tome-order clue and one holy water. |
| 6 | [n1-fortune-reading](n1-fortune-reading.md) | 1 dawn / K1 Bazaar | Vadoma reads Lenka's violet: the Blade, the Holy Symbol, the Tome, the lair; "alive, and saying no." |
| 7 | [n23-sergius-blade](n23-sergius-blade.md) | 2 or 3 / Blade site | Sergiu's sun-bright sword; the Count's first visit: "she refuses me every evening." |
| 8 | [n23-catacombs-of-saint-ysolde](n23-catacombs-of-saint-ysolde.md) | 2 or 3 / Holy Symbol site | Shifting crypts, a split party, at most one lookalike; Agnes's reliquary takes back Saint Ysolde's lamp. |
| 9 | [n2-burgomasters-funeral](n2-burgomasters-funeral.md) | 2 / Sanctuary | At Anton's wake Dorka rises and calls the hunters up the hill, and lets slip where Lenka is. |
| 10 | [n3-fly-eaters-cell](n3-fly-eaters-cell.md) | 3 / Citadel | Jakob sells the plan (earth boxes, the window) for a corruption or a story item. |
| 11 | [n4-earth-boxes](n4-earth-boxes.md) | 4 / K4 | Burn the boxes of grave-earth; three rotating clips and a last-box clip; any left standing strengthen night 5. |
| 12 | [n4-finding-the-tome](n4-finding-the-tome.md) | 4 / K4 Tome site | Vlad's book: Ludmila, Sergiu, the window; Lenka is Ludmila reborn, and she refuses him every night. |
| 13 | [n5-drawbridge](n5-drawbridge.md) | 5 / gate | Three keys; Marta's quiet gate (costs a visit) or the fast drawbridge (raises his attention). |
| 14 | [n5-portrait-gallery](n5-portrait-gallery.md) | 5 / gallery | Four hundred years of one face; Ludmila's portrait; a painting for each hunter. |
| 15 | [n5-final-confrontation](n5-final-confrontation.md) | 5 / high room | Three brides; Agnes's prayer holds him; Lenka stands and says no; the sword. |
| 16a | [n5-ending-rescued](n5-ending-rescued.md) | 5 dawn (win) | Rescued (the win): she is freed and he falls; Ludmila and Sergiu fade in the light; the mist lifts. |
| 16b | [n5-ending-endures](n5-ending-endures.md) | 5 dawn | She is freed but the sword was lost with its carrier; he is driven off as mist, not destroyed. |
| 16c | [n5-ending-taken](n5-ending-taken.md) | 5 (loss) | The hunters fail or retreat; she stays with him, still saying no. |
| 16d | [n5-ending-turned](n5-ending-turned.md) | any (loss) | A hunter takes a third corruption and turns. |

Night order: night 1 is inn → house → (dusk: pressed flower) → grave → procession → fortune at dawn. Nights 2 and 3: pressed flower at dusk, the fortune's site, procession, then the second set piece (funeral on night 2, fly-eater on night 3). Night 4: pressed flower, earth boxes, procession, Tome (its final call ends the night). Night 5: drawbridge → castle rooms → gallery → confrontation → ending.

## Names
Lenka Morosz, Anton Morosz, Old Vadoma, Dorka Halasz, Jakob Brenner, Marta Varga, Gerhardt Albrecht, Vlad (the Count), Ludmila, Sergiu, Mother Ursula, Sergeant Pavel Dorn, Jozef Kessel. Artifacts: `sergiu-blade` (the Blade), the Lantern of Saint Ysolde (the Holy Symbol), `ludmila-tome` (the Tome).

## Settled points (Gamewright, 2026-10-14)
1. Fly-eater and ghost prices follow rulings.md (corruption or story item; clue plus holy water). No spirit.
2. Losing or retreating from the final battle goes to `n5-ending-taken`.
3. Sergiu's sword is tied to its carrier; if that hunter falls in the finale, the blade is lost (event moment `n5-final-confrontation.blade-lost`). Lenka is still freed by `.06`; if at least one hunter is still standing then, the ending is `n5-ending-endures`; if the battle is lost afterwards, `n5-ending-taken`.
5. A redirected strike (`n5-final-confrontation.strike-redirected`) gives the hunter guarding Lenka 1 corruption, unless that hunter is at 2 (instant-loss guard).
6. The full win is **Rescued** (`n5-ending-rescued`).
4. No captive track for Lenka.
