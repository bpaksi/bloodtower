Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 09-battle-board — The battle on the board: horn, foe panel, round results

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-14; survival evals last (EV-12 … EV-14).

## Checks

### EV-01 — Foe panel parts
- Requirement: UI-026.
- Method: playwright
- How: start a level-2 battle.
- Pass evidence: painting, name, traits, strength bar, present heroes.
- Fails if: a part missing.

### EV-02 — Horn without tower (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: CUE-010, Q-C4-14.
- Method: playwright
- How: no tower; start battle.
- Pass evidence: the board plays audio asset `snd.battle_start` (SND-037) once at the battle's start.
- Fails if: silent, another asset, or played twice.

### EV-03 — Cursed count shown (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: Q-C4-05.
- Method: playwright
- How: Cursed hero, 6 Advantages.
- Pass evidence: "4 of 6 count".
- Fails if: absent.

### EV-04 — Screenshots match
- Requirement: UI-026.
- Method: screenshot
- How: board 1920×1080 and iPad 768×1024 portrait; mockup `#battle`, `#round-won`, `#round-lost`.
- Pass evidence: six images; pixel diff under 1% against each mockup id.
- Fails if: any image over 1% diff.

### EV-05 — Strength left and the round result show
- Requirement: UI-026.
- Method: playwright
- How: level-2 foe, 1 hero present (8 wounds, DEC-563); win round 1 at round strength 3 (4 or less, so the cut is the 2-wound minimum, DEC-703).
- Pass evidence: `[data-foe-strength]` reads 8 then 6; the board line reads exactly `Round 1: {hero} struck for 2.` with the hero's name.
- Fails if: the bar does not move, or no result line.

### EV-06 — Hit and victory cues fire
- Requirement: CUE-010.
- Method: playwright, tower mock
- How: lose a round, then win the battle.
- Pass evidence: tower mock receives `cue.hit` once for the lost round and `cue.victory` once at the end.
- Fails if: a cue missing or doubled.

### EV-07 — The toolbar is on every state
- Requirement: every iPad state has the bottom toolbar, "?" at the left and the gear at the right (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright, iPad portrait 768×1024
- How: stop on each state: foe arrives (horn), round picking, round won, round lost, victory.
- Pass evidence: on each stop `footer.bt-bar--bottom` is visible in the viewport; its first control is "?" and its last is the gear; no body element covers them.
- Fails if: any state lacks the toolbar, "?" or the gear.

### EV-08 — The happy path never needs the gear
- Requirement: this screen's happy path uses only the iPad body's flow buttons (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: play the happy path through foe arrives (horn), round picking, round won, round lost, victory, counting Menu and help opens.
- Pass evidence: Menu open count 0 and help open count 0; the screen reaches its next screen.
- Fails if: a Menu or help open is needed.

### EV-09 — Help matches this screen
- Requirement: "?" opens a help sheet on the iPad for this screen; Close returns to the same state; help does not pause and sends nothing (C2-04, C3 rule).
- Method: playwright
- How: on each state (foe arrives (horn), round picking, round won, round lost, victory) press "?", then Close.
- Pass evidence: the sheet's `data-help-screen` is `battle-board` and its text is exactly "Pick Fight or Retreat on your iPad, then Attack, Cast a spell, Spend an Advantage, Drink a potion or Guard." (Loremaster 2026-10-31); the host receives 0 messages from the iPad while it is open and `paused` is unchanged; after Close the same state shows.
- Fails if: help is missing, shows on the board, shows another screen's text, sends a message, pauses the game or changes state.

### EV-10 — Beats auto-advance
- Requirement: no Next on: round result (won or lost), victory; each advances when its narration or cue ends, or after 4 s when it has no audio (C2-04 rule; Q-C4-17 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)).
- Method: playwright, fake clock
- How: reach each beat (round result (won or lost), victory); once with narration (mock audio end event), once with audio off.
- Pass evidence: the iPad shows no Next button; the beat advances on the audio end event, and 4 s (±200 ms) after it shows when there is no audio.
- Fails if: a Next button shows, it advances early, or it waits for a press.

### EV-11 — Narration holds the beat past 4 s
- Requirement: a beat with audio waits for its end event (Q-C4-17 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)).
- Method: playwright, fake clock
- How: reach each beat (round result (won or lost), victory) with narration playing; advance the clock 4.5 s with no audio end event.
- Pass evidence: the screen is still on the beat; it advances only after the end event fires.
- Fails if: it advances at 4 s while narration plays.

### EV-12 — Each foe shows its 2 trait chips
- Requirement: UI-026, DEC-068, DEC-579.
- Method: playwright
- How: a fixture pack foe with traits Undead, Melee.
- Pass evidence: exactly 2 chips `[data-foe-trait]` reading Undead and Melee, from the pack entry.
- Fails if: a missing, extra or different chip.

### EV-13 — Round results show the cut and the hit
- Requirement: DEC-703; Gamewright ruling.
- Method: playwright
- How: level-2 foe, 1 hero at 10 HP; win round 1 at round strength 3, lose round 2.
- Pass evidence: round 1 reads "Round 1: {hero} struck for 2."; round 2 shows "−2 hit points" beside the hero, whose HP reads 8/10.
- Fails if: a wrong cut, a wrong hit, or no −2 shown.

## Survival evals (one per survival invariant in plan.md)

### EV-14 — Board redraws after Continue
- Requirement: DEC-675.
- Method: playwright
- How: quit mid-battle; Continue.
- Pass evidence: same foe, wounds, heroes.
- Fails if: blank or reset.

### EV-15 — A beat interrupted by restart applies once
- Requirement: restart or Continue during an auto-advancing beat (round result (won or lost), victory) (Q-C4-17 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)).
- Method: playwright
- How: during each beat, restart the host and Continue.
- Pass evidence: the same beat shows again, or the next one; its effect (gold, card, cut, seal, flag) is applied exactly once in the state log.
- Fails if: the beat is skipped with no effect, or its effect is applied twice.

### EV-16 — The gear comes back closed after a restart
- Requirement: after a restart and Continue on this screen the Menu and any gear panel come back closed, the game is not paused and the toolbar is back (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: on this screen open a gear panel (Volume), restart the host, Continue.
- Pass evidence: no `[data-menu]` or `[data-panel]`; `paused: false`; every iPad shows the toolbar with "?" and the gear.
- Fails if: the Menu or panel reopens, the game stays paused, or the toolbar is missing.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- Resolved Q-C4-14: The battle horn and hits (CUE-010) with no tower connected: Options: (a) play them through the Story board's speakers; (b) silent; the board shows the hit only. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C4-15 **[Bob taste call]**: Foe paintings in C4, before the A1 art run (C5): Options: (a) one placeholder painting per foe level, swapped by A1 in C5; (b) A1 draft art now, as the art lands. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C4-05: Cursed (DEC-466): does the board show which 4 Advantages counted? Options: (a) yes: the hero panel shows "4 of N count" and dims the rest during the round; (b) no: the app picks silently; only the round result shows. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
