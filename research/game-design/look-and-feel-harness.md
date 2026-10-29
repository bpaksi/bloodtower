# Look-and-feel harness: screens and slots

**History (DEC-610):** written before the design cards. Where it disagrees with a card, the card wins; known stale lines say "Superseded by". Status: draft for Bob's review, 2026-10-14. Design only, story-neutral. Gamewright owns the structure (screens, zones, slots, invariants). Illusionist owns the look in [../look-and-feel/](../look-and-feel/README.md): theme tokens, presets, motion, and render specs.

## Contract
- R-LF-1. A story picks one theme preset (`story.json` `themePreset`) and may override tokens. It fills slots with asset IDs (see asset-organization.md). A story can never change screen layout, zones, controls, or invariants.
- R-LF-2. Every slot has a default, so a story with empty slots still renders (with the engine look).
- R-LF-3. Slots take asset IDs, never paths. The readiness check validates every filled slot and the variant it needs (`@dashboard` / `@ipad`).

## Invariants (every story, every screen)
- R-LF-4. Dashboard play view always shows, in fixed zones: the clock/phase, party resources, story tracks (e.g. corruption, keys), threat (skulls/seals), and tower status. Positions never move between stories.
- R-LF-5. Readable at table distance: Dashboard body text is at least 28 px at 1080p, and key numbers at least 48 px. Text contrast is at least WCAG AA over any theme texture.
- R-LF-6. iPad touch targets are at least 44 pt, and primary actions sit in the bottom thumb zone.
- R-LF-7. Motion never blocks input. Every reveal or loop is skippable or runs behind live controls. A reduced-motion setting keeps ambient loops but drops big transitions.
- R-LF-8. Private content appears only on iPads (R-DEV-4).

## Dashboard screens (Mac browser, 16:9)
| Screen | Zones | Story slots |
|---|---|---|
| D1 Cold open | full-bleed media | none (engine-shared) |
| D2 Hall of Stories | background, door row, menu bar | per story: `door.loop`, `door.title`, `motif` |
| D3 Story intro | full-bleed media, tagline band | `intro.clip`, `keyArt`, `tagline`, `theme.music` |
| D4 Setup wizard | step header, illustration, instruction, progress, Next/Back | `wizard.step.<id>.art`, `wizard.ambient`, `fortuneCard.deck` |
| D5 Play view | map/board panel, status rail (fixed invariants), scene/event panel, log ticker, tower status chip | `map.art`, `track.<id>.icon`, `resource.<id>.icon`, `panel.frame` |
| D6 Scene player | media (still/clip), speaker portraits (max 2), caption band | `scene.<id>.*`, `cast.<id>.portrait` |
| D7 Encounter / battle | foe card, choice summary, result banner | `foe.<id>.art`, `encounter.<id>.art`, `result.stingers` |
| D8 Chapter / phase card | title, subtitle, stinger | `phaseCard.art`, `phaseCard.stinger` |
| D9 Summary | outcome media, timeline, graphs, highlights, totals | `outcome.<id>.clip`, `summary.frame` |
| D10 Loading / calibration | looping cover, fortune card | `loading.cover`, `fortuneCard.deck` |

## iPad screens (portrait/4:3, one per player)
| Screen | Zones | Story slots |
|---|---|---|
| P1 Join | code entry, hero picker | `cast.<id>.portrait`, `join.flourish` |
| P2 Hero sheet | portrait, stats, items, story tracks, abilities | `hero.<id>.card`, `item.<id>.icon` |
| P3 Private scene | media, caption, continue | `scene.<id>.private.<hero>` |
| P4 Choice | prompt, 2–3 options, cost hints | `choice.frame` |
| P5 Secret goal | goal card, progress | `secretGoal.<id>.card` |
| P6 Waiting | ambient loop, "look at the Dashboard" hint | `ipad.ambient` |
| P7 Personal summary | personal stats, title, private outcome | `hero.<id>.title` |

## For Illusionist
Map these to theme tokens (palette, type, texture, frames, motion) and the three presets (manuscript, ember, companion). Flag any zone that a preset can't style cleanly.

## Open questions
- Should the play view show the board map, or let the physical board carry that and use the space for scenes?
- Is a reduced-motion setting wanted?

## R-LF-9 1981 homage bookends (story-neutral, every story)
Every session opens and closes with recreations of the original 1981 tower. Ships only as recreations: synthesized 1-bit square-wave audio and pen-and-ink homages of the display slides. The Milton Bradley/Hasbro originals in `research/dark-tower-1981/` are reference only and never ship.

| Slot ID | Where | Content | Rule |
|---|---|---|---|
| `shared.dt1981-cold-open.tune` | D1 cold open, Dashboard audio | Recreated 1981 intro tune | Plays first, then crossfades to the story theme |
| `shared.dt1981-cold-open.slides` | D1 cold open | Ink-in sequence of the slide-drum homages | Runs under the tune and is skippable after the first play |
| `shared.dt1981-win.tune` | D10 summary, before the story ending | Recreated victory/clear tune | Any win tier (full or lesser) |
| `shared.dt1981-win.slide` | D10 | Victory slide homage | Any win tier |
| `shared.dt1981-loss.tune~lost` / `~plague` | D10 | Recreated lost or plague tones | Loss tiers; each story maps its loss outcomes to a variant in `story.json` (default: `~lost`) |
| `shared.dt1981-loss.slide~lost` / `~cursed` | D10 | Lost or cursed slide homage | Same mapping as the tune |

- Order at the end: 1981 bookend (about 5 seconds or less), then the story's ending scene, then the summary screen.
- Audio plays on the Dashboard only, not through the tower, since the tower can't play custom audio.
- These assets live in `assets/shared/dt1981/`, and the content checker requires all of them.

- D (QR join overlay): a reusable Dashboard overlay showing the session QR and the short join code. Available from the wizard and from every in-game Dashboard screen.

## R-LF-10 Phone player view (streamlined)
A single-column, portrait, one-thumb version of the player screens (P1–P7). It shows only what a player must act on or keep private:
- Hunter name, corruption and story items on one compact status line.
- The current private moment (clue, secret goal, private line) as text, with optional audio through the earpiece or headphones.
- At most one decision at a time, with large buttons.
- No decorative stills by default. A small thumbnail is used only when the image is the clue. Full art stays on the Dashboard.
- Haptic tap on a private cue, so players don't need to watch the screen.
- Same privacy rule as iPads: nothing private shown on the Dashboard.
