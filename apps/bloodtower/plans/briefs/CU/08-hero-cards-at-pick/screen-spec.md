# Screen spec: CU / 08-hero-cards-at-pick — Hero cards on the Story board during Pick

- Brief: ./plan.md
- Evals: ./eval.md
- Cards: SCR-010, SCR-015, UI-010, DEC-232, DEC-098, DEC-201, PT-15
- Viewports: Story board 1920x1080 (Samsung TV), iPad 768x1024 portrait (unchanged)
- Rules: the board is display only and never scrolls or clips (SCR-013); the iPad shows icons and text only (DEC-201); unknown values are shown as unavailable, never as zero.

## Purpose

A first-time player can see what each hero is before choosing: class, fight number, hit points and one line.

## States

- **Pool, nobody seated:** one card per hero in the pool, join QR large (UI-010).
- **Some seated:** each seated hero's card is greyed and says it is seated; the rest stay full; the count reads "N of N picked".
- **All seated:** all cards greyed; the step moves on as today.
- **A field not known:** that field reads "unavailable", never 0.

## Player actions

- iPad: press "Pick Hero A" for a hero, as today. The cards have no buttons.

## What happens next

The setup steps run as today.

## Decided (was OPEN)

- The card's line is the pack's `ability` field, now the class's two intrinsic virtues (DEC-936, Copy table in ./plan.md); "Another iPad is waiting for a hero" is not built in 1.0; "Picked" and "Open" stay (Loremaster may reword). Bob, 2026-11-14, adopted.
