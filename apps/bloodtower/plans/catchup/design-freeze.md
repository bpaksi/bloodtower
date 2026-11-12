# Design freeze: what is locked for v1.0 (2026-11-12)

Drafted 2026-11-12 by Gamewright's planning pass; revised the same day for Gamewright's paper playtest, Gamewright's section G rulings (the catch-up patch, DEC-894 to DEC-903), Bob's answers via Warden (finish 1.0 before any 1.1 design) and the Cursor calibration. This is a list of locks and the questions they raise. **This file decides nothing new**; the rulings in section H are Gamewright's own design calls, recorded here. Where two sources disagree, or a lock is unclear, it is a question in section G, not a ruling. DEC-610 applies: a card beats an old design doc, and a known conflicting line carries a "Superseded by" note.

Status words: `decided` is a card with status decided. "Bob, date" is a ruling recorded in a plan, runbook or chat note.

## A. Release axis

- A card with no `release` field is 1.0; `release: "1.1"` and `"1.2"` are later (DEC-696). The gaps check reports each release on its own.
- 1.0 ships one story, The Ruined Keep, one game of each kind and few variants (DEC-691, DEC-502). Chapters C2 to C5 plus the asset adapter A1 build it (`1.0-milestones.md`).
- 1.1 ships The Ruined Keep alone, with every 1.0 and 1.1 feature, in the same pack: 1.0's six quests stay as the spine (DEC-787, DEC-788, DEC-789).
- 1.2 is Dracula, a drop after 1.1 on the finished engine (DEC-788, DEC-691). One Dracula, Short and Standard only, four chapters on the day clock (DEC-739, DEC-866, DEC-868).
- Before 1.1 code: rule on proposals, reconcile Dracula, write the deliverables, run the numbers, then plan (DEC-785); write the 1.1 script before the 1.1 plan (DEC-831); the script writes every `[COPY: ...]` slot in the C3 to C5 plans (DEC-836).

## B. Process locks (how work is built)

- No code without a brief (plan.md, eval.md, approval.md) on main with Bob's approval row, passing `node scripts/check-briefs.mjs`; four required headings: Cutover, Survival invariants, Done-when (e2e), AREA / DEC checklist.
- One runner per step, one PR per step. Reviews A and B use different models; docs, CI, test and pack PRs merge on green with no review; merges pin the head SHA; three fix rounds then `needs-bob`. Never `--no-verify`, never force-push.
- Cursor use is capped at the even weekday share, never weekends (Bob, via Warden). Bob is on Cursor Pro+, $60 a month, reset Nov 12; one plan weekday = $2.73 (README). Cursor pays for the A/B reviews; the runner builds on its own subscription.
- Finish 1.0 before any 1.1 design or planning (Bob, 2026-11-12, via Warden).
- The 2026-11-12 6:47 AM ET build stop holds.
- Copy tables: Loremaster fills them before any 1.0 screen builds; no waiver of the brief-gate rule (Warden, 2026-11-12).
- Art hold: no paid art or voice renders until Bob lifts it; Bob ticks every art final (C5-05, DEC-384).

## C. 1.0 game locks (C2 to C5)

- DEC-703: the 1.0 tuning table, in one tuning file, loaded at Begin and fixed for the game; only the base file holds tuning (Q-C3-08, Bob 2026-10-31). DEC-500, DEC-131, DEC-699 to DEC-702 back it.
- C3 ends after chapter 1 and fights are off until C4 (`c3_end_after_chapter_1: true`, `fight_enabled: false`; Q-C3-01, Q-C3-02, Bob 2026-10-31). C4 and C5 flip them.
- C2 session and hub rulings, DEC-704 to DEC-717 (Bob, Oct 31): session, Play again (DEC-708 holds the story, settings and heroes), tower-lost, Continue and the piece check (DEC-716, DEC-717).
- All story art and sound plays on the Story board; iPads show only icons and text controls (DEC-201).
- A line is voiced only when its text is fixed and plays once; generic NPC lines are silent captions (DEC-349).
- Asset work runs from a needs list in two modes: Bob reviews in the studio, or AI makes and packs drafts (DEC-384). asset-studio 0.2 serves 1.0's art run; talking avatars wait for 0.3 and 1.1 (DEC-843).
- 1.0 Bob approvals dated 2026-10-31 stand for every C3, C4 and C5 brief (approval.md in each).

