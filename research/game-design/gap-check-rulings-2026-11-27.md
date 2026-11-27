# Gap-check rulings, 2026-11-27

Bob, via Warden, on the v1.0 gap check. Batches 1 to 3. Design only. The cards are the rules. This note is the index.

The seat-order tie-break under batch 1 B2 is the default from DEC-556. Bob did not specify a tie-break. It is written on DEC-646 so a test can name the hero: the first of the tied heroes in the start-assignment list.

## Batch 1

| Id | Ruling | Cards |
|---|---|---|
| A1 | Retreat costs the same everywhere, including between Tower rooms. The Tower free exit, the free Retreat, and DEC-687's no-move exception are retired. Tomb and day-close retreats are unchanged. | DEC-687, DEC-360, DEC-566, MEC-076 |
| A2 | The Warden's battle allows a retreat. Damage already taken is kept. | DEC-360, DEC-567 |
| B1 | Battle reward gold and the 10-gold quest payout are split evenly per hero. | DEC-120, DEC-178, DEC-700, DEC-827 |
| B2 | An uneven remainder goes to one hero: the richest on a loss, the poorest on a gain. All of it, not one each. A tie is the first in seat order. | DEC-646, DEC-177 |
| C | DEC-821, DEC-822, DEC-824 and DEC-826 are confirmed for 1.0. No longer provisional. | DEC-914, and those four |
| D1 | With a solo hero, Pick for shows on the board. | DEC-928 |
| D2 | With one hero present, the reward card goes to that hero. | DEC-120, UI-040 |
| D3 | A silent or absent finale seat gets Vote for, as Pick for, including the solo board. | DEC-954 |
| #446-1 | The 1.0 level-3 reward deck is gold only. | DEC-120, DEC-547 |
| #446-3 | The guard-prompt check is in C4/03. The Tower part is in C5/01. | DEC-680 |
| #449-1 | An unset length deals a Standard tomb, 6 or 7 rooms. | DEC-603 |

## Batch 2

| Id | Ruling | Cards |
|---|---|---|
| E1 | When Retreat is not offered, the round goes straight to the action picks. | DEC-313, MEC-038 |
| E2 | The Stairs state shows Climb and Retreat. | DEC-566 |
| F1 | G-C4 adds a no-tower play of the same three moments. No Cursed check and no chapter 1–2 seal check are added. | the C4 gate line |
| F2 | One of the two G-1.0 games is no-tower. | C5/10 eval |
| #447 | The Ward and boss-deck end-to-end check moves to C5/02. C4/04 does not require it. | C5/02 eval |
| #448 | The engine names which 4 Advantages counted. | DEC-466 |

## Batch 3

| Id | Ruling | Cards |
|---|---|---|
| #449-3 | QD-02 and QD-04 checks are on the #591 follow-up, not on #449's own list. | C4/06 eval |
| #449-4 | In a split party, only the group holding the Signet can open The Lock. | DEC-674 |
| #450 | Chapter 3's seal, The Warden's Seal, plays live before the Tower. | DEC-303 |
| #451-1 | A loss in chapter 1 or chapter 3 ends the game, as chapter 2 does. | C4/08 eval |
| #451-2 | `km.battle_won` and `km.tomb_cleared` are key-moment kinds. | DEC-955 |
| #451-3 | Best time's key also includes the end rule. | DEC-917 |
| #453-1 | The retreat guard prompt is an iPad state of the round picker. | DEC-680, UI-027 |

## Batch 4 (Bob, 2026-11-27, via Warden)

| Id | Ruling | Where |
|---|---|---|
| #455 | A threshold state, On guard or Leave | C4/12 EV-19 |
| #456 | Done-when is EV-01 through EV-24 | C4 plan feature 13. The brief already listed EV-24 |
| #459-2 | Every hero falling in a Tower battle loses the game. A fall on the board does not | DEC-956, DEC-119 |
| #462-1 | The order is the end hook, then the flag, then the outcome | C5/04 EV-06 |
| #462-2 | #462 updates or retires the broken end-switch specs. No new e2e step | see Issue ledger |
| #463 | Dependencies recorded below. The issue is not edited in this PR | see Issue ledger |

