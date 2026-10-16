# Tokens and encounters: Dracula (Vellmoor)

> **Header note.** Story only (Loremaster). Engine-side placement and movement rules for the three quest tokens (objective, lure, hunter) belong to Gamewright; anything below that reads like a rule is a story-side proposal. **Ruled by Bob (Oct 14 and Oct 16 2026):** a hunter-token encounter is layered on top of that turn's normal RtDT event, never instead of it (E19e); the normal event resolves first, then the encounter. At most one encounter per round. Each encounter is 2–3 moments, plus variants.

Format follows [README.md](README.md): moment IDs `enc-<id>.NN`, [still] or [clip], at most two speakers per exchange, `[tower:]` cues are light and sound only (no drum turns, no seal breaks), private lines only as `ipad:<hunter>`. Costs use only story vocabulary from [rulings](../../../../research/stories/dracula/rulings.md): corruption, story items (holy water, the host, a stake), findings (journal clues), foes, and story skull drops (cap 2 per night; under 6 skulls in supply the drop becomes "+1 foe on night 5"). No encounter costs or grants warriors or spirit; the base game tracks those.

**Soft cost rule (Gamewright, Oct 16 2026).** The rule caps an encounter's cost; it does not set it. An encounter can never give a hunter their 3rd corruption. A hunter already at 2 pays at most one soft cost in its place, and never corruption, warriors or spirit. The soft costs are: the party loses one story item, loses its newest finding (the newest journal clue), or takes a scare (no stat effect). Every encounter cost that can corrupt has a `~blocked` variant that plays instead and names which soft cost applies. Costs that are not corruption (for example a story skull drop) still apply as written, unless a cap replaces them.

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
- Placed at dusk, moves one site toward the nearest hunter each round, draws one encounter below when it lands on a hunter's site (at most one per round, after that turn's normal RtDT event), then returns to its start site. Removed at dawn. Tower pulses light only (`heartbeat` while it moves, `heartbeat-fast` when it lands).
- **Who is "present":** the hunters on the landed site (E15). Private moments go to present hunters only; a present hunter's cost is paid by a present hunter.

## 4–6. Encounter table

| ID | Title | Nights | Moments | Reuses |
|---|---|---|---|---|
| enc-early-lantern | A Lantern Before Midnight | 1–4 | 2 | `nx-midnight-procession` |
| enc-the-window | The Window Again | 1–4 | 3 | — |
| enc-brothers | Two Brothers in the Fog | 2–4 | 2 | — |
| enc-at-the-door | Asked to Be Let In | 1–4 | 3 | bite attempt (no existing scene; new) |
| enc-wrong-face | A Face That Came Back Wrong | 2–4 | 2 | `n23-catacombs-of-saint-ysolde` lookalike |
| enc-mist-remembers | The Mist Remembers | 1–4 | 3 | — |
| enc-road-returns | The Road Comes Back | 1–4 | 2 | — |
| enc-ledger-page | A Page from the Ledger | 1–3 | 2 | — |
| enc-wedding-uphill | The Wedding Goes Uphill | 3–4 | 3 | — |
| enc-wine-for-no-one | Wine Poured for No One | 2–4 | 2 | — |
| enc-third-hums | The Third One Hums | 2–4 | 2 | — |

"Moments" counts the moments any one playthrough hears in order; per-hunter privates and `~` variants replace a moment, they do not add one.

---

### enc-early-lantern: A Lantern Before Midnight
- **Nights:** 1–4. Only if the present hunter has not been spotlit by the procession tonight.
- **Beat:** One of the dead comes early, out of step with the bell, and stops for the hunter it belongs to.
- **Cost / stake:** none; the hunter cannot be spotlit again at tonight's midnight.
- **Outcome (proposed):** after `.02`, that hunter plays `nx-midnight-procession.03.private.<hunter>` and `.04.private.<hunter>` (choice); others present get `.04.private.<hunter>-watched`. Answer = tie clue; Turn away = Tome-order clue plus one holy water. No skull drop.
- **Still prompt:** A lone ghost in an old hunter's coat stands in a white-fogged village lane, holding a lantern that gives no light, looking straight at the viewer.

