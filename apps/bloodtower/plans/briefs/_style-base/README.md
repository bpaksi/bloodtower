# Blood Tower — mockup style base (Theme B, engraved parchment)

Shared CSS, icons, fonts and reused art for every `briefs/<plan>/##-<feature>/mockup.html`.
Proposed home in the repo: `briefs/_style-base/` (this folder).

## Linking from a mockup
A mockup lives three levels below the repo root's `briefs/`, so the base is `../../_style-base/`:

```html
<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="../../_style-base/bt-style.css">
</head>
<body class="bt">
  <div class="bt-device">                       <!-- iPad portrait 820x1180; add bt-device--phone for 390x844 -->
    <header class="bt-bar">
      <button class="bt-iconbtn"><svg class="bt-icon"><use href="../../_style-base/icons.svg#i-back"/></svg>Back</button>
      <span class="bt-label">Title</span>
      <button class="bt-iconbtn"><svg class="bt-icon"><use href="../../_style-base/icons.svg#i-menu"/></svg>Menu</button>
    </header>
    <main class="bt-stage">
      <div class="bt-frame"><div class="bt-parchment bt-frame__page"> … </div></div>
    </main>
    <footer class="bt-bar bt-bar--bottom"><button class="bt-btn bt-btn--primary">End turn</button></footer>
  </div>
</body></html>
```

Images: `<img src="../../_style-base/assets/place-village.webp">`.
External SVG `<use href>` and fonts need http, not `file://`. Preview with
`python3 -m http.server` from the repo root and open `/briefs/<plan>/<feature>/mockup.html`.

## Files
| File | What |
|---|---|
| `bt-style.css` | Tokens + components (parchment, inked panel, engraved frame, buttons, rows, badges, device frame, Story Board, motion) |
| `icons.svg` | 15-icon engraved line sprite (`#i-tower #i-hero #i-move #i-menu #i-back #i-close #i-check #i-potion #i-sword #i-shield #i-coin #i-skull #i-map #i-info #i-settings`), 24px grid, `currentColor` |
| `fonts/` | App fonts copied from `apps/bloodtower/src/web/public/fonts/` |
| `assets/` + `assets/manifest.json` | Web-sized webp (+jpg fallback) copies of existing art, with source paths |
| `style-guide.html` / `.png` | Every token, component, icon, and a sample iPad screen |

## Where tokens come from
- Palette, fonts, type sizes for the Story Board, textures, motion, `--bt-radius: 0`, `.bt-parchment`, `.bt-panel`: copied as-is from `docs/art-direction/tokens.css` (same values as `apps/bloodtower/src/web/styles/game-tokens.css`). **If the app tokens change, update here too.**
- Theme B chrome (`--bt-chrome*`, `--bt-engrave-gold`, `--bt-gold*`, `--bt-ember`, `--bt-reachable`, `--bt-blocked`) and the Tower silhouette: from `docs/ui-mocks/ui-023-compass/ui-023-move-map-compass.html`.
- Engraved corners: drawn in the `--bt-frame-engraved` SVG border-image, same gold line and weights as the border (raster corner-b-*.webp crops retired 2026-10-31, Bob).
- Added for mockups only: device type scale `--bt-fs-*`, spacing `--bt-sp-*`, `--bt-tap`.

## Rules
1. **Reuse existing art first.** Check `assets/manifest.json`, `packs/*/assets/`, and `docs/ui-mocks/` before you ask for anything new.
2. **New art only when a screen needs it**, and only at final quality (no placeholder art that will need redoing). Add it to `assets/` with a manifest entry: source, tool, cost.
3. **Log every spend** in the manifest (`spend_usd` + `tool` fields) and in the brief. This step's spend: **$0** (no image generation of any kind).
4. Theme locks:
   - Board-relative: **the Tower is always at the top**. Use the `.bt-tower-band` silhouette. **No N/S/E/W letters** or direction words anywhere.
   - **No buttons on Story Board screens** (`.bt-board` hides any that slip in). The TV only narrates. Choices happen on devices.
   - Party wording uses **"Pick"** ("Pick hero", "2 of 4 picked").
   - No rounded corners. No outer drop shadows on parchment (inset burn only).
   - **iPad screens are a HUD**: text, icons, panels, rows. No place stills, photos or other images on iPad. Images go on Story Board screens only.
   - `ref-*` assets are old mock screenshots, used for **reference only**. Some still show outdated compass letters. Never ship them in a screen.
