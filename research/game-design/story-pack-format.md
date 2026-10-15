# Story pack format

Status: draft for Bob's review, 2026-10-15. Design only, no code.
Scope: the data a new app's **story loader** reads. A story (the Dracula funeral night, the crypt crawl under the church, future stories) must be pure data: adding or changing one needs no code change.

Sources: `research/game-design/story-engine.md` (R-ENG, E1-E18; E15 presence, E16 never idle, E17 investigation, E18 advantages), `requirements.md`, `setup-wizard-and-summary.md` (R-WIZ, R-SUM), `research/stories/dracula/rulings.md`, `apps/burgomaster-funeral-poc/docs/PRD.md` (rev 5, R3-x/R4-x/R5-1), `apps/burgomaster-funeral-poc/assets/manifest.json` and `assets/cues/cue-sheet.json`, scripts `n2-burgomasters-funeral.md`, `n23-catacombs-of-saint-ysolde.md`, `n4-earth-boxes.md`.
Not found in the repo: E19 and E20 text, the R-LEN rules, R-WIZ-12, `tokens-and-encounters.md`, the POC `spec.md`. Sections 10, 11, 12 and 4.3 are therefore **proposals** built from the brief and must be checked against Bob's intent (see Open questions).

## 0. Conventions

- **Terminology.** The *Story board* (formerly "Dashboard") is the shared Mac screen and speakers. It is **display only**. All control (choices, votes, picks, Next, Done confirms) comes from iPads or phones. When several devices may answer the same prompt, **the first press counts**; later presses see the locked result.
- **Targets.** `storyboard`, `ipad:all`, `ipad:<hunter>`, `phone`. See 4.2.
- **Format.** A pack is a folder of YAML (or JSON) files plus a pack manifest. Field types: `id` (kebab-case, unique in scope), `ref` (an id defined elsewhere in the pack), `asset` (a manifest id, never a path), `cond` (condition expression, 0.1), `effect` (effect list, 0.2).
- **No code in packs.** Rules that data can't express go in a registered rule module (R-ENG-4) referenced by name; the loader fails if the module isn't installed.
- **Story mechanics never touch warriors or spirit.** Warriors and spirit stay base RtDT (hit points, base costs). Story effects use story items, story tracks, corruption, skulls (via the ledger), flags, and RtDT Advantages (E18).

### 0.1 Condition expressions (`cond`)
A small closed grammar so variants and gates stay data:
`present(<hunter>)`, `absent(<hunter>)`, `holds(<item>)` (a present hunter carries it), `carrier(<item>) = <hunter>`, `flag(<name>)`, `track(<id>) >= n`, `corruption(<hunter>) >= n`, `choice(<choice-id>) = <option>`, `result(<fight-id>) = won|lost`, `night = n`, `length = short|standard|long`, `building = village|sanctuary|bazaar|citadel`, `seed(<table>) = <value>`, `role(<role>) = <hunter>`; combined with `and`, `or`, `not`.

### 0.2 Effects (`effect`)
`grant_item`, `spend_item`, `lose_item`, `set_flag`, `track_add`, `corruption` (always through the guard, section 8), `advantage` (trait, amount, scope: picker | present | hunter, duration: fight | first-round), `foe_mod` (±n, min 1), `reveal_battle_card`, `sit_out`, `skull_drop` (through the skull ledger), `ledger_add` (finale escalation, E12), `quest_token` (section 9), `goto` (moment or set piece), `stat` (custom stat event).

---

## 1. Pack metadata

