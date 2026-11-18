Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: F1 / 04-wild-quest-enter — Enter a wild space that holds a live quest marker

- Brief: ./plan.md
- Mockup: none
- Risk: Med (turn flow; the first real win). Negative and restore evals are included.

All fixtures: D1, D4, F1/02 and F1/03 are merged. The real `packs/` folder on main (The Ruined Keep, story `test`, proving-grounds board): chapter 1 is `herald` at `N-egans-end` (a village) and `ambush` at `N-muted-forest` (wild, board name "Muted Forest"); `N-radiant-mountains` (the N citadel) is next to Muted Forest. The Ambush's options: "[COPY: Fight the raiders]" (a battle, hidden while `fight_enabled` is false) and "[COPY: Pay the toll]" (toll: 10 gold, or all the group's gold and 2 HP per present hero, never below 1). "Open" means `openQuestAt` returns the quest. Unit tests in `group-turn/wildQuest.test.ts` use `initPlayState` with `PROVING_GROUNDS_PLAY` and `configureQuestsFromPack` on the loaded story (chapter 1 current), one group of one hero, 0 skulls everywhere, unless named. Source: DEC-641, DEC-951, MEC-035, MEC-036.

## Checks

### EV-01 — Enter is offered on a wild space with an open marker, as at a building
- Requirement: DEC-641, DEC-951, MEC-035.
- Method: unit
- How: "EV-01". (a) The group starts its turn on `N-muted-forest` with 2 moves. (b) It starts on `N-radiant-mountains` with 2 moves and walks to `N-muted-forest`. (c) It starts on `N-radiant-mountains` with 1 move and walks to `N-muted-forest` (lands with 0).
- Pass evidence: in all three the open offers include `enter--<group>--N-muted-forest`; in (c) the turn waits (it does not exit) with Enter and End turn offered; the Enter action's label is exactly "Enter".
- Fails if: Enter is missing in any case, (c) ends the turn at once, or the label is anything else.

