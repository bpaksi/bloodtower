# Prototypes — plan

**Status:** draft for Bob, 2026-10-21. Waiting on Bob's intent (`intent/0001-prototypes.md`), the requirement review, and plan approval. Experiment tier: `adversary-bugs` reviews each PR, and `adversary-prd` does not run.

**Goal:** one page per prototype, each answering one design question, so that the answers go back into the cards before Bloodtower builds the real thing.

**Design inputs:** the cards in `research/game-design/cards/`, including DEC-077 to DEC-107 from the 2026-10-20 and 2026-10-21 sessions. The walk-through and its asset list are in `research/game-design/mockups/2026-10-21-setup-walkthrough/` (PR #149).

## Rules for every prototype

- **Where it runs:** a browser on the Mac, or the TV when the test is about the TV. Controls are on the same page. No iPad unless the step says so (Bob, 2026-10-21).
- **Seeded randomness:** every random draw comes from a seed shown on the page. "Same seed" replays a run exactly.
- **Tunable numbers:** a number the cards leave open is a slider or field in a tuning panel, with the value from the cards as its default. The panel's values can be copied out as JSON, so the chosen numbers can go back into a card.
- **Placeholder art:** a grey box labelled with the asset it stands for, unless the art already exists (packs/test, apps/bloodtower/public, docs/art-direction).
- **Errors** (CLAUDE.md, Errors): never eaten or hidden. A prototype has no Mac host, so step 0's logger writes to the console and to an in-page log panel that can be exported. Every logged error also shows as a toast, and an error from a press shows next to the control that was pressed.
- **The tower** (CLAUDE.md, Tower safety): only through tower-poc, one press per physical action, no automatic retry. Without tower-poc running, a prototype shows the tower as unavailable and plays a screen-and-sound stand-in.
- **What it found:** each prototype ends with `apps/prototypes/src/web/app/p/<name>/FINDINGS.md`. It records what worked, what didn't, the numbers chosen and the card IDs to update. Claude turns that into card updates on a game-design branch.

## Steps

### 0. Shell (`feat/prototypes-shell`)

- Depends on: none
- Touches: apps/prototypes/**, pnpm-lock.yaml, README.md
- Deps change: yes
- Runs: cloud
- Model: sonnet
- Done when:
  - A Next.js app in `apps/prototypes/src/web` uses the repo's existing pins (next 16.4.0, react 19.3.0). `pnpm --dir apps/prototypes dev` serves it on port 4777.
  - An index page lists every prototype by ID and name.
  - Shared parts that each prototype step uses, each with unit tests:
    - a seeded random generator, with `roll("1d6")`-style dice;
    - the tuning panel, with copy-as-JSON;
    - the placeholder box;
    - a 16:9 TV frame that scales type with the viewport (1080p up to 4K);
    - the logger, its in-page panel and the toast. A test proves an error thrown in a page and an unhandled rejection both reach the panel and the toast;
    - a tower client for tower-poc's `/ws`: connect on a press, send a command, report each command's outcome. It is tested against tower-poc's mock tower.
  - `pnpm check` passes, with the app in it.

### P-01 Story board layouts (`feat/prototypes-board`)

- Depends on: 0
- Touches: apps/prototypes/src/web/app/p/board/**
- Runs: cloud
- Model: sonnet
- Question: are the board's panels readable from the couch on the Samsung at 1080p, and do they scale to 4K?
- Done when:
  - Full-screen layouts of the Story board (SCR-013, SCR-014) cover: the waiting dialog (UI-015), the prompt band (UI-014), now acting (UI-011), the hero roll (UI-012), party items (UI-013), the summary (UI-009) and the join QR (UI-010). A switcher moves between layouts.
  - The six pool heroes are placeholders with DEC-100 roles and DEC-101 attributes.
  - Every line meets a minimum type size at 1080p (the size is in the tuning panel). Screenshots at 1920×1080 and 3840×2160 go in FINDINGS.md.
  - Bob views it on the TV. His notes go in FINDINGS.md.

### P-08 A day's turn loop (`feat/prototypes-turn`)

- Depends on: 0
- Touches: apps/prototypes/src/web/app/p/turn/**
- Runs: cloud
- Model: sonnet
- Question: does a turn feel right, and is there enough to do with the moves a group rolls?
- Done when:
  - One or two groups play the four beats of DEC-077 on a simple made-up board (spaces, one village, one sanctuary, wild spaces):
    1. Roll moves (DEC-102: dice, +1 per helping virtue, −1 per corruption, floor).
    2. A story-beat placeholder.
    3. Each group spends moves: 1 a space, 1 a building action (DEC-078).
    4. Events where each group stopped.
  - The roll, each modifier and the total are shown (DEC-102).
  - The tuning panel holds the dice, the floor, the virtue and corruption counts, and the building menu.
  - A turn log shows each group's moves spent and left.
  - FINDINGS.md proposes numbers for Q-043.

### P-02 Tomb: the dungeon crawl (`feat/prototypes-tomb`)

- Depends on: 0
- Touches: apps/prototypes/src/web/app/p/tomb/**
- Runs: cloud
- Model: sonnet
- Question: does "deeper or leave" make a tense scene in about 5–10 minutes?
- Done when:
  - Played as a scene (DEC-084), with no world time passing. Rooms are revealed one at a time, and each costs hit points, money or corruption (DEC-039 replaces warriors and spirit).
  - Cleared rooms stay cleared, the target room finishes the tomb, and the party may leave at any room (MEC-026).
  - A held Undead Advantage softens one room.
  - Room flavour comes from RtDT's 12 tomb rooms (research/return-to-dark-tower/). Room costs and the party's hit points are in the tuning panel.
  - A run summary shows the rooms entered, the cost and the time taken.

### P-03 Cave: the hunt (`feat/prototypes-cave`)

- Depends on: 0
- Touches: apps/prototypes/src/web/app/p/cave/**
- Runs: cloud
- Model: sonnet
- Question: is reading signs to pick a passage fun, and is the light meter fair?
- Done when:
  - Played as a scene (DEC-084), following MEC-027:
    - branching tunnels, where each round the party picks a passage from its signs (tracks, bones, a sound);
    - a wrong turn costs light;
    - when the light runs out, the beast ambushes;
    - finding the lair first gives a surprise round;
    - a Beast Advantage reads one sign for sure.
  - The ambush and the lair end in a placeholder fight using the party's Might (DEC-101). Fights themselves are not designed here.
  - The sign "a sound from the tower" plays a stand-in sound in the browser.
  - The tunnel shape, the light and the chance a sign is true are in the tuning panel.

### P-04 Encampment: trade, and the camp turning on you (`feat/prototypes-camp`)

- Depends on: 0
- Touches: apps/prototypes/src/web/app/p/camp/**
- Runs: cloud
- Model: sonnet
- Question: does the camp's temper make haggling a real choice?
- Done when:
  - Played as a scene (DEC-084), following MEC-028:
    - a merchant's trade where haggling hard, refusing an offer or stealing raises the camp's temper, shown on the board;
    - at full temper the camp attacks (a placeholder fight);
    - a Humanoid Advantage calms the camp once.
  - Prices, the haggle die (DEC-091) and the temper steps are in the tuning panel.

### P-05 Fortress: the duel ladder (`feat/prototypes-fortress`)

- Depends on: 0
- Touches: apps/prototypes/src/web/app/p/fortress/**
- Runs: cloud
- Model: sonnet
- Question: how many rungs, and how steep, before the ladder feels like a grind?
- Done when:
  - Played as a scene (DEC-084) across visits, following MEC-029:
    - champions one by one, each stronger, using the party's Might (DEC-101);
    - losing a duel sends the party one rung down for its next visit;
    - beating the top champion finishes the fortress;
    - a Melee Advantage softens one duel.
  - "Next visit" is a button, since there is no turn loop here.
  - The rungs, the champions' strength and the duel draw are in the tuning panel. A run of many simulated visits shows how many visits a party of each Might takes.

## Later batches (not in this plan yet)

- **P-06 Ruins** (MEC-030, the riddle answered on the drums) and **P-07 Shrine** (MEC-031, the glyph puzzle). Both need the real tower and drum sync, so they wait for tower-poc M6 (at least its 6.0 chunk A).
- A fight prototype (MEC-024, Q-023), if P-03 to P-05's placeholder fights show it is needed.

## Batches

| Batch | Steps | Merge order |
|---|---|---|
| 0 | 0 | 0 |
| 1 | P-01, P-08, P-02, P-03, P-04, P-05 (separate folders, so they run in parallel) | P-01, P-08, P-02, P-03, P-04, P-05 |

## Open questions for Bob

1. Should the prototypes' log go only to the console and an in-page panel that can be exported, since there is no Mac host? Recommended: yes. Decision 0003's Mac-host log is Bloodtower's.
2. P-01 is the one TV test. Should the other prototypes be viewed on the Mac only? Recommended: yes, and on the TV only when a finding needs it.
