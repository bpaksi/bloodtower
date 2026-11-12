# Catch-up: 1.0 gap triage, 2026-11-12

Gamewright, 2026-11-12. Design only. Rule and record: [DEC-901](cards/DEC-901.md). Source: `pnpm graph gaps` on `main` at dc36df3, which listed **84 gaps for 1.0** (and 19 for 1.2). Each is sorted into **needed for 1.0** (with the build that delivers it), **move to 1.1**, or **close / drop**. DEC-696 makes the 1.0 list the to-do list, and G-1.0 needs it empty (`1.0-milestones.md`).

## Counts

| Sort | Count | What |
|---|---|---|
| Needed for 1.0 | 31 | 28 decided mechanics (12 gameplay and engine, 16 pack toolkit tools) and 3 decided rulings with no deliverable |
| Move to 1.1 | 16 | 15 toolkit tools DEC-502 holds for 1.1, and MEC-016 (glyph boosts, DEC-597) |
| Close / drop | 37 | 15 parked mechanics, 3 questions answered, 19 tower catalogue areas settled |
| **Total** | **84** | the 59 mechanics, 19 areas, 3 questions and 3 rulings of the 1.0 list |

Only 5 of the 84 sit in a C3 to C5 `Builds:` line (MEC-024, MEC-026, MEC-075, MEC-076, MEC-080). MEC-018 is in C2's, and MEC-041, MEC-053 and MEC-054 are in C1's. The rest had no home; the Build column below gives each one.

## What changed in the cards

- **Needed for 1.0, mechanics:** a screen, UI or cue card now `needs` the mechanic, so the surface the gap tool wants is the one the player sees. Most toolkit tools are pack fields, built in C3-03 and checked by pack lint (DEC-697); their surface is where the result shows.
- **Move to 1.1:** the card gains `release: "1.1"`. Four decided rulings that only those cards reached moved with them, because DEC-502 puts their features in 1.1: DEC-598 (glyph boost by kingdom), DEC-087 (leads), DEC-070 (companions) and DEC-076 (traitors).
- **Rulings with no deliverable:** a mechanic or screen now `uses` or `needs` the ruling.
- **Areas and questions:** DEC-900 settles the 19 tower areas; DEC-898 answers Q-451; DEC-899 answers Q-452 and Q-453.

## Result

After these changes `pnpm graph gaps` reports **15 gaps for 1.0**, all of them the parked mechanics, plus 15 for 1.2 (down from 19; DEC-778 and DEC-780's clash links are settled, and the 1.2 rest is Dracula's). No 1.1 gaps appear.

## Tool fix (a code change, not made here)

The "mechanic with no screen" rule in `packages/workbench/src/gaps.ts` does not skip parked cards, though the conflict rule and the reach rule do. Adding `c.status !== "parked"` to the mechanic rule closes the last 15 and makes G-1.0's "no 1.0 gap" reachable. For Wright, as a one-line change with a test.

## The table

### Needed for 1.0 (31)

