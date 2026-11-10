# Dracula D-04: session flow

**Status:** decided by Gamewright, 2026-11-10, under Bob's standing rule that design rulings are Gamewright's (relayed by Warden, 2026-11-10). Design only, no code.
**Stacks on** [D-01](D-01-arc-and-chapters.md), [D-02](D-02-rules-deltas.md) and [D-03](D-03-encounters-foes-tuning.md).
**Copy:** Loremaster's drafts on the box, under `/workspace/dracula/lore/`. Group 1 is the opening and chapter cards, group 2 the endings, group 3 the system moments and strike labels, and group 4 the new scenes. Every line is DRAFT (DEC-867). Labels quoted here are Loremaster's.
**Cards:** DEC-875 to DEC-886. DEC-856 and DEC-857 are amended.

## 0. Locked flow rules this page keeps (cited)

| Rule | Source |
|---|---|
| The tower is optional. Without it, every tower sound and light is skipped, the Story board doesn't change, and the skull drop is simulated. Seals and glyphs drop out | Bob 2026-10-24; DEC-275, DEC-305, DEC-306 |
| A tower lost mid-game pauses with three choices: Reconnect, Go on without, or Quit | DEC-301, C2-08 |
| No digital board and no hero markers on the Story board. The players move every physical piece | Bob 2026-10-24; D-01 locked constraints |
| The iPad is an input device. Every instruction, picture and sound is a board node | DEC-278 |
| iPad picks are simple lists of buttons, and the board mirrors each press. One step has one primary button | C3 plan, iPad rules (Bob 2026-10-31 10:37–10:38 AM ET); SCR-016 |
| A disabled option is greyed out with a one-line reason | C3 plan (Bob 2026-10-31 6:14 PM ET); DEC-654, UI-043 |
| Exceptions go through the gear Menu. Its panels display on the board, and their picks are made on the iPad | C2-04, UI-032, UI-033, DEC-229, DEC-230 |
| A "?" help button on every iPad screen opens a sheet on the iPad. It sends nothing to the host and doesn't pause | C2-04 (Bob 2026-10-31 6:14 PM ET) |
| Next-only screens are kept to a minimum: a beat auto-advances when its line or cue ends (4 s with no audio). Next stays only where the table must confirm the physical board | C3 plan (Bob 2026-10-31 10:38 AM ET); C4 and C5 plans; Q-C4-17 |
| Nothing is private: all story content is shared | DEC-057, DEC-745 |
| The board is display-only and never scrolls or clips | SCR-013, SCR-014 |

Everything below is The Ruined Keep's flow unless it is marked **Dracula**.

## 1. Begin through the opening

| # | Step | Board | iPad | Source |
|---|---|---|---|---|
| 1 | Session screen: Continue (only while an autosave exists), New game, tonight's games | Session layout | Buttons | SCR-021, DEC-709 |
| 2 | Pick story: Dracula is a door. It is playable once `packs/dracula` is `playable: true` | Carousel | Story nav | SCR-007, DEC-715 |
| 3 | Game settings: **Dracula offers only Short and Standard** (DEC-866), plus difficulty | Settings | Buttons | DEC-669 |
| 4 | Party join: heroes from the engine pool | Join | Hero picks | SCR-010, DEC-098 |
| 5 | Piece setup, one step at a time. **Dracula:** every hero mini goes on K1's Village (IDEA-144), and the first quest marker on K1's Village (`n1-lantern-and-bell`). The Count's piece stays off the board until The Reading. The kingdom picture names K1's printed kingdom (IDEA-142) | One picture a step | Done | SCR-011, DEC-710 |
| 6 | **Begin.** Tuning and the seed are fixed, and all seeded values (DEC-849) are drawn now and kept hidden until they are revealed. The purse wheel (tower) or the seeded purse (no tower) | Purse | — | C3-02; DEC-114, DEC-626 |
| 7 | Game start cue, then `opening.01` … `.06` on a Scroll over the opening painting. Each beat auto-advances, with no Next | Scroll | HUD line | CUE-001, DEC-626, UI-035 |
| 8 | `chapter-card.01`, then day 1 | Chapter card | HUD line | UI-020, C3-15 |

## 2. Chapter cards and chapter ends

- **Card (UI-020):** the chapter's painting, name and goal, voiced at about 10 s at most (G-3). It has no length variants (G-2). It auto-advances.
- **The close (MEC-033, UI-044, DEC-886).** These steps run in order and each one auto-advances:
  1. `chapter-win.0N`, chapters 1 to 3. Chapter 4 has none, because the endings cover it.
  2. **Chapter 3, Standard only:** the traitor step (§5).
  3. `seal-break.0N`. This step and the freed-skull placement are tower only (DEC-303, DEC-409). Without the tower both are skipped (DEC-306). The freed-skull placement is a physical-board confirm, so its Done stays.
  4. MEC-018's short, optional chapter-end check.
  5. The next `chapter-card`. New bounds open (IDEA-145) and the new markers' setup pictures follow (SCR-011).
