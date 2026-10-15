# Story pack format

Status: draft for Bob's review, 2026-10-15. Design only, no code.
Scope: the data a new app's **story loader** reads. A story (the Dracula funeral night, the crypt crawl under the church, future stories) must be pure data: adding or changing one needs no code change.

Sources: `research/game-design/story-engine.md` (R-ENG, E1-E18; E15 presence, E16 never idle, E17 investigation, E18 advantages), `requirements.md`, `setup-wizard-and-summary.md` (R-WIZ, R-SUM), `research/stories/dracula/rulings.md`, `apps/burgomaster-funeral-poc/docs/PRD.md` (rev 5, R3-x/R4-x/R5-1), `apps/burgomaster-funeral-poc/assets/manifest.json` and `assets/cues/cue-sheet.json`, scripts `n2-burgomasters-funeral.md`, `n23-catacombs-of-saint-ysolde.md`, `n4-earth-boxes.md`.
Rule sources for sections 3.2, 9, 10 and 11: E19 (a-h) and E20 (a-k) in `story-engine.md`, R-LEN-1..5 and R-RE-1..12 in `requirements.md`, R-WIZ-12 in `setup-wizard-and-summary.md`, D-DRA-11..14 in `rulings.md`, PRD rev 5 (R5-1, R5-2, PRD-41..43), and `assets/stories/dracula/scripts/tokens-and-encounters.md` (Dracula objective sites, lures, hunter-token encounter table).

## 0. Conventions

- **Terminology.** The *Story board* (formerly "Dashboard") is the shared Mac screen and speakers. It is **display only**. All control (choices, votes, picks, Next, Done confirms) comes from iPads or phones. When several devices may answer the same prompt, **the first press counts**; later presses see the locked result.
- **Targets.** `storyboard`, `ipad:all`, `ipad:<hunter>`, `phone`. See 4.2.
- **Format.** A pack is a folder of YAML (or JSON) files plus a pack manifest. Field types: `id` (kebab-case, unique in scope), `ref` (an id defined elsewhere in the pack), `asset` (a manifest id, never a path), `cond` (condition expression, 0.1), `effect` (effect list, 0.2).
- **No code in packs.** Rules that data can't express go in a registered rule module (R-ENG-4) referenced by name; the loader fails if the module isn't installed.
- **Story mechanics never touch warriors or spirit.** Warriors and spirit stay base RtDT (hit points, base costs). Story effects use story items, story tracks, corruption, skulls (via the ledger), flags, and RtDT Advantages (E18).

### 0.1 Condition expressions (`cond`)
A small closed grammar so variants and gates stay data:
`present(<hunter>)`, `absent(<hunter>)`, `holds(<item>)` (a present hunter carries it), `carrier(<item>) = <hunter>`, `flag(<name>)`, `track(<id>) >= n`, `corruption(<hunter>) >= n`, `corruption(<hunter>) = n`, `any corruption(*) >= n`, `choice(<choice-id>) = <option>`, `picked(<action>)`, `result(<fight-id>) = won|lost`, `night = n`, `night_end(<night>)`, `length = short|standard|long`, `building = village|sanctuary|bazaar|citadel`, `seed(<table>) = <value>`, `role(<role>) = <hunter>`; combined with `and`, `or`, `not`.

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
| `lengths` | list of `short`/`standard`/`long` | yes | all three (R-LEN-1); see 3.2 |
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

### 3.2 Per-length selection (R-LEN-1..5, R-WIZ-12)

Length is a setup option, **Short / Standard / Long**, default Standard, picked by the host in wizard step 1 next to difficulty and fixed for the game (R-LEN-1, R-WIZ-12). The pack declares everything a length changes (R-LEN-2, R-LEN-3); the loader picks the block for the chosen length at setup. A pack must declare all three lengths.

