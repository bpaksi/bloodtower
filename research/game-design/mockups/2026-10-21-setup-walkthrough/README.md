# Setup walkthrough mockup (2026-10-21)

A thinking tool for the "setup through first turn" slice of the saga game (`apps/bloodtower`). It steps from launch to the first hero's first move. This is a design mockup, not an app; nothing here is built or imported by any app.

| File | What |
|---|---|
| `walkthrough.html` | 25 steps. Each shows the Story board (16:9, type scaled with the frame like the TV) beside an iPad (4:3, 64 pt buttons), with placeholder art labelled with the asset needed, the line, the tower cue and the card IDs. A red banner marks each gap. The side list shows every step with its gap count. |
| `move-roll.html` | Simulator for the move roll (DEC-102, Q-043): dice, floor, +1 per helping virtue, −1 per corruption, a target in spaces plus building actions. 10,000 seeded trials. Shows the distribution, the mean, the chance of ending on only the floor, the chance of at least 3 moves (walk 2 into a village plus 1 for the tavern, DEC-078), and the chance to reach the target in 1, 2 or 3 turns, with every preset compared. |
| `asset-needs.csv` | One row per placeholder in the walkthrough (68 rows): step, card IDs, kind, description, size or length, existing asset, status. |
| `walkthrough.png`, `move-roll.png` | Headless Chromium screenshots (1600×1000). |

## How to open

Open either HTML file in a browser (double-click, or `open walkthrough.html`). No build, no server, no network. In the walkthrough use Back and Next or the left and right arrow keys; each step has its own `#id` link.

## Sources and choices

- Cards from `research/game-design/cards/` on `main` at c240c90, plus DEC-098 to DEC-102, the DEC-001 and Q-002 update and the SCR-014 update from the design branch `chore/design-session-2026-10-21b` (green IDs on the page). Those rulings are not on `main` yet.
- Also used: `apps/bloodtower/README.md` and `spec.md` (what R1 builds), `r2-screen-flow.md`, `landing-and-initial-screens.md`, `setup-wizard-and-summary.md`, `playthrough-ui-notes-2026-10-17.md`, `modifier-effects.md`, `tower-sound-inventory.md`, `asset-catalog.md`, `docs/art-direction/`.
- The steps follow AREA-049's order: tower connect before pick story. The built POC does it the other way (gap on step 5).
- The tower steps (orient, glyphs, seals) sit inside setup, after the board is laid out, not right after calibrate as IDEA-025 and MEC-017 say, because the player needs the board to tap a kingdom (gap on step 14).
- Party join uses six placeholder heroes, Hero A to F, with the DEC-100 roles and DEC-101 lead attributes. iPad 1 holds A and B, iPad 2 holds C, so Group 1 is A, B and C.
- The landing painting stays behind every board screen (R3-UI-01). It is counted once, on step 1; later steps show it as the hatched background.
- Asset status: **have** means a file exists in the repo, or the tower already has the sound or light. For portraits, have means a stand-in (test-pack hunters, the Keeper), not final art. **can-make** means we can make it ourselves (code-drawn diagrams, text, text-to-speech). **missing** means it needs art, audio or a decision.
- In move-roll.html the reference preset "flat 3" is the base RtDT move value (MEC-002, parked). The number 3 is from memory of the hero boards and is not recorded in the repo.

## Steps

1. Landing: the painting every game starts on (0 gaps)
2. Sound dialog: music, ambient and voice levels (2 gaps)
3. Splash: sells the game while it loads (2 gaps)
4. Join: scan the QR, pick this device (0 gaps)
5. Tower connect: only on a press (1 gap)
6. Calibrate: the tower wakes (about 22 s) (1 gap)
7. Volume test: pick the tower volume by ear (0 gaps)
8. Pick story: each story is a door (0 gaps)
9. Game settings: length and difficulty (2 gaps)
10. Not playable (branch): a story listed but not ready (0 gaps)
11. Party join: every iPad in, heroes claimed from the pool (2 gaps)
12. Setup 1: what you need, what stays in the box (1 gap)
13. Setup 2: lay out the board (0 gaps)
14. Setup 3: orient the tower (light a side, tap its kingdom) (2 gaps)
15. Setup 4: turn the drums to the start and check each glyph (2 gaps)
16. Setup 5: seals in, skulls loaded (2 gaps)
17. Setup 6: hero figures to the start (1 gap)
18. Setup 7: the starting purse (1 gap)
19. Setup 8: decks and tokens (1 gap)
20. Final check: confirm what the tower cannot sense (1 gap)
21. Begin: the table is set (1 gap)
22. Opening: the story speaks (1 gap)
23. Turn 1, beat 1: roll each group's moves (2 gaps)
24. Turn 1, beat 3: Group 1 spends its moves (Play screen) (2 gaps)
25. First move: tap the new space, arrive at a site (3 gaps)

