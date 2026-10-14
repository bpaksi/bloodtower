# research/look-and-feel

Visual direction for the game app, made for the **fellowship story** ([../stories/fellowship/](../stories/fellowship/README.md)); the shared mechanics are in [../game-design/core-mechanics.md](../game-design/core-mechanics.md). These are mockups made in Google Stitch to find a look; nothing here is decided and no code depends on it.

> **Note:** the screen content here (Part 1 Chapter 1, the wizard, the recruits, the keys) is fellowship-specific. The visual direction and layout lessons are meant for the whole app.

Started 13 October 2026.

## Files

| File | What's in it |
|---|---|
| [README.md](README.md) | Where things stand, what we learned, how to pick it back up |
| [prompts.md](prompts.md) | The exact Stitch prompts used, so a round can be rerun or extended |
| [screens/](screens/) | Screenshots of every generated screen, so the work can be reviewed without opening Stitch |

## Requirements so far

- The game runs on **desktop, iPad and phone**.
- **The iPad is the primary interface** (Bob, 13 Oct). Design touch-first for an iPad in landscape lying on the table, then adapt to desktop and phone.
- It is a table companion: two players share one party and move minis on the real board, while the app tracks state and plays scenes (see the brainstorm).

## Stitch project

- Project: **Dark Tower**, id `13867893521233499523`, https://stitch.google.com/projects/13867893521233499523
- It is the project bound in the repo's Stitch config (`stitch config list --json`). It has no design system or `DESIGN.md` yet.

## Round 1 (13 Oct): three looks at three sizes

Every screen shows the same moment: Part 1, Chapter 1, the party in the starting village. The screen carries the realm map with five building hubs and the Tower's Eye, the shadow clock (7 of 12), the village's four sub-location actions with time costs, a party strip (wizard, warrior, two waiting recruits), the company resources, and the wizard's opening line.

| Look | Feel | Desktop | iPad | Phone |
|---|---|---|---|---|
| 1. Illuminated Manuscript | Parchment, inked map, serif type, oxblood and gold, light theme | `d3f6804b189e43b09f99ec06134efc50` | `0cf0d54c4a5e4b3d843aa25b77816381` | `92e66a22852741c8847a7271e5ea7b3b` |
| 2. Shadow and Ember | Near-black, ember orange and red, the Eye and clock dominant, game HUD | `c65f1af8a3874632aa33c3f8b751dea0` | `56bc27bd301b4193a3b66b0866112155` | `c4a06625f71a406bad5c571cb1a6e6bf` |
| 3. Tabletop Companion | Modern navy with teal and gold, big numbers, calm and legible | `d71dcb20e2344ed8b63e1557392371f6` | `87a1eee4a93e463ca3f4714b0051edc4` | `d52e338b5ff546f2941c664d65a95865` |

Screenshots: `screens/v1-look<N>-<name>-<desktop|ipad|phone>.jpg`.

Round 1 led with the desktop layout. Its text, buttons and navigation were too small and dense for touch, which is what prompted the iPad-first requirement.

## Round 2 (13 Oct): touch-first iPad

Each round 1 iPad screen was edited with one shared "touch-first" prompt (see [prompts.md](prompts.md)): targets at least 56px, whole-card action buttons, 72px map markers, no hover, keyboard or zoom controls, text at least 18px, key numbers at least 28px, primary actions within thumb reach, and everything in one 1024×768 view.

| Look | Screen id | Result |
|---|---|---|
| 1. Illuminated Manuscript | `2315ff59f8d74a55b6ca224f35280155` | Big markers and cost badges work. The bottom bar overflows the right edge, cutting off Keys and the fourth party slot, and two action titles overflow their cards. |
| 2. Shadow and Ember | `e12f4642845842b6961789b6b095b6c3` | **Strongest so far.** Everything fits in one view, with large party and resource tiles along the bottom, chunky action cards with cost badges, and a "tap to travel, pinch to zoom" hint. |
| 3. Tabletop Companion | `609a194a2ec044a891d992913122010b` | Clean and readable, but the narrator line is truncated, the action cards are still small and the map has a lot of dead space. |

Screenshots: `screens/v2-look<N>-<name>-ipad-touch.jpg`.

Bob's verdict: "a good start". No look has been chosen yet.

## What we learned

### About the layout
- One layout works across all looks on the iPad: map on the left two thirds, the clock above the location actions on the right, the narrator as a bar above a bottom strip of party tiles and resource chips.
- On the phone, a single scrolling column works: compact clock in the header, map, resources, action cards, swipeable party, narrator card, and a bottom tab bar (Map, Party, Journal, Tower).
- The bottom strip is the tightest spot on the iPad. Four party tiles plus six resource chips only fit when the chips are compact (look 2). Keep an eye on it as resources grow.
- Making each whole action card the button, with the time cost as a big badge, reads much better for touch than a small button inside a card.

### About Stitch
- The CLI (v0.11.1) accepts only `DESKTOP` or `MOBILE` as the device. iPad screens are desktop-type screens, prompted for 1024×768 landscape.
- Stitch ignores `--title` and names screens itself, so track screens by id (the tables above), not by name.
- `stitch edit screen` makes a **new** screen with a new id rather than changing the original. The round 2 screens are new; the round 1 ones were left as they were.
- Stitch invents content and mechanics. Seen so far: "Chronicles of the Spire", "Kingdom of Valeroth", "Malice", "Doom Clock", "End Turn", "Turn 14", "Audit", P1/P2 turn indicators. Read the screens for layout and feel only, never as game design. Give exact content in the prompt ("use this exact content") to keep it close.
- Prompts work best in three parts: shared screen content, a visual-direction paragraph and a device-layout paragraph. That way one part can change while the others stay fixed (see [prompts.md](prompts.md)).
- Several generations can run in parallel. Each takes a minute or two.

## How to resume

```sh
# From the repo root; the project is already bound in the Stitch config
stitch status --flow=design --json
stitch find screens --project 13867893521233499523 --json
stitch get screen <screen-id> --project 13867893521233499523 --json   # imageUrl and htmlCode.downloadUrl
stitch url screen <screen-id> --project 13867893521233499523

# Rework a screen (makes a new screen)
stitch edit screen <screen-id> --project 13867893521233499523 --prompt "<change>" --json

# Explore variations of the chosen look
stitch generate variants --project 13867893521233499523 --screen <screen-id> \
  --count 3 --creative-range EXPLORE --aspects LAYOUT,COLOR_SCHEME --json
```

When a screen is added, add its id and a screenshot here so this file stays the record.

## Next steps

1. Bob picks a look, or a mix (for example look 2's layout with look 1's map art).
2. Fix the chosen iPad screen's remaining layout problems.
3. Write a `DESIGN.md` for it and upload it as the project's design system, so later screens stay consistent (`stitch upload design DESIGN.md`).
4. Derive the desktop and phone versions from the touch-first iPad layout, replacing the round 1 desktop-led ones.
5. Mock more screens as the game firms up: title or campaign start, the tavern scene and hero recruit intro (portrait, voiced line, stats), the tower waking, an encounter or check, the key riddle, the end-of-chapter quest scene.

## Open questions

- How much of the screen should the map take once the board is the real map? Should the app's map be a simplified locator instead?
- Light or dark? The table may be in a dim room, which favours looks 2 and 3; look 1 has the most character.
- Portrait art style for heroes and the wizard: painted (as Stitch drew them) or something cheaper to produce?
- How should the Tower's state (Eye, skulls, seals) appear: in the header, on the map, or on its own tab?
