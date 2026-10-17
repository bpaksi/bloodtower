# Delivery: test-pack stills and hunter portraits (2026-10-17)

The pack is `packs/test/` at the repo root (not `apps/bloodtower/packs/`). Its files are in `packs/test/assets/`. `assets.yaml` paths are file names relative to that folder, and the loader resolves them there.

Source: made with the free built-in image generator on Oct 17 2026, cost $0. The style reference was the Keeper portrait
(`apps/bloodtower/public/avatars/keeper/portrait.png`). The house look follows `/workspace/style/style-sheet.md`:
warm parchment and sepia, candle-yellow on blue-black, full-bleed. The files are delivered as PNG and committed as delivered, with no crop or resize.

## Stills (storyboard, 1920x1080 PNG)

The board cover-fits a still into its flexible frame (`background-size: cover`, centred), so each still stays 16:9.

| Asset id | Serves | File | Dims | sha256 | Mean luminance (0-255) |
|---|---|---|---|---|---|
| fx.hall | proving-ground.01, proving-ground.01~no-delta | `packs/test/assets/fx-hall.png` | 1920x1080 | `0d440e5d592de1748a659c4e6ef78dc4d5436a751c2fd6fc1100c27b936c159d` | 61.0 |
| fx.stair | grey-stair.01, grey-stair.02, grey-stair.02~no-delta, grey-stair.04 | `packs/test/assets/fx-stair.png` | 1920x1080 | `474f8ed8eea906180beefcf8daa6303216d81782623d66aff2b972ba91e0dee4` | 63.3 |
| fx.bell | the `bell` cue (screen half) at proving-ground.03 | `packs/test/assets/fx-bell.png` | 1920x1080 | `dcb7ff4ae41b0c5ab8bf2e357847e9009eab2946f54b62faeb8ad65559b22fc4` | 64.6 |

Luminance is the mean of the greyscale image (ITU-R 601 luma). All three stills are dark, at about a quarter of full scale.

## Portraits (1024x1024 PNG)

These show on the party join screen and in the board's hunter cartouches.

| Asset id | Hunter | File | Locked source sheet | Dims | sha256 |
|---|---|---|---|---|---|
| por.alpha | Agnes | `packs/test/assets/por-alpha.png` | `/workspace/refsheets/locked/agnes.png` | 1024x1024 | `09f5e4eabed61d9e30ff887b41b9ec5e0ef52a1c5977c45f242ca4a4db22a938` |
| por.beta | Tomas | `packs/test/assets/por-beta.png` | `/workspace/refsheets/locked/tomas.png` | 1024x1024 | `5d75c874355d16627687ab2246667319e33e56c9a7213752bf4f1db5ecc030b6` |
| por.gamma | Wren | `packs/test/assets/por-gamma.png` | `/workspace/refsheets/locked/wren.png` | 1024x1024 | `4125103b71731d1716447e424cbbb91081967da2e3a9dee9f6f756f748e685de` |
| por.delta | Emeric | `packs/test/assets/por-delta.png` | `/workspace/refsheets/locked/emeric.png` | 1024x1024 | `eef36ab343c7538f8a803f22c50dc29d6bcf6709a5322440b026441a0135abef` |

The first takes of Agnes, Tomas and Emeric were discarded because they did not match their locked sheets.

## Notes

- `assets.yaml`: these seven entries now have `status: final` and `path: <name>.png`.
- Edges: fx.hall still fades to bare parchment at the left edge and lower corners (left-edge mean luma about 155). That is not strictly full-bleed under the style sheet. The pale edges on fx.stair are painted wall, not margin. fx.bell is full-bleed.
- Continuity: the stills show no characters. The portraits depend on the locked sheets above and on the house look.
