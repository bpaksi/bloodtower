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
- Pass evidence: rally "1 move · 5 gold", virtue draw "1 move · 10 gold", Cleanse "1 move" with no gold shown (1 move, 0 gold (Bob approved 2026-10-31)), Leave; the quest marker first when one is there.
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
- Pass evidence: the menu shows Cleanse and Leave only (2 skulls on a citadel; Bob approved 2026-10-31); 2 skulls shown on the board.
- Fails if: Rally or Virtue draw is offered.

### EV-05 — Screenshots match
- Requirement: UI-043.
- Method: screenshot
- How: iPad 768×1024 portrait (locked by Bob) and board 1920×1080 at citadel, sanctuary, village, bazaar; compare with ./mockup.html `#citadel`, `#sanctuary`, `#village`, `#bazaar`.
- Pass evidence: eight images matching.
- Fails if: a part missing.

### EV-06 — Each building kind shows its own offers, no Trade
- Requirement: building menus (Bob approved 2026-10-31); DEC-502.
- Method: playwright
- How: `c3-building.spec.ts`: enter a citadel, a sanctuary, a village and a bazaar, unskulled, with gold and moves to spare.
- Pass evidence: citadel: Rally, Virtue draw, Cleanse, Leave; sanctuary: Cure, Cleanse, Leave; village: Rest (the tavern rest), Cleanse, Leave; bazaar: Cleanse, Leave. No Trade anywhere.
- Fails if: a Trade, shop or NPC pick shows, or a pick shows at the wrong kind.

### EV-07 — Cure: pick the hero, then the corruption
- Requirement: DEC-170, Q-C3-20 (Bob approved 2026-10-31).
- Method: playwright
- How: sanctuary; 2 present heroes, hero A holds Feral and Lost, hero B holds none.
- Pass evidence: the iPad lists only corrupted present heroes (A); after picking A it lists Feral and Lost; picking Lost removes Lost only; the board shows which corruption went.
- Fails if: B is pickable, the corruption is chosen by the engine, or both go.

### EV-08 — Rest: pick the number of moves
- Requirement: MEC-075, DEC-174 (+3 per move, the village tavern rest; Bob approved 2026-10-31).
- Method: playwright
- How: village, hero at 4/12, 3 moves left.
- Pass evidence: the picker offers 1–3 moves; picking 2 shows 10/12 on the hero panel and 1 move left.
- Fails if: no picker, the range exceeds moves left, or the heal differs.

### EV-09 — Virtue draw: Reveal and the fifth-tile give-back
- Requirement: DEC-544, UI-036.
- Method: playwright
- How: fixed seed; group holding 4 tiles; draw.
- Pass evidence: the board shows the drawn tile on a Reveal; the iPad then lists the 5 tiles to give one back; after the pick the group holds 4.
- Fails if: no Reveal, no give-back prompt, or 5 tiles kept.

### EV-10 — A fallen building is not enterable
- Requirement: DEC-093.
- Method: playwright
- How: fell a village; open the move map next to it.
- Pass evidence: the village is not offered as an Enter target; no menu opens for it.
- Fails if: the menu opens or Cleanse is offered.

### EV-11 — The board paints the place and each result
- Requirement: UI-043.
- Method: playwright
- How: enter a citadel; rally a hero at 4/12.
- Pass evidence: the board shows the citadel's painting while the menu is open, then the rally result (hero name and 12/12).
- Fails if: no painting, or the result shows only on the iPad.

## Survival evals (one per survival invariant in plan.md)

### EV-12 — Continue keeps the menu
- Requirement: DEC-700.
- Method: playwright
- How: quit inside a sanctuary after a free cure; Continue; re-enter.
- Pass evidence: the cure shows its price.
- Fails if: free again.

## Assumptions surfaced

- None beyond the cards cited.

## OPEN questions

- ANSWERED building menus (Bob approved 2026-10-31): citadel: Rally (5 gold + 1 move), Virtue draw (10 gold + 1 move) or Cleanse; sanctuary: Cure (10 gold + 1 move, first one free each chapter) or Cleanse; village: tavern Rest (+3 hit points per move; Bob approved 2026-10-31) or Cleanse; bazaar: Cleanse only (Bob approved 2026-10-31).

- ANSWERED Q-C3-13 (Bob approved 2026-10-31): potion and audience are out of 1.0; citadel Rally (5 gold + 1 move, heals to full), Virtue draw (10 gold + 1 move) or Cleanse; sanctuary cure (10 gold + 1 move, first free per hero each chapter) or Cleanse. Was:, Q-C3-14 (1.0 picks per building kind)
- ANSWERED Q-C3-20 (Bob approved 2026-10-31): the hero picks which corruption a cure removes.
