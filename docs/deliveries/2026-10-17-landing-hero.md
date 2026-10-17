# Delivery: landing hero image (2026-10-17)

For Wright's root `/` landing page.

| | Path | Dimensions | sha256 |
|---|---|---|---|
| Input | `landing-hero.jpg` (outside the repo) | 1280x720 JPG | `64313eb55fd2c1a64c8ce4fbc748df7caecf4f859ddd9c7af4ae3a9e58260bb4` |
| Output | `apps/bloodtower/public/landing/hero.webp` | 1920x1080 WebP | `c265223313d1b57a76c5e475e439f511200718143798b2bed499e4f8580cb4e8` |

- Source: free built-in image generator, Oct 17 2026, $0. Style reference: the Keeper portrait
  (`apps/bloodtower/public/avatars/keeper/portrait.png`). House look: warm parchment/sepia,
  candle-yellow on blue-black, full-bleed.
- Processing: upscaled 1280x720 to 1920x1080 with Pillow LANCZOS, saved as WebP quality 90. Not cropped (16:9).
- Layout: 16:9 with no text. The upper-left third is kept dark for the title and buttons that overlay it.
- Continuity: there are no characters in this image.
