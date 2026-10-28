# Dracula (Vellmoor): readiness review of the final scripts

> **1.0 cut (2026-10-28):** this describes the full Dracula. For 1.0, [DEC-508](../../game-design/cards/DEC-508.md) overrides it where they differ. The full version is kept in [dracula-v2](../dracula-v2/readiness-review.md).

## Re-review of the reworked scripts (D-DRA-10), 2026-10-14 10:30 ET

By-hand design review; no script was changed. Reviewed: `assets/stories/dracula/scripts/` (README, cast, props, 19 scenes incl. `n5-ending-endures` and Loremaster's late `n5-final-confrontation.06~carrier-falls` and the README "Settled points") against this file's 09:55 findings, [rulings.md](rulings.md) (D-DRA-1..10 and the Gamewright calls), [dracula-asset-map.md](dracula-asset-map.md), [story-engine.md](../../game-design/story-engine.md) and [api-surface-7.1.2.md](../../tower/api-surface-7.1.2.md). Paths are relative to `assets/stories/dracula/scripts/`; line numbers as of this review. The asset map §1b was rewritten for this pass (19 scenes, ending stills, ending selection).

### Counts

| | Count |
|---|---|
| Scenes | 19 (incl. `nx-pressed-flower` and 4 endings: saved/Rescued, endures, taken, turned) |
| Marked moments incl. variants | ~404 (116 clip, 288 still); every moment marked |
| `ipad:` targets | 134; private moments all carry `ipad:<hunter>` except the two lookalike secret cards (RR2-2) |
| `[tower:]` cues | 84, all from the README cue list; no calibrate, no colour, no looped sound, no rotation sequences 15–18 |
| `{HUNTER}` / text placeholders | 0 in lines; 1 placeholder target (`ipad:<the lookalike hunter>`, RR2-2) |
| Findings | **2 blocking, 4 major, 9 minor** |

### Checks against the rulings and mechanics calls

| Check | Result |
|---|---|
| D-DRA-10: Lenka taken before play; no mid-game snatch | **Pass** (no snatch in any scene) |
| No Lenka captive / bite track | **Pass** in scripts; `story-engine.md` E4 still uses Lenka as its ward example (RR2-6) |
| Fly-eater price = 1 corruption or a story item, never spirit; 2-corruption guard | **Partial**: corruption + guard correct, no spirit; item list wider than the ruling (RR2-5) |
| Ghost turn-away = clue + holy water | **Pass** (`nx-midnight-procession.04.private.<hunter>~turn-away`) |
| Finale loss or retreat = Taken | **Pass** (`n5-final-confrontation.md:54`, `n5-ending-taken` + `~retreat`) |
| Endures = Lenka freed without `sergiu-blade`, lost when its carrier falls | **Partial**: beat exists but its ID replaces the freeing moment (RR2-1); routing wording (RR2-3) |
| Endings Rescued / Endures / Taken / Turned | **Pass** in content; file is still named `n5-ending-saved` (RR2-12) |
| Skull story drops ≤ 2 per night; <6 in supply → +1 foe | **Pass** (procession .01, finale .04, README) |
| Lookalike max 1, unmasked by holy water or Sanctuary rest | **Pass** (catacombs header and Outcome) |
| Tower cues limited to documented capabilities | **Pass** (cue names map to `allLights*`, `setLED` effects, sequence 14, `breakSeal`, `rotateWithState`, skull sensor) |
| Prop tags `sergiu-blade`, `pressed-flower`, `ludmila-tome` consistent with props.md | **Pass** at scene level (props.md "Appears in" matches); two moment-level gaps (RR2-7, RR2-8) |
| Private lines target `ipad:<hunter>` | **Fail** for the two secret cards (RR2-2); all others pass |
| Pressed-flower dusk clue every night (1–4) | **Pass** (`.01~night1..4`, `.02.private.<hunter>~night1..4`, all four hunters each night) |

### Prior findings (09:55)

| ID | Status |
|---|---|
| RR-1 calibrate in scene | Fixed (`n1-lantern-and-bell.md:14` is `dim-all` + `heartbeat`) |
| RR-2 procession wildcard IDs | Fixed (`.04.private.<hunter>`, `~answer`, `~turn-away`, `-watched`) |
| RR-3 variant IDs / placeholder speakers | Fixed (all variants carry `~variant` IDs; `{HUNTER}` gone). New placeholder target in RR2-2 |
| RR-4 mid-game snatch | Superseded by D-DRA-10; no snatch remains |
| RR-5 time-clock wording | Fixed (`n1-burgomasters-house.md:61` "counts as one visit toward dusk"; `n1-fortune-reading.md:106`) |
| RR-6 lookalike inline / unnamed card | Fixed (split `~lookalike`, named `secret-card.decoy-crypt` / `.lose-consumable`); targeting still open (RR2-2) |
| RR-7 undocumented tower wording | Fixed (README cue names, "A then B" app-timed) |
| RR-8 screen fallbacks | Illusionist; not re-checked here |
| RR-9 speakerless private lines | Fixed ("Narrator (private)") |
| RR-10 placeholder list | Fixed (no placeholders left; README:11) |
| RR-11 lost/retreated finale | Fixed (→ Taken) |
| RR-12 permanent lookalike | Fixed (max 1, unmask by holy water / Sanctuary) |
| RR-13 fly-eater price undefined | Fixed, with a scope gap (RR2-5) |
| RR-14 skull budget | Fixed (cap 2/night, <6 → +1 foe) |
| RR-15 to RR-23 | Fixed (greyed-out churchyard; "Night 3 begins"; pressed-flower music, turned sfx; label → cast id rule; sparrow price removed; absent-hunter variants named per moment; ambiguous objectives; calibrated-only glyph; drum spacing from state reply) |
| RR-24 render list | Illusionist; not re-checked here |
| FUN-1 to FUN-5 | Addressed (gate costs a visit vs. attention; turn-away pays; 3 box clips + last; per-night flower; turned has no empty vote) |

### Blocking

| ID | File:line | Finding | Fix | Owner |
|---|---|---|---|---|
| RR2-1 | n5-final-confrontation.md:75 | `.06~carrier-falls` uses the variant form, and README:11 says a `~variant` **replaces** the base moment of the same number. `.06` is "Lenka freed" (her refusal). When the carrier falls, the freeing beat would not play, yet Endures requires Lenka freed. It is also an in-battle event ("plays once, when it happens"), not a substitution | Give it its own moment number or an event ID (e.g. `n5-final-confrontation.04a` or `.event.carrier-falls`) that plays **before** `.06`; Gamewright confirms the event-ID form in asset-organization | Loremaster (Gamewright: ID form) |
| RR2-2 | n23-catacombs-of-saint-ysolde.md:60 (and :57) | `secret-card.lose-consumable` has no target, so by the README default it plays on the **dashboard** and reveals the lookalike's secret goal to the table. `secret-card.decoy-crypt` targets the placeholder `ipad:<the lookalike hunter>`. Both are only described as "rendered once per hunter" | Write 8 concrete moments `…secret-card.<goal>.private.<hunter>` each tagged `ipad:<hunter>`; remove the placeholder | Loremaster |

### Major

| ID | File:line | Finding | Fix | Owner |
|---|---|---|---|---|
| RR2-3 | n5-final-confrontation.md:53 | Endures routing reads "Battle won **or survived** but the sword is missing". "Survived" is undefined, and rulings say a lost or retreated battle is Taken. Precedence when the carrier falls and the battle is then lost isn't stated | "Lenka freed (battle won) and `sergiu-blade` lost → Endures; battle lost or retreat → Taken, whether or not the blade fell" | Gamewright (rule), Loremaster (line) |
| RR2-4 | n5-final-confrontation.md:65 | `.04~guard` replaces `.04` (battle begins, the Count's line) for a mid-battle redirected strike, the same ID problem as RR2-1. With no captive track, "the brides close in on her instead" has no defined effect | Make it an event moment; Gamewright states the redirected strike's effect (none, or a finale-ledger +1 foe) | Gamewright, Loremaster |
| RR2-5 | n3-fly-eaters-cell.md:58 | Story-item price is "for example a vial of holy water or one kit item". The ruling lists holy water, the host, or a stake. "Any kit item" lets the party pay with a lantern or rope | "Give up one: holy water, the host, or a stake" | Loremaster |
| RR2-6 | research/game-design/story-engine.md:75, 35–37 (repo root) | Engine examples contradict the pack: E4 "Protected NPC: Lenka, ward 0–3, starts 1" (no captive track now); R-ENG-31 "Win the night-5 assault" has no outcome tiers; R-ENG-32/33 still say "Red/purple" / colour (carried over from the 09:55 out-of-scope note) | Change the E4 example to a non-Dracula one or "none"; R-ENG-31 lists Rescued/Endures/Taken/Turned; drop colour | Gamewright |

### Minor

| ID | File:line | Finding | Fix | Owner |
|---|---|---|---|---|
| RR2-7 | n1-fortune-reading.md:125 | `.09~no-agnes` mentions "this flower" but is tagged only `ludmila-tome`; the base `.09` has both | Add `[prop: pressed-flower]` | Loremaster |
| RR2-8 | n4-finding-the-tome.md:10 vs :63, :71 | Header says `ludmila-tome` is tagged on every moment; `.10` and `.11` aren't | Tag them, or drop "every moment" from the header | Loremaster |
| RR2-9 | n5-ending-endures.md:10 | Still carries the open point that rulings define Endures as a lost battle. That's settled (README "Settled points" 2–3; rulings) | Delete the open-point sentence | Loremaster |
| RR2-10 | nx-pressed-flower.md:15–17 | Night 1's violet is "on the burgomaster's step", minutes after `n1-burgomasters-house.08` found one on the sill, and the scene header says the flower turns up "where the hunters are" | Place night 1's find at the churchyard gate, or say the sill violet is the night-1 clue | Loremaster |
| RR2-11 | n1-fortune-reading.md:109–116 | `~turned-away` lines ("you would not hear it. I will not repeat it.") read as a penalty, but turning away now pays a clue + holy water | Soften: "You chose the living's road. The dead will forgive you." | Loremaster |
| RR2-12 | README.md:46; n5-ending-saved.md | Rulings name the full win **Rescued**; the file and ID are `n5-ending-saved` | Rename to `n5-ending-rescued`, or record saved = Rescued in the README and the stats outcome key | Loremaster, Gamewright |
| RR2-13 | n23-sergius-blade.md:74–84 | Four identical dashboard lines `.08~guard-<hunter>` hang on a number that has only private moments; by the replace rule it is unclear what they replace | One `.08~guard` dashboard moment with the condition "any hunter at 2" | Loremaster |
| RR2-14 | n1-open-grave.md:23, :74, :78 | "Take her the girl's hand" reads as if Lenka is present; after D-DRA-10 Vadoma reads her violet | "Take her something of the girl's" | Loremaster |
| RR2-15 | n5-ending-turned.md:16 | "The third bite" when D-DRA-5 counts every corruption, not only bites | "The third wound…" or "The third corruption…" | Loremaster |

### By owner
- **Loremaster:** RR2-1, RR2-2 (blocking), RR2-3 (line), RR2-4 (line), RR2-5, RR2-7 to RR2-15.
- **Gamewright:** RR2-1 (event ID form), RR2-3, RR2-4, RR2-6, RR2-12.
- **Illusionist:** RR-8, RR-24 still open (not re-checked); render the four ending stills listed in the asset map §1b.

---

## Earlier review (2026-10-14 09:55 ET)

Status: by-hand design review, 2026-10-14 09:55 ET. Nothing was changed in the scripts. Reviewed: `assets/stories/dracula/scripts/` (README, cast, 18 scenes) against [requirements.md](../../game-design/requirements.md) (R-DEV-6/7, R-AV, R-ASSET), [asset-organization.md](../../game-design/asset-organization.md) (R-AST-ORG), [setup-wizard-and-summary.md](../../game-design/setup-wizard-and-summary.md) (R-WIZ), and the Resolutions in [dracula-asset-map.md](dracula-asset-map.md). File paths below are relative to `assets/stories/dracula/scripts/`. Line numbers are as of this review.

## Counts

| | Count |
|---|---|
| Scenes | 18 (incl. `nx-pressed-flower` and 3 endings) |
| Moments | 181, all marked still or clip (55 clip, 126 still) |
| Private moments | 62. All 14 scenes that have them cover all four hunters; 2 use wildcard IDs (RR-2) |
| Private moments targeted at the dashboard | 0 |
| `[tower:]` tags | 38: 22 map to Verified/Library capabilities as written, 11 use wording that needs translating to a documented effect, 1 is a manual-only action (calibrate), 4 need a capability that isn't documented (fade, brightness, variable-rate breathe) |
| Scenes with no `[music:]` | 1 (`nx-pressed-flower`) |
| Scenes with no `[sfx:]` | 1 (`n5-ending-turned`) |
| Exchanges with more than 2 speakers | 0 as written; 1 risk in a variant (RR-20) |
| Findings | **4 blocking, 10 major, 10 minor**, plus 6 fun notes |

## Check results

| Check | Result |
|---|---|
| Every cue has `dashboard` or `ipad:<hunter>`; no private line on the dashboard | **Pass** with one exception: wildcard targets in the procession (RR-2) |
| Every private moment has a line for all four hunters | **Pass** (all 14 scenes) |
| Every moment marked still or clip | **Pass** (181/181) |
| `[sfx]` / `[music]` present | **Pass at scene level**, with two gaps (RR-17) |
| Every referenced asset ID can exist under the layout | **Fail**: wildcard IDs, variant lines with no IDs, placeholder speakers, an unnamed secret card (RR-2, RR-3, RR-6) |
| At most two speakers per exchange | **Pass** (RR-20 is a risk only) |
| Tower cues documented with fallbacks | **Partial**: calibration in a scene (RR-1); undocumented effects (RR-7). Fallbacks are listed in the asset map §1b, not in the scripts (RR-8) |
| Consistency with Bob's rulings and the Resolutions | **Partial**: no building-fall loss (pass); the targeting guard is scripted (pass); a ticking clock is implied (RR-5); Lenka is snatched mid-game but play goes on (RR-4); no ending for a lost battle (RR-11) |

## Findings

### Blocking (must fix before the readiness check can pass)

| ID | File:line | Finding | Fix | Owner |
|---|---|---|---|---|
| RR-1 | n1-lantern-and-bell.md:14 | `[tower: calibrate, shown as "the castle stirs"]` is a scene cue. Calibration is manual and belongs to the setup wizard (R-WIZ-9d). Bob's auto-cue override does not cover it, and commands sent during calibration are silently dropped (api §2) | Remove it from the scene. Open with `[tower: dim all; slow breathe]`. The wizard's "castle stirs" image already covers the 22 s calibration | Loremaster |
| RR-2 | nx-midnight-procession.md:40, 46 | IDs `nx-midnight-procession.04.private.<spotlighted>` and `.04.private.<others>` cannot exist in `rendered/index.json`. R-AST-ORG-4 needs the hunter in the ID | Write 8 concrete moments: `.04.private.<hunter>` (choice, spotlit) and `.04.private.<hunter>.other` for each of the 4 hunters, or `.04.spot.<hunter>` / `.04.other.<hunter>` | Loremaster; Gamewright confirms the ID form |
| RR-3 | all scenes, "Variants" sections; nx-pressed-flower.md:19 | Variant lines (e.g. n1-open-grave.md:52–54, n5-final-confrontation.md:60–61) and placeholder speakers (`{HUNTER}: {HUNTER_LINE}`) have no asset ID. They need their own voice renders, so the readiness check (R-AST-ORG-8) has nothing to check against | Gamewright adds a variant ID form to the layout, e.g. `scene.moment~variant` (`nx-pressed-flower.02~wren`, `n5-final-confrontation.06~bite2`). Loremaster tags each variant line with it | Gamewright (layout), Loremaster |
| RR-4 | n4-finding-the-tome.md:70; n5-drawbridge.md:61; n5-portrait-gallery.md:55; n5-ending-taken.md:36 | "Lenka taken" variants keep play going after she has been snatched, up to night 5. The rulings and the map list "the woman is taken" as a loss. The scripts make it a deferred loss (taken ending on night 5) | Bob decides: (a) a snatch is an immediate loss, so cut these variants; or (b) a successful snatch is deferred to night 5 and may be undone by a rescue (more fun, but it changes the loss rule). Recommendation: (b), with the taken ending only if the rescue fails | Bob, then Loremaster |

### Major

| ID | File:line | Finding | Fix | Owner |
|---|---|---|---|---|
| RR-5 | n1-burgomasters-house.md:66; n1-fortune-reading.md:63 | "The clock advances one step" and "Five nights, if you are lucky. Four, if you are not" imply a time clock. The clock is beats, with dusk after N visits or on finding the site | "Stay and guard" counts as one visit toward dusk. Vadoma: "Five nights. No more will be given." | Loremaster |
| RR-6 | n23-catacombs-of-saint-ysolde.md:26–35 | The lookalike text sits inline inside each hunter's private line, and "the card below" has no ID. The secret goal (Resolutions: waste a visit at a decoy crypt, or lose a consumable) isn't named | Split each line into `.04.private.<hunter>` and `.04.private.<hunter>~lookalike`; add `n23-catacombs-of-saint-ysolde.secret-card.<goal>` | Loremaster |
| RR-7 | n1-burgomasters-house.md:38; n3-fly-eaters-cell.md:44; n4-earth-boxes.md:22; n23-catacombs-of-saint-ysolde.md:47; n5-ending-saved.md:14; n5-ending-taken.md:14; n5-ending-turned.md:14; nx-midnight-procession.md:50 | Tower wording asks for effects that aren't documented: "quickens", "almost nothing", "falters", "sharp", "slow fade up", "slows and stops", "two hearts out of step", "dim". The library has 6 fixed effects and no brightness or rate control (api §9–10) | Use named cues from `shared/tower/cues.json` (e.g. `heartbeat` = breathe, `heartbeat-fast` = breatheFast, `low` = one LED on). The asset map §1b gives a translation per tag. Fade and rate changes are app-timed sequences of fixed effects | Illusionist (cue names), Loremaster (swap the wording) |
| RR-8 | all scenes | Scripts don't state a screen fallback per tower cue (R-ENG-12, REQ-AST-002) | Keep the fallbacks in the cue library rather than in the scripts. The asset map §1b lists one per scene; Illusionist renders them as library moments | Illusionist |
| RR-9 | n4-finding-the-tome.md:50, 53, 56; n5-portrait-gallery.md:39–48; n5-ending-saved.md:34–40; n5-ending-taken.md:26–32; n5-ending-turned.md:30–36 | Private lines with no speaker. TTS can't pick a voice: narrator? the hunter's thought? text only? | Add a speaker, e.g. `**Narrator (private):**` or `**<Hunter> (thought):**`, as the other scenes do | Loremaster |
| RR-10 | README.md:36 vs. scenes | The placeholder list misses `{HUNTER}`, `{HUNTER_LINE}`, `{N}` (n4-earth-boxes.md:55), `{BLADE_OPEN}`, `{SYMBOL_OPEN}`, `{TOME_OPEN}` and the `{X_CLUE}` forms | Complete the list; give each a fill table | Loremaster |
| RR-11 | n5-final-confrontation.md:54–57 | No ending for a **lost or retreated** adversary battle with Lenka present (RtDT lets you retreat). Bite ≤2 and a lost battle matches no branch | Add the rule: retreat = another attempt costs a skull or a corruption-safe penalty; a final defeat = `n5-ending-taken` (he takes her) | Gamewright (rule), Loremaster (line) |
| RR-12 | n23-catacombs-of-saint-ysolde.md:62 | Objective 2 keeps the lookalike for the rest of the game: a permanent hidden traitor in a co-op game. That goes past the Resolutions' "small secret goal" and leaves one player with a second, unexplained role | Cap it: the lookalike stays until the next procession, where the spotlight unmasks it. Or the real hunter is "lost" until night 5 and that player plays the lookalike openly | Gamewright, Loremaster |
| RR-13 | n3-fly-eaters-cell.md:63 | Price 2 "cost per mechanics" is undefined. If the cost is a corruption, the 2-corruption guard (line 71) is right. If it's anything else, say so | Define it: price 2 = 1 corruption (guarded), and Jakob's line names the hunter the Count likes best (a real hint) | Gamewright |
| RR-14 | n5-final-confrontation.md:25–26; nx-midnight-procession.md:14 | Story skull drops have no budget: one every midnight, plus the snatch and dusk drops, plus "per summon" in the finale. The 24-skull supply running out is a base-game loss | Set a cap per night (proposed 2 story drops) and a fixed finale count (proposed 3), plus one per escalation-ledger entry | Gamewright |

### Minor

| ID | File:line | Finding | Fix |
|---|---|---|---|
| RR-15 | n1-lantern-and-bell.md:71 | Churchyard vote before dusk is "returned": a wasted vote | Grey the option out with "after dusk" instead of returning the vote |
| RR-16 | n2-burgomasters-funeral.md:59 | "Dusk of night 3 opens…" Each night begins at B1 (day), not dusk | "Night 3 begins in the other fortune kingdom" |
| RR-17 | nx-pressed-flower.md (no music); n5-ending-turned.md (no sfx) | R-AV-6 cue coverage | Pressed flower: `[music: solo violin, two notes]`. Turned: `[sfx: window latch, wings]` |
| RR-18 | README.md:3 vs. scenes | Speaker labels ("The Count", "Agnes (thought)", "Vadoma (whisper)") don't map 1:1 to cast ids (`count`, `agnes`, `vadoma`) | State the rule: label → cast id, with the parenthetical as a style direction |
| RR-19 | n3-fly-eaters-cell.md:62 | Price 1 needs Wren to catch the sparrow; there is no Wren-absent variant | "Tomas catches it" fallback |
| RR-20 | n5-ending-saved.md:44 | "Absent hunters' lines go to the next present hunter" can give Tomas both lines of moment 05 (a self-reply), and can break the two-speaker shape | Name the replacement per moment |
| RR-21 | n1-fortune-reading.md:62, 69 | The objective is said aloud on the Dashboard; objective 2 ("He wants one of *you*") gives away the lookalike two nights early | Fine if intended. Otherwise make the objective line deliberately ambiguous |
| RR-22 | n1-open-grave.md:31 | "Battle glyph toward the party" needs a calibrated tower and a known glyph layout (T-GLY Library) | Mark as calibrated-only; the fallback icon is in asset map §1b |
| RR-23 | n23-catacombs-of-saint-ysolde.md:14; n5-final-confrontation.md:26 | "400 ms apart" between drum moves: a move takes ~1.1 s, so the gap must start when the move ends | Cue runner rule: spacing counts from the rotate's state reply |
| RR-24 | all clip moments; R-DEV-7 | All 55 clips need an `@dashboard` render; the 4 procession private clips (`.03.private.*`) also need `@ipad` crops. The other private moments are stills and need `@ipad` stills | Illusionist render list |

## Fun notes

| ID | File:line | Issue | Suggestion |
|---|---|---|---|
| FUN-1 | n5-drawbridge.md:52–54 | The gate is strictly better than the drawbridge (no ambush vs. a castle draw): no real choice | The drawbridge gives something too: walking in "as guests" lets the party skip the gallery's hostile portrait, or start the boss battle with one card improved. The gate costs Marta (she can't leave if he notices) |
| FUN-2 | nx-midnight-procession.md:41–44 | Turning away gives nothing, so no one will choose it | Turning away keeps the hunter's secret: +1 Advantage in the finale for that hunter, or no skull drop that night |
| FUN-3 | n4-earth-boxes.md:21 | The same clip plays for every burned box | 3 alternating clips plus a final-box clip; a running "boxes left" count on the Dashboard |
| FUN-4 | nx-pressed-flower.md | A strong, tender beat. It plays 2–3 times with the same three moments | Add one variant line per night (2, 3, 4) so it builds |
| FUN-5 | n5-ending-turned.md:39–40 | Both choices are losses; the vote feels empty | Fine as a tragic coda, but show the summary's "how it was decided" first so players know the vote is story only |
| FUN-6 | Scenes overall | Strong private-tie payoffs across every scene (Marta, Ilka's bolt, Gerhardt's cipher, Agnes's prayer); the targeting guard is visible in three scenes. No dead turns inside scripted scenes | Keep |

## What must be fixed, by owner

- **Loremaster:** RR-1 (remove calibrate), RR-2 (concrete procession IDs), RR-3 (tag variants once the form exists), RR-5, RR-6, RR-7 (swap tower wording for cue names), RR-9, RR-10, RR-17, RR-19, RR-20, and FUN-1/2 once Gamewright agrees.
- **Illusionist:** RR-7 (cue names in `shared/tower/cues.json`), RR-8 (fallback library moments), RR-18 (speaker → voice map), RR-24 (render list: 55 clips @dashboard, 4 private clips @ipad, private stills @ipad).
- **Gamewright:** RR-3 (variant ID form in asset-organization.md), RR-11, RR-12, RR-13, RR-14.
- **Bob:** RR-4 (is a snatch an instant loss or a deferred one?).
- **Out of scope here:** [../../game-design/story-engine.md](../../game-design/story-engine.md) rows R-ENG-32/33 still say "Red/purple" and "Night falls = red wash", which contradicts the Resolutions. Flagged, not changed.