- **Chapter 1:** the Count's piece enters at the end of `n1-fortune-reading` (DEC-859). The setup picture "Set the Count's piece on the Tower" is a physical-board confirm, so it keeps Done.

## 3. Saves and Continue (DEC-881)

- **The save:** a running autosave at every node (DEC-048, DEC-208, DEC-675). There is no Save button (DEC-354). The **day close** (the skull drop, the box skulls, the Count's move) and the **chapter close** are the boundaries where nothing is left half-done. A quit or crash mid-node resumes that node exactly, and nothing fires twice (DEC-675). A strike's opening line, a traitor trick and a castle moment are not replayed.
- **Continue (DEC-283, C2-11):** the session's tower block if it needs one (DEC-711), then the piece check, then the saved node.
  - **Dracula's piece check** adds one step: **the Count's piece**, after "foes on the board". It shows either his saved space or "in the Tower". It is skipped before The Reading.
  - Quest markers are already part of the hero and foe pictures (DEC-710).
  - Story items, bites, loyalty and Lenka are app-only, so they need no check.
- **Survival invariants (for the build's brief):** these must be the same after Continue, a restore and a restart:
  - the seeded values: `count-goal`, the sites, the lair, the traitor and K1 to K4
  - the Count's space and target
  - `lenka-taken` and `lenka.saved_by`
  - every companion's loyalty
  - the blade's bonus
  - the clues held and the unmasked suspect
  - `bridge-loud`
  - where the strike openings are in their rotation
  - the castle's room progress (DEC-360), including the Swap's missing hero
  - whether the game went on without the tower (C2-08)
- **Tuning** stays the one fixed at Begin (C3-02).

## 4. The Count's strike on the board and the iPads (DEC-880)

**Trigger:** at most once a day, in chapters 2 and 3 only (G-7). It fires when his move at the day's close reaches a group, or when a group's move ends on his space (DEC-775). It runs as an engine-started plain scene (DEC-858), for the present heroes only. The other groups' iPads show the HUD line.

| Beat | Story board | Present iPads | Source |
|---|---|---|---|
| Opening | The goal's strike painting. The next of the goal's two `enc-*` openings (group 3) plays on a Scroll | The labels **Fight**, **Ward** and **Endure**, picked together. Ward is greyed out with the reason **"Needs holy water or the host"** when no present hero holds a Ward item. The nail is a Ward item too (D-02 G-12), so Loremaster updates the reason to name it | DEC-019, DEC-654; group 3 labels |
| Fight | C4's battle screens, as a skirmish of up to 3 rounds. The foe panel shows round N of 3 | The battle buttons. Retreat as in any battle | DEC-778, DEC-360, C4 |
| A round is won, or Ward | `count-withdraws.01`, then `.02`. Ward plays `enc-at-the-door.01` first. A Ward spends the nail first, then holy water, then the host (D-02 G-12), so no extra pick screen is needed | HUD line | DEC-858 |
| He goes home | "Move the Count's piece to the Tower." This is a physical-board confirm, so it keeps Done | Done | C3 Next rule |
| Lands (no round won, a retreat, or Endure) | One of three lines. It is `count-strike.01~<goal>` when the strike lands. The guard event, `count-strike.guarded`, plays when a hero is at 2 bites or the blade is at its floor. The Lantern event, `count-strike.lantern`, plays when the Lantern is present (G-9). Then the cost Reveal (UI-036) names the hero and what was lost | HUD line, auto-advance | DEC-850, UI-036 |
| Lenka taken | `count-takes-lenka.01` … `.03` play when the win-Lenka strike lands at wavering (DEC-852) | HUD line | DEC-746 |

- **Who takes the cost:** the engine picks the hero by the goal's target rule (D-02 §3), with a seeded draw on a tie. The group never picks, so a strike has no pick screen.
- **Copy:**
  - Loremaster's group 3 file names the guard event `count-strike.guard~vo-01`. D-02 G-9 uses `count-strike.guarded~vo-NN`, so the file renames it to match.
  - Help id `count-strike` joins C2-04's help table, and Loremaster writes its line.

## 5. The traitor (Standard only; DEC-882)

- **Clues** come as a Reveal when they are gained (UI-036): from a quest reward, from `enc-ledger-page` as a wild event, or from Emeric. The gear Menu's Look up lists the clues held (DEC-229).
- **Accuse:** a held clue shows that suspect's **Accuse** at their building (DEC-182). It is one iPad button with a confirm, as every Leave item has (DEC-230).
  - A right accusation sets the suspect unmasked. It plays `traitor.<suspect>-unmasked~vo-01` and Reveals the help (D-02 §8).
  - A wrong accusation follows the engine's traitor rules (MEC-052, DEC-183) and plays `traitor.wrong~vo-01`. It is the one wrong-accusation line, the same for every suspect.
- **At chapter 3's close,** after `chapter-win.03` (DEC-736):
  - If still hidden, the traitor springs. `traitor.<suspect>-sprung~vo-01` plays over the suspect's portrait (`portrait.<suspect>`, D-06), then the trick's Reveal.
  - If already unmasked, nothing plays.
- **Ids:** these are event moments (`<scene>.<event>~vo-NN`, DEC-856, DEC-877). The scene is `traitor`, and the suspects are `jakob`, `andrei` and `marta`. That makes 7 lines: 3 unmasked, 3 sprung and 1 wrong. They are for Loremaster.

## 6. The Drawbridge gate (DEC-883)

`n5-drawbridge` is a plain scene on a space next to the Tower (MEC-077). Its options are:

| Option (copy by Loremaster) | Needs | Cost and effect | Disabled reason |
|---|---|---|---|
| The bridge | All three objects among the present heroes (DEC-749) | 1 skull on the most-skulled building, and `bridge-loud` | "You need the blade, the Lantern and the Tome here" (D-02 §6) |
| The little gate | The three objects, and Marta as an ally: with the party and not the traitor (D-02 G-16; at Short she waits there and joins) | **2 hit points from each present hero.** Move is not a cost kind (DEC-693), so D-02's fallback applies | The objects reason first. Then "Marta isn't with you" (Loremaster's copy) |

If Marta was unmasked, the bridge places no skull and doesn't set `bridge-loud` (D-02 §8).
| Turn back | — | The quest is left (MEC-037), and the marker stays | — |

- **Turn back** is added so the scene is never a dead end when both options are greyed out. A group can reach the space before it holds all three objects.
- **Either crossing** finishes the quest and fires the Tower trigger (DEC-645): `tower-opening.01` and `.02`, then §7.
- Lenka comes along if she is with the party (DEC-741).

## 7. The Castle climb

The climb uses The Ruined Keep's Tower loop and screens unchanged (MEC-076, DEC-566, C5-01, C5-07):
- The board shows the level map and the room view.
- The iPad buttons are **Open the next door**, **Rest** (at a found shrine) and **Retreat**.
- A retreat keeps progress (DEC-360).
- With the physical tower, the castle is the tower (IDEA-151). Without it, the climb plays on the board alone (DEC-305).

| Level | Room 1 | Room 2 | Room 3 |
|---|---|---|---|
| Basement | `n5-flooded-room` (fixed, `foe-first`) | `n5-the-swap` (fixed, `vanish`; solo forms as in group 4) | Stair room, dealt guard |
| Main | `n5-banquet` (fixed). If `bridge-loud` is set, `n5-banquet.foe-first` plays and the statues strike first | `n5-portrait-gallery` (fixed trap; Look away / Cover it) | Stair room, dealt guard |
| Tower | Dealt from IDEA-100's pool while `n5-lift` is on hold | `n5-heart-of-sorrow` (fixed guard) | The lair, `n5-final-confrontation~<lair>` |

**Castle moments** (start hooks, lines only, no choice; DEC-748):
- **Replace a hero:** at the Swap, through the wight.
- **Win Lenka:** at the Banquet, **only if Lenka is with the party** (DEC-877). If she was taken, nothing plays there. The lair carries her.
- **Destroy the blade:** at the Heart, where the halberds go for the blade's carrier.
- **Darkness:** **on entering the Tower level** while the Lift is on hold (DEC-878). When the Lift returns, the moment moves to the Lift, as D-02 §5 has it.

**The Heart of Sorrow (DEC-879):**
- Its named foe is **the Heart**, at level 4 (D-03 §1).
- With the tower connected, its shaking plays the tower's rumble: **SND-077**, "Titans", from the tower sound-feel session (#409, merged as fa54784). It is picked by the AI listen's tone, per DEC-846.
- Without the tower the cue is skipped (DEC-305). The room's painting and lines `.02` and `.03` already carry the shaking, so no story beat is lost. D-01's "Story board fallback" means this.

## 8. Finale and ending selection (DEC-884)

- **The lair:** `n5-final-confrontation~<lair>`, then the boss battle on C5-08's screens (the Count, level 5; D-03). The blade and the Tome add their Wild bonuses.
- **End hook (DEC-664's slot), before any finale line:**
  - If `lenka-taken` is set and the Lantern is present, Lenka is freed. `lenka.saved_by` becomes `lantern` (G-8).
  - **The lifecycle of `lenka.saved_by`:** it is set to `party` when she joins at the House and is cleared when she is taken. It becomes `party` again if a later rule returns her, and `lantern` when the Lantern frees her.
- **There is no vote.** Dracula has no last choice (D-01). The C5-09 vote screens are not used.
- **Ending selection (G-4, G-5):**

| State at the win | Ending | Lines |
|---|---|---|
| `saved_by = party` | `finale-win.rescued` | The base lines |
| `saved_by = lantern` | `finale-win.rescued` | The `~freed` variant where one exists (`.02~freed`), the base lines otherwise |
| `saved_by` unset (taken, not freed) | `finale-win.lenka-lost` | The base lines |

- The endings are narrator-led, with at most one companion line each (G-6).
- The outcome scene auto-advances to Game stats, with no Next (SCR-018, DEC-627).
- **Game stats** (SCR-019) adds Dracula's key moments: his goal, strikes turned away and landed, Lenka's ending, and the traitor (unmasked or sprung).

## 8a. Scene conditions

- `nx-pressed-flower` is skipped unless Lenka is with the party (D-02 G-14).
- Each `nx-midnight-procession` plays the next ghost in the seeded `procession-ghosts` order (D-02 G-15).
- At the Open Grave, "Bar the gate" asks the group to pick the hero who bars it. There is one button per present hero, and the board mirrors the press (DEC-019).

## 9. Quit

This is The Ruined Keep's flow unchanged:
- Gear → Leave → **Quit story**, with a confirm (DEC-230). The game ends as quit and lands on the session screen. The autosave stays (DEC-218, DEC-208).
- **Done for tonight** follows DEC-713.
- A quit mid-strike, mid-trick or mid-room resumes that node on Continue (§3).
- A tower lost mid-game follows C2-08 (§0).

## 10. Loss triggers (DEC-885)

| Loss | Fires when | Checked | Ending |
|---|---|---|---|
| Turned | A hero takes a third bite. This can only happen in their own turn. Neither a strike nor the end of the day can give it (DEC-565, MEC-013, DEC-775) | When the bite is taken | `finale-loss.turned` |
| The Valley Falls | A skull drop empties the supply | At the drop (DEC-686) | `finale-loss.valley-falls` |
| The Houses Fall | The fourth building is destroyed | When the building falls (Q-C3-05, DEC-863) | `finale-loss.houses-fall` |

- **Any chapter, the Castle included.** Days keep running while the Tower is open (DEC-656).
- **A loss on the same day as a finish is a loss** (C3-09).
- **One node, two losses:** for example, a drop destroys the fourth building and empties the supply. The order is Turned, then The Valley Falls, then The Houses Fall, and the first in that order plays. Only one loss scene ever plays (DEC-144).
- Each loss scene is narrator-led and auto-advances to Game stats.

## 11. Gamewright rulings recorded here (decided, Gamewright, 2026-11-10)

1. **The Long Night (DEC-875)** is a trap with a choice of two losses. It uses group 4's labels:
   - **Hold them back:** a wolf battle at chapter level (level 1, D-03 §1).
   - **Talk them down:** no battle, and +1 skull on K1's Village.
   - Both raise Lenka's loyalty a step.
   - **Lift the latch:** a bite and no battle. It lowers her loyalty a step.
   - D-03 §5's latch row is updated, and the latch no longer adds a skull. Loremaster's `n1-long-night.latch-after` note ("the skull lands") needs to change. The line can stay as mood.
2. **The latch bite (DEC-876)** goes to one present hero **the group picks**, as Bob's DEC-693 has it for a plain-scene corruption. The iPads show one button per present hero, and the board mirrors the press (DEC-019). The guard applies at 2 bites: a hero at 2 bites is greyed out with the reason "Already twice bitten" (Loremaster's copy). If every present hero is at 2 bites, the latch is greyed out with that reason. This replaces the steering's engine pick, so no Bob ruling is needed (ruling 13, Gamewright, option B).
3. **Event-moment ids** use `<scene>.<event>~vo-NN` (DEC-856, amended).
4. **The Banquet's win-Lenka moment** plays only if Lenka is with the party (DEC-877).
5. **The darkness castle moment** plays on entering the Tower level while the Lift is on hold (DEC-878).
6. **At the Heart of Sorrow** the named foe is the Heart (level 4). Its shaking uses the tower rumble cue from #409 (SND-077), and the tower is optional (DEC-879).

## RULING 13 (closed 2026-11-10, Gamewright)

13. **The latch bite and DEC-693:** option B was taken, so the group picks the hero, per DEC-693 (DEC-876). No Bob lock is reversed, and D-04 has no open Bob rulings.
