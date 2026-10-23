# Board map (DEC-221 draft)

**Status:** draft for Bob workbench check  
**Source photo:** `research/return-to-dark-tower/assets/board-top-down.webp` (Bob’s top-down photo of the physical RtDT board)  
**Cards:** DEC-221 (this graph), DEC-225 (printed name + `kingdom+slug` ID), DEC-226 (N Arisilon, E Brynthia, S Durnin, W Zenon), AST-B01 (4×15, 6 terrains), AREA-077  
**Accuracy:** drafted from the photo (and quadrant crops). Prefer printed labels. Unreadable or uncertain names are flagged **needs Bob**. Adjacencies are best-effort; uncertain edges use `?`. **Adjacency incomplete — Bob check.** Do not treat this draft as final until Bob marks it checked on the workbench.

Compass letters on the photo outer rim assign kingdoms (DEC-226). Working crops `board-{nw,ne,sw,se}.png` are image-position crops of the photo (not compass labels): image NW ≈ South, NE ≈ West, SW ≈ East, SE ≈ North.

---

## Kingdoms (DEC-226)

| Direction | DT81 name | Player label | Data letter |
|---|---|---|---|
| N | Arisilon | Arisilon (N) | `N` |
| E | Brynthia | Brynthia (E) | `E` |
| S | Durnin | Durnin (S) | `S` |
| W | Zenon | Zenon (W) | `W` |

---

## Terrain legend (photo → AST-B01)

Six terrains. Every space has exactly one. Read from **color + circular icon** on the photo:

| Terrain | Photo color | Icon on board (approx.) |
|---|---|---|
| **Desert** | Tan / sandy | Swirl / wind-dune mark |
| **Hills** | Reddish-brown rocky | Stacked rounded mounds |
| **Mountains** | Purple-grey jagged peaks (often snow) | Sharp triple peaks |
| **Lake** | Deep blue water | Stacked wavy water lines |
| **Forest** | Dark green, tree canopy art | Cluster of tree shapes |
| **Grasslands** | Light / lime green fields | Horizontal grass / wave lines |

---

## Region labels (not spaces — DEC-225)

These large printed names span several spaces. **They are not spaces and get no ID:**

| Label | Where it reads on the photo |
|---|---|
| **Regal Run** | South inner green belt near The Throne / Irontops / Sands of Madness |
| **The Great Woods** | West outer forest belt near Yellowpike / Akartus / Delmsmire |

If Bob finds another spanning label on the workbench, add it here and keep it out of the space list.

---

## Spaces (60 = 4 × 15)

IDs: `{N|E|S|W}-{slug-of-printed-name}` (DEC-225). Buildings sit **on** a named space (they are not separate spaces).

### N — Arisilon (15)

| ID | Printed name | Terrain | Building | Notes |
|---|---|---|---|---|
| `N-egans-end` | Egan’s End | Grasslands | Village | Outer rim near N letter |
| `N-the-tundra` | The Tundra | Desert | — | Tan + swirl despite the name |
| `N-dayside` | Dayside | Lake | Bazaar | OCR/blog “Dayside”; lake with Bazaar. Confirm spelling |
| `N-fivepoint` | Fivepoint | Grasslands | — | Partial “Five…” on rim west of Dayside — **needs Bob** spelling + terrain |
| `N-rimeweald` | Rimeweald | Forest | — | |
| `N-lower-ice-fangs` | Lower Ice Fangs | Mountains | — | |
| `N-upper-ice-fangs` | Upper Ice Fangs | Mountains | Sanctuary | Tower-adjacent |
| `N-peaks-of-the-djinn` | Peaks of the Djinn | Mountains | — | Touches N–E river |
| `N-greenbridge` | Greenbridge | Grasslands | — | |
| `N-muted-forest` | Muted Forest | Forest | — | |
| `N-tower-scar-desert` | Tower Scar Desert | Desert | — | Tower-adjacent |
| `N-radiant-mountains` | Radiant Mountains | Mountains | Citadel | |
| `N-lodestone-mountains` | Lodestone Mountains | Mountains | — | Outer rim |
| `N-pearl-of-the-north` | Pearl-of-the-North | Grasslands | — | Confirm hyphenation |
| `N-broken-lands` | Broken Lands | Hills | — | Across N–W river from Ash Hills / Hissing Groves |