## D. Recent locks (Nov 10 to 12)

1. **Lenka's face is shown from chapter 1** in a travelling hood with her face clear; her reveal is shown as a change in her face (a violet mark), not an unveiling (DEC-892, Bob 2026-11-10; `specs/dracula/script/lenka-look.md`). Ludmila's gallery portrait stays covered. Release 1.2.
2. **Charon is the locked Loremaster (narrator) voice** (D-01, Bob 2026-11-10). Gamewright's DEC-902 reads the lock as covering The Ruined Keep's Loremaster too (see question 1).
3. **The C2-07 play-again board line stays as is** (Bob, Nov 10). Gamewright ruled the text (DEC-897): one dialog, title "Play again?", lines "Same heroes, a fresh board." and "This replaces the saved game. Are you sure?"; the board band line stays.
4. The Vellmoor cover is repainted in oil to match the scenes, replacing the sepia cover (DEC-893). Release 1.2.
5. Bob's go of 2026-11-10: the whole Dracula design finishes Thu 2026-11-12 (D-01 to D-06 under `specs/dracula/`).
6. A1 step 8b added and split (8b-1 demo pack and job, merged #413; 8b-2 demo playback, the proof step for G-A1-01), Bob 2026-11-10.
7. **Bob's tower run is Mon Nov 16** (Bob via Warden, 2026-11-12). C2-10 is his own time; C2-11 and C2-13 follow it.
8. **Finish 1.0 before any 1.1 design** (Bob via Warden, 2026-11-12). Section E and F below are reference only.

## E. 1.1 locks (headline) — PARKED, reference only (Bob 11-12)

Nothing here is planned or built until 1.0 ships.


111 decided 1.1 DECs, 18 UI, 5 CUE, 8 AREA, 34 Q, 18 IDEA. The ones that shape the work: companions belong to one hero and can fall or walk out (DEC-066, 071); evil NPC kinds (DEC-073); caravans are out: DEC-777 wins and UI-064 is parked (PT-09); the adversary hunts the most-skulled building (DEC-052); a lead opens a side quest (DEC-525); cursed items give their holder a corruption (DEC-169, 522); a hero holds up to 4 treasures (DEC-424); Suspicious and Weak corruption caps (DEC-467, 469); glyph boosts (DEC-597); shared NPC faces under neutral lines (DEC-333 to 348); Inventive cannot end the boss battle or a Tower room battle (DEC-549, 1.1, removed from C5-02). Parked and staying out: moving quests, caravans, special tokens, false death as an ending, the tavern (DEC-777).

## F. 1.2 (Dracula) locks (headline) — PARKED, reference only (Bob 11-12)

Nothing here is planned or built until 1.0 ships. The one 1.2 line the rulings touch, Lenka's reveal, is settled in section H.


75 decided 1.2 DECs. One hidden goal for the Count per game, set by the seed (DEC-742); the Count is a figure on the board (DEC-743); each goal sets three things (DEC-748); three objects open the castle gate (DEC-749); Lenka starts free and travels as a companion the heroes can lose, and a lost Lenka is taken to the castle (DEC-741, 746); the wight swap (DEC-751); gear and potion names (DEC-752); Short plays 8 quests, Standard 12 (DEC-753); naming pass (DEC-754, 755); the Count looks ageless (DEC-756); five Tomb games (DEC-769 to 773); Dracula castle rooms use the Tower's room kinds (DEC-780, but see question 8); the earth box adds a skull a day (DEC-779); Lenka's face and the oil cover (DEC-892, 893); the VO manifest is DRAFT for 255 lines, Charon narrator (D-06).

## G. Questions

### Settled (2026-11-12)

- **Copy tables:** no waiver (Warden). Loremaster fills them before any 1.0 screen builds (step 45).
- **C3-08 corruption:** Gamewright, DEC-894 (no give action in 1.0; Selfish is one engine guard), DEC-895 (Continue refuses saves from before the feature; the five tuning keys are required) and DEC-896 (free cure first, Tempted +2 once per buy and last, gold losses in a fixed order per holder). Cursed stays out of C3's draw (EV-08).
- **C2-07 play-again text:** DEC-897 (section D).
- **Caravans:** parked; DEC-777 wins; DEC-090 and UI-064 are parked to match.
- **The 84-gap triage:** 31 needed for 1.0, 16 moved to 1.1, 37 closed; 15 left, all parked mechanics (DEC-901). The last 15 close with a one-line tool fix (step 59).
- **Lenka's reveal:** `n4-finding-the-tome` is right (D-01 chapter 3, DEC-892); the gallery cloth over Ludmila's canvas is never lifted. The continuity guides are fixed; `packs/dracula/script.yaml` needs one change, parked with 1.2 (step 61).
- **C5-02 and DEC-549:** removed from C5-02; DEC-549 is 1.1. EV-03 reads "nothing but wounds ends it".
- **DEC-778 and DEC-780:** decided as edited by D-02; Q-426 and Q-427 are answered (DEC-850, DEC-851), so Bob's hold in DEC-786 is met.
- **PT-24, iPad sound:** DEC-903: no iPad plays sound; the per-iPad "Enable sound" step and its copy are removed (code step 60).
- **PT-01:** deferred to 1.1 (Gamewright, via Warden). DEC-904 is withdrawn.
- **C2-10, C2-11, C2-13:** Bob's tower run is Mon Nov 16; they follow it.
- **#384:** finish it after #393, no split (Warden, 2026-11-12). Steps 51 and 57 wait for it.
- **1.1 timing:** after 1.0 (Bob, via Warden).

### Still open for Bob (via Warden)

1. **Locks the rulings touch.** Gamewright's note says none reverses a Bob lock without his word, but three sit close:
   - **Caravans:** Bob accepted DEC-777 (parks) on 2026-11-05, then "accept all" on UI-064 on 2026-11-06. Gamewright read the scope decision as the later deliberate word and parked both. If Bob wants caravans in 1.1, DEC-090, UI-064 and AST-B25 un-park together.
   - **Charon:** DEC-902 applies the lock to The Ruined Keep's Loremaster as well as Dracula's. A1-art-specs said no source approved Charon for the Ruined Keep. If Bob meant Dracula only, the Ruined Keep voice reopens at G-A1.
   - **PT-24:** removes Bob's locked per-iPad "Enable sound" copy of 2026-10-31 10:33 AM ET and the 6:15 PM board-line rule on the no-tower track. Warden cleared it; Bob should know. Loremaster signs off the removed strings (step 45).
2. **Re-approval of amended evals.** The rulings and the playtest change the evals of C2/04, C2/05, C2/11, C3/08, 10, 15, 17, C4/02, 09, 10, 13 and C5/02 (step 44), and CU/01 and CU/02 await first approval. An approved eval.md that changes needs a new approval row from Bob. A batch approval is fine.
3. **PT-05's tower label is parked** because the playtest tags it 1.1. It is a small field in step 06's record. Say so if Bob wants it in 1.0.
4. **C2-12** stays a parked stub, not scheduled. Say so if it should be.

## H. Rulings (Gamewright, 2026-11-12)

From `research/game-design/playtests/2026-11-12-paper-playtest-v1-v1.2.md` and the catch-up rulings note. Gamewright's design calls (Bob's standing rule, relayed by Warden). None reverses a Bob lock. The queue step that carries each is in README.md. 1.0 only; the 1.1 parts are parked.

