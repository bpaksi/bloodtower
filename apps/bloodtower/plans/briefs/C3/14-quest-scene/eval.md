Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 14-quest-scene — The quest scene: the track, the choice, the item hand-off

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Risk: Med.

## Checks

### EV-01 — The Herald's two options
- Requirement: DEC-672, UI-042.
- Method: playwright
- How: `c3-quest.spec.ts`: reach The Herald.
- Pass evidence: board: painting and `[COPY: ...]` narration; iPad: exactly two options: 'Ask for pay' → '+10 gold'; 'Take the job' → 'Tomas's Map'.
- Fails if: options on the board, or either gain label differs.

### EV-02 — Item option disabled
- Requirement: DEC-654.
- Method: playwright
- How: The Lock without the Signet.
- Pass evidence: the option greyed with the item's name.
- Fails if: hidden.

### EV-03 — The item hand-off
- Requirement: DEC-653, UI-036.
- Method: playwright
- How: take the job.
- Pass evidence: a Reveal of Tomas's Map; the iPads pick the hero; the hero panel shows the item.
- Fails if: the item is assigned without a pick.

### EV-04 — Quest gold shown
- Requirement: DEC-700.
- Method: playwright
- How: finish a quest with 2 present.
- Pass evidence: the rewards panel lists +5 to each present hero.
- Fails if: no quest gold line.

### EV-05 — Screenshots match
- Requirement: UI-042, UI-025, UI-036.
- Method: screenshot
- How: board and iPad at choice, item Reveal, rewards; compare with ./mockup.html `#choice`, `#item`, `#rewards`.
- Pass evidence: six images matching.
- Fails if: a part out of order.

### EV-06 — Battle options are not drawn
- Requirement: Q-C3-02 (Bob, 2026-10-31).
- Method: playwright
- How: open The Ambush on the iPad and the board.
- Pass evidence: no "Fight them" choice on either device; the toll choice is the one primary button and reads "10 gold" (Bob approved 2026-10-31); with purse 6 and 2 present heroes it reads "6 gold · 2 hit points each" and stays enabled.
- Fails if: a Fight choice shows, enabled or disabled.

### EV-07 — Corruption cost: pick the hero who takes it
- Requirement: DEC-693.
- Method: playwright
- How: a quest option costing a corruption, 2 present heroes (test fixture pack).
- Pass evidence: after the option, the iPads list the 2 present heroes; the picked hero's panel shows +1 corruption; the other's is unchanged.
- Fails if: no pick, or the wrong hero takes it.

### EV-08 — The quest track
- Requirement: UI-025.
- Method: playwright
- How: open The Herald; finish it.
- Pass evidence: the board shows the track with 1 step to come; after the choice it shows 1 step done.
- Fails if: no track, or the count is wrong.

### EV-09 — End hook, then back to the building menu
- Requirement: MEC-037 end.
- Method: playwright
- How: finish The Herald from its village; let the rewards step auto-advance.
- Pass evidence: the board shows the end hook `[COPY: …]`; the end hook auto-advances and returns the iPad to the village's building menu with the quest marker gone.
- Fails if: the end hook is skipped, or the iPad lands elsewhere.

### EV-10 — The toolbar is on every state
- Requirement: every iPad state of this screen has the bottom toolbar, "?" at the left and the gear at the right (Bob 2026-10-31 10:37 AM ET; Bob 2026-10-31 10:38 AM ET).
- Method: playwright, iPad portrait 768×1024
- How: stop on each state: quest Scroll, option pick, hero pick, rewards, end hook.
- Pass evidence: on each stop, `footer.bt-bar--bottom` is visible in the viewport; its first control is "?" and its last is the gear; no body element covers them.
- Fails if: any state lacks the toolbar, "?" or the gear.

