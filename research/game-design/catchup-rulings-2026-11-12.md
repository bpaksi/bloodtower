# Catch-up rulings, 2026-11-12

Gamewright, 2026-11-12. Design only. These answer Wright's catch-up plan, section G (`apps/bloodtower/plans/catchup/design-freeze.md`), and two playtest findings (PT-01, PT-24, from the paper playtest). Design rulings are Gamewright's under Bob's standing rule (relayed by Warden). Each ruling is a card or a card edit; this note is the index.

| # | Question | Ruling | Where |
|---|---|---|---|
| 1a | C3-08: EV-07 give action against DEC-544 | No give action in 1.0. DEC-544 stands. Selfish is one engine guard every card-passing rule must call; EV-07 tests the guard on a stand-in pass. | DEC-894; C3/08 eval EV-07 note |
| 1b | C3-08: old count-only saves | A save from before feature 08 is refused by Continue (a format version bump). No backfill. The five tuning keys are required, with no defaults. | DEC-895; EV-13 |
| 1c | C3-08: order of holders, Tempted and the free cure | Free cure first; Tempted +2 once per buy, last, never on a price of 0; each gold loss fires per holder from that holder's own part, in a fixed order. | DEC-896; EV-11, EV-12 |
| 2 | C2-07 play-again text | One dialog: title "Play again?", lines "Same heroes, a fresh board." and "This replaces the saved game. Are you sure?"; the board band line stays. | DEC-897; C2/07 screen-spec |
| 3 | Lenka's reveal | `n4-finding-the-tome` is right (D-01 chapter 3, DEC-892). The gallery cloth over Ludmila's canvas is never lifted. Guides fixed; `script.yaml` needs one change (below). | DEC-892 note; both continuity guides |
| 4 | Caravans | Parked. DEC-777 (Bob, 2026-11-05) stands; DEC-090 and UI-064 are parked to match. | DEC-090, UI-064, DEC-777 |
| 5 | C5-02 and DEC-549 | Removed from C5-02 (Builds, checklist, EV-03). DEC-549 is 1.1. EV-03 is reworded to "nothing but wounds ends it". | C5/02 plan and eval; C5 plan |
| 6 | DEC-778 and DEC-780 | Decided, as edited by D-02. Q-426 and Q-427 are answered (DEC-850, DEC-851), so Bob's hold in DEC-786 is met. The clash links are now `affects` and `refines`. | DEC-778, DEC-780, DEC-786 |
| 7 | 84 gaps | 31 needed for 1.0, 16 move to 1.1, 37 close. Result: 15 left, all parked mechanics (a tool fix). | catchup-gap-triage-2026-11-12.md; DEC-901 |
| 8 | Charon | Locked, and the lock covers the Ruined Keep's Loremaster too. Runbook, A1 notes and manifest updated. | DEC-902 |
| 9 | PT-24: iPad sound | No iPad plays sound. The per-iPad "Enable sound" step and its copy are removed. The tower volume step runs on the connect track only. | DEC-903; C2/05 and C2/04 briefs |
| 10 | PT-01: map on the Story board | Deferred. Bob (2026-11-12, via Warden): finish 1.0 before any 1.1 design. UI-051, UI-053 and UI-056 are 1.1 cards and stay as they are until 1.1 opens; the fix (words plus physical pieces, per DEC-189 and DEC-353) is recorded in the playtest. UI-064 is parked under ruling 4. | PT-01 |

## Cursed (Bob, 2026-10-31) against ruling 1

No conflict. Cursed stays out of C3's draw (EV-08). DEC-895 keeps a save with named corruptions valid when C4 adds Cursed. DEC-894 and DEC-896 do not touch it.

## Locks touched, for Warden

Nothing here reverses a Bob lock without his word already on it, but four items touch one:
- **Caravans (4):** Bob accepted DEC-777 (parks) on 2026-11-05, then "accept all" on UI-064 on 2026-11-06. I read the scope decision as the later deliberate word and parked both cards. If Bob wants caravans in 1.1, un-park DEC-090, UI-064 and AST-B25 together.
- **Charon (8):** the lock read as covering Dracula's narrator (D-01). A1-art-specs said no source approved Charon for the Ruined Keep. I applied it to both. If Bob meant Dracula only, the Ruined Keep voice reopens at G-A1.
- **PT-24 (9):** removes Bob's locked per-iPad copy of 2026-10-31 10:33 AM ET and the 6:15 PM board-line rule on the no-tower track. Warden cleared it.
- **PT-01 (10):** deferred to 1.1 by Bob's 2026-11-12 focus call. When 1.1 opens, it restores DEC-189 and DEC-353 over the cards he bulk-accepted on 2026-11-06.

## Copy strings removed (ruling 9), for Loremaster's sign-off

| String | Where it was |
|---|---|
| "Tap once to turn on this iPad's sound." | C2/05 `plan.md` (Sound first on Pick story), `screen-spec.md` (state 7a), `eval.md` (EV-14 M "7a", EV-15) |
| "Enable sound" (the primary button) | the same three files; `eval.md` EV-01, EV-09, EV-15, EV-16, EV-17; C2/04 `eval.md` (happy path) |
| "Tap Enable sound so this iPad can play the story's voice and sound." (Help text, key `enable-sound`) | C2/04 `screen-spec.md`, help table |
| The greyed-out board line "How loud should the tower be? Press one to hear it." during 7a (the line itself stays, at full strength, on the connect track only; it is gone without a tower) | C2/05 `plan.md`, `screen-spec.md`, `eval.md` EV-14 |

Code and the mockup are not changed here: the built Enter still has the step (`c2-play-again` and C2/05 specs), and `C2/05-session-enter/mockup.html` still has a 7a tab. A later build step removes them.

## `packs/dracula/script.yaml`: the exact change for Loremaster (ruling 3)

Not edited here. The pack's reveal is already at the Tome (`n4-finding-the-tome.06.vo-01`: "Ludmila's soul, Lenka's face"). One thing contradicts DEC-892: the gallery entry unveils a Lenka-faced canvas. In the entry `id: "n5-portrait-gallery.04"`:
1. Replace `n5-portrait-gallery.04.vo-01` (narrator, "At the end of the gallery, Agnes pulls the cloth from the last canvas. A girl in a white dress, holding mountain violets. Lenka's face.") with Loremaster's draft line from `script/group5-n5-portrait-gallery.md`: "At the end of the gallery hangs one canvas under a cloth that has never been lifted. You leave it be."
2. Delete `n5-portrait-gallery.04.vo-02` (agnes, "No. Ludmila's. The paint is four hundred years old. The face came back. The girl is upstairs."). It plays against the unveiling and has no place when the cloth stays on.
3. Record `n5-portrait-gallery.04.vo-02` as retired in `CONVERSION-NOTES.md`, and update the `needs.test` pins for one fewer line (lines 239 to 238; re-run the silent and reason counts, as for #425).
The rest of the draft Tome and gallery groups (`group5-n4-finding-the-tome.md`) reach the pack with the DEC-785 conversion, not here.
