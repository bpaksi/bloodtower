# Delivery: AREA-077 Proving Grounds Story-board art (C1-step-10)

Date: 2026-10-24
Owner: Illusionist
Serves: C1-step-10 / AREA-077 move-only gameplay slice; pack `packs/test` (title Proving Grounds)
Continuity: DEC-201 (Story board only); DEC-220 Enter/Leave
Bob: show, do not wait for approval (2026-10-24). Correction the same day, via Gamewright: ship the four Enter place stills only.

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

## Withdrawn

Board wash (`board.wash`, `board-wash.jpg`) and the four hero claim marks (`hero.a.mark` … `hero.d.mark`) were in the first commit of this PR. Bob corrected that the same day, via Gamewright: those were Gamewright overreach, not his intent. They are removed from `packs/test/assets/` and from `pack.yaml`. This pack does not ship a move-map wash or claim/setup tokens.

## Host wiring for Wright

This PR registers the four ids and the files. It does not teach the host to pick one when Enter fires. `loadStories` still does not hand asset ids to the board.

- Enter Village / Bazaar / Citadel / Sanctuary: show `place.village`, `place.bazaar`, `place.citadel`, or `place.sanctuary` on the Story board. The id suffix is the building type id.
- iPads stay text and icons (DEC-201).

## Out of scope

Events and encounters, tower cues, per-kingdom building sets (16), Hall-of-Stories polish, iPad place art (DEC-201), move-map wash, hero claim marks.

## Notes

- Place stills are generic, not kingdom-specific. Leave only. No encounter art.
- `packs/test/pack.yaml` `assets:` is these four rows. `pnpm --dir apps/bloodtower pack:lint packs/test` resolves the four stills on disk.
- The v2 lint fixture that used to replace the literal `assets: []` now replaces the whole `assets:` block, so a filled list can still be swapped in a temp copy.
