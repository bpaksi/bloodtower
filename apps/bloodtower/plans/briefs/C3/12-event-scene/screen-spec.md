# Screen spec: C3 / 12-event-scene — The event scene: the painting, the words and the choice

- Brief: ./plan.md
- Evals: ./eval.md
- Cards: UI-041, UI-035, MEC-072, DEC-019, DEC-022, DEC-027, DEC-018, DEC-023
- Viewports: Story board 1920×1080 (Samsung TV), iPad 768×1024 portrait (locked by Bob)
- Rules for every screen: the board is display only and never scrolls or clips (SCR-013); iPads carry choices and taps only, and every story line shows on the board (SCR-014, DEC-057); one step, one primary button on the iPad (SCR-016); the bottom toolbar on every iPad state, "?" help at the left and the gear (Menu) at the right (C2 feature 04; Bob 2026-10-31 10:37/10:38); the happy path never needs the gear. Help text (Loremaster 2026-10-31): "Something happened on the road. Make a choice if one is shown; the scene moves on by itself.". Story copy stays `[COPY: ...]`.

## Purpose

Tell a group what met it in the wild and let the present heroes choose (MEC-072).

## States

- **Event shown** (.2): its painting, the words `[COPY: event words]` (per pack) on a Scroll (UI-035).
- **Quiet**: a mood line; auto-advances when its narration or cue ends (4 s with no audio; Bob 2026-10-31 10:38 AM ET).
- **Windfall**: the gain on a Reveal (UI-036).
- **Hazard**: the counter saved them, or two costs (DEC-027), each a button on the iPad; a choice, no auto-advance.
- **Foes / disaster**: Go around, Pay them off (DEC-023, DEC-028). No Fight button in C3, not even disabled (Q-C3-02); C4 adds it. Each choice is a button on the iPad; no auto-advance.
- **People**: Q-C3-03, answered; the offers are buttons on the iPad; a choice, no auto-advance.

## Player actions

- iPad (present heroes only, DEC-019): pick a cost or a choice (buttons; these steps wait for a press and never auto-advance). The result step (Reveal, saved) has no Next; it auto-advances when its narration or cue ends (4 s with no audio; Bob 2026-10-31 10:38 AM ET).

## Mechanics behind it

UI-041: a painting with the event's words on a Scroll (UI-035), the choices on the iPad, the present heroes choosing together (DEC-019).

## What happens next

The next group's event, or the skull drop (MEC-034 close). No Fight in C3 (Q-C3-02); in C4 Fight calls the battle.

## OPEN questions

- ANSWERED Q-C3-02 (Bob, 2026-10-31 10:09 AM ET): hide Fight until C4.
- ANSWERED Q-C3-03 (Bob approved 2026-10-31): in 1.0 people events offer rumour and trick only; the people weight stays 10. (people offers in 1.0)