| Field | Type | Req | Notes |
|---|---|---|---|
| `pack_id` | id | yes | e.g. `dracula` |
| `title` | text | yes | |
| `version` | semver | yes | saves pin it (R-ENG-11) |
| `engine_min` | semver | yes | loader refuses older engines |
| `tone` | text | no | one line |
| `structure` | `one-shot` \| `campaign` | yes | campaign carries state between parts (R-ENG-2) |
| `players` | {min,max} | yes | humans; hunters are separate (section 2) |
| `lengths` | list of `short`/`standard`/`long` | yes | at least one; see 3.2 |
| `difficulties` | list {id, label, mods} | yes | |
| `systems` | map system → on/off + settings | yes | R-ENG-3/21: clock, corruption, encounters, dungeon, investigation, quest-tokens... |
| `rule_modules` | list of names | no | R-ENG-4 |
| `components` | list {asset-group, use: used\|optional\|unused} | yes | drives the wizard components step (R-WIZ-2/3) |
| `setup` | list of wizard steps (R-WIZ-5 order) | yes | placements by seed |
| `av_theme` | {art_style, clip_style, palette, narrator_voice, music_mood, sfx_set} | yes | R-AV-1 |
| `ambient` | map phase → {bed asset, accent pool, interval_s [min,max]} | yes | E16; engine defaults if missing a phase |
| `advantage_cap` | int | no | default 2 per hunter per fight (E18, R-FUN-4) |
| `skull_cap_per_night` | int | no | Dracula: 2 |

```yaml
pack_id: dracula
title: "Dracula: The Vellmoor Nights"
version: 0.3.0
engine_min: 0.1.0
structure: one-shot
players: {min: 1, max: 4}
lengths: [short, standard, long]
systems: {clock: nights, corruption: on, investigation: on, dungeon: on, quest_tokens: on}
advantage_cap: 2
skull_cap_per_night: 2
ambient:
  dusk:  {bed: amb.dusk-breathe, accents: [acc.bell-far, acc.wolf], interval_s: [20, 60]}
  night: {bed: amb.wake-flicker, accents: [acc.wind, acc.door],  interval_s: [20, 60]}
```

## 2. Hunters and cast

**Hunters** are the playable roles. All declared hunters are always in play (PRD rev 2); one human may hold several, and a device may hold several (R-DEV-9, R-WIZ-11). Start is blocked until every hunter is held.

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | id | yes | used in `.private.<id>`, `~no-<id>`, `ipad:<id>` |
| `name`, `portrait` | text, asset | yes | portrait shows on the picker (names and portraits only) |
| `voice` | asset (voice profile) | yes | |
| `start_items` | list ref | no | |
| `start_location` | building ref \| seed rule | yes | |
| `secret_goals` | list ref | no | E10 |
| `rtdt_hero` | ref | no | which physical hero mini / card stands in |

**Cast** are non-playable speakers.

| Field | Type | Req | Notes |
|---|---|---|---|
| `id`, `name` | id, text | yes | |
| `voice` | asset | yes | at most 2 speakers per exchange (R-AV-3) |
| `role` | `narrator` \| `npc` \| `adversary` \| `companion` | yes | |
| `companion_card` | ref | no | E18 reskin of an RtDT companion card |

```yaml
hunters:
  - {id: agnes,  name: "Sister Agnes Hallow", portrait: por.agnes, voice: vo.agnes, start_items: [reliquary-empty]}
  - {id: tomas,  name: "Tomas Varga",         portrait: por.tomas, voice: vo.tomas}
cast:
  - {id: narrator, role: narrator, voice: vo.narrator}
  - {id: dorka,    role: npc,      voice: vo.dorka}
  - {id: count,    role: adversary, voice: vo.count}
```

## 3. Nights and set pieces

### 3.1 Nights (chapters)

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | id | yes | `n1`..`n5` |
| `index` | int | yes | |
| `kingdom` | `fixed:K1` \| `seed` \| `player-choice` \| `after:<night>` | yes | E2 order rules |
| `phases` | list {id, advance: {after_actions:n, on_event:ref}} | yes | E1: whichever comes first |
| `phase_moments` | map phase → moment id | no | dusk, night start, dawn; exempt from presence (E15a) |
| `set_pieces` | list ref with `required` flag | yes | |
| `encounter_tables` | map phase → table ref | no | |
| `key` | ref | no | granted when required set pieces finish |
| `end` | cond | yes | |

### 3.2 Per-length selection (proposal; R-LEN text not found)

Each night lists which set pieces run at each length. The loader picks the list for the chosen length at setup; nothing else changes.

| Field | Type | Req | Notes |
|---|---|---|---|
| `by_length.<len>.nights` | list night ref | yes | e.g. Short may merge nights |
| `by_length.<len>.set_pieces.<night>` | list ref | yes | every `required: true` set piece must appear in all lengths |
| `by_length.<len>.encounters_per_night` | int | no | expected count, for timing estimate (PRD-43) |
| `by_length.<len>.target_minutes` | int | no | checked against measured timing (PRD-41..43) |

