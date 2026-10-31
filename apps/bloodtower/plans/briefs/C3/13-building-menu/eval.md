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
- How: iPad 768×1024 portrait (locked by Bob) and board 1920×1080 at citadel, sanctuary, village, bazaar; compare with ./mockup.html `#citadel`, `#sanctuary`, `#village`, `#bazaar`.
- Pass evidence: eight images matching.
- Fails if: a part missing.

### EV-06 — Each building kind shows its own offers, no Trade
- Requirement: building menus (Gamewright default per Bob's direction, pending Bob's review); DEC-502.
- Method: playwright
- How: `c3-building.spec.ts`: enter a citadel, a sanctuary, a village and a bazaar, unskulled, with gold and moves to spare.
- Pass evidence: citadel: Rally, Virtue draw, Cleanse, Leave; sanctuary: Cure, Cleanse, Leave; village: Rest, Cleanse, Leave; bazaar: Cleanse, Leave. No Trade anywhere.
- Fails if: a Trade, shop or NPC pick shows, or a pick shows at the wrong kind.

## Survival evals (one per survival invariant in plan.md)

### EV-07 — Continue keeps the menu
- Requirement: DEC-700.
- Method: playwright
- How: quit inside a sanctuary after a free cure; Continue; re-enter.
- Pass evidence: the cure shows its price.
- Fails if: free again.

## Assumptions surfaced

- None beyond the cards cited.

## OPEN questions

- DEFAULT building menus (Gamewright default per Bob's direction, pending Bob's review): citadel: Rally, Virtue draw or Cleanse; sanctuary: Cure or Cleanse; village: Rest or Cleanse; bazaar: Cleanse only.

- Q-C3-13, Q-C3-14 (1.0 picks per building kind)
- DEFAULT Q-C3-20 (Gamewright default, pending Bob's review): the hero picks which corruption a cure removes.