| Field | Type | Req | Notes |
|---|---|---|---|
| `by_length.<len>` | `short` \| `standard` \| `long` | yes | all three present (R-LEN-1) |
| `.label` | text | yes | what the length means in story terms, e.g. "3 nights" (R-WIZ-12) |
| `.nights` | list night ref | yes | number and order of nights or chapters/clock length (R-LEN-2, R-ENG-3, R-ENG-17) |
| `.set_pieces.<night>` | list set-piece ref | yes | set pieces kept that night (R-LEN-3) |
| `.hunter_token.move_every` | int rounds | no | E19h; default 1 (every round, the Standard rule) |
| `.hunter_token.max_encounters_per_night` | int | no | E19h; default: no cap beyond E19e's one per round |
| `.encounter_frequency` | per R-RE-8 (rate per phase, by difficulty) | yes | R-LEN-2, R-RE-8; logged per session |
| `.dungeons.<dungeon>.rooms` | int N | if pack has dungeons | E20i (see 11) |
| `.dungeons.<dungeon>.room_cap_per_visit` | int | if pack has dungeons | E20i |
| `.timing` | {estimate_minutes, runs, measured_at} \| `pending` | yes | R-LEN-4: measured, never guessed; `pending` until enough runs; written from PRD-41..43 data, not hand-authored |

Rules:
- R-LEN-3: the opening, every set piece the win condition depends on, and the finale appear at every length. The loader (V-15) fails a length whose win condition is unreachable.
- R-WIZ-12: the wizard shows `label` and, if `timing` is measured, the estimate; otherwise "estimate pending".
- R-LEN-5: the game record stores the chosen length with total, active and paused time and time per phase/night (14). Pauses are excluded from active time (PRD-41).
- The extrapolation behind `timing` is PRD-43: set pieces × set-piece time + expected encounters × encounter time + fights × fight time + nights × dusk/dawn overhead.

```yaml
by_length:                       # Dracula, D-DRA-13 (provisional)
  short:    {label: "3 nights", nights: [<2 of n1-n4>, n5], timing: pending}   # which 2: Loremaster proposes, Bob rules
  standard: {label: "4 nights", nights: [<3 of n1-n4>, n5], timing: pending}
  long:     {label: "5 nights (full game)", nights: [n1, n2, n3, n4, n5], timing: pending}
```
D-DRA-13: the night-5 tower assault is always played; set pieces per length, hunter-token pace and encounter frequency are not decided yet.

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
The `by_length` lists in that example show the field shape only. Which set pieces each length keeps is not ruled (D-DRA-13).

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
- `ipad:<hunter>`: every device holding that hunter, only while that hunter is present (except `scope: global`). Labelled with the hunter's name. `end.private.<hunter>` is the other exception (R3-9, spec D18): it goes to every current holder, present or absent, and is still refused on the Story board. It is not `scope: global`.
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
| `vote.tie` | `first-press` \| `retreat` \| option id \| `seeded` | vote | `retreat`: the tie leaves (dungeon votes, ruling 5) |
| `timeout_s` + `default` | int, option | no | not used by investigation (ruling 1): no timer and no auto-pick |
| `stat` | stat id | yes | choices are always logged |

Rules: `party` mode locks on the first press from any device; others see it locked. `hunter` mode with a shared hunter: first answer from any holder (R3-8). A vote counts one ballot per **hunter**, cast by the first press among that hunter's holders.

### 5.1 Investigation round (E17)

| Field | Type | Req | Notes |
|---|---|---|---|
| `actions` | list {id, card moment, finding: {id, private moments per hunter, effects}, risky: {cue, cost options}} | yes | 4-6 actions, more than present hunters |
| `exclusive` | bool | yes | default **true** (R3-6: one unique pick per present hunter, first lock wins, taken cards grey out) |
| `reveal` | `after-all-lock` | yes | picks private until all lock |
| `share_moment` | moment | yes | table-talk; Continue from an iPad |

Investigation has no timer and no auto-pick (ruling 1, spec D16). The round waits until every present hunter has locked a unique action. The finding goes only to the devices holding the hunter who picked it (E17).

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
| `trigger` | {after: moment ref, when: cond} | no | when the cue fires, if a moment does not list it under `cues` |