#### N adjacencies (best effort)

| Space | Adjacent (same kingdom unless noted) |
|---|---|
| Egan’s End | The Tundra, Rimeweald; ? across N–E river |
| The Tundra | Egan’s End, Dayside, Rimeweald, Lower Ice Fangs, Fivepoint? |
| Dayside | The Tundra, Fivepoint?, Greenbridge?, Lower Ice Fangs? |
| Fivepoint | Dayside?, Pearl-of-the-North?, Lodestone Mountains? — **incomplete** |
| Rimeweald | Egan’s End, The Tundra, Lower Ice Fangs, Peaks of the Djinn |
| Lower Ice Fangs | The Tundra, Rimeweald, Peaks of the Djinn, Upper Ice Fangs, Dayside?, Greenbridge? |
| Upper Ice Fangs | Lower Ice Fangs, Peaks of the Djinn, Tower Scar Desert, Greenbridge?, Muted Forest?; **tower** |
| Peaks of the Djinn | Rimeweald, Lower Ice Fangs, Upper Ice Fangs; across N–E river → Inner Kinghills? / Bleak Wastes? |
| Greenbridge | Dayside?, Lower Ice Fangs?, Upper Ice Fangs?, Muted Forest, Radiant Mountains? |
| Muted Forest | Greenbridge, Upper Ice Fangs?, Tower Scar Desert, Radiant Mountains, Broken Lands? |
| Tower Scar Desert | Upper Ice Fangs, Muted Forest; **tower** |
| Radiant Mountains | Greenbridge?, Muted Forest, Lodestone Mountains, Pearl-of-the-North, Broken Lands? |
| Lodestone Mountains | Radiant Mountains, Pearl-of-the-North, Fivepoint? |
| Pearl-of-the-North | Lodestone Mountains, Radiant Mountains, Fivepoint?, Dayside? |
| Broken Lands | Muted Forest?, Radiant Mountains?; across N–W river → Ash Hills?, Lonelight Hills? |

---

### E — Brynthia (15)

| ID | Printed name | Terrain | Building | Notes |
|---|---|---|---|---|
| `E-three-rivers` | Three Rivers | Grasslands | Bazaar | Outer rim |
| `E-lake-of-songs` | Lake of Songs | Lake | — | |
| `E-duwani` | Duwani | Grasslands | Village | Near E letter on rim |
| `E-jewel-hills` | Jewel Hills | Hills | — | |
| `E-copper-grove` | Copper Grove | Forest | — | |
| `E-outer-kinghills` | Outer Kinghills | Hills | — | Touches E–S river |
| `E-lesser-tombstones` | Lesser Tombstones | Hills | — | |
| `E-utars-barrows` | Utar’s Barrows | Desert | — | Confirm apostrophe |
| `E-the-decaying-wilds` | The Decaying Wilds | Grasslands | — | |
| `E-inner-kinghills` | Inner Kinghills | Hills | Citadel | |
| `E-big-sister` | Big Sister | Mountains | — | Tower-adjacent; across river from Middle Sister (S) |
| `E-greater-tombstones` | Greater Tombstones | Hills | Sanctuary | |
| `E-forest-of-shades` | Forest of Shades | Forest | — | Tower-adjacent |
| `E-dragontooth-lake` | Dragontooth Lake | Lake | — | |
| `E-bleak-wastes` | Bleak Wastes | Desert | — | Tower-adjacent; touches N–E river |

#### E adjacencies (best effort)

