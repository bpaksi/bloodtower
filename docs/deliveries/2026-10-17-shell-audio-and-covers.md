# Delivery: shell audio and pack covers (2026-10-17)

From Illusionist. Bob approved audio v2 at 9:22 PM ET on Oct 17 2026. These are the files the shell build uses (`apps/bloodtower/plans/shell-prompts.md`, steps 1, 2 and 6). Each file's sha256 was checked against the delivery note before commit.

## Covers (1920x1080 PNG, 16:9)

| File | Pack | sha256 |
|---|---|---|
| `packs/dracula/assets/cover.png` | The Count of Vellmoor | `8ff81d2c0c6ecb365e348b6f85d00efa074500afc01e69aa5188c4766a37b1a3` |
| `packs/test/assets/cover.png` | Proving ground | `f5f398dbac9f8cdc5cad77b47ec1cdc9fdfe8616a3776edaa11e2a34f7144f23` |

`packs/dracula` has no `pack.yaml` yet, so the loader skips it until step 1 adds one. A PNG in `packs/test/assets/` passes the loader's image-only rule.

## Audio (AAC-LC 192 kbps .m4a, 48 kHz stereo)

| File | Use | Level | Length | sha256 |
|---|---|---|---|---|
| `apps/bloodtower/public/audio/signature/signature-bed.m4a` | App signature bed, loop | -30 LUFS | 114 s | `969db6b1c2bfd90e2e60aa670464c83cf91ee4039e7c67cc6d42ec4917d3bc61` |
| `apps/bloodtower/public/audio/signature/motif-sting.m4a` | Landing window lights, one shot | -18 LUFS | 6.5 s | `24c2c231a963c4998980ea5609796d2725fc9f31f4a7f1435d7e63826600a81d` |
| `apps/bloodtower/public/audio/signature/motif-soft.m4a` | Game chosen, one shot | -26 LUFS | 6.5 s | `8d15b0545943c39817cf76f11ff99aaa501b12b1c858aad2b024cdfe44e2302a` |
| `assets/audio/proving-ground/startup-ambient.m4a` | Proving Ground start-up mood, loop | -30 LUFS | 96 s | `1a451ef841fd11c48cf97b9e926d313e8b17590b76e355a672deb80a973b02e3` |
| `assets/audio/proving-ground/night1-ambient.m4a` | `mus.night-1` bed, loop | -30 LUFS | 100 s | `928b38e0dd4cea60941d2eb46b8c9c4970c9bc75f5c40aea71d21d29f3834066` |
| `assets/audio/proving-ground/night2-ambient.m4a` | `mus.night-2` bed, loop | -30 LUFS | 90 s | `c4dd5e8609bb5b80d1bec45331a509439b161bc5464bee75722a3551e8cc809d` |
| `assets/audio/proving-ground/pg-music.m4a` | Waiting music, loop | -26 LUFS | 150 s | `fea65b3c92bf6ba2f600dae22c1e38c0b6fc7d93bd2cdbe9a944c50e418e3b48` |

- The signature sounds are app-level, so they sit next to the other app media in `apps/bloodtower/public/` (`avatars/`, `landing/`).
- The Proving Ground loops are parked in `assets/audio/proving-ground/`. The pack loader allows only image files in `packs/test/assets/` and no other folders in `packs/test/`, so putting them in the pack now would fail `pnpm check`. Step 6 moves them into the pack and extends the loader.
- All loops are seamless with no crossfade baked in. Files are already at their target loudness: play them at unity gain.
- WAV masters, source code, seam-check clips and Illusionist's full notes stay outside the repo.

## Loop points (Web Audio)

Each loop is encoded with a hidden 12 s pre-roll and an MP4 edit list, so it plays sample-exact. Browsers differ in how they apply the edit list, so check the decoded length:

- If `decodeAudioData` returns N frames (or N plus a few hundred padding frames), the decoder applied the edit list: `loopStart = 0`, `loopEnd = N / 48000` (bed 114, startup 96, night1 100, night2 90, music 150 s).
- If it returns about N + 582,000 frames, the decoder ignored it: `loopStart = 577024 / 48000 = 12.021333333 s`, `loopEnd = loopStart + N / 48000`, and start playback at `loopStart`.
- N = 5,472,000 (bed), 4,608,000 (startup), 4,800,000 (night1), 4,320,000 (night2), 7,200,000 (music).
- The one-shots are plain encodes: 1024 priming samples and 312,000 playable samples (6.500 s). They do not loop.
- The WAV masters are the safest loop source for a native Mac app later.

## Source

The audio is fully synthetic (numpy/scipy, ffmpeg 7.1). It uses no samples and no third-party audio, so there is nothing to license. Nobody had listened to v2 before approval; it was checked by measurement only.
