# Setup wizard and end-of-game summary

Status: draft for Bob's review, 2026-10-14. Design only. Builds on sessions.md (R-SES), landing-and-initial-screens.md (R-UI), requirements.md (R-DEV), and statistics.md (R-STA).

## Setup wizard (R-WIZ)
- R-WIZ-1. Starting a game opens a step-by-step wizard on the Dashboard: one step per screen, with Next/Back, a progress bar, and the story's theme and ambient loop. Players never need the rulebook to set up.
- R-WIZ-2. Each story declares a setup manifest: the DT assets it uses and how each one is placed. The wizard is generated from that manifest plus the game seed, so every story and every seed gets the correct setup automatically.
- R-WIZ-3. Asset use: a story need not use every DT asset, but it should use many. The manifest lists each asset group as used, optional, or unused (box away), and the content checker warns when a story uses fewer than a minimum set (proposed minimum: tower, board, all 4 kingdoms and their buildings, hero minis, skulls, seals). The wizard's first physical step tells players which components to leave in the box.
- R-WIZ-4. Every placement step shows an illustration or highlighted board diagram (which kingdom, which building, how many) and a one-line instruction, with an optional narrator line.
- R-WIZ-5. Steps follow a fixed order:
  1. Story, chapter/night, difficulty and game length together (Short, Standard or Long, defaulting to Standard), and seed (fortune card).
  2. Players join on their iPads and pick hunters (R-DEV-3); the Dashboard fills the roster.
  3. Components check: what you need and what stays in the box.
  4. Board: lay out the board and orient the kingdoms. Any random starting kingdom is revealed with a flourish.
  5. Tower initialization (see R-WIZ-9).
  6. Buildings and markers: the seed decides placements (e.g. fallen buildings, crypt markers), shown step by step.
  7. Minis: heroes to their start building; foes, adversary, and story figures (e.g. the two Striga brides) to their spots.
  8. Skulls and starting resources: starting warriors/spirit (base game rules) and any story tracks (corruption at 0, keys at 0).
  9. Decks and tokens: which RtDT decks to shuffle and where, plus any story tokens.
  10. Private handouts: each iPad shows its hunter's private intro and secret goal, if any.
  11. Final check: a summary of the whole board picture, then "Begin" plays the first tower cue and the opening scene.
- R-WIZ-6. Each physical step has a "Done" confirm. The wizard never assumes a step happened, and stats record setup time per step.
- R-WIZ-7. Resume reuses the wizard as a shorter "restore the board" checklist built from the save (R-SES), not a fresh setup.
- R-WIZ-9. Tower initialization is a full wizard stage run from the Mac (R-DEV-1, R-DEV-5). Each sub-step has its own status and a Retry:
  a. Place the tower in the board's center, with seals in and drums loose. Show an illustration.
  b. Power and Bluetooth: check that the Mac's Bluetooth is on and the tower is powered (batteries).
  c. Connect: the player presses Connect, and the Mac pairs with the tower and shows its name, plus battery and signal if the tower API reports them (to verify in api-surface-7.1.2.md).
  d. Calibrate: the player presses Calibrate (about 22 s). A looping "castle stirs" image under a fortune card covers the wait. No other tower commands are sent during calibration, because the tower drops them.
  e. Self-test: a short Verified light-and-sound check (one sound and one light effect). Players confirm "I saw and heard it". If they didn't, the wizard offers troubleshooting.
  f. Seals and drums: confirm the seals are in, and set the drums to the story's start position, shown with a picture.
  g. Skulls: load the starting skulls into the tower.
  h. Ready: the story's tower palette idle effect starts (e.g. the Count's heartbeat breathe).
  If the tower can't connect, players can choose "Play without the tower". Every cue then uses its screen fallback (R-ENG-12), and the Dashboard shows a reconnect button for the rest of the game.
  Stats record connect attempts, calibration time, the self-test result, and starting battery level (if available) (R-STA).
- R-WIZ-8. Fun: setup is part of the show. Each reveal (starting kingdom, the woman's location, the first fortune) gets a short stinger, so setup builds anticipation instead of feeling like admin.

## End-of-game summary (R-SUM)
- R-SUM-1. Every game end (win, loss, or abandoned/saved mid-way) shows a summary screen on the Dashboard, plus a personal summary on each iPad.
- R-SUM-2. The Dashboard summary has an outcome scene (victory or defeat clip and narration), then:
  - the result and how it was decided (e.g. "Dawn broke on night 5: the Count is destroyed", or "A third corruption claimed Wren")
  - a timeline of key moments by night/chapter: set pieces finished, keys earned, Count interventions, close calls
  - graphs over time: warriors, spirit, corruption, skulls on the board, the Eye's/Count's attention
  - party totals: battles won/lost, encounters, items used, buildings saved/fallen, gold, play time
  - a highlight reel of 3–5 auto-picked moments (biggest swing, closest call, best roll)
  - the seed and difficulty, so the game can be replayed
  - time (R-LEN-5): total time, active time (play time with pauses excluded), paused time, and time per phase (setup, each night/chapter and its dusk/day/dawn phases, set pieces, encounters, fights), with the chosen game length
- R-SUM-3. Each iPad's summary shows that hunter's personal stats, their private storyline outcome, whether their secret goal succeeded, and a story-flavored title (e.g. "the one who never flinched").
- R-SUM-4. Campaign games also show what carries over to the next part (R-SES) and a teaser for the next chapter.
- R-SUM-5. Optional quick feedback: a fun rating 1–5 per player and one note, saved with the game's stats (R-STA).
- R-SUM-6. Every summary number comes from the stored stats (R-STA). Nothing is computed only for display, so the summary can be reopened later from the Stats screen.
- R-SUM-7. A closing "box it up" step: a teardown checklist, plus putting the tower back to idle.

## Open questions
- Should the minimum asset set be firm (block the story) or a warning?
- Should the summary be shareable (export an image or PDF)?

## R-WIZ-10 QR join (Dashboard, anytime)
The Dashboard shows a QR join screen so each iPad can connect without typing a code.
- The QR encodes the session join URL (or a short join code plus host). Scanning it opens the hunter join flow on that iPad.
- It appears as a step in the setup wizard, after hunters join is offered and before the tower is woken.
- After setup, any player can bring it back from the Dashboard at any time (e.g. a "Join iPad" control on D2–D10), including mid-game when a player re-joins (R-DEV-4).
- The QR refreshes if the session token rotates. It never shows private hunter data.
- Fallback: a short numeric join code is shown under the QR for typing by hand.
- R-WIZ-12. Wizard step "Game length" (R-LEN-1): the host picks Short / Standard / Long (default Standard), next to difficulty in step 1. Each option shows what it means in story terms (e.g. number of nights) and an estimated play time once measured timing data exists (R-LEN-4); otherwise it shows "estimate pending". The choice is fixed for the game and logged.
- R-WIZ-11. Wizard step "Who holds whom": each joined device picks its hunter(s). Start is blocked until every hunter is held (R-DEV-9).
