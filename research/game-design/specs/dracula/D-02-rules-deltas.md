# Dracula D-02: the rules deltas

**Status:** decided by Gamewright, 2026-11-10, under Bob's standing rule that design rulings are Gamewright's (relayed by Warden, 2026-11-10). To be checked in the Dracula playtests. Design only, no code. It stacks on [D-01](D-01-arc-and-chapters.md).
**Built on** D-01's closed rulings (DEC-866 to DEC-868, DEC-854, DEC-863): four chapters (Bob), Short and Standard only, with Long and its content deferred; a traitor at Standard only; The Houses Fall as its own scene; draft lines now.
**Cards:** DEC-848 to DEC-859, plus DEC-860 to DEC-865 for G-1 to G-6 (G-7 to G-9 are recorded on DEC-858, DEC-864 and DEC-856), all decided by Gamewright under the standing rule. Q-424 to Q-431 are `answered`. DEC-778, DEC-780, IDEA-094, IDEA-095 and IDEA-097 are edited in place and decided.

## Gamewright rulings G-1 to G-6 (decided, DEC-860 to DEC-865)

- **G-1. Strikes never touch a quest object's presence.** The Count's strikes take hit points, gold, buildings (skulls), a bite or a companion's loyalty. They never take, drop or destroy the blade, the Lantern or the Tome. So the hunters always reach chapter 4 holding all three objects, and DEC-749's gate can always open (DEC-062). Bob's "destroy the blade" strike (DEC-748, DEC-750) cuts only the blade's bonus, down to a floor, and the blade stays in hand. Ruling 8 keeps it: a bonus cut, down to +1.
- **G-2. Chapter cards have no length variants.** The name and goal lines hold at every length, so they never name a quest that Short skips. The only variant axes in the whole pack are `~<goal>` and `~<lair>`, plus the one ending variant `~freed` (G-5, DEC-856).
- **G-3. Chapter-card VO is 10 s at most** (the name plus the goal, read in the Charon voice). Loremaster times it, and the A1 job flags a longer line.
- **G-4. Ending ids.** Endings are `finale-win.<ending>.<NN>~vo-NN` and `finale-loss.<ending>.<NN>~vo-NN`, after The Ruined Keep's `finale-win.shattered~vo-01`.
  - The wins are `rescued` and `lenka-lost`. The losses are `turned`, `valley-falls` and `houses-fall`.
  - `turned` was left off the ending list I was given, and I kept it, since D-01's Turned loss (DEC-746, IDEA-076) needs a scene. `houses-fall` is its own scene (ruling 4).
  - The losses take no `n5-` prefix, because they can fire in any chapter. D-01 is amended to match.
