# Dracula D-00 inventory (Gamewright, 2026-11-10)

Repo state read: bpaksi/bloodtower at 4302024 (2026-11-10). The "On the box" section lists files on the design box (`/workspace`), which are not in the repo.

## In the repo
- **Rulings (the source of truth):** the cards AREA-080 (Dracula), with sub-areas AREA-101 to AREA-113, 160 cards.
  - The Nov 5 deck: DEC-739 to DEC-756 decided, DEC-779 to DEC-783 accepted (DEC-786), IDEA-070 to IDEA-162 decided.
  - DEC-780 and IDEA-094, IDEA-095 and IDEA-097 are still proposed. DEC-778 is proposed.
  - Open: Q-424 to Q-431 (AREA-115).
  - Release 1.2. DEC-788 makes Dracula a drop after 1.1.
- **Story docs:** `research/stories/dracula/` holds i6-outline, bloodtower-map (the index of the Nov 5 mapping), rulings (D-DRA-1 to D-DRA-14 and their status), characters, the continuity guide, the asset map, mechanics-map, the readiness review, inspiration and set-piece-counts (the parked 1.0 cut). `research/stories/dracula-v2/` is a source only (DEC-739).
- **Vellmoor:** the working name for the valley and the board (IDEA-142, DEC-754), in AREA-102 and AREA-103, IDEA-112, IDEA-142, IDEA-143, IDEA-148 and IDEA-158, DEC-740, DEC-754, Q-415, Q-420, story-pack-format.md and the mockups. "The Count of Vellmoor" is the pack title.
- **Scene scripts:** `assets/stories/dracula/scripts/` holds the README, cast.md, props.md, tokens-and-encounters.md (11 `enc-*`) and 19 scenes, n1 to n5 and nx. All are written for the old plot: Lenka taken at the start, four fixed hunters, private iPads and five nights.
- **The pack:** `packs/dracula/` holds pack.yaml (playable: false, Short and Standard, tagline "The Count has taken Lenka"), script.yaml (710 lines from the scripts, id form `<moment>.vo-NN`), cast.yaml (27 ids), CONVERSION-NOTES and cover.png.
- **PR #104 (2c254a7, merged Oct 19):** TTS for 20 `n1-lantern-and-bell` lines, wav and json, into `apps/burgomaster-funeral-poc/assets`. These are the old-plot fixed hunters, private lines included, in the pre-Charon voices. They are not in packs/dracula.
- **A1-4c:** `specs/A1-art-specs.md` §4 picks 3 Dracula lines to render (`n1-burgomasters-house.06`/`.07`, `n1-fortune-reading.10`). Nothing is rendered yet; the run waits for Bob's key and the art hold.
- **C2-01 dracula-length:** the approved plan and approval are on main (#341, #348). They take Long out of the 1.0 cut. The box copy at /workspace/c2 is older than main.
- **The Ruined Keep template:** plans/C3-ruined-keep.md, briefs C3/01 to C3/17 and C5/01 to C5/10, stories/ruined-keep/{feature-map, script}.md, specs/C5-05-ruined-keep-art.md, packs/base/tuning.yaml, and packs/test (pack_id test, titled The Ruined Keep).

## On the box (/workspace)
- `dracula-samples/` has no `scripts/` folder. It holds two preview wavs (opening, open-grave) and vellmoor-expansion.md. The scripts the brief named are the repo's `assets/stories/dracula/scripts/`, and those were used.
- `vellmoor-expansion.md`: the old six-night ideas (Garrison Bell/Marta, Gerhardt's Cipher, Kasimir's sanctuary). Used for ideas only.
- `drac/` and `dracula-continuity/`: the same art-continuity.md and art-audit.md (Oct 16) in both. The per-character facts still hold, for example Agnes's cross scar and Wren painted at script age. The PC-hunter framing and the 1920×1080 sizes are old.
- `dracula-encounter-trims/` patch: already merged as #38 (80ef752, Oct 16). The patch no longer applies. Nothing to do.

## The "4+1 nights" lock
- Found: D-DRA-1 to D-DRA-4 (Bob, Oct 14) and ruling 12 (Bob, Oct 15): all 5 nights at every length, nights 1 to 4 = K1 to K4, night 5 the castle.
- Superseded: DEC-508 (Oct 28) replaced it, and then Bob's Nov 5 deck did: IDEA-148 ("there are no counted nights… This replaces the five nights"), IDEA-079 (D-DRA-1, D-DRA-2 and D-DRA-4 replaced) and DEC-753 (four chapters).
- D-01 follows the Nov 5 rulings and asks Bob as OPEN RULING 1. The scene ids keep the night prefixes.