**enc-early-lantern.01** [clip]
[sfx: one footstep, far off; a bell that does not strike] [tower: dim-all] [tower: heartbeat-half]
> **Narrator:** It is not midnight. Nobody told the dead. One lantern comes up the lane alone, early, as if the mist had torn it off the line.

**enc-early-lantern.02** [still]
[tower: low]
> **Narrator:** It stops in front of one of you. The procession will be one short tonight.
Then: `nx-midnight-procession.03.private.<hunter>` and `nx-midnight-procession.04.private.<hunter>` for that hunter.

---

### enc-the-window: The Window Again
- **Nights:** 1–4.
- **Beat:** The mist plays the Count's oldest night again: a high window, a woman in white on the sill, a man begging her not to.
- **Cost / stake:** Watch: one present hunter takes 1 corruption. Look away: nothing.
- **At 2 corruptions (`~blocked`):** the watcher pays nothing; the party loses one story item.
- **Outcome (proposed):** Watch = finding: the shape of the high room and its single window (confirms the lair room the flowers point to). Look away = no finding.
- **Still prompt:** Through drifting fog, a far castle tower with one lit window open, a woman in white standing on the sill, seen from a dark valley road.

**enc-the-window.01** [clip]
[music: solo violin, two notes, slower] [sfx: wind; a shutter knocking] [tower: heartbeat-half]
> **Narrator:** The mist parts on a window that is not in this valley, or is in it every night. A woman in white climbs onto the sill.

**enc-the-window.02** [clip]
Choice voted on each iPad (ruling 6; the Story board shows the result): **Watch** (one present hunter takes 1 corruption; finding) or **Look away**.
> **The Count (far off):** Ludmila. Not the window. Anything but the window.
> **Ludmila (hushed):** Then do not come in.

**enc-the-window.03** [still]
[tower: low]
> **Narrator:** She steps. The mist closes. Somewhere in that room, tonight, another girl is sitting by the same window.

**enc-the-window.03~blocked** [still] — the chosen watcher is at 2 corruptions (same cues)
> **Narrator:** The grief reaches for one of you and finds no room left. It takes something from your packs instead, and the window goes dark.

---

### enc-brothers: Two Brothers in the Fog
- **Nights:** 2–4.
- **Beat:** Two brothers duel in the mist below the castle. The dark one wins with the fair one's sword, and kneels, and weeps. If the sword's carrier is present, `sergiu-blade` warms like a living hand.
- **Cost / stake:** one story skull drop (a villager who stopped to watch is lost in the fog; counts toward the cap). No corruption.
- **Outcome (proposed):** finding: "He killed Sergiu with this blade; it remembers its true hand." If `sergiu-blade` is held by a present hunter, that hunter gains +1 Undead advantage in their next fight tonight (within the +2 cap).
- **Still prompt:** Two sword-fighting silhouettes in thick mist on a mountain road, one blade glowing faint gold, a castle looming above.

**enc-brothers.01** [clip] [prop: sergiu-blade]
[sfx: steel on steel, muffled by fog] [tower: flicker]
> **Narrator:** Two men fight in the fog below the castle. Brothers, by the faces. The dark one takes the bright sword from the fair one, and uses it.
> **The Count (close, low):** I was only meant to take her. Not you. Never you.

**enc-brothers.01~carrier** [clip] [prop: sergiu-blade] — `sergiu-blade` held by a present hunter (same cues)
> **Narrator:** Two men fight in the fog below the castle. The dark one takes the bright sword from his brother, and uses it. At your back, the sword is warm as a hand.
> **The Count (close, low):** I was only meant to take her. Not you. Never you.