**Accent reason (R5-2).** Each logged accent has exactly one reason: `choice`, `scene_cue`, `moment`, or `ambient`. Precedence is that order, and the first match wins. This classifies that one accent. It is not a contest between two outputs. The reason is derived; a pack does not set it on the cue.
- `choice`: the moment is waiting on player input. In the funeral that is `.investigate` and every `.investigate.*` id (including `.investigate.follow-the-mourner.cue`), `.lid-choice` and every `.lid-choice*` id, the Forewarned choice, and the battle screen. Those log `choice` even when they also fire a cue such as `heartbeat`.
- `scene_cue`: a cue-sheet cue that actually fires on that moment, including a variant that inherits the cue. A capped or converted skull drop does not fire `skull-drop`, so that moment is not `scene_cue`.
- `moment`: a plain moment start with no cue, such as `.01`.
- `ambient`: an E16 seeded filler accent. Suppressed during speech, choices and pauses; idle gap ≤10 s.
`choice` and `scene_cue` set the E16 accent suppressed. The cue's screen half and fallback still play. `moment` and `ambient` do not suppress that accent.

```yaml
cues:
  - name: seal-sequence
    capability: "seal flicker + one tower sound"
    status: Library
    drums: none
    screen: fx.seal-flicker
    fallback_sfx: n2-burgomasters-funeral.sfx.seal-flicker
    trigger: {after: "n2-burgomasters-funeral.investigate", when: "picked(follow-the-mourner)"}
    # the follow-the-mourner cue moment logs reason choice (R5-2): it is an .investigate.* id
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
| `hooks` | list {id, when, victim: picker \| party-pick \| hunter, amount, alt, forced_alt_at} | no | `alt` is the other payment (Forewarned: `sit_out`). `forced_alt_at` is the corruption count that leaves only `alt` (2) |
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

## 9. Quest tokens (E19)

The pack reuses RtDT's 3 physical quest markers (asset AST-B08) or Dark Horde minis for three roles, at most one of each per night: **objective**, **lure**, **hunter** (E19). It adds no new physical token. The pack supplies sites, icons and art; the engine owns placement and movement. A **site** is an RtDT space, usually one with a building (citadel, sanctuary, village, bazaar).

**9.1 Objective (E19a).**

| Field | Type | Req | Notes |
|---|---|---|---|
| `objective.<night>` | list {site, set_piece} | yes (nights with set pieces) | ordered; at dusk on the first site |

The set piece starts when a hunter enters the site, and presence (E15) applies. With two set pieces, the token moves to the second site when the first scene ends. Sites may be `fortune-building` (seeded). A pack rule may move the token within a set piece, but only one site at a time (D-DRA-12, n4 boxes).

**9.2 Lure (E19b), optional.**

| Field | Type | Req | Notes |
|---|---|---|---|
| `lures` | list {id, site, reward, nights, hook moment} | no | omit to skip lures |
| `.reward` | one story item \| one finding | yes | exactly one |

At dusk the engine makes one seeded draw from the lures valid that night; it never sits on the objective's site (redraw). The first hunter to reach it gets the reward, revealed privately to the iPads holding that hunter (`ipad:<hunter>`), with a neutral Story board line. Then it is removed.

**9.3 Hunter token (E19c, E19d).**

| Field | Type | Req | Notes |
|---|---|---|---|
| `hunter_token.start` | `citadel` (default) \| building type \| `tower-adjacent` | no | E19d |
| `hunter_token.encounters` | encounter table ref (10) | yes | seeded draw on landing |
| `hunter_token.move_cue` / `land_cue` | cue | yes | lights/sound only (6); never drums (E13) |
| pace | see `by_length.<len>.hunter_token` (3.2) | | E19h |

Placed at dusk on its start site. Default start: the active kingdom's citadel; if that space holds the objective or a hunter at dusk, a space next to the Tower in the active kingdom (E19d). A round is a full table round (ruling 4). At the end of each round, before hunters move, it moves one space toward the nearest hunter by RtDT adjacency and river rules, ties by seeded pick (E19c). Landing on a hunter's space draws one hunter encounter; only hunters on that space are present (E15). It then returns to start, and is removed at dawn.

Guards and logging: a token encounter or lure never gives a third corruption; a corruption aimed at a hunter at 2 is redirected under E9 (E19f). Every placement, move (from, to, round), draw, removal, lure claim and result is logged with the seed (E19g).

```yaml
quest_tokens:                       # Dracula (tokens-and-encounters.md §1-3)
  objective:
    n2: [{site: "K2 fortune-building", set_piece: seed(n23-sergius-blade|n23-catacombs-of-saint-ysolde)},
         {site: "K2 sanctuary", set_piece: n2-burgomasters-funeral}]
  lures:
    - {id: lure-font-violet, site: sanctuary, reward: {item: holy-water}, nights: [2, 3, 4], hook: lure-font-violet.01}
  hunter_token:
    start: tower-adjacent           # D-DRA-11 override (K3 Citadel is the n3 objective)
    encounters: enc-hunter-token
    move_cue: heartbeat
    land_cue: heartbeat-fast