### EV-11 — The happy path never needs the gear
- Requirement: this screen's happy path uses only the iPad body's flow buttons (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: play this screen's happy path through quest Scroll, option pick, hero pick, rewards, end hook, counting Menu and help opens.
- Pass evidence: Menu open count 0 and help open count 0; the screen reaches its next screen.
- Fails if: any step can only be reached through the gear or help.

### EV-12 — Help matches this screen
- Requirement: "?" opens a help sheet on the iPad for this screen; Close returns to the same state; help does not pause and sends nothing (Bob 2026-10-31 10:38 AM ET).
- Method: playwright
- How: on each state (quest Scroll, option pick, hero pick, rewards, end hook) press "?", then Close.
- Pass evidence: the sheet's `data-help-screen` is `quest-scene` and its text is exactly "A quest is in front of you. Pick one of its options." (Loremaster 2026-10-31); the host sends nothing and `paused` is unchanged; after Close the same state shows.
- Fails if: help is missing, shows another screen's text, pauses the game or changes state.

### EV-13 — Next-only steps auto-advance
- Requirement: the result step after rewards and the end hook have no Next; each it advances when its narration or cue ends, or after 4 s when it has no audio (Bob 2026-10-31 10:38 AM ET).
- Method: playwright, fake clock
- How: reach the result step after rewards, then the end hook; for each, once with narration (mock audio end event), once with audio off.
- Pass evidence: the iPad shows no Next button on either step; each advances on its audio end event, and 4 s (±200 ms) after it shows when there is no audio; the end hook then lands on the village's building menu; each step's outcome is the same as the old Next.
- Fails if: a Next button shows, it advances early, or it waits for a press.

### EV-14 — Narrated steps do not advance before their audio ends
- Requirement: a Next-only step with narration advances only on its audio-end event, never on a timer (Bob 2026-10-31 10:38 AM ET).
- Method: playwright, fake clock, mock audio
- How: reach the result step after rewards or the end hook with narration longer than 4.5 s; advance the clock 4.5 s without firing the audio-end event; then fire it.
- Pass evidence: after 4.5 s the iPad and the board are still on the step; it advances only after the audio-end event fires.
- Fails if: the step advances before its audio ends, or does not advance after the audio-end event.

### EV-15 — Restart and Continue during an auto-advancing step apply its effect once
- Requirement: a restart or a Continue during an auto-advancing step resumes that step and applies its effect exactly once (Bob 2026-10-31 10:38 AM ET).
- Method: playwright, fake clock
- How: two runs: (1) on the result step after rewards or the end hook, before it advances, restart the host and Continue; (2) on the same step, quit and Continue from the session screen. In each run let the step advance.
- Pass evidence: in each run the same step shows again and auto-advances once; the quest reward (quest gold and the quest marker removal) is applied exactly once (host state and event log show one application).
- Fails if: the step is skipped without its effect, repeats its effect, or stalls.

## Survival evals (one per survival invariant in plan.md)

### EV-16 — Continue reopens the choice
- Requirement: DEC-151, DEC-675.
- Method: playwright
- How: quit at The Herald's choice; Continue.
- Pass evidence: the same choice, no narration replay.
- Fails if: the narration replays or the quest is lost.

### EV-17 — The gear Menu survives a restart closed
- Requirement: after a restart and Continue on this screen, the Menu and any gear panel come back closed, the game is not paused, the toolbar is back on every iPad, and every item's enabled state is recomputed (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: on this screen, open a gear panel (Volume), restart the host, Continue.
- Pass evidence: no `[data-menu]` or `[data-panel]`; `paused: false`; every iPad shows the toolbar with "?" and the gear; the Menu's enabled and disabled items and reasons match those before the restart.
- Fails if: the Menu or panel reopens, the game stays paused, the toolbar is missing, or item states are stale.

## Assumptions surfaced

- None beyond the cards cited.

## OPEN questions

- ANSWERED Q-C3-02 (Bob, 2026-10-31 10:09 AM ET): hide Fight until C4.
- ANSWERED Q-C3-22 (Bob approved 2026-10-31): 10 gold; a short group pays all its gold plus 2 HP per present hero, never below 1 HP, and the quest finishes. Was: with Fight hidden, The Ambush finishes only by paying the toll (DEC-662). The toll amount is not carded, and a group that cannot pay cannot win chapter 1. What is the toll, and what happens when the purse is short?