**enc-brothers.02** [still]
[tower: heartbeat] then [tower: low]
> **Narrator:** The fog takes them both, to begin again up the hill. A villager who stopped to watch does not come out of it. Drop a skull.

**enc-brothers.02~no-drop** [still] — story-drop cap reached or supply under 6 (same cues)
> **Narrator:** The fog takes them both, to begin again up the hill. No one else stopped to watch tonight.

---

### enc-at-the-door: Asked to Be Let In
- **Nights:** 1–4. (New: the scripts have no bite-attempt scene to reuse.)
- **Beat:** A knock at the door where a hunter shelters. The voice outside is courtly and tired; he cannot cross uninvited, so he asks, and names something only he could know.
- **Cost / stake:** Ward the door: spend one holy water or the host. Hold it shut: one present hunter takes 1 corruption (the bite through the door-crack).
- **At 2 corruptions (`~blocked`):** the chosen hunter pays nothing; the party loses one story item.
- **Outcome (proposed):** either way the door holds; finding: "She refuses him every evening" (his own words).
- **Still prompt:** A heavy wooden door at night, garlic strung above it, white mist curling under the sill and a pale long-fingered hand resting on the outside latch.

**enc-at-the-door.01** [clip]
[sfx: three slow knocks; wind] [tower: heartbeat-fast]
> **Narrator:** Three knocks. The mist comes under the door and stops at the sill, waiting to be asked.
> **The Count (through the door):** Only open it. One door always opens, in the end.

**enc-at-the-door.02.private.agnes** [still] `ipad:agnes`
> **The Count (whisper):** Sister. You prayed for me once. Pray with the door open.

**enc-at-the-door.02.private.tomas** [still] `ipad:tomas`
> **The Count (whisper):** Varga. You still owe me two fingers' worth of gate duty.

**enc-at-the-door.02.private.wren** [still] `ipad:wren`
> **The Count (whisper):** Your mother sings for me now. Would you hear her? Open.

**enc-at-the-door.02.private.emeric** [still] `ipad:emeric`
> **The Count (whisper):** Your master sold me a name through a door like this one. Ask me what he got for it.

**enc-at-the-door.03** [still]
Choice voted on each iPad (ruling 6; the Story board shows the result): **Ward the door** (spend holy water or the host) or **Hold it shut** (one present hunter takes 1 corruption).
[tower: low]
> **Narrator:** The latch stops moving. The voice goes away up the hill, still polite. She refuses him every evening, he said. He said it as a complaint.

**enc-at-the-door.03~blocked** [still] — the chosen hunter is at 2 corruptions and no ward is held (same cues)
> **Narrator:** His breath finds the crack and nothing left to bite. The cold takes one thing from your packs instead, and the voice goes up the hill.

---

### enc-wrong-face: A Face That Came Back Wrong
- **Nights:** 2–4. Only if no lookalike is active (at most one at a time).
- **Beat:** One hunter steps into a bank of mist and out again, and the face is right, nearly. The Count is replaying his catacomb trick.
- **Cost / stake:** the party may carry a lookalike until it is unmasked (holy water or a Sanctuary rest ends it). No corruption.
- **Outcome (proposed):** between `.01` and `.02`, the chosen present hunter's iPad plays `n23-catacombs-of-saint-ysolde.04.private.<hunter>~lookalike` and one secret card (`.secret-card.<goal>.private.<hunter>`). On unmasking, play `n23-catacombs-of-saint-ysolde.07` (or its `~lookalike-is-tomas` variant), then the `enc-wrong-face.02~lookalike-is-<hunter>` tell below. If the app picks no one, `.02` plays and nothing else happens.
- **Still prompt:** A figure stepping out of a wall of fog in a village street, their face almost familiar, one eye catching lamplight the wrong way.

**enc-wrong-face.01** [clip]
[sfx: footsteps that do not match the count of feet] [tower: flicker]
> **Narrator:** A wall of mist rolls across the street and back. For one breath, one of you is gone. Then you are all there again.

