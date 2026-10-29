# Asset organization (multi-story)

**History (DEC-610):** written before the design cards. Where it disagrees with a card, the card wins; known stale lines say "Superseded by". Status: agreed draft, 2026-10-14, Gamewright + Illusionist. Draft for Bob's review. Design only.

## Goal
Any number of stories can live side by side. Each story is a self-contained pack on a small shared base, and adding a story never touches another story or the engine.

## Layout

```text
assets/
  shared/                       # real files used by every story (sound + UI only, never style)
    tower/cues.json             # named cue library -> tower sound/light indices (api-surface-7.1.2)
    ui/                         # engine chrome, icons, fonts
    sfx/                        # generic sounds: dice, door, coin, footsteps
    cast/                       # neutral NPC avatars: default cast and extra faces, always under the story's filter (DEC-334)
  stories/<story-id>/           # SOURCE ONLY: what people write and version
    story.json                  # manifest + AV theme (see below)
    scripts/<scene-id>.md       # dialog, [sfx:] [music:] cues, still/clip marks, private lines
    cast/<character>/
      voice.json                # TTS voice + style line
      ref/                      # character reference sheets (image-model inputs)
    library/                    # reusable moments by ID: castle exterior, dawn transition
    tower-cues.json             # story palette + cue overrides, mapped to shared cue names
  rendered/<story-id>/          # GENERATED ONLY: never hand-edited
    <hash>.wav|png|mp4          # named by hash of the inputs that made it
    index.json                  # stable ID -> current hash file, draft|final, inputs
```

## Rules
- R-AST-ORG-1. The engine refers to assets only by stable ID, never by path, and reads only `rendered/<story-id>/index.json` plus `shared/`. *Superseded by DEC-386: shipped files live in packs/<story>/assets with an index.*
- R-AST-ORG-2. Source and rendered output stay separate. Rendered files are content-addressed: a re-render overwrites nothing, and identical inputs reuse the same file.
- R-AST-ORG-3. A still or clip belongs to one script moment, ID `scene.moment`. Reusable media lives in `library/` and is referenced by ID.
- R-AST-ORG-4. Private lines carry the hunter in the ID, e.g. `scene.moment.private.wren`. The index answers which iPad plays what. *Superseded by DEC-057 and DEC-201: there are no private lines.*
- R-AST-ORG-5. Character reference sheets are versioned inputs. Changing a sheet flags every still of that character for re-render.
- R-AST-ORG-6. The theme belongs to the story. Style prompts, the filter preset (palette, grain, duotone), music mood, and narrator voice live in `story.json`. Fallback to `shared/` applies only to sound and UI files, never to style. One exception: the shared NPC avatars in `shared/cast/` (DEC-334), which always play under the story's filter preset.
- R-AST-ORG-7. Every rendered file is marked draft (cheap and fast) or final. Playtests may use drafts; a release build requires finals.
- R-AST-ORG-8. Readiness check: a story is playable only when every ID its scripts reference exists in the index and every private moment has a line for each hunter. For release, all of them must be final.
- R-AST-ORG-9. All media is pre-rendered and cached. Nothing is generated live during play.

## story.json AV theme fields
`stillStyle`, `clipStyle`, `filterPreset`, `palette`, `narratorVoice`, `cast[]` (id, voice, styleLine, refSheets), `musicMood`, `sfxSet`, `towerPalette`.

## Owners
Gamewright owns this layout and the readiness rules. Illusionist owns the render pipeline (tts-explorer, visuals test) and will move them to this layout. Loremaster writes `scripts/` in the agreed format.

## Variant IDs (added 2026-10-14)
- R-AST-ORG-10. A line or moment with alternatives uses `scene.moment~variant`, e.g. `nx-pressed-flower.03~wren` or `n2-funeral.05~night-lost`. Private and variant parts combine as `scene.moment.private.<hero>~<variant>`. Speaker placeholders like `{HUNTER}` are not allowed in scripts; write one tagged variant per value instead.
- R-AST-ORG-11. Per-hunter spotlight moments (one hunter is featured, the others watch) are written as concrete IDs for every hunter, e.g. `.04.private.wren` and `.04.private.wren-watched`. Placeholder IDs like `<spotlighted>` fail the readiness check.

- R-AST-ORG-12. Recurring props (e.g. a named sword or relic) are treated like cast. They get `props/<prop-id>/ref/` reference sheets and a stable ID, so every still renders them consistently. Changing a sheet flags every still that uses the prop for re-render.

- R-AST-ORG-13. Event moments, which fire on an engine event rather than by sequence, use `scene.<event-name>` (kebab-case, e.g. `n5-final-confrontation.blade-lost`). Variants still use `~variant`. A `~variant` replaces its base moment, while an event moment plays in addition to the sequence.

- R-AST-ORG-14. A third render profile, `@phone`, is optional per asset. Where it is missing, the phone falls back to `@ipad` scaled down, or to text only.