```

## 10. Encounters (E11, E19e, R-RE)

Encounters are seeded, weighted table draws (R-RE-1, R-RE-2, E11). The hunter-token encounter (E19c) is one source; packs may add others (per phase, kingdom, terrain, building) under R-RE-1.

| Field | Type | Req | Notes |
|---|---|---|---|
| `tables.<id>` | list {encounter, weight, cond} | yes | keyed by kingdom, terrain, building type, phase, story part, threat (R-RE-1) |
| `id` | id | yes | moment prefix `enc-<id>` |
| `source` | `hunter-token` \| `table` | yes | |
| `nights` | list int | no | validity |
| `cond` | cond | no | e.g. not spotlit tonight |
| `moments` | list, 2-3 | yes | E19e |
| `choices` | 2-3 options with different costs/risks | yes, unless `hazard` with `counter` | R-RE-9 |
| `counter` | item/hunter ref | no | 1981 counter pattern (R-RE-10) |
| `resolution` | `choice` \| `check` \| `trade` \| `haggle` \| `battle` | yes | R-RE-3; battle on the Story board battle screen, physical RtDT cards |
| `outcomes` | map result → {line, effects} | yes | one line plus resource deltas, logged (R-RE-12); pack resources only (E11) |
| `clock_cost` | int | yes | R-RE-11 |
| `cooldown` / `session_cap` | int | no | never the same encounter twice in a row (R-RE-4) |

Rules (E19e, ruled by Bob Oct 14 2026: **add**):
- A hunter-token encounter plays **in addition to** that turn's normal RtDT event, never instead of it. The normal event resolves first, then the encounter.
- At most one hunter-token encounter per full table round (ruling 4), 2-3 moments each.
- The corruption guard applies (E19f): a cost aimed at a hunter at 2 corruption is redirected under E9, never a third corruption.
- The normal event and the encounter are logged separately (E19e, E19g).
- Frequency is per pack, difficulty and length (R-RE-8, R-LEN-2, 3.2).
- Choices are made on iPads (5); the Story board only shows the prompt and result.

```yaml
encounters:
  - id: enc-the-window              # tokens-and-encounters.md
    source: hunter-token
    nights: [1, 2, 3, 4]
    moments: [enc-the-window.01, enc-the-window.02, enc-the-window.03]   # .04 outro: see 17
    resolution: choice
    choices:
      - {id: watch, effects: [corruption: {to: present, amount: 1}], outcome: finding(high-room)}
      - {id: look-away, effects: []}
    clock_cost: 0