| Space | Adjacent |
|---|---|
| Three Rivers | Lake of Songs, Lesser Tombstones; ? across river |
| Lake of Songs | Three Rivers, Lesser Tombstones, Duwani, Utar’s Barrows? |
| Duwani | Lake of Songs, Jewel Hills, Utar’s Barrows? |
| Jewel Hills | Duwani, Copper Grove, The Decaying Wilds, Utar’s Barrows? |
| Copper Grove | Jewel Hills, Outer Kinghills, The Decaying Wilds, Inner Kinghills? |
| Outer Kinghills | Copper Grove, Inner Kinghills; across E–S river → Mountains of the Watchers? |
| Lesser Tombstones | Three Rivers, Lake of Songs, Greater Tombstones, Big Sister?, Utar’s Barrows? |
| Utar’s Barrows | Lake of Songs?, Duwani?, Jewel Hills?, The Decaying Wilds, Lesser Tombstones?, Greater Tombstones? |
| The Decaying Wilds | Jewel Hills, Copper Grove, Utar’s Barrows?, Greater Tombstones?, Dragontooth Lake?, Inner Kinghills? |
| Inner Kinghills | Outer Kinghills, Copper Grove?, The Decaying Wilds?, Dragontooth Lake; across N–E river → Peaks of the Djinn? |
| Big Sister | Lesser Tombstones?, Greater Tombstones, Forest of Shades; across S river → Middle Sister; **tower** |
| Greater Tombstones | Lesser Tombstones, Big Sister, Forest of Shades, Dragontooth Lake, The Decaying Wilds?, Utar’s Barrows? |
| Forest of Shades | Big Sister, Greater Tombstones, Bleak Wastes, Dragontooth Lake; **tower** |
| Dragontooth Lake | Forest of Shades, Bleak Wastes, Greater Tombstones?, The Decaying Wilds?, Inner Kinghills |
| Bleak Wastes | Forest of Shades, Dragontooth Lake; across N–E river → ?; **tower** |

---

### S — Durnin (15)

| ID | Printed name | Terrain | Building | Notes |
|---|---|---|---|---|
| `S-southern-wastes` | Southern Wastes | Desert | Village | Outer near S letter |
| `S-pine-barrens` | Pine Barrens | Forest | — | Near S–E river / Sisters |
| `S-ulamels-hollow` | Ulamel’s Hollow | Lake | — | Blue/green hollow; **needs Bob** if icon reads Grasslands instead |
| `S-little-sister` | Little Sister | Mountains | — | |
| `S-middle-sister` | Middle Sister | Mountains | — | Across river from Big Sister (E) |
| `S-bone-hills` | Bone Hills | Hills | — | Outer near Emerald Expanse |
| `S-howling-desert` | Howling Desert | Desert | Citadel | |
| `S-mountains-of-the-watchers` | Mountains of the Watchers | Mountains | — | Touches S–W and S–E rivers |
| `S-the-emerald-expanse` | The Emerald Expanse | Grasslands | Bazaar | Named space with Bazaar (not a spanning-only label) |
| `S-azkols-bane` | Azkol’s Bane | Desert | — | Tan + swirl on photo — **needs Bob** if icon is Hills |
| `S-archmont` | Archmont | Grasslands | — | |
| `S-sands-of-madness` | Sands of Madness | Desert | Sanctuary | |
| `S-the-cloister` | The Cloister | Grasslands | — | |
| `S-irontops` | Irontops | Mountains | — | Tower-adjacent |
| `S-the-throne` | The Throne | Grasslands | — | Under **Regal Run** region label (label ≠ space). Tower-adjacent |

#### S adjacencies (best effort)

| Space | Adjacent |
|---|---|
| Southern Wastes | Pine Barrens?, Ulamel’s Hollow?, Bone Hills?, Little Sister? |
| Pine Barrens | Southern Wastes?, Ulamel’s Hollow?, Middle Sister?, Little Sister? |
| Ulamel’s Hollow | Southern Wastes?, Pine Barrens?, Little Sister? |
| Little Sister | Ulamel’s Hollow?, Southern Wastes?, Pine Barrens?, Middle Sister, Sands of Madness? |
| Middle Sister | Little Sister, Pine Barrens?; across E river → Big Sister; Sands of Madness? |
| Bone Hills | Southern Wastes?, The Emerald Expanse, Azkol’s Bane?, Archmont? |
| Howling Desert | The Emerald Expanse, Mountains of the Watchers, The Cloister?, Azkol’s Bane? |
| Mountains of the Watchers | Howling Desert, The Emerald Expanse?; across W river → Lost Lands; across E river → Outer Kinghills? |
| The Emerald Expanse | Howling Desert, Bone Hills, Azkol’s Bane, Mountains of the Watchers? |
| Azkol’s Bane | The Emerald Expanse, Bone Hills, Archmont, The Cloister?, Howling Desert? |
| Archmont | Bone Hills?, Azkol’s Bane, The Cloister, Sands of Madness? |
| Sands of Madness | Archmont?, Little Sister?, Middle Sister?, The Throne, The Cloister? |
| The Cloister | Howling Desert?, Azkol’s Bane?, Archmont, Irontops, The Throne? |
| Irontops | The Cloister, The Throne; across W river → Lonelight Hills? / The Grass Sea?; **tower** |
| The Throne | Irontops, Sands of Madness, The Cloister?; **tower** |

