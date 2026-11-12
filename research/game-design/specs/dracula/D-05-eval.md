# Dracula D-05: eval

**Status:** decided by Gamewright, 2026-11-10, under Bob's standing rule that design rulings are Gamewright's (relayed by Warden, 2026-11-10). Design only.
**Stacks on** D-01 to D-04.
**Style:** The Ruined Keep's eval checklists, with the same layout: C5-06 and C5-10 `eval.md`, `briefs/EVAL-TEMPLATE.md`, and the probe pages P-002 to P-006. A plausible wrong build must fail. These checks become the Dracula pack feature's `eval.md` when its brief is written. Until then they are the contract for P-007 and the Dracula playtests.
**Cards:** DEC-887 to DEC-891.

## 1. Tuning targets (DEC-887), copied from The Ruined Keep

| Target | Value | Source |
|---|---|---|
| Normal win rate | **About 80% at least** in every cell (Short and Standard × 1 to 4 heroes), and at most about 95% | DEC-823, DEC-816 |
| Easy | About 90%, as a floor | DEC-819 |
| Hard | A band of 50 to 85% in each cell. Cells from 45% up count as inside it, as with The Ruined Keep's three low cells | DEC-829, DEC-830 |
| Days to win (normal median) | Within **±15%** of D-03 §6. Short 29/26/18/16, Standard 35/31/21/19, for 1/2/3/4 heroes. Outside that, D-01's chapter lengths are rewritten from the measured numbers | D-03 §6, DEC-888 |
| Skull ceiling | In won games, the median skulls spent is **≤ 20 of 24**, and the 90th percentile is ≤ 23. The pressure is real, but a won game doesn't end on the last skull by luck | DEC-686, D-03 §6, DEC-888 |
| Loss mix (normal, all cells) | No loss route is ≥ 80% of the losses. No route is 0% at Standard with 2 heroes, unless the measured reason is written down | DEC-888 |
| Strikes | A median of 3 to 5 a game at Standard. Turned away (won or Warded) in 40 to 75% of them | D-03 §3, §4 |
| Lenka | Taken in 15 to 50% of normal games at Standard. Freed by the Lantern in at least 60% of the won games where she was taken | DEC-746, DEC-888 |
| Moving a number | Dracula's pack numbers (D-03 §5) move first. A base number moves only under DEC-817's rule, brought to Bob | DEC-817, DEC-873 |

## 2. P-007, the Dracula numbers pass (DEC-889), specified for a runner

**Why it isn't run here:** P-006 was a throwaway script written from the cards (DEC-814). It isn't in the repo and isn't on the box: a search found only P-006's results page. Rebuilding it here would give numbers that can't be compared with P-006's. A runner with the P-006 script runs P-007 by extending it, exactly as below. The results go into `research/game-design/probes/P-007-dracula-numbers-pass.md`, laid out like P-006's page.

**Base:** P-006's script and its plain table (DEC-818), unchanged. The same policy, the same limits ("Script limits" in P-006), and mulberry32 dice.

**Cells:** Short and Standard × 1 to 4 heroes × normal, easy and hard, with classes seeded (DEC-816). That is 24 cells, at 2,000 games each.

**Seeds:** 70000 + 7919 × game + 131 × heroes + the length name's letter count. The base is new, so P-007 never reuses P-006's games. Games 0 to 1,999 in each cell. Everything seeded is drawn from that stream at Begin: K1 to K4, the object sites, the goal, the lair and the traitor (DEC-849).

**Story model (add to P-006):**
1. **Quests:** the D-01 table for Short (8) and Standard (12), with the fixed chapter 1 order. `n1-open-grave` comes after the House when present. Long-only quests are left out. Tombs use `tomb.rooms`. Plain scenes take P-006's plain-scene model. The Long Night is played as Hold (wolves, level 1). Funeral: Nail. Drawbridge: the bridge, or the little gate when Marta is an ally and every hero has more than 2 hit points.
2. **Foes:** D-03 §1's levels (1, 2, 3, 3 ± difficulty, capped at 4). Castle guards are level 3, the Heart level 4, and the Count level 5. The Count uses the Warden's boss model (DEC-567). The blade gives +3 Wild against him (minus its weakening) and the Tome +1, each counted as +1 strength per point.
3. **The Count:** he enters at the end of The Reading and moves 1 space a day toward his goal's target (D-02 §3). He strikes at most once a day, in chapters 2 and 3 only. Each building he reaches takes 1 skull. **Strike policy:**
   - Ward if a holy item is held and the landed cost would be a bite or Lenka's loyalty.
   - Otherwise Fight if every present hero has more than 6 hit points.
   - Otherwise Endure.
   - Fight is up to 3 battle rounds against level 5. Winning one round sends him home.
   - Landed costs follow D-02 §3, with the guard and the Lantern and Lenka softening.