- **PT-02:** the fallen-buildings loss is 4 buildings anywhere on the board. A new DEC replaces DEC-044; AREA-043 is reworded. The code already works this way (`fallenLimit`).
- **PT-03:** one record per game id; a quit stamps it `quit`; Continue reopens it and the final outcome overwrites it. Totals and averages count won and lost records only.
- **PT-04:** "best" is the shortest win keyed by story, length, difficulty and party size. First win shows "Best: this game"; a loss or no earlier win shows "No win yet to compare".
- **PT-06:** splitting the party doubles moves. A placeholder `day.shifts.per_split_group: -1` (floor 2). The P-008 probe is parked; the placeholder ships.
- **PT-07:** a no-tower skull drop goes to the standing building with the fewest skulls in the d4 kingdom, ties by seed; one stacked line per skull; if no building stands, reroll the kingdom once.
- **PT-08 (1.0 half):** Continue's piece check lists every piece the 1.0 game keeps on the physical board; app-only state needs no check.
- **PT-10 (1.0 half):** placeholder Short (about 90 min) and Standard (about 2 h) targets; the event log records tap counts and the game's active length.
- **PT-13:** keep UI-037; retire UI-038; add UI-037, UI-013 and UI-045 to C3 `Builds:`.
- **PT-15:** the Story board shows hero cards during Pick; the iPad words "Pick Hero A" and the rest are unchanged.
- **PT-16:** DEC-571 first-time hints, a "Hints" toggle on Game settings (default on) and the Rules page go into C3.
- **PT-17:** a hero one corruption from defeat gets a mark on the band and a warning line on the Fight/Retreat board line. Display only.
- **PT-18:** Split and Rejoin are queued gear actions taking effect at the next day start; no daily Regroup prompt.
- **PT-19:** Back undoes a move-map tap until a trigger fires; the gear gets "Fix my position".
- **PT-20:** a seat silent for 30 seconds in battle gives the other iPads "Pick for <hero>", default Guard. 30 s is a tuning placeholder.
- **PT-21 (1.0 half):** chapter end shows the story first, then one "Set the table" step (lit seal, freed skulls, quest tokens).
- **PT-23:** toolbar order: "?" left, Back and Replay centre, gear right.
- **PT-24:** DEC-903, as above.

