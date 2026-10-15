# Burgomaster's Funeral POC: assets

Rebuilt 2026-10-14 after accidental deletion. Everything here is a **placeholder or draft** to be replaced in place by the Illusionist. Source of truth for text: `script/n2-burgomasters-funeral.md` (copy of `assets/stories/dracula/scripts/n2-burgomasters-funeral.md`) and `../docs/PRD.md`.

## Layout
```text
manifest.json        # dict keyed by moment/asset ID: id, type, target, path, status, text
script/              # copy of the funeral script
stills/              # <moment-id>@dashboard.png (1920x1080) or @ipad.png (privates)
clips/               # <moment-id>@dashboard.poster.png (ffmpeg missing: poster stands in for 8 s clip)
cards/               # investigation pick cards + lid-choice option cards
portraits/           # hunters (wren, tomas, agnes, emeric) + NPCs (dorka, anton, dorka-mother, castle-servant, hanne)
audio/lines/         # one WAV per spoken line: <moment-id>.vo-NN.<speaker>.wav
audio/sfx/           # placeholder sound effects
audio/music/         # placeholder music beds
cues/cue-sheet.json  # tower cues heartbeat, dim-all, seal-sequence, skull-drop (all Library) with screen fallbacks
NEEDS-FROM-ILLUSIONIST.md
```

## ID conventions (research/game-design/asset-organization.md)
- Moments: `n2-burgomasters-funeral.<NN>`; variants `~variant` replace the base (`.02~no-wren`, `.lid-choice~nailed~no-wren`).
- Event moments `scene.<event-name>` play in addition to the sequence (`.lid-choice`, `.investigate`, `.investigate.share`).
- Privates carry the hunter: `.09.private.<hunter>`, `.investigate.<action>.<finding>.private.<hunter>`.
- Lines: `<moment-id>.vo-NN`. SFX/music: `n2-burgomasters-funeral.sfx.<name>` / `.music.<name>`. Portraits: `dracula.cast.<name>.portrait`.
- Render profiles: `@dashboard`, `@ipad`; `@phone` optional and falls back to `@ipad` or text (R-AST-ORG-14).
- 1981 bookends (R-LF-9): not in the repo. Homage recreations are kept locally only (`assets/shared/dt1981/` is gitignored).

## Privacy by target
- `storyboard`: shared screen and speakers (the Story board). Never carries a `.private.*` payload. The manifest still stores this audience as `dashboard` while the POC code is frozen (spec D25).
- `ipad:<hunter>`: every device holding that hunter, only while the hunter is present.
- `ipad:all`: shown on every hunter's device (pick cards, hunter portraits).
- `phone`: phone view of the same content (no separate assets yet).

## Drum rule
A story cue may turn a drum only to set a glyph the rules read. Otherwise drums stay put (the risky investigation pick uses `seal-sequence`, no drums, after all picks lock).

## Replacing placeholders
Placeholders are replaced in place: keep the same ID and path, overwrite the file, and change `status` from `placeholder` to `draft` (or `final`).
