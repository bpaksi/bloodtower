# Tokens and encounters: Dracula (Vellmoor)

> **Header note.** Story only (Loremaster). Engine-side placement and movement rules for the three quest tokens (objective, lure, hunter) belong to Gamewright; anything below that reads like a rule is a story-side proposal. **Ruled by Bob (Oct 14 2026): add.** A hunter-token encounter plays in addition to that turn's normal RtDT event, never instead of it (E19e). The normal event resolves first, then the encounter.

Format follows [README.md](README.md): moment IDs `enc-<id>.NN`, [still] or [clip], at most two speakers per exchange, `[tower:]` cues are light and sound only (no drum turns, no seal breaks), private lines only as `ipad:<hunter>`. Costs use only story vocabulary from [rulings](../../../../research/stories/dracula/rulings.md): corruption (instant-loss guard: a hunter already at 2 is never asked; the cost becomes `~blocked`, the party loses one story item), story items (holy water, the host, a stake), findings (journal clues), foes, and story skull drops (cap 2 per night; under 6 skulls in supply the drop becomes "+1 foe on night 5").

**Site names.** Vellmoor uses only the RtDT board: four kingdoms (K1–K4), each with a Village, Sanctuary, Bazaar and Citadel, plus the tower. Kingdoms are shown, never spoken. Where the fortune draws a building (d4 Village / Sanctuary / Bazaar / Citadel), the site is written "fortune building".

## 1. Objective token (nights 1–4)

Placed at dusk on the site of the night's next set piece. Where a night has two set pieces after dusk, the token moves to the second site when the first scene ends (proposal for Gamewright).

