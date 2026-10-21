# Statistics

Status: **rewritten 2026-10-21** from Bob's decisions DEC-105 to DEC-107 and DEC-115 to DEC-117 (cards in `cards/`). This replaces the draft of 2026-10-14, which predated one turn being one day and the removal of warriors and spirit. Design only: the data model below is design-level, not migration code.

## Requirements

R-STA-1 to R-STA-11 in [requirements.md](requirements.md) §8: detailed per-game stats in SQLite; an append-only event log as the source of truth; local and exportable; null, not zero; the seed and pack version on every game; per-player attribution.

## What players see

The numbers are for the players first (DEC-105). There are three places:

| Where | What | Card |
|---|---|---|
| **End of each day** | Only the effects of that day's events. No recap, no numbers | DEC-115 |
| **End of the game** | How it ended (the win, or the reason for the loss). Start and end clock times. Active length (pauses left out) against the best and the average for the same story, length and difficulty, where the best is the fastest win. Total win/loss, and win/loss for this story | DEC-116 |
| **Party join** | On each hero's card: "Played 6, won 4" across every story | DEC-117 |

## How it is recorded

- **The event log is the source of truth** (DEC-107). Every roll, move, choice, fight, purchase, hero claim and tower cue is one row, never changed or deleted. Each row carries the game's seed and pack version.
- **Every stat is computed from the log.** There are no summary tables for now. One can be added later if a screen is slow. A stat thought of later can still be counted for past games.
- **Bloodtower's existing records become kinds of event:** its timing marks and control presses (spec D6, D29, D31). Active time is computed as it is today: pauses are left out, overlapping pauses count once, and an open pause makes active time unknown, not zero.
- **Errors are not stats.** They go to the error log (research/decisions/0003-error-logging.md).

## Data model (design level)

| Table | Meaning | Key fields |
|---|---|---|
| **games** | One game, from Begin to its end | id, story_id, pack_version, seed, length, difficulty, started_at, ended_at, outcome (won/lost/abandoned), outcome_reason |
| **sessions** | One sitting; a game may span several (save and resume) | id, game_id, started_at, ended_at, end_reason |
| **game_heroes** | A pool hero as played in a game | game_id, hero_id, device_id |
| **events** | The append-only log | id, game_id, session_id, day, seq, at (UTC), monotonic_ms, type, actor (hero, group, NPC, tower, system), device_id, location, payload (JSON) |

The end-of-game numbers come from `games` (outcome, length, difficulty, times) and from the events that mark pauses. The hero records come from `game_heroes` joined to `games`. A pack's own counters (R-STA-7) are events of a pack-named type with a number in `payload`, so they need no new tables.

## Still open

- Graphs over time (R-STA-3) and anything shown beyond the three places above.
- Sync between machines, log retention, and a live dashboard ([open-questions.md](open-questions.md)).
