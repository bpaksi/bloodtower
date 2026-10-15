# Bloodtower: game look (art direction)

Goal: the Dashboard and iPads must feel like a **video game built from a 1978 rulebook**, not a website or a business app.
Touchstones: stills like the 1978–79 AD&D *Player's Handbook* / *DMG* ink plates; clips like Bakshi's 1978 *Lord of the Rings* (rotoscoped, painted backgrounds, heavy shadow); the 1981 Dark Tower ink slides as bookends.

Files in this folder:

| File | What |
| --- | --- |
| `moodboard.png` | Existing art + palette swatches + font samples |
| `mocks/dashboard-1920x1080.png` | Dashboard mock (Mac browser) |
| `mocks/ipad-2048x1536.png` | iPad mock (one hunter tab) |
| `mocks/dashboard.html`, `mocks/ipad.html`, `mocks/moodboard.html` | Static HTML/CSS source of the above (uses the real kit art by relative path) |
| `mocks/render.py` | Playwright (python) renderer for the three PNGs |
| `tokens.css` | Drop-in CSS tokens, frames and keyframes for Wright |
| `fonts/fetch-fonts.sh` | Downloads the font files (not committed; `.ttf` is gitignored) |

Rebuild the PNGs: `docs/art-direction/fonts/fetch-fonts.sh && cd docs/art-direction/mocks && python3 render.py` (needs `pip install playwright==1.* && playwright install chromium`).
Note: the 1981 tower slide is the tracked file `apps/burgomaster-funeral-poc/assets/shared/dt1981/slides/tower.png`. That path is not gitignored. `.gitignore` ignores only `research/dark-tower-1981/images/`, `research/dark-tower-1981/sounds/`, and `research/dark-tower-1981/contact-sheet.png`.

## 1. Fonts (all free, SIL Open Font License 1.1, from github.com/google/fonts `ofl/`)

| Role | Family | Exact file | Use |
| --- | --- | --- | --- |
| Body, captions, VO subtitles | Cormorant Garamond | Upstream `CormorantGaramond[wght].ttf`, `CormorantGaramond-Italic[wght].ttf` (variable 300–700). `fetch-fonts.sh` saves `CormorantGaramond-VF.ttf` and `CormorantGaramond-Italic-VF.ttf`, and `tokens.css` loads those. | Captions italic 500; body roman 500. Never below 22 px on Dashboard, 28 px on iPad. |
| Titles, hunter names, choice verbs | Cormorant SC | `CormorantSC-Bold.ttf` | Small caps, tracking 0.04–0.08em. |
| Labels, stats, tabs, kickers | IM Fell English SC | `IMFeENsc28P.ttf` (roman `IMFeENrm28P.ttf` as fallback body) | Letterpress grit; tracking 0.12–0.3em. Replaces every sans-serif label. |
| Drop caps / seals only | UnifrakturMaguntia | `UnifrakturMaguntia-Book.ttf` | One initial per page, wax-seal glyphs. Never for words. |

In Next.js load them with `next/font/local`, `display: "swap"`, and expose them as the CSS variables in `tokens.css`. `fetch-fonts.sh` writes the files under `docs/art-direction/fonts/`; copy those into the app's own `public/fonts/`. No Google Fonts CDN at runtime (the table runs offline).

## 2. Palette

| Token | Hex | Role |
| --- | --- | --- |
| `--bt-void` | `#0b0806` | Background behind everything (candle-lit dark, never pure black) |
| `--bt-soot` | `#1a1310` | Inked panel fill |
| `--bt-umber` | `#3b2a1e` | Panel outer rule, inactive tab |
| `--bt-iron-gall` | `#2a1d14` | Ink on parchment (text, rules) |
| `--bt-parchment` | `#e9d9b4` | Page |
| `--bt-parchment-dark` | `#c9b182` | Foxed page edge, muted labels on dark |
| `--bt-vellum-shadow` | `#8a6f47` | Hatching, ornaments on parchment |
| `--bt-candle` | `#f5c451` | Highlight, gold rules, "choice waiting" glow, `<mark>` in captions |
| `--bt-flame` | `#e8892b` | Hover/press warmth, flame core |
| `--bt-blood` | `#8e1b1b` | Rubrication (kickers, drop caps), wax-seal badges, danger |
| `--bt-verdigris` | `#4f7a6a` | Rare: holy / ward effects only |
| `--bt-bone` | `#f3ead2` | Text on dark |

Ratio: ~70% void/soot, ~20% parchment, ~10% candle + blood. Candle yellow is precious: only the current choice, the active speaker word, and waiting badges.
Art treatment in UI: `filter: sepia(.2–.55) contrast(1.05–1.15)` so AI art sits in the same ink-and-age family.

## 3. Frames

- **Parchment page** (`.bt-parchment`): radial parchment gradient + SVG grain + low-frequency "foxing" noise, burned **inset** edge. Holds narration, findings, rules text. Kicker in blood small caps, title in Cormorant SC, a `❦ ❦ ❦` ornament line, then justified text with a blood Fraktur drop cap.
- **Inked panel** (`.bt-panel`): soot fill + grain, 3px **double** candle rule, 1px umber outline offset 5px, a `❦` fleuron at two opposite corners. Holds portraits, choices, inventory.
- **Ornate border** for art: 2px iron-gall rule + 1px outline offset 4–6px (a "plate" in a book). Art never touches a frame edge without it.
- **Cartouche hunter card** (Dashboard roll): parchment, clipped corners (`clip-path` octagon, 22px chamfer), inner hairline rule, round double-ringed portrait medallion, name in Cormorant SC, epithet italic, status in IM Fell SC. Selected = blood inner rule. Absent hunter = sepia + 0.62 brightness.
- **Wax-seal badge**: 50–54px circle, red radial gradient, candle letter or `!`, candle glow. Used for "choice waiting" on Dashboard cartouches and iPad tabs.
- **Bookmark-ribbon tabs** (iPad): one per hunter, ribbon notch at the bottom (`clip-path`), active tab is parchment and 16px longer.
- Corners are square or chamfered. `border-radius` only for medallions and seals.

