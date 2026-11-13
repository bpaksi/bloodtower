# C5-05 Ruined Keep art and voice specs

Design-only handoff by Gamewright, 2026-11-10 (ET), for Illusionist. It gives every asset ID in [C5-05 approval.md](../../../apps/bloodtower/plans/briefs/C5/05-art-through-a1/approval.md) a size, format, look and acceptance bar. The brief has IDs only. Nothing here authorizes a paid image or voice run (Bob's Nov 8 art hold), changes an eval, or ticks an approval. **LOCKED** cites a decided card, a resolved C5 question or accepted script text. **ADOPTED** is the Warden ruling of 2026-11-10 relayed via Wright (§6). **PROPOSED** is new here and undecided; it never overrides a card. **CONFIRMED** marks a size checked against main in Wright's screen check 2026-11-10 (foes, tomb sections, traps, maps); other sizes stay PROPOSED. The G-A1 trio (`painting.cover`, `glow.cover`, the seal-break-1 line) is specified in [A1-art-specs.md](A1-art-specs.md) on its own branch.

## Common rules

- **Look (LOCKED):** the game's oil-painting look (DEC-335, DEC-478), grim and plain low fantasy (DEC-834), the palette and treatment in [game-look.md](../../../docs/art-direction/game-look.md) §2 (mostly void/soot/umber, candle gold rare, blood red for danger, verdigris only for holy or ward effects). Match `packs/test/assets/cover.png` (#359): dusk, storm cloud, weathered stone, thatch. No text, logos or borders baked in. RtDT card art is subject inspiration only and is never copied (DEC-478).
- **Story board only** (DEC-201); nothing is made for the iPad.
- **IDs:** `<kind>.<entry>~<variant>`, lowercase kebab-case (DEC-622, DEC-844). Bloodtower lint A1-15 allows picture kinds painting, portrait, foe, place, item, cover and sound kinds effect, ambience, plus `line` and `glow` (DEC-844; `apps/bloodtower/src/assets/lint/indexSchema.ts`). A picture ID's prefix must equal its kind.
- **Pipeline (LOCKED):** AI drafts through A1, then Bob approves each final in the studio (Q-C5-06); masters and WAVs stay in the work folder; shipped files are content-hashed WebP and m4a with `index.json` (DEC-386, DEC-622). Old saves keep working because IDs are stable (DEC-202; C5-05 EV-05).
- **Panning Paintings (LOCKED):** a story Painting that drifts is 16:9 at 3840×2160, 1.5× max zoom, key detail out of the bottom third (DEC-206, DEC-575). Base-game-style stills that do not move need only 1080p (DEC-347).
- **Spoiler rule (from DEC-662, script):** no art shown before The Barrow may show the Warden's crest whole. Raiders' shields have the crest scratched off; the sworn guard wear it openly only in chapter 3.
- **Voice (LOCKED):** only the Loremaster's lines are voiced (Q-C5-07; DEC-349), audio plus captions, no Portrait (approval change note, Nov 2). Voice and its provisional status, format, loudness and duration rules are as for `seal-break.01~vo-01` in [A1-art-specs.md](A1-art-specs.md) §3: Charon provisional, final voice pending; WAV master to m4a; about −18 LUFS (R3-UI-60, game-look §6); estimated over 20 s rejected (A1-P2 D6); caption ≤ 120 characters (DEC-576).

---

## 1. Story Paintings

All five chapter/scene paintings and both endings: kind `painting`; **3840×2160** PNG master, shipped WebP. **PROPOSED:** they are story Paintings with the default drift (DEC-575: 1.0 to 1.1 over 20 s), so the LOCKED panning rules apply; if a slot turns out to be a static still, 1920×1080 suffices (DEC-347). Each needs a focus box in its index entry (DEC-206), PROPOSED by Illusionist per piece. No glow masks are on the checklist; none is made.

| Asset id | Where used | Look and composition (subject from locked script text) |
|---|---|---|
| `painting.ch1-the-roads` | Chapter 1 card (C5-05; script “Chapter 1: The Roads”) | PROPOSED: the forest road out of Greyford at grey morning; felled trees across it; the old keep on its far hill, small, upper third. Sources: “Felled trees block the forest road.”, “Past the trees, the old keep stands on its hill.” (script). No raiders' faces, no crest. |
| `painting.ch2-the-keep` | Chapter 2 card | PROPOSED: the ruined keep close up, its gate hanging open, steps going down into the dark under it, cold mist rising. Source: “The keep's gate hangs open. Steps go down under it, and the air that comes up is cold.” Same keep as the cover (towers, arched gate). |
| `painting.ch3-the-tower` | Chapter 3 card | PROPOSED: the Tower road across the Grass Sea at dusk, the Tower far off and dark against the sky; the sealed gate small in the middle distance. Sources: chapter 3 goal and The Last Stand lines. The Tower's shape follows the physical tower (the 1981/RtDT tower silhouette), not a new design. |
| `painting.keep-sealed-door` | The Lock scene (DEC-662, DEC-674) | PROPOSED mapping: the ID names The Lock's gate. Iron-bound gate on the Tower road, sealed with iron and the Warden's crest, a ring-sized hollow at its centre, which is the focal point and sits above the lower third. Source: “The gate on the Tower road is sealed with iron and the Warden's crest. In the middle is a hollow the size of a ring.” The crest may show here (chapter 3, after the reveal). |
| `painting.finale-win` | Win scene, both win endings (DEC-663, DEC-664) | PROPOSED: one painting that fits both endings (“Shatter the shard” and “Swear the oath”): the top of the Tower at first light, the Warden's empty armour fallen, the shard's light gone dim. Must not show which choice was made. |
| `painting.finale-loss` | The loss scene (DEC-144) | PROPOSED: the land under the Tower's shadow, Greyford dark, no lit windows; it must fit all three loss lines (see §5). |

**Acceptance checks**

- [ ] **SP-01** Decoded size 3840×2160 (or the PROPOSED 1920×1080 if a slot is ruled static), shipped WebP, ID prefix `painting` (A1-15).
- [ ] **SP-02** Key detail is above y = 1440 px; a 1.5× crop on the focus box keeps it whole (DEC-206, DEC-575).
- [ ] **SP-03** Same keep and village as the cover where they appear; oil-painting look, palette per game-look §2; no text.
- [ ] **SP-04** Spoiler rule holds: no whole Warden crest in `ch1`.
- [ ] **SP-05** `finale-win` does not depict either choice; `finale-loss` does not depict one loss cause only.
- [ ] **SP-06** Bob approves each final in the studio (C5-05 EV-04).

## 2. Foes

Kind `foe`; one painting each. Shown on the battle board (UI-026), the foe at the centre (DEC-329), stills with only the hit shake and spell flash (DEC-347, DEC-562). **Size, CONFIRMED (Wright screen check 2026-11-10):** 1920×1080, 16:9 (DEC-347: no drift, so 1080p suffices). Subject inside the central 90% so the hit shake never shows an edge. In Tomb and Tower battles the battle screen takes over the 8:9 view half (DEC-592), so the painting is fitted into it, not shown 1:1: keep the foe's head and body inside the central 8:9 column (the middle 960 px of 1920) so a fit-to-height crop still reads. Master PNG, shipped WebP.

**Foe levels.** One painting per foe level, swapping C4's placeholders (Q-C4-15). Each is a Beginning-state painting; the other four foe states fall back to it (DEC-332). Levels rise one step a chapter (DEC-185; `packs/base/tuning.yaml` chapter_1: 1).

| Asset id | PROPOSED subject |
|---|---|
| `foe.level-1` | Road raiders behind felled trees, bows drawn, shields with a crest scratched off (script, The Ambush). |
| `foe.level-2` | Harder raiders in patched mail, crests still scratched off. Not the dead garrison, which would give away the Barrow reveal outside the Tomb. |
| `foe.level-3` | The Warden's sworn guard in a shield line, his crest worn openly (script, The Last Stand is a level 3 battle). |
| `foe.level-4` | Heavier oathsworn guards in dark plate, the Tower behind them. |

**The Barrow's guardian (§6.6, ADOPTED):** `foe.keep-garrison`, the keep's dead garrison rising in rusted mail, shields bearing the Warden's crest (script; DEC-608, DEC-662). Shown only inside the Tomb, so the crest may show.

**The Warden's phases.** Three paintings, one per phase (Q-C5-02); a phase change at two thirds and one third of his wounds (DEC-567), shown with a shake and sound when no tower is connected (Q-C5-08). He is the keep's fallen last lord, a ruined knight (DEC-661), “in what is left of his armour” (script, boss-screen opening). Same figure, face and armour in all three. `foe.warden~phase-1` is also his one Portrait under DEC-661 (§6.5 (d)); no `portrait.warden`.

| Asset id | PROPOSED subject |
|---|---|
| `foe.warden~phase-1` | Standing at the top of the Tower in broken, once-fine armour with his crest; grim, upright, in command. |
| `foe.warden~phase-2` | Wounded; the Tower's call shows in him: a cold light at the cracks of his armour. |
| `foe.warden~phase-3` | Barely held together, more Tower than man; the cold light strongest. Not a false death (DEC-567). |

**Acceptance checks**

- [ ] **FO-01** Size, WebP, ID prefix `foe` (A1-15); the variant `~phase-N` keeps the `foe.warden` entry.
- [ ] **FO-02** Levels read as rising threat 1 to 4 at TV distance; spoiler rule holds for levels 1 and 2.
- [ ] **FO-03** The three Warden phases are recognisably one man; each reads as worse than the last.
- [ ] **FO-04** Bob approves each final.

## 3. The Tomb (The Barrow), its traps

**Tomb style `keep-crypt`.** The one 1.0 Tomb (DEC-593) under the keep, its view half one wide room joined from three sections, left, ahead and right, each painted as a corridor and as a wall, edges blending, the view panning left to right and back (DEC-583, DEC-584, DEC-585); the story supplies the style (DEC-588). Look (PROPOSED from script): a cold crypt of the keep's dead garrison: rough stone vaults, niches, rusted mail, damp, torchlight from the party only. “A cold corridor. Three doors wait.”

| Checklist id (ADOPTED id `painting.keep-crypt~…`, §6.1) | Content |
|---|---|
| `tomb.keep-crypt~left-corridor`, `~ahead-corridor`, `~right-corridor` | That section with an open way on |
| `tomb.keep-crypt~left-wall`, `~ahead-wall`, `~right-wall` | That section closed by a solid wall (DEC-584) |

- **Size, CONFIRMED (Wright screen check 2026-11-10):** each section 1920×2160 (8:9, the view half at 4K, DEC-583), master PNG, shipped WebP. Left, ahead and right join edge to edge at 5760×2160 with **no overlap**; the blend is painted into each section's edges, so any corridor/wall mix joins without a seam (DEC-585).
- **Traps.** 1.0 has two traps, one painting each (DEC-606), which take over the view half while the group takes the loss (DEC-592). **Size, CONFIRMED (Wright screen check 2026-11-10):** 1920×2160 (8:9), filling the view half (DEC-592); a single picture, not a tomb-section frame and not joined to the sections.
  - `trap.pit` (ADOPTED `painting.trap-pit`): the floor gives way under one hero. Source: “The floor gives way. Choose one hero to take the fall and lose 4 hit points.”
  - `trap.falling-rocks` (ADOPTED `painting.trap-falling-rocks`): stones crashing from the vault onto the group. Source: “Stones crash from the ceiling. Every hero loses 2 hit points.”

**Acceptance checks**

- [ ] **TB-00** Each section and each trap decodes at exactly 1920×2160; the three sections joined edge to edge make 5760×2160.
- [ ] **TB-01** All eight seamless with each other at every joint (corridor/corridor, corridor/wall, wall/wall), checked as all 8 room combinations.
- [ ] **TB-02** Same stone, light and palette across the six sections and both traps.
- [ ] **TB-03** IDs pass A1-15 under the ADOPTED renames in §6.1 (the checklist forms fail).
- [ ] **TB-04** Bob approves each final.

## 4. The Tower's levels

`map.tower-basement`, `map.tower-main`, `map.tower-top` (ADOPTED `painting.tower-{basement,main,top}-map`, §6.1): the Tower's three levels (DEC-364, DEC-566), each with distinct art (DEC-364). The board reuses the Tomb's two halves (Q-C5-01): the level's room map left, the room view right; DEC-566 says “One picture: the level's room map.”

- **PROPOSED content:** one painted backdrop per level for the map half, a top-down plan in aged ink on dark parchment that the engine draws rooms on: basement (rough-hewn, damp), main (great hall stone), top (open battlements, sky). **Size, CONFIRMED (Wright screen check 2026-11-10):** 1920×2160 (8:9, the map half at 4K); static, no drift.
- **Acceptance:** distinct per level at TV distance; engine-drawn rooms, the glowing current room and labels stay legible over it (game-look §4a); IDs pass A1-15 under the §6.1 renames.

## 5. Sounds and Loremaster lines

**Sounds.** Kind `effect`; supplied PCM WAV masters, shipped m4a; no sound-generation provider (A1-P2 inventory). Played on the Story board's Mac speakers (DEC-201, DEC-618). PROPOSED loudness: about −20 LUFS, under the voice (game-look §6). Short, dry and physical (game-look §6).

**Ruined Keep set:** no sound effects in 1.0 after §6.7 (both Tomb sounds deferred to 1.1).

**Outside the Ruined Keep set: engine defaults in `packs/base`** (§6.2, sub-decision (a); DEC-618 “three engine-default Mac sounds … A story may swap them”; DEC-199, DEC-622 base pack):

| Asset id (ADOPTED) | Was | LOCKED content (DEC-618) | PROPOSED duration |
|---|---|---|---|
| `snd.listen-nothing` | `snd.listen_nothing` | Still air | 1.5–2.5 s |
| `snd.listen-trap` | `snd.listen_trap` | A click and a drip | 1.5–2.5 s |
| `snd.listen-battle` | `snd.listen_battle` | Shuffling and breathing | 1.5–2.5 s |

The listen sounds must not tell the room kind apart by loudness alone; a wrong hint (1 in 5, DEC-618) must sound the same as a true one.

**Loremaster lines** (voiced; quoted only from `research/stories/ruined-keep/script.md`, 1.0 lines accepted by Bob 2026-11-06). The full ID-to-line mapping is in §6.3 and §6.4: 13 lines.

**Acceptance checks**

- [ ] **SD-01** Each sound decodes as m4a, kind `effect`, duration recorded, loudness within ±2 LU of the PROPOSED target; the three listen sounds are indexed in `packs/base/assets/`, not `packs/test`.
- [ ] **SD-02** Each line's caption equals its script text byte for byte; ≤ 120 characters; ≤ 20 s.
- [ ] **SD-03** No line or sound outside the Loremaster and the checklist (C5-05 EV-03).
- [ ] **SD-04** Bob approves each final (C5-05 EV-04).

## 6. Mismatches and gaps: ADOPTED fixes

**ADOPTED: Warden ruling 2026-11-10 relayed via Wright** (speaking for Bob; all seven fixes 6.1–6.7). Sub-decisions (a)–(d) are Gamewright's, made under that ruling. The C5-05 approval checklist now lists these IDs (change note 2026-11-10 in `approval.md`; Bob's Nov 1 small-tweak rule). Outside C5/05, `C5/09-finale-and-endings/eval.md` still names `vo.loremaster.finale_win_shattered`; that eval is left unchanged here. No shipped ID is renamed silently; A1's job/export boundary records old-to-new provenance (A1-P2 “Risk: legacy IDs”). Sizes are marked CONFIRMED where Wright's screen check 2026-11-10 covered them, PROPOSED otherwise.