```

## 11. Dungeon rooms deck (E20)

A dungeon is placed at a site as an E19 objective and starts when a hunter enters it; presence locks as in E15, so only present hunters crawl (E20a). First use: the Dracula crypt under the night-2 church, entered right after the funeral (D-DRA-14).

| Field | Type | Req | Notes |
|---|---|---|---|
| `dungeon.id` | id | yes | |
| `site` | objective ref (9.1) | yes | E20a |
| `trait` | RtDT Advantage trait | yes | the one trait that may improve a room (E20c, E18) |
| `deck` | list room ref | yes | |
| `layout` | `chain` \| `chain+branches` | yes | seeded deal at game start, target room always last (E20b) |
| `target_room` | room ref | yes | always last; clearing it = success (E20h) |
| `rooms` / `room_cap_per_visit` | per length, `by_length.<len>.dungeons` (3.2) | yes | E20i |
| `reentry` | bool | no | may the party re-enter on a later turn/night after retreat (E20e) |
| `outcome_by_depth` | map depth → effects | no | E20g |
| `room.id`, `room.moments` | id, list | yes | |
| `room.type` | `trap` \| `foe` \| `treasure` \| `deeper` \| `story` | yes | E20b |
| `room.hunter` | hunter ref | story rooms | with `~no-<hunter>` variant if absent (E20b) |
| `room.improve` | effects | no | applied if a present hunter spends one `trait` (or Wild) Advantage, once per room (E20c) |
| `room.cost` | story items, story tracks, or corruption to a present hunter | no | never warriors or spirit (E20d) |
| `room.foe` | foe ref | foe rooms | Story board battle screen, base RtDT warrior costs (E20c) |
| `room.loot` | story items | treasure/target | bound to a present hunter (E20f) |

Rules:
- Rooms are face down until entered; the Story board shows the room map and depth (rooms cleared of N) (E20b, E20g).
- Per room: reveal, optional improve, resolve (E20c). Unpayable cost: pay what you can and take one corruption; at most one per room, never a third (E20d, E9/E19f).
- After each room the present hunters vote, go deeper or leave (E20e). The format uses `mode: vote` (5). A tie means retreat: dungeon votes use `vote.tie: retreat` (ruling 5). That replaces the host tiebreak and a first-press tie.
- Cleared rooms stay cleared after leaving (E20e).
- End: target cleared (success), retreat (partial, depth logged), or length cap hit (treated as retreat) (E20h).
- Logging: seed, layout, each room (type, improve, cost, corruption, loot), the choice, start/end per room and crawl (E20j, PRD-41).
- No tower control in the POC; ambient E16 continues (E20k). Story cues never move drums.

```yaml
dungeons:                           # D-DRA-14
  - id: crypt-under-church
    site: n2-crypt-entry            # objective after n2-burgomasters-funeral
    trait: <RtDT trait>            # which advantage improves a room is not ruled
    layout: chain
    deck: [room.ossuary, room.flooded-passage, room.old-burgomasters-tomb, room.szgany-cache]
    target_room: room.sealed-door
    # reentry is not ruled (E20e: only if the pack allows it)
```
`n23-catacombs-of-saint-ysolde` is a linear set piece (3.3), not an E20 crawl.

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
| `titles` | list {cond, text} | per-hunter summary titles (R-SUM-3). In the cond, `hunter` is that hunter |

Engine events every pack gets: `presence_locked`, `private_delivered` / `_skipped_absent`, `choice_locked`, `pick_locked`, `cost_applied` (guard_triggered), `resource_changed`, `ambient_accent` (reason, suppressed), `skull_drop`, `paused_unheld` / `resumed_held`.

```yaml
stats:
  custom: [{id: boxes-burned, type: counter, scope: party}, {id: lid-choice, type: event, scope: party}]
