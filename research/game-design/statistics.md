# Statistics

Status: **draft for Bob's review**, 2026-10-14. Design only: the data model below is design-level (tables, fields, meaning), not migration code.

## Requirements

R-STA-1 to R-STA-11 in [requirements.md](requirements.md) §8: detailed per-game stats in SQLite; append-only event log as source of truth; resources over time; encounters and combats; tower activity; roll-ups; pack counters without new tables; local, exportable; null not zero; seed and pack version; per-player attribution.

## Example stats shown to players

Win rate per story/difficulty, average session length, ticks used, warriors lost, gold earned/spent, most common encounter, deadliest encounter, keys found, riddle attempts, corruptions taken and cured (and by what), skulls dropped per kingdom, hero MVP, fun ratings over time.

## Data model (design level)

| Table | Meaning | Key fields |
|---|---|---|
| **stories** | Installed story modules | id, name, version, installed_at |
| **campaigns** | One playthrough of a story (one or more parts) | id, story_id, story_version, name, seed, difficulty, player_count, started_at, ended_at, status (active/won/lost/abandoned) |
| **games** | One part of a campaign, or a one-shot (the unit of "a game") | id, campaign_id, part_number, pack_version, seed, difficulty, starting_kingdom, outcome (won/lost/part_complete/abandoned), outcome_reason, final_clock_tick, fun_rating, notes |
| **sessions** | One sitting at the table; a game can span several (save/resume) | id, game_id, started_at, ended_at, end_reason (finished/saved/abandoned/crashed/conceded), host_device, tower_used (bool) |
| **devices** | Player iPads joined to a session | id, session_id, device_label, game_hero_id, joined_at, left_at |
| **heroes** | Hero templates in a story | id, story_id, name, class, base stats |
| **game_heroes** | A hero as played in a game | id, game_id, hero_id, joined_at_tick, left_at_tick, final stats, warriors_lost, encounters_won, status (active/fallen/absent) |
| **clock_ticks** | Each advance of the story clock | id, game_id, session_id, tick_number, chapter_or_night, kingdom, cause (action/skull drop/beat), at, beat_id |
| **events** | Append-only log of everything | id, game_id, session_id, tick_number, at, seq, type, actor (hero/NPC/tower/system), device_id (null = shared), location, payload (JSON details) |
| **encounters** | Each encounter or set piece played | id, game_id, tick_number, encounter_id, kind (random/set piece), location, kingdom, choice, outcome, clock_cost, resource deltas (JSON) |
| **combats** | Each fight | id, game_id, encounter_row_id, foe, foe_level, heroes involved, rounds, warriors_lost, result, rewards |
| **resource_snapshots** | Resource values over time | id, game_id, tick_number, at, resource, value, delta, cause_event_id |
| **inventory_changes** | Items, keys, allies gained/lost | id, game_id, tick_number, item (incl. keys), change (+/-), source (e.g. kingdom set pieces complete) |
| **tower_activity** | Tower cues and inputs | id, session_id, at, kind (cue/skull drop/seal/calibrate/disconnect/battery), capability_id, params, result (sent/rejected/failed/fallback), kingdom |
| **flags** | Story flags and custom counters | id, campaign_id, game_id, key, value, set_at_tick |
| **outcomes** | Final summary per game for fast stats | game_id, won, duration_minutes, ticks_used, warriors_lost, gold_net, keys_found, encounters_count, combats_won, combats_lost, skulls_dropped, mvp_hero |

Notes: `events` is the source of truth; the other tables are summaries kept for fast queries. Times stored in UTC and shown in local time.

## Open questions

See [open-questions.md](open-questions.md) (sync vs. local, log retention, live dashboard).
