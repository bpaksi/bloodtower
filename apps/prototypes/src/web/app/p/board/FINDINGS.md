# P-01 Story board layouts: findings

**Status: awaiting Bob's play-through (TV from the couch).** Nothing below is final until then.

Page: `/p/board`. Arrow keys switch layouts, `H` hides the controls, `?layout=<id>&clean=1` opens one clean (ids: waiting, acting, roll, items, summary, qr, play).

## Question

Are the board's panels readable from the couch on the Samsung at 1080p, and do they scale to 4K?

## What was built

Seven full-screen layouts on a placeholder painting: waiting dialog + prompt band (UI-015, UI-014), now acting (UI-011), hero roll (UI-012), party items (UI-013), summary (UI-009), join QR large (UI-010), and "Play" with every panel together (SCR-014). The six pool heroes use the DEC-100 roles and DEC-101 attributes. Who holds which hero comes from a seed (default `1`). Corruption and carried items show "unavailable" in Now acting, never a number (UI-011).

## Numbers chosen (design px at 1920 wide; 4K doubles them)

```json
{ "minTextPx": 28, "bodyPx": 32, "headingPx": 44, "bigPx": 64 }
```

- Minimum 28 px (56 px at 4K), from the plan. Every size is raised to the minimum in code; a unit test scans the rendered markup for every font size in all seven layouts.
- Body 32, heading 44, big 64, prompt band 96 px tall: invented.
- Hero attribute values (1 to 5, one high attribute per role; the healer has no high one) are invented placeholders.

## What worked

- Everything is sized through `tvPx`, so the layout is the same at 1080p and 4K (compare the screenshots below).
- The "Play" layout fits all panels without overlap on the placeholder content.

## Not known yet (needs the TV)

- Whether 28 px is readable from the couch on the Samsung 9 Series 65in at 1080p.
- Whether the hero roll cards (three columns) and the 96 px prompt band are the right size.

Bob's notes: _(to fill in after the play-through)_

## Screenshots

1920x1080: [waiting](screenshot-waiting-1920x1080.png), [acting](screenshot-acting-1920x1080.png), [roll](screenshot-roll-1920x1080.png), [items](screenshot-items-1920x1080.png), [summary](screenshot-summary-1920x1080.png), [qr](screenshot-qr-1920x1080.png), [play](screenshot-play-1920x1080.png)

3840x2160: [waiting](screenshot-waiting-3840x2160.png), [acting](screenshot-acting-3840x2160.png), [roll](screenshot-roll-3840x2160.png), [items](screenshot-items-3840x2160.png), [summary](screenshot-summary-3840x2160.png), [qr](screenshot-qr-3840x2160.png), [play](screenshot-play-3840x2160.png)

(Dev-mode captures: the small "N" and "Log" badges at the lower left are the Next.js and log-panel overlays, not part of the layout.)

## Card IDs to update (after the play-through)

- SCR-013, SCR-014: the minimum text size and the layout that worked.
- UI-009 to UI-015: panel sizes and positions as tested.
- DEC-100, DEC-101: the placeholder attribute values, if Bob keeps them.