**enc-wrong-face.02** [still]
[tower: heartbeat-half]
> **Narrator:** Count heads. Count them again. Everyone is accounted for. That is what worries you.

**enc-wrong-face.02~lookalike-is-agnes** [still] — on unmasking, the lookalike was Agnes (cues: [tower: heartbeat])
> **Narrator:** The thing wearing the Sister's face never once crossed itself. The real Agnes is found in the church porch, praying, cold to the elbows.

**enc-wrong-face.02~lookalike-is-tomas** [still] — on unmasking, the lookalike was Tomas (cues: [tower: heartbeat])
> **Narrator:** The thing wearing Tomas's face had ten whole fingers. The real Tomas is found behind the well, swearing, his axe still in his hand.

**enc-wrong-face.02~lookalike-is-wren** [still] — on unmasking, the lookalike was Wren (cues: [tower: heartbeat])
> **Narrator:** The thing wearing Wren's face hummed her mother's song, and Wren never hums it. The real Wren is found in the lychgate, crossbow cocked at the dark.

**enc-wrong-face.02~lookalike-is-emeric** [still] — on unmasking, the lookalike was Emeric (cues: [tower: heartbeat])
> **Narrator:** The thing wearing Emeric's face wrote nothing down all night. The real Emeric is found in a shuttered shop, writing by feel in the dark.

---

### enc-mist-remembers: The Mist Remembers
- **Nights:** 1–4.
- **Beat:** The fog takes the shape of each present hunter's worst night. The valley does not let anyone forget why they came.
- **Cost / stake:** each present hunter chooses privately: **Face it** (take 1 corruption) or **Walk through it** (no cost).
- **At 2 corruptions (`~blocked`):** that hunter is not offered Face it; they get a scare only (`.02.private.<hunter>~blocked`), no cost and no clue.
- **Outcome (proposed):** Face it = that hunter's tie advances (a tie clue in their journal, same targets as the procession: Agnes → gallery and Tome, Tomas → fly-eater, Wren → final confrontation, Emeric → the Tome). Walk through = nothing.
- **Still prompt:** A hunter alone in dense white fog, faint shapes of a ruined infirmary, a castle wall, a grave and a cluttered apothecary shop forming in the mist around them.

**enc-mist-remembers.01** [clip]
[music: low strings, one held note] [sfx: wind drops to nothing] [tower: dim-all] [tower: heartbeat-half]
> **Narrator:** The mist comes in close and stops being weather. It has seen where each of you has been. It shows you.

**enc-mist-remembers.02.private.agnes** [still] `ipad:agnes`
> **Narrator (private):** Twelve infirmary beds in the fog, each one empty, each one still warm. The traveler's cot has a pressed violet on the pillow. Face it, or walk through.

**enc-mist-remembers.02.private.tomas** [still] `ipad:tomas`
> **Narrator (private):** The castle wall, the night you carried Marta over it. Your hand aches where the fingers were. Up on the wall, she is waving. Face it, or walk through.

**enc-mist-remembers.02.private.wren** [still] `ipad:wren`
> **Narrator (private):** Your father's yard. A stake in your hand, warm. A woman humming behind the church door, holding a baby. Face it, or walk through.

**enc-mist-remembers.02.private.emeric** [still] `ipad:emeric`
> **Narrator (private):** Gerhardt's shop, every jar labelled in his hand. On the counter, a receipt: one name, sold. Face it, or walk through.

**enc-mist-remembers.02.private.agnes~blocked** [still] `ipad:agnes` — when Agnes is present at 2 corruptions, instead of their private moment
> **Narrator (private):** The mist begins to show you something, then draws back, as if it knows you have paid enough. You walk through. Your hands shake for an hour.

**enc-mist-remembers.02.private.tomas~blocked** [still] `ipad:tomas` — when Tomas is present at 2 corruptions, instead of their private moment
> **Narrator (private):** The mist begins to show you something, then draws back, as if it knows you have paid enough. You walk through. Your hands shake for an hour.

