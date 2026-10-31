Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 09-battle-board — The battle on the board: horn, foe panel, round results

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-05; the survival eval is last (EV-05).

## Checks

### EV-01 — Foe panel parts
- Requirement: UI-026.
- Method: playwright
- How: start a level-2 battle.
- Pass evidence: painting, name, traits, strength bar, present heroes.
- Fails if: a part missing.

### EV-02 — Horn without tower (Gamewright pick, pending Bob)
- Requirement: CUE-010, Q-C4-14.
- Method: playwright
- How: no tower; start battle.
- Pass evidence: horn on board audio.
- Fails if: silent.

### EV-03 — Cursed count shown (Gamewright pick, pending Bob)
- Requirement: Q-C4-05.
- Method: playwright
- How: Cursed hero, 6 Advantages.
- Pass evidence: "4 of 6 count".
- Fails if: absent.

### EV-04 — Screenshots match
- Requirement: UI-026.
- Method: screenshot
- How: board 1920×1080 and iPad 768×1024 portrait; mockup `#battle`, `#round-won`, `#round-lost`.
- Pass evidence: six matching images.
- Fails if: a part missing.

## Survival evals (one per survival invariant in plan.md)

### EV-05 — Board redraws after Continue
- Requirement: DEC-675.
- Method: playwright
- How: quit mid-battle; Continue.
- Pass evidence: same foe, wounds, heroes.
- Fails if: blank or reset.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C4-14: The battle horn and hits (CUE-010) with no tower connected: Options: (a) play them through the Story board's speakers; (b) silent; the board shows the hit only. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-15 **[Bob taste call]**: Foe paintings in C4, before the A1 art run (C5): Options: (a) one placeholder painting per foe level, swapped by A1 in C5; (b) A1 draft art now, as the art lands. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-05: Cursed (DEC-466): does the board show which 4 Advantages counted? Options: (a) yes: the hero panel shows "4 of N count" and dims the rest during the round; (b) no: the app picks silently; only the round result shows. Gamewright pick: (a) (Gamewright pick, pending Bob).
