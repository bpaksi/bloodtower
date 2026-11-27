# Approval: C5 / 05-art-through-a1 — The Ruined Keep's art and voice through the A1 adapter

| Item | Approved by | When (America/Detroit) | Chat link | Version (commit sha of file) |
|------|-------------|------------------------|-----------|------------------------------|
| eval.md | Bob | 2026-10-31 6:16 PM ("Approve all") | | |
| mockup.html | n/a | | | no mockup: no screen change |

## Art finals (Bob)

One line per asset id in `packs/test/assets/index.json`; EV-04 checks every id is ticked.

- [x] place.village — approved by Bob 2026-11-27
- [x] place.bazaar — approved by Bob 2026-11-27
- [x] place.citadel — approved by Bob 2026-11-27
- [x] place.sanctuary — approved by Bob 2026-11-27
- [x] painting.ch1-the-roads — approved by Bob 2026-11-27
- [x] painting.ch2-the-keep — approved by Bob 2026-11-27
- [x] painting.ch3-the-tower — approved by Bob 2026-11-27
- [ ] foe.level-1 — approved by Bob 
- [ ] foe.level-2 — approved by Bob 
- [ ] foe.level-3 — approved by Bob 
- [ ] foe.level-4 — approved by Bob 
- [x] foe.warden~phase-1 — approved by Bob 2026-11-27
- [x] foe.warden~phase-2 — approved by Bob 2026-11-27
- [x] foe.warden~phase-3 — approved by Bob 2026-11-27
- [ ] foe.keep-garrison — approved by Bob
- [x] painting.keep-crypt~left-corridor — approved by Bob 2026-11-27
- [x] painting.keep-crypt~left-wall — approved by Bob 2026-11-27
- [x] painting.keep-crypt~ahead-corridor — approved by Bob 2026-11-27
- [x] painting.keep-crypt~ahead-wall — approved by Bob 2026-11-27
- [x] painting.keep-crypt~right-corridor — approved by Bob 2026-11-27
- [x] painting.keep-crypt~right-wall — approved by Bob 2026-11-27
- [x] painting.keep-sealed-door — approved by Bob 2026-11-27
- [x] painting.trap-pit — approved by Bob 2026-11-27
- [x] painting.trap-falling-rocks — approved by Bob 2026-11-27
- [x] painting.tower-basement-map — approved by Bob 2026-11-27
- [x] painting.tower-main-map — approved by Bob 2026-11-27
- [x] painting.tower-top-map — approved by Bob 2026-11-27
- [x] painting.finale-win — approved by Bob 2026-11-27
- [x] painting.finale-loss — approved by Bob 2026-11-27
- [ ] chapter-card.01~vo-01 — approved by Bob
- [ ] chapter-card.02~vo-01 — approved by Bob
- [ ] chapter-card.03~vo-01 — approved by Bob
- [ ] chapter-win.01~vo-01 — approved by Bob
- [ ] chapter-win.03~vo-01 — approved by Bob
- [ ] seal-break.01~vo-01 — approved by Bob
- [ ] seal-break.02~vo-01 — approved by Bob
- [ ] seal-break.03~vo-01 — approved by Bob
- [ ] finale-win.shattered~vo-01 — approved by Bob
- [ ] finale-win.oath~vo-01 — approved by Bob
- [ ] finale-loss.skulls~vo-01 — approved by Bob
- [ ] finale-loss.corruption~vo-01 — approved by Bob
- [ ] finale-loss.fallen-buildings~vo-01 — approved by Bob
- [x] painting.cover — 16:9 Ruined Keep cover for 1.0 (Bob locked Nov 2 2026 via Warden) — approved by Bob 2026-11-27
- [x] glow.cover — approved by Bob 2026-11-27

Change note 2026-11-02: avatar.loremaster (portrait, anchor, mouth-A–H) removed — talking portrait deferred, not in 1.0 (Bob, Nov 1: Loremaster is audio + captions). Cover locked as painting.cover. Small tweak; no re-approval per Bob's Nov 1 rule.

Change note 2026-11-10: checklist ids updated to the adopted ids (Warden ruling 2026-11-10 relayed via Wright; [C5-05-ruined-keep-art.md](../../../../../../research/game-design/specs/C5-05-ruined-keep-art.md) §6). Renamed: tomb.keep-crypt~* → painting.keep-crypt~*, trap.* → painting.trap-*, map.tower-* → painting.tower-*-map, vo.loremaster.* → line ids. Added: foe.keep-garrison, chapter-win.01~vo-01, chapter-win.03~vo-01; vo.loremaster.finale-loss split into three finale-loss.*~vo-01 lines. Removed for 1.1: snd.tomb-door, snd.tomb-guardian-reveal (DEC-609; DEC-768, CUE-017). Moved to packs/base as engine defaults, outside this checklist: snd.listen-nothing, snd.listen-trap, snd.listen-battle (were snd.listen_*; DEC-618). Mechanical follow-through; no approval wording or eval changed.

