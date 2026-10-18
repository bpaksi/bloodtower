# Window mask and glow for `/landing/hero.webp` (Illusionist asset `window-mask`)

For R3-UI-02 (motion-still window flicker), visuals step 2. Swap point: `src/web/components/board/boardWindowMask.ts`, where `BOARD_WINDOW_MASK_URL = "/landing/window-mask/window-mask.png"`.

Every file is **1920×1080, pixel-aligned with `hero.webp`**. Size and position each layer exactly like the backdrop (`background-size: cover; background-position: left top` in `board.css`), and the lights stay registered at every viewport (checked in Chrome at 1920×1080 and 1280×1024).
Served at `/landing/window-mask/…`. They sit beside the hero, so they reuse the existing `/landing/` serving (the `src/web/public/landing` symlink plus the `serveStatic` fallback). No code change is needed to serve them.

## Files

| File | Format | What |
|---|---|---|
| `window-mask.png` | 8-bit gray + alpha (LA), gray = alpha | **The mask.** White/opaque = lit glass or flame, black/transparent = everything else, with about a 4 px feather (Gaussian σ 1.6). It works with the default `mask-mode` (alpha) and with `mask-mode: luminance`. |
| `window-mask.svg` | SVG, 1920×1080 viewBox | Hand-fitted vector version (pointed arch, ellipses, a rect) with the same feather as a filter. Groups `#group-a…d`. It matches the PNG at about 81 % IoU and is slightly fuller (it includes the dim arch apex). The PNG is the master. |
| `window-mask-a.png` … `window-mask-d.png` | LA, as above | The same lights split into 4 flicker groups (table below). |
| `window-mask-sections.png` | 8-bit gray (L), **label map** | One file holding all groups as flat gray levels over each group's feathered footprint: **a = 255, b = 192, c = 128, d = 64**, 0 = none. Use it for lookups or tooling, not as a CSS mask (flat edges). |
| `window-glow.png` | RGBA, transparent | Baked candle halo for an additive layer: `--bt-candle #f5c451` core falling off to `--bt-flame #e8892b`, with a halo radius of about 60–90 px for the window and about 30–50 px for the lanterns. |
| `window-glow-a.png` … `window-glow-d.png` | RGBA | The same halo split per group, for independent flicker. Composited together they equal `window-glow.png` (each is max-combined). |

## Lights (hero pixels; bbox of the unfeathered core)

| Group | Light | bbox x0,y0–x1,y1 | centre |
|---|---|---|---|
| a | `tower-window` | 1328,286–1354,358 | 1341, 324 |
| b | `stair-lantern-upper-1` | 1287,648–1295,657 | 1291, 653 |
| b | `stair-lantern-upper-2` | 1324,673–1328,676 | 1326, 674 |
| b | `stair-lantern-upper-3` | 1352,705–1373,721 | 1361, 713 |
| c | `stair-lantern-lower-1` | 1257,784–1264,791 | 1260, 787 |
| c | `stair-lantern-lower-2` | 1208,799–1222,810 | 1215, 805 |
| c | `stair-lantern-lower-3` | 1157,838–1172,851 | 1164, 845 |
| d | `lamp-post` | 960,955–979,977 | 969, 964 |

The hero has no village or other buildings. The only lit sources are the tower window and the lanterns on the stair. The moon and the sunlit cloud edges are bright and warm but they're not lamps, so they're excluded.

## Suggested CSS (step 2)

Option A (no TSX change, one flicker for all lights): the glow on the backdrop's `::before`. `::after` (the dark gradient) paints over it, so the glow sits in the painting and not over the dialogs. The backdrop already creates a stacking context (`filter`), so `screen` blends only with the painting.

```css
.bt-board > .bt-board-backdrop::before {
  content: "";
  position: absolute;
  inset: 0;
  background: url("/landing/window-mask/window-glow.png") left top / cover no-repeat;
  mix-blend-mode: screen; /* or plus-lighter */
  animation: bt-window-flicker 2.9s steps(1, end) infinite;
}

/* About 2 changes per second at uneven stops; never smooth, never a strobe (R3-UI-02, game-look §5). */
@keyframes bt-window-flicker {
  0%   { opacity: 1; }
  17%  { opacity: 0.78; }
  29%  { opacity: 0.96; }
  52%  { opacity: 0.62; }
  61%  { opacity: 0.9; }
  83%  { opacity: 0.72; }
  100% { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .bt-board > .bt-board-backdrop::before { animation: none; opacity: 0.9; } /* steady glow */
}
```

Option B (per-group flicker, the "lit in sections" plan): four child layers inside `.bt-board-backdrop` (this needs a tiny markup change where the backdrop is rendered), one per group, each with its own duration and a negative delay so they never line up:

```css
.bt-window-glow { position: absolute; inset: 0; background-position: left top; background-size: cover;
  background-repeat: no-repeat; mix-blend-mode: screen; animation: bt-window-flicker steps(1, end) infinite; }
.bt-window-glow[data-group="a"] { background-image: url("/landing/window-mask/window-glow-a.png"); animation-duration: 2.9s; }
.bt-window-glow[data-group="b"] { background-image: url("/landing/window-mask/window-glow-b.png"); animation-duration: 3.7s; animation-delay: -1.3s; }
.bt-window-glow[data-group="c"] { background-image: url("/landing/window-mask/window-glow-c.png"); animation-duration: 4.3s; animation-delay: -2.1s; }
.bt-window-glow[data-group="d"] { background-image: url("/landing/window-mask/window-glow-d.png"); animation-duration: 3.1s; animation-delay: -0.6s; }
```

Option C (mask instead of the baked glow): fill a layer with candle colour or a gradient and clip it to the windows:

```css
.bt-board > .bt-board-backdrop::before {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(circle, var(--bt-candle), var(--bt-flame));
  mask: var(--bt-window-mask, url("/landing/window-mask/window-mask.png")) left top / cover no-repeat;
  mix-blend-mode: screen;
  animation: bt-window-flicker 2.9s steps(1, end) infinite;
}
```

`--bt-window-mask` is set from `BOARD_WINDOW_MASK_URL` (`url("…")`) per the visuals plan. Option C gives only the glass; layer the glow PNG on top for a halo.

Flash safety: the opacity swing (0.62–1) is confined to small areas (the glass is about 0.13 % of the frame; the halo above 10 % alpha is about 2 %), and no single layer changes more than about 2 times per second. Keep it that way if you tune the keyframes.

## Continuity

- `tokens.css`: `--bt-candle #f5c451` (glow core), `--bt-flame #e8892b` (glow edge), the `bt-candle` / `.bt-flicker` pattern (`steps(1, end)`, irregular stops), and the reduced-motion "no flicker" rule.
- `game-look.md` §5 Motion (candle flicker: stepped, irregular, never a sine) and §2 (candle yellow is precious: only the lit windows glow).
- `research/game-design/playthrough-ui-notes-2026-10-17.md` R3-UI-01 (painting is the permanent background) and R3-UI-02 (motion-still mask layer, 1–2 Hz jitter, reduced motion = steady glow).
- `docs/research/splash-animation/README.md` (layered motion-still over a static painting; bats stay on #72).