**enc-mist-remembers.02.private.wren~blocked** [still] `ipad:wren` — when Wren is present at 2 corruptions, instead of their private moment
> **Narrator (private):** The mist begins to show you something, then draws back, as if it knows you have paid enough. You walk through. Your hands shake for an hour.

**enc-mist-remembers.02.private.emeric~blocked** [still] `ipad:emeric` — when Emeric is present at 2 corruptions, instead of their private moment
> **Narrator (private):** The mist begins to show you something, then draws back, as if it knows you have paid enough. You walk through. Your hands shake for an hour.

**enc-mist-remembers.03** [still]
[tower: low]
> **Narrator:** The fog lets go. Some of you look as if you saw something worth the price. Nobody says what.

---

### enc-road-returns: The Road Comes Back
- **Nights:** 1–4.
- **Beat:** A hunter walks the road out of the parish for an hour and comes back past the same milestone, the same shrine, the same crow. No one leaves Vellmoor.
- **Cost / stake:** Wash the stone (spend one holy water, no drop) or Leave it (one story skull drop). No corruption.
- **Outcome (proposed):** either way, finding: "The mist is his; it lifts only if he falls" (foreshadows the Rescued ending). Gamewright may also let the token return early.
- **Still prompt:** A lonely milestone and a roadside shrine at a fork in pale fog, the same crow on the stone, wheel ruts circling back on themselves.

**enc-road-returns.01** [clip]
[sfx: boots on gravel; a crow, twice] [tower: heartbeat]
> **Narrator:** The road out of the parish goes on for an hour. Then the milestone again. The shrine again. The same crow. An empty cart stands by the shrine, the driver's coat folded on the seat.
Choice: **Wash the stone** (spend one holy water) or **Leave it** (story skull drop).

**enc-road-returns.02** [still]
[tower: low]
> **Narrator:** No one leaves Vellmoor while he holds it. The road, at least, is honest about that.

**enc-road-returns.02~drop** [still] — the party left it (cues: [tower: heartbeat] then [tower: low])
> **Narrator:** By morning the driver will be standing in the square with the others, very pale. Drop a skull.

---

### enc-ledger-page: A Page from the Ledger
- **Nights:** 1–3.
- **Beat:** A page of ledger paper in Jakob Brenner's neat hand blows against a hunter's boot: shipping orders for "garden soil". The Count's house has done all this before.
- **Cost / stake:** Pocket it (no cost) or Follow the pages (one present hunter takes 1 corruption; something waits where the pages lead).
- **At 2 corruptions (`~blocked`):** the follower pays nothing and finds nothing; the pages blow away and the party loses its newest finding with them.
- **Outcome (proposed):** Pocket it = finding (where the earth boxes are in K4, not how many; feeds `n4-earth-boxes`). Follow the pages = that finding plus a stake, from a crate lid prised loose.
- **Still prompt:** A single sheet of neat ledger paper caught against a muddy boot in the fog, columns reading "garden soil, handle with care".

**enc-ledger-page.01** [still]
[sfx: paper on wind] [tower: flicker]
> **Jakob (from the page):** Garden soil. Handle with care. Forty boxes, as last time. And the time before.
> **Emeric:** As last time. He has done all of this before.

**enc-ledger-page.01~no-emeric** [still] — Emeric is not present (same cues)
> **Jakob (from the page):** Garden soil. Handle with care. Forty boxes, as last time. And the time before.
> **Wren:** Last time. Somebody's been here doing this before us.

**enc-ledger-page.02** [still]
Choice: **Pocket it** (finding) or **Follow the pages** (one present hunter takes 1 corruption; finding plus a stake).
[tower: low]
> **Narrator:** More pages lie up the road, one every few yards, toward somewhere dark.

