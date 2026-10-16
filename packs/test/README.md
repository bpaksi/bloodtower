# Test pack (`packs/test`)

The files in this folder are the proving ground R1 loads. They are not a published story, and they are the only pack this step loads. The Grey Stair content spec below is a design draft. It does not replace these files until a later content-only change.

| | |
|---|---|
| Hunters | alpha, beta, gamma, delta |
| Nights | n1 |
| Set piece | proving-ground |
| Moments | a shared still, its `~no-delta` variant, private moments for alpha and delta, a shared line with one cue |
| Cue | `bell`: screen `fx.bell`, fallback `sfx.bell`, drums `none` |

`pnpm --dir apps/bloodtower pack:lint` checks this folder. A `choices` file is parsed and kept. Nothing runs it.

# Test pack (`packs/test/`) content spec

Status: design draft for Bob, 2026-10-15. The YAML in this folder is still the proving ground above. This spec is not what the loader reads.
Sources: `research/game-design/story-pack-format.md` (sections 0-15, V-1..V-21, rulings 1-10), `story-engine.md`, `tower-effects-library.md`, `tower-sound-inventory.md`, `apps/bloodtower/plans/R1-step1-foundation.md`, `apps/bloodtower/spec.md` (D3, D4), `src/protocols/pack.ts`, `src/server/config.ts`.
## Purpose
- Long-lived proving ground for new engine ideas. Ideas are proven here first; the Dracula pack holds only proven work.
- Story-neutral: no Dracula names, places, items or art. Theme: "The Grey Stair", a nameless tower lit by lamps.
- Tiny: 4 hunters, 1 night, 1 set piece, 2-room crypt at Short. A full Short run takes about 10 minutes.
- Exercises every engine feature listed below. Each feature gets one feature tag (`F-x`) so tests can point at it.
- Loads from `packsDir` (`.wt.json`), with `PACKS_DIR` as override; default `packs/test/`. This spec does not replace the proving-ground YAML yet.
## Files
| File | Holds |
|---|---|
| `pack.yaml` | metadata (format 1), hunters and cast (2), nights, set pieces, by_length (3) |
| `moments.yaml` | moments (4) |
| `choices.yaml` | choices and votes (5) |
| `cues.yaml` | cues (6) |
| `items.yaml` | items, tracks (7), corruption and guard (8) |
| `dungeon.yaml` | dungeon and rooms (11) |
| `endings.yaml` | endings (12), stats and titles (14) |
| `manifest.json` | assets by id (13); all `status: placeholder` at first |
| `cast.yaml`, `script.yaml` | talking-avatar lines (see F-10; not yet in the format) |
| `README.md` | one-paragraph purpose + the feature table below |
## Feature map
| Tag | Feature | Where |
|---|---|---|
| F-1 | Splash, then setup wizard; game length is in wizard step 1 next to difficulty | `setup`, `by_length` labels |
| F-2 | Story board is display only; every press comes from an iPad, first press wins | `.01` Next, `.door-choice` |
| F-3 | Short narrated scene (narrator, 3 lines) | `grey-stair.01`-`.02` |
| F-4 | Shared + private moments, one `~no-<hunter>` variant | `.02.private.*`, `.02~no-dell` |
| F-5 | iPad party choice (first press) | `.door-choice` |
| F-6 | Crypt crawl, rooms per length 2/4/6, held Advantages reduce room cost, no Advantage granted | `dungeon.yaml` |
| F-7 | Vote after each room, tie = retreat | `.deeper-vote` |
| F-8 | One tower effect from the library, only real tower sounds | cue `room-cleared` (FX-22) |
| F-9 | Story items and a story track, never warriors or spirit | `lamp-oil`, `brass-key`, `lamps-lit` |
| F-10 | Talking-avatar lines (cast.yaml + script.yaml) | lines `ts-keeper-001`..`003` |
| F-11 | Replay from the story log by line id | any voiced line; tested on `ts-keeper-001` |
| F-12 | Pause overlay: Reassign / Concede / End for now | engine; pack declares nothing |
| F-13 | Win ending and loss ending | `endings.yaml` |
| F-14 | Stats recorded | `stats.custom`, `titles` |
## 1. Metadata (`pack.yaml`)
```yaml
pack_id: test
title: "Test Pack: The Grey Stair"
version: 0.1.0
engine_min: 0.1.0
tone: "Neutral, quiet, slightly eerie. No setting, no named villain."
structure: one-shot
players: {min: 1, max: 4}
lengths: [short, standard, long]
difficulties: [{id: normal, label: "Normal", mods: {}}]
systems: {clock: nights, corruption: on, investigation: off, dungeon: on, quest_tokens: on, encounters: off}
components:
  - {asset-group: rtdt-core, use: used}
  - {asset-group: rtdt-quest-markers, use: used}
  - {asset-group: rtdt-skulls, use: unused}
setup: [length-and-difficulty, hunters-and-devices, tower-connect, placements]   # step 1 = length + difficulty (R-WIZ-12)
av_theme: {art_style: flat-grey, clip_style: none, palette: grey-amber, narrator_voice: vo.narrator, music_mood: still, sfx_set: test}
ambient:
  night: {bed: amb.test-hum, accents: [acc.test-drip, acc.test-creak], interval_s: [20, 60]}
advantage_cap: 2
```
No `rule_modules`. Splash (F-1) is engine-owned: it shows `title` and `tone`; no pack field.
## 2. Hunters and cast
Neutral ids so no Dracula id ever appears. All four are always in play; one device may hold several.
```yaml
hunters:
  - {id: ash,  name: "Ash",  portrait: por.ash,  voice: vo.ash,  start_location: "K1 citadel", start_items: [lamp-oil]}
  - {id: bryn, name: "Bryn", portrait: por.bryn, voice: vo.bryn, start_location: "K1 citadel"}
  - {id: cole, name: "Cole", portrait: por.cole, voice: vo.cole, start_location: "K1 citadel"}
  - {id: dell, name: "Dell", portrait: por.dell, voice: vo.dell, start_location: "K1 citadel"}
cast:
  - {id: narrator, name: "Narrator", role: narrator, voice: vo.narrator}
  - {id: keeper,   name: "The Keeper", role: npc, voice: vo.keeper}
```
## 3. Night, set piece, lengths
```yaml
nights:
  - {id: n1, index: 1, kingdom: fixed:K1, phases: [{id: night, advance: {after_actions: 99, on_event: grey-stair.done}}],
     set_pieces: [{ref: grey-stair, required: true}], end: "flag(stair-done)"}
set_pieces:
  - id: grey-stair
    night: n1
    site: {kingdom: K1, building: sanctuary}
    trigger: enter-site
    flow: [moment: grey-stair.01, moment: grey-stair.02, moment: grey-stair.03, choice: grey-stair.door-choice,
           dungeon: grey-crypt, moment: grey-stair.04]
    outcome: {effects: [set_flag: stair-done], next: end}
    stats: [door-choice, crypt-depth]
quest_tokens:
  objective: {n1: [{site: "K1 sanctuary", set_piece: grey-stair}]}
by_length:
  short:    {label: "2 crypt rooms",  nights: [n1], set_pieces: {n1: [grey-stair]}, encounter_frequency: none, dungeons: {grey-crypt: {rooms: 2}}, timing: pending}
  standard: {label: "4 crypt rooms",  nights: [n1], set_pieces: {n1: [grey-stair]}, encounter_frequency: none, dungeons: {grey-crypt: {rooms: 4}}, timing: pending}
  long:     {label: "6 crypt rooms",  nights: [n1], set_pieces: {n1: [grey-stair]}, encounter_frequency: none, dungeons: {grey-crypt: {rooms: 6}}, timing: pending}
```
Only the crypt changes with length, so every length keeps the opening, the set piece and the ending (V-15).
## 4. Moments (`moments.yaml`)
| Id | Kind | Target | Content | Advance |
|---|---|---|---|---|
| `grey-stair.01` | still | storyboard | Narrator: "A grey stair climbs into the dark. [pause 1] Someone has left the lamps unlit." | `next` (iPad, first press, F-2) |
| `grey-stair.02` | still | storyboard | Narrator: "At the top, a door. Below it, a draught from the crypt." Dell: "I hear water down there." | `next` |
| `grey-stair.02~no-dell` | still | storyboard | `cond: absent(dell)`; narrator line only, Dell's line cut | `next` |
| `grey-stair.02.private.<h>` (x4) | text-card | ipad:<h> | One private thought each, e.g. ash: "Your oil flask is half full." `placeholder: "Each hunter has a private thought."` | `next` |
| `grey-stair.03` | clip | storyboard | Talking avatar: the Keeper, lines `ts-keeper-001`, `-002`, `-003` in order (F-10) | `clip-end` |
| `grey-stair.door-choice` | pick-card | ipad:all | prompt for choice 5 | `step` |
| `grey-stair.04` | still | storyboard | Narrator: "The lamps are lit, or they are not. The stair is quiet." | `next` |
| `crypt.<room>` | still | storyboard | one per room: reveal line + cost (section 11) | `step` |
| `end.lit.01` / `end.dark.01` | still | storyboard | endings (section 12) | `next` |
| `end.lit.private.<h>` (x4) | text-card | ipad:<h> | one closing line per hunter (D18 rule: every holder, present or absent) | `next` |
Every voiced line has a manifest `line` asset `<moment>.vo-NN`. Lines ≤2 speakers per moment (V-7).
Room and ending moments use the reserved `crypt.` and `end.` prefixes (format 4.1, relaxed V-3).
## 5. Choice and vote (`choices.yaml`)
```yaml
choices:
  - id: grey-stair.door-choice
    mode: party            # first press from any iPad locks it (F-2, F-5)
    askers: present
    options:
      - {id: oil-the-hinge, label: "Oil the hinge (spend lamp oil)", cond: "holds(lamp-oil)",
         effects: [spend_item: lamp-oil, advantage: {trait: Stealth, amount: 1, scope: present, duration: fight}]}
      - {id: force-it, label: "Force it", effects: [track_add: {lamps-lit: -1}]}
    stat: door-choice
  - id: grey-crypt.deeper-vote
    mode: vote
    askers: present
    vote: {rule: majority, tie: retreat}   # ruling 5 (F-7)
    options: [{id: deeper, label: "Go deeper"}, {id: leave, label: "Leave the crypt"}]
    stat: crypt-vote
```
`force-it` has no cond, so the prompt never dead-ends (V-18). A tie with 2 or 4 hunters present leaves the crypt.
## 6. Tower effect (`cues.yaml`)
One library effect, FX-22 `room-cleared`. Only tower sounds that exist: Dungeon Complete (#58), Dungeon Footsteps (#56). No bell (tower has none), no Mac-synced bell.
```yaml
cues:
  - name: room-cleared
    capability: "FX-22: Dungeon Complete #58 + flareThenFade; Footsteps #56 to move on"
    status: Library
    drums: none
    screen: fx.room-stamp
    fallback_sfx: grey-crypt.sfx.room-cleared
    trigger: {after: "crypt.*", when: "flag(room-cleared)"}
    hold_s: 3          # placeholder until #58 is measured
```
Engine rules this cue proves: diff lights before send (a no-op write stalls the queue 30 s); one command at a time, 250 ms after each write; #56 starts ≥1.5 s after #58; never wait for a sound end (the tower doesn't report it). The cue's `hold_s` sets the wait instead; the talking-avatar line never starts inside it. Fallback plays on disconnect, calibration, or any failed/timed-out command.
## 7-8. Items, track, corruption (`items.yaml`)
```yaml
items:
  - {id: lamp-oil,  name: "Lamp oil",  icon: ico.lamp-oil,  kind: consumable, carried: true, uses: 1, as_price: true}
  - {id: brass-key, name: "Brass key", icon: ico.brass-key, kind: key,        carried: true}
tracks:
  - {id: lamps-lit, scope: party, start: 2, min: 0, max: 6, display: storyboard-text}   # "Lamps lit: n", never voiced
corruption: {limit: 3, sources: [base-game, story], cures: []}
guard: {threshold: 2, fallback: [lose_item, "redirect:track:lamps-lit"]}
```
No effect names warriors or spirit (V-12). `redirect` to a track step is the always-payable fallback (V-9); see G-6.
## 11. Crypt (`dungeon.yaml`)
```yaml
dungeons:
  - id: grey-crypt
    site: grey-stair            # entered from the set piece flow after the door choice
    layout: chain
    deck: [room.wet-steps, room.cold-niche, room.fallen-arch, room.dry-well, room.lamp-alcove]
    target_room: room.key-vault   # always last, counts toward N
    reentry: false
    outcome_by_depth: {0: [], 1: [track_add: {lamps-lit: 1}], target: [grant_item: brass-key, set_flag: key-found]}
rooms:
  - {id: room.wet-steps,   type: trap,     cost: {track: lamps-lit, step: -1}, reduce_with: [Stealth]}
  - {id: room.cold-niche,  type: story,    hunter: bryn, cost: {corruption: present-pick}, reduce_with: [Magic]}
  - {id: room.fallen-arch, type: trap,     cost: {track: lamps-lit, step: -1}}
  - {id: room.dry-well,    type: treasure, cost: {item: lamp-oil}, loot: [lamp-oil]}
  - {id: room.lamp-alcove, type: treasure, cost: {track: lamps-lit, step: -1}, loot: [lamp-oil]}
  - {id: room.key-vault,   type: story,    cost: {track: lamps-lit, step: -1}, loot: [brass-key]}
```
Short deals 1 room + target (2); Standard 3 + target; Long 5 + target (deck is 5, so Long can be dealt). Per room: reveal (`crypt.<room>`), apply held Advantages to reduce the cost, pay, fire `room-cleared`, then `deeper-vote`. Each matching held Advantage cancels one cost step and is spent (ruling 11). Clearing a room never grants an Advantage. Unpayable cost: pay what you can + one corruption, through the guard. The Stealth Advantage from "oil the hinge" cancels the one-step cost of `wet-steps` and is then gone, so a later Stealth room costs full price: that is the spent-Advantage test. `room.cold-niche` needs `crypt.cold-niche~no-bryn`.
## 12. Endings (`endings.yaml`)
```yaml
endings:
  - {id: dark, tier: loss,     check_order: 1, cond: "any corruption(*) >= 3 or track(lamps-lit) = 0", scene: end.dark,
     loss_cue: [room-cleared-fallback], summary_line: "The lamps went out on the Grey Stair."}
  - {id: lit,  tier: full-win, check_order: 2, cond: "flag(key-found)", scene: end.lit, summary_line: "The key came up the stair."}
  - {id: left, tier: loss,     check_order: 3, cond: "night_end(n1)", scene: end.dark, summary_line: "The party left the crypt without the key."}
```
`left` catches every other end, so a game always matches an ending (V-16). A retreat or a lost crypt ends in a loss; quick to test both.
## 14. Stats
```yaml
stats:
  custom: [{id: door-choice, type: event, scope: party}, {id: crypt-vote, type: event, scope: party},
           {id: crypt-depth, type: counter, scope: party}, {id: oil-spent, type: counter, scope: hunter}]
  highlight_weights: {crypt-depth: 2, door-choice: 1}
  timing: {marks: auto}
titles: [{cond: "corruption(hunter) = 0", text: "steady hand"}]
```
Engine events (presence, private delivery, choice lock, cost_applied with guard_triggered, pauses) record with no pack field. The record stores chosen length, total/active/paused time (R-LEN-5).
## F-10/F-11. Talking avatar (`cast.yaml`, `script.yaml`)
Format 2.1. Checked by V-22/V-23.
```yaml
# cast.yaml
- {id: keeper, name: "The Keeper", voice: {provider: elevenlabs, name: keeper-v1, style: "tired, kind, low"}, portrait: por.keeper,
   mouths: {rest: m.keeper.rest, mbp: m.keeper.mbp, cons_ee: m.keeper.cons_ee, eh_ae: m.keeper.eh_ae, ah: m.keeper.ah, oh_er: m.keeper.oh_er, oo_w: m.keeper.oo_w, fv: m.keeper.fv}, anchor: {x: 0.502, y: 0.6133, w: 0.3418, h: 0.25}}
# script.yaml
- id: grey-stair.03
  lines: [{id: ts-keeper-001, speaker: keeper, note: "slow", text: "Light them if you can. [pause 0.5] The key is at the bottom. It always is."},
          {id: ts-keeper-002, speaker: keeper, note: "dry, half a smile", text: "Mind the third step. It remembers everyone who ever fell on it."},
          {id: ts-keeper-003, speaker: keeper, note: "warm, slow", text: "Go on, then. I'll keep the lamp lit until you're back. I always do."}]
```
Rules: the line id is stable forever (never renumber; retire, don't reuse); speaker is a cast or hunter id; text ≤20 s spoken (est. ~2.5 words/s, so ≤45 words; this line ≈4 s + 0.5 s pause); `[pause N]` is seconds. The story log lists each played line by line id; a replay press on an iPad replays it on the Story board without changing game state. The avatar is Story board only; iPads show the caption.
## F-12. Pause overlay
Engine-owned, no pack data. Any iPad opens it; buttons Reassign (holdings change on iPads only, ruling 10), Concede (R-SES-16, ends with the `left` loss summary), End for now. Paused time is excluded from active time.
## Validation pass (V-1..V-21)
| Check | Status |
|---|---|
| V-1 schema, V-2 refs, V-3 ids, V-4 private, V-5 `~no-dell` | pass by construction; R1 loader checks these |
| V-6 variants | pass: one variant each, distinct conds |
| V-7 ≤2 speakers | pass: max 2 (`.02`) |
| V-8 cue halves, drums none | pass |
| V-9 guard fallback | pass if `redirect:track:` is accepted (G-6) |
| V-10 traits, cap | pass: Stealth, Magic only; max 1 per hunter |
| V-11 foe floor | n/a: no foe room, no `foe_mod` (G-5) |
| V-12 no warriors/spirit | pass |
| V-13 tokens | pass: one objective, no lure, no hunter token (G-5) |
| V-14 encounters | n/a: `encounters: off` (G-5) |
| V-15 lengths | pass: only the crypt changes |
| V-16 endings | pass: win + losses, catch-all |
| V-17 investigation | n/a: `investigation: off` (G-5) |
| V-18 no dead-end | pass |
| V-19 components | warning-level until open question 11 is ruled |
| V-20 determinism | pass: room deal uses seeded table `grey-crypt.deal` |
| V-22 cast/script | pass: `keeper` has 8 mouths + anchor |
| V-23 lines | pass: three unique ids (`ts-keeper-001`..`003`); `[pause 0.5]` valid in 001; est. ~6 s / ~5 s / ~6 s (2.5 words/s + pauses), all under 20 s |
| V-21 readiness | fails until private moments, `~no-` variants reach `draft`; expected for placeholders |
## Gaps and conflicts
- G-1. Resolved: format 2.1, V-22, V-23.
- G-2. Splash, wizard step order, pause overlay buttons and story-log replay have no pack fields (engine-owned). Fine, but no V-check can prove a pack "exercises" them; test via e2e, not lint.
- G-3. Resolved: `crypt.`/`end.` prefixes (V-3). The schema accepts them. R1 does not run dungeon or ending moments.
- G-4. Partly resolved: cues may set `hold_s` and the schema keeps it. R1 does not wait on it. #58 still needs measuring (3 s is a placeholder).
- G-5. Kept out to stay tiny: investigation (E17), encounters, hunter token, lure, foe room/battle, `foe_mod`, skulls. Those checks are n/a, so the pack doesn't exercise "every engine feature" yet. Add a later Long-only room or set piece if wanted.
- G-6. `guard.fallback` grammar has no track-step redirect; `redirect:<target>` is undefined. Need a ruling.
- G-7. Resolved: ruling 11, matching held Advantage cancels one step and is spent.
- G-8. Room `cost` shape and `rooms` list are not schema-defined in 11 (only described); B1 keeps `dungeons`, `choices`, `items`, `endings`, `by_length` as `z.unknown()`, so lint passes them unchecked.
- G-9. B1: `packs/test/` is only a README; plan step 3 asks for one `~no-` variant and one cue; this spec covers that. B1 schema requires `moments`, `cues`, `assets` arrays in one parsed object; split files must be merged by the loader (confirm step 3 does that). R1 doesn't run choices, crypt, endings or replay, so most features stay inert until later steps.
- G-10. `systems` and `difficulties` key names (`encounters: off`, `mods: {}`) aren't defined anywhere; guessed.
