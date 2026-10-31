Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 13-building-menu — The building menu on the iPad: rally, cure, rest, virtue draw, Cleanse

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Risk: Med.

## Checks

### EV-01 — Each pick shows its move and gold
- Requirement: UI-043.
- Method: playwright
- How: `c3-building.spec.ts`: enter a citadel with 3 moves and 20 gold.
- Pass evidence: rally "1 move · 5 gold", virtue draw "1 move · 10 gold", Cleanse "1 move", Leave; the quest marker first when one is there.
- Fails if: costs missing or the marker not first.

### EV-02 — Free cure reads free
- Requirement: DEC-700.
- Method: playwright
- How: sanctuary, a corrupted hero, first cure of the chapter.
- Pass evidence: "1 move · free"; after it, the next cure shows its price.
- Fails if: shows 10 gold.

### EV-03 — Disabled, not hidden
- Requirement: UI-043.
- Method: playwright
- How: purse 3 at a citadel.
- Pass evidence: rally and draw greyed with prices.
- Fails if: hidden.

### EV-04 — Skulled menus shrink
- Requirement: DEC-093.
- Method: playwright
- How: citadel with 2 skulls.
- Pass evidence: the menu per DEC-093, skulls shown on the board.
- Fails if: full menu.

### EV-05 — Screenshots match
- Requirement: UI-043.
- Method: screenshot
- How: iPad 1024×768 and board 1920×1080 at citadel, sanctuary, tavern; compare with ./mockup.html `#citadel`, `#sanctuary`, `#tavern`.
- Pass evidence: six images matching.
- Fails if: a part missing.

## Survival evals (one per survival invariant in plan.md)

### EV-06 — Continue keeps the menu
- Requirement: DEC-700.
- Method: playwright
- How: quit inside a sanctuary after a free cure; Continue; re-enter.
- Pass evidence: the cure shows its price.
- Fails if: free again.

## Assumptions surfaced

- None beyond the cards cited.

## OPEN questions

- Q-C3-13, Q-C3-14 (1.0 picks per building kind)
- Q-C3-20: when a hero holds several corruptions, who picks which the cure removes: the hero, the group, or the oldest first?
