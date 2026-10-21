# Prototypes — plan

**Status:** approved by Bob (G-plan), 2026-10-21, after the requirement review the same day. Experiment tier: `adversary-bugs` reviews each PR, and `adversary-prd` does not run. Build on a `main` that has the error rule (PR #151) and the 2026-10-21 design session merged.

**Goal:** one page per prototype, each answering one design question, so that the answers go back into the cards before Bloodtower builds the real thing.

**Design inputs:** the cards in `research/game-design/cards/`, including DEC-077 to DEC-107 from the 2026-10-20 and 2026-10-21 sessions. The walk-through and its asset list are in `research/game-design/mockups/2026-10-21-setup-walkthrough/` (PR #149).

## Rules for every prototype

- **Where it runs:** a browser on the Mac, or the TV when the test is about the TV. Controls are on the same page. No iPad unless the step says so (Bob, 2026-10-21).
- **Viewports:** Mac browser at 1440×900 only. P-01 also runs at 1920×1080 and 3840×2160.
- **Not required, unless a step says so:** phones, iPads, touch, accessibility audits, saving between sessions, e2e tests, and final art.
- **Seeded randomness:** every random draw comes from a seed shown on the page. "Same seed" replays a run exactly.
- **Tunable numbers:**
  - Every number a prototype has to invent goes in a tuning panel, because the cards give each set piece's shape but not its numbers. Where a card gives a value, that value is the default.
  - The panel's values can be copied out as JSON.
  - Each prototype's FINDINGS.md records the values it ended with.
- **Simulation:** each set-piece prototype can also run many seeded runs at once and report its numbers. This is the measurable side of the step's question. Bob's play-through is the other side.
- **Placeholder art:** a grey box labelled with the asset it stands for, unless the art already exists (packs/test, apps/bloodtower/public, docs/art-direction).
- **Errors** (CLAUDE.md, Errors): never eaten or hidden. A prototype has no Mac host, so step 0a's logger writes to the console and to an in-page log panel that can be exported. Every logged error also shows as a toast, and an error from a press shows next to the control that was pressed. An outcome the code expects and recovers from is not an error.
- **The tower** (CLAUDE.md, Tower safety): only through tower-poc, one press per physical action, no automatic retry. Without tower-poc running, a prototype shows the tower as unavailable (never zero) and plays a screen-and-sound stand-in.
- **What it found:**
  - Each prototype ends with `apps/prototypes/src/web/app/p/<name>/FINDINGS.md`. It records what worked, what didn't, the numbers chosen, the simulation results and the card IDs to update.
  - It counts as final only after Bob's play-through (Bob, 2026-10-21: every prototype in batch 1).
  - Claude turns it into card updates on a game-design branch.

## Steps

### 0a. Shell (`feat/prototypes-shell`)

- Depends on: none
- Touches: apps/prototypes/**, pnpm-lock.yaml, README.md
- Deps change: yes
- Runs: cloud
- Model: sonnet
- Done when:
  - A Next.js app in `apps/prototypes/src/web` uses the repo's existing pins (next 16.4.0, react 19.3.0). `pnpm --dir apps/prototypes dev` serves it on port 4777, which no app or default worktree uses.
  - `pnpm check` runs the app's typecheck and unit tests. If the root check does not pick them up on its own, 0a wires them in.
  - An index page lists every prototype by ID and name.
  - Shared parts that each prototype step uses, each with unit tests:
    - a seeded random generator, with `roll("1d6")`-style dice;
    - the tuning panel, with copy-as-JSON;
    - a batch runner that plays N seeded runs and returns their results;
    - the placeholder box;
    - a 16:9 TV frame that scales type with the viewport (1080p up to 4K);
    - the logger, its in-page panel and the toast. A test proves an error thrown in a page and an unhandled rejection both reach the panel and the toast.

### 0b. Tower client (`feat/prototypes-tower-client`)

- Depends on: 0a
- Touches: apps/prototypes/src/web/lib/tower/**
- Deps change: no
- Runs: cloud
- Model: sonnet
- Done when:
  - A small local copy of the tower-poc message types the client needs, each `command{capabilityId, params}`, so no message carries raw bytes. Bob ruled a copy rather than a move to `packages/` (2026-10-21).
  - **Drift test:** a unit test reads `apps/tower-poc/src/protocols` as text from disk, without importing it (apps never import from another app), and fails if any copied message type, field or capability id differs.
  - **Client:** connects to tower-poc's `/ws` on a press, sends a command, and reports each command's outcome. A command with no answer is an error, shown with its code. Nothing reconnects or retries on its own.
  - Tested against tower-poc's mock tower.
  - No batch-1 prototype needs this. It is for P-06 and P-07.

### P-01 Story board layouts (`feat/prototypes-board`)

- Depends on: 0a
- Touches: apps/prototypes/src/web/app/p/board/**
- Runs: cloud
- Model: sonnet
- Question: are the board's panels readable from the couch on the Samsung at 1080p, and do they scale to 4K?
- Done when:
  - Full-screen layouts of the Story board (SCR-013, SCR-014) cover: the waiting dialog (UI-015), the prompt band (UI-014), now acting (UI-011), the hero roll (UI-012), party items (UI-013), the summary (UI-009) and the join QR (UI-010). A switcher moves between layouts.
  - The six pool heroes are placeholders with DEC-100 roles and DEC-101 attributes.
  - No text is smaller than 28 px at 1920×1080 (56 px at 3840×2160). A unit test checks this against the computed sizes. The minimum is in the tuning panel.
  - Screenshots at 1920×1080 and 3840×2160 go in FINDINGS.md.
  - **Gate:** Bob views it on the TV from the couch. His notes go in FINDINGS.md.

### P-08 A day's turn loop (`feat/prototypes-turn`)

- Depends on: 0a
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
  - **Simulation:** over 1,000 seeded turns, the share of turns where a group can reach the village and take at least one action, and the average number of moves left unused.
  - **Gate:** Bob plays at least three turns. FINDINGS.md proposes numbers for Q-043.

### P-02 Tomb: the dungeon crawl (`feat/prototypes-tomb`)

- Depends on: 0a
- Touches: apps/prototypes/src/web/app/p/tomb/**
- Runs: cloud
- Model: sonnet
- Question: does "deeper or leave" make a tense scene in about 5–10 minutes?
- Done when:
  - Played as a scene (DEC-084), with no world time passing. Rooms are revealed one at a time, and each costs hit points, money or corruption (DEC-039 replaces warriors and spirit).
  - Cleared rooms stay cleared, the target room finishes the tomb, and the party may leave at any room (MEC-026).
  - A held Undead Advantage softens one room.
  - Room flavour comes from RtDT's 12 tomb rooms (research/return-to-dark-tower/). Invented in the tuning panel: room costs, the party's hit points, how much "softens" takes off, and how deep the target room sits.
  - A run summary shows the rooms entered, the cost and the time taken.
  - **Simulation:** with a "leave when hit points are below X" policy, the share of runs that finish, leave or end at 0 hit points, and the rooms entered per run.
  - **Gate:** Bob plays it through, and records the time taken and whether it felt tense.

### P-03 Cave: the hunt (`feat/prototypes-cave`)

- Depends on: 0a
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
  - Invented in the tuning panel: the tunnel map, how signs point to passages, the light and the cost of a wrong turn, the chance a sign is true, and the surprise round's effect.
  - **Simulation:** the share of runs that find the lair against those ambushed, and the rounds taken, for a party that follows the signs and for one that guesses.
  - **Gate:** Bob plays it through.

### P-04 Encampment: trade, and the camp turning on you (`feat/prototypes-camp`)

- Depends on: 0a
- Touches: apps/prototypes/src/web/app/p/camp/**
- Runs: cloud
- Model: sonnet
- Question: does the camp's temper make haggling a real choice?
- Done when:
  - Played as a scene (DEC-084), following MEC-028:
    - a merchant's trade where haggling hard, refusing an offer or stealing raises the camp's temper, shown on the board;
    - at full temper the camp attacks (a placeholder fight);
    - a Humanoid Advantage calms the camp once.
  - The haggle die is rolled physically (DEC-091), so the page takes its result from an on-page entry, with a "roll for me" button as a stand-in.
  - Invented in the tuning panel: prices, the die's faces and effect, the temper steps, and what stealing and refusing add.
  - **Simulation:** for haggle-always, haggle-never and haggle-once policies, the money saved and the share of visits where the camp attacks.
  - **Gate:** Bob plays it through.

### P-05 Fortress: the duel ladder (`feat/prototypes-fortress`)

- Depends on: 0a
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
  - Invented in the tuning panel: the rungs, the champions' strength, how a duel is decided, and what "softens" does.
  - **Simulation:** the number of visits a party takes to top the ladder, for each party Might.
  - **Gate:** Bob plays it through.

## Later batches (not in this plan yet)

- **P-06 Ruins** (MEC-030, the riddle answered on the drums) and **P-07 Shrine** (MEC-031, the glyph puzzle). Both need the real tower, step 0b and drum sync, so they wait for tower-poc M6 (at least its 6.0 chunk A).
- A fight prototype (MEC-024, Q-023), if the placeholder fights in P-03 to P-05 show it is needed.

## Batches

| Batch | Steps | Merge order |
|---|---|---|
| 0 | 0a | 0a |
| 1 | P-01, P-08, P-02, P-03, P-04, P-05, 0b (separate folders, so they run in parallel) | P-01, P-08, P-02, P-03, P-04, P-05, 0b |

## Rulings (Bob, 2026-10-21)

- One Experiment app holds every prototype.
- Batch 1 is P-01, P-08, P-02, P-03, P-04 and P-05.
- Prototypes run on the Mac or the TV. iPads are used only when a test needs them, and the tower only when the prototype is about the tower.
- The tower client uses a local copy of the message types, with a drift test.
- Step 0 is split into 0a and 0b.
- Every batch-1 prototype gets Bob's play-through before its findings are final.
- Prototypes log to the console and an in-page panel that can be exported. Decision 0003's Mac-host log stays Bloodtower's.
- P-01 is tested on the TV. The other prototypes are viewed on the Mac, and on the TV only when a finding needs it.
