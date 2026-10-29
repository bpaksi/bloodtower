# Return to Dark Tower: tower sound inventory

**History (DEC-610):** written before the design cards. Where it disagrees with a card, the card wins; known stale lines say "Superseded by". For the art and sound designer: these 113 sounds are **already on the tower**. Don't recreate them; reuse where listed.
Source: `ultimatedarktowerdata` 3.0.0 `TOWER_AUDIO_LIBRARY` (pinned for tower-poc), played by index with `sound.play` / `sound.play-stateful`. The M3 verify pass on 2026-10-15 recorded `sound.play` as a capability pass. It did not record that each of the 113 indexes was heard.

**Facts that apply to every sound**
- Played by number 1–113. Volume 0, 1, 2 audible; 3 is mute. Whether 0–2 differ in loudness is unknown.
- One-shot only: **no loop**, and the tower **does not report when a sound ends**.
- **Lengths are not in the data and were not measured.** Column left "?" pending a timing pass.
- Descriptions are inferred from names (the data has name and category only). Names are RtDT game content; many are tied to specific RtDT characters.
- Music and ambience come from the Mac (R-AV-7); tower sounds are stingers.
- A sound can ride on a light sequence in one packet (`lighting.sequence` + `soundIndex`) for tight sync.

## Adversary (8): voice/theme stingers of RtDT adversaries
| # | Name | Length |
|---|---|---|
| 1 | Ashstrider | ? |
| 2 | Bane of Omens | ? |
| 3 | Empress of Shades | ? |
| 4 | Gaze Eternal | ? |
| 5 | Gravemaw | ? |
| 6 | Isa the Exile | ? |
| 7 | Lingering Rot | ? |
| 8 | Utuk'Ku | ? |
Reuse: generally **avoid** for our story characters (they are recognisable RtDT villains). Possible: Lingering Rot (#7) or Empress of Shades (#3) as a generic "corruption/undead presence" sting after listening. **The Count needs a new sound.**

## Ally (10): RtDT ally stingers
| # | Name | Length |
|---|---|---|
| 9 | Gleb | ? |
| 10 | Grigor | ? |
| 11 | Hakan | ? |
| 12 | Letha | ? |
| 13 | Miras | ? |
| 14 | Nimet | ? |
| 15 | Tomas | ? |
| 16 | Vasa | ? |
| 17 | Yana | ? |
| 18 | Zaida | ? |
Reuse: an ally-joins sting. Note **Tomas (#15)** shares a name with the funeral's Tomas; check whether it fits or would confuse.

## Battle (23)
| # | Name | Description | Length |
|---|---|---|---|
| 19–23 | Apply Advantage 01–05 | escalating advantage stingers | ? |
| 24 | Max Advantages | cap reached | ? |
| 25 | No Advantages | none applied | ? |
| 26 | Adversary Escaped | foe gets away | ? |
| 27 | Battle Button | UI press | ? |
| 28–30 | Card Flip 01–03 | card flip | ? |
| 31–33 | Card Flip Paper 01–03 | paper card flip | ? |
| 34–36 | Card Select 01–03 | selection | ? |
| 37 | Battle Start | battle opens | ? |
| 38 | Battle Victory | battle won | ? |
| 39 | Button Hold Press Combo | UI | ? |
| 40 | Button Hold | UI | ? |
| 41 | Button Press | UI | ? |
Reuse: battle start/won (#37/#38), advantages (#19–25, E18), card flips for finding reveals/private picks (#28–36). Generic and story-neutral: **high reuse**.

## Classic (11): 1981 Dark Tower 8-bit sounds
| # | Name | Length |
|---|---|---|
| 42 | 8-bit Advantage | ? |
| 43 | 8-bit Attack Tower | ? |
| 44 | 8-bit Bazaar | ? |
| 45 | 8-bit Confirmation | ? |
| 46 | 8-bit Dragons | ? |
| 47 | 8-bit Quest Failed | ? |
| 48 | 8-bit Retreat | ? |
| 49 | 8-bit Start Month | ? |
| 50 | 8-bit Start Dungeon | ? |
| 51 | 8-bit Tower Lost | ? |
| 52 | 8-bit Unsure | ? |
Reuse: tonal mismatch for gothic horror; use only for nostalgia easter eggs (e.g. finale "keys" nod to 1981).

## Dungeon (12)
| # | Name | Length |
|---|---|---|
| 53 | Dungeon Advantage 01 | ? |
| 54 | Dungeon Advantage 02 | ? |
| 55 | Dungeon Button | ? |
| 56 | Dungeon Footsteps | ? |
| 57 | Dungeon Caves | ? |
| 58 | Dungeon Complete | ? |
| 59 | Dungeon Encampment | ? |
| 60 | Dungeon Escape | ? |
| 61 | Dungeon Fortress | ? |
| 62 | Dungeon Ruins | ? |
| 63 | Dungeon Shrine | ? |
| 64 | Dungeon Tomb | ? |
Reuse: **high**, for crypt/catacomb rooms (n23): Tomb, Shrine (chapel), Caves, Ruins; Footsteps for moving between rooms; Complete/Escape for room cleared / flight.

## Foe (15)
| # | Name | Length |
|---|---|---|
| 65 | Foe Event | ? |
| 66 | Foe Spawn | ? |
| 67 | Brigands | ? |
| 68 | Clan of Neuri | ? |
| 69 | Dragons | ? |
| 70 | Lemures | ? |
| 71 | Leveled Up | ? |
| 72 | Mormos | ? |
| 73 | Oreks | ? |
| 74 | Shadow Wolves | ? |
| 75 | Spine Fiends | ? |
| 76 | Striga | ? |
| 77 | Titans | ? |
| 78 | Frost Trolls | ? |
| 79 | Widowmade Spiders | ? |
Reuse: Foe Event/Spawn (#65/66) generic; **Shadow Wolves (#74)** for Dracula wolves; **Striga (#76)** (a folkloric vampire-witch) and **Lemures (#70)** (restless dead) for vampire/undead foes; Brigands (#67) for human foes; Widowmade Spiders (#79) for crypt vermin; Leveled Up (#71) for a foe strengthening.

## Spawn (8): adversary spawn stingers
| # | Name |
|---|---|
| 80 | Ashstrider Spawn |
| 81 | Bane of Omens Spawn |
| 82 | Empress of Shades Spawn |
| 83 | Gaze Eternal Spawn |
| 84 | Gravemaw Spawn |
| 85 | Isa the Exile Spawn |
| 86 | Lingering Rot Spawn |
| 87 | Utuk'Ku Spawn |
Reuse: low, tied to RtDT adversaries; maybe one for "minions arrive" after listening.

## Quest (2)
| # | Name | Reuse |
|---|---|---|
| 88 | Quest Complete | objective done, key earned, victory |
| 108 | Quest Failed | objective lost, defeat |

## Glyph (5)
| # | Name | Reuse |
|---|---|---|
| 89 | Tower All Glyphs | major revelation |
| 90 | Tower Angry 1 | dread approach T2 |
| 91 | Tower Angry 2 | |
| 92 | Tower Angry 3 | dread approach T3 |
| 93 | Tower Angry 4 | hunter strikes T3 |
Reuse: **high**: "the tower is angry" = generic menace, story-neutral.

## State (14) and Unlisted (1)
| # | Name | Reuse |
|---|---|---|
| 94 | Tower Connected | connect confirmation (setup only) |
| 95 | Game Start | campaign/night 1 start |
| 96 | Tower Gloat 1 | corruption rises |
| 97 | Tower Gloat 2 | Count's arrival |
| 98 | Tower Gloat 3 | max corruption / loss ending |
| 99 | Tower Glyph | small reveal |
| 100 | Tower Idle 1 | ambient accent |
| 101 | Tower Idle 2 | ambient accent |
| 102 | Tower Idle 3 | ambient accent |
| 103 | Tower Idle 4 | ambient accent |
| 104 | Tower Idle 5 | ambient accent (data category is **"Unlisted"**, not State) |
| 105 | Tower Disconnect | do not use in play (would mislead the host) |
| 106 | Month Ended | dawn / night end / bell-toll final |
| 107 | Month Started | night start |
| 113 | Tower Skull Dropped | skull drop; self-test step 3 |
Reuse: **highest**: Idle 1–5 are the E16 ambient accent pool; Gloats for villain beats.

## Seals (4)
| # | Name | Reuse |
|---|---|---|
| 109 | Rotate Exit | end of a mechanical/reveal sequence |
| 110 | Rotate Loop | mid-sequence grind (won't loop on the tower) |
| 111 | Rotate Start | build-up before a reveal |
| 112 | Tower Seal | seal-sequence cue (funeral risky pick) |

## What the tower does NOT have (commission these, Mac-side)
- Any **bell / funeral toll**, organ, choir, church sounds.
- Vampire / the Count voice or theme; bats; heartbeat (the funeral already has `sfx.heartbeat-fallback`).
- Wind, rain, thunder, doors creaking, wolf howl (Shadow Wolves #74 may cover part; listen first).
- Any looped ambience (the tower can't loop; all beds are Mac-side anyway).

## Counts check
Total 113. Adversary 8, Ally 10, Battle 23, Classic 11, Dungeon 12, Foe 15, Spawn 8, Quest 2, Glyph 5, State 14, Unlisted 1, Seals 4. Those parts sum to 113. State in the data is 14 and includes #113 Tower Skull Dropped; it does not include #104 Tower Idle 5 (category Unlisted). The final report's State count of 14 matches that category. Its examples also name Idle 1–5, which folds the Unlisted row into the examples.