## 4. Layouts

- **Dashboard (1920x1080)**: chapter title as a centered rubric header with gold double rules. Left 430px: "The Hunters" roll of cartouches. Right: selected hunter view = big portrait in an inked panel with name plate and stats, a parchment scene page with the still, and choices as inked panels below. **Cut scenes play full-screen**: the whole UI ink-fades to void (1200 ms), clip plays edge-to-edge with letterbox in `--bt-void`, captions centered bottom in Cormorant Garamond italic 40px bone with candle `<mark>`; UI returns with a page turn.
- **iPad (2048x1536)**: top ribbon tabs, one per hunter, wax seal when a choice is waiting. Left: parchment "What You Found" page (stamped "For Wren Alone" on privates). Right: "Choose Thy Deed" choice panels (illustrated thumb + verb + italic line), satchel panel, 1981 tower plate, waiting-on hint.

## 5. Motion

| Motion | Duration | Easing | Notes |
| --- | --- | --- | --- |
| Ink-in reveal (text, art, panels) | 900 ms (art 1200 ms) | `cubic-bezier(.22,.61,.36,1)` | Left-to-right `clip-path` wipe + blur 6px→0 + contrast 2.2→1. Stagger children 80 ms. |
| Candle flicker (glows, seals, title glow) | 3.7 s loop | `steps(1,end)` | Opacity 0.86–1 at irregular stops; never smooth sine. |
| Page turn (scene change, tab change) | 700 ms | `cubic-bezier(.65,0,.35,1)` | `rotateY(-180deg)` from left spine with `perspective: 2000px`; shade gradient sweeps across. |
| Badge pulse (choice waiting) | 2.4 s loop | ease-in-out | Candle glow 0→14px. Stops the instant the choice is locked. |
| Cut-scene enter/exit | 1200 ms | ease-in / ease-out | Fade through `--bt-void`, never a white flash. |
| Choice press | 120 ms down, 260 ms up | ease-out | Scale .98 + flame inner glow, like pressing a seal. |

Respect `prefers-reduced-motion`: replace wipes/turns with 300 ms opacity fades; no flicker.

## 6. Sound UI hints

All UI sounds sit around −20 LUFS, under VO (lines currently measure ≈ −18 LUFS integrated; the 1981 kit is −16 LUFS). Short, dry, physical:
- Choice hover: faint quill scratch (iPad: none, tap only). Choice lock: wax-seal press thud + soft candle whoosh.
- Tab / scene change: parchment page turn (≤ 400 ms).
- Choice waiting badge appears: single low bell or the 1981-style square-wave blip, once (no repeat nagging).
- Ink-in reveal: optional brush hiss under 300 ms. Cut scene start: candles gutter (`audio/sfx/candle-gutter.wav`), then music.
- Never: clicks, pops, system "ding", notification chimes, success "ta-da".

## 7. Avoid (reads as website / business app)

- Flat white or grey cards, `border-radius: 8–16px`, pill buttons, chips.
- Sans-serif anything (system UI, Inter, Roboto, Helvetica) incl. buttons, tabs, badges, numbers.
- Outer drop shadows / elevation (`box-shadow: 0 4px 12px …`); use inset burn, outlines and glows only.
- Material/iOS icons, hamburger menus, chevrons, toggles, checkbox UIs, toasts, spinners (use a guttering candle).
- Blue links, focus rings in browser blue (use candle outline), pure `#000`/`#fff`.
- Gradients that look glossy, glassmorphism, blur panels.
- Dense data tables, "Submit/Cancel/OK" wording (write "Nail the Lid", "Keep Watch", "Choose Thy Deed").
- Linear easing, bouncy springs, slide-in drawers.
- Percent/progress bars; show time as a burning candle and wounds as ✠ marks.

## 8. Implementation notes for Wright

- Import `docs/art-direction/tokens.css` once at the root layout. Its `@font-face` urls are relative to that file (`fonts/…`, the names `fetch-fonts.sh` writes, not the upstream bracket names). In the app, load those same files with `next/font/local` and map them to `--bt-font-*`.
- Primitives to build as components: `<Parchment>`, `<InkPanel>`, `<Plate>` (framed art), `<Cartouche hunter selected waiting absent>`, `<WaxSeal>`, `<RibbonTabs>`, `<ChoiceCard verb line art hot>`, `<DropCapParagraph>`, `<CutScene src captions>`.
- Keyframes `bt-ink-in`, `bt-candle`, `bt-badge` are in `tokens.css`; page turn: add a `bt-page-turn` keyframe with the values in §5.
- Textures are inline SVG data URIs (`--bt-grain`, `--bt-foxing`), so no extra image files. Keep them as background layers, not `<img>`.
- Biome: tokens use kebab-case custom properties; no `!important`.
- Captions: wrap the currently spoken word or key noun in `<mark>`; CSS turns it candle yellow.
- Mock sizes are 1:1 CSS px (Dashboard 1920x1080; iPad 2048x1536 = iPad at 2x, so halve px values when building for 1024x768 CSS viewport).