4. **Goals:** a seeded quarter each. Darkness adds 1 skull at the ends of chapters 2 and 3 (DEC-871).
5. **Earth boxes (Standard):** each standing box adds 1 skull a day to a K4 building, at most 1 a day and none on a quest night (DEC-870), until the boxes are burned.
6. **Wards:** D-03 §4's sources. The Funeral's nail is Ward-only. Ward spends the nail, then holy water, then the host. Holy water is spent on a Ward before a cure.
7. **Lenka:**
   - She joins at the House and gives her hero −2 on strike losses.
   - Loyalty runs on the D-02 §4 steps. Hold +1, the Funeral +1, and the Lenka goal's strikes −1. At wavering, the next landed Lenka strike takes her.
   - She is freed if the Lantern is in the lair.
   - Record `saved_by` at the end of the game.
8. **Traitor (Standard):** seeded among the 3 suspects. The table accuses after holding 2 clues on one suspect. The clues come from the D-02 §8 sources, each pointing at the real traitor with probability 0.6. The trick springs at chapter 3's close if no right accusation was made. P-006's stand-in (1 skull in 20% of games) is not used.
9. **Castle:** D-02 §5's fixed rooms, with the Lift on hold and dealt in its place. Portrait: look away. Swap: the solo forms as in D-02.
10. **Losses:** Turned (a third bite, never from a strike or the end of the day), the Valley Falls (the supply is empty) and the Houses Fall (the fourth building is destroyed). In the same node they come in the order D-04 §10 gives. P-006 tracks fallen buildings but never loses on them. P-007 does lose on them.

**Report (per cell):**
- % won
- median and 90th-percentile days to win
- skulls spent in won games (median and 90th percentile), and the skull sources split into nights, arrivals, boxes and Darkness
- the loss mix
- strikes a game, with the split between Fight won, Ward, Endure and landed
- Lenka taken and freed %
- the traitor unmasked %
- gold left at the end

The report then adds one table against §1's targets. It also includes a "how it got there" table if any pack number was moved, one row per move, as P-006 has.

**Done when:** every §1 target is met, or each miss is written down with the D-03 pack number proposed to move. D-03 §6 and D-01's chapter lengths are then updated to the measured medians.

## 3. Playtest acceptance (DEC-890)

These are table games from the cards, as P-002 to P-005 were (DEC-634), then live games on the build. Each check names what a plausible wrong build would do and fail on.

### Per chapter

| Id | Check | Pass evidence | Fails if |
|---|---|---|---|
| PT-C1-01 | Chapter 1 stays in K1, and its markers appear in order | The Inn, the House and the Long Night in order. The Open Grave whenever it is present. The Reading last | A marker shows early, or a non-K1 space is open |
| PT-C1-02 | The Long Night's three options and their costs | Hold: a battle at level 1. Talk: 1 skull on K1's Village, no battle. Latch: a bite on the present hero the group picks, no battle, and a hero at 2 bites is greyed out (DEC-875, DEC-876) | Latch adds a battle or a skull, the engine picks the hero, or a hero at 2 bites can be picked |
| PT-C1-03 | The Count enters only at the end of The Reading, and there are no chapter 1 strikes | The piece-setup picture after `n1-fortune-reading`, and no strike before it | A strike, or his piece, in chapter 1 before The Reading |
| PT-C2-01 | Strike flow | The opening plays, then Fight, Ward and Endure. Ward is greyed out with "Needs holy water or the host" when nothing is held. Winning a round or Warding plays `count-withdraws` and the Tower Done | Ward is enabled with no item, or a strike happens twice in one day |
| PT-C2-02 | The guard and the Lantern as events | A hero at 2 bites gets `count-strike.guarded` and loses hit points. The Lantern present gives `count-strike.lantern` and the loss less 2 | A third bite from a strike, or a goal variant played in their place |
| PT-C2-03 | The objects are never lost (G-1) | After any strike and any fall, the three objects are still held | A strike or a fall removes an object |
| PT-C3-01 | The boxes' skull | At most 1 a day while a box stands, and none on a quest night | 2 or more in a day, or one on a quest night |
| PT-C3-02 | Standard traitor | Hidden, it springs after `chapter-win.03` and before `seal-break.03`. Unmasked, it gives its help and the trick never springs. Short has no traitor | Wrong order, or a traitor at Short |
| PT-C3-03 | The Tome names his goal | The `n4-finding-the-tome` variant matches the seeded goal | A mismatch |
| PT-C4-01 | The Drawbridge | Both crossings are greyed out with the objects reason until all three are present. The little gate is greyed out without Marta. Turn back leaves the quest | A dead end, or a crossing without all three objects |
| PT-C4-02 | No strikes in the Castle | None from the Drawbridge on | Any strike |
| PT-C4-03 | The castle's fixed rooms and moments | The D-04 §7 table. The win-Lenka moment only with Lenka present. The Darkness moment on entering the Tower level | A room in the wrong place, or a moment played without its condition |
| PT-C4-04 | The Heart without the tower | No sound and no board change for the cue. The lines and painting still say it shakes | A board "fallback" effect, or a missing line |

