# Approval: C5 / 05-art-through-a1 — The Ruined Keep's art and voice through the A1 adapter

| Item | Approved by | When (America/Detroit) | Chat link | Version (commit sha of file) |
|------|-------------|------------------------|-----------|------------------------------|
| eval.md | Bob | 2026-10-31 6:16 PM ("Approve all") | | |
| mockup.html | n/a | | | no mockup: no screen change |

## Art finals (Bob)

One line per asset id in `packs/test/assets/index.json`; EV-04 checks every id is ticked.

- [ ] place.village — approved by Bob 
- [ ] place.bazaar — approved by Bob 
- [ ] place.citadel — approved by Bob 
- [ ] place.sanctuary — approved by Bob 
- [ ] painting.ch1-the-roads — approved by Bob 
- [ ] painting.ch2-the-keep — approved by Bob 
- [ ] painting.ch3-the-tower — approved by Bob 
- [ ] foe.level-1 — approved by Bob 
- [ ] foe.level-2 — approved by Bob 
- [ ] foe.level-3 — approved by Bob 
- [ ] foe.level-4 — approved by Bob 
- [ ] foe.warden~phase-1 — approved by Bob 
- [ ] foe.warden~phase-2 — approved by Bob 
- [ ] foe.warden~phase-3 — approved by Bob 
- [ ] foe.keep-garrison — approved by Bob
- [ ] painting.keep-crypt~left-corridor — approved by Bob
- [ ] painting.keep-crypt~left-wall — approved by Bob
- [ ] painting.keep-crypt~ahead-corridor — approved by Bob
- [ ] painting.keep-crypt~ahead-wall — approved by Bob
- [ ] painting.keep-crypt~right-corridor — approved by Bob
- [ ] painting.keep-crypt~right-wall — approved by Bob
- [ ] painting.keep-sealed-door — approved by Bob 
- [ ] painting.trap-pit — approved by Bob
- [ ] painting.trap-falling-rocks — approved by Bob
- [ ] painting.tower-basement-map — approved by Bob
- [ ] painting.tower-main-map — approved by Bob
- [ ] painting.tower-top-map — approved by Bob
- [ ] painting.finale-win — approved by Bob 
- [ ] painting.finale-loss — approved by Bob 
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
- [ ] painting.cover — 16:9 Ruined Keep cover for 1.0 (Bob locked Nov 2 2026 via Warden)
- [ ] glow.cover — approved by Bob

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

## Base pack hero portraits (Bob)

Not part of EV-04 (base pack, not `packs/test`). Nothing is final until Bob ticks it here.

- [ ] portrait.hero-a — fighter — approved by Bob
- [ ] portrait.hero-b — healer — approved by Bob
- [ ] portrait.hero-c — magic-user — approved by Bob
- [ ] portrait.hero-d — scout — approved by Bob
- [ ] portrait.hero-e — ranger — approved by Bob
- [ ] portrait.hero-f — bard — approved by Bob