- **G-5. `lenka.saved_by`,** recorded at the end of the game. It is `party` (she is with the party when he falls) or `lantern` (she was taken and the Lantern freed her in the lair, DEC-750). It is unset in `lenka-lost`.
  - It selects the `~freed` variant of `finale-win.rescued`, for example `finale-win.rescued.02~freed.vo-01`.
  - The id I was given has two `~` (`…02~freed~vo-01`). `assetIdSchema` allows one, so the form here follows DEC-856.
  - The stats screen may show `saved_by` as a key moment (Q-C3-18's list gains "Lenka freed").
- **G-7. Strikes fire only in chapters 2 and 3.** None in chapter 1 (he is not on the board until The Reading ends, DEC-859) and none in the Castle (he waits in the Tower, DEC-738).
- **G-8. When `lenka.saved_by` is set.** It is set when Lenka is freed by the Lantern (`lantern`) or rejoins the party (`party`), before any finale line is picked. An ending never computes it.
- **G-9. Guard and Lantern lines are event moments, not state variants.** `count-strike.guarded~vo-NN` plays once when the guard turns a strike aside. It is one shared line for both the two-bite guard and the blade at its +1 floor. `count-strike.lantern~vo-NN` plays when the Lantern stops the goal's strike. Neither uses a `~` state variant (G-2).
- **Copy:** the strike choice labels (Fight, Ward, Endure) and the disabled Ward's reason line are Loremaster's copy. D-04 references them, and the labels in this file are working labels.
- **G-6. Endings are narrator-led.** The narrator (Charon) carries each ending, with at most one companion line in it, and that line is skipped if the companion is absent (§10).
- **Lenka stays hidden in the art until her reveal** in `n4-finding-the-tome` (Bob's Oct 16 lock; a possible change is pending with Bob). Before the reveal every picture shows her veiled, turned away or in shadow (`portrait.lenka~veiled`). From the Tome on she shows her face (`portrait.lenka`). This is also part of Q-428's answer.

## Decisions

| Card | Settles | Decision (one line) |
|---|---|---|
| DEC-848 | Q-424 | Four engine effects are added: loyalty a step, a skull on a building, weaken a story item, and a hero vanishes. "Foe strikes first" becomes a flag on the battle effect. Every other Dracula ask is reworded onto the menu, and hooks still never ask a choice (DEC-286) |
| DEC-849 | Q-425 | A story declares named seeded values (`count-goal`, `lair`, `blade-site`, `lantern-site`, `tome-site`, `parishes`), drawn at Begin and revealed at a named moment. A quest marker may be placed from one |
| DEC-850 | Q-426 | The adversary's target and landed strike are slots the story fills, one pair per goal. The DEC-775 pair is the default, and every corruption still passes the guard (MEC-013, DEC-565) |
| DEC-778 (edited) | the strike clash | Accept the skirmish slot: up to 3 rounds; winning one sends him off for the day. A lost skirmish lands the goal's strike (DEC-850), not DEC-775's |
| DEC-858 | IDEA-126, the `enc-*` encounters | A strike is a short plain scene with Fight (skirmish), Ward (holy water or the host) or Endure. Its opening comes from the goal's `enc-*` source |
| DEC-859 | DEC-791 for Dracula | The Count enters the board at the end of The Reading, the moment his goal is set. Before that he is only a voice (The Long Night) |
| DEC-851 | Q-427 | DEC-566's shape is kept. Fixed rooms by position. The Count stays in the lair at the top, and at the Swap he only speaks through the wight. The Heart of Sorrow is the tower level's second room. A solo Swap takes the companion, or the wight wears the hero's own face |
| DEC-780 (edited) | the castle clash | Fixed rooms, yes. No stance and no choice in a hook. The rooms that need a choice are traps with DEC-489's two-loss choice |
| IDEA-094, IDEA-095, IDEA-097 (edited) | the on-guard clash | The Portrait and the Lift are traps with a two-loss choice. The Flooded Room is a fixed guard whose foe strikes first |
| DEC-852 | Q-428 | Every way of losing Lenka leads to "taken": she never falls, walks off or turns. Her hero's fall passes her to another present hero, or she is taken. Veiled art until the Tome |
| DEC-853 | Q-429 | The blade starts at +3, and each landed blade strike takes 1, down to a floor of +1. It is never destroyed. A fallen carrier keeps every story item. The gate counts the objects held by the present group |
| DEC-854 | Q-430 | Traitor at Standard only, tied to chapter 3. The suspects are Jakob, Andrei and Marta, Marta is met in chapter 3, and each has a written trick |
| DEC-855 | Q-431 | The ten defaults stay as tavern hires, without Tomas the Scout (ruling 10). The five story companions are asked at their buildings for 0 gold and 1 move. Each has one moment that raises loyalty and one that lowers it |
| DEC-856 | the line-id form | `<scene>.<NN>~vo-NN` for a base line and `<scene>.<NN>~<value>.vo-NN` for a goal or lair line. One `~` per id (DEC-622, `assetIdSchema`) |
| DEC-856 (also) | the endings | `finale-win.<ending>` / `finale-loss.<ending>`, with `~freed` chosen by `lenka.saved_by` (G-4 to G-6) |
| DEC-857 | IDEA-091's "his notice" | The bridge is fast. It costs 1 skull on the most-skulled building, and the Banquet's statues strike first. The little gate needs Marta and costs 1 extra move. No track is added |

## 1. The effect menu (DEC-848, Q-424)

DEC-642's option list and DEC-286's hook menu gain four engine effects. A story names one and the engine draws its board node and Done prompt (DEC-278). None of them branches or asks a choice.

| Dracula ask | Result | Effect | Where it may be used |
|---|---|---|---|
| Move loyalty | **New** | `loyalty: ±1` on a named companion. It is DEC-721's "a story moment moves it a step" made into an effect | Options and hooks |
| A skull on a named building | **New** | `skull: 1 on <building>`. The building is named, seeded, or "most-skulled", the same target the adversary's arrival uses (DEC-775) | Options, hooks and strikes |
| An extra drop at the chapter's end (Darkness) | Reworded | The `skull` effect on the most-skulled building in the chapter-end hook. It places a physical skull, so it needs no tower (tower optional) | Chapter-end hook |
| Weaken an item | **New** | `weaken: <story item>` lowers its named bonus one step, never below its floor (DEC-853) | Strikes only |
| A hero vanishes, cards on the floor | **New** | `vanish: <hero>`. The hero sits out until the room's battle ends, with their held cards set aside. On a win they return with half their hit points, rounded up, and take their cards back. Tower rooms only (DEC-751) | Room start hook |
| Take a companion | Reworded | The engine's walk-out (DEC-722), redirected by DEC-852 to the story flag `lenka-taken`. Freeing her is the companion-join quest reward (DEC-065) in the lair's end hook, when the flag is set and the Lantern is present | Strikes; lair hook |
| The foe strikes first | Reworded | A `foe-first` flag on the battle effect, the same free strike as the Tomb's on-guard (DEC-492) | Options and fixed rooms |
| A choice in a hook (DEC-780) | Dropped | Hooks stay choice-free (DEC-286). Rooms that need a choice are traps with DEC-489's two-loss choice (§5) | — |

## 2. Seeded values (DEC-849, Q-425)

DEC-735 gave the traitor alone a seeded pick. DEC-849 makes that a general story slot. The pack lists each value with its options, and the seed draws every value at Begin, so a restore gives the same game, as with "tuning is fixed at Begin" (C3 B2). Each value has a reveal moment. Until it comes, nothing on the board or the iPad shows the value.

| Value | Options | Revealed by |
|---|---|---|
| `parishes` | Which printed kingdom (DEC-226) plays K1 to K4 | Setup, so players know where K1 is (IDEA-142) |
| `count-goal` | `replace-a-hero`, `win-lenka`, `destroy-the-blade`, `darkness` (DEC-742) | A cryptic line at `n1-fortune-reading` (`~<goal>`), then named at `n4-finding-the-tome` (DEC-747) |
| `blade-site`, `lantern-site` | A building in kingdom A or B (IDEA-084) | `n1-fortune-reading` |
| `tome-site` | A building in K4 | `n1-fortune-reading` |
| `lair` | `family-crypt`, `ludmilas-chapel`, `the-height`, `his-study` (IDEA-099) | A hint at the reading, then shown when the lair is entered |
| `traitor` | Jakob, Andrei, Marta (DEC-854), Standard only | Unmasked, or sprung at chapter 3's end (DEC-736) |

**Markers.** MEC-055's fixed markers gain a second form, "placed from a seeded value". At the reveal, the board names the site and the players set the physical marker, with a Done prompt (DEC-278). Nothing is drawn as a map (D-01 locked constraints). D-01's collision rule applies.

## 3. The Count: target, strike and flow (DEC-850, DEC-778, DEC-858, DEC-859)

**Start (DEC-859).** This uses DEC-791's start setting. The Count's piece enters at the Tower at the end of `n1-fortune-reading` and moves at that day's close. In The Ruined Keep the Warden enters at the end of The Barrow. During chapter 1 he is only a voice: the Long Night's door (IDEA-082) is a quest, not a strike. This replaces D-01's "first day's close".

**Movement.** DEC-825 and DEC-775 apply: 1 space a day toward his target. When he reaches a building, he places 1 skull and picks his next target. In chapter 4 he waits in the Tower (DEC-738). The strike comes once a day at most, when his move reaches a group or a group enters his space (DEC-775).

**Target and landed strike by goal (DEC-850, DEC-748):**

| Goal | He hunts | Landed strike, on each present hero unless noted | Guard (MEC-013, DEC-565) |
|---|---|---|---|
| Replace a hero | The present hero with the most bites | That hero takes 1 bite | A hero at 2 bites takes 3 + the chapter number in hit points instead, never below 1 |
| Win Lenka | Lenka's hero | Lenka's loyalty drops a step. At wavering, the next landed strike takes her (DEC-852) | Her hero takes DEC-775's hit-point loss |
| Destroy the blade | The blade's site until it is found, then its carrier | `weaken: blade`, one step (DEC-853, G-1) | At the floor, the carrier takes the hit-point loss instead |
| Darkness | The most-skulled building | 1 skull on the nearest standing building | None needed: skulls never lose the game in one step except as the clock (DEC-686) |
| (default, DEC-775) | The most-skulled building | Each hero picks a bite or 3 + the chapter number in hit points | As DEC-775 |

**Softening (DEC-750, DEC-782).**
- With the Lantern present, the goal's strike does not land. Each present hero takes the default hit-point loss less 2.
- With Lenka present, her hero takes 2 fewer hit points from any strike.
- The two stack, to a minimum loss of 1.

**Flow (DEC-858).** Strikes fire only in chapters 2 and 3 (G-7). A strike is a short plain scene (MEC-077, DEC-642, DEC-692) that the engine starts. It is one picture with 2 or 3 options, and the present heroes pick together on the iPads:

1. **Fight:** a skirmish (DEC-778), up to 3 rounds of the normal battle. If they win a round, he withdraws (`count-withdraws`): his piece goes back to the Tower and walks out again from there at the next day's close (DEC-775's start). His wounds don't carry over (DEC-361). If no round is won, or the group retreats, the strike lands.
2. **Ward:** spend one holy water or the host (IDEA-137, IDEA-138). He withdraws as if beaten. The option is disabled, with a one-line reason, when neither item is held (C3 iPad rule).
3. **Endure:** the strike lands at once, with no battle.

**The `enc-*` encounters as source.** The hunter token is gone (DEC-310), so the old encounters become the openings and costs of his strikes. Their opening lines become the strike scene's narration, two openings per goal, played in turn so a game rarely hears one twice. Their costs map onto the Ward and Endure options. Loremaster keeps the `enc-*` ids it reuses, so the old id becomes the scene id with a `~<goal>` line where it serves more than one goal.

| Goal | Strike openings from | Kept from the old cost |
|---|---|---|
| Replace a hero | `enc-wrong-face`, `enc-mist-remembers` | "Face it": a bite. Becomes Endure |
| Win Lenka | `enc-the-window`, `enc-wine-for-no-one` | "Watch": a bite. Now Lenka's loyalty |
| Destroy the blade | `enc-brothers`, `enc-third-hums` | "Listen / stop your ears": Ward with holy water |
| Darkness | `enc-road-returns`, `enc-wedding-uphill` | "Leave it": a skull. Now a skull on a building |
| Any goal | `enc-at-the-door` | "Ward the door": holy water or the host. This becomes the Ward option's line in every strike scene |
| Not a strike | `enc-ledger-page` becomes a traitor clue event (DEC-854). `enc-early-lantern` folds into `nx-midnight-procession` | — |

The old encounter rules go. These are: one encounter per round on top of the normal event, the story-skull cap of 2 a night, "+1 foe on night 5" (against DEC-361), and private choices (DEC-057). The trims PR #38's soft-cost rule lives on as the guard column above.

## 4. Lenka (DEC-852, Q-428)

- **Joins** at `n1-burgomasters-house` as a quest reward (DEC-065). The group picks her hero on the iPads (one button per present hero). She starts steady (DEC-774), and a hero holds one companion (DEC-072).
- **Loss routes.** She never falls in a battle, walks out or turns into a foe. Each of those (DEC-071, DEC-722), and the win-Lenka strike at wavering, sets `lenka-taken` and carries her to the castle (DEC-746). She is an app-only companion (DEC-723), so no card leaves the table. A story names a companion's loss route. That needs an engine slot, which is part of DEC-848's companion work. *She did not choose him* (i6-outline), so she never fights for him. She never turns into a foe (ruling 9).
- **Her hero falls.** She passes to another present hero, picked on the iPads. If none is present, she is taken.
- **Loyalty moments.** The Long Night's "stop them / talk them down" raises it a step and "lift the latch" lowers it. The Funeral (Dorka's wake) raises it if the group stays for the lid, and the engine's corruption rule lowers it (DEC-721).
- **Freed:** in the lair's end hook, if `lenka-taken` is set and the Lantern is present (DEC-750). That sets `lenka.saved_by = lantern` at that moment. If she stays with or rejoins the party, it is set to `party` then, always before any finale line is picked (G-8). The ending follows DEC-746: `finale-win.rescued` (with `~freed` lines when `saved_by` is `lantern`) or `finale-win.lenka-lost` (G-4, G-5).
- **Art:** veiled until the Tome (see above). Her talking avatar uses the veiled portrait until `n4-finding-the-tome` and her face after it.