| ID | Card | Ruling | Build | How it closes |
|---|---|---|---|---|
| MEC-003 | Scene presence: only the heroes present take part | needed for 1.0 | C3-07, C3-12/14 | UI-011 needs MEC-003. Engine built in C3-07 (#386); the scenes show who is present. |
| MEC-005 | An event is a seeded, weighted draw from the story's tables | needed for 1.0 | C3-05, C3-12 | UI-041 needs MEC-005. Engine built in C3-05 (#382); the event scene shows the draw. |
| MEC-013 | Instant-loss guard: no single random effect can lose the game | needed for 1.0 | C3-08, C3-11 | UI-022 needs MEC-013. Engine guard in C3-08; the day's effects panel shows a redirected effect. |
| MEC-080 | Heroes: class, intrinsic virtues, the virtue pool, hit points and corruption | needed for 1.0 | C3-08, C3-11 | UI-030 needs MEC-080. Hero corruption in C3-08; the hero panel shows it. |
| MEC-018 | Players confirm what the tower can't sense, at setup, resume and chapter ends | needed for 1.0 | C2-11, C2-12 | SCR-011 needs MEC-018. Setup and Continue piece checks (C2-11 waits on Bob's tower run). |
| MEC-019 | A location offers a menu: Reinforce, sub-locations, NPCs, and a quest marker when marked | needed for 1.0 | C3-13 | UI-043 needs MEC-019. The building menu. |
| MEC-024 | A battle: horn, rounds of Fight or Retreat with one action per hero, then reward, retre... | needed for 1.0 | C4-02, C4-09, C4-10 | UI-027 needs MEC-024. Battle loop and the round picker; also names DEC-801. |
| MEC-026 | Tomb (Undead): a branching room map, each room nothing, a battle or a trap, until the h... | needed for 1.0 | C4-06, C4-12 | UI-025 needs MEC-026. Tomb crawl and its screens. |
| MEC-075 | The rest pick: the tavern trades moves for hit points | needed for 1.0 | C3-06, C3-13 | UI-043 needs MEC-075. The rest pick sits in the building menu. |
| MEC-076 | The Tower encounter loop: the finale at the Tower, around the boss battle | needed for 1.0 | C5-01, C5-07 | UI-025 needs MEC-076. Tower loop and its screens. |
| MEC-040 | Tool: opening narration | needed for 1.0 | C3-03, C3-12 | UI-042 needs MEC-040. Pack field (the start moment); pack lint checks it. |
| MEC-041 | Tool: chapters | needed for 1.0 | C3-01, C3-15 | UI-020 needs MEC-041. Pack field; the chapter card shows it. |
| MEC-042 | Tool: quests | needed for 1.0 | C3-07, C3-14 | UI-025 needs MEC-042. Pack field; the quest track shows it. |
| MEC-043 | Tool: steps inside a quest | needed for 1.0 | C3-07, C3-14 | UI-042 needs MEC-043. Pack field; the quest scene plays the steps. |
| MEC-044 | Tool: chapter and quest narration | needed for 1.0 | C3-14, C3-15 | UI-042 needs MEC-044. Pack field; the quest scene and chapter card. |
| MEC-045 | Tool: trigger beats | needed for 1.0 | C3-07, C3-12 | UI-041 needs MEC-045. Pack field; the event scene plays the beat. |
| MEC-046 | Tool: win and loss scenes | needed for 1.0 | C3-10, C3-16 | UI-046 needs MEC-046. Pack field; the win and loss scenes. |
| MEC-050 | Tool: the adversary | needed for 1.0 | C5-02, C5-08 | UI-026 needs MEC-050. 1.0's adversary is The Warden, shown on the foe panel (DEC-502). |
| MEC-053 | Tool: hero start | needed for 1.0 | C3-03 | SCR-011 needs MEC-053. Pack field; heroes start on the setup step. |
| MEC-054 | Tool: chapter bounds | needed for 1.0 | C3-03, C3-09 | UI-023 needs MEC-054. Pack field; the move map shows what is in reach. |
| MEC-055 | Tool: quest markers | needed for 1.0 | C3-07, C3-13 | UI-024 needs MEC-055. Pack field; the place menu lists the marker first. |
| MEC-061 | Tool: story items | needed for 1.0 | C3-07 | UI-013 needs MEC-061. Pack field; the party items panel shows the items. |
| MEC-063 | Tool: quest rewards | needed for 1.0 | C3-07 | UI-036 needs MEC-063. Pack field; the Reveal shows the reward. |
| MEC-064 | Tool: nuggets | needed for 1.0 | C3-06, C3-13 | UI-043 needs MEC-064. Pack field; the tavern's rumours are in the building menu. |
| MEC-065 | Tool: mood lines | needed for 1.0 | C3-05, C3-12 | UI-041 needs MEC-065. Pack field; the quiet-event line. |
| MEC-066 | Tool: scene pictures | needed for 1.0 | C3-12, C3-14, C3-16 | UI-003 needs MEC-066. Pack field; the Painting shows the picture. |
| MEC-078 | Content manifests: the base game's board, kingdoms, regions and entries as data a story... | needed for 1.0 | C3-01 | SCR-022 needs MEC-078. Content manifests, loaded by pack v2 (C3-01, built #373). |
| MEC-079 | Engine slots: the hooks and settings the engine declares, filled by the base, a story a... | needed for 1.0 | C3-01 | SCR-014 needs MEC-079. Engine slots, filled by pack v2 (C3-01, built #373). |
| DEC-718 | Suspicious and Weak wait for 1.1 with potions and treasures; the 1.0 corruption deck ha... | needed for 1.0 | C3-08, C4-05 | MEC-080 uses it. The 10-card deck: C3 draws nine, C4-05 adds Cursed. |
| DEC-809 | The Story board follows W6-step-1: no roster on /board, and the band and waiting line h... | needed for 1.0 | C3-11 (built W6) | SCR-013 needs it. Story board: no roster on /board; band and waiting line hide on the place layer. |
| DEC-801 | Lightning and Fireball each cut a foe by a flat 4, once a battle; Fireball no longer ha... | needed for 1.0 | C4-02, C4-10 | MEC-024 uses it. Lightning and Fireball cut a flat 4. |

### Move to 1.1 (16)

| ID | Card | Ruling | Build | How it closes |
|---|---|---|---|---|
| MEC-016 | An uncovered glyph changes the rules in the kingdom it faces | move to 1.1 | 1.1 (DEC-810 drafts) | `release: "1.1"` added; UI-056 needs it. Glyph boosts are 1.1 (DEC-597, DEC-598). |
| MEC-047 | Tool: building NPCs | move to 1.1 | 1.1 (DEC-810 drafts) | `release: "1.1"` added; UI-063 needs it. Building NPCs wait for 1.1 (DEC-502). |
| MEC-048 | Tool: named NPCs | move to 1.1 | 1.1 (DEC-810 drafts) | `release: "1.1"` added; UI-063 needs it. Named NPCs wait for 1.1 (DEC-502). |
| MEC-049 | Tool: companions | move to 1.1 | 1.1 (DEC-810 drafts) | `release: "1.1"` added; UI-048 needs it. Companions wait for 1.1 (DEC-502). |
| MEC-051 | Tool: lieutenants | move to 1.1 | 1.1 (DEC-810 drafts) | `release: "1.1"` added; UI-051 needs it. Lieutenants wait for 1.1 (DEC-502). |
| MEC-052 | Tool: traitor tricks | move to 1.1 | 1.1 (DEC-810 drafts) | `release: "1.1"` added; UI-050 needs it. Traitor tricks wait for 1.1 (DEC-502). |
| MEC-056 | Tool: leads | move to 1.1 | 1.1 (DEC-810 drafts) | `release: "1.1"` added; UI-055 needs it. Leads wait for 1.1 (DEC-502). |
| MEC-057 | Tool: adversary quests | move to 1.1 | 1.1 (DEC-810 drafts) | `release: "1.1"` added; UI-055 needs it. Adversary quests wait for 1.1 (DEC-502). |
| MEC-058 | Tool: foe reskins | move to 1.1 | 1.1 (DEC-810 drafts) | `release: "1.1"` added; UI-026 needs it. Foe reskins wait for 1.1 (DEC-502). |
| MEC-059 | Tool: corruption names | move to 1.1 | 1.1 (DEC-810 drafts) | `release: "1.1"` added; UI-030 needs it. Corruption renames wait for 1.1 (DEC-502). |
| MEC-060 | Tool: wild event names | move to 1.1 | 1.1 (DEC-810 drafts) | `release: "1.1"` added; UI-041 needs it. Event renames wait for 1.1 (DEC-502). |
| MEC-062 | Tool: clues | move to 1.1 | 1.1 (DEC-810 drafts) | `release: "1.1"` added; UI-052 needs it. Clues wait for 1.1 (DEC-502). |
| MEC-067 | Tool: avatars | move to 1.1 | 1.1 (DEC-810 drafts) | `release: "1.1"` added; UI-002 needs it. Talking avatars wait for asset-studio 0.3 and 1.1 (DEC-843); 1.0 has no Portrait (C5-05). |
| MEC-068 | Tool: tower cues | move to 1.1 | 1.1 (DEC-810 drafts) | `release: "1.1"` added; CUE-014 needs it. 1.0 uses default tower cues only (DEC-055, DEC-502); story-owned cues are 1.1. |
| MEC-069 | Tool: place paintings | move to 1.1 | 1.1 (DEC-810 drafts) | `release: "1.1"` added; UI-043 needs it. Place paintings are engine defaults in 1.0 (DEC-502). |
| MEC-070 | Tool: music | move to 1.1 | 1.1 (DEC-810 drafts) | `release: "1.1"` added; CUE-016 needs it. Music waits for 1.1 (DEC-502). |

### Close / drop (37)

| ID | Card | Ruling | Build | How it closes |
|---|---|---|---|---|
| Q-452 | How do the 79 tower sounds with no timed length get one? | close | - | Answered by DEC-899 (status answered). |
| Q-453 | Should the workbench /sounds page filter by the AI listen's tone, now that picks use it? | close | - | Answered by DEC-899 (status answered). |
| Q-451 | How does 1.0's Story board play a Painting's named camera move before asset-studio's <P... | close | - | Answered by DEC-898 (status answered). |
| MEC-002 | Base RtDT move: up to your move value, doubled for 1 spirit | close (drop) | - | Parked (retired); nothing to build. The gaps tool counts parked mechanics; see "Tool fix". |
| MEC-004 | Arriving at a site triggers what is there | close (drop) | - | Parked (retired); nothing to build. The gaps tool counts parked mechanics; see "Tool fix". |
| MEC-001 | Hunter token chases the nearest hero | close (drop) | - | Parked (retired); nothing to build. The gaps tool counts parked mechanics; see "Tool fix". |
| MEC-006 | Every encounter offers 2-3 choices with different costs | close (drop) | - | Parked (retired); nothing to build. The gaps tool counts parked mechanics; see "Tool fix". |
| MEC-008 | A chapter is ordered phases; a phase ends after N actions or on an event | close (drop) | - | Parked (retired); nothing to build. The gaps tool counts parked mechanics; see "Tool fix". |
| MEC-009 | Kingdoms unlock in order; a chapter's quests earn its key | close (drop) | - | Parked (retired); nothing to build. The gaps tool counts parked mechanics; see "Tool fix". |
| MEC-011 | Quests: authored scenes on a trigger, played once | close (drop) | - | Parked (retired); nothing to build. The gaps tool counts parked mechanics; see "Tool fix". |
| MEC-012 | Finale escalation: unfinished business feeds the finale | close (drop) | - | Parked (retired); nothing to build. The gaps tool counts parked mechanics; see "Tool fix". |
| MEC-014 | A story pack switches engine systems on or off | close (drop) | - | Parked (retired); nothing to build. The gaps tool counts parked mechanics; see "Tool fix". |
| MEC-015 | Tower-state loop: skulls build pressure, seals break, glyphs carry the effect | close (drop) | - | Parked (retired); nothing to build. The gaps tool counts parked mechanics; see "Tool fix". |
| MEC-025 | Quest movement options: random building, random wild, kingdom rule, spaces to move | close (drop) | - | Parked (retired); nothing to build. The gaps tool counts parked mechanics; see "Tool fix". |
| MEC-020 | Citadel: seat of power where quests are given | close (drop) | - | Parked (retired); nothing to build. The gaps tool counts parked mechanics; see "Tool fix". |
| MEC-021 | Sanctuary: rest, cures and lore | close (drop) | - | Parked (retired); nothing to build. The gaps tool counts parked mechanics; see "Tool fix". |
| MEC-022 | Village: tavern (rest, rumours, side jobs) and merchant | close (drop) | - | Parked (retired); nothing to build. The gaps tool counts parked mechanics; see "Tool fix". |
| MEC-023 | Bazaar: rare goods, haggling and hired help | close (drop) | - | Parked (retired); nothing to build. The gaps tool counts parked mechanics; see "Tool fix". |
| AREA-022 | Tower sounds: Adversary | close | - | Catalogue of the tower's hardware; settled by DEC-900. |
| AREA-023 | Tower sounds: Ally | close | - | Catalogue of the tower's hardware; settled by DEC-900. |
| AREA-024 | Tower sounds: Battle | close | - | Catalogue of the tower's hardware; settled by DEC-900. |
| AREA-025 | Tower sounds: Classic | close | - | Catalogue of the tower's hardware; settled by DEC-900. |
| AREA-026 | Tower sounds: Dungeon | close | - | Catalogue of the tower's hardware; settled by DEC-900. |
| AREA-027 | Tower sounds: Foe | close | - | Catalogue of the tower's hardware; settled by DEC-900. |
| AREA-028 | Tower sounds: Spawn | close | - | Catalogue of the tower's hardware; settled by DEC-900. |
| AREA-029 | Tower sounds: Quest | close | - | Catalogue of the tower's hardware; settled by DEC-900. |
| AREA-030 | Tower sounds: Glyph | close | - | Catalogue of the tower's hardware; settled by DEC-900. |
| AREA-031 | Tower sounds: State | close | - | Catalogue of the tower's hardware; settled by DEC-900. |
| AREA-032 | Tower sounds: Seals | close | - | Catalogue of the tower's hardware; settled by DEC-900. |
| AREA-034 | Tower seals | close | - | Catalogue of the tower's hardware; settled by DEC-900. |
| AREA-035 | Tower lights | close | - | Catalogue of the tower's hardware; settled by DEC-900. |
| AREA-036 | Tower lights: doorways | close | - | Catalogue of the tower's hardware; settled by DEC-900. |
| AREA-037 | Tower lights: ledge | close | - | Catalogue of the tower's hardware; settled by DEC-900. |
| AREA-038 | Tower lights: base | close | - | Catalogue of the tower's hardware; settled by DEC-900. |
| AREA-039 | Light effects | close | - | Catalogue of the tower's hardware; settled by DEC-900. |
| AREA-040 | Light sequences | close | - | Catalogue of the tower's hardware; settled by DEC-900. |
| AREA-041 | Tower drums | close | - | Catalogue of the tower's hardware; settled by DEC-900. |