Parked with 1.1 (tagged 1.1 in the playtest, or its 1.1 half): **PT-01** (UI-051, 053, 056 stay as they are; DEC-904 withdrawn; the fix, words plus physical pieces restoring DEC-189 and DEC-353, is recorded in the playtest), **PT-05** (tower label per record; the P-008 tower cell), **PT-09** (nothing to build; caravans parked), **PT-22** (traitor deadline), the Warden, hunters and drums half of PT-08, the Long target and 4-hour warning in PT-10, and the glyph and traitor chores in PT-21.

What these supersede, for visibility: DEC-044 (Bob, 2026-10-20; Gamewright reads Bob's 2026-10-31 approval of Q-C3-05 as the later word), the 2026-10-25 centred Menu position (DEC-227, UI-032), UI-064 and DEC-090's 1.1 tag, the daily Regroup step of MEC-034 .38, UI-038, and the per-iPad "Enable sound" copy (PT-24).

Warden also decided: Loremaster fills the Copy tables before 1.0 screens build, with no waiver.

Not carried here (not in the rulings I received): PT-11, PT-12, PT-14, PT-25 to PT-35.

## I. Sources checked

`research/game-design/cards` (DEC, AREA, Q, UI, CUE), `research/game-design/specs/dracula/D-01` to `D-06`, `lenka-look.md`, `research/stories/dracula-v2/continuity-guide.md`, the playtest doc `2026-11-12-paper-playtest-v1-v1.2.md` (read from the box; not yet on main), `catchup-rulings-2026-11-12.md` and `catchup-gap-triage-2026-11-12.md` (Gamewright's patch, read from a scratch clone, not yet on main), `apps/bloodtower/plans/**` (C2 to C5, A1, A1-P2 runbook, 1.0-milestones), `packs/**`, and the code at main dc36df3.
