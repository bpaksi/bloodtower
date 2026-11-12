# Paper playtest: v1, v1.1 and v1.2, join to the end of a session

Gamewright, 2026-11-12. Design only, no code and no runner. Asked by Bob through Warden: play the locked design on paper before the next build phase. Read from `main` at `dc36df3`. Design calls are mine (Bob's standing rule, relayed by Warden). Only a finding that reverses a Bob lock goes back to him, and none does outright. PT-01 and PT-24 need his one-line answer (see "Locks").

**How this differs from the probes.** P-001 to P-006 play one party through the rules with seeded dice. This walk plays three people through the *screens and the table*: who taps what, who moves which piece, who waits. It rolls no dice. A rules gap found here is a finding below; once merged, each call becomes a `DEC-` card in a follow-up docs PR.

**Limits.** No tower hardware, no stopwatch, no art. "Dead time" and "host load" are counted in prompts and physical tasks from the cards and screen specs, not in minutes (PT-10). The ids `PT-nn` here are this walk's, not the 2026-10-20 runbook's `PT-01` to `PT-26` in `apps/bloodtower/plans/playtest-1-runbook.md`.

## What belongs to which version

| Version | What the repo says | Cards |
|---|---|---|
| **v1.0** | One story, The Ruined Keep (pack id Proving Grounds): 3 chapters, 6 quests (Herald, Ambush, Barrow Tomb, Shrine, Lock, Last Stand), the Tower finale and its last choice. Short and Standard. 24 skulls, corruption (10-card deck), the 6 pool heroes with virtues, tavern/sanctuary/Cleanse. No gear, shops, NPCs, companions. No Goodbye screen. Tower optional | DEC-502, DEC-691, DEC-659 to DEC-667, DEC-656, DEC-718, DEC-628, AREA-097, AREA-100 |
| **v1.1** | The same pack grows to use every 1.0 and 1.1 feature: Standard 10 quests, Long 15 over 5 chapters, companions, lieutenants, a traitor with clues, the roaming Warden, bazaar/haggle/fence/curses, gear, potions, treasures, glyph boons and drums. The five non-Tomb dungeons play as Tombs. Caravans are out | DEC-787, DEC-788, DEC-790, DEC-792, DEC-820, DEC-777, AREA-116, AREA-119, UI-048 to UI-065; numbers in P-006 (AREA-120) |
| **v1.2** | Dracula (D-01 to D-06, `packs/dracula`, `playable: false`, Short and Standard only) and the five real dungeon types | DEC-812, DEC-739, DEC-866, DEC-769 to DEC-773, MEC-027 to MEC-031, DEC-880 to DEC-893 |

Notes on the brief's wording. DEC-155 ("no play without the tower") is **parked**; the live rules are DEC-275 (play without the tower is allowed) and DEC-301 (a tower lost mid-game pauses with Reconnect, Go on without, or Quit). I read "Session → Game → Group" as the three loops the weekend slice runs: session (MEC-039), game (MEC-032), group turn (MEC-035), on AREA-077's slice (start, move, enter every building, only action Leave, exit). `main`'s `packs/base/tuning.yaml` still carries the C3 build flags `c3_end_after_chapter_1: true` and `fight_enabled: false`; those are build-stage switches, not the design, and I played the design.

## Walkthroughs

### 1. First-time player (two heroes, Standard, no tower)

1. A friend hands over an iPad. Scans the QR (UI-010, SCR-015). The iPad says "Pick Hero A" and "N of N picked" (DEC-232). **Nothing says what Hero A does**: Look up is greyed before Begin and the pool card is not specified (PT-15). She taps the first one.
2. Pick story, Game settings (SCR-007, SCR-008, DEC-639). "Enable sound" on her iPad (C2 feature 05); the board's volume line mentions the tower, and there is none (PT-24).
3. Setup, one step at a time, then Begin (SCR-011, SCR-012). The opening plays on the board (DEC-626). Chapter card, auto-advance, goal "Finish it before the days run out" (UI-020).
4. Day 1 opens with "Stay together, or split up?" (DEC-640). She has not met the word *group* yet (PT-18). Day roll (UI-021).
5. Her turn. The friend moves the minis; she taps the space they stand on (DEC-035, UI-023). She taps the wrong neighbour: the move is spent and the Ambush trigger may fire (PT-19). She walks onto the village, "Enter" shows the place still on the board (DEC-220, DEC-201), the iPad lists picks, each with its move cost (UI-043). She leaves.
6. A battle: Fight or Retreat, then each hero's action, then one hero taps Strike (MEC-038, UI-027). A hero falls and "takes a corruption" (DEC-119). The edge band shows health and purse only (UI-028); **she cannot see that a third corruption ends the whole game** (PT-17).
7. Night: no tower, so the board says "A skull falls on <building>" (C2/08, Bob approved). The effects panel shows for 4 seconds (UI-022, PT-26). Days left sit on the band (DEC-686). The "?" button shows one line for the screen (C2/04). No first-time hints appear, though DEC-571 promised them (PT-16).
8. Chapter 1 is won. Close Scroll, stamped card, (tower: seal break) and the next chapter's tokens to place (MEC-033; PT-21).
9. She loses on skulls in chapter 3. Outcome Scroll, a 4-second summary line, then stats. "Best" reads blank or compares a 2-hero game with a solo one (PT-04). Session screen, Play again.

### 2. Experienced player (RtDT veteran, Long, tower, 4 heroes)

1. Reads the pool, picks by class. Wants to look up numbers; Look up holds "rules or a card" with no content spec (PT-13, PT-16).
2. Day 1: splits the party to take two quests a day. Each group rolls its own 2d3 and plays its own turn; DEC-821 ends a *group's* turn on a quest pick, not the party's (PT-06).
3. Spreads skulls one per building, never past 3, because the table picks the building (DEC-092, DEC-093). Buildings never fall (PT-11). Cleanses with spare moves for 0 gold (Q-C3-14 answers in the C3 plan, DEC-377).
4. After The Barrow the Warden walks onto the board (DEC-791). The card says his token and path are drawn on the Story board's map (UI-053). That is the map Bob ruled out (PT-01).
5. Hires a companion for 20 gold (DEC-774), accuses nobody (nothing prompts it), and the traitor springs at The Keep's end (DEC-736, PT-22). Buys at the bazaar and fence; a cursed item gives a corruption (UI-060).
6. Holds 90 to 220 gold with nothing to spend it on (P-006 finding 4, PT-34). Plays three near-identical Tomb crawls in Standard, six in Long (PT-35).
7. Chapter 2 to 3 with the tower: seal break, glyph confirm, freed-skull placement, drum turn, tokens (UI-057, UI-058, PT-21).
8. The Tower, the Warden, the last choice (MEC-076, DEC-663, DEC-664). Wins. Best time compares against a no-tower history (PT-04, PT-05).

### 3. Host (owns the tower and the physical board)

- **Before anyone plays:** set the tower on the board, lay the board with kingdom edges, sort pieces (SCR-022). Connect and calibrate, about 21 seconds (SCR-005, CUE-011). v1.0 adds the glyph and facing questions (MEC-039 .13 to .19; C2 feature 12). Every iPad taps Enable sound.
- **Per game:** 12 seals on, 24 skulls out, heroes on the start space, spin for the purse, the story's own tokens (SCR-011, MEC-032 .21 to .35).
- **Per day:** move every mini, place or move quest tokens, drop skulls into the tower, report each kingdom, put each skull on its building (MEC-034). From 1.1, move the Warden, the hunter and the captain by hand (MEC-034 .27, D-04 §4). Nothing on the board names the piece's *current* space except text.
- **Per chapter:** quest tokens, break the lit seal, confirm the glyph, drum turn, freed skulls (PT-21).
- **When it breaks:** an iPad drops and the game pauses until every hero is claimed (DEC-154); the tower drops and the game pauses with three choices (DEC-301); any iPad can Quit after one "Are you sure?" (DEC-230). Quit keeps the autosave (DEC-208).
- **End of the night:** Done for tonight goes to the landing painting (DEC-628, DEC-713). There is **no teardown list** (PT-12). Next week Continue shows a picture for each piece (DEC-710), but 1.1's Warden and hunters are not on that list (PT-08).

### 4. v1.2 Dracula pass (all three personas, short)

Pick Dracula: a door until `playable` is true (SCR-009; D-04 §1). Settings offer Short and Standard (DEC-866). The Count's piece is a **physical** piece set on the Tower at The Reading, moved by the table, with Done as a physical-board confirm (D-04 §2 and §4, DEC-859). That already matches PT-01's fix. The strike is Fight, Ward or Endure with Ward greyed with a reason (DEC-858, D-04 §4). Lenka's face is clear from chapter 1 (DEC-892). The Drawbridge always has Turn back (DEC-883). A solo Swap takes the companion (DEC-851). Four story companions, Tomas gone (DEC-855 body). Endings follow `lenka.saved_by` (DEC-884); losses fire in the order Turned, Valley Falls, Houses Fall (DEC-885). New findings from this pass: PT-14 (Tomas drift in the cards) and the inherited PT-01, PT-05, PT-06, PT-22. Dracula's numbers are still unprobed: P-007 is specified (DEC-889) and not run.

---

## 1. Design gaps

### PT-01 · The Story board draws tokens, paths and glyph icons on "the map" (v1.1, v1.2)
- **Where:** v1.1, day close and chapter start. UI-051 (lieutenant token on the Story board's map), UI-053 (the adversary's token, path and ringed building), UI-056 (glyph icon on its kingdom "on the map"), UI-064 (caravan tokens on the map). Against DEC-189 (the Story board never shows a map; no hero markers), DEC-353 (Bob, 2026-10-27: "No map; cross is OK"; it replaced a map mark for foes), UI-023, weekend-c1-acceptance.
- **Severity:** blocker. A builder reading the 1.1 UI cards builds a map; a builder reading DEC-189 does not.
- **Finding:** Bob accepted these four Claude drafts in a bulk "accept all" on 2026-11-06, after his explicit no-map rulings. Two Bob rulings disagree. D-04 already treats the Count's piece as physical (§2, §4).
- **Fix (my call):** DEC-189 and DEC-353 stand. The board **never draws** a token, path or ring. Instead: (a) the threat bar and the day's effects panel say it in words with the printed space name (DEC-225): "The Warden walks to Howling Desert", "The raider captain steps to Plover Ford"; the table moves the physical piece and taps Done (MEC-034 .27 already says so); (b) a showing glyph is an icon and a line in the edge band's kingdom list ("Arisilon: Cleanse takes 2"), not on a map (DEC-764's "board band" reads this way); (c) UI-064 goes with PT-09. Rewrite UI-051, UI-053, UI-056 and UI-064 accordingly.
- **Lock:** restores Bob's DEC-189 and DEC-353. It amends four Bob-accepted cards (UI-051, UI-053, UI-056, UI-064, "accept all" 2026-11-06). Warden should give Bob this one line so the bulk acceptance is not read as a reversal.

### PT-02 · Two rules for the fallen-buildings loss (v1.0)
- **Where:** loss check, MEC-033 .11. DEC-044 (Bob, 2026-10-20): all 4 buildings of one kingdom. AREA-043 repeats "a fallen kingdom"; DEC-043 says only "too many fallen buildings". The C3 plan's Q-C3-05 (Bob approved 2026-10-31): 4 fallen buildings lose the game. The day loop reads the second (`fallenLimit` in `clock.ts`, a board-wide count of buildings with 4 skulls). D-02 and D-05 use "four houses" for Dracula.
- **Severity:** major. Cards, plan and code disagree on one of three ways to lose, and the loss scene copy names it.
- **Fix (my call):** The live rule is **4 fallen buildings anywhere on the board** (16 buildings exist). New DEC refining DEC-044 by the DEC-352 pattern; trim DEC-044's title and fix AREA-043's wording.
- **Lock:** none. Bob's 2026-10-31 approval is the later word.

### PT-03 · A quit writes a "quit" record, but Continue resumes the same game (v1.0)
- **Where:** Quit story and Continue. DEC-218 (quit "writes its record"), DEC-208 (autosave stays), DEC-709 (the quit game sits in tonight's list), DEC-116 (stats and averages from records), MEC-032 .43.
- **Severity:** major. After Continue the same game may finish as a win. Is that a second record, an edited one, or a quit that is also a win? Totals, average and best change with the answer.
- **Fix (my call):** One record per game id. Quit stamps it `quit` provisionally. Continue reopens that record, and the final outcome overwrites it. It stays `quit` only if a New game or Play again replaces the autosave. Win/loss totals and the average count won and lost records only; quit records show in the list.
- **Lock:** none. It refines DEC-218; quit still writes a record.

### PT-04 · What "best" compares (v1.0)
- **Where:** SCR-019 spec C3/17: best is "the shortest active length of a won game of this story" (Bob approved 2026-10-31). DEC-116: best is the fastest win for the same story *at the same length and difficulty*.
- **Severity:** major. P-006 wins in 14 days with 4 heroes and 25 with a solo hero; Short and Long differ more. The first game ever, or a loss, has nothing to compare.
- **Fix (my call):** keep "shortest win". Key it by story, length, difficulty **and party size**. First win shows "Best: this game". A loss, or no earlier win, shows "No win yet to compare". The average uses the same key and counts won and lost games.
- **Lock:** none. It narrows B8's comparison set to DEC-116's own key plus party size.

### PT-05 · The balance numbers were all measured without the tower (v1.1)
- **Where:** DEC-815, DEC-823 (80% floor), P-006 ("No tower, so seals and glyphs drop out (DEC-305, DEC-306)... no glyphs, drums or tower drops"). Tower play adds held skulls (DEC-703: 0/1/2 fall at 30/50/20), seal breaks that free them, and the 12 glyph boons (DEC-761). DEC-306 says a story must not depend on a boon, but nobody measured the gap.
- **Severity:** major. The same table can win far more often with the tower than without it, and "best" mixes both (PT-04).
- **Fix (my call):** (a) add a P-008 cell: Standard, 2 and 4 heroes, tower drops and boons on; (b) the game record stores `tower: on | off | dropped mid-game` and the stats screen shows it as a label (not a separate best); (c) the 80% floor is stated for no-tower play, and tower play must not exceed 95%, the same bound as DEC-823's ceiling.
- **Lock:** none.

### PT-06 · Splitting the party doubles the day (v1.1; applies in v1.0)
- **Where:** DEC-640 (each group rolls its own moves), DEC-148, DEC-821 (a quest pick ends the *group's* turn), DEC-615. P-006: "It never splits the party or plays for the clock."
- **Severity:** major. Two groups roll two 2d3 and may each play a quest in a day. For an experienced table that is the dominant strategy, and every probe number assumed nobody does it.
- **Fix (my call):** (a) run P-008 with a policy that splits whenever two quests are within reach; (b) ship a tuning lever now: while the party is split each group's roll takes a shift of -1 (floor 2), `day.shifts.per_split_group: -1`, placeholder under DEC-079 and DEC-500; (c) tune it so a splitting policy wins within 5 points of a staying policy at hard.
- **Lock:** none. DEC-640's "each group rolls its own" stands; a shift is the modifier slot DEC-079 already allows.

### PT-07 · No rule picks the building in a no-tower skull drop (v1.0)
- **Where:** DEC-305 (simulated drop), tuning `simulated_drop: kingdom_die d4`, DEC-092 (the table picks the building), C2/08 eval ("A skull falls on <building>", Bob approved). The shipped line is built from a chosen space; the card names only the kingdom.
- **Severity:** major. Tower is optional, so a new table plays this path first. Nothing says how the app picks the building, whether it can pick a fallen one, or what the board shows for 2 to 4 skulls in a night (party drop, Warden arrival, Dracula earth box).
- **Fix (my call):** kingdom by d4. Building = the **standing building with the fewest skulls in that kingdom**, ties by seed. This mirrors what a careful table does under DEC-092, so tower and no-tower stay comparable (PT-05, PT-11). If none stands, reroll the kingdom once. The board shows one line per skull ("A skull falls on <building>."), stacked, never cut short.
- **Lock:** none. The line stays as Bob approved it.

### PT-08 · Continue's piece check has no 1.1 pieces (v1.1)
- **Where:** DEC-710 lists hero minis, skulls per building, foes and broken seals. D-04 §3 and DEC-881 add the Count's piece for Dracula only. Nothing covers the Warden, hunters, captain, drum positions or open clue state for The Ruined Keep. Q-402 (drums and held skulls after calibration) is still a hardware check.
- **Severity:** major. Continue is "90% of save and resume" (DEC-208).
- **Fix (my call):** the piece check lists **every piece the game keeps on the physical board**: adversary, each lieutenant, foe tokens, quest tokens. After calibration the app re-turns the drums to the saved positions or lists them as a step. App-only state (loyalty, clues, items) needs no check.
- **Lock:** none.

### PT-09 · Caravans: ruled out, then designed (v1.1)
- **Where:** DEC-777 (accepted via DEC-786): caravans and moving quests "stay out"; The Ruined Keep's feature map and P-006 have none. UI-064 and DEC-090 are `release: "1.1"` decided; AREA-119 says its UI cards reach every decided 1.1 ruling; MEC-034 .26 moves caravans.
- **Severity:** major. A 1.1 plan built from the release tag would build caravans no story uses.
- **Fix (my call):** DEC-777 wins. Park UI-064 and DEC-090's 1.1 tag by the DEC-352 pattern ("Replaced by DEC-777"); MEC-034 .26 stays an empty slot a later story can fill.
- **Lock:** reverses a team decision (UI-064, bulk-accepted 2026-11-06). Bob's own DEC-777 wins.

### PT-10 · No target length for an evening (all versions)
- **Where:** none. R-FUN-3 and the old open question 5 ask for it; no card answers it. P-006 finding 7: a solo Long game is about 39 days and a solo hard one 51. Days per hour are unmeasured.
- **Severity:** major. Length (Short/Standard/Long) is chosen without knowing what it costs.
- **Fix (my call):** set targets as placeholders: Short about 90 minutes, Standard about 2 hours, Long about 3 hours for 2 to 4 heroes (RtDT runs 100 to 120 minutes). Add the game's active length and a count of iPad taps per day to the event log (DEC-107) and the stats line. The first real table sets the numbers; a solo Long game that exceeds 4 hours gets a warning on the settings screen.
- **Lock:** none.

### PT-11 · The fallen-buildings loss is nearly unreachable (v1.0, v1.1)
- **Where:** DEC-092 (the table picks the building), DEC-093 (4th skull destroys). P-003's own policy is "fullest building with fewer than 3". D-05 §10 says P-006 "tracks fallen buildings but never loses on them".
- **Severity:** polish. 24 skulls spread over 16 buildings cannot reach 4 on one unless the table chooses to. The scene, copy and Dracula's `houses-fall` ending may never play.
- **Fix (my call):** keep the rule as a backstop. Add a forced-concentration probe so the loss path is tested once, and write its scene as plain text, no new art, until a table reaches it.
- **Lock:** none.

### PT-12 · Goodbye and the teardown list wait for "1.1", and no 1.1 card carries them (v1.1)
- **Where:** SCR-020 (parked), DEC-628 ("returns with 1.1"), DEC-713. No `release: "1.1"` card names it; v1-1-reconciliation Part 3 says no SCR, UI, CUE or MEC card carries 1.1 and 44 rulings reach no deliverable.
- **Severity:** polish. A host packing a game with a tower and 24 skulls has no list.
- **Fix (my call):** v1.1 includes a Goodbye card: the tower to idle (CUE-012), then a list of what to box, with "skulls still inside the tower" first, then the board snapshot Continue will check (DEC-710). Write it as a new `SCR-` card in the 1.1 deliverables.
- **Lock:** none.

### PT-13 · Virtues and item use have two designs and no build path (v1.0)
- **Where:** UI-037 (turn-start virtue panel), UI-038 (the "use" icon), UI-013 (party items panel), UI-045 (game of chance) appear in no plan or brief under `apps/bloodtower/plans`. C2/04's gear list folds Items into "Use a potion or item" (Bob approved 2026-10-31, 10:38 AM ET). The battle round picker already offers Spend and Drink (C4/10). "Look up (rules or a card)" has no content spec.
- **Severity:** major. The turn-start virtues fire through UI-037; with no build path a hero's virtues do nothing, and the use button competes with the gear.
- **Fix (my call):** keep UI-037: virtues that fire at turn start are automatic and show on the board; the panel needs an iPad press only when a virtue asks a choice. Retire UI-038 for the gear item and the round picker (Bob's gear rule: exceptions go through the gear). Put UI-037 and UI-013 into C3's `Builds:`, UI-045 under the purse wheel (DEC-114). Look up's Rules group is one page per loop (DEC-571).
- **Lock:** none. It follows Bob's later gear list over DEC-481's older button.

### PT-14 · Card and document drift to sweep (all versions)
- **Where, each one line:**
  - UI-028 says "Day N with no total"; DEC-686 and the C3/11 spec show days left. The card wins under DEC-610, so it is wrong.
  - UI-032 and DEC-227 say Back, Replay and Menu are centered; C2/04 puts "?" left and the gear right (PT-23).
  - DEC-855's title says "five story companions" and its first lines list Tomas; its amended body and D-02 G-10 say four. DEC-782, DEC-745 and IDEA-109 still make Tomas Varga a companion.
  - MEC-039 .13 to .19 draw the glyph and facing questions; DEC-766 (1.1) removes the glyph step at setup. Mark those nodes "1.0 only".
  - weekend-c1-acceptance.md says Done for tonight goes to Goodbye; DEC-628 and DEC-713 say the landing painting. The README lists the note as "Current".
  - MEC-071 .15 still cites DEC-155, which is parked.
  - The quit action is "Quit story" (DEC-218, UI-033), "Quit" (SCR-017, MEC-071) and "Save and quit" (C2/04): see PT-27.
- **Severity:** polish. Each is small, together they mislead a builder.
- **Fix (my call):** one docs PR, no new rulings. For each: edit the card or add the "Superseded by" line.
- **Lock:** none.

---

## 2. Playability problems

### PT-15 · Picking a hero is blind (v1.0)
- **Where:** SCR-010 and C2/05. DEC-201: no portraits or art on an iPad. The gear's Current party is "Only in a game" before Begin; Look up on the session screen is greyed the same way. The pool's card on the board is not specified.
- **Severity:** major. A first-time player picks a class by its letter. One iPad can also pick every hero; there is no per-iPad cap.
- **Fix (my call):** the Story board's pool shows a card per hero (portrait, class, fight number, hit points, one virtue line); a seated hero greys out. The iPad button keeps the locked words: "Pick Hero A", "N of N picked", "Who this iPad speaks for at the table". No cap is needed, but once an iPad holds more than half the heroes the board says "Another iPad is waiting for a hero".
- **Lock:** none. Copy is untouched; art stays on the board (DEC-201).

### PT-16 · First-time hints and a rules page are decided and never built (v1.0)
- **Where:** DEC-571 (a one-line Scroll the first time each loop appears, a table can switch them off at setup, a Rules group in Look up). Only UI-035 links it. SCR-008 has no toggle. No C2 or C3 brief builds it. "?" gives one line per screen (C2/04 help table).
- **Severity:** major. This is the whole teaching plan for 1.0 (Q-259, answered by DEC-571).
- **Fix (my call):** add to C3: the first battle, building visit, event, skull drop and day's end each open with a one-sentence hint Scroll in the story's voice, once per game, auto-advance 4 seconds; a "Hints" toggle on Game settings, default on; the Rules group in Look up with one page per loop.
- **Lock:** none.

### PT-17 · A hero one fall from losing the game looks like any other hero (v1.0)
- **Where:** DEC-043, DEC-119 (a fall is a corruption), DEC-676 (a third corruption loses at once, in a battle too), MEC-013 (guards only the day's end, DEC-565). UI-028 shows health only. UI-047 lists no corruption.
- **Severity:** major. The Fight/Retreat choice is where the table should know. A random foe hit (DEC-015) can fell the marked hero, and the first-time player sees the loss scene with no warning.
- **Fix (my call):** a hero at 2 corruptions gets a mark on the band's health mark and on the foe panel's hero list; the Fight/Retreat board line adds "<hero> is one fall from defeat" while one is present. Display only; DEC-676 is untouched.
- **Lock:** none.

### PT-18 · A Regroup prompt every day, for a table that never splits (v1.0)
- **Where:** MEC-034 .38 to .42, DEC-640, C3/11 ("A new day. Stay together, or split up?"). The step runs whenever two heroes share a space, so every day for a party travelling together. C2/04 already has Split party and Rejoin party in the gear.
- **Severity:** major. A daily exception prompt on the happy path breaks Bob's lock (happy path has no exceptions, exceptions go through the gear). About 25 to 40 needless taps in a game.
- **Fix (my call):** Regroup becomes a **queued gear action**. Split party and Rejoin party, picked from the gear any time in the day, take effect at the next day start. The day-start board shows the groups for 4 seconds and has no button. The prompt appears only when something is queued. MEC-034 .38 reads "a split or join was queued".
- **Lock:** none; it restores Bob's gear lock. DEC-640's timing (day start, before the roll) is unchanged.

### PT-19 · A mis-tap on the move map cannot be taken back (v1.0)
- **Where:** DEC-035 (tap the space the minis stand on), DEC-209 (Back undoes only until the outcome shows), MEC-035 .5 and .6 (the arrive trigger fires at once). Gear item 2 re-runs the piece check but does not give moves back.
- **Severity:** major. On a 60-space board a mis-tap costs a move, and on a trigger space it fires a story beat.
- **Fix (my call):** Back on the move map reverts the last tap until a trigger plays. After that, the gear's Game board setup gains "Fix my position": it moves the group's recorded space, charges nothing, fires nothing and logs a correction.
- **Lock:** none. It keeps DEC-209's rule that luck never re-rolls.

### PT-20 · One silent seat blocks the round (v1.0)
- **Where:** MEC-038 .6 and .7 (every standing hero picks an action), DEC-019 and "first press wins" for group choices, DEC-188 (only the acting group's iPads press), DEC-154 (a dropped iPad pauses the game). The waiting line (UI-031) names who is choosing, but nothing resolves a hero who never answers.
- **Severity:** major. A child with a snack stalls a four-hero battle.
- **Fix (my call):** the waiting line names the hero. After 30 seconds the group's other iPads get "Pick for <hero>", which sets Guard (the safe default). The gear's Change who holds whom stays the permanent fix. The 30 seconds is a tuning placeholder.
- **Lock:** none.

### PT-21 · A chapter's end is five chores before the next chapter begins (v1.0 small, v1.1 large)
- **Where:** MEC-033 .12 to .30 and .4; with the tower: lit seal and break it, glyph confirm (UI-058, 1.1), freed skulls by kingdom then building (DEC-409), drum Turn or Skip (UI-057, 1.1), quest tokens for the next chapter (.3, .4), traitor step (DEC-736).
- **Severity:** major. It sits right after the chapter's payoff. Five physical tasks and about 8 presses before the next card.
- **Fix (my call):** show the story first, then one chores screen. Order: close Scroll, stamped card, traitor reveal, **next chapter card and opening**, then a single "Set the table" step on the board, one check per chore (seal, glyph, freed skulls, drums, tokens) and one Done. Freed-skull picks stay separate because each is a choice.
- **Lock:** none. Physical-confirm steps keep their Done (C2/04's rule).

### PT-22 · The traitor deadline is invisible (v1.1; Dracula D-04 §5)
- **Where:** DEC-736 (a hidden traitor springs at the chapter's end), DEC-797 (Who Sold the Road? gives a clue; accusing is an optional talk action), UI-052, DEC-573 (the threat bar lists quest and lead deadlines, not this).
- **Severity:** major. A first-time table can finish the chapter and learn the penalty when it fires. Dracula's D-04 §5 has the same shape.
- **Fix (my call):** the first clue's Reveal says "Accuse at <suspect>'s door before <chapter> ends". The threat bar gains "The traitor springs when this chapter ends" while any suspect is unnamed. DEC-573's list gets that line.
- **Lock:** none.

### PT-23 · Where Back and Replay sit once "?" and the gear own the ends (v1.0)
- **Where:** DEC-227 and UI-032 (Back, Replay, Menu centered, Bob 2026-10-25); C2/04, the C2 05 spec, its eval EV and the C3 to C5 specs ("?" at the left end, the gear at the right end, Bob 2026-10-31). The built chrome (W1) and its e2e check pin the centered trio.
- **Severity:** major. The build and the new checks disagree, and no spec says where Back and Replay go.
- **Fix (my call):** left "?", centre Back and Replay, right the gear. A control that cannot be used stays visible and greyed (DEC-227). Update UI-032, DEC-227's note and W1's pinned check in the toolbar brief.
- **Lock:** none. Bob's 2026-10-31 approval replaces the Oct 25 position of Menu only.

### PT-24 · Every iPad taps "Enable sound", yet iPads play no sound (v1.0)
- **Where:** C2/05 (each iPad taps "Tap once to turn on this iPad's sound", copy locked by Bob 2026-10-31 10:33 AM ET; each then sees a tower-volume step). DEC-201: all sound plays only on the Story board. SCR-003 already unlocks the board's page. Without a tower the volume line still says "How loud should the tower be?".
- **Severity:** polish. N taps and N volume tests before the first story, and the copy can be false.
- **Fix:** **I cannot call this one.** Either an iPad plays sound (then DEC-201 needs a line naming what), or it does not (then the per-iPad tap and its locked copy go). Needs Bob's one-line answer, through Warden. Whichever way: the volume step runs once per session on the first iPad that finishes, and is skipped, with no tower words, when there is no tower.
- **Lock:** reverses a Bob lock if iPads play nothing (the 2026-10-31 locked copy). Not mine to decide.

### PT-25 · The waiting group has nothing to do (v1.0)
- **Where:** DEC-188 (Bob: waiting iPads show the idle card and the menu only; advice is spoken), UI-029, Q-093.
- **Severity:** polish. When the party splits, one group waits through another group's battle.
- **Fix (my call):** the idle card keeps three lines and gains the group's own roll ("You have 5 moves") and "You're next", so waiting players can plan. No new press.
- **Lock:** none. It stays inside DEC-188's "idle card".

### PT-26 · Four seconds is short for a dense panel (v1.0)
- **Where:** C2/04 and C3/11 and C3/16 (auto-advance after 4 seconds with no audio; Bob 2026-10-31 10:38 AM ET), UI-022 (one line per effect), DEC-627's summary line. A night with a skull, an event result, a "+1 day" and a struck hero has four lines or more. Replay is on the bar.
- **Severity:** polish.
- **Fix (my call):** keep 4 seconds as the floor. Add 1.5 seconds for each line beyond two, capped at 12 seconds. A panel that shows a loss reason or a hero struck waits for the narration or the cap.
- **Lock:** none. It refines Bob's 4 seconds; it does not replace the rule.

### PT-27 · One action, three names (v1.0)
- **Where:** see PT-14: "Quit story", "Quit", "Save and quit". DEC-218 says the game ends as "quit".
- **Severity:** polish. A nervous table fears the word.
- **Fix (my call):** the label everywhere is **Save and quit** (Bob's 10:38 list), and its confirm reads "The game stays saved. You can Continue until a New game replaces it."
- **Lock:** none.

### PT-28 · An iPad that joins when every hero is taken (v1.0)
- **Where:** DEC-712, DEC-154, MEC-071 .5 to .7, SCR-010. N is fixed at settings.
- **Severity:** polish. A late arrival sees what?
- **Fix (my call):** it shows the idle card for the whole table (all heroes, health, purse) and the gear's Join and Change who holds whom. It claims nothing until a hero is released.
- **Lock:** none.

---

## 3. Fun improvements, cheapest to build first

All of these are polish; none changes a lock.

| Id | Where | Idea | Cost |
|---|---|---|---|
| PT-29 | v1.0 edge band, DEC-686 | When days left reach 5, 3 and 1, the tower plays its existing skull sound at the day's close and the band's "days left" turns ember. | One threshold in the day close; reuse CUE-006. |
| PT-30 | v1.0 UI-043, DEC-093 | On the skull-placement list, a building with 3 skulls is marked "falls on the next". The data is already on the button. | Label only. |
| PT-31 | v1.0 round picker, DEC-331 | The hero who taps Strike gets a short bark in their portrait's voice, two per class. It makes the one-hero tap a moment and rotates who taps. | Loremaster lines (LQ-5), no engine change. |
| PT-32 | v1.0 chapter close, Q-C3-18 | After the stamped card, the board shows the chapter's key moments (quest done, item gained, building fallen, corruption taken) as three lines, auto-advancing. The log already holds them. | Reads existing data. |
| PT-33 | v1.1 DEC-791, CUE-014 | The first time The Warden reaches a building, one line plays over his portrait after the gloat cue. His walk onto the board is the reveal's payoff. | One line (LQ-4). |
| PT-34 | v1.1 gold, P-006 finding 4 | Big parties end with 90 to 220 gold. Scale prices with party size: hire cost 20 plus 5 per hero above two, virtue draw likewise. | Tuning file. Probe it in P-008. |
| PT-35 | v1.1 DEC-820 | Standard plays three Tomb crawls (Barrow, Raiders' Market, Moat Lair) and Long six. Give each disguised Tomb a signature guardian from what exists: the Moat Lair ends on the Keep-wight (IDEA-176), the Market on the raider captain's hunter, the Vault and Hold on a lieutenant-level foe. Room counts and the plain-scene Market stay as Bob ruled in DEC-820 and DEC-603. | Script and foe picks, no rules. |

---

## Blockers and majors

| Id | Version | One line | Fix | Lock impact |
|---|---|---|---|---|
| PT-01 | 1.1, 1.2 | The 1.1 UI cards draw tokens, paths and icons on a Story-board map | Words and physical pieces only; rewrite UI-051, 053, 056, 064 | Restores DEC-189 and DEC-353; amends four Bob-accepted cards, tell Bob |
| PT-02 | 1.0 | Fallen-buildings loss: one kingdom (DEC-044) or 4 anywhere (plan, code) | 4 anywhere; new DEC refines DEC-044 | none |
| PT-03 | 1.0 | Quit writes a record and Continue resumes the game | One record per game; outcome overwrites a quit | none |
| PT-04 | 1.0 | "Best" key differs between DEC-116 and the stats spec | Key by story, length, difficulty, party size | none |
| PT-05 | 1.1 | All numbers measured without the tower | P-008 tower cell; log and show `tower` | none |
| PT-06 | 1.1 | Splitting the party doubles moves and quests | P-008 split policy; -1 per split group | none |
| PT-07 | 1.0 | No rule for the building in a no-tower drop | Standing building with fewest skulls; one line per skull | none |
| PT-08 | 1.1 | Continue's piece check lacks the Warden, hunters, drums | List every board piece; re-turn drums | none |
| PT-09 | 1.1 | Caravans ruled out (DEC-777) and then designed (UI-064) | DEC-777 wins; park UI-064 | reverses a team decision |
| PT-10 | all | No target evening length | Placeholder targets, tap counts in the log | none |
| PT-13 | 1.0 | UI-037, UI-038, UI-013, UI-045 unbuilt; gear duplicates use button | Keep UI-037, retire UI-038, add to Builds | none |
| PT-15 | 1.0 | Hero pick is blind | Hero cards on the board; copy unchanged | none |
| PT-16 | 1.0 | DEC-571 hints and rules page never built | Add to C3 | none |
| PT-17 | 1.0 | A third corruption is invisible until it ends the game | Mark and warning line | none |
| PT-18 | 1.0 | Daily Regroup prompt breaks the happy-path lock | Queued gear action | none; restores Bob's gear lock |
| PT-19 | 1.0 | A mis-tap on the move map is permanent | Back until a trigger; Fix my position | none |
| PT-20 | 1.0 | One silent seat blocks a round | "Pick for <hero>" after 30 s | none |
| PT-21 | 1.0, 1.1 | Five chores after every chapter | Story first, one "Set the table" step | none |
| PT-22 | 1.1, 1.2 | The traitor deadline is invisible | Reveal and threat-bar line | none |
| PT-23 | 1.0 | Toolbar: where Back and Replay sit with "?" and the gear | "?" left, Back and Replay centre, gear right | none |

Counts: **1 blocker, 19 majors, 15 polish** (PT-11, 12, 14, 24 to 28 and the seven fun items PT-29 to PT-35). Gaps: 14. Playability: 14. Fun: 7.

## Locks check

| Bob lock | Result |
|---|---|
| iPad bottom toolbar with a gear on every screen | Kept. Layout drift is PT-23. |
| Exceptions go through the gear; their UI shows on the Story board; happy path has none | Broken by the daily Regroup prompt (PT-18) and the UI-038 button (PT-13); both fixed back to the lock. |
| Next-only iPad screens kept to a minimum | Kept. PT-21 removes presses; PT-26 is about reading time only. |
| Pick wording ("Pick Hero A", "N of N picked") | Kept, copy untouched (PT-15). |
| No digital board or hero markers on the Story board | Broken by four 1.1 UI cards (PT-01); fixed back to the lock. |
| The tower is optional; a lost tower pauses with three choices | Kept (DEC-275, DEC-301; DEC-155 is parked). PT-05 and PT-07 are balance and rule gaps, not lock changes. |
| A skull landing shows "A skull falls on <building>" | Kept; PT-07 says how the building is chosen. |

**Needs Bob, through Warden:** PT-24 (does any iPad ever play sound?) and one line on PT-01 (the four 1.1 cards were bulk-accepted; I am restoring DEC-189). Nothing else reverses a Bob lock.

## Questions for Loremaster

Each has a default I will use if there is no answer.

- **LQ-1 (PT-22):** the first-clue Reveal line for The Ruined Keep. A) Narrator: "Someone sold the road. Name them at their door before the keep falls quiet." B) A plain system line: "Accuse before this chapter ends." C) The old keep sergeant says it. *Default A.*
- **LQ-2 (PT-17):** the Fight/Retreat warning. A) "<hero> bears two oath-marks. A third ends the oath." B) "<hero> is one fall from defeat." C) An icon with no words. *Default A (oath-marks are the Keep's corruption words, IDEA-177).*
- **LQ-3 (PT-16):** who speaks the first-time hints. A) The narrator, one plain sentence each. B) The Herald in chapter 1, the narrator after. C) Engine default text with no story voice. *Default A.*
- **LQ-4 (PT-33):** The Warden's first-arrival line. A) One line, the first time only. B) A different line at each building, three in all. C) The gloat cue with no voice. *Default A.*
- **LQ-5 (PT-31):** the Strike bark. A) Two lines per hero class, six classes. B) Two generic lines for every hero. C) None. *Default B for 1.0, A for 1.1.*
- **LQ-6 (PT-02):** the fallen-buildings loss scene, which can happen before The Warden is revealed. A) The roads close and the village is lost to the raiders. B) The Warden's banner over the fallen houses. C) The narrator's regret, no names. *Default A, so the reveal is not spoiled.*
- **LQ-7 (PT-35):** the Moat Lair's guardian. A) The Keep-wight. B) A beast (engine foe). C) A named raider. *Default A.*

## What I did not cover

The real tower (drum, glyph and held-skull behaviour: Q-402, DEC-765 and DEC-766 checks), art and sound quality, timings, Dracula's numbers (P-007 is specified and unrun), and the C4 and C5 screen specs beyond the toolbar and round picker. Each PT call becomes a `DEC-` card and a brief edit in the follow-up docs PR; Wright gets the blockers and majors for the next-phase plan.
