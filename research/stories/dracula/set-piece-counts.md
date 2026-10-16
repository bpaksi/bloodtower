# Dracula: set pieces per game length (proposal)

Status: Loremaster proposal for Gamewright review and Bob's ruling, 2026-10-15. Answers the open item in D-DRA-13 and story-pack-format ruling 19 (set pieces per length, hunter-token pace, encounter frequency). Times stay `pending` until measured (R-LEN-4).

Sources: `research/game-design/story-pack-format.md` (3.2, rulings 7, 11), `story-engine.md` (E19h, E20i), `requirements.md` (R-LEN-1..5), `rulings.md` (D-DRA-1..4, D-DRA-12..14), `readiness-review.md`, `assets/stories/dracula/scripts/README.md` (play order) and `tokens-and-encounters.md`.

## What Gamewright defines
- Three lengths: **Short / Standard / Long**, default Standard, set in wizard step 1 (R-LEN-1, R-WIZ-12). Each pack must declare all three (3.2).
- Length sets nights, set pieces kept per night, hunter-token pace and encounter frequency (R-LEN-2, R-LEN-3, E19h).
- Crypt crawl (E20i, ruling 7): **Short 2, Standard 4, Long 6 rooms**, sealed door (target) included.
- The opening, every set piece the win needs, and the finale appear at every length (R-LEN-3, V-15).

## The conflict to rule first
D-DRA-13 (provisional) cuts nights: Short = 2 investigation nights + assault, Standard = 3 + assault. The story spine needs **4 investigation nights** at every length:
- Night 1: chapter 1 in one kingdom (D-DRA-1): the party meets, the reveal, the fortune that seeds the sites.
- Nights 2-4: three kingdoms, one accomplishment each (Blade, Holy Symbol, Tome), each earning a key (D-DRA-2); the Tome kingdom last (D-DRA-3).
- Funeral on night 2, crypt crawl under its church right after (D-DRA-14); earth boxes on night 4 (D-DRA-12).
- Night 5: the tower assault, all 3 keys (D-DRA-4).

Cutting a night breaks one of these rules (one kingdom per night, three keys, or the fixed funeral/earth-box nights). **Proposal:** keep all 5 nights at every length and make length scale *what happens inside each night*: optional set pieces, beats, encounters and crypt rooms. This needs Bob to revise D-DRA-13 (labels become "lean / full / complete" nights, not night counts). If Bob keeps D-DRA-13 as written, the least-bad fallback is to fold chapter 1 into a short prologue that is not a night (no dusk or midnight beat) for Short only; that still needs nights 2-4, so Short would be 4 nights, not 3.

## Set pieces by night
R = required at every length (spine). O = optional (cut at shorter lengths).

| Night / kingdom | Set piece | Why | Req |
|---|---|---|---|
| 1 / K1 | `n1-lantern-and-bell` | party meets, the riddle | R |
| 1 / K1 | `n1-burgomasters-house` | reveal: Lenka taken (D-DRA-10) | R |
| 1 / K1 | `n1-open-grave` | Oskar's map and warning; color | O |
| 1 / K1 (dawn) | `n1-fortune-reading` | seeds Blade, Holy Symbol, Tome sites and lair | R |
| 2 / fortune kingdom A | `n23-sergius-blade` or `n23-catacombs-of-saint-ysolde` (by fortune) | that kingdom's accomplishment and key | R |
| 2 / same kingdom | `n2-burgomasters-funeral` | fixed night-2 beat | R |
| 2 / under the church | crypt crawl (E20, `crypt-under-church`) | fixed after the funeral | R (rooms scale) |
| 3 / fortune kingdom B | the other `n23-*` | accomplishment and key | R |
| 3 / same kingdom | `n3-fly-eaters-cell` | Jakob's plan: where the boxes are | O |
| 4 / K4 | `n4-earth-boxes` | fixed night-4 beat | R |
| 4 / K4 | `n4-finding-the-tome` | Tome, last key, ends night 4 | R |
| 5 / tower | `n5-drawbridge` | entry, uses the 3 keys | R |
| 5 / tower | `n5-portrait-gallery` | color, a painting per hunter | O |
| 5 / tower | `n5-final-confrontation` + ending | finale, win condition | R |
| dusk 1-4 | `nx-pressed-flower` (beat) | nightly clue to Lenka | O per night |
| midnight 1-4 | `nx-midnight-procession` (beat) | ghost tie, Tome-order clue, holy water | O per night |

Without `n3-fly-eaters-cell`, the night-4 objective token still marks the box sites (D-DRA-12 places it at dusk), so the boxes stay findable. Without the gallery, the drawbridge flows straight into the confrontation.