Ruling 2026-11-26 (Bob): the four `place.*` stills are drafts. They come in through A1 step 6, and Bob ticks each line above (12–15) once it is imported; `packs/test/pack.yaml` declares them `draft` until then (DEC-388). `place-bazaar.jpg` (864×1152) is recropped to 16:9 at 1920×1080 on import (DEC-347).

Change note 2026-11-26: AI drafts added for the story paintings (inventory §3 issue 2), all `draft` and unticked: painting.ch1-the-roads, painting.ch2-the-keep, painting.ch3-the-tower, painting.keep-sealed-door, painting.finale-win, painting.finale-loss (1920×1080, declared in `packs/test/pack.yaml`), and painting.cover with glow.cover (3840×2160, files only: `packs/test/assets/painting.cover.webp`, `glow.cover.webp`). Row added: glow.cover. The art hold is lifted for drafts only (Bob, 2026-11-26, PR #643); nothing is final until Bob ticks it here.

Change note 2026-11-26 (group 2): AI drafts added for the foes (inventory §3 issue 3), all `draft` and unticked, 1920×1080, declared in `packs/test/pack.yaml`: foe.level-1, foe.level-2, foe.level-3, foe.level-4, foe.warden~phase-1, foe.warden~phase-2, foe.warden~phase-3, foe.keep-garrison. Their rows above (19–26) were already on the checklist; nothing is ticked.

Change note 2026-11-26 (group 3): AI drafts added for the Tomb sections, traps and Tower maps (inventory §3 issue 4), all `draft` and unticked, 1920×2160 (8:9), declared in `packs/test/pack.yaml`: painting.keep-crypt~left-corridor, ~left-wall, ~ahead-corridor, ~ahead-wall, ~right-corridor, ~right-wall, painting.trap-pit, painting.trap-falling-rocks, painting.tower-basement-map, painting.tower-main-map, painting.tower-top-map. Their rows above (27–38) were already on the checklist; nothing is ticked.

Change note 2026-11-26 (group 4): `packs/test/assets/place-bazaar.jpg` recropped from 864×1152 to 16:9 at 1920×1080 (DEC-347), still `draft`; its row above (line 13) stays unticked.

Change note 2026-11-26 (group 5): AI drafts added for the base pack hero portraits (inventory §3 issue 8), all `draft` and unticked, 2048×2048, declared in `packs/base/pack.yaml:95-100` with files in `packs/base/assets/`. They are base pack assets, outside the Ruined Keep `index.json` that EV-04 checks, so their rows sit in their own list below.

Change note 2026-11-26 (redo group 1, Gamewright rulings of 2026-11-26): all still `draft` and unticked. Bob lifted the C5-05 §7 no-repaint hold: place.village, place.bazaar, place.citadel and place.sanctuary are repainted in oil at 1920×1080 (lines 12–15; the Bazaar keeps both lantern tops whole). `packs/test/pack.yaml` `cover:` now points at `assets/painting.cover.webp`, so the A1 job builds painting.cover and glow.cover from it rather than from `cover.png` (ruling 9). painting.cover is redone as `cover.png` upscaled 3× to 3840×2160 (CV-02 fallback, ruling 10), and glow.cover lights only the six window panes, with no lanterns (ruling 11). painting.ch1-the-roads, painting.ch3-the-tower and painting.finale-win are redone (rulings 12–14). The rows painting.cover and glow.cover stay files set by `cover:`, not `assets[]` rows, because a row would duplicate them (A1-8).

Change note 2026-11-26 (redo group 2, Gamewright rulings 5 and 15–19): all eight foes redone, still `draft` and unticked (lines 19–26). Group foes show 2–3 whole figures in the middle 960 px (foe.level-1…4, foe.keep-garrison). The Warden is old, bald and grey-bearded in all three phases, with head and sword inside the central 90%, and the Tower's call is a cold grey-white light with no green or blue. Level 4's Tower follows the 1981 silhouette. Levels 1 and 2 show the crest scratched off, with no readable mark.

Change note 2026-11-26 (redo group 3, Gamewright rulings 20–23): redone, still `draft` and unticked: the six painting.keep-crypt~* sections (lines 27–32), painting.trap-falling-rocks (line 35), painting.tower-main-map and painting.tower-top-map (lines 37–38). Each crypt section's edges carry the same half pier, so every joint of the 8 combinations closes into one whole pier with no doubling; left, ahead and right each show a different end wall, and each wall seals its own opening. No wall torches; light is the party's only. The top map is a top-down plan with no trapdoor; the main map's floor grid is softened to a plain wash. The rockfall shows no people. painting.trap-pit and painting.tower-basement-map are unchanged.

Change note 2026-11-27 (unique foe figures, Bob's review): foe.level-1, foe.level-2, foe.level-3, foe.level-4 and foe.keep-garrison are redone because the figures in each looked like the same person repeated. Each now shows three different people, each with their own build, face, age, hair and beard, gear, weapon and pose, inside the middle 960 px at 1920×1080 WebP. Level 1: road raiders behind felled trees, bows drawn: an old bald white-bearded archer, a young shaven-headed woman, a red-haired man at a stump. Level 2: harder raiders in patched mail: a huge bald black-bearded axeman, a one-eyed grey veteran with sword and kite shield, a young curly-haired spearman. Levels 1–2 show shields with the crest scratched off and no readable mark. Level 3: the Warden's sworn guard in a shield line with his crest: a young spearman in a nasal helm, an older moustached macebearer in a gambeson, a woman in scale with a sword. Level 4: oathsworn guards in dark plate, the 1981-silhouette Tower behind them (as painting.ch3-the-tower): a great-helmed greatswordsman, a grey-bearded knight with an axe, a young bare-headed woman with a war hammer. foe.keep-garrison: three different dead rising in rusted mail with the crest on their shields: a tall skeleton with a spear, a hunched rotting corpse with an axe, a small skeleton climbing from the floor. All five stay `draft` and unticked (lines 19–22, 26); the Warden phases are unchanged. In the same change, Bob's approvals of 2026-11-27 are ticked: the four places, the six story paintings, painting.cover and glow.cover, the three Warden phases, the six crypt sections, both traps, the three Tower maps, and the six base pack hero portraits. `pack.yaml` statuses are not changed.

## Base pack hero portraits (Bob)

Not part of EV-04 (base pack, not `packs/test`). Nothing is final until Bob ticks it here.

- [x] portrait.hero-a — fighter — approved by Bob 2026-11-27
- [x] portrait.hero-b — healer — approved by Bob 2026-11-27
- [x] portrait.hero-c — magic-user — approved by Bob 2026-11-27
- [x] portrait.hero-d — scout — approved by Bob 2026-11-27
- [x] portrait.hero-e — ranger — approved by Bob 2026-11-27
- [x] portrait.hero-f — bard — approved by Bob 2026-11-27

## Base pack listen sounds (Bob)

Not part of EV-04 (base pack engine defaults, DEC-618; C5-05 §5). Nothing is final until Bob ticks it here.

- [ ] snd.listen-nothing — still air — approved by Bob
- [ ] snd.listen-trap — a click and a drip — approved by Bob
- [ ] snd.listen-battle — shuffling and breathing — approved by Bob

Change note 2026-11-27 (Gamewright ruling 30, approved by Bob): rough ffmpeg placeholders added, declared `draft` in `packs/base/pack.yaml` (type `sfx`, target `storyboard`), m4a AAC-LC mono 48 kHz, 2.0 s each, all three at about −20 LUFS so loudness alone does not tell them apart. Generated with ffmpeg only, no AI voice and no downloaded audio. No ambience (not on the 1.0 list). Nothing is ticked.

Change note 2026-11-27 (ruling 30 redo, after Bob listened at 7:40 AM ET): all three redone with ffmpeg only, still `draft` and unticked, same format (m4a AAC-LC mono 48 kHz, 2.0 s, about −20 LUFS, true peak at or under −1 dBTP) over one shared near-silent stone room tone. snd.listen-nothing: an empty stone room with two sparse water drips, no wind. snd.listen-trap: an old wooden and iron latch, ratchet and grinding stone, then a trickle of grit instead of a drip. snd.listen-battle: people waiting behind a door, with shuffling steps, a crackling fire, faint breathing, a low grunt and a mail clink, all muffled.

Change note 2026-11-27 (music, by Bob's direction at 8:00 AM ET, “all 3 should have music, slight different variances”): all three listen sounds now carry a variation of one shared low, dark cavern music motif (a D minor drone with a soft upper note), made with ffmpeg only. snd.listen-nothing is the calm variation under faint drips and a slight breeze; snd.listen-battle is a slightly tenser, pulsing variation under muffled talking and a crackling fire; snd.listen-trap is the dread variation, which plays alone after the catch, once the room tone drops out. Now 2.5 s each, still about −20 LUFS, still `draft` and unticked.

Change note 2026-11-27 (Bob's 8:00 AM ET notes, applied): snd.listen-trap is now “ambience drops out, dread music only, no mechanism”: the shared cavern bed and motif, then the room tone, breeze and one far drip drain away fast, leaving only the dread variation; the catch, ratchet and grind are removed. snd.listen-battle is now “low talking and fire”: two muffled voices and a fire crackle over the tenser variation, with no footsteps or hits. snd.listen-nothing keeps the calm variation, with the drips set well back and a very slight breeze. Still 2.5 s, about −20 LUFS, `draft` and unticked. Bob's direction overrides the DEC-618 content wording (“a click and a drip”, “shuffling and breathing”) and ruling 30's “ambience not on the 1.0 list” line for these sounds; updating the DEC-618 card is a Gamewright follow-up.
