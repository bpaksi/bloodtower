# UI-023 Move Map Compass — HTML first cut (Theme B)

## Paths
- HTML: `ui-023-move-map-compass.html` (self-contained; inline CSS/JS)
- Theme B reference copy: `b-engraved.jpg` (not required for interaction — chrome is CSS)
- Screenshots: `ui-023-resting.png`, `ui-023-selected-greenbridge.png`

## Demo behaviour
- **DEC-234:** YOU-center at Upper Ice Fangs; neighbours radiate as a cross of fixed positions.
- **DEC-235:** Always draws all 8 slots. Empty slots (demo: bottom + upper-left) = faint dashed rings with no captions. **Bob lock 2026-10-26:** no “Also adjacent” / overflow list — adjacents are the 8 fixed slots only.
- **DEC-236:** Slot assignment is hardcoded demo data — no angle math.
- **Bob lock 2026-10-26 (labels):** No N/S/E/W letters or direction words on the UI. Positions only. Neighbour name labels stay. **The Tower always at top** (board-relative). Rivers are conceptually left/right of the board orientation — not labeled as compass points.
- **Blocked:** Ash Hills (upper-right slot) visible, gray ✕, “blocked”, `pointer-events: none`.
- **Frontiers:** dashed marks Bleak Wastes↔Tower Scar Desert and Tower Scar Desert↔Ash Hills.
- **Selection:** tap open slot → gold selected chrome. Moves left starts at 5; first selection decrements once to 4 (does not stack on re-select). Back / Replay / Menu / End turn are visual-only toasts.
- **No Story panel.** Abstract parchment only.

## Notes for Gamewright
- Internal slot keys in demo data still use N…NW for layout authoring only; they are never rendered as text.
- Mock photo had wrong dir labels and swapped left/right placement vs locked brief — HTML follows brief positions (left = Bleak Wastes, right = Greenbridge) without compass letters.
- Corner ornaments are CSS approximations of Theme B engraved chrome, not a raster frame.

## Bob lock 2026-10-26 (Tower marker)
- The Tower no longer sits inside the compass ring — it has its own reserved 46px band **above** the ring, so it can never overlap Tower Scar Desert (top slot) or any other slot.
- Plain "The Tower" text chip replaced by an inline SVG dark-tower silhouette (spire + battlements + tapering keep, gold/cream engraved stroke, blood-red window glow) — Theme B. No caption (accessible name via `aria-label="The Tower"`). Self-contained, no external image.
- Old tower-link lines removed; a tiny gold stem points down to the top slot.