**enc-ledger-page.02~blocked** [still] — the follower is at 2 corruptions (same cues)
> **Narrator:** You follow the pages a little way. Then the wind takes them all at once, and the page in your pocket with them.

---

### enc-wedding-uphill: The Wedding Goes Uphill
- **Nights:** 3–4. (Ties to the night-3 violet's gold veil thread.)
- **Beat:** A bridal procession climbs the hill road in the mist: a veiled girl in front, pale women behind, no groom. The brides at the back turn to look.
- **Cost / stake:** Fight: 2 foes (brides; Striga minis as proposed in the asset map). Losing costs one present hunter 1 corruption and one story skull drop. Or let it pass: spend a stake or holy water, no fight.
- **At 2 corruptions (`~blocked`):** if the fight is lost and the hunter it falls on is at 2, they take no corruption; the skull still drops and the party loses one story item.
- **Skull cap (Gamewright, Oct 16 2026):** the skull dropped on a lost fight counts toward the cap of 2 story drops per night. If the cap is already reached, no skull drops: the loss pays one soft cost instead (the party loses one story item), with `~cap-reached` variants. The under-6-skulls rule (+1 foe on night 5) applies only when a drop would happen.
- **Outcome (proposed):** Win = the veil's gold thread (finding: "He dresses her above the gallery") and one stake. Let it pass = no finding, no fight.
- **Still prompt:** A ghostly bridal procession climbing a misty mountain road toward a castle, a veiled girl at the front, pale women in white turning their heads backward.

**enc-wedding-uphill.01** [clip]
[music: music-box waltz, slowed] [sfx: female choir, distant] [tower: heartbeat-half]
> **Narrator:** A wedding goes up the hill in the mist. Veiled girl in front, pale women behind. There is no groom. There never is.

**enc-wedding-uphill.02** [clip]
Choice: **Fight** (2 foes, brides, per mechanics) or **Let it pass** (spend a stake or holy water).
> **Narrator:** The veiled girl does not look back. The two at the end of the train do. They smile, and keep smiling.

**enc-wedding-uphill.03** [still] — one variant by result
**enc-wedding-uphill.03~won** [still] — the fight is won
[tower: low]
> **Narrator:** They come apart like wet paper. Where the veil trailed, a single gold thread lies in the road.

**enc-wedding-uphill.03~lost** [still] — the fight is lost (cues: [tower: heartbeat-fast] then [tower: low])
> **Narrator:** The train closes over one of you, cold and sweet, and moves on up the hill. Someone in the village follows it. Drop a skull.

**enc-wedding-uphill.03~lost-blocked** [still] — the fight is lost and the hunter it falls on is at 2 corruptions (same cues)
> **Narrator:** The train closes over one of you and opens again, as if it found nothing it wanted. It takes something from your packs, and someone from the village. Drop a skull.

**enc-wedding-uphill.03~lost-cap-reached** [still] — the fight is lost and tonight's 2 story skull drops are already used: the hunter takes 1 corruption, no skull drops, and the party loses one story item instead (same cues)
> **Narrator:** The train closes over one of you, cold and sweet, and moves on up the hill. Nobody from the village follows it tonight. It takes something from your packs instead.

**enc-wedding-uphill.03~lost-blocked-cap-reached** [still] — the fight is lost, the hunter it falls on is at 2 corruptions, and the cap is reached: no corruption, no skull; the party loses one story item (one soft cost only) (same cues)
> **Narrator:** The train closes over one of you and opens again, as if it found nothing it wanted. It takes something from your packs and goes on up the hill alone.

**enc-wedding-uphill.03~avoided** [still] — the party let it pass (cues: [tower: low])
> **Narrator:** You stand aside with your heads bowed, as you would for any wedding. The brides at the back stop smiling. The procession goes on up the hill without you.

---

### enc-wine-for-no-one: Wine Poured for No One
- **Nights:** 2–4. (Tomas's past.)
- **Beat:** In an empty room, Marta, in a maid's apron over faded castle livery, or the part of her the mist can carry, lays a table for one and pours the Count's wine. She does not see the hunters until she sees Tomas.
- **Cost / stake:** Speak to her: one present hunter takes 1 corruption (her wine is his). Leave her be: nothing.
- **At 2 corruptions (`~blocked`):** the speaker pays nothing; she will not speak to someone already his, so there is no finding (scare only).
- **Outcome (proposed):** Speak = finding: "The little gate is on the left of the chasm; she keeps the key" (feeds `n5-drawbridge`). If Tomas is present, it goes to his journal as a tie clue. Leave = nothing.
- **Still prompt:** A candlelit table laid for one in an empty stone room, a young woman in a maid's apron over faded castle livery pouring dark wine, fog at the windows.

**enc-wine-for-no-one.01** [clip]
[sfx: wine poured; a chair drawn back for no one] [tower: low]
Choice: **Speak to her** (one present hunter takes 1 corruption; finding) or **Leave her be**.
> **Marta:** Uncle? You shouldn't be here. He drinks at midnight, and he counts the glasses.
> **Tomas:** I came back for you, lass. I always meant to.

**enc-wine-for-no-one.01~no-tomas** [clip] — Tomas is not present (same cues)
> **Marta:** You shouldn't be here. He drinks at midnight, and he counts the glasses.
> **Agnes:** Who are you pouring for, child?

**enc-wine-for-no-one.02** [still]
[tower: heartbeat-half] then [tower: low]
> **Narrator:** When you look again there is only the table, and the glass, and the wine going dark.

**enc-wine-for-no-one.02~blocked** [still] — the speaker is at 2 corruptions (same cues)
> **Narrator:** She looks at you and sets a second glass. Then she is gone, and both glasses are full.

---

### enc-third-hums: The Third One Hums
- **Nights:** 2–4. (Wren's past.)
- **Beat:** A woman hums in the fog, the lullaby sung at the church door the night Lenka was left there. It is Ilka Kessel, the third bride, singing for her daughter or for him; she no longer knows which.
- **Cost / stake:** Listen: one present hunter takes 1 corruption. Stop your ears: spend one holy water.
- **At 2 corruptions (`~blocked`):** the listener pays nothing and hears only the tune, no words; the party loses its newest finding to the song.
- **Outcome (proposed):** Listen = tie clue for Wren (the "blank" bolt: Ilka scratched her own name; feeds `n5-final-confrontation`), or a finding for anyone else: "The third bride on the stair is not willing." Stop your ears = nothing.
- **Still prompt:** A pale woman's face half-seen in drifting fog beside a churchyard wall, lips parted in a lullaby, a crossbow bolt lying in the wet grass.

**enc-third-hums.01.private.agnes** [clip] `ipad:agnes`
[music: a lullaby, one voice, far off] [sfx: wind in yews] [tower: heartbeat-half]
> **Agnes (thought):** That is a mother's song. Whoever she was, part of her still is.

**enc-third-hums.01.private.tomas** [clip] `ipad:tomas`
> **Tomas (thought):** I heard that on the castle stair, years back. The third one. She always sang.

**enc-third-hums.01.private.wren** [clip] `ipad:wren`
> **Ilka (far off):** Hush now, little bird. Mother's at the door. Mother's always at the door.

**enc-third-hums.01.private.emeric** [clip] `ipad:emeric`
> **Emeric (thought):** Gerhardt wrote that his brides sing to the ones they lost. He said it like a footnote.

**enc-third-hums.02** [still]
Choice: **Listen** (one present hunter takes 1 corruption) or **Stop your ears** (spend one holy water).
[tower: low]
> **Narrator:** The song moves off toward the castle stair, where it has been going every night for nineteen years.

**enc-third-hums.02~blocked** [still] — the listener is at 2 corruptions (same cues)
> **Narrator:** The tune comes through and the words do not. When it is gone, so is something you had written down.