### 3.3 Set pieces

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | id | yes | the scene id, prefix of every moment id |
| `night` | ref or list | yes | n23 runs on night 2 or 3 |
| `site` | {kingdom slot, building: fixed \| seed} | yes | |
| `trigger` | `enter-site` \| event | yes | E15: hunters at the site when it starts are present; presence locks |
| `scope` | `scene` \| `global` | no | `global` exempts from presence |
| `flow` | ordered list of steps: moment, investigation, choice, fight, dungeon, branch | yes | |
| `outcome` | effect list + next ref | yes | |
| `stats` | list stat ids | no | |

```yaml
nights:
  - id: n2
    kingdom: player-choice   # K2/K3 order, Q18
    set_pieces: [{ref: n23-catacombs-of-saint-ysolde, required: true, when: "seed(holy-symbol-kingdom) = night"},
                 {ref: n2-burgomasters-funeral, required: true}]
by_length:
  short:    {set_pieces: {n2: [n2-burgomasters-funeral]}}
  standard: {set_pieces: {n2: [n23-catacombs-of-saint-ysolde, n2-burgomasters-funeral]}}
  long:     {set_pieces: {n2: [n23-catacombs-of-saint-ysolde, nx-midnight-procession, n2-burgomasters-funeral]}}
```

## 4. Moments

### 4.1 ID grammar

```
moment-id  := scene "." moment [ ".private." hunter ] { "~" variant }
scene      := set-piece id (kebab-case)
moment     := "01".."99" | name { "." name }      e.g. 04, lid-choice, investigate.examine-body
variant    := name | "no-" hunter
```

- `scene.moment` is the base. `scene.moment.private.<hunter>` targets only that hunter (always `ipad:<hunter>`).
- `~variant` **replaces** the base of the same moment when its `cond` holds. `~no-<hunter>` is the presence variant: it plays when that hunter is absent (E15, voiced and rendered).
- Variants stack left to right, condition first then presence: `lid-choice~nailed~no-wren`, `07~fight-lost~no-wren`. Private then variant: `04.private.agnes~lookalike`.
- **Resolution order:** pick the most specific variant whose conditions all hold (most `~` parts wins); ties are a load error. If none holds, play the base; if the base has no text (a variant group header like `n4-earth-boxes.03`), one variant must always match.
- **Sequenced variants:** a moment may declare `sequence: [a, b, c]` plus `last: last` (earth boxes: each burned box plays the next).

### 4.2 Moment fields and targets

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | moment-id | yes | |
| `kind` | `still` \| `clip` \| `text-card` \| `pick-card` | yes | R-AV-2 |
| `target` | `storyboard` \| `ipad:all` \| `ipad:<hunter>` \| `phone` | yes | default `storyboard`; `.private.*` forces `ipad:<hunter>` |
| `cond` | cond | variants | |
| `lines` | list {speaker ref, text, voice asset} | no | ≤2 speakers |
| `cues` | list {cue ref, at: start\|after-line n\|end} | no | |
| `music`, `sfx` | asset list | no | |
| `props` | list ref | no | `[prop: pressed-flower]` |
| `advance` | `next` \| `clip-end` \| `auto:<s>` \| `step` | no | still: Next from an iPad, first press counts |
| `asset` | asset | yes (`still`/`clip`) | per profile, 13 |
| `placeholder` | text | no | Story board neutral line for a private beat ("Each hunter has a private thought.") |
| `scope` | `scene` \| `global` | no | E15a |

Targets:
- `storyboard`: shared screen and speakers. Never carries a `.private.*` payload (enforced server side, PRD §3).
- `ipad:all`: every connected player device (shared controls, pick cards). No voice by default.
- `ipad:<hunter>`: every device holding that hunter, only while that hunter is present (except `scope: global`). Labelled with the hunter's name.
- `phone`: phone-layout override of an `ipad:*` asset (R-LF-10); never a separate audience. A phone holding a hunter receives that hunter's `ipad:<hunter>` content in phone layout.

