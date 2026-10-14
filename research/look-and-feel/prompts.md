# Stitch prompts

The exact prompts behind the screens in [README.md](README.md). A round 1 prompt is three parts joined in this order: **screen content**, then **one visual direction**, then **one device layout**. To try a new look, write a new visual direction and keep the other two parts. To mock a new screen, write new screen content and keep the chosen look.

Round 1 command, run from the repo root (`content.txt`, `look<N>.txt` and `<DEVICE>.txt` hold the blocks below):

```sh
stitch generate screen --project 13867893521233499523 \
  --prompt "$(cat content.txt look<N>.txt <DEVICE>.txt)" \
  --device <DESKTOP|MOBILE> --json   # the iPad layout runs as DESKTOP
```

## Screen content: main play screen, Part 1 Chapter 1

```text
Main play screen of a cooperative tabletop companion web app for a fantasy saga board game played around a physical electronic tower. Two players share a travelling party and use this screen at the table while moving miniatures on a real board. The app tracks all state and plays story scenes.

Screen content (use this exact content):
1. Header: saga title "The Gathering — Part I", chapter label "Chapter 1: The Inn at Harrowmere", and a save/menu button.
2. Shadow Clock: a prominent circular dial showing time passing, 7 of 12 segments filled, label "The shadow advances in 2 actions", with the next scripted beat "The Eye wakes" shown as a warning.
3. Realm map: a stylised map of one kingdom showing five building hubs as tappable markers — Village (party is here), Citadel (a cleric waits), Sanctuary (a ranger waits), Bazaar, Ruins (locked) — plus the dark Tower at the centre edge with an "Eye" indicator showing which kingdom is being watched.
4. Location panel for the current hub "Harrowmere Village" listing sub-locations as action cards, each with a time cost: "The Sleeping Stag Inn — Talk (1)", "Market Lane — Trade (1)", "Old Well — Explore (2)", "Rest by the fire (2)".
5. Party strip: four avatar cards — "Maelis, Wandering Wizard" (narrator, no stats), "Brannoch, Warrior" (Warriors 12, Spirit 4), and two empty silhouette slots labelled "Waits at the Citadel" and "Waits at the Sanctuary". Each hero card shows a portrait, class, and two small stats.
6. Company resources row: Warriors 12, Spirit 4, Gold 30, Provisions 6, Hope 8/10, Keys 0/4.
7. Narrator dialog box with portrait of the wizard: "You have dreamt of it too, haven't you? The tower stirs. We have little time." with a "Continue" button and a small audio/voice playing indicator.
```

## Visual directions

### Look 1: Illuminated Manuscript

```text
Visual direction — "Illuminated Manuscript": warm aged parchment backgrounds, hand-inked cartography for the map with sepia line work and watercolour washes, elegant old-style serif typography with decorative drop caps, gilded gold and deep oxblood red accents, ornamental borders and wax-seal style buttons. Feels like an ancient illustrated tome or a Tolkien-style map. Light theme.
```

### Look 2: Shadow and Ember

```text
Visual direction — "Shadow and Ember": cinematic dark fantasy. Near-black charcoal and obsidian backgrounds, glowing ember orange and molten red accents, subtle smoke and vignette, a menacing glowing Eye and shadow clock as the dominant visual element, map rendered as a dark moody landscape with glowing markers, tall condensed display typography with a sharp gothic feel, thin glowing borders. Dark theme, high drama, like a AAA dark fantasy game HUD.
```

### Look 3: Tabletop Companion

```text
Visual direction — "Tabletop Companion": clean, modern, highly legible board game companion app. Deep midnight navy surfaces with teal and soft gold accents, rounded cards, bold friendly sans-serif typography, flat iconography, large touch targets and big numbers readable at arm's length across a table, a simplified vector map with clear pin markers. Calm, uncluttered, modern dark UI in the style of a polished digital board game companion.
```

## Device layouts

### Desktop (`--device DESKTOP`)

```text
Target: desktop web, wide landscape layout (1440px). Map large in the centre, shadow clock and location panel in a right column, party strip and resources along the bottom, narrator dialog overlapping the lower map.
```

### iPad (`--device DESKTOP`; the CLI has no tablet type)

```text
Target: iPad tablet in landscape lying flat on a game table (1024x768), touch-first. Map on the left two thirds, shadow clock and location action cards in a right column, party strip and resources in a bottom bar, narrator dialog as a bottom sheet. Large touch targets.
```

### Phone (`--device MOBILE`)

```text
Target: phone, portrait, single column, one-handed. Compact header with a small shadow clock, map on the top third, a collapsible resources row, horizontally scrolling party avatars, location action cards stacked, narrator dialog as a bottom sheet, and a bottom tab bar: Map, Party, Journal, Tower.
```

## Round 2: touch-first edit

Applied with `stitch edit screen <ipad-screen-id> --project 13867893521233499523 --prompt "<below>" --json` to each round 1 iPad screen. Reuse it as the iPad layout block for new screens.

```text
Rework this screen as the primary interface: an iPad in landscape (1024x768) lying flat on a game table, used only by touch by two players reaching across the table. Keep the same visual style, colours, typography and content. Changes: (1) Every interactive element is at least 56px tall with at least 12px spacing between targets; the whole location action card is one large tappable button showing its time cost as a big badge, instead of a small button inside the card. (2) Map hub markers become large 72px touch markers with clear labels and generous spacing so fingers never overlap two markers. (3) Remove all hover-dependent, keyboard and mouse affordances: no keyboard shortcut hints, no tiny icon-only buttons, no zoom +/- controls (pinch to zoom instead), no dense top navigation; replace the top nav with a few large icon-plus-label tabs. (4) Body text at least 18px, key numbers (resources, shadow clock) at least 28px so they read at arm length. (5) Put the primary actions (Continue, location actions) along the right and bottom edges within easy thumb reach; the narrator dialog is a bottom sheet with a large full-height Continue button. (6) Party avatars become large tappable portrait tiles in a bottom bar; resources shown as large chips beside them. (7) Everything fits in one 1024x768 view with no page scrolling and no text truncation.
```