### Per ending

| Id | Ending | Set up by | Pass evidence | Fails if |
|---|---|---|---|---|
| PT-E-01 | `finale-win.rescued` | Lenka is never taken, then the lair is won | Base lines. `saved_by = party` | `~freed` lines, or lenka-lost |
| PT-E-02 | `finale-win.rescued` with `~freed` | Lenka is taken and the Lantern is in the lair | The `.02~freed` line plays. `saved_by = lantern` is set before the first finale line | Base `.02`, or lenka-lost |
| PT-E-03 | `finale-win.lenka-lost` | Lenka is taken, and the Lantern is not in the lair | lenka-lost's lines | rescued |
| PT-E-04 | `finale-loss.turned` | A third bite in a hero's own turn | The turned scene, in any chapter | No loss, or a third bite from a strike |
| PT-E-05 | `finale-loss.valley-falls` | The supply is emptied | The valley-falls scene | The houses scene |
| PT-E-06 | `finale-loss.houses-fall` | The fourth building is destroyed, supply left | The houses-fall scene | No loss |
| PT-E-07 | Two losses in one node | The drop that empties the supply also destroys the fourth building | valley-falls only | Two scenes, or houses-fall |
| PT-E-08 | Each ending is narrator-led | At most one companion line in each scene (G-6) | Two or more companion lines |

### Flow and survival

| Id | Check | Pass evidence | Fails if |
|---|---|---|---|
| PT-F-01 | Short and Standard only | Game settings offers no Long for Dracula | Long is offered |
| PT-F-02 | No Next-only screens, except the physical confirms | Every iPad state has a real choice, auto-advances, or is a D-04 physical confirm (the Count's piece, the freed skulls, piece setup) | A lone Next anywhere else |
| PT-F-03 | Toolbar and help | "?" at the left and the gear at the right on every Dracula iPad state, including the strike, the Drawbridge and the traitor's Accuse. The `count-strike` help line shows | A missing toolbar or help line |
| PT-F-04 | No digital board | No map pins, no hero markers and no Count marker drawn on the board at any point | Any of them |
| PT-F-05 | Without the tower | A full game plays with the tower never connected. Seal breaks are skipped, and every tower cue is skipped | A tower prompt mid-game, or a stall |
| PT-S-01 | Continue mid-strike | Quit after the opening, then Continue. It resumes at the pick with no opening replay. The same seed gives the same result | A replay, or a new result |
| PT-S-02 | Continue keeps the story state | Every D-04 §3 survival field is unchanged after Continue and after a host restart | Any field changes |
| PT-S-03 | The Count's piece-check step | Continue in chapter 2 shows his saved space. Continue before The Reading shows no step | A step that is missing or shown early |

## 4. The Dracula gate (DEC-891)

As G-1.0's shape for The Ruined Keep (Q-C5-10, C5-10):
- P-007 is all-pass, or its misses are ruled.
- Every PT check above is all-pass.
- Bob plays **two** full table games of Dracula, one won (either win ending) and one lost.

The other ending checks may be forced with seeded or fixture games, as C5-09's evals force each flag.

## OPEN RULINGS (Bob), continued from D-04

None. Ruling 13 is closed (Gamewright, option B, D-04).
