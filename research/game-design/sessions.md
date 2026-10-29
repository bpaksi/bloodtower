# Sessions: startup, play, ending

**History (DEC-610):** written before the design cards. Where it disagrees with a card, the card wins; known stale lines say "Superseded by". Status: **draft for Bob's review**, 2026-10-14. Design only. Implements R-SES-* in [requirements.md](requirements.md) (former `session-lifecycle.md` folded in). Tower facts: [api-surface-7.1.2.md](../tower/api-surface-7.1.2.md), [2026-10-13 spike](../tower/spikes/2026-10-13-noble-macos.md).

## Startup

```text
Home ─► New / Resume ─► Story pack ─► Part/chapter ─► Players, devices, heroes ─► Difficulty & seed
     ─► Tower connect ─► Calibrate ─► Physical setup checklist ─► Opening scene ─► Play
```

1. **Home** (R-SES-8). Pack-neutral look; the tower isn't touched. New campaign, Continue (lists saves: pack, part, night, last played, party), One-shot, Statistics, Settings (volume, tower on/off). *Superseded by MEC-039, DEC-281 and DEC-208: the session runs the tower and the base board once, then games; Continue offers the one running autosave.*
2. **Story pick.** Installed packs with art, length, player count, required components; locked if an expansion is missing (R-ASSET-9). Multi-part packs: new campaign or next part. The app switches to the pack's look (R-ENG-5).
3. **Players, devices, heroes** (R-SES-17). 1–4 players. Each player joins their private iPad (e.g. by code shown on the host) and picks a hero. Party is pack-defined: fellowship deals 3 of 4 heroes + wizard NPC; Dracula uses 4 hunters, one iPad each (D-DRA-7), unused hunters as NPCs. A device can rejoin later. *Superseded by DEC-057: an iPad holds a hero, but nothing on it is private.*
4. **Difficulty and seed.** ≥2 levels. Seed shown; "enter seed" replays a shared setup (R-ENG-8).
5. **Tower connect** (explicit button, R-SES-2). First run on macOS asks Bluetooth permission; the first spike attempt failed "adapter not ready", so show a clear retry button, never auto-retry. Show battery and warn if low (R-SES-9). "Play without tower" uses the mock (R-ENG-7) and screen fallbacks (R-ENG-12). Title lights/sounds are allowed before calibration (worked in the spike).
6. **Calibrate** (explicit button). Explain first: all three drums spin ~21–22 s. Dress as "the tower wakes" with app audio, since commands during calibration are dropped. Show progress; hold tower cues until `onCalibrationComplete`. Reset skull count; new game = confirm all 12 seals on; resume = show which seals should be off.
7. **Physical setup checklist** (R-SES-3). From pack + seed: board, buildings, starting skulls, minis and where, foe tokens, markers, decks. One step per screen with confirm.
8. **Opening scene.** First set piece (e.g. Lantern & Bell; the fellowship tavern) with skippable soft tutorial (R-FUN-5). Ends on the first choice; the clock starts.

## During play

- Tower cues fire automatically from the script (R-ENG-19); physical steps wait for confirmation (R-SP-8).
- Private lines and choices go to the target hunter's iPad (R-ENG-16, R-AV-4). *Superseded by DEC-057 and DEC-201: there are no private lines.*
- Skull drop → clock tick → beats/encounters. Chapter/night changes follow the pack structure (R-ENG-17); keys are awarded by pack rules (R-ENG-18). *Superseded by MEC-034, DEC-287 and DEC-113: days of group turns, beats fire on what happens, no night count.*
- Autosave after every resolved action and tick (R-SES-4). Undo of the last non-physical choice (R-SES-11). *Superseded by DEC-208 and DEC-209: one running autosave; Back undoes only until the outcome shows.*
- Disconnect: pause tower steps, offer manual reconnect (+ recalibrate) or mock mode; never lose state (R-SES-7).
- "End for now" and "Concede" always reachable (R-SES-16).

## Save, resume, carry-over

- Several saves per campaign; one active session per campaign (R-SES-10). *Superseded by DEC-208: one stored game, replaced when a new game starts.*
- A save holds everything to resume: app-tracked seal state, expected drum positions, chapter/night, keys, corruption, devices/heroes, pack version (R-ENG-11), plus a "board snapshot" list for packing up.
- Resume: pick save → rejoin devices → connect + calibrate → **reconcile** checklist (seals off, skulls per building, mini positions) → continue. *Superseded by DEC-208: Continue runs the tower check (MEC-018).*
- Carry-over (R-SES-12): each pack declares what carries between parts (heroes and stats, losses, allies, items, keys, flags, corruption, seal state). A between-part screen shows what carried and what reset.

## Ending

```text
Trigger ─► Outcome scene ─► Recap ─► Save / carry-over ─► Tower wind-down ─► Home
```

1. **Triggers** (R-SES-5): win, loss, part complete, concede, end for now. Win/loss are pack-declared and checked after every state change, including immediate losses (3rd corruption, empty skull supply, clock out). Dracula: win the night-5 assault; lose on the 3rd corruption. *Superseded by DEC-113: no day limit, so no clock-out loss. DEC-508: Dracula 1.0 has three chapters.*
2. **Outcome scene** (R-SES-6): authored scene per pack/ending variant with a tower finale cue (with fallback).
3. **Recap**: key choices, set pieces seen, keys and clues, heroes' private ties; stats (clock, battles, skulls, seals, corruption); seed and pack version. Optional 1–5 fun rating and note (R-SES-14). Stored in SQLite (R-STA). *Superseded by DEC-057: there are no private ties.*
4. **Tear-down**: hint to restore seals and collect skulls; reset the tower to neutral only on confirm (R-SES-13). *Superseded by DEC-214: Goodbye's teardown runs once, after Done for tonight.*
5. **Wind-down**: lights off, optional closing sound, clean disconnect; suggest battery removal if low.

An abandoned session stays resumable and is marked abandoned after a set time (R-SES-15). *Superseded by DEC-208: the autosave stays until a new game starts.*

## Open questions

See [open-questions.md](open-questions.md) (losing a campaign part, cross-device resume, fun rating).
