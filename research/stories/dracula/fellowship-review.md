# Dracula (Vellmoor): fellowship review

Story review (Loremaster), 2026-10-16. Branch `docs/dracula-fellowship-review`, built on `docs/dracula-encounter-trims` (bbe07c2). Covers the 19 scene scripts in `assets/stories/dracula/scripts/` plus README, cast.md and props.md. `tokens-and-encounters.md` is out of scope.

## Bob's three tests
1. **Combine:** each set piece has a moment where two hunters put their private iPad knowledge together to move forward.
2. **Split and return:** a hunter who splits off comes back with something the party needs (Gamewright's regroup rule: the rejoining hunter shares a finding, and everyone present gets +1 to the next fight).
3. **Bonds under threat:** the Count goes after the bonds between the hunters: turning them on each other, using each hunter's past, lookalike tricks.

Grades: **pass**, **weak** (the beat is there but thin or one-sided), **miss** (no such beat in a set piece that should have one), **n/a** (the scene has no split, or is an aftermath or interlude where the test doesn't apply). Grades are for the script **before** this review's fixes; the last column says what changed.

## Per-scene table

| # | Scene id | T1 combine | T2 split/return | T3 bonds | Note | Fixed here |
|---|---|---|---|---|---|---|
| 1 | n1-lantern-and-bell | pass | n/a | weak | The four letters and the margin riddle (`.06`) are the model combine beat. The Count is only the mist so far, which is fine for an opening. | none |
| 2 | n1-burgomasters-house | weak | weak | weak | The `.09` privates line up (Agnes knows the hand, Tomas has seen Marta's cream letter) but nobody ever compares them. Wren goes upstairs alone and reports back (`.03`), but there's no regroup beat. | proposal A |
| 3 | nx-pressed-flower | weak | n/a | n/a | All four iPads get the **same** clue each dusk, so there's nothing to combine. Interlude, not a set piece. | proposal B |
| 4 | n1-open-grave | **miss** | n/a | weak | No private moments at all, so nothing to combine. Oskar's "another name" plants the lookalike theme. | **yes**: `.map.private.*`, `.map-shared` |
| 5 | nx-midnight-procession | weak | n/a | pass | The ghosts throw each hunter's past back at them. "Answer" is said aloud to the table, but only one hunter is involved. Interlude. | none |
| 6 | n1-fortune-reading | weak | n/a | weak | The `.11` whispers give separate journal clues and never meet. Objective 2 ("a seat at your table") is the only bond threat. | proposal C |
| 7 | n23-sergius-blade | **miss** | n/a | pass | The Count's `.08` whispers go at every hunter's past ("steadier than yours on that wall"). Nobody puts knowledge together; Tomas's guard lore and Emeric's weave are never connected. | **yes**: `.grip.private.*`, `.grip-shared` |
| 8 | n23-catacombs-of-saint-ysolde | weak | **miss** | pass | The party splits (`.02`/`.03`) and rejoins at `.05` with no findings shared, so the `.04` privates go nowhere. The lookalike is the strongest T3 beat in the story. | **yes**: `.rejoin.*`, `.rejoin-combined` |
| 9 | n2-burgomasters-funeral | pass | weak | pass | The investigation round plus `.investigate.share` is a true combine. A hunter who follows the mourner and misses the fight comes back at `.08` without a beat. Dorka: "Leave these others and come to me." | **yes**: `.mourner-returns.*` |
| 10 | n3-fly-eaters-cell | weak | n/a | pass | Jakob's `.09` whispers use each hunter's past for the Count ("Ask her nicely"). The price vote is shared, but no two privates ever combine. | proposal D |
| 11 | n4-earth-boxes | weak | n/a | weak | The `.07` privates (M.V. stencil, Ilka's weave, cipher numbers) never meet. The Count taunts the whole party, not the bonds. | proposal E |
| 12 | n4-finding-the-tome | pass | n/a | pass | Agnes's riddle line meets Emeric's reading (`.02`), and Emeric's cipher is unlocked by the Tome. Gerhardt's betrayal puts Emeric's past against Lenka's. | none |
| 13 | n5-drawbridge | pass | n/a | weak | Tomas knows the gate and Marta, and Emeric's private "he never watches it" backs the same choice. The Count's only move is the open invitation. | none |
| 14 | n5-portrait-gallery | **miss** | n/a | pass | The four `.06` paintings use each hunter's past, but nobody compares them. | **yes**: `.combine` |
| 15 | n5-final-confrontation | pass | n/a | weak | Ilka's bolt (Wren) + Agnes's prayer + the sword carrier + the guard pick. `.strike-redirected` sets guard against carrier; there's no lookalike or turning beat here. | proposal F |
| 16a | n5-ending-rescued | n/a | n/a | n/a | Aftermath. | none |
| 16b | n5-ending-endures | n/a | n/a | n/a | Aftermath. | none |
| 16c | n5-ending-taken | n/a | n/a | n/a | Aftermath. | none |
| 16d | n5-ending-turned | n/a | n/a | pass | A turned hunter faces the others; the Count keeps one. | none |

Summary: there were 4 misses (T1 in open-grave, sergius-blade and portrait-gallery; T2 in catacombs), and all four are fixed. The funeral's T2 was weak and is fixed too, because it is the other place the regroup rule applies. README, cast.md and props.md need no change: no new speakers or props.

## Fixes implemented (new moments only; no existing line_id changed)

New moments use named ids (`scene.<name>`), like the existing event moments, so no moment is renumbered. Each new storyboard combine has `~no-<hunter>` variants for both speakers, plus a combined variant.

1. **n1-open-grave** (T1): `.map.private.<hunter>` (all four; each holds part of what the blotted parish is: Agnes the traveler's "high meadow" ledger entry, Tomas the guard's "lady's meadow", Wren her mother's violets, Emeric Gerhardt's "where the first house fell"). Then `.map-shared` (Agnes + Wren) gives the journal clue "The blotted parish is the high meadow: the violets' home, and his." Variants: `~no-agnes` (Tomas), `~no-wren` (Emeric), `~no-agnes-no-wren`. The closing note in the file is updated (the scene now has private moments).
2. **n23-sergius-blade** (T1): `.grip.private.<hunter>` after `.02`, then `.grip-shared` (Emeric + Tomas). The shawl weave on the grip plus the guard's toast give the clue "Lenka's shawl and Sergiu's sword are of one house. He kept a window." This sets up the Tome's reveal. Variants: `~no-tomas`, `~no-emeric`, `~no-tomas-no-emeric`.
3. **n23-catacombs-of-saint-ysolde** (T2, also T1): `.rejoin.<hunter>`, one storyboard line per rejoining hunter sharing their `.04` finding, under the regroup rule (+1 to the next fight). Tomas's line ("anyone who doesn't know that notch isn't one of us") gives the table a lookalike test. Then `.rejoin-combined` (Tomas + Wren) gives the clue "He is moving the old guard's dead up to the castle for the last night"; it is skipped unless both rejoin.
4. **n2-burgomasters-funeral** (T2): `.mourner-returns.<hunter>`, played before `.08` for a hunter who followed the mourner and missed the fight. They share the "lady's rooms" finding, under the regroup rule.
5. **n5-portrait-gallery** (T1): `.combine` (Agnes + Wren) gives the clue "Lenka has no portrait here. He has not got her yet." Variants: `~no-agnes` (Tomas), `~no-wren` (Emeric), `~no-agnes-no-wren`.

## Proposals for weak grades (not implemented)
- **A. burgomasters-house:** a `.letter-shared` beat (Agnes + Tomas): the ledger hand and Marta's cream letter are the same hand, so he writes first to the people he wants.
- **B. pressed-flower:** split each dusk's clue into two halves on two iPads (for example, night 2: one hunter gets "painted canvas", another "the smell of linseed, fresh"), so the location only comes clear when they talk. This changes 16 existing lines, so it needs Bob's go-ahead first.
- **C. fortune-reading:** have one `.11` journal clue name half a site that another hunter's clue completes.
- **D. fly-eaters-cell:** a Tomas + Emeric beat. Marta's key and Gerhardt's register are both "who opens the door to him".
- **E. earth-boxes:** a Wren + Tomas beat. Ilka's weave and Marta's stencil: he puts a box beside each woman he keeps. The Count could also whisper a split ("Varga carried these for me, ask him").
- **F. final-confrontation (T3):** one Count line, tied to the guard pick, that sets the guard against the carrier ("Give her to me and I'll give you back your mother, Kessel").

## Gamewright rulings (Oct 16 2026)
- **Journal clues have no game effect.** The new clues (high meadow, one house, garrison moved, no portrait) are story only.
- **Combine trigger:** there is no Dashboard. The Story board (Mac) is display only, and every tap is on an iPad. A shared or combine moment auto-plays on the Story board once every present hunter in it has tapped done on their private line.
- **Lookalike and regroup:** a rejoining lookalike gets no +1; its fake reunion has no game effect and is a clue for observant players. The real hunter's +1 is granted once, on return or on unmasking.

## Open questions
1. ~~Regroup rule and a rejoining lookalike.~~ **Resolved:** no +1 for the lookalike (see above).
2. ~~Combine trigger.~~ **Resolved:** auto-play once all hunters in it tap done on their iPads.
3. ~~Journal clue effects.~~ **Resolved:** no game effect.
4. Should proposal B go ahead? It splits each dusk's pressed-violet clue across two iPads and changes 16 existing lines, so it needs re-voicing.