**6.1 Kinds that fail A1-15 (ADOPTED).** `tomb`, `trap` and `map` are not kinds (lint test “a bespoke kind (tomb, map, music) fails A1-15”).

| Checklist id | ADOPTED id | Kind |
|---|---|---|
| `tomb.keep-crypt~left-corridor` … `~right-wall` (6) | `painting.keep-crypt~left-corridor` … `painting.keep-crypt~right-wall` | painting |
| `trap.pit` | `painting.trap-pit` | painting |
| `trap.falling-rocks` | `painting.trap-falling-rocks` | painting |
| `map.tower-basement` | `painting.tower-basement-map` | painting |
| `map.tower-main` | `painting.tower-main-map` | painting |
| `map.tower-top` | `painting.tower-top-map` | painting |

`snd.*` with kind `effect` passes A1-15 (a sound's prefix only must not be a picture kind), so it is not renamed for its kind.

**6.2 Kebab-case (ADOPTED).** DEC-622 requires lowercase kebab-case.

| Checklist id | ADOPTED id |
|---|---|
| `snd.listen_nothing` | `snd.listen-nothing` |
| `snd.listen_trap` | `snd.listen-trap` |
| `snd.listen_battle` | `snd.listen-battle` |
| `vo.loremaster.finale_win_shattered`, `vo.loremaster.finale_win_oath` | see 6.3 |

- **Sub-decision (a), Gamewright:** `snd.listen-*` live in `packs/base` as engine defaults (DEC-618), a story may swap them (DEC-199), and they are listed outside the Ruined Keep set (§5). They leave the C5-05 `packs/test` checklist.
- The C4 tomb-crawl and tomb-screens evals and screen spec name `snd.listen_*`; the rename updates them in the same change.

**6.3 `vo.loremaster.*` to script lines (ADOPTED).** The checklist form is not a script-line ID (`scene.moment~variant`, DEC-622). Line IDs follow A1-P2's `seal-break.01~vo-01` form. No other IDs exist for these lines (none in `packs/test`, the script or the checklist), so this form is used throughout.

| Checklist id | ADOPTED line id | Script tag | Locked text |
|---|---|---|---|
| `vo.loremaster.chapter-1` | `chapter-card.01~vo-01` | `chapter 1 goal` | “Hear the herald in Greyford. Then open the forest road.” |
| `vo.loremaster.chapter-2` | `chapter-card.02~vo-01` | `chapter 2 goal` | “Go down into the barrow under the old keep. Find the shrine on the road beside it.” |
| `vo.loremaster.chapter-3` | `chapter-card.03~vo-01` | `chapter 3 goal` | “Open the sealed gate on the Tower road. Break his guard on the Grass Sea. Then climb.” |
| (new) | `chapter-win.01~vo-01` | `chapter 1 win, Loremaster` | “The roads are open. On the far hill, a fire burns in the old keep, where no one has lived for forty years.” |
| `vo.loremaster.seal-break-1` | `seal-break.01~vo-01` (A1-P2 default) | `seal break ch1, Loremaster` | “The roads are clear, and a seal breaks like an old oath giving way. Ahead stands the Ruined Keep.” |
| `vo.loremaster.seal-break-2` | `seal-break.02~vo-01` | `seal break ch2, Loremaster` | “The Keep gives up its dead, and a second seal cracks. The Tower waits.” |
| (new) | `chapter-win.03~vo-01` | `chapter 3 win, Loremaster` | “The gate is open and the last stand held. The Warden's door is open, for now.” |
| `vo.loremaster.seal-break-3` | `seal-break.03~vo-01` | `seal break ch3, Loremaster` | “The last stand holds, and the third seal breaks. Only the Warden remains.” |
| `vo.loremaster.finale_win_shattered` | `finale-win.shattered~vo-01` | `finale win, seal shattered` | “The shard shatters. The Tower's call goes quiet, and the roads are yours.” |
| `vo.loremaster.finale_win_oath` | `finale-win.oath~vo-01` | `finale win, seal holds` | “You swear his oath and take up his watch. The Tower called to him once. It will call to you.” |

- **Sub-decision (b), Gamewright:** chapter cards voice the locked chapter-goal lines as Loremaster (Q-C5-07 “chapter cards”), IDs `chapter-card.0N~vo-01`. The chapter name (“The Roads”, “The Keep”, “The Tower”) stays a caption title, not voiced; no new joined text.
- **Sub-decision (c), Gamewright:** the two Loremaster-tagged win lines for chapters 1 and 3 are voiced as `chapter-win.01~vo-01` and `chapter-win.03~vo-01`, text as quoted. Chapter 2 has no win line in the script, so there is no `chapter-win.02`. Both are fixed one-off lines under 120 characters (106 and 77), so DEC-349 allows voice.

**6.4 Three loss lines, one `finale-loss` ID (ADOPTED).** The script has three accepted loss lines (DEC-144; Q-C3-05); DEC-663's “one Scroll line” is superseded by the script's split by cause. `vo.loremaster.finale-loss` is replaced by three lines; one shared `painting.finale-loss` stays (§1).

| Script tag | Locked text | ADOPTED line id |
|---|---|---|
| `skulls loss` | “The last skull falls. The Tower's shadow covers the land, and the roads are his for good.” | `finale-loss.skulls~vo-01` |
| `corruption loss` | “One of you hears the Tower call, and goes to it. Without them, the hunt is over.” | `finale-loss.corruption~vo-01` |
| `fallen buildings loss` | “Four strongholds have fallen. There is nowhere left to hold, and his raiders own the land.” | `finale-loss.fallen-buildings~vo-01` |

**6.5 The Warden's Portrait (ADOPTED).** DEC-661 gives the Warden “one Portrait, a ruined knight”.

- **Sub-decision (d), Gamewright:** no separate `portrait.warden`. `foe.warden~phase-1` is his one picture under DEC-661. His boss-screen opening line stays a silent caption (only the Loremaster is voiced, Q-C5-07), so there are no stills or mouths (DEC-719). `foe.warden~phase-1` therefore carries his likeness: face readable at TV distance, same face and armour in phases 2 and 3 (§2 FO-03).

**6.6 The garrison guardian (ADOPTED).** The Barrow's guardian is “the keep's dead garrison … still in its rusted mail” (script; DEC-662, DEC-608), and its fall is the reveal. Without its own painting it would fall back to the quest foe one level up (`foe.level-3` on a normal chapter 2, DEC-608), which shows living guards wearing the crest. Added: **`foe.keep-garrison`**, one Beginning painting (§2 size, CONFIRMED by Wright screen check 2026-11-10): undead soldiers rising in rusted mail, shields bearing the Warden's crest. The story names its own guardian (DEC-608).

**6.7 Tomb sounds deferred to 1.1 (ADOPTED).** `snd.tomb-door` and `snd.tomb-guardian-reveal` are struck from the 1.0 checklist and no file is made. DEC-593 put the Tomb's door and guardian cues on the 1.0 list, but DEC-609 (Bob, 2026-10-29: “move out of 1.0”) moved them to 1.1. Their 1.1 picks are tower sounds, not board files: door SND-056, guardian SND-066 then the horn (DEC-768, CUE-017, both release 1.1). In 1.0 the guardian uses the battle's own cues (DEC-609).

**6.8 Gamewright rulings and follow-ups**

**ADOPTED, Gamewright design call 2026-11-10:**

1. **Tower room view.** In 1.0 the Tower's room-view half (Q-C5-01 reuses the Tomb's two halves) reuses the `painting.keep-crypt~*` sections. Unique Tower-room art is deferred to 1.1. No new checklist IDs.
2. **Foe level cap.** Foe level is capped at 4: `step_up` never raises a foe past 4, so there is no `foe.level-5`. Tower guards are level 3 (DEC-702: the adversary's level − 2, every room and Tower level). The Warden is the adversary and uses his own `foe.warden~phase-*` paintings, not `foe.level-*`.

**Code follow-ups (coding lane; not part of this docs PR):**

- `packs/base/tuning.yaml` has no maximum foe level; add the cap of 4 so `step_up` and difficulty offsets cannot exceed it (ruling 2).
- `apps/bloodtower/src/assets/needs/build.ts` tags every board picture with the one 3840×2160 16:9 dashboard profile. The 8:9 maps, tomb sections and traps (1920×2160) need their own profile, or they will be cropped or padded.

**Still open:** none from this file's §6.

Citation fix: final approval of every asset is C5-05 **EV-04** (`eval.md`); `approval.md`'s “EV-05 checks every id is ticked” was corrected to EV-04 in this branch (docs-only).

## 7. No repaint

`place.village`, `place.bazaar`, `place.citadel` and `place.sanctuary` need **no repaint**: A1 step 6 imports the existing `packs/test/assets/place-*.jpg` as drafts for Bob's approval (A1-06b; A1-P2 inventory). Observed only: `place-bazaar.jpg` is 864×1152 (portrait), the other three 1280×720.
