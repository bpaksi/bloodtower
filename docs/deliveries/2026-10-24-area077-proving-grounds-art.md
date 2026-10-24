# Delivery: AREA-077 Proving Grounds Story-board art (C1-step-10)

Date: 2026-10-24
Owner: Illusionist
Serves: C1-step-10 / AREA-077 move-only gameplay slice; pack `packs/test` (title Proving Grounds)
Continuity: DEC-201 (Story board only); DEC-220 Enter/Leave; Gamewright art list 2026-10-24
Bob: show, do not wait for approval (2026-10-24)

The files are in `packs/test/assets/`, flat, as delivered. No crop and no resize. Pack format v2 keeps the registry on `packs/test/pack.yaml` (`status: final`). There is no `assets.yaml`: a sibling file of that name is pack data whose stem duplicates the manifest field `assets`, and `pack:lint` fails it (P2-1). The loader does not merge split files.

`path` is relative to the pack folder (`packs/test/`), which is how `mediaOnDiskIssues` resolves a file (`assets/place-village.jpg` in the test pack). The 2026-10-17 stills used a bare file name because the R1 loader always joined `assets/`. A bare name still resolves for a still, through that fallback. The pack-folder path is the one the checker finds first, and the one a host should join onto the pack root.

Every row targets `storyboard` (DEC-201). iPads get no place still and no story art.

## Place stills (Story board, 16:9 JPEG)

Enter opens the still for that building type. The ids use the base building types (`village`, `bazaar`, `citadel`, `sanctuary`). The v2 asset object has no place-type key, only `id`, `type`, `target`, `status`, and `path`.

| Asset id | Enter | File | Dims | sha256 |
|---|---|---|---|---|
| place.village | Village | `packs/test/assets/place-village.jpg` | 1280x720 | `0091c45875fea2ab19724bd24e533e12d0f92e378e6008c275071a96a6dfa354` |
| place.bazaar | Bazaar | `packs/test/assets/place-bazaar.jpg` | 1280x720 | `2a5ec82f61d86c465ce6cdf1de582b6f8a073d887a9cc5f4d4dee02810428037` |
| place.citadel | Citadel | `packs/test/assets/place-citadel.jpg` | 1280x720 | `14596f2846203e51eadf3110328809ba67aa6577cef839a695dacdb80a8a8ef2` |
| place.sanctuary | Sanctuary | `packs/test/assets/place-sanctuary.jpg` | 1920x1080 | `3f9e837a38b7737f53478e6c8ded598aeac8546bac83098d8aef89699be0b4f0` |

Village, Bazaar, and Citadel are 1280x720. Sanctuary is 1920x1080. All four are exact 16:9. The board cover-fits a still, so the two sizes can share one frame.

## Move wash (Story board, 16:9 JPEG)

Shown under the space names while a group is walking. Leave returns to this map. Enter and Leave do not spend a move (DEC-220).

| Asset id | Use | File | Dims | sha256 |
|---|---|---|---|---|
| board.wash | Move-map presence | `packs/test/assets/board-wash.jpg` | 1920x1080 | `33f4419183f53be479251e5e148d90ea744b36eb50ec5ed1f2bc5199974ba16c` |

The wash is Story-board atmosphere. It is not a kingdom map and not a space diagram. It was derived from Bob's top-down board photo; the photo stays the reference for space names, and this file does not replace the board graph.

## Hero marks (claim / setup / Begin, 512x512 PNG)

Round parchment tokens, one letter, kingdom colour. RGBA (PNG colour type 6). Type is `portrait`, not `still`, so a 16:9 still check does not apply. They are not the base-pack placeholders `por.hero-a` … `por.hero-f` on `packs/base`, which stay placeholder.

| Asset id | Hero | Kingdom | Colour | File | sha256 |
|---|---|---|---|---|---|
| hero.a.mark | hero-a | N Arisilon | crimson | `packs/test/assets/hero-a-mark.png` | `a2d0581646a6f6643c604c52574bacbd05eb9bcf9c1e6992b93de0bfe042cdb6` |
| hero.b.mark | hero-b | E Brynthia | blue | `packs/test/assets/hero-b-mark.png` | `60f42e1f607431ae97e75bb439e89b779f05435302b54b4c4f4d74565126f992` |
| hero.c.mark | hero-c | S Durnin | green | `packs/test/assets/hero-c-mark.png` | `41bbe166f2fdf21ea021611f60d36e6893712ebf75fbcac8b994663d99c6aa32` |
| hero.d.mark | hero-d | W Zenon | gold | `packs/test/assets/hero-d-mark.png` | `e66f9ffe1b2c56337bd056e4f3f7aa2999b7444594a7c4f022f8f3d3df36aa71` |

`mediaOnDiskIssues` checks still, clip, and audio. A portrait is not in that set, so `pack:lint` does not open these pngs. The path is the same pack-folder path as a still (`assets/hero-a-mark.png`). Resolving `path` from the pack root finds the file.

## Host wiring for Wright

This PR registers the ids and the files. It does not teach the host to pick one when Enter fires. `loadStories` still does not hand asset ids to the board.

- Enter Village / Bazaar / Citadel / Sanctuary: show `place.village`, `place.bazaar`, `place.citadel`, or `place.sanctuary` on the Story board. The id suffix is the building type id.
- Walking the move map: show `board.wash` under the printed space names.
- Claim, board setup, and Begin: show `hero.a.mark` … `hero.d.mark` for those four heroes. hero-e and hero-f have no mark in this slice.
- iPads stay text and icons (DEC-201).

## Out of scope

Events and encounters, tower cues, per-kingdom building sets (16), Hall-of-Stories polish, iPad place art (DEC-201).

## Notes

- Place stills are generic, not kingdom-specific. Leave only. No encounter art.
- `packs/test/pack.yaml` `assets:` is these nine rows. `pnpm --dir apps/bloodtower pack:lint packs/test` resolves the five stills on disk.
- The v2 lint fixture that used to replace the literal `assets: []` now replaces the whole `assets:` block, so a filled list can still be swapped in a temp copy.
