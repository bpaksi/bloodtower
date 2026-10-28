# Delivery: AREA-077 Proving Grounds Story-board art (C1-step-10)

Date: 2026-10-24
Owner: Illusionist
Serves: C1-step-10 / AREA-077 move-only gameplay slice; pack `packs/test` (title Proving Grounds)
Continuity: DEC-201 (Story board only); DEC-220 Enter/Leave
Bob: look approved 2026-10-24 ~10:48 AM ET. Village locked. Bazaar remade (first stall-ring layout, village scale, daytime under storm clouds, brooding). Citadel is the secular keep, the seat of power. Sanctuary is the chapel: sacred rest, cures, and lore. Earlier the same day, via Gamewright: ship the four Enter place stills only. Board wash and hero marks stay withdrawn.

The files are in `packs/test/assets/`, flat, as delivered. No crop and no resize. Pack format v2 keeps the registry on `packs/test/pack.yaml` (`status: final`). There is no `assets.yaml`: a sibling file of that name is pack data whose stem duplicates the manifest field `assets`, and `pack:lint` fails it (P2-1). The loader does not merge split files.

`path` is relative to the pack folder (`packs/test/`), which is how `mediaOnDiskIssues` resolves a file (`assets/place-village.jpg` in the test pack). The 2026-10-17 stills used a bare file name because the R1 loader always joined `assets/`. A bare name still resolves for a still, through that fallback. The pack-folder path is the one the checker finds first, and the one a host should join onto the pack root.

Every row targets `storyboard` (DEC-201). iPads get no place still and no story art.

## Place stills (Story board JPEG)

Enter opens the still for that building type. The ids use the base building types (`village`, `bazaar`, `citadel`, `sanctuary`). The v2 asset object has no place-type key, only `id`, `type`, `target`, `status`, and `path`.

| Asset id | Enter | File | Dims | sha256 |
|---|---|---|---|---|
| place.village | Village | `packs/test/assets/place-village.jpg` | 1280x720 | `35b14328a0163accd5995a2c47b87dc68e068e75b2009a34a6efe8a3a235b93d` |
| place.bazaar | Bazaar | `packs/test/assets/place-bazaar.jpg` | 864x1152 | `eed0548eab50baf12f052e4b9fa7ca3f3fe5a8d4ade63f99f7cb7da4acb542f2` |
| place.citadel | Citadel | `packs/test/assets/place-citadel.jpg` | 1280x720 | `cf2c04cdd17ab67f4ed3f28803986b79421501d5466a8221c2dd5c9642bc299b` |
| place.sanctuary | Sanctuary | `packs/test/assets/place-sanctuary.jpg` | 1280x720 | `171682a853a6abdb73dd67947ae3206073d2f2ac780ba691af57b1c12fe84b94` |

These four files replace the first drop. Same ids, same `pack.yaml` rows. Village, Citadel, and Sanctuary are 1280x720, exact 16:9. Bazaar is 864x1152 (3:4), the file as delivered. The board cover-fits a still into a 16:9 well, so the bazaar frame crops that portrait.

### Look (Bob, 2026-10-24 ~10:48 AM ET)

- Village: locked.
- Bazaar: remade. First stall-ring layout, village scale, daytime under storm clouds (brooding).
- Citadel: secular keep, the seat of power.
- Sanctuary: chapel. Sacred rest, cures, and lore.

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