## 5. The castle (DEC-851, DEC-780, IDEA-094, IDEA-095, IDEA-097, Q-427)

DEC-566's shape stays: three levels of three rooms, a stair room on the basement and main levels, and the adversary in the tower level's last room. DEC-780 adds fixed rooms by position. Unfixed positions deal from IDEA-100's pool.

| Level | Room 1 | Room 2 | Room 3 |
|---|---|---|---|
| Basement | `n5-flooded-room`: a fixed guard with `foe-first` (IDEA-095) | `n5-the-swap`: a fixed guard with the `vanish` start hook (IDEA-096, DEC-751) | Stair room, dealt guard |
| Main | `n5-banquet`: a fixed guard, with his voice at the organ as the start hook (IDEA-093) | `n5-portrait-gallery`: a fixed trap with a choice of two losses (IDEA-094) | Stair room, dealt guard |
| Tower | `n5-lift`: a fixed trap with a choice of two losses (IDEA-097) | `n5-heart-of-sorrow`: a fixed guard with its named foe (IDEA-098) | The lair: `n5-final-confrontation~<lair>`, the boss battle |

- **The traps' choices** use DEC-489's "lose this or that".
  - The Portrait: "look away" costs every hero 2 hit points; "cover the canvas" costs 1 potion.
  - The Lift: "ride it" costs each rider 3 hit points; "climb the shaft" costs the group 2 gold each.
  - Numbers are placeholders (DEC-500). There are no stances (DEC-566 keeps them for the Tomb).
