# Dialog frame (Illusionist asset `dialog-frame`)

The 9-slice border for every centred Story board dialog: Sound (visuals step 1), the start-up shell and wizard (steps 3 and 4), and the in-game waiting dialog (step 9). It's an iron-gall ink double rule (a 4px thick rule, then a 1.5px hairline), a thin 2px blood-red inner rule, and a small ink lozenge with a blood centre plus a trefoil sprig at each corner. The background is transparent, so the parchment comes from the element's own background (see below). That keeps the border band and the centre seamless.

Served at `/board/dialog-frame/…`. The files live in `apps/bloodtower/public/board/` and are linked into the Next public folder by `apps/bloodtower/src/web/public/board -> ../../../public/board`, the same way `/landing/hero.webp` is (`src/web/public/landing` is a symlink too).
**Swap-PR note:** `serveStatic` in `src/server/server.ts` has a fallback list for app-public paths (`/avatars/`, `/landing/`, `/audio/`). If the built export doesn't carry `/board/` (that is, `out/board/` is missing after `pnpm build`), add `pathname.startsWith("/board/")` to that list in the `DialogFrame.tsx` swap PR. This delivery doesn't touch any `.ts` file.

## Files

| File | Size (px) | Use |
|---|---|---|
| `dialog-frame.svg` | 120×120 viewBox | **Master, preferred source.** Crisp at any border width and DPR. |
| `dialog-frame.png` | 120×120 RGBA | 1x raster export |
| `dialog-frame@2x.png` | 240×240 RGBA | 2x raster export |
| `dialog-parchment.webp` | 512×512 RGB, seamless | Optional parchment fill tile (mean ≈ `#dfcda5`, between `--bt-parchment` and `--bt-parchment-dark`) |

## Slice insets

| | Value |
|---|---|
| `border-image-slice` | **40** on all four sides (SVG user units = 1x PNG px; 80 px in the @2x PNG). No `fill` keyword: the centre is transparent. |
| `border-width` | **40px** default (1:1 with the art). Any width works: 32px for compact dialogs, 48px for a big TV dialog. Everything scales together. |
| `border-image-repeat` | `stretch`. The edges hold only straight rules, so stretching is lossless and there are no ornaments mid-edge. |
| Layout inside the 40 px band (1x) | outer rule 0–4, hairline 7–8.5, blood rule 19–21, corner ornament reaches 37 at the diagonal. Content padding starts after the 40px border; add your own `padding` (the mock uses about 12px 28px 20px). |

Chrome resolves `image-set()` 1x/2x with `border-image-slice: 40` correctly (checked at DPR 1 and 2). Other engines have historically differed on slice units with `image-set`, so ship the SVG.

## Fill

The element background paints under the border band (`background-origin: border-box`), so the parchment runs edge to edge under the transparent frame:

1. the tile `dialog-parchment.webp` repeating at 512px (or the existing `--bt-grain`/`--bt-foxing` data URIs from `tokens.css` if you want zero image requests);
2. a radial "burn" gradient on top, sized to the border box. Don't use `box-shadow: inset` for the burn. It starts at the padding edge and would leave a hard step at the inside of the 40px band. Never use an outer drop shadow (game-look §7).

## CSS for `DialogFrame.tsx` (`.bt-board` scope)

```css
/* DialogFrame: Illusionist asset dialog-frame (replaces .bt-dialog-frame-placeholder) */
.bt-board .bt-dialog-frame {
  box-sizing: border-box;
  border-style: solid;
  border-color: transparent;
  border-width: var(--bt-dialog-frame-width, 40px);
  border-image-source: url("/board/dialog-frame/dialog-frame.svg");
  border-image-slice: 40;
  border-image-width: 1; /* = border-width */
  border-image-repeat: stretch;
  border-radius: 0;
  background-color: var(--bt-parchment);
  background-image:
    radial-gradient(ellipse at 50% 42%, transparent 58%, rgb(138 111 71 / 0.38) 100%),
    url("/board/dialog-frame/dialog-parchment.webp");
  background-origin: border-box;
  background-size: 100% 100%, 512px 512px;
  background-repeat: no-repeat, repeat;
  color: var(--bt-iron-gall);
  padding: 12px 28px 20px;
}
/* Raster fallback if the SVG is ever unwanted:
   border-image-source: image-set(url("/board/dialog-frame/dialog-frame.png") 1x,
                                  url("/board/dialog-frame/dialog-frame@2x.png") 2x); */
```

```tsx
// DialogFrame.tsx (sketch; keep the data attribute from the visuals plan)
<div className="bt-dialog-frame" data-illusionist-asset="dialog-frame">{children}</div>
```

Opening motion stays the step-1 rule: `bt-ink-in` (900 ms, `--bt-ease-ink`) and a 300 ms opacity fade only under `prefers-reduced-motion`.

## Continuity

- `tokens.css`: `--bt-iron-gall #2a1d14` (rules and ornaments), `--bt-blood #8e1b1b` (inner rule and lozenge centre), `--bt-vellum-shadow #8a6f47` (corner-block seed and burn colour), `--bt-parchment #e9d9b4` / `--bt-parchment-dark #c9b182` (fill), `--bt-radius: 0` (square corners).
- `game-look.md` §3 Frames (parchment page, ink double rule, ornate border / "plate" language, square corners), §2 palette ratio (blood stays a hairline), §4a TV rule (the rules are ≥ 1.5px at 1x and the ornaments about 17px across, so they read at couch distance), §7 Avoid (no radius, no outer shadow, no gloss).
- Agreed look: `research/game-design/mockups/2026-10-17/frames-mac-0-sound.png` and `v2-mac.png` (parchment, ink edge, red inner rule over the dimmed landing painting). The mock's outer drop shadow is deliberately left out because §7 forbids it.