```yaml
- id: n2-burgomasters-funeral.02
  kind: still
  asset: still.n2-burgomasters-funeral.02@storyboard
  lines: [{speaker: agnes, text: "She ran after Lenka...", voice: n2-burgomasters-funeral.02.vo-01},
          {speaker: wren,  text: "Braver than the rest...", voice: n2-burgomasters-funeral.02.vo-02}]
- id: n2-burgomasters-funeral.02~no-wren
  cond: absent(wren)
- id: n2-burgomasters-funeral.09.private.agnes
  kind: still
  target: ipad:agnes
  asset: still.n2-burgomasters-funeral.09.private.agnes@ipad
```

## 5. Choices and votes

Every decision is a prompt on iPads; the Story board only shows the prompt and the locked result.

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | id | yes | `n2-burgomasters-funeral.lid-choice` |
| `mode` | `party` (first press) \| `vote` \| `hunter` (one hunter's holders) \| `pick` (E17) | yes | |
| `askers` | `present` \| `all` \| `role:<r>` \| hunter | yes | absent hunters never decide scene choices |
| `options` | list {id, label, cond, effects, moment} | yes | option hidden if `cond` false (e.g. nail needs `holds(stake)`) |
| `vote.rule` | `majority` \| `unanimous` | vote | |
| `vote.tie` | `first-press` \| option id \| `seeded` | vote | |
| `timeout_s` + `default` | int, option | no | E17 default 60 s auto-pick |
| `stat` | stat id | yes | choices are always logged |

Rules: `party` mode locks on the first press from any device; others see it locked. `hunter` mode with a shared hunter: first answer from any holder (R3-8). A vote counts one ballot per **hunter**, cast by the first press among that hunter's holders.

### 5.1 Investigation round (E17)

| Field | Type | Req | Notes |
|---|---|---|---|
| `actions` | list {id, card moment, finding: {id, private moments per hunter, effects}, risky: {cue, cost options}} | yes | 4-6 actions, more than present hunters |
| `exclusive` | bool | yes | **true** per R3-6 (first lock wins, taken cards grey out); E17 text says false. See open questions |
| `reveal` | `after-all-lock` | yes | picks private until all lock |
| `share_moment` | moment | yes | table-talk; Continue from an iPad |

```yaml
choices:
  - id: n2-burgomasters-funeral.lid-choice
    mode: party
    askers: present
    options:
      - {id: nailed, cond: "holds(stake)", effects: [spend_item: stake, foe_mod: -1], moment: "~nailed"}
      - {id: watched, effects: [], moment: "~watched"}
```

## 6. Cues

Cues are referenced by name from the shared cue library (E13); the pack may add story cues. Every cue has a screen half and a fallback (R-ENG-12); tower halves map the same names later (R4-3).

| Field | Type | Req | Notes |
|---|---|---|---|
| `name` | id | yes | `heartbeat`, `dim-all`, `seal-sequence`, `skull-drop` |
| `capability` | text | yes | tower capability; `player-step` for physical steps |
| `status` | `Verified` \| `Library` \| `GAP` | yes | GAP needs a fallback-only plan |
| `screen` | asset | yes | always plays (R3-3) |
| `fallback_sfx` | asset | yes | |
| `drums` | `none` \| position | yes | story cues use `none` unless the base game would move them |
| `confirm` | bool | no | physical steps (skull drop) wait for Done from an iPad |
| `accent_reason` | enum | yes | see below |

**Accent reason enum and priority:** `choice > scene_cue > moment > ambient`. When two outputs compete for the tower/screen accent channel, the higher reason wins and the lower is suppressed (logged in `ambient_accent.suppressed` with `reason`).
- `choice`: feedback for a lock/vote/pick (e.g. the risky-pick seal sequence after all picks lock).
- `scene_cue`: authored `[tower: ...]` cue in a moment.
- `moment`: the default start/end accent of a moment with no authored cue.
- `ambient`: E16 bed and accents; suppressed during speech, choices and pauses; idle gap ≤10 s.

```yaml
cues:
  - name: seal-sequence
    capability: "seal flicker + one tower sound"
    status: Library
    drums: none
    screen: fx.seal-flicker
    fallback_sfx: n2-burgomasters-funeral.sfx.seal-flicker
    accent_reason: choice
    trigger: {after: "n2-burgomasters-funeral.investigate", when: "picked(follow-the-mourner)"}
```

## 7. Story items and tracks

| Item field | Type | Req | Notes |
|---|---|---|---|
| `id`, `name`, `icon` | id, text, asset | yes | |
| `kind` | `kit` \| `consumable` \| `key` \| `clue` \| `marker` \| `artifact` | yes | E5 |
| `carried` | bool | yes | bound to a hunter; lost if the carrier is defeated (E14 E-rule) |
| `uses` | int \| `unlimited` | no | |
| `advantage` | {trait, amount} | no | RtDT trait only: Beast, Magic, Humanoid, Melee, Undead, Stealth, Wild |
| `as_price` | bool | no | can pay a cost (`~blocked`, fly-eater); spent as price gives no advantage (R3-7) |
| `counts_for_item_loss` | bool | no | stake: yes |

| Track field | Type | Req | Notes |
|---|---|---|---|
| `id` | id | yes | `boxes-left`, `keys`, `villagers-turned` |
| `scope` | `party` \| `hunter` | yes | |
| `start`, `min`, `max` | int | yes | |
| `display` | `storyboard-text` \| `hidden` \| `ipad` | yes | "Boxes left: n" is text, never voiced |
| `on_threshold` | list {at, effects} | no | |

Forbidden: any `effect` naming warriors or spirit. The loader rejects it (V-12).

```yaml
items:
  - {id: holy-water, kind: consumable, carried: true, uses: 1, advantage: {trait: Undead, amount: 1}, as_price: true}
  - {id: sergiu-blade, kind: artifact, carried: true}
tracks:
  - {id: boxes-left, scope: party, start: "seed(box-count)", min: 0, display: storyboard-text}
```

## 8. Corruption hooks and the guard

| Field | Type | Req | Notes |
|---|---|---|---|
| `corruption.limit` | int | yes | Dracula: 3rd corruption loses (Turned) |
| `corruption.sources` | list | yes | all base-game sources count (E3) |
| `corruption.cures` | list ref | yes | holy water, host, Sanctuary rest |
| `hooks` | list {id, when, victim: picker \| party-pick \| hunter, amount} | no | |
| `guard.threshold` | int | yes | limit - 1 |
| `guard.fallback` | ordered list: `sit_out` \| `lose_item` \| `block:<variant>` \| `redirect:<target>` | yes | E9 |

**Guard rule (E9):** no single story or adversary effect may cause the losing corruption. Before applying, if the victim is at `guard.threshold`, the engine applies the first fallback that is payable and logs `guard_triggered=true`. Victims come only from present hunters; if all present hunters are at threshold, the cost redirects (AT-9).

```yaml
corruption: {limit: 3, cures: [holy-water, host, sanctuary-rest]}
guard: {threshold: 2, fallback: [lose_item, "block:~blocked"]}
hooks:
  - {id: watched-lost, when: "choice(lid-choice)=watched and result(fight)=lost", victim: party-pick, amount: 1}
  - {id: forewarned, when: "picked(follow-the-mourner)", victim: picker, amount: 1, alt: sit_out, forced_alt_at: 2}
```

## 9. Quest tokens (E19, proposal)

RtDT has **3 quest markers** (asset AST-B08). The pack reuses them; it adds no new physical token. At most 3 are on the board at once; the loader checks every night's peak.

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | id | yes | |
| `type` | `objective` \| `lure` \| `hunter` | yes | objective: a place the party must reach; lure: an adversary bait that triggers when entered or ignored; hunter: marks a hunter-specific private goal site (shown only on that hunter's iPad) |
| `place` | building ref \| seed rule | yes | wizard step 6 places it |
| `visible_to` | `all` \| `ipad:<hunter>` | yes | hunter-type: private |
| `on_enter` | set piece / encounter / effects | yes | |
| `expires` | phase ref | no | lure: on expiry, effects (e.g. ledger_add) |
| `marker_slot` | 1..3 | yes | which physical marker |

```yaml
quest_tokens:
  - {id: holy-symbol-site, type: objective, place: "seed(holy-symbol-building)", visible_to: all, marker_slot: 1,
     on_enter: n23-catacombs-of-saint-ysolde}
  - {id: decoy-crypt, type: hunter, place: seed(decoy), visible_to: "ipad:role(lookalike)", marker_slot: 2}
```

## 10. Encounters (proposal)

An encounter is a small scene of **2-3 moments**, drawn **at most 1 per round**, and **added to** the normal RtDT event for that round (it never replaces it).

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | id | yes | moment prefix |
| `tables` | list {table, weight} | yes | per phase/kingdom (E11) |
| `trigger` | `round-draw` \| `enter-building` | yes | |
| `cond` | cond | no | |
| `moments` | list (2-3) | yes | |
| `resolution` | `choice` \| `check` \| `battle` \| `none` | yes | battle uses physical RtDT cards |
| `outcomes` | map result → effects | yes | pack resources only |
| `once` | bool | no | |

```yaml
encounters:
  - id: enc-wolves-on-the-road
    tables: [{table: night, weight: 3}]
    moments: [enc-wolves-on-the-road.01, enc-wolves-on-the-road.02]
    resolution: battle
    outcomes: {won: [], lost: [skull_drop: 1]}
```

## 11. Dungeon rooms deck (E20, proposal)

The crypt crawl is a seeded deck of rooms. Rooms clear and stay cleared (R-ASSET-7); drums don't move for story reasons.

| Field | Type | Req | Notes |
|---|---|---|---|
| `dungeon.id` | id | yes | |
| `deck` | list room ref | yes | |
| `draw` | `seeded-shuffle` \| `fixed` | yes | |
| `goal_room` | room ref \| `after:n` | yes | goal room inserted after n rooms |
| `split` | bool | no | party may split (n23 .02-.03) |
| `room.id`, `room.moments` | id, list | yes | |
| `room.resolution` | as encounters | yes | |
| `room.effects` | effect list | no | darkness: next room blind |
| `room.repeatable` | bool | no | |

```yaml
dungeons:
  - id: crypt-saint-ysolde
    draw: seeded-shuffle
    deck: [room.bone-passage, room.false-chant, room.coffin-steps, room.livery-wall, room.bat-swarm]
    goal_room: {room: room.lantern-niche, after: 3}
    split: true
```

## 12. Endings

Each pack declares ranked outcomes and the order they are checked (R-ENG-31).

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | id | yes | |
| `tier` | `full-win` \| `lesser-win` \| `loss` | yes | |
| `check_order` | int | yes | lower first |
| `cond` | cond | yes | |
| `scene` | set piece ref | yes | |
| `loss_cue` | cue refs | loss | R-LF-9 |
| `summary_line` | text | yes | R-SUM-2 |

```yaml
endings:
  - {id: turned,  tier: loss,       check_order: 1, cond: "any corruption(*) >= 3", scene: n5-ending-turned, loss_cue: [plague-tune, cursed-slide]}
  - {id: rescued, tier: full-win,   check_order: 2, cond: "flag(lenka-freed) and holds(sergiu-blade)", scene: n5-ending-rescued}
  - {id: endures, tier: lesser-win, check_order: 3, cond: "flag(lenka-freed)", scene: n5-ending-endures}
  - {id: taken,   tier: loss,       check_order: 4, cond: "night_end(n5)", scene: n5-ending-taken, loss_cue: [lost]}
```

## 13. Asset references by manifest ID

Packs never contain file paths. Every asset is a manifest id; the manifest maps id → type, target profile, path, status.

| Manifest field | Notes |
|---|---|
| `id` | moment id for stills/clips; `<moment>.vo-NN` for lines; `<scene>.sfx.<name>` for sfx |
| `type` | `still` \| `clip` \| `line` \| `sfx` \| `music` \| `ambient` \| `portrait` |
| `target` / `profile` | `storyboard` (`@storyboard`), `ipad`, `phone` |
| `status` | `placeholder` \| `draft` \| `final` |
| `speaker`, `moment`, `text`, `duration_s`, `poster`, `reuse_of` | as in the POC manifest; `reuse_of` replaces a path override (R3-11 `.08` uses `.07`) |

Example (POC manifest shape, renamed target):
```json
"n2-burgomasters-funeral.02.vo-01": {"type": "line", "target": "storyboard", "speaker": "agnes",
  "moment": "n2-burgomasters-funeral.02", "status": "placeholder"}
```

## 14. Stats and timing hooks

| Field | Type | Notes |
|---|---|---|
| `stats.custom` | list {id, type: counter\|event, scope: party\|hunter} | R-ENG-34, R-STA-7: keys, corruptions, villagers turned |
| `stats.highlight_weights` | map stat → weight | R-SUM-2 highlight reel |
| `timing.marks` | auto | engine timestamps every phase, moment, pick, table talk, battle screen, cue, pause (PRD-41); packs add none |
| `timing.estimate` | per length | inputs to PRD-43 formula |
| `titles` | list {cond, text} | per-hunter summary titles (R-SUM-3) |

Engine events every pack gets: `presence_locked`, `private_delivered` / `_skipped_absent`, `choice_locked`, `pick_locked`, `cost_applied` (guard_triggered), `resource_changed`, `ambient_accent` (reason, suppressed), `skull_drop`, `paused_unheld` / `resumed_held`.

```yaml
stats:
  custom: [{id: boxes-burned, type: counter, scope: party}, {id: lid-choice, type: event, scope: party}]
titles: [{cond: "hunter.corruption = 0", text: "the one who never flinched"}]
```

## 15. Validation rules the loader must enforce

- V-1. Schema: every required field present; unknown fields are errors in strict mode.
- V-2. Every `ref` resolves; every `asset` exists in the manifest; every cue name exists in the library or pack.
- V-3. Moment ids match the grammar (4.1) and their `scene` prefix equals their set piece id.
- V-4. `.private.<hunter>` uses a declared hunter and `target: ipad:<hunter>`; no `.private.*` moment, asset or text may be reachable by a `storyboard` target.
- V-5. Every base moment whose lines or still include hunter H has a `~no-H` variant, unless marked `presence_safe` (H not in frame or voice). Every `~no-<x>` names a declared hunter.
- V-6. No two variants of a moment are equally specific with overlapping conditions; a header-only base has variants that cover all cases.
- V-7. At most 2 speakers per exchange.
- V-8. Every cue has a screen half and a fallback; story cues have `drums: none` unless flagged base-game.
- V-9. Every corruption effect passes through the guard; the guard has at least one always-payable fallback.
- V-10. Advantage effects use only RtDT traits; the static max per hunter per fight is ≤ `advantage_cap`, otherwise a warning (runtime caps anyway).
- V-11. Foe modifiers floor at 1.
- V-12. No effect names warriors or spirit.
- V-13. Quest tokens on board at once ≤ 3 per night and phase.
- V-14. Encounters have 2-3 moments; at most 1 encounter per round by construction.
- V-15. Each length lists all required set pieces; each night's `end` is reachable.
- V-16. Endings: at least one win and one loss; `check_order` unique; there is always a matching ending at game end.
- V-17. Investigation: actions > number of hunters; each action has a private finding for every hunter.
- V-18. Choices: every option with a `cond` has a sibling that is always available (no dead-end prompt).
- V-19. Components: minimum asset set check (R-WIZ-3), warning or error per open question.
- V-20. Determinism: all randomness names a seeded table.
- V-21. Readiness (AT-17): every private moment and `~no-` variant has voice and render at status ≥ draft before a "ready" build.

## 16. Check: mapping onto the format

### 16.1 Funeral night (`n2-burgomasters-funeral`)
| Source element | Format section | Fit |
|---|---|---|
| Night 2, K2 Sanctuary | 3.1/3.3 | yes |
| `.01`-`.03`, `.04`-`.08`, `.10` | 4 | yes |
| `~no-wren`, `~no-emeric`, `~no-agnes`, `~no-tomas` | 4.1 | yes |
| `.lid-choice~nailed~no-wren` stacked | 4.1 stacking | yes |
| `.04~holy-symbol` | variant with `holds(holy-symbol)` | yes |
| Investigation, 5 cards, risky follow-the-mourner | 5.1 | yes, `exclusive` setting needs a ruling |
| `.investigate.follow-the-mourner.cue` + `seal-sequence` after lock | 6, `accent_reason: choice` | yes; cue-sheet moment id has "(risky pick)" text that must become the real moment id |
| Lid choice (party) | 5 | yes; now an iPad first press, not a host tap |
| Ready Stake, Consecrated Ground (first round), holy water | 0.2 `advantage`, 7 | yes |
| Mother bars window, nailed lid | `foe_mod` min 1 | yes |
| Forewarned: reveal card, cost corruption or sit out | 0.2, 8 | yes |
| Fight via physical RtDT cards, Won/Lost entry | 3.3 flow `fight` | yes; result entered on an iPad |
| Watched+lost: corruption + skull drop (cap 2, supply <6 → +1 foe n5) | 8, ledger | yes |
| `.09.private.*`, `.end.private.*` | 4.2 | yes |
| heartbeat, dim-all, skull-drop cues | 6 | yes |
| Manifest ids `@dashboard` | 13 | rename to `storyboard` |

### 16.2 Crypt crawl (`n23-catacombs-of-saint-ysolde`)
| Source element | Format section | Fit |
|---|---|---|
| Night 2 or 3 by fortune | 3.3 `night` list + `seed` | yes |
| `.01~village/~sanctuary/~bazaar/~citadel` | `cond: building = ...` | yes |
| Split party `.02`-`.03`, passages redraw | 11 `split`, room deck | partly: script is linear; the room deck is new design |
| `.04.private.<h>` + `~lookalike` + secret card | 4.1, `role(lookalike)` | yes; RR2-2 targeting of `secret-card.lose-consumable` must be `ipad:<hunter>` |
| Lookalike persists until holy water/Sanctuary rest | track or role + flag | yes |
| `.06` break-seal cue, key granted | 6, 3.1 `key` | yes |
| `.07` unmasking only if holy water used | choice + `spend_item` | yes |
| `.07~lookalike-is-tomas`, `.06~night3` | 4.1 | yes |
| Decoy crypt secret goal | 9 `hunter` quest token | yes (proposal) |

## 17. Open questions

1. **E19 and E20 aren't in story-engine.md** (it stops at E18). Sections 9 and 11 are built from the brief. Where is the E19/E20 text?
2. **R-LEN rules and R-WIZ-12 aren't in requirements.md / setup-wizard-and-summary.md** (only cited from PRD rev 5). What does each length change: nights, set pieces, encounters?
3. **`tokens-and-encounters.md` and the POC `spec.md` don't exist.** Is encounter content written somewhere else?
4. **E17 vs R3-6:** E17 says two hunters may pick the same action, with a 60 s timer and auto-pick; R3-6 says first lock wins, taken cards grey out, no timer. Pack field `exclusive`: which default?
5. **Control model change:** the PRD has the host tap choices, Won/Lost, Next and Continue on the Dashboard (OQ-4, OQ-10, §4 steps 8-9, R3-2 reassignment). With the Story board display only, all of these move to iPads (first press). Who reassigns a hunter during an unheld pause?
6. **Vote vs party first press:** should the lid choice be a first press (fast) or a vote of present hunters?
7. **Cue sheet location:** PRD-40 says `shared/tower/cues.json`; the POC uses `apps/burgomaster-funeral-poc/assets/cues/cue-sheet.json`. Which one is canonical for packs?
8. **Cue sheet moment id** `"n2-burgomasters-funeral.investigate.follow-the-mourner (risky pick)"` isn't a valid id; the script uses `...follow-the-mourner.cue`.
9. **Encounters "at most 1 per round" vs E11 tables:** is "round" an RtDT player turn or a full table round?
10. **Quest marker limit:** does the 3-marker cap clash with RtDT's own use of quest markers in the same round?
11. **Accent enum:** is `choice > scene_cue > moment > ambient` a priority order (as written here) or just a log field?
12. **`phone` target:** a separate audience, or only a layout? This doc treats it as a layout.
13. **Minimum asset set (R-WIZ-3):** warning or block?
14. **Skull drop as a story mechanic:** allowed (skulls aren't warriors/spirit), but confirm.
15. **Variant stacking order** (`~nailed~no-wren` vs `~no-wren~nailed`): this doc fixes condition first, presence last.
16. **R-ENG-25 lists "warriors and spirit as base game" for Dracula**, which fits the no-warriors/spirit rule only if story effects never change them. Confirm no script does (none found in n2, n23, n4).
