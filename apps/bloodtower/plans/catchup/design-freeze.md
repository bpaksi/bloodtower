# Design freeze: what is locked (2026-11-12)

Drafted 2026-11-12 by Gamewright's planning pass, revised the same day for Gamewright's paper playtest (section H). This is a list of locks and the questions they raise. **This file decides nothing new**; the playtest rulings in section I are Gamewright's own design calls, recorded here. Where two sources disagree, or a lock is unclear, it is a question in section G, not a ruling. DEC-610 applies: a card beats an old design doc, and a known conflicting line carries a "Superseded by" note.

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
- Cursor use is capped at the even weekday share, never weekends (Bob, via Warden).
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
2. **Charon is the locked Loremaster (narrator) voice** (D-01, Bob 2026-11-10).
3. **The C2-07 play-again board line stays as is** (Bob, Nov 10). Main has two lines ("Play again?" and the EV-14 confirm line); Warden moved the choice to Gamewright (step 47).
4. The Vellmoor cover is repainted in oil to match the scenes, replacing the sepia cover (DEC-893). Release 1.2.
5. Bob's go of 2026-11-10: the whole Dracula design finishes Thu 2026-11-12 (D-01 to D-06 under `specs/dracula/`).
6. A1 step 8b added and split (8b-1 demo pack and job, merged #413; 8b-2 demo playback, the proof step for G-A1-01), Bob 2026-11-10.

## E. 1.1 locks (headline)

111 decided 1.1 DECs, 18 UI, 5 CUE, 8 AREA, 34 Q, 18 IDEA. The ones that shape the work: companions belong to one hero and can fall or walk out (DEC-066, 071); evil NPC kinds (DEC-073); caravans are out: DEC-777 wins and UI-064 is parked (PT-09); the adversary hunts the most-skulled building (DEC-052); a lead opens a side quest (DEC-525); cursed items give their holder a corruption (DEC-169, 522); a hero holds up to 4 treasures (DEC-424); Suspicious and Weak corruption caps (DEC-467, 469); glyph boosts (DEC-597); shared NPC faces under neutral lines (DEC-333 to 348); Inventive cannot end the boss battle or a Tower room battle (DEC-549). Parked and staying out: moving quests, caravans, special tokens, false death as an ending, the tavern (DEC-777).

## F. 1.2 (Dracula) locks (headline)

75 decided 1.2 DECs. One hidden goal for the Count per game, set by the seed (DEC-742); the Count is a figure on the board (DEC-743); each goal sets three things (DEC-748); three objects open the castle gate (DEC-749); Lenka starts free and travels as a companion the heroes can lose, and a lost Lenka is taken to the castle (DEC-741, 746); the wight swap (DEC-751); gear and potion names (DEC-752); Short plays 8 quests, Standard 12 (DEC-753); naming pass (DEC-754, 755); the Count looks ageless (DEC-756); five Tomb games (DEC-769 to 773); Dracula castle rooms use the Tower's room kinds (DEC-780, but see question 8); the earth box adds a skull a day (DEC-779); Lenka's face and the oil cover (DEC-892, 893); the VO manifest is DRAFT for 255 lines, Charon narrator (D-06).

## G. Questions

### Settled since the first draft (Warden, 2026-11-12, and the playtest)

- **Copy tables** (was question 5): no waiver. Loremaster fills the Copy tables before any 1.0 screen builds (step 45).
- **C3-08 corruption** (was question 4): the ruling moved from Bob to Gamewright (step 46).
- **C2-07 play-again text** (was question 3): moved to Gamewright (step 47).
- **Caravans** (was question 6): they stay parked; DEC-777 wins and UI-064 is parked (PT-09, steps 42 and 48).
- **The 84-gap triage** (was question 10): Gamewright's, docs only (step 48).

### Still open for Bob (via Warden)

1. **Charon: locked or provisional?** D-01 says locked (Bob 2026-11-10). The A1 runbook (D48) and the D-06 manifest still say "Charon (provisional)" and "Bob's to confirm or change at G-A1". Does the G-A1 confirmation still happen, and does the lock cover The Ruined Keep's Loremaster as well as Dracula's?
2. **Where does Lenka's reveal happen?** DEC-892 and lenka-look.md put the face change at `n4-finding-the-tome`. `research/stories/dracula-v2/continuity-guide.md` has a banner saying so, but its body still says the reveal is the gallery and "Lenka's face must not show" before it: line 188, the Tome constants (line 291), the gallery constants (line 317), line 331, and the N-1 and N-3 rows (line 446: "Reveal = n5-portrait-gallery.04"). `packs/dracula/script.yaml` on main still has Agnes pulling the cloth at `n5-portrait-gallery.04`, and the older `research/stories/dracula/continuity-guide.md` is the same. The new Loremaster draft groups are not yet in the pack. Gamewright can mark the old lines superseded; is the gallery cloth still a reveal for Ludmila only?
3. **PT-01, one line.** Four 1.1 UI cards (UI-051, UI-053, UI-056, UI-064) were bulk-accepted on 2026-11-06 after Bob's no-map rulings. Gamewright rewrites them to words plus physical pieces, restoring DEC-189 and DEC-353. Bob should know so the bulk acceptance is not read as a reversal.
4. **PT-24, does any iPad ever play sound?** Every iPad taps "Enable sound" (copy locked by Bob 2026-10-31 10:33 AM ET) but DEC-201 says all sound plays on the Story board. If iPads play nothing the locked copy goes. Not Gamewright's to call.
5. **Re-approval of amended evals.** The playtest changes the evals of C3/10, 15, 17, C4/02, 09, 10, 13 and C2/11 (step 44), and CU/01 and CU/02 await first approval. An approved eval.md that changes needs a new approval row from Bob. A batch approval is fine.
6. **C5-02 lists DEC-549** (release 1.1) in a 1.0 brief; DEC-696 says 1.0 builds 1.0 cards only. Keep or remove?
7. **DEC-778 and DEC-780** (1.2) show as unsettled conflicts in `pnpm graph gaps`; DEC-786 accepted PR #371's proposals except DEC-775, 778 and 780, but D-02 treats them as accepted. Which stands? (A card status for Gamewright to record once Bob answers.)
8. **C2-10, C2-11, C2-12, C2-13.** Bob's tower run (C2-10) is parked, and C2-11 (the Continue piece check, step 58) waits on it. C2-12 and C2-13 are parked stubs, and #229 and #366 already landed iPad corners. When does Bob do the run, and is C2-13 closed or unparked?
9. **#384: finish or split?** I lean toward finishing it after #393 and a conflict fix by Anvil, since EV-19 landed separately in #391. The new steps 51 and 57 wait for it either way.
10. **1.1 planning against the freeze.** DEC-785 and DEC-831 need new design work (deliverables AREA-119, script AREA-121) before 1.1 can be briefed. Start while 1.0 builds, or only after 1.0?

## H. Playtest rulings (Gamewright, 2026-11-12)

From `research/game-design/playtests/2026-11-12-paper-playtest-v1-v1.2.md`. These are Gamewright's design calls (Bob's standing rule, relayed by Warden). None reverses a Bob lock; each becomes a DEC card or card edit in step 43. The queue step that carries each is in README.md.