titles: [{cond: "corruption(hunter) = 0", text: "the one who never flinched"}]  # hunter is the one being titled
```

## 15. Validation rules the loader must enforce

- V-1. Schema: every required field present; unknown fields are errors in strict mode.
- V-2. Every `ref` resolves; every `asset` exists in the manifest; every cue name exists in the library or pack.
- V-3. Moment ids match the grammar (4.1) and their `scene` prefix equals their set piece id.
- V-4. `.private.<hunter>` uses a declared hunter and `target: ipad:<hunter>`; no `.private.*` moment, asset or text may be reachable by a `storyboard` target.
- V-5. Every `~no-<x>` names a declared hunter. When hunter H is absent, play `~no-H` if that variant exists. If it does not, and H would speak, cut that line (PRD-8). `presence_safe` marks a base that does not depict H, so no variant is expected. A missing variant is not by itself a load error.
- V-6. No two variants of a moment are equally specific with overlapping conditions; a header-only base has variants that cover all cases.
- V-7. At most 2 speakers per exchange.
- V-8. Every cue has a screen half and a fallback; story cues have `drums: none` unless flagged base-game.
- V-9. Every corruption effect passes through the guard; the guard has at least one always-payable fallback.
- V-10. Advantage effects use only RtDT traits; the static max per hunter per fight is ≤ `advantage_cap`, otherwise a warning (runtime caps anyway).
- V-11. Foe modifiers floor at 1.
- V-12. No effect names warriors or spirit.
- V-13. Quest tokens: at most one objective, one lure, one hunter token per night (E19); a lure is never on the objective's site (E19b).
- V-14. Encounters have 2-3 moments and 2-3 choices (E19e, R-RE-9); at most 1 hunter-token encounter per full table round (ruling 4).
- V-15. All three lengths declared; each keeps the opening, every set piece the win condition needs, and the finale; fail a length whose win condition is unreachable (R-LEN-3).
- V-16. Endings: at least one win and one loss; `check_order` unique; there is always a matching ending at game end.
- V-17. Investigation: more actions than hunters; each action has a private finding for the hunter who picks it, authored per hunter, and only that hunter's holders receive it; no timeout and no auto-pick (ruling 1).
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
| Investigation, 5 cards, risky follow-the-mourner | 5.1 | yes, `exclusive: true` (R3-6) |
| `.investigate.follow-the-mourner.cue` + `seal-sequence` after lock | 6; the moment logs `choice` (R5-2) | yes; cue-sheet moment id has "(risky pick)" text that must become the real moment id |
| Lid choice (party) | 5 | yes; now an iPad first press, not a host tap |
| Ready Stake, Consecrated Ground (first round), holy water | 0.2 `advantage`, 7 | yes |
| Mother bars window, nailed lid | `foe_mod` min 1 | yes |
| Forewarned: reveal card, cost corruption or sit out | 0.2, 8 | yes |
| Fight via physical RtDT cards, Won/Lost entry | 3.3 flow `fight` | yes; result entered on an iPad |
| Watched+lost: corruption + skull drop (cap 2). Supply < 6 becomes finale ledger +1 foe instead of a drop | corruption, cap, and drop in 8; the supply swap has no field (named rule module, R-ENG-4) | partial |
| `.09.private.*`, `.end.private.*` | 4.2 | yes |
| heartbeat, dim-all, skull-drop cues | 6 | yes |
| Manifest ids `@dashboard` | 13 | rename to `storyboard` |

### 16.2 Catacombs set piece (`n23-catacombs-of-saint-ysolde`)
| Source element | Format section | Fit |
|---|---|---|
| Night 2 or 3 by fortune | 3.3 `night` list + `seed` | yes |
| `.01~village/~sanctuary/~bazaar/~citadel` | `cond: building = ...` | yes |
| Split party `.02`-`.03`, passages redraw | 3.3 set piece flow | yes; linear set piece, not an E20 crawl (E20 is D-DRA-14's crypt) |
| `.04.private.<h>` + `~lookalike` + secret card | 4.1, `role(lookalike)` | yes; RR2-2 targeting of `secret-card.lose-consumable` must be `ipad:<hunter>` |
| Lookalike persists until holy water/Sanctuary rest | track or role + flag | yes |
| `.06` break-seal cue, key granted | 6, 3.1 `key` | yes |
| `.07` unmasking only if holy water used | choice + `spend_item` | yes |
| `.07~lookalike-is-tomas`, `.06~night3` | 4.1 | yes |
| Decoy crypt secret goal | 4.2 private secret card + flag | yes; a secret card, not a quest token (E19 tokens are objective/lure/hunter) |

## 17. Open questions

1. **POC spec.** Checked against `apps/burgomaster-funeral-poc/spec.md` and the POC PRD. Factual clashes corrected in this doc: D18 end lines, D16 no investigation timer, R5-2 accent reasons, PRD-8 missing variants. D19 (no live grey-out of picks) stays marked for Gamewright.
2. **E17 vs R3-6, ruled:** `exclusive` defaults to **true** (one unique pick per present hunter, first lock wins, R3-6). E17's text ("two hunters may pick the same action", 60 s timer, auto-pick) is out of date and should be updated in story-engine.md.
3. **Control model, ruled:** the Story board is display only, so in the real app the host taps in the PRD (OQ-4, OQ-10, §4 steps 8-9, Won/Lost, Next, Continue) are iPad presses and the first press counts. Reassigning a hunter stays as built from the old Dashboard in the frozen POC (PRD-20, AT-5, OQ-12, R3-2). In the real app, any joined iPad can reassign (ruling 2).
4. **Vote vs party first press:** should the lid choice be a first press (fast) or a vote of present hunters?
5. **Cue sheet location:** PRD-40 says `shared/tower/cues.json`; the POC uses `apps/burgomaster-funeral-poc/assets/cues/cue-sheet.json`. Which one is canonical for packs?
6. **Cue sheet moment id** `"n2-burgomasters-funeral.investigate.follow-the-mourner (risky pick)"` isn't a valid id; the script uses `...follow-the-mourner.cue`.
7. **Round:** settled by ruling 4. A round is a full table round, not one hunter's turn.
8. **Quest marker clash:** E19 uses the 3 RtDT quest markers (or Dark Horde minis). Does that clash with RtDT's own quest markers in the same game?
9. **Accent enum:** settled by R5-2. Each logged accent has one reason. The order `choice > scene_cue > moment > ambient` is which label applies (first match wins).
10. **`phone` target:** a separate audience, or only a layout? This doc treats it as a layout.
11. **Minimum asset set (R-WIZ-3):** warning or block?
12. **Skull drop as a story mechanic:** allowed (skulls aren't warriors/spirit), but confirm.
13. **Variant stacking order** (`~nailed~no-wren` vs `~no-wren~nailed`): this doc fixes condition first, presence last.
14. **R-ENG-25 lists "warriors and spirit as base game" for Dracula**, which fits the no-warriors/spirit rule only if story effects never change them. Confirm no script does (none found in n2, n23, n4).
15. **E19f redirect:** settled by ruling 3. `~blocked` (lose one story item) is the Dracula form of that redirect.
16. **Encounter length:** several Dracula encounters have 4 moments (`enc-the-window.01-.04`, plus inserted `nx-midnight-procession` moments in `enc-early-lantern`), against E19e's 2-3. Cut them, or does an outro still count?
17. **`enc-the-window.03`:** settled by ruling 6. The choice moves to the iPads. The Story board shows the prompt and the result.
18. **E20e tie-break:** settled by ruling 5. A tie means retreat (`vote.tie: retreat`).
19. **D-DRA-13/14 open values:** set pieces per length, hunter-token pace, encounter frequency, crypt room count per length and the crypt's improve trait are not ruled yet.
20. **D-DRA-11 site name:** no source names the tower-adjacent spaces; the app names it by terrain and position until the board is checked.

## Gamewright rulings (Oct 15 2026)

These settle the matching open questions above and take precedence over any earlier wording in this doc.

1. **E17 investigation** follows R3-6: each present hunter takes a different pick, the first lock wins, and there is no timer or auto-pick.
2. **Reassigning a hunter** (PRD-20, AT-5, OQ-12, R3-2) stays as built from the old Dashboard in the frozen POC. In the real app, any joined iPad can reassign.
3. **`~blocked`** (lose one story item) is the Dracula form of the E19f corruption redirect.
4. **Round** means a full table round.
5. **E20e tie votes:** a tie means retreat (leave the dungeon). This replaces the host tiebreak and the `vote.tie: first-press` proposal; dungeon votes use `vote.tie: retreat`.
6. **`enc-the-window.03`:** the choice moves to the iPads.

Follow-up (not blocking): Loremaster trims `enc-the-window` and `enc-early-lantern` to 2-3 moments.
Still open: set pieces per length, crypt room count per length, which advantage the crypt rooms improve, and a name for the tower-adjacent space.
