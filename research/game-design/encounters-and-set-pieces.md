# Encounters and set pieces

Status: **draft for Bob's review**, 2026-10-14. Design only.

- **Random encounter:** short, drawn from a weighted table when the party moves, explores or a clock tick fires. Replayable.
- **Set piece:** authored scene tied to the story timeline or a place (tower wakes, recruiting, finale). Plays once per campaign unless marked repeatable.

## Requirements

Set pieces are R-SP-1 to R-SP-9; random encounters are R-RE-1 to R-RE-12, all in [requirements.md](requirements.md) §6–7. Key points:

- Built from catalog assets and names them (R-SP-2, R-RE-3).
- 2–3 choices with different costs, unless a pure hazard with a counter (R-RE-9).
- The 1981 counter pattern: scout vs. lost, healer vs. plague, dragonsword vs. dragon; Dracula: holy water/host vs. corruption (R-RE-10).
- Tables weighted by location, kingdom, phase, story part and threat (R-RE-1); no repeats in a row, per-session cap (R-RE-4).
- Each declares a clock cost (R-RE-11); outcome = one line + deltas, logged (R-RE-12).
- Tower cues fire automatically with a screen fallback (R-ENG-12, R-ENG-19); physical steps wait for confirmation (R-SP-8).
- Set pieces: trigger, ordered steps, outcomes that set flags (R-SP-1); once per campaign unless repeatable (R-SP-9); can feed key-earning (R-SP-4, R-ENG-18).
- Dialog: two speakers max; private lines name a target device; scripts use `[sfx: ...]`/`[music: ...]` cues (R-AV-3, R-AV-4, R-AV-6).

## Template

```
id:            ENC-FEL-001
name:          Brigands on the Road
type:          encounter | set piece
story / part:  fellowship / 1-3
trigger:       move into non-building space; weight 3; phase any
origin:        1981 Brigands (AST-O04)
assets:        AST-T04 battle sound, AST-T02 breathe on party's side, AST-B05 Brigands mini
setup text:    one or two lines
choices:       A ... (cost, odds) / B ... / C ...
checks:        stat + modifiers, done by the app
outcomes:      success / partial / failure, with resource deltas and flags
counters:      abilities or items that change it
clock cost:    ticks
tower cues:    per step, auto-fired, with fallback
media:         per moment still | clip; [sfx]/[music] cues
device:        shared | target hunter (private lines)
stats:         extra fields to record
repeat rules:  cap per session, cooldown
```

## Starter encounter table (fellowship)

| ID | Name | 1981 origin | Where / when | Choices and outcomes | Assets |
|---|---|---|---|---|---|
| ENC-FEL-001 | Brigands on the Road | Brigands | Road spaces, any part | Fight (lose warriors, gain gold), pay toll (gold), slip past (ranger check; fail = fight with no bonus) | Battle sound, Brigands mini, breathe lights |
| ENC-FEL-002 | Plague in the Village | Plague | Villages, weighted up when skulls are on the village | Treat (cleric/healer: spirit cost, gain hope), quarantine and leave (lose 1 tick), push through (lose warriors) | Flicker lights, skulls on village |
| ENC-FEL-003 | Lost in the Mists | Lost | Wilderness, mountains/forest | Ranger/scout: no loss; else lose 1-2 ticks or follow a stranger (random mini-encounter) | All lights off then back on |
| ENC-FEL-004 | The Dragon Stirs | Dragon | Ruins/tombs, Part 2+ | Flee (lose gold), fight (heavy warrior loss; dragonsword = win and recover hoard), bargain with a riddle (wizard clue) | Dragon mini, dragon/battle sound |
| ENC-FEL-005 | The Hidden Bazaar | Bazaar | Bazaars, any | Buy warriors/food/gear, roll haggle die, hire scout/healer/beast; bad haggle closes the bazaar this visit | Haggle die, bazaar sound |
| ENC-FEL-006 | A Wizard's Curse | Cursed | Any, weighted by Eye's attention | Resist (spirit check), accept (lose gold/warriors), wizard NPC lifts it (costs his next action) | Flicker, corruption card optional |
| ENC-FEL-007 | Pegasus on the Ridge | Pegasus | Mountains/hills, rare | Ride (move to any space in a kingdom, saves ticks), let it go (gain hope) | Uplifting sound, light sequence |
| ENC-FEL-008 | The Old Tomb | Tomb/Ruin | Tomb sub-location | Search (empty / treasure / key clue / foe), seal it (safe, gain a lore line) | Dungeon token, quest marker |
| ENC-FEL-009 | Sanctuary's Mercy | Sanctuary | Sanctuaries, when party is weak | Rest (restore warriors/food, costs 1 tick), pray (spirit), ask for lore (riddle clue) | Calm lights, sanctuary |
| ENC-FEL-010 | Skulls Muster | Tower battle / RtDT skulls | Clock beat or random tick | Players drop a skull; where it lands the shadow musters; choose to rush there (stop it) or let it grow | Skull drop sensor, drum routing, skulls |
| ENC-FEL-011 | Hungry Company | Food upkeep | Every N ticks | Pay provisions per warrior; short = lose warriors or hope | Screen only |

Example set pieces (fellowship, from the story notes): *The Tower Wakes* (tavern, lights + sound + drum turn), *A Recruit Joins* (per hero, dream fragment), *The Quest Is Given* (chapter end), *A Key Opens a Seal* (player removes the lit seal), *The Riddle at the Tower* (drum positions as the answer).

## Open questions

See [open-questions.md](open-questions.md) (encounter resolution, frequency, minis on board, recurring dragon).