- **PT-01 (blocker):** the board never draws a token, path or ring. The threat bar and the day's effects panel say it in words with the printed space name (DEC-225); the table moves the physical piece and taps Done (MEC-034 .27); a showing glyph is an icon and a line in the edge band's kingdom list (DEC-764). UI-051, UI-053, UI-056 and UI-064 are rewritten. Restores DEC-189 and DEC-353.
- **PT-02:** the fallen-buildings loss is 4 buildings anywhere on the board. A new DEC replaces DEC-044; AREA-043 is reworded. The code already works this way (`fallenLimit`).
- **PT-03:** one record per game id; a quit stamps it `quit`; Continue reopens it and the final outcome overwrites it. Totals and averages count won and lost records only.
- **PT-04:** "best" is the shortest win keyed by story, length, difficulty and party size. First win shows "Best: this game"; a loss or no earlier win shows "No win yet to compare".
- **PT-05:** the record stores a tower label (on, off, dropped mid-game) and the stats screen shows it. P-008 gets a tower cell; the 80% floor is for no-tower play, tower play must not exceed 95%.
- **PT-06:** splitting the party doubles moves. A placeholder `day.shifts.per_split_group: -1` (floor 2); P-008 plays a splitting policy and tunes it to within 5 points of a staying policy at hard.
- **PT-07:** a no-tower skull drop goes to the standing building with the fewest skulls in the d4 kingdom, ties by seed; one stacked line per skull; if no building stands, reroll the kingdom once.
- **PT-08:** Continue's piece check lists every piece the game keeps on the physical board, including the 1.1 Warden, hunters and drums; app-only state needs no check.
- **PT-09:** caravans stay parked; DEC-777 wins; UI-064 and DEC-090's 1.1 tag are parked.
- **PT-10:** placeholder evening-length targets (Short about 90 min, Standard about 2 h, Long about 3 h); the event log records tap counts and the game's active length.
- **PT-13:** keep UI-037; retire UI-038; add UI-037, UI-013 and UI-045 to C3 `Builds:`.
- **PT-15:** the Story board shows hero cards during Pick; the iPad words "Pick Hero A" and the rest are unchanged.
- **PT-16:** DEC-571 first-time hints, a "Hints" toggle on Game settings (default on) and the Rules page go into C3.
- **PT-17:** a hero one corruption from defeat gets a mark on the band and a warning line on the Fight/Retreat board line. Display only.
- **PT-18:** Split and Rejoin are queued gear actions taking effect at the next day start; no daily Regroup prompt.
- **PT-19:** Back undoes a move-map tap until a trigger fires; the gear gets "Fix my position".
- **PT-20:** a seat silent for 30 seconds in battle gives the other iPads "Pick for <hero>", default Guard. 30 s is a tuning placeholder.
- **PT-21:** chapter end shows the story first, then one "Set the table" step.
- **PT-22:** the traitor deadline is said in the first clue and shown on the threat bar.
- **PT-23:** toolbar order: "?" left, Back and Replay centre, gear right.

What these supersede, for visibility: DEC-044 (Bob, 2026-10-20; Gamewright reads Bob's 2026-10-31 approval of Q-C3-05 as the later word), the 2026-10-25 centred Menu position (DEC-227, UI-032), UI-064 and DEC-090's 1.1 tag, the daily Regroup step of MEC-034 .38, and UI-038.

Warden also decided: Loremaster fills the Copy tables before 1.0 screens build, with no waiver; C3-08 and the C2-07 play-again text go to Gamewright; caravans and the 84-gap triage are Gamewright's.

Not carried here (not in the rulings I received): PT-11, PT-12, PT-14, PT-24 to PT-35.

## I. Sources checked

`research/game-design/cards` (DEC, AREA, Q, UI, CUE), `research/game-design/specs/dracula/D-01` to `D-06`, `lenka-look.md`, `research/stories/dracula-v2/continuity-guide.md`, the playtest doc `2026-11-12-paper-playtest-v1-v1.2.md` (read from the box; not yet on main or in an open PR on 2026-11-12), `apps/bloodtower/plans/**` (C2 to C5, A1, A1-P2 runbook, 1.0-milestones), `packs/**`, and the code at main dc36df3.
