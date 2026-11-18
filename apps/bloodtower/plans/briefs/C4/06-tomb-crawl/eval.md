Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 06-tomb-crawl — The Tomb: The Barrow's rooms, traps, listening and the hidden guardian

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-18; survival evals last (EV-14, EV-18).
- Amended 2026-11-18: EV-15 to EV-18 moved from F1 / 01-tomb-to-battle (#505), Bob 2026-11-18 7:12 AM ET (F1 became cards-only). Needs Bob's new approval row.

## Checks

### EV-01 — 6–7 rooms on a 4×4 grid, guardian 2–5 doors deep
- Requirement: DEC-491, DEC-603, DEC-604.
- Method: unit
- How: 100 seeds at Standard length.
- Pass evidence: 6 or 7 rooms (guardian's included) on a 4×4 grid, entrance on an edge cell; the guardian 2–5 doors from the entrance by the shortest path; at least 1 battle and 1 trap; up to 3 corridors each.
- Fails if: any count outside 6–7, the guardian outside 2–5 doors, no battle or no trap, or a room with more than 3 corridors.

### EV-02 — Each room is nothing, battle or trap
- Requirement: DEC-488.
- Method: unit
- How: enter every room.
- Pass evidence: one of the three per room.
- Fails if: other kind.

### EV-03 — Listening is wrong 1 in 5
- Requirement: DEC-586, DEC-618.
- Method: unit
- How: (sim) 10,000 seeded listens.
- Pass evidence: wrong rate 0.20 ± 0.01 (`tomb.listen_wrong` = 0.2); the hint is the room kind only (nothing, trap or battle), never which foe or trap.
- Fails if: outside.

### EV-04 — A listened corridor is entered on guard
- Requirement: DEC-587.
- Method: unit
- How: listen then enter a battle room.
- Pass evidence: group on guard in round 1.
- Fails if: not.

### EV-05 — Guardian at the quest's level +1 gives the Signet
- Requirement: DEC-662, DEC-608.
- Method: unit
- How: (sim) beat the guardian.
- Pass evidence: a battle against the quest's foe at the quest's level + 1; Signet to the group; quest done.
- Fails if: no Signet.

### EV-06 — A trap costs its flat loss
- Requirement: DEC-489, DEC-606.
- Method: unit
- How: with 2 present heroes at 10 HP, enter a Falling Rocks room, then a Pit room where the group picks hero 1.
- Pass evidence: Falling Rocks: each hero 8 HP; Pit: hero 1 loses 4 more (4 HP); a hero who can't pay in full pays what they can and takes a corruption; each room is marked cleared.
- Fails if: no loss, a battle, or the room stays live.

### EV-07 — Retreat leaves the Tomb
- Requirement: DEC-497.
- Method: unit
- How: retreat from a battle room.
- Pass evidence: the group stands on The Barrow's board space; the Tomb state is kept.
- Fails if: the group stays inside or the layout resets.

### EV-08 — Spells come back on each visit
- Requirement: DEC-652.
- Method: unit
- How: cast Fireball, leave, re-enter.
- Pass evidence: Fireball usable again.
- Fails if: still spent.

### EV-09 — The layout is built on first entry only
- Requirement: DEC-602.
- Method: unit
- How: seed S; inspect state before entry, after entry, after a second entry.
- Pass evidence: no layout before; a 7-room layout after; identical after the second.
- Fails if: a layout before entry, or a new one on re-entry.

### EV-10 — Short length deals 4–5 rooms
- Requirement: DEC-603.
- Method: unit
- How: 100 seeds at Short.
- Pass evidence: 4 or 5 rooms each, guardian's included.
- Fails if: any other count.

### EV-11 — The deal is 40/30/30
- Requirement: DEC-604.
- Method: unit
- How: (sim) 10,000 seeded tombs; count non-guardian rooms.
- Pass evidence: nothing 0.40 ± 0.02, battle 0.30 ± 0.02, trap 0.30 ± 0.02; every tomb has at least 1 battle and 1 trap.
- Fails if: any rate outside, or a tomb with no battle or no trap.

### EV-12 — Battle rooms hold the quest's foe at the quest's level
- Requirement: DEC-608.
- Method: unit
- How: enter every battle room of a level-2 quest's tomb.
- Pass evidence: each battle is the quest's foe at level 2.
- Fails if: another foe or level.

### EV-13 — Listening is free, unlimited and plays a room-kind sound
- Requirement: DEC-587, DEC-618.
- Method: unit
- How: listen 5 times down one corridor of each kind, with a seed giving true hints.
- Pass evidence: no move or gold spent; board sound `snd.listen_nothing` / `snd.listen_trap` / `snd.listen_battle` by kind, each time.
- Fails if: a cost, a refusal, or a wrong sound id.

### Moved from F1 (#505), Bob 2026-11-18 7:12 AM ET: the Tomb room and its foe across visits (EV-15 to EV-17)

Source: F1 / 01-tomb-to-battle eval.md and docs/audits/2026-11-12-f1-tomb-to-battle-package.md section 4. Fixtures: own-turn Tomb visit, zero corruptions unless set, no companion, guard, conditional Advantage, item or story effect unless named; foe level and status fixed. Rewards are release-appropriate (no gear, potion or treasure deck loot in 1.0). Rules: MEC-026 .16 (passes the stance and foe, applies nothing) and .18 (a battle room clears only on won).

### EV-15 — Another group meets the same foe (moved from F1 TB-10 / EV-10)
- Requirement: DEC-151, DEC-602, DEC-651, DEC-682: same room and foe, one fresh Bold cut.
- Method: unit
- How: Continue from C4 / 03 EV-12's save; second group of the same size; same level and status; new genuine visit with Bold.
- Pass evidence: same room and foe identity (not regenerated); one cut 7 to 6; room not pre-cleared.
- Fails if: the foe is refilled or regenerated, or the room starts cleared.

### EV-16 — Leave, and a guardian falling to Bold (moved from F1 TB-14 / EV-14)
- Requirement: DEC-490, DEC-491, DEC-494, DEC-821, QD-01.
- Method: unit
- How: A: Leave before opening the next room. B: the guardian falls to entry Bold in a safe fixture.
- Pass evidence: A: exits with no room, foe or reward change (leaving before entering clears nothing). B: guardian cleared, Tomb done, battle close once; only the quest wrapper pays the quest reward.
- Fails if: Leave clears a room or pays out, or the battle reward and quest reward double up.

### EV-17 — Entry, retreat and re-entry end to end (moved from F1 EV-15; R01 minus EE-01)
- Requirement: R01: exactly one stance effect, no actions after a terminal entry, a retreat leaves the room uncleared. The quest turn-end clause of R01 is EE-01 and stays out of scope.
- Method: playwright
- How: one spec under `apps/bloodtower/src/e2e/tests/` with seeded state. (a) Bold into a count-1 foe: the page goes straight to the won result with no Fight/Retreat buttons. (b) On guard into a 1-HP hero: straight to the fallen result with no action buttons. (c) A count-7 foe, Retreat, back at the Tomb: the room shows uncleared, then a second visit with Bold shows count 6. (d) Reload mid-battle after the cut and Continue: the count does not drop again.
- Pass evidence: each state is reached with the named buttons absent or present as stated; the counts are 0, 7 and 6 as stated; the reload leaves the count unchanged.
- Fails if: any action control shows after a terminal entry, the room clears on retreat, or Continue cuts again.

## Survival evals (one per survival invariant in plan.md)

### EV-14 — Rooms kept across Continue
- Requirement: DEC-602.
- Method: playwright
- How: clear 3 rooms, quit, Continue, re-enter.
- Pass evidence: same layout, 3 cleared.
- Fails if: new layout.

### EV-18 — An uncleared room survives restore (moved from F1 EV-16, room-flag part, Bob 2026-11-18 7:12 AM ET)
- Requirement: the F1 survival invariant: a retreated or fallen battle leaves the room uncleared with its living foe's count (DEC-497, DEC-651, DEC-675).
- Method: unit
- How: save and restore after a retreat and after a fall; resume; compare with an uninterrupted run. The entry-effect part of the same check is EV-32 in C4 / 02.
- Pass evidence: the room flag, the foe's count and the Tomb result equal the uninterrupted run.
- Fails if: a restore clears the room or loses the foe's count.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- Q-C4-07 ANSWERED by card DEC-608 (in commit 0005 "C4/C5 plans: fill the 14 [TBD] values"; not a Bob question). Card: "**Guardian:** the same foe, one level up." Source: research/game-design/cards/DEC-608.md. ~~Old option (a) level 3, as `tomb.guardian_level`; Gamewright pick (a)~~ (superseded by card DEC-608).
- Q-C4-08 ANSWERED by card DEC-603 (in commit 0005 "C4/C5 plans: fill the 14 [TBD] values"; not a Bob question). Card: "**Rooms, guardian's included:** short 4–5, standard 6–7, long 8–10, seeded within the range. / **Grid:** 4×4, 16 cells. The entrance is on an edge cell." Source: research/game-design/cards/DEC-603.md. ~~Old option (a) 7 rooms, guardian hidden in one of the last 3; Gamewright pick (a)~~ (superseded by card DEC-603).
- Q-C4-09 ANSWERED by card DEC-618 (in commit 0005 "C4/C5 plans: fill the 14 [TBD] values"; not a Bob question). Card: "**Wrong hints:** 1 in 5, seeded like the room (DEC-011)." Source: research/game-design/cards/DEC-618.md. ~~Old option (a) 1 in 4 (`tomb.listen_lie` = 0.25); Gamewright pick (a)~~ (superseded by card DEC-618).