## Batch 5 (Bob, 2026-11-27, via Warden)

| Id | Ruling | Where |
|---|---|---|
| #464-3 | Solo (1-hero) games stay out of the sim | C5/06 |
| #466-1 | After a second finale-vote tie the board says "Tied again. The draw decides." (`tie.again`, Loremaster 2026-11-27), then `board.decided`. The line does not name the result. Pack id if voiced: `finale-tie.again~vo-01` | C5/09 copy table and EV-02 |
| #594 | A phone is not a supported 1.0 device. Drop phone-viewport work from 1.0 Done-when. Keep the iPad, including the opacity-aware contrast check at 768×1024 | DEC-958 |

## Gamewright, 2026-11-27, under Bob's delegation via Warden

| Id | Ruling | Where |
|---|---|---|
| #464-1 | 300 headless games in all: 100 at 2 heroes, 100 at 3, 100 at 4. The old 900 is retired | C5/06 EV-01, EV-03 |
| #464-2 | v1.0 targets are DEC-823's band on three Standard cells (DEC-959). About 80% is the floor. Above about 95% is flagged, not tuned down | DEC-959, C5/06 |
| #464-4 | The two table playtests are G-C3 (#617) and G-C4 (#618). No new playtests | C5/06, and the ledger |
| #590 | Touches and the meaning of concurrent load | see Issue ledger |
| #595 | Depends on #593. Mockups already match DEC-233 (Bob, 2026-11-22). No new mockup approval | C3/13 and C3/14 approval notes |
| #611 | A guarded hit is DEC-319 / DEC-556, not 0. EV-10: unguarded 2 HP, guarded 1 HP on the guard | DEC-129, DEC-680, C4/02 EV-10 and EV-13, C4/10 EV-14 |
| #615 | Touches | see Issue ledger |
| #616 | Three waiting specs | see Issue ledger |
| #619-1 | Tower UI cards are filed in this PR, ahead of #465 | UI-066, UI-067 |
| #638-1 | A group with 0 present heroes cannot run a quest and is not paid. An illegal state, not a payout of 0 | DEC-957 |

## Issue ledger (not edited on GitHub; Bob edits the issues after review)

- **#462 Touches** gains the broken end-switch specs it updates or retires: `c4-tuning-switches`, `f1-04-chapter-one-win`, and `c3-game-end`. No new e2e step is filed for them.
- **#463 depends on** #465, #466, #467 and #619.
- **#464 depends on** #617 (G-C3) and #618 (G-C4).
- **#590 Touches** gains `apps/bloodtower/src/assets/needs/demoPack.test.ts` and `apps/bloodtower/src/engine/loops/battle/battle.test.ts`. #590 only stabilizes those two under-load timeouts. It does not take the battle-loop wiring from #445. Concurrent load means the CU/17 under-load condition already cited on #590, not a new stress test.
- **#595 depends on** #593.
- **#615 Touches** gains `c3-chapter.spec.ts`.
- **#616** takes the three unassigned waiting specs from CU/17 PR 7: `c2-continue-check`, `c3-outcome`, and `c3-stats`. #637 also edits `c3-stats`, so those edits land in coordination with #616. They do not move to #614 or #615.
- **#594 Done-when:** drop phone-viewport behavior. Keep the opacity-aware contrast check on the iPad.

## Left open

- #446: what a reward deck holds at levels other than 3.
- Which of the two finale options Vote for selects (DEC-954). The second-tie line is Loremaster's "Tied again. The draw decides." It does not name the result.
- Whether a real game can reach a group with 0 heroes (DEC-957 guards it either way).
- Any gap these batches do not name.