## Counts per length

| | Short | Standard | Long |
|---|---|---|---|
| Label (proposed) | "5 lean nights" | "5 nights" | "5 nights, everything" |
| Night 1 set pieces | 3 (lantern, house, fortune) | 4 (+ open grave) | 4 |
| Night 2 | 2 + crypt (artifact A, funeral) | 2 + crypt | 2 + crypt |
| Night 3 | 1 (artifact B) | 2 (+ fly-eater) | 2 |
| Night 4 | 2 (boxes, Tome) | 2 | 2 |
| Night 5 | 2 (drawbridge, confrontation) | 3 (+ gallery) | 3 |
| Set pieces total (crypt not counted) | 10 | 13 | 13 |
| Optional set pieces kept | 0 of 3 | 3 of 3 | 3 of 3 |
| Crypt rooms (E20i, ruled) | 2 | 4 | 6 |
| Pressed flower (dusk) | nights 1, 4 | nights 1-4 | nights 1-4 |
| Midnight procession | night 1 only | nights 1, 3 | nights 1-4 |
| Hunter token `move_every` | 2 (every other round) | 1 | 1 |
| Hunter-token encounters per night (cap) | 1 | 2 | 3 |
| Expected encounters, nights 1-4 | about 2-4 | about 5-8 | about 8-12 |
| Lures (E19b) | 1 per night | as authored | as authored |
| `timing` | pending | pending | pending |

Notes:
- Short and Standard differ in optional set pieces, beats and encounter pace; Standard and Long differ only in crypt depth, beats on nights 2 and 4, and the encounter cap. That keeps one script set (no length-only story content).
- Encounter numbers assume E19e (at most one hunter-token encounter per round, in addition to the normal RtDT event). "Expected" is a guess for review, not a timing claim; real numbers come from PRD-41..43 logging.
- The procession is the only source of the Tome-order clue and its holy water. Short keeps it on night 1 so the clue exists at every length.
- The pressed flower is clue color, not needed to win (the lair is seeded by the fortune and confirmed at the Tome), so Short can drop it on nights 2-3.

## `by_length` sketch (pack.yaml)
```yaml
by_length:
  short:
    label: "5 lean nights"
    nights: [n1, n2, n3, n4, n5]
    set_pieces:
      n1: [n1-lantern-and-bell, n1-burgomasters-house, n1-fortune-reading]
      n2: [n23-artifact-a, n2-burgomasters-funeral]   # artifact by fortune
      n3: [n23-artifact-b]
      n4: [n4-earth-boxes, n4-finding-the-tome]
      n5: [n5-drawbridge, n5-final-confrontation]
    hunter_token: {move_every: 2, max_encounters_per_night: 1}
    encounter_frequency: low
    dungeons: {crypt-under-church: {rooms: 2}}
    timing: pending
  standard:
    label: "5 nights"
    nights: [n1, n2, n3, n4, n5]
    set_pieces:
      n1: [n1-lantern-and-bell, n1-burgomasters-house, n1-open-grave, n1-fortune-reading]
      n2: [n23-artifact-a, n2-burgomasters-funeral]
      n3: [n23-artifact-b, n3-fly-eaters-cell]
      n4: [n4-earth-boxes, n4-finding-the-tome]
      n5: [n5-drawbridge, n5-portrait-gallery, n5-final-confrontation]
    hunter_token: {move_every: 1, max_encounters_per_night: 2}
    encounter_frequency: normal
    dungeons: {crypt-under-church: {rooms: 4}}
    timing: pending
  long:
    label: "5 nights, everything"
    nights: [n1, n2, n3, n4, n5]
    set_pieces: {same as standard}
    hunter_token: {move_every: 1, max_encounters_per_night: 3}
    encounter_frequency: high
    dungeons: {crypt-under-church: {rooms: 6}}
    timing: pending
```
`n23-artifact-a/b` stands for the seeded pick of `n23-sergius-blade` / `n23-catacombs-of-saint-ysolde`; the format has no field for "one of these by seed" in `by_length` yet (Gamewright).

## Open items
1. Bob: revise D-DRA-13 (all lengths 5 nights) or pick the prologue fallback.
2. Loremaster still owes the sixth crypt room (D-DRA-14 lists 5); Long cannot be dealt until it exists.
3. Gamewright: `encounter_frequency` values (low/normal/high are placeholders for R-RE-8 rates), the per-visit crypt room cap, and whether pressed-flower/procession beats are declared per length in `by_length` (no field today).
4. Night 4 earth boxes stay 3 at every length (D-DRA-12); a Short-only 2-box option is possible but would need a ruling.
