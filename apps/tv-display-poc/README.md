# TV display POC (`tv-display-poc`)

| | |
|---|---|
| Purpose | A standalone test page for judging how a browser game looks and sounds on the TV compared with the Mac display: sounds, moving, panning and speaking images, and reference stills. Runs without Bloodtower. Supports [research/tv-display](../../research/tv-display/README.md) |
| Phase | Explore |
| SDLC tier | Experiment |
| Status | Built, awaiting Bob's hardware tests |
| Disposable? | Yes |

## Run

```sh
cd apps/tv-display-poc
pnpm start        # http://127.0.0.1:4760  (PORT and HOST override)
```

No build, no dependencies, no Bloodtower. Open the page in Chrome on the Mac, share or extend it to the TV, and work through the tabs. Press `F` for fullscreen and `H` to hide the tab bar. Type is sized from the viewport so it scales to 3840×2160.

## Tabs

| Tab | Tests |
|---|---|
| Sounds | Beep-and-flash sync, sweep, level steps, left/right, low drone, spoken voice line |
| Motion | Sweeping bar with a frame-rate counter, window-glow flicker over the dimmed hero |
| Pan | Slow, medium and fast pan and zoom over the hero image |
| Speak | The Keeper in the real dialog frame, mouth frames cycling while the Mac voice speaks |
| Black on black | 0 to 20 step ramp, dark gradient, dark text ladder, darkened art, black/near-black/grey backdrop |
| Reference | Edge and overscan guides, circle, colour bars, text sizes, pixel checker, grey ramp |
| Info | Viewport JSON for the experiment log |

## Notes

- Images are copies from `apps/bloodtower/public/` (hero, Keeper portrait and mouth frames, dialog frame and parchment, window glow). The mouth frames are JPEG at quality 95 to keep the repo small; the portrait stays PNG.
- Sounds are generated in the browser, and the voice is the Mac's speech voice. The mouth movement is random, not synced to words.
- Written for the Mac only; no iPad or phone layout.
