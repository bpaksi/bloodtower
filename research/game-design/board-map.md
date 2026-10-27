# Board map (DEC-221 draft)

**Status:** draft, checked with Bob in session 2026-10-23. On 2026-10-27 Bob marked all 60 spaces complete in the board map entry tool. The neighbour data in that file ([board-map-2026-10-27.json](board-map-2026-10-27.json)) now replaces the adjacency tables below; see [Board map file, complete](#board-map-file-complete-2026-10-27). The game does not read it yet  
**Source photo:** `photos/board-top-down.webp` in Bob's backup folder (Bob’s top-down photo of the physical RtDT board; copyrighted, not in the repo, see [the RtDT README](../return-to-dark-tower/README.md#copyrighted-material-not-in-the-repo))  
**Cards:** DEC-221 (this graph), DEC-225 (printed name + `kingdom+slug` ID), DEC-226 (N Arisilon, E Brynthia, S Durnin, W Zenon), AST-B01 (4×15, 6 terrains), AREA-077  
**Accuracy:** drafted from the photo and checked by Bob in session against the physical board (2026-10-23). Still open: river contacts, the adjacency edges still marked `?`, and the items under **Still open** below. Do not treat this as final until Bob signs it off.

Compass letters on the photo outer rim assign kingdoms (DEC-226).

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
| **Regal Run** | A mountain range crossing S The Throne, S The Cloister and S Archmont (Bob, 2026-10-23). A label, not a space |
| **The Great Woods** | West outer forest belt near Yellowpike / Akartus / Delmsmire |
| **Longwater** | The lake across N Dayside and N Fivepint. Named by Bob as the body of water; a lore hook for stories |

If Bob finds another spanning label on the workbench, add it here and keep it out of the space list.

---

## Spaces (60 = 4 × 15)

IDs: `{N|E|S|W}-{slug-of-printed-name}` (DEC-225). Buildings sit **on** a named space (they are not separate spaces).

### N — Arisilon (15)

| ID | Printed name | Terrain | Building | Notes |
|---|---|---|---|---|
| `N-egans-end` | Egan’s End | Grasslands | Village | Outer rim near N letter |
| `N-the-tundra` | The Tundra | Desert | — | Tan + swirl despite the name |
| `N-dayside` | Dayside | Lake | Bazaar | Spelling confirmed (Bob, 2026-10-23). Lake under Longwater |
| `N-fivepint` | Fivepint | Lake | — | Spelling confirmed as Fivepint (Bob, 2026-10-23); terrain changed from Grasslands to Lake (Bob) |
| `N-rimeweald` | Rimeweald | Forest | — | |
| `N-lower-ice-fangs` | Lower Ice Fangs | Mountains | — | |
| `N-upper-ice-fangs` | Upper Ice Fangs | Mountains | Sanctuary | |
| `N-peaks-of-the-djinn` | Peaks of the Djinn | Mountains | — | Touches N–E river |
| `N-greenbridge` | Greenbridge | Grasslands | — | |
| `N-muted-forest` | Muted Forest | Forest | — | |
| `N-tower-scar-desert` | Tower Scar Desert | Desert | — | Tower-adjacent |
| `N-radiant-mountains` | Radiant Mountains | Mountains | Citadel | |
| `N-lodestone-mountains` | Lodestone Mountains | Mountains | — | Outer rim |
| `N-pearl-of-the-north` | Pearl of the North | Grasslands | — | Printed without hyphens (Bob, 2026-10-23). ID slug unchanged |
| `N-broken-lands` | Broken Lands | Hills | — | Across N–W river from Ash Hills / Hissing Groves |

#### N adjacencies (best effort)

| Space | Adjacent (same kingdom unless noted) |
|---|---|
| Egan’s End | The Tundra, Rimeweald; across N–E river → E Outer Kinghills (Bob, 2026-10-23) |
| The Tundra | Egan’s End, Dayside, Rimeweald, Lower Ice Fangs |
| Dayside | The Tundra, Fivepint?, Greenbridge?, Lower Ice Fangs? |
| Fivepint | Dayside?, Pearl of the North?, Lodestone Mountains? — **incomplete** |
| Rimeweald | Egan’s End, The Tundra, Lower Ice Fangs, Peaks of the Djinn |
| Lower Ice Fangs | The Tundra, Rimeweald, Peaks of the Djinn, Upper Ice Fangs, Dayside?, Greenbridge? |
| Upper Ice Fangs | Lower Ice Fangs, Peaks of the Djinn, Tower Scar Desert, Greenbridge?, Muted Forest? |
| Peaks of the Djinn | Rimeweald, Lower Ice Fangs, Upper Ice Fangs; across N–E river → Inner Kinghills? / Bleak Wastes? |
| Greenbridge | Dayside?, Lower Ice Fangs?, Upper Ice Fangs?, Muted Forest, Radiant Mountains? |
| Muted Forest | Greenbridge, Upper Ice Fangs?, Tower Scar Desert, Radiant Mountains, Broken Lands? |
| Tower Scar Desert | Upper Ice Fangs, Muted Forest; **tower** |
| Radiant Mountains | Greenbridge?, Muted Forest, Lodestone Mountains, Pearl of the North, Broken Lands? |
| Lodestone Mountains | Radiant Mountains, Pearl of the North, Fivepint? |
| Pearl of the North | Lodestone Mountains, Radiant Mountains, Fivepint? |
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
| `E-utars-barrows` | Utar’s Barrows | Desert | — | Apostrophe confirmed (Bob, 2026-10-23) |
| `E-the-decaying-wilds` | The Decaying Wilds | Grasslands | — | |
| `E-inner-kinghills` | Inner Kinghills | Hills | Citadel | |
| `E-big-sister` | Big Sister | Mountains | — | Across river from Middle Sister (S) |
| `E-greater-tombstones` | Greater Tombstones | Hills | Sanctuary | |
| `E-forest-of-shades` | Forest of Shades | Forest | — | Tower-adjacent |
| `E-dragontooth-lake` | Dragontooth Lake | Lake | — | |
| `E-bleak-wastes` | Bleak Wastes | Desert | — | Tower-adjacent; touches N–E river |

#### E adjacencies (best effort)

| Space | Adjacent |
|---|---|
| Three Rivers | Lake of Songs, Lesser Tombstones; ? across river |
| Lake of Songs | Three Rivers, Lesser Tombstones, Duwani, Utar’s Barrows (to re-check in sweep) |
| Duwani | Lake of Songs, Jewel Hills, Utar’s Barrows |
| Jewel Hills | Duwani, Copper Grove, The Decaying Wilds, Utar’s Barrows |
| Copper Grove | Jewel Hills, Outer Kinghills, The Decaying Wilds, Inner Kinghills? |
| Outer Kinghills | Copper Grove, Inner Kinghills; across E–S river → Mountains of the Watchers?; across N–E river → N Egan’s End (Bob, 2026-10-23) |
| Lesser Tombstones | Three Rivers, Lake of Songs, Greater Tombstones, Big Sister, Utar’s Barrows |
| Utar’s Barrows | Lake of Songs, Duwani, Jewel Hills, The Decaying Wilds, Lesser Tombstones, Greater Tombstones (to re-check in sweep) |
| The Decaying Wilds | Jewel Hills, Copper Grove, Utar’s Barrows, Greater Tombstones, Dragontooth Lake, Inner Kinghills (to re-check in sweep) |
| Inner Kinghills | Outer Kinghills, Copper Grove?, The Decaying Wilds, Dragontooth Lake; across N–E river → Peaks of the Djinn? |
| Big Sister | S The Throne, S Sands of Madness, S Middle Sister (across river), Lesser Tombstones, Greater Tombstones, Forest of Shades |
| Greater Tombstones | Lesser Tombstones, Big Sister, Forest of Shades, Dragontooth Lake, The Decaying Wilds, Utar’s Barrows |
| Forest of Shades | Big Sister, Greater Tombstones, Bleak Wastes, Dragontooth Lake, S The Throne; **tower** |
| Dragontooth Lake | Forest of Shades, Bleak Wastes, Greater Tombstones, The Decaying Wilds, Inner Kinghills |
| Bleak Wastes | Forest of Shades, Dragontooth Lake; across N–E river → ?; **tower** |

---

### S — Durnin (15)

| ID | Printed name | Terrain | Building | Notes |
|---|---|---|---|---|
| `S-southern-wastes` | Southern Wastes | Desert | Village | Outer near S letter |
| `S-pine-barrens` | Pine Barrens | Forest | — | Near S–E river / Sisters |
| `S-ulamels-hollow` | Ulamel’s Hollow | Grasslands | — | Changed from Lake to Grasslands (Bob, 2026-10-23); green with grass icon on photo |
| `S-little-sister` | Little Sister | Mountains | — | |
| `S-middle-sister` | Middle Sister | Mountains | — | Across river from Big Sister (E) |
| `S-bone-hills` | Bone Hills | Hills | — | Outer near Emerald Expanse |
| `S-howling-desert` | Howling Desert | Desert | Citadel | |
| `S-mountains-of-the-watchers` | Mountains of the Watchers | Mountains | — | Touches S–W and S–E rivers |
| `S-the-emerald-expanse` | The Emerald Expanse | Grasslands | Bazaar | Named space with Bazaar (not a spanning-only label) |
| `S-azkols-bane` | Azkol’s Bane | Desert | — | Desert confirmed (Bob, 2026-10-23) |
| `S-archmont` | Archmont | Grasslands | — | |
| `S-sands-of-madness` | Sands of Madness | Desert | Sanctuary | |
| `S-the-cloister` | The Cloister | Grasslands | — | |
| `S-irontops` | Irontops | Mountains | — | Tower-adjacent |
| `S-the-throne` | The Throne | Grasslands | — | Crossed by the **Regal Run** mountain range (label ≠ space, Bob 2026-10-23). Tower-adjacent |

#### S adjacencies (best effort)

| Space | Adjacent |
|---|---|
| Southern Wastes | Pine Barrens?, Ulamel’s Hollow?, Bone Hills?, Little Sister? |
| Pine Barrens | Southern Wastes?, Ulamel’s Hollow?, Middle Sister?, Little Sister? |
| Ulamel’s Hollow | Southern Wastes?, Pine Barrens?, Little Sister? |
| Little Sister | Ulamel’s Hollow?, Southern Wastes?, Pine Barrens?, Middle Sister, Sands of Madness |
| Middle Sister | Little Sister, Pine Barrens?, Sands of Madness; across E river → Big Sister |
| Bone Hills | Southern Wastes?, The Emerald Expanse, Azkol’s Bane?, Archmont? |
| Howling Desert | The Emerald Expanse, Mountains of the Watchers, The Cloister, Azkol’s Bane, Irontops; across S–W river → Idran Forest, Lonelight Hills |
| Mountains of the Watchers | Howling Desert, The Emerald Expanse?; across W river → Lost Lands, Idran Forest; across E river → Outer Kinghills |
| The Emerald Expanse | Howling Desert, Bone Hills, Azkol’s Bane, Mountains of the Watchers? |
| Azkol’s Bane | The Emerald Expanse, Bone Hills, Archmont, The Cloister, Howling Desert |
| Archmont | Bone Hills?, Azkol’s Bane, The Cloister, Sands of Madness |
| Sands of Madness | Archmont, Little Sister, Middle Sister, The Throne, The Cloister; across E river → Big Sister |
| The Cloister | Howling Desert, Azkol’s Bane, Archmont, Irontops, The Throne, Sands of Madness |
| Irontops | The Cloister, The Throne, Howling Desert; across W river → Lonelight Hills, The Grass Sea; **tower** |
| The Throne | Irontops, Sands of Madness, The Cloister; across E river → Big Sister, Forest of Shades; **tower** |

---

### W — Zenon (15)

| ID | Printed name | Terrain | Building | Notes |
|---|---|---|---|---|
| `W-lost-lands` | Lost Lands | Desert | — | Touches S–W river near Mountains of the Watchers |
| `W-plains-of-woldra` | Plains of Woldra | Grasslands | — | |
| `W-anza` | Anza | Grasslands | Village | Near W letter / Great Woods |
| `W-yellowpike` | Yellowpike | Forest | — | Under **The Great Woods** region label |
| `W-akartus` | Akartus | Forest | Sanctuary | Under The Great Woods |
| `W-delmsmire` | Delmsmire | Forest | — | Spelling confirmed (Bob, 2026-10-23) |
| `W-plains-of-plovo` | Plains of Plovo | Grasslands | Bazaar | |
| `W-idran-forest` | Idran Forest | Forest | — | |
| `W-weeping-waters` | Weeping Waters | Lake | — | |
| `W-lonelight-hills` | Lonelight Hills | Hills | — | Near N–W river |
| `W-the-empty-glade` | The Empty Glade | Grasslands | — | |
| `W-cloudhold` | Cloudhold | Mountains | — | |
| `W-hissing-groves` | Hissing Groves | Forest | Citadel | Rulebook example |
| `W-the-grass-sea` | The Grass Sea | Grasslands | — | Tower-adjacent |
| `W-ash-hills` | Ash Hills | Hills | — | Near Hissing Groves; rulebook quest example |

#### W adjacencies (best effort)

| Space | Adjacent |
|---|---|
| Lost Lands | Plains of Woldra, Idran Forest?; across S–W river → Mountains of the Watchers |
| Plains of Woldra | Lost Lands, Anza, Weeping Waters?, Idran Forest? |
| Anza | Plains of Woldra, Yellowpike, Akartus? |
| Yellowpike | Anza, Akartus, Weeping Waters, The Empty Glade |
| Akartus | Yellowpike, Delmsmire?, The Empty Glade?, Anza? |
| Delmsmire | Akartus?, Plains of Plovo, Cloudhold, The Empty Glade |
| Plains of Plovo | Delmsmire, Cloudhold?, Ash Hills? |
| Idran Forest | Lost Lands?, Plains of Woldra?, Weeping Waters, Lonelight Hills; across S–W river → Mountains of the Watchers, Howling Desert |
| Weeping Waters | Yellowpike?, Plains of Woldra?, Idran Forest, The Empty Glade, Lonelight Hills? |
| Lonelight Hills | Weeping Waters, Idran Forest, Hissing Groves, The Grass Sea; across S–W river → Howling Desert, Irontops; across N–W river → Broken Lands? |
| The Empty Glade | Yellowpike, Akartus?, Weeping Waters, Cloudhold, Hissing Groves, Ash Hills?, Delmsmire |
| Cloudhold | The Empty Glade, Delmsmire, Plains of Plovo?, Ash Hills? |
| Hissing Groves | Lonelight Hills, The Empty Glade, The Grass Sea, Ash Hills |
| The Grass Sea | Lonelight Hills, Hissing Groves; across river → Irontops; **tower** |
| Ash Hills | Hissing Groves, The Empty Glade?, Cloudhold?, Plains of Plovo?; across N–W river → Broken Lands? |

---

## Tower-adjacent spaces

Spaces that share a border with the central tower hole. Checked with Bob in session (2026-10-23):

| Kingdom | Spaces |
|---|---|
| N Arisilon | Tower Scar Desert |
| E Brynthia | Forest of Shades, Bleak Wastes |
| S Durnin | Irontops, The Throne |
| W Zenon | The Grass Sea |

Removed after the check: N Upper Ice Fangs, E Big Sister, W Hissing Groves (no border with the hole).

---

## River borders between kingdoms

Kingdoms are separated by thick blue river borders (not spaces). Crossing a river is one move to an adjacent space across the blue border. Draft contact pairs:

| Border | Example contact pairs (photo best effort) |
|---|---|
| **N–E** | Peaks of the Djinn ↔ Inner Kinghills? / Bleak Wastes?; Egan’s End / Rimeweald ↔ Three Rivers? |
| **E–S** | Outer Kinghills ↔ Mountains of the Watchers?; Big Sister ↔ Middle Sister; Big Sister ↔ The Throne, Sands of Madness; Forest of Shades ↔ The Throne |
| **S–W** | Mountains of the Watchers ↔ Lost Lands, Idran Forest; Howling Desert ↔ Idran Forest, Lonelight Hills; Irontops ↔ Lonelight Hills, The Grass Sea |
| **W–N** | Lonelight Hills / Ash Hills / The Grass Sea? ↔ Broken Lands |

Full river adjacency list: **incomplete**, to be finished in the workbench pass.

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
| Lake | 2 | 2 | 0 | 1 | **5** |
| Forest | 2 | 2 | 1 | 5 | **10** |
| Grasslands | 3 | 3 | 5 | 5 | **16** |
| **Total** | 15 | 15 | 15 | 15 | **60** |

Counts include the terrain changes made 2026-10-23 (N Fivepint to Lake, S Ulamel’s Hollow to Grasslands).

---

## Still open

| Item | Issue |
|---|---|
| Adjacency edges marked `?` | Still need the physical-board pass. One-sided pairs and the tower ring were checked 2026-10-23 |
| River contact pairs | Complete list still to do |

Resolved 2026-10-23 (Bob): N Fivepint spelling and terrain, N Dayside spelling, N Pearl of the North (no hyphens), S Ulamel’s Hollow terrain, S Azkol’s Bane terrain (Desert), W Delmsmire spelling, E Utar’s Barrows apostrophe, the five one-sided adjacency pairs, the tower ring, the Longwater label, Regal Run as a mountain range over S The Throne / S The Cloister / S Archmont, W Akartus under The Great Woods with the Sanctuary, and the removed crop references.

---

## Photo reading notes

- Buildings are banners **on** named spaces (`Howling Desert` + Citadel, `Southern Wastes` + Village, etc.), never separate space rows. All 16 building placements match the map.
- Tokens and foe cards on Bob’s photo were ignored for names/terrains.
- Cross-checked some names against the RtDT rulebook examples (Hissing Groves citadel, Ash Hills quest, Upper Ice Fangs / Inner Kinghills / Peaks of the Djinn move example, Forest of Shades / Bleak Wastes) and a public playthrough (Dayside Bazaar, Emerald Expanse, Three Rivers, Duwani, Egan’s End, etc.). Photo labels win when they conflict.
- DT81 notes (`research/dark-tower-1981/NOTES.md`) say every DT81 kingdom has the same spaces, with the buildings in the same places. The RtDT board does not: each kingdom has its own 15 spaces. The RtDT map follows the RtDT board.

---

## AI board reading (2026-10-27)

Bob passed on an AI reading of the board: a composite image of the whole board plus a transcription made from four photos. The AI's own notes say every direction, region extent and tower contact in it is provisional. This draft and the board map file take precedence. Where the AI disagrees with them, the difference is listed below for Bob's physical-board pass. The reading was not taken as fact.

**Files (copyrighted image, not in the repo).** These are in Bob's backup folder, under `return-to-dark-tower/`:

| Path in the backup folder | What |
|---|---|
| `photos/board-ai-composite-2026-10-27.webp` | The AI composite of the full board, N at the top. Most printed names on it are garbled, so it is good for layout only, not for spelling |
| `board-reading-2026-10-27/provisional_board_transcription.md` | Space by space: terrain, building, region, tower side, neighbours with directions |
| `board-reading-2026-10-27/provisional_board_spaces.csv` | The 60 spaces as a table |
| `board-reading-2026-10-27/provisional_board_neighbours.csv` | 283 neighbour rows, with a direction, an unsure flag and river notes |

**Board map file.** The reading was merged into `~/Desktop/board-map.json` (the copy from before the merge is `~/Desktop/board-map.before-ai-2026-10-27.json`). The 15 completed N spaces were not touched. Elsewhere, existing entries were kept, and the merge:

- added the 14 new pairs below and filled 188 open compass slots. Each slot was turned from the AI's board-north direction into the tool's frame, where each space's N points at the tower. Tested against Bob's own slots on the completed spaces, the conversion matched 47 of 71 exactly, put 22 one point off and put 2 further off. Treat every filled slot as a guess.
- noted on each pair whether the AI found it ("AI reading 2026-10-27 agrees" or "finds no border").
- put the tower on N for Forest of Shades, Bleak Wastes, Irontops, The Throne and The Grass Sea (the tower ring below).
- assigned regions: Delmsmire, Akartus and Yellowpike to The Great Woods; The Throne, The Cloister and Archmont to Regal Run.

### Matches this draft

- Terrain and buildings on all 60 spaces, including one Village, Bazaar, Sanctuary and Citadel per kingdom.
- Region extents: Longwater over Dayside and Fivepint, The Great Woods over Delmsmire, Akartus and Yellowpike, and Regal Run over The Throne, The Cloister and Archmont. The AI reads no other region label.
- 87 of the draft's pairs between spaces that are not completed.

### Differs: for Bob to check on the board

| Item | This draft | AI reading |
|---|---|---|
| Kingdom of Mountains of the Watchers | S Durnin | W Zenon (its river notes put the S–W river between it and Howling Desert / The Emerald Expanse) |
| Kingdom of Lonelight Hills | W Zenon | S Durnin (its river notes put the river between it and Idran Forest / Hissing Groves / The Grass Sea) |
| Tower ring | Tower Scar Desert, Forest of Shades, Bleak Wastes, Irontops, The Throne, The Grass Sea (checked 2026-10-23) | Also Upper Ice Fangs, Muted Forest, Big Sister, Lonelight Hills and Ash Hills. Bob removed Upper Ice Fangs and Big Sister on 2026-10-23 |
| Region name | Longwater here; `Long Water` in the board map file | LONGWATER |

**Name readings.** The draft's names win, and several were confirmed by Bob on 2026-10-23. The AI read these differently. None are confirmed:

| Draft | AI reading |
|---|---|
| Rimeweald | Rimewald |
| Peaks of the Djinn | Peak of Thz'din (AI unsure) |
| Duwani | Downm (AI unsure) |
| Forest of Shades | Forest of Shadows |
| Ulamel's Hollow | Ulmae's Hollow (AI unsure) |
| Plains of Plovo | Plains of Rovo (AI unsure) |
| Delmsmire (confirmed by Bob) | Dremsmire (AI unsure) |
| Akartus | Akarthus |
| Yellowpike | Yellowrike |
| Plains of Woldra | Plains of Wydra (AI unsure) |
| Idran Forest | Jidran Forest |

**Pairs the AI found that the draft lacked.** These are now in the board map file, marked unconfirmed. `~` means the AI was unsure: it may be a corner or a short border.

| Pair | Note |
|---|---|
| E Three Rivers – S Middle Sister | across river |
| E Three Rivers – S Pine Barrens | across river |
| E Lesser Tombstones – S Middle Sister | across river, ~ |
| E Forest of Shades – S Sands of Madness | across river, ~ |
| E Duwani – E Lesser Tombstones | |
| S Archmont – S Southern Wastes | |
| S Archmont – S Little Sister | |
| S Azkol's Bane – S Southern Wastes | |
| S Middle Sister – S Ulamel's Hollow | |
| S Mountains of the Watchers – W Lonelight Hills | ~ |
| W Anza – W Weeping Waters | |
| W Hissing Groves – W Weeping Waters | |
| W Cloudhold – W Hissing Groves | |
| W Ash Hills – W The Grass Sea | |
| N Greenbridge – N Pearl of the North | Not added: both spaces are completed |

**Draft pairs the AI did not find.** These are kept, and the ones on open spaces are noted "finds no border" in the file:

- Open spaces: E Lake of Songs – E Utar's Barrows; E Outer Kinghills – S Mountains of the Watchers (the composite puts these on opposite sides of the board); S Archmont – S Bone Hills; S Howling Desert – W Idran Forest; S Howling Desert – W Lonelight Hills; S Little Sister – S Pine Barrens; S Middle Sister – S Sands of Madness; S Pine Barrens – S Southern Wastes; W Akartus – W Anza; W Ash Hills – W Plains of Plovo; W Ash Hills – W The Empty Glade; W Idran Forest – W Lost Lands; W Lonelight Hills – W Weeping Waters.
- Completed spaces (not changed): N Peaks of the Djinn – E Bleak Wastes; N Broken Lands – W Ash Hills; N Broken Lands – W Lonelight Hills; N Fivepint – N Lodestone Mountains; N Fivepint – N Radiant Mountains; N Lodestone Mountains – N Pearl of the North; N Lower Ice Fangs – N Pearl of the North; N Tower Scar Desert – W The Grass Sea; N Tower Scar Desert – W Ash Hills.

**River contacts.** The AI lists 25 pairs that cross a river. These are its candidates, and none has been checked on the board. The AI asserts no bridges.

| Border | Pairs (`~` = unsure) |
|---|---|
| N–E | Egan's End – Outer Kinghills; Rimeweald – Outer Kinghills ~; Rimeweald – Inner Kinghills; Peaks of the Djinn – Inner Kinghills ~; Peaks of the Djinn – Dragontooth Lake; Upper Ice Fangs – Bleak Wastes; Tower Scar Desert – Bleak Wastes |
| N–W | Muted Forest – Ash Hills; Broken Lands – Cloudhold; Lodestone Mountains – Plains of Plovo; Broken Lands – Plains of Plovo ~ |
| E–S | Three Rivers – Pine Barrens; Three Rivers – Middle Sister; Lesser Tombstones – Middle Sister ~; Big Sister – Middle Sister; Big Sister – Sands of Madness; Big Sister – The Throne ~; Forest of Shades – Sands of Madness ~; Forest of Shades – The Throne |
| S–W | The Emerald Expanse – Mountains of the Watchers; Howling Desert – Mountains of the Watchers; Lonelight Hills – Idran Forest; Lonelight Hills – Hissing Groves; Lonelight Hills – The Grass Sea; Irontops – The Grass Sea ~ |

---

## Board map file, complete (2026-10-27)

On 2026-10-27 Bob finished the board map entry tool pass and marked all 60 spaces complete. A snapshot of the tool's file (`~/Desktop/board-map.json`) is saved here as [board-map-2026-10-27.json](board-map-2026-10-27.json). For neighbours, compass slots, the tower ring and regions, it replaces the adjacency tables above. Spaces, names, terrain and buildings still come from the tables above, through the tool's `apps/board-map-tool/src/spaces.json`. The file sets no terrain or building of its own.

**Format.** The file holds one edge per pair of spaces, keyed `a|b`. Each side has its own compass slot or `null` (the list under the cross), plus a free-text note. The cross is **tower-relative**: N on every space points at the tower, so a slot is not a board direction. `objects` puts the tower on N for the tower-ring spaces. `regionOf` maps a space to a `REG-` region.

### Review

| Check | Result |
|---|---|
| Spaces complete | 60 of 60 |
| Tool checks | No slot used twice, no unknown entries. The only errors are the 52 spaces with no region |
| Pairs | 165, of which 34 cross a kingdom border. Each space has 3 to 8 neighbours, and every space can reach every other |
| Slots placed | 295 of 330 sides. Fifteen pairs have no slot on either side and 5 have one side only, so 35 sides sit in the list under the cross |
| Tower ring | Tower Scar Desert, Forest of Shades, Bleak Wastes, Irontops, The Throne, The Grass Sea (as checked 2026-10-23) |
| Regions | Longwater (Dayside, Fivepint), The Great Woods (Delmsmire, Akartus, Yellowpike), Regal Run (The Throne, The Cloister, Archmont). The file spells the first one `Long Water` |
| After the AI merge | Bob added 3 pairs that neither the draft nor the AI had: S Mountains of the Watchers – W Plains of Woldra, S The Emerald Expanse – W Lost Lands, W Anza – W Idran Forest. He removed none. He moved the slots on 83 of the 162 pairs already there, so the AI's slot guesses were reworked before the spaces were completed. He also kept all 13 draft pairs the AI did not find, which overrules the AI reading on those |

**Still open in the data.**

- **Regions for 52 spaces.** DEC-242 says every space is in exactly one region, but only 8 spaces have one. Either more regions are needed, or the rule changes so a space may have no region.
- **Stale notes.** 52 notes still say "unconfirmed" or quote the AI reading, although every space is now complete. Clear them, or treat them as history, before the game shows notes.
- **No river field.** Which pairs cross a river is only in the free-text notes and the AI list above. If the game needs rivers, they need a field.
- **Unplaced sides.** The 35 sides in the list under the cross are valid (DEC-235). The game fills each one into the first open slot clockwise from N (`slottedNeighborsOf`).
- **Non-opposite sides.** On 6 pairs the two sides are not opposite points (for example Dragontooth Lake SW / The Decaying Wilds N). In a tower-relative cross that can be right, but Bob should confirm it.

### How the game gets the board

The game does **not** read this file yet. It reads the **old draft**, `packs/base/board/spaces.json`, in two ways:

| Path | Code | When it reads |
|---|---|---|
| Base pack (`base_pack: base`) | `apps/bloodtower/src/engine/loops/session/playContent.ts` imports `packs/base/board/spaces.json` as a JSON module | At build: the board is compiled into the bundle, so in effect it is hard-coded until the next build |
| Any other base pack | `apps/bloodtower/src/server/core/loadStories.ts` (`playContentFor`) reads `<packs>/<base_pack>/board/spaces.json` | At server start. If the read fails, the `catch` returns `null` without logging, which breaks the never-hide-errors rule |
| Pack checks | `apps/bloodtower/src/server/pack/v2/load.ts` loads the same file into the pack's `board`, and `protocols/pack-v2/base.ts` validates it | At pack load |

The old file differs from the finished map:

- It has 73 adjacency pairs (`adjacent` lists) against the map's 165.
- It has no compass slots. The schema accepts a `neighbours: [{to, slot}]` list, and the game's `buildBoardGraph` / `slottedNeighborsOf` already prefer it, but no space in the file has one.
- It lists 9 tower-adjacent spaces, against 6 in the map.
- It has 2 river crossings and no regions.
- It uses the ID `N-fivepoint`, while the map uses `N-fivepint` (the spelling Bob confirmed).
- Terrain and building values are lowercase (`grasslands`, `village`).

**To deliver it.** DEC-240 says the tool writes its JSON into the base pack, which the game reads at build. That needs one step that does not exist yet: turn the tool's edges into `packs/base/board/spaces.json`. That means, for each space, a `neighbours` list with slots, `tower_adjacent` from the tower objects, regions as `region_labels`, and terrain and building from the tool's spaces. Then rebuild. The base pack path imports the file, so a change takes a rebuild to show. Fixing the silent `catch` in `playContentFor` belongs in the same change.