---

### W — Zenon (15)

| ID | Printed name | Terrain | Building | Notes |
|---|---|---|---|---|
| `W-lost-lands` | Lost Lands | Desert | — | Touches S–W river near Mountains of the Watchers |
| `W-plains-of-woldra` | Plains of Woldra | Grasslands | — | |
| `W-anza` | Anza | Grasslands | Village | Near W letter / Great Woods |
| `W-yellowpike` | Yellowpike | Forest | — | Under **The Great Woods** region label |
| `W-akartus` | Akartus | Forest | Sanctuary | Under The Great Woods |
| `W-delmsmire` | Delmsmire | Forest | — | Confirm spelling |
| `W-plains-of-plovo` | Plains of Plovo | Grasslands | Bazaar | |
| `W-idran-forest` | Idran Forest | Forest | — | |
| `W-weeping-waters` | Weeping Waters | Lake | — | |
| `W-lonelight-hills` | Lonelight Hills | Hills | — | Near N–W river |
| `W-the-empty-glade` | The Empty Glade | Grasslands | — | |
| `W-cloudhold` | Cloudhold | Mountains | — | |
| `W-hissing-groves` | Hissing Groves | Forest | Citadel | Rulebook example; tower-adjacent |
| `W-the-grass-sea` | The Grass Sea | Grasslands | — | Tower-adjacent |
| `W-ash-hills` | Ash Hills | Hills | — | Near Hissing Groves; rulebook quest example |

#### W adjacencies (best effort)

| Space | Adjacent |
|---|---|
| Lost Lands | Plains of Woldra, Idran Forest?; across S–W river → Mountains of the Watchers |
| Plains of Woldra | Lost Lands, Anza, Weeping Waters?, Idran Forest? |
| Anza | Plains of Woldra, Yellowpike, Akartus? |
| Yellowpike | Anza, Akartus, Weeping Waters?, The Empty Glade?, Delmsmire? |
| Akartus | Yellowpike, Delmsmire?, The Empty Glade?, Anza? |
| Delmsmire | Akartus?, Plains of Plovo, Cloudhold?, The Empty Glade? |
| Plains of Plovo | Delmsmire, Cloudhold?, Ash Hills? |
| Idran Forest | Lost Lands?, Plains of Woldra?, Weeping Waters, Lonelight Hills? |
| Weeping Waters | Yellowpike?, Plains of Woldra?, Idran Forest, The Empty Glade, Lonelight Hills? |
| Lonelight Hills | Weeping Waters?, Idran Forest?, Hissing Groves, The Grass Sea; across N–W river → Broken Lands? |
| The Empty Glade | Yellowpike?, Akartus?, Weeping Waters, Cloudhold, Hissing Groves, Ash Hills? |
| Cloudhold | The Empty Glade, Delmsmire?, Plains of Plovo?, Ash Hills? |
| Hissing Groves | Lonelight Hills, The Empty Glade, The Grass Sea, Ash Hills; **tower** |
| The Grass Sea | Lonelight Hills, Hissing Groves; across river → Irontops?; **tower** |
| Ash Hills | Hissing Groves, The Empty Glade?, Cloudhold?, Plains of Plovo?; across N–W river → Broken Lands? |

---

## Tower-adjacent spaces

Spaces that share a border with the central tower hole. Best effort from photo — **Bob check**:

| Kingdom | Spaces |
|---|---|
| N Arisilon | Upper Ice Fangs, Tower Scar Desert (Greenbridge? Muted Forest?) |
| E Brynthia | Big Sister, Forest of Shades, Bleak Wastes |
| S Durnin | Irontops, The Throne (Howling Desert? The Cloister? Sands of Madness?) |
| W Zenon | Hissing Groves, The Grass Sea (Lonelight Hills?) |