## Gaps (30)

Kinds: **open** = an open Q- or a proposed card, **disagree** = two sources say different things, **missing** = no card covers something the screen needs.
Counts: 9 open, 9 disagree, 12 missing.

| # | Step | Kind | IDs | What is missing or undecided |
|---|---|---|---|---|
| 02 | Sound dialog | disagree | SCR-013, SCR-003 | SCR-013 says the board is display only and every press comes from an iPad; SCR-003 is pressed on the Mac (sliders, test clips, Continue). R3-UI-03 explains why (the click unlocks browser audio) but SCR-013 does not name the exception. |
| 02 | Sound dialog | missing | AREA-049, SCR-003, SCR-004 | AREA-049's order (splash, tower connect, …) leaves out the sound dialog. SCR-002 puts it right after the landing click, so before Splash; no card says so. |
| 03 | Splash | missing | SCR-004, R-UI-1 | SCR-004 has no content of its own. The cold open (title, logo forming, 'tower awakens' stinger, landing-and-initial-screens flow 1) and the fortune card (R-UI-10) have no SCR-/UI- card. |
| 03 | Splash | open | landing-and-initial-screens.md | Open question with no card: what the engine is called on the title and cold open. |
| 05 | Tower connect | disagree | AREA-049, SCR-005, spec D30 | AREA-049 and SCR-005 put Tower connect right after Splash, before Pick story. The built POC (apps/bloodtower/spec.md D30, README) runs Pick story → Game settings → Tower connect, because the pack's tower field (required / optional / none) decides whether connect is shown. This walkthrough follows AREA-049; pick one before Friday. |
| 06 | Calibrate | missing | R-WIZ-9, AREA-056 | R-WIZ-9e (a light-and-sound self-test with 'I saw and heard it') has no card, and AREA-056 does not list it. The volume test may stand in for it; no card says so. |
| 09 | Game settings | disagree | DEC-059, DEC-050, spec D29, packs/test/pack.yaml | DEC-059 says players pick easy, normal or hard and the engine applies it the same in every story, and DEC-050 makes length engine-wide. The POC builds this screen from the pack's own settings list (spec D29), and packs/test offers difficulty 'Standard' only. Who owns these options, engine or pack? |
| 09 | Game settings | missing | DEC-059, R-WIZ-5 | What each difficulty changes (event odds, horde sizes, starting purse, villain pace) has no numbers yet, and the seed / fortune card from R-WIZ-5 step 1 has no card. |
| 11 | Party join | open | Q-030, DEC-100, DEC-101 | Still open under Q-030: the six heroes' names, their Might / Stealth / Magic / Wits values and their innate abilities. The roles (DEC-100) and attributes (DEC-101) are settled; placeholders Hero A–F carry them. |
| 11 | Party join | missing | DEC-098, R2-30, R2-31, packs/test/pack.yaml | With a pool, nothing says when Next is allowed. R2-30 ('until every hunter is held') and R2-31 ('Take all') assume the story's fixed roster. How many heroes must or may be claimed (pack players.min/max is 1–4; the pool has 6)? And how does a story's 'suggested' hero (DEC-098) show? |
| 12 | Setup 1 | missing | SCR-011, R-WIZ-5, packs/test/pack.yaml | No card says which setup steps the engine adds and which come from the story. The POC makes one step per pack setup entry (spec D31: three in packs/test); R-WIZ-5 lists eleven, including components, tower, skulls and starting resources. This walkthrough shows the engine steps it thinks Friday needs. |
| 14 | Setup 3 | disagree | IDEA-025, MEC-017, SCR-005, SCR-011, R-WIZ-5 | IDEA-025 and MEC-017 put orientation right after calibrate (in Tower connect), but the player needs the board laid out to tap a kingdom, and that is a setup step after Party join (SCR-011; R-WIZ-5 puts the board, step 4, before the tower, step 5). This walkthrough moves it here, after the board. |
| 14 | Setup 3 | open | MEC-017, IDEA-025 | MEC-017 is proposed and IDEA-025 open. Which doorway lights mark a side (one light, a ring, a colour?) is not named. |
| 15 | Setup 4 | open | Q-033 | Q-033 open: does calibration put each glyph where the library says? If yes this is a yes/no check per drum; if no, the player names the glyph at each lit spot. Needs a hardware test. |
| 15 | Setup 4 | disagree | MEC-017, Q-033 | MEC-017 lists the seals to remove after the glyph check, but Q-033 notes seals still in place may hide the glyphs. Which comes first? |
| 16 | Setup 5 | open | Q-032 | Q-032 open: Bob decides on the seals after the 'how often does a skull stay trapped with all seals out' test. Until then, which seals go in at the start is unknown. |
| 16 | Setup 5 | missing | R-WIZ-9, DEC-064 | How many skulls start in the tower or on buildings has no card (R-WIZ-9g only says 'load the starting skulls'). |
| 17 | Setup 6 | missing | DEC-031, DEC-035 | No card says where the heroes start (a story's start building? the engine's?) or that heroes who start together form one group (DEC-031 only says heroes on a space can travel as a group). The iPad map (DEC-035) needs a known start space. |
| 18 | Setup 7 | open | Q-022, IDEA-010 | Q-022 open: which game of chance sets the purse (haggle die OPT-006, tower fortune wheel OPT-007, chests OPT-008), its range and floor, and whether length or player count scales it. Shown here with OPT-007 as an example only. |
| 19 | Setup 8 | disagree | DEC-067, Q-034, packs/test/pack.yaml | packs/test has a 'Shuffle the decks and set the tokens beside the board' step, but DEC-067 has the app deal every card and Q-034 (parked) says design as if the hand is digital. Is there a physical deck step at all? |
| 20 | Final check | open | MEC-018 | MEC-018 is proposed. It says each tracked state shows as unconfirmed until confirmed 'with a picture', but not whether that is one checklist here or a confirm inside each step, and the pictures do not exist. |
| 21 | Begin | missing | SCR-012, R-WIZ-5, R-WIZ-9 | R-WIZ-5 step 11 says Begin plays the first tower cue, and R-WIZ-9h starts the story's idle light effect. No card names either (SND-095 'Game Start' is the inventory's candidate). |
| 22 | Opening | open | DEC-077 | DEC-077 is proposed, and its beat 2 (the story beat) is 'still to be worked out'. Is the opening scene turn 1's story beat, or its own scene before turn 1? No card. |
| 23 | Turn 1, beat 1 | disagree | R2-60, AREA-062, DEC-064 | R2-60 has the board show 'Night N of 5' at all times; AREA-062 and DEC-064 make one turn one day. What does the board count? |
| 23 | Turn 1, beat 1 | missing | DEC-102, DEC-077 | Nothing says whether the tower takes part in the roll (a light chase, a sound), or whether the table presses 'Roll' (the app rolls, so no press is needed). |
| 24 | Turn 1, beat 3 | disagree | UI-019, UI-011, DEC-031 | UI-019 (whose-turn banner, designed not built) and UI-011 (now acting) name the hero who acts; DEC-031 has groups act. Banner per group or per hero? And there is no screen to split off or join a group. |
| 24 | Turn 1, beat 3 | missing | DEC-035, Q-024 | DEC-035 needs an iPad map of the board's spaces with this turn's reach shown. No card for the map screen, and no card for the board's spaces and adjacency data. |
| 25 | First move | disagree | MEC-004, IDEA-028, DEC-080 | MEC-004 ('moving onto a site starts its set piece, encounter, shop') and IDEA-028 ('if the move is onto an encounter, resolve it') resolve on arrival; DEC-080 says nothing interrupts a group's loop and events come at the end of the turn. For a building the menu opens (MEC-019); for a set piece or a wild space mid-loop, what happens now? |
| 25 | First move | open | MEC-019 | MEC-019 (the location menu: base action, sub-locations, NPCs, story point) is proposed; each pick costs 1 move (DEC-078). |
| 25 | First move | missing | SCR-013, DEC-035 | No card says whether the Story board shows the map or the group's new position at all. |

## Asset counts by kind and status

| Kind | have | can-make | missing | total |
|---|---|---|---|---|
| still | 6 | 7 | 12 | 25 |
| portrait | 8 | 0 | 2 | 10 |
| music | 3 | 0 | 1 | 4 |
| ambience | 3 | 0 | 2 | 5 |
| sfx | 0 | 0 | 4 | 4 |
| tower-sound | 3 | 0 | 0 | 3 |
| tower-light | 3 | 1 | 0 | 4 |
| narration | 1 | 2 | 0 | 3 |
| dialog | 0 | 1 | 0 | 1 |
| ui-text | 1 | 6 | 2 | 9 |
| **all** | 28 | 17 | 23 | 68 |