| Night | Objective site (dusk) | Scene ID | Then moves to | Scene ID |
|---|---|---|---|---|
| 1 | K1 Sanctuary (church and churchyard) | `n1-open-grave` | K1 Bazaar (Old Vadoma's wagon), at dawn | `n1-fortune-reading` |
| 2 | K2 fortune building (Blade or Holy Symbol, by seed) | `n23-sergius-blade` or `n23-catacombs-of-saint-ysolde` | K2 Sanctuary (Anton's wake) | `n2-burgomasters-funeral` |
| 3 | K3 fortune building (the other artifact) | the other of `n23-sergius-blade` / `n23-catacombs-of-saint-ysolde` | K3 Citadel (the lockhouse) | `n3-fly-eaters-cell` |
| 4 | K4 Sanctuary (1 box) at dusk, per D-DRA-12. After that box is destroyed, the token moves to the K4 Village (2 boxes). If the Tome is on a box's building, that box moves to the K4 Bazaar and the token follows. One site at a time | `n4-earth-boxes` | K4 fortune building (the Tome) | `n4-finding-the-tome` |
| 5 | The tower. No tokens. | — | — | — |

## 2. Lure list

One lure per night, drawn from the entries valid that night. A lure never sits on the current objective site (night 1 K1 Sanctuary, night 2 K2 Sanctuary, night 3 K3 Citadel, the fortune building); redraw if it would. First hunter to reach it takes the reward. Each hook ties to the pressed flower's clue trail (castle plaster, painted canvas, gold veil thread, the torn page).

| ID | Site (current kingdom) | Reward | Hook | Nights |
|---|---|---|---|---|
| lure-plaster-dust | Bazaar | a stake | A carver sells "relic dust" in twists of paper; it is white castle plaster, and a violet petal is caught in one twist. | 1, 2 |
| lure-woodpile-violet | Village | holy water | The chandler's boy found a pressed violet in the woodpile and traded it to the sexton's widow for a vial she kept "for the bad nights". | 1, 2 |
| lure-font-violet | Sanctuary | holy water | A violet floats in the font, flat as paper; the water under it has gone so cold it rings. | 2, 3, 4 |
| lure-gallery-inventory | Citadel | finding: a steward's inventory lists one painting "taken up to the young lady's rooms, above the long gallery" | The lord's steward is burning old castle inventories; one smells of violets. | 2, 4 |
| lure-veil-thread | Village | finding: a castle servant bought gold veil-thread and white silk for "a wedding that has been ready four hundred years" | The seamstress keeps a spool of gold thread she will not sell, and a violet pinned to it. | 3, 4 |
| lure-wedding-hymnal | Sanctuary | the host | The hymnal falls open at the marriage service; a pressed violet marks it, and a wafer wrapped in linen lies in the spine. | 3, 4 |
| lure-torn-page | Bazaar | finding: a page in an old girl's hand, "the high room, the window I opened", confirming the lair room | A bookseller's waste-basket holds a torn page with a violet's stain on it, in a hand four hundred years old. | 4 |

## 3. Hunter token (the Count's attention)

- **Start site:** the castle side: the board space next to the tower on the current kingdom's side (the same entry space the drawbridge uses on night 5). **RtDT board spaces carry no names in the docs**, so this site cannot be named more precisely.
- Placed at dusk, moves one site toward the nearest hunter each round, draws one encounter below when it lands on a hunter's site, then returns to its start site. Removed at dawn. Tower pulses light only (`heartbeat` while it moves, `heartbeat-fast` when it lands).
- **Who is "present":** the hunters on the landed site (E15). Private moments go to present hunters only; a present hunter's cost is paid by a present hunter.

## 4–6. Encounter table

| ID | Title | Nights | Reuses |
|---|---|---|---|
| enc-early-lantern | A Lantern Before Midnight | 1–4 | `nx-midnight-procession` |
| enc-the-window | The Window Again | 1–4 | — |
| enc-brothers | Two Brothers in the Fog | 2–4 | — |
| enc-at-the-door | Asked to Be Let In | 1–4 | bite attempt (no existing scene; new) |
| enc-wrong-face | A Face That Came Back Wrong | 2–4 | `n23-catacombs-of-saint-ysolde` lookalike |
| enc-mist-remembers | The Mist Remembers | 1–4 | — |
| enc-road-returns | The Road Comes Back | 1–4 | — |
| enc-ledger-page | A Page from the Ledger | 1–3 | — |
| enc-wedding-uphill | The Wedding Goes Uphill | 3–4 | — |
| enc-wine-for-no-one | Wine Poured for No One | 2–4 | — |
| enc-third-hums | The Third One Hums | 2–4 | — |

---

### enc-early-lantern: A Lantern Before Midnight
- **Nights:** 1–4. Only if the present hunter has not been spotlit by the procession tonight.
- **Beat:** The Count's attention finds a hunter and, instead of striking, sends one of the dead early: a single lantern-bearer, out of step with the bell, who has come too soon because the valley keeps no proper time any more. It is a piece of the procession torn loose, and it stops for the hunter it belongs to.
- **Cost / stake:** none in story terms; the hunter cannot be spotlit again at tonight's midnight.
- **Outcome (proposed):** play `nx-midnight-procession.03.private.<hunter>` and `.04.private.<hunter>` (choice) for one present hunter; others present get `.04.private.<hunter>-watched`. Answer = tie clue; Turn away = Tome-order clue plus one holy water. No skull drop.
- **Still prompt:** A lone ghost in an old hunter's coat stands in a white-fogged village lane, holding a lantern that gives no light, looking straight at the viewer.

**enc-early-lantern.01** [clip]
[sfx: one footstep, far off; a bell that does not strike] [tower: dim-all] [tower: heartbeat-half]
> **Narrator:** It is not midnight. Nobody told the dead. One lantern comes up the lane alone, early, as if the mist had torn it off the line.

**enc-early-lantern.02** [still]
> **Narrator:** It stops in front of one of you. The rest of the procession will be one short tonight.
Then: `nx-midnight-procession.03.private.<hunter>` and `nx-midnight-procession.04.private.<hunter>` for that hunter.

**enc-early-lantern.03** [still]
[tower: low]
> **Narrator:** The ghost walks on, toward the castle, to wait for the others.

---

### enc-the-window: The Window Again
- **Nights:** 1–4.
- **Beat:** The mist plays the Count's oldest night again, as it does somewhere in the valley every evening: a high window opens, a woman in white steps onto the sill, and a man's voice begs her not to. Watching it means seeing the room clearly; it also means letting his grief in.
- **Cost / stake:** Watch: one present hunter takes 1 corruption (instant-loss guard: `~blocked`, the party loses one story item instead). Look away: nothing.
- **Outcome (proposed):** Watch = finding: the shape of the high room and its single window (confirms the lair room the flowers point to). Look away = no finding.
- **Still prompt:** Through drifting fog, a far castle tower with one lit window open, a woman in white standing on the sill, seen from a dark valley road.

**enc-the-window.01** [clip]
[music: solo violin, two notes, slower] [sfx: wind; a shutter knocking] [tower: heartbeat-half]
> **Narrator:** The mist parts on a window that is not in this valley, or is in it every night. A woman in white climbs onto the sill.

**enc-the-window.02** [clip]
> **The Count (far off):** Ludmila. Not the window. Anything but the window.
> **Ludmila (hushed):** Then do not come in.

**enc-the-window.03** [still]
Choice on the Story board: **Watch** (one present hunter takes 1 corruption; finding) or **Look away**.
> **Narrator:** Every night he asks. Every night she answers. Every night the mist makes the valley watch.

**enc-the-window.03~blocked** [still] — the chosen watcher is at 2 corruptions
> **Narrator:** The grief reaches for one of you and finds no room left. It takes something from your packs instead.

**enc-the-window.04** [still]
[tower: low]
> **Narrator:** She steps. The mist closes. Somewhere in that room, tonight, another girl is sitting by the same window.

---

### enc-brothers: Two Brothers in the Fog
- **Nights:** 2–4.
- **Beat:** Two shapes duel in the mist on the road below the castle: a dark-haired man and a fair one. The dark one wins with his brother's own bright sword, and kneels, and weeps, and the fog takes them both to begin again. If the sword's carrier is present, `sergiu-blade` warms in its wrappings like a living hand.
- **Cost / stake:** one story skull drop (a villager who stopped to watch is lost in the fog; counts toward the cap).
- **Outcome (proposed):** finding: "He killed Sergiu with this blade; it remembers its true hand." If `sergiu-blade` is held by a present hunter, that hunter gains +1 Undead advantage in their next fight tonight (within the +2 cap).
- **Still prompt:** Two sword-fighting silhouettes in thick mist on a mountain road, one blade glowing faint gold, a castle looming above.

**enc-brothers.01** [clip] [prop: sergiu-blade]
[sfx: steel on steel, muffled by fog] [tower: flicker]
> **Narrator:** Two men fight in the fog below the castle. Brothers, by the faces. The dark one takes the bright sword from the fair one, and uses it.

**enc-brothers.02** [clip] [prop: sergiu-blade]
> **The Count (close, low):** I was only meant to take her. Not you. Never you.
> **Narrator:** He kneels in the road. The fog takes them both, and somewhere up the hill it starts again.

**enc-brothers.02~carrier** [clip] [prop: sergiu-blade] — `sergiu-blade` held by a present hunter
> **The Count (close, low):** I was only meant to take her. Not you. Never you.
> **Narrator:** At your back, wrapped in rotted crimson, the sword is warm as a hand. It knows that road.

**enc-brothers.03** [still]
[tower: heartbeat] then [tower: low]
> **Narrator:** A villager who stopped to watch does not come out of the fog. Drop a skull.

**enc-brothers.03~no-drop** [still] — story-drop cap reached or supply under 6 (same cues)
> **Narrator:** No one else stopped to watch tonight. The fog keeps its count for the castle.

---

### enc-at-the-door: Asked to Be Let In
- **Nights:** 1–4. (New: the scripts have no bite-attempt scene to reuse.)
- **Beat:** A knock at the door of the building where a hunter shelters. The voice outside is courtly, tired and polite; he cannot cross a threshold uninvited, and he asks, as he asked Ludmila at her window. He names something from the hunter's past that only he could know.
- **Cost / stake:** Refuse with a ward: spend one holy water or the host. Refuse without a ward: one present hunter takes 1 corruption (the bite through the door-crack; instant-loss guard: `~blocked`).
- **Outcome (proposed):** either way the door holds; the party gains a finding: "She refuses him every evening" (his own words). Spending the host adds nothing more, but no one is marked.
- **Still prompt:** A heavy wooden door at night, garlic strung above it, white mist curling under the sill and a pale long-fingered hand resting on the outside latch.

**enc-at-the-door.01** [clip]
[sfx: three slow knocks; wind] [tower: heartbeat-fast]
> **Narrator:** Three knocks. The mist is coming under the door, but it stops at the sill, waiting to be asked.

**enc-at-the-door.02** [still]
> **The Count (through the door):** Only open it. I have asked so many doors tonight. One of them always opens, in the end.

**enc-at-the-door.03.private.agnes** [still] `ipad:agnes`
> **The Count (whisper):** Sister. You prayed for me once. Pray with the door open.

**enc-at-the-door.03.private.tomas** [still] `ipad:tomas`
> **The Count (whisper):** Varga. You still owe me two fingers' worth of gate duty.

**enc-at-the-door.03.private.wren** [still] `ipad:wren`
> **The Count (whisper):** Your mother sings for me now. Would you hear her? Open.

**enc-at-the-door.03.private.emeric** [still] `ipad:emeric`
> **The Count (whisper):** Your master sold me a name through a door like this one. Ask me what he got for it.

**enc-at-the-door.04** [still]
Choice on the Story board: **Ward the door** (spend holy water or the host) or **Hold it shut** (one present hunter takes 1 corruption).
[tower: low]
> **Narrator:** The latch stops moving. The voice goes away up the hill, still polite. She refuses him every evening, he said. He said it as a complaint.

**enc-at-the-door.04~blocked** [still] — the chosen hunter is at 2 corruptions and no ward is held (same cues)
> **Narrator:** His breath finds the crack and nothing left to bite. The cold takes one thing from your packs instead, and the voice goes up the hill.

---

### enc-wrong-face: A Face That Came Back Wrong
- **Nights:** 2–4. Only if no lookalike is active (at most one at a time).
- **Beat:** One hunter steps into a bank of mist and steps out a moment later, and the face is right, nearly. The Count is replaying the trick he used in the catacombs; the valley is full of people who came back from the fog not quite themselves.
- **Cost / stake:** the party may be carrying a lookalike until it is unmasked (holy water or a Sanctuary rest ends it).
- **Outcome (proposed):** reuse the lookalike from `n23-catacombs-of-saint-ysolde`: the chosen present hunter's iPad plays `n23-catacombs-of-saint-ysolde.04.private.<hunter>~lookalike` and one secret card (`.secret-card.<goal>.private.<hunter>`); unmasking plays `n23-catacombs-of-saint-ysolde.07` and its `~lookalike-is-<hunter>` variant. If the app picks no one, nothing happens.
- **Still prompt:** A figure stepping out of a wall of fog in a village street, their face almost familiar, one eye catching lamplight the wrong way.

**enc-wrong-face.01** [clip]
[sfx: footsteps that do not match the count of feet] [tower: flicker]
> **Narrator:** A wall of mist rolls across the street and back. For one breath, one of you is gone. Then you are all there again.

**enc-wrong-face.02** [still]
> **Narrator:** Count heads. Count them again. Lookalike moments follow, by mechanics, on one iPad only.
Then: the `n23-catacombs-of-saint-ysolde` lookalike moments named above, for the chosen hunter.

**enc-wrong-face.03** [still]
[tower: heartbeat-half]
> **Narrator:** Everyone is accounted for. That is what worries you.

---

### enc-mist-remembers: The Mist Remembers
- **Nights:** 1–4.
- **Beat:** The fog thickens into the shape of each present hunter's worst night: the infirmary at Saint Ysolde, the castle wall, the gravedigger's yard, Gerhardt's shop. The valley does not let anyone leave, and it does not let anyone forget why they came.
- **Cost / stake:** each present hunter chooses privately: **Face it** (take 1 corruption; instant-loss guard) or **Walk through it** (no cost).
- **Outcome (proposed):** Face it = that hunter's tie advances (a tie clue in their journal, same targets as the procession: Agnes → gallery and Tome, Tomas → fly-eater, Wren → final confrontation, Emeric → the Tome). Walk through = nothing.
- **Still prompt:** A hunter alone in dense white fog, faint shapes of a ruined infirmary, a castle wall, a grave and a cluttered apothecary shop forming in the mist around them.

**enc-mist-remembers.01** [clip]
[music: low strings, one held note] [sfx: wind drops to nothing] [tower: dim-all] [tower: heartbeat-half]
> **Narrator:** The mist comes in close and stops being weather. It has seen where each of you has been. It shows you.

**enc-mist-remembers.02.private.agnes** [still] `ipad:agnes`
> **Narrator (private):** Twelve infirmary beds in the fog, each one empty, each one still warm. The traveler's cot at the end has a pressed violet on the pillow. Face it, or walk through.

**enc-mist-remembers.02.private.tomas** [still] `ipad:tomas`
> **Narrator (private):** The castle wall, the night you carried Marta over it. Your hand aches where the fingers were. Up on the wall, she is waving. Face it, or walk through.

**enc-mist-remembers.02.private.wren** [still] `ipad:wren`
> **Narrator (private):** Your father's yard. A stake in your hand, warm. A woman humming behind the church door, holding a baby. Face it, or walk through.

**enc-mist-remembers.02.private.emeric** [still] `ipad:emeric`
> **Narrator (private):** Gerhardt's shop, every jar labelled in his hand. On the counter, a receipt: one name, sold. Face it, or walk through.

**enc-mist-remembers.03** [still]
[tower: low]
> **Narrator:** The fog lets go. Some of you look as if you saw something worth the price. Nobody says what.

---

### enc-road-returns: The Road Comes Back
- **Nights:** 1–4.
- **Beat:** A hunter takes the road out of the parish and walks for an hour, and the road brings them back past the same milestone, the same shrine, the same crow. The mist has closed Vellmoor like a hand; the Count does not chase anyone here, because no one can leave.
- **Cost / stake:** one story skull drop (a cart that tried the road before them is found empty), or spend one holy water to wash the milestone and break the loop with no drop.
- **Outcome (proposed):** finding: "The mist is his; it lifts only if he falls" (foreshadows the Rescued ending). Gamewright may also let the token return early.
- **Still prompt:** A lonely milestone and a roadside shrine at a fork in pale fog, the same crow on the stone, wheel ruts circling back on themselves.

**enc-road-returns.01** [clip]
[sfx: boots on gravel; a crow, twice] [tower: heartbeat]
> **Narrator:** The road out of the parish goes on for an hour. Then the milestone again. The shrine again. The same crow, on the same stone.

**enc-road-returns.02** [still]
> **Narrator:** An empty cart stands by the shrine, its horse gone, the driver's coat folded on the seat. He tried the road too.
Choice: **Wash the stone** (spend one holy water) or **Leave it** (story skull drop).

**enc-road-returns.03** [still]
[tower: low]
> **Narrator:** No one leaves Vellmoor while he holds it. The road, at least, is honest about that.

**enc-road-returns.03~drop** [still] — the party left it (cues: [tower: heartbeat] then [tower: low])
> **Narrator:** By morning the driver will be standing in the square with the others, very pale. Drop a skull.

---

### enc-ledger-page: A Page from the Ledger
- **Nights:** 1–3.
- **Beat:** A page of fine ledger paper blows against a hunter's boot, written in Jakob Brenner's neat bookkeeper's hand: shipping orders for "garden soil, handle with care". The Count's house has been planning this for a long time; it has done all of it before.
- **Cost / stake:** follow the trail of pages: one present hunter takes 1 corruption (something waits where the pages lead; instant-loss guard) or the party ignores it.
- **Outcome (proposed):** Read it = finding (where the earth boxes are in K4, not how many; feeds `n4-earth-boxes`). Follow the trail = that finding plus a stake, from a crate lid prised loose.
- **Still prompt:** A single sheet of neat ledger paper caught against a muddy boot in the fog, columns reading "garden soil, handle with care".

**enc-ledger-page.01** [still]
[sfx: paper on wind] [tower: flicker]
> **Narrator:** A page of good paper comes along the road on its own and stops at your feet. Neat columns. A careful hand.

**enc-ledger-page.02** [still]
> **Jakob (from the page):** Garden soil. Handle with care. Forty boxes, as last time. And the time before.
> **Emeric:** As last time. He has done this before. He's done all of this before.

**enc-ledger-page.02~no-emeric** [still] — Emeric is not present
> **Jakob (from the page):** Garden soil. Handle with care. Forty boxes, as last time. And the time before.
> **Wren:** Last time. Somebody's been here doing this before us.

**enc-ledger-page.03** [still]
Choice: **Pocket it** (finding) or **Follow the pages** (one present hunter takes 1 corruption; finding plus a stake).
[tower: low]
> **Narrator:** More pages lie up the road, one every few yards, toward somewhere dark.

---

### enc-wedding-uphill: The Wedding Goes Uphill
- **Nights:** 3–4. (Ties to the night-3 violet's gold veil thread.)
- **Beat:** A bridal procession walks up the hill road in the mist: a veiled girl at its head, a train of pale women behind, no groom. The Count has held this wedding for four hundred years and never once had a bride say yes. The brides at the back turn to look.
- **Cost / stake:** fight: 2 foes (brides; Striga minis as proposed in the asset map). Losing costs one present hunter 1 corruption (instant-loss guard) and one story skull drop.
- **Outcome (proposed):** Win = the party takes the veil's gold thread (finding: "He dresses her above the gallery") and one stake. Spend a stake or holy water to avoid the fight: the procession passes, no finding.
- **Still prompt:** A ghostly bridal procession climbing a misty mountain road toward a castle, a veiled girl at the front, pale women in white turning their heads backward.

**enc-wedding-uphill.01** [clip]
[music: music-box waltz, slowed] [sfx: female choir, distant] [tower: heartbeat-half]
> **Narrator:** A wedding goes up the hill in the mist. Veiled girl in front, pale women behind. There is no groom. There never is.

**enc-wedding-uphill.02** [clip]
> **Narrator:** The veiled girl does not look back. The two at the end of the train do. They smile, and keep smiling.
Fight: 2 foes (brides), per mechanics.

**enc-wedding-uphill.03** [still] — one variant by fight result
**enc-wedding-uphill.03~won** [still] — the fight is won
[tower: low]
> **Narrator:** They come apart like wet paper. Where the veil trailed, a single gold thread lies in the road.

**enc-wedding-uphill.03~lost** [still] — the fight is lost (cues: [tower: heartbeat-fast] then [tower: low])
> **Narrator:** The train closes over one of you, cold and sweet, and moves on up the hill. Someone in the village follows it. Drop a skull.

---

### enc-wine-for-no-one: Wine Poured for No One
- **Nights:** 2–4. (Tomas's past.)
- **Beat:** In an empty room, a young woman in a maid's apron over faded castle livery lays a table for one and pours the Count's wine, as she does every night. It is Marta, or the part of her the mist can carry. She does not see the hunters until she sees Tomas.
- **Cost / stake:** speak to her: one present hunter takes 1 corruption (her wine is his; instant-loss guard), or leave her be.
- **Outcome (proposed):** Speak = finding: "The little gate is on the left of the chasm; she keeps the key" (feeds `n5-drawbridge`). If Tomas is present, he takes the finding to his journal as a tie clue. Leave = nothing.
- **Still prompt:** A candlelit table laid for one in an empty stone room, a young woman in a maid's apron over faded castle livery pouring dark wine, fog at the windows.

**enc-wine-for-no-one.01** [clip]
[sfx: wine poured; a chair drawn back for no one] [tower: low]
> **Narrator:** The room is empty but for a table laid for one. A girl in an apron over castle livery pours the wine and stands back to wait.

**enc-wine-for-no-one.02** [still]
> **Marta:** Uncle? You shouldn't be here. He drinks at midnight, and he counts the glasses.
> **Tomas:** I came back for you, lass. I always meant to.

**enc-wine-for-no-one.02~no-tomas** [still] — Tomas is not present
> **Marta:** You shouldn't be here. He drinks at midnight, and he counts the glasses.
> **Agnes:** Who are you pouring for, child?

**enc-wine-for-no-one.03** [still]
Choice: **Speak to her** (one present hunter takes 1 corruption; finding) or **Leave her be**.
[tower: heartbeat-half] then [tower: low]
> **Narrator:** When you look again there is only the table, and the glass, and the wine going dark.

---

### enc-third-hums: The Third One Hums
- **Nights:** 2–4. (Wren's past.)
- **Beat:** From somewhere in the fog, a woman hums a lullaby, the one sung at the church door the night Lenka was left there. It is Ilka Kessel, the third bride, and she is singing for her daughter, or for him; she no longer knows which.
- **Cost / stake:** stop your ears: spend one holy water. Listen: one present hunter takes 1 corruption (instant-loss guard).
- **Outcome (proposed):** Listen = tie clue for Wren (the "blank" bolt: Ilka scratched her own name; feeds `n5-final-confrontation`), or a finding for anyone else: "The third bride on the stair is not willing." Stop your ears = nothing.
- **Still prompt:** A pale woman's face half-seen in drifting fog beside a churchyard wall, lips parted in a lullaby, a crossbow bolt lying in the wet grass.

**enc-third-hums.01** [clip]
[music: a lullaby, one voice, far off] [sfx: wind in yews] [tower: heartbeat-half]
> **Narrator:** Someone is humming in the fog. An old lullaby, the kind sung at a door to a baby left on the step.

**enc-third-hums.02.private.agnes** [still] `ipad:agnes`
> **Agnes (thought):** That is a mother's song. Whoever she was, part of her still is.

**enc-third-hums.02.private.tomas** [still] `ipad:tomas`
> **Tomas (thought):** I heard that on the castle stair, years back. The third one. She always sang.

**enc-third-hums.02.private.wren** [still] `ipad:wren`
> **Ilka (far off):** Hush now, little bird. Mother's at the door. Mother's always at the door.

**enc-third-hums.02.private.emeric** [still] `ipad:emeric`
> **Emeric (thought):** Gerhardt wrote that his brides sing to the ones they lost. He said it like a footnote.

**enc-third-hums.03** [still]
Choice: **Listen** (one present hunter takes 1 corruption) or **Stop your ears** (spend one holy water).
[tower: low]
> **Narrator:** The song moves off toward the castle stair, where it has been going every night for nineteen years.