- **Replace a hero's castle moment (DEC-748).** At the Swap, the Count speaks through the wight that wears the hunted hero's face (IDEA-096), then leaves. The boss fight stays in the lair, so DEC-566 holds.
- **Castle moments for the other goals** are start hooks with lines only and no choice (`n5-castle-moment.NN~<goal>`):
  - Win Lenka: at the Banquet he offers her his hand, and she refuses him before the hunters.
  - Destroy the blade: the Heart's halberds go for the blade's carrier first. That carrier is the one the room's hit lands on.
  - Darkness: the tower level goes dark. The Lift gives no warning, and its smaller loss is not offered.
- **The Heart of Sorrow** is room 2 of the tower level, not a stair room. The tower level has none (DEC-566). Its tower shaking is a tower cue, with a Story board sound-and-picture fallback.
- **Solo Swap.** If one hero is present, their companion vanishes and the wight wears the companion's face. With no companion, the wight wears the hero's own face, and the hero fights it with nobody missing. Ruling 12.
- **A retreat or fall at the Swap** brings the hero back the next time the room is entered, with a bite under the guard (DEC-751's draft). That needs nothing new.

## 6. The objects (DEC-853, Q-429)

- **Story items** (DEC-054, DEC-447), held by a hero. The engine has no hero-to-hero give action, so who picks one up matters.
- **The blade:** +3 Wild against the Count (DEC-750). A landed destroy-the-blade strike takes 1, down to a floor of +1. It is never destroyed or taken (G-1). The goal's threat is a weaker final blow, so "destroy" is his aim, not his result. Ruling 8 keeps this.
- **The Lantern:** softens strikes for the group carrying it (§3), and frees Lenka in the lair.
- **The Tome:** names his goal and gives +1 Wild against him (DEC-750).
- **A fallen carrier** keeps every story item. A fall in Bloodtower counts as a retreat (DEC-119), and nothing is dropped. The objects can't be lost in play, so the gate is always reachable (DEC-062, G-1).
- **The gate (DEC-749):** `n5-drawbridge`'s options are enabled when the present group holds all three objects among its heroes. Otherwise they show the reason line "You need the blade, the Lantern and the Tome here" (C3 disabled-with-reason).

## 7. The Drawbridge's notice (DEC-857, IDEA-091)

There is no attention track (DEC-054: no new tracks), and in chapter 4 he waits in the Tower and doesn't strike (DEC-738). So his notice is paid in the valley and at the first door:

- **The bridge (loud):** costs no extra move. It places 1 skull on the most-skulled building (`skull` effect), and it sets `bridge-loud`, which gives the Banquet `foe-first`. This is a room effect, not finale escalation, because the Count's strength is unchanged (DEC-361).
- **The little gate (quiet):** enabled only while Marta is an ally, meaning she was met and is not the sprung traitor (DEC-854). In Short, which has no traitor, she waits at the gate, as the old `n5-drawbridge` has her. It costs 1 extra move. With no move left the option is disabled with a reason. "Move" as a plain-scene cost kind is checked in D-04, and if DEC-642's cost doesn't cover it, the cost becomes 2 hit points each.
- Either option finishes the quest and fires the Tower trigger (DEC-645, IDEA-147).

## 8. The traitor (DEC-854, Q-430)

- **Lengths:** Standard only (ruling 3). Short has none, within MEC-052's floor of 0. Long is deferred (DEC-866).
- **Chapter:** chapter 3 (DEC-736 needs a chapter that ends before the finale). Unmasked or not, it is settled before the Castle.
- **Suspects (DEC-735):** Jakob Brenner (the bookkeeper), Andrei Morosz (the brother) and Marta Varga (Tomas's niece). Marta is moved earlier: she is met at the K4 Village box in `n4-earth-boxes`, half-turned, as in vellmoor-expansion's idea. The seed picks the traitor (DEC-849), and clues against the others are false leads.
- **Clues** (IDEA-140; MEC-052 sets the count to unmask in the numbers pass):
  - `n1-open-grave` (Oskar's letters)
  - `n3-fly-eaters-cell` (Jakob's own story)
  - `enc-ledger-page` as a wild clue event
  - `n4-earth-boxes` (the shipping orders)
  - Emeric's free clue a chapter (DEC-782)
  - Each source has a line per suspect (`~` is not used for the traitor; the suspect's line is chosen by the engine's clue slot, MEC-052).
- **The trick at chapter 3's end** echoes the Long Night: someone lets him in.
  - Jakob sells the group's road: the Count's piece is set on Lenka's hero's group, and a strike lands with no Ward offered.
  - Andrei opens the house: if Lenka is present she is taken (`lenka-taken`). Otherwise 2 skulls go on the K1 Citadel.
  - Marta bars the little gate: the Drawbridge offers only the bridge.
- **Unmasked:** the trick never springs, and the unmasked suspect's help is the reward.
  - Marta opens the little gate for free (no extra move).
  - Jakob gives one holy water.
  - Andrei raises Lenka's loyalty a step.

## 9. Companions (DEC-855, Q-431)

- **Defaults:** RtDT's ten stay at the tavern as priced hires (DEC-723, DEC-724, 20 gold, DEC-774), with Dracula's names for their lines only, captions as default (DEC-723). Tomas the Scout (DEC-731) is dropped from Dracula (ruling 10, DEC-498 lets a story remove content), so Tomas Varga is the only Tomas.
- **The five story companions** are app-only (DEC-782). Each is asked at their own building as a building pick for 0 gold and 1 move. It is DEC-724's pick with the price set to 0, offered once that building's kingdom is open:
  - Agnes at K1 Sanctuary
  - Emeric at K1 Bazaar
  - Tomas at kingdom A Citadel
  - Wren at kingdom B Village
  - Lenka joins by quest (§4)
  - The collision rule moves a pick when its building holds a quest marker.
- **Loyalty moments** (DEC-721; the engine also lowers loyalty on the hero's corruption):

| Companion | Up a step | Down a step |
|---|---|---|
| Agnes | The procession ghost (Mother Ursula) answered | The Fly-Eater's price paid with a bite on her hero |
| Tomas | The little gate taken with Marta | Marta the sprung traitor |
| Wren | The procession ghost (Jozef) answered; with Long, the Third Bride beaten (deferred) | The Funeral's lid watched, not nailed |
| Emeric | The Tome found | `enc-ledger-page` followed to a false lead |
| Lenka | See §4 | See §4 |

## 10. Line ids (DEC-856)

DEC-622 keeps `scene.moment~variant` and drops `.private`. The A1 line form is `seal-break.01~vo-01`, and `assetIdSchema` allows one `~`, with dots on either side.

- **Base line:** `<scene>.<NN>~vo-NN`, for example `n1-burgomasters-house.06~vo-01`.
- **Goal or lair line:** `<scene>.<NN>~<value>.vo-NN`, for example `n1-fortune-reading.07~win-lenka.vo-01` or `n5-final-confrontation.02~ludmilas-chapel.vo-01`.
- **Event moment:** `<scene>.<event>~vo-NN`, as `finale-win.shattered~vo-01`. The guard and Lantern lines are event moments: `count-strike.guarded~vo-NN` and `count-strike.lantern~vo-NN` (G-9).
- **Endings (G-4):** `finale-win.<ending>.<NN>~vo-NN`, `finale-loss.<ending>.<NN>~vo-NN`, and `finale-win.rescued.<NN>~freed.vo-NN`.
- **Pictures:** `painting.<scene>` and `painting.<scene>~<value>` (DEC-622 slot ids).
- **Only two axes, plus `~freed`** (G-2): the four goal values and the four lair values (DEC-849), and `~freed` on `finale-win.rescued` (G-5). There are no length, companion, state or private variants.
  - A line whose speaker is not with the group is skipped. Each scene must read without it, with the narrator carrying the plot.
  - The two win endings are separate scenes, not variants (D-01).
  - The old `~no-<hunter>`, `~night<N>`, `~boxes-left` and `.private.<hunter>` forms retire.
- **Fallback:** a missing `~<value>` line plays nothing and raises a W-asset warning (#413). The pack lint fails a `~<value>` id that names an undeclared value.
- **Migration:** the script's `<moment>.vo-NN` becomes `<moment>~vo-NN` when Loremaster rewrites each scene (IDEA-153). There is no bulk rename of lines that are being rewritten anyway.

## 11. Rules reused from The Ruined Keep (no change)

| System | Dracula reads it as | Source |
|---|---|---|
| The day: Regroup, the roll, group turns, the drop | The day closes at dusk (IDEA-148) | C3-04, MEC-034 |
| The skull supply as the clock, with days left on the board | The Valley Falls | DEC-686, C3-11, Q-C3-04 |
| Four fallen buildings lose | The Houses Fall (DEC-863) | Q-C3-05 |
| Events: six tracks; people as rumour and trick | IDEA-132's renamed events | C3-05, Q-C3-03 |
| Buildings: Rally, Virtue draw, cure (first free each chapter), tavern rest, Cleanse at 1 move; the skull menu shrink | The four building jobs in Vellmoor's words (IDEA-143) | C3-06, Q-C3-13, Q-C3-14 |
| Plain scenes: one choice, 2–3 options, 1–3 effects, at most one battle | Every non-Tomb quest | C3-07, DEC-642, DEC-692 |
| Corruption: gold effects, a seeded named draw, the third loses, guarded | Bites (IDEA-131), Turned | C3-08, Q-C3-15, Q-C3-16, MEC-013, DEC-565 |
| Chapters: won when every quest is done, a seal break, glyph boons from the base pack | His hold cracking (IDEA-152) | C3-09, C3-15, DEC-303, Q-C3-17 |
| The Tomb crawl with bold or on guard | The Blade and the Catacombs | C4-06, C4-12, MEC-026, DEC-489, DEC-492 |
| Battle, retreat, fall and reward | Every fight | C4-02, C4-03, C4-11 |
| The Tower loop, the boss battle, kept damage on a retreat | The castle and the lair | C5-01, C5-02, C5-07, C5-08, DEC-360 |
| Game end, outcome, stats; key moments | No vote (D-01) | C3-10, C3-16, C3-17, C5-04, C5-09, Q-C3-18 |
| The 1.1 adversary: roams, 1 space a day, skulls on arrival, waits in the Tower | The Count | DEC-738, DEC-775, DEC-791, DEC-825 |
| Lieutenants, guard or hunter | The third bride and the eldest witch (DEC-783) | MEC-051, DEC-737 |
| Traitor tricks, the seed picks, springing at the chapter's end | §8 | MEC-052, DEC-735, DEC-736 (as Who Sold the Road?) |
| Companions, one per hero, three loyalty steps | §9 | MEC-049, DEC-070, DEC-072, DEC-720, DEC-721 |
| The tuning file, with no story override | Dracula's numbers live in base tuning | C3-02, Q-C3-08 |
| iPad toolbar, gear Menu and help; disabled with a reason | Every Dracula iPad screen | C3 plan, C2-04 |
| Art and VO through A1; ids `kind.entry~variant` | §10 | C5-05, A1-8b-1, DEC-622 |

## RULINGS 7 to 12 (closed 2026-11-10, Gamewright, under Bob's standing rule)

7. **D-02's proposals:** accepted as a set, to be checked in the playtests. Every D-02 card is decided.
8. **The blade strike:** a bonus cut, down to +1. The blade is never taken (DEC-853, DEC-860).
9. **Lenka never turns into a foe** (DEC-852).
10. **Tomas the Scout is dropped from Dracula** (DEC-855).
11. **A Ward makes him withdraw at once** (DEC-858).
12. **The solo Swap:** the companion vanishes, or the wight wears the hero's own face (DEC-851).
