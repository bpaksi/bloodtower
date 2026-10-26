# Delivery: UI-023 move-map compass HTML (2026-10-26)

From Illusionist. Files only: the Bob-locked interactive mock, its notes, two screenshots, and this note. No `.ts`, `.tsx`, or `.css` under `apps/`.

UI-023 HTML first cut for DEC-234, DEC-235, and DEC-236, with Theme B chrome. The page draws its own corner ornaments in CSS. The engraved raster stays at `docs/ui-mocks/weekend-w1/b-engraved-ipad-move-map.jpg`. This drop has no second copy (`b-engraved.jpg` was not attached).

Gamewright previously DEC-PASS'd the interactive shape. Bob then locked three visual rules on 2026-10-26:

1. No N/S/E/W letters. Positions only. The Tower is always at the top (board-relative).
2. No "Also adjacent" overflow. Only the 8 fixed slots.
3. The Tower is an SVG icon above the ring. It must not overlap the top slot.

Slot keys `N`…`NW` stay in the demo data for layout and are not drawn as letters. This PR wires nothing in the app.

## Files

| File | Bytes | Dims | sha256 | What |
|---|---|---|---|---|
| `docs/ui-mocks/ui-023-compass/ui-023-move-map-compass.html` | 22595 | — | `0746f4748e0673abeb2daeff0884554e8b9bd7bc837b3e5541f205f55026e3a8` | Self-contained HTML. Inline CSS and JS. |
| `docs/ui-mocks/ui-023-compass/NOTES.md` | 2417 | — | `7a77c2a7eeedf77cd2652de81f693381169a82051520bc27cf4a1bb4fa3e71d6` | Illusionist notes for the first cut and the three locks. |
| `docs/ui-mocks/ui-023-compass/ui-023-resting.png` | 188519 | 371×824 | `085d75c129ebd1b3c19e80dda0d5c5e14bd6a67b351fdb9411d5a5307e940924` | Resting compass. |
| `docs/ui-mocks/ui-023-compass/ui-023-selected-greenbridge.png` | 191230 | 371×824 | `98fe372f4931e34dd2ecbf2fea13d53ed40d8bec95418eb79dc2530c159d2166` | Greenbridge selected. |