---

## River borders between kingdoms

Kingdoms are separated by thick blue river borders (not spaces). Crossing a river is one move to an adjacent space across the blue border. Draft contact pairs:

| Border | Example contact pairs (photo best effort) |
|---|---|
| **N–E** | Peaks of the Djinn ↔ Inner Kinghills? / Bleak Wastes?; Egan’s End / Rimeweald ↔ Three Rivers? |
| **E–S** | Outer Kinghills ↔ Mountains of the Watchers?; Big Sister ↔ Middle Sister |
| **S–W** | Mountains of the Watchers ↔ Lost Lands; Irontops ↔ The Grass Sea? / Lonelight Hills? |
| **W–N** | Lonelight Hills / Ash Hills / The Grass Sea? ↔ Broken Lands |

Full river adjacency list: **incomplete — Bob check**.

---

## Building inventory (one each per kingdom)

| Kingdom | Citadel (space) | Sanctuary (space) | Village (space) | Bazaar (space) |
|---|---|---|---|---|
| N Arisilon | Radiant Mountains | Upper Ice Fangs | Egan’s End | Dayside |
| E Brynthia | Inner Kinghills | Greater Tombstones | Duwani | Three Rivers |
| S Durnin | Howling Desert | Sands of Madness | Southern Wastes | The Emerald Expanse |
| W Zenon | Hissing Groves | Akartus | Anza | Plains of Plovo |

---

## Counts (this draft)

| Kingdom | Spaces |
|---|---|
| N Arisilon | 15 |
| E Brynthia | 15 |
| S Durnin | 15 |
| W Zenon | 15 |
| **Total** | **60** |

### Terrain counts (all 60)

| Terrain | N | E | S | W | Total |
|---|---|---|---|---|---|
| Desert | 2 | 2 | 4 | 1 | **9** |
| Hills | 1 | 5 | 1 | 2 | **9** |
| Mountains | 5 | 1 | 4 | 1 | **11** |
| Lake | 1 | 2 | 1 | 1 | **5** |
| Forest | 2 | 2 | 1 | 5 | **10** |
| Grasslands | 4 | 3 | 4 | 5 | **16** |
| **Total** | 15 | 15 | 15 | 15 | **60** |

If Bob flips `N-fivepoint`, `S-ulamels-hollow`, or `S-azkols-bane` terrain, recount.

---

## Unreadable / uncertain (Bob must confirm)

| Item | Issue |
|---|---|
| `N-fivepoint` | Only partial “Five…” readable on photo; spelling + terrain need workbench check |
| `N-dayside` | Confirm printed spelling (Dayside vs any near-misread) |
| `N-pearl-of-the-north` | Confirm hyphenation / exact printed form |
| `S-ulamels-hollow` | Terrain drafted as Lake; confirm icon is not Grasslands |
| `S-azkols-bane` | Terrain drafted as Desert (tan + swirl); confirm not Hills |
| `S-the-throne` vs **Regal Run** | Throne drafted as the space; Regal Run as spanning label (DEC-225) — confirm on board |
| `W-delmsmire` | Confirm spelling |
| `W-akartus` | Confirm Sanctuary sits on Akartus (under The Great Woods label) |
| All adjacency lists | Many `?` edges; full graph needs Bob workbench pass |
| Tower-adjacent set | Confirm exact ring of spaces touching the tower hole |
| River contact pairs | Complete N–E / E–S / S–W / W–N crossing list |

---

## Photo reading notes

- Buildings are banners **on** named spaces (`Howling Desert` + Citadel, `Southern Wastes` + Village, etc.), never separate space rows.
- Tokens and foe cards on Bob’s photo were ignored for names/terrains.
- Cross-checked some names against the RtDT rulebook examples (Hissing Groves citadel, Ash Hills quest, Upper Ice Fangs / Inner Kinghills / Peaks of the Djinn move example, Forest of Shades / Bleak Wastes) and a public playthrough (Dayside Bazaar, Emerald Expanse, Three Rivers, Duwani, Egan’s End, etc.). Photo labels win when they conflict.