### EV-02 — No Enter on a wild space without an open marker
- Requirement: DEC-951, DEC-641, C3-19.
- Method: unit
- How: "EV-02". The group on (a) `N-broken-lands` (wild, no marker); (b) `W-the-grass-sea` (chapter 3's `last-stand`, not live in chapter 1); (c) `N-muted-forest` after `ambush` is marked done. In each, read the offers, then send `enter--<group>--<space>` anyway.
- Pass evidence: no Enter offered in any case; the forced press leaves `insideBuilding` false and changes nothing.
- Fails if: Enter is offered or the forced press is accepted.

### EV-03 — Building gates are unchanged
- Requirement: regression; C3/13 EV-10, DEC-910 (D4).
- Method: unit
- How: "EV-03". (a) A standing village, no marker; (b) a fallen village (4 skulls), no marker; (c) a fallen village with an open marker (D4's case).
- Pass evidence: (a) Enter offered; (b) none, and a forced press is refused; (c) Enter offered. Each as on D4's main.
- Fails if: any case differs from D4.

### EV-04 — The menu at a wild marker is Quest, then Leave, titled with the space's name
- Requirement: DEC-641, DEC-951, DEC-943, DEC-083.
- Method: unit
- How: "EV-04". The group enters `N-muted-forest` with 2 moves. Read `openMenu` and the building model.
- Pass evidence: `openMenu` entries are exactly `quest`, `leave`. The model's title is exactly "Muted Forest". The rows are exactly "Quest" ("1 move", enabled), then Leave. No Cleanse, Rest or other row. The building panel's `skulls` is 0. The board shows no place painting (`buildPlace` is null).
- Fails if: Cleanse or any other pick is listed, the title reads "Building", or a painting shows.

### EV-05 — Quest plays the pack's Ambush; the turn ends; the space is plain wild after
- Requirement: DEC-641, DEC-948, DEC-821, DEC-078, DEC-951.
- Method: unit
- How: "EV-05". Enter `N-muted-forest` with 2 moves and 15 gold in the group's purse; press Quest; read the buttons; press "[COPY: Pay the toll]"; read the menu; press Leave; read the offers on the group's next turn on that space.
- Pass evidence: Enter took no move (still 2); Quest took 1. The buttons are exactly "[COPY: Pay the toll]" and "Leave" (no Fight). After the toll: `ambush` done; the purse is 5 plus the quest gold F1/02 pays; moves 0; the menu has no Quest row and Leave is open. After Leave: `insideBuilding` false; on the next turn no Enter is offered on `N-muted-forest`.
- Fails if: Enter costs a move, Fight shows, the turn goes on after the quest, or Enter is still offered after it is done.

### EV-06 — Not a building for the stats; still wild at night
- Requirement: DEC-951, DEC-017.
- Method: unit
- How: `server/core/wildQuestWin.test.ts` "EV-06" (a shell game): (a) enter `N-muted-forest` (with its open marker) and leave; then enter the village `N-egans-end` and leave. Read `tally.buildings`. (b) End the turn on `N-muted-forest` after the Ambush; read `eventEligible` for the group at night.
- Pass evidence: (a) `tally.buildings` went up by exactly 1 (the village only). (b) `eventEligible` is true.
- Fails if: the wild Enter is counted, or the group is safe from the night draw.

### EV-07 — Leave partway keeps the progress and Enter stays
- Requirement: DEC-151, DEC-948, DEC-641.
- Method: unit
- How: `server/core/wildQuestWin.test.ts` "EV-07". Enter `N-muted-forest`, press Quest, then press the quest step's Leave; then Leave the menu. On the next turn there, read the offers; enter and press Quest.
- Pass evidence: `ambush` not done, its progress kept; the turn ended (F1/02); next turn Enter is offered and Quest resumes the same quest step with the same buttons.
- Fails if: the progress is lost, Enter is gone, or the quest restarts with a cost paid twice.

### EV-08 — Chapter 1 won in a real game through Enter on the wild marker
- Requirement: MEC-033 close, Q-C3-01, DEC-641, DEC-949 (F1/03).
- Method: unit
- How: `server/core/wildQuestWin.test.ts` "EV-08". A real game (as F1/03's fixtures), seed `f104-a~test-event:none`, with groups reaching `N-egans-end` and `N-muted-forest` by `walk` presses only. Do the Herald ("[COPY: Ask for pay first]") and the Ambush ("[COPY: Pay the toll]") through Enter and Quest presses; end the day.
- Pass evidence: the game ends at that day's end: outcome `won`, scene `win`, chapter 1; the record is written once; no next day starts.
- Fails if: the game goes on, a quest is done by an engine call rather than a press, or the record is written twice.

### EV-09 — End to end: chapter 1 won through normal play
- Requirement: DEC-641, DEC-951, DEC-948, DEC-949; G-C3's win.
- Method: playwright
- How: `apps/bloodtower/src/e2e/tests/f1-04-chapter-one-win.spec.ts`, iPad 768x1024 portrait, board 1920x1080. Pick The Ruined Keep on Pick story, claim heroes, set up and start as a player does, going on without the tower. The seed has **no** `~test-quest:`, `~test-at:`, `~test-skulls:`, `~test-gold:` or other `~test-` marker except `~test-event:none`. The runner picks the party size and seed so the groups can walk to both quests on the move map within the first days, and names them in the spec. Walk to Muted Forest; press Enter; read the title and rows; press Quest; read the buttons; press "[COPY: Pay the toll]"; press Leave. Walk to Egan's End; Enter; Quest; press "[COPY: Ask for pay first]"; press Leave. Play on to the day's end.
- Pass evidence: at Muted Forest the move map's Enter reads "Enter"; the menu's title is "Muted Forest" and its rows are exactly "Quest" ("1 move") and Leave; the quest's buttons are exactly "[COPY: Pay the toll]" and "Leave"; after the toll the menu has no Quest row. At Egan's End the first row is "Quest". At the end of the day both quests are done, the game ends, and its record is written with outcome `won` (read from the host's store, as `c2-play-again.spec.ts` reads game rows); the board leaves play.
- Fails if: no Enter at Muted Forest, any other `~test-` marker is in the seed, the game does not end won, or it ends before both quests are done.

## Survival evals (one per survival invariant in plan.md)

### EV-10 — Continue inside a wild marker's menu, and after leaving a wild quest partway
- Requirement: survival invariants 1 and 2; DEC-675, DEC-151.
- Method: unit
- How: `server/core/wildQuestWin.test.ts` "EV-10". Serialize and rehydrate the shell (a) inside `N-muted-forest`'s menu with 1 move left, before Quest; (b) after EV-07's partway Leave; (c) after EV-05's done Ambush.
- Pass evidence: (a) still inside; title "Muted Forest"; rows Quest ("1 move", enabled) and Leave; moves 1. (b) progress kept; the next turn offers Enter there. (c) `ambush` done once; no Enter there; no gold paid twice.
- Fails if: the group is put outside, the menu changes, the progress is lost, or the quest reopens.

## Assumptions surfaced
- "Enter", "Quest", "Leave", "1 move" and the space names are existing words and board data; nothing new is written.
- The Ambush's toll and gold follow whatever D5 and F1/02 merged; the tests read the purse change, not a new rule.
- The Barrow (chapter 2, a wild Tomb marker) gets the same Enter once chapter 2 is live (C4); its game is out of scope.
