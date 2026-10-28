# Design check: the GamingTrend review of RtDT

Status: **draft for Bob's review**, 2026-10-28.

Bob's ask: keep what the review praises, and fix some of what it criticises. Source: Bob's Perplexity summary of the [GamingTrend review](https://gamingtrend.com/reviews/return-to-dark-tower-review-the-nerd-maker/), kept at [../return-to-dark-tower/assets/gamingtrend-review-perplexity-2026-10-28.pdf](../return-to-dark-tower/assets/gamingtrend-review-perplexity-2026-10-28.pdf). The review is one reviewer's experience, not a measurement of the current app.

The review's own summary: RtDT is **easy to learn but hard to play well**. The problem is not that the game is hard. Crucial information is easy to miss, and mistakes grow faster than players can recover. It also says the verdict ("minor balance issues") undersells how much four-player difficulty hurt the body of the review.

## How to use this check

Run it whenever a ruling touches turns, fights, threats, corruption, difficulty or teaching. For each row below, ask: does the change keep the pro, or move the con the right way? Each row has an ID (`RV-P` for a pro to keep, `RV-C` for a con to fix) so a card or a review can cite it.

Verdicts: **Kept** (the design already holds it), **Fixed** (a ruling already answers the con), **Partly** (some rulings help, a gap remains), **Open** (nothing answers it yet; a question card is raised).

## Pros to keep

| ID | Pro (the review) | Where Bloodtower stands | Verdict |
|---|---|---|---|
| RV-P1 | **Easy to learn for its size.** A short turn: banner action, move and act, then the Tower's event phase. | R-FUN-5: no rulebook, the app does the math. A turn is a round: every group acts once, then the tower acts (DEC-033). The end of the day is one fixed list (DEC-086). **Watch:** the decided cards now number in the hundreds; each new system must still be teachable on one screen the first time it appears. | Kept |
| RV-P2 | **Flexible turns.** Middle-of-turn actions in any order; movement split between them. | One move budget pays for walking and for building actions alike, spent in any order (DEC-078). Heroes split off or join a group on any space (DEC-031). Leftover moves are lost (DEC-149), so the budget is a real plan, not a free hand. | Kept |
| RV-P3 | **Preparation matters in fights.** Matching Advantages to foe traits softens penalties, sometimes into rewards. | Cards carry RtDT's foe traits and the app counts the matches (DEC-068). Automatic Advantages add strength each round; a conditional one softens the revealed foe card one step (DEC-324). Each foe type has one fixed ability, shown before the group chooses to fight (DEC-311). | Kept |
| RV-P4 | **Many ways to grow a hero.** Gear, treasures, potions, warriors, companions, virtues. | Items, potions and virtues stay (IDEA-027, AREA-008); one companion per hero (DEC-072); a shared purse buys them (AREA-015). Warriors and spirit become hit points (DEC-039), so one growth avenue is folded into the hero. | Kept |
| RV-P5 | **High replay value.** 9 main goals, 8 adversaries, a choice of foes per level. | Seeded variation (R-FUN-7), three lengths (MEC-010), three difficulties (DEC-059), RtDT's 12 foe types (DEC-325), and above all different stories. | Kept |
| RV-P6 | **The app runs the admin** (setup, events, the Tower's attacks), with no bugs reported. | The app does the math (R-FUN-5), names the corruption card to take (DEC-366), and asks only what the tower can't sense (MEC-018). Every error is logged and shown ([decision 0003](../decisions/0003-error-logging.md)). | Kept |

## Cons to fix

### RV-C1: Difficulty scales badly with player count

The central criticism. Solo needed the harder setting to be a challenge; four players were frustratingly hard even on the base setting; three was fine.

Where we stand: 1 to 4 players on the same script (R-FUN-8). Difficulty is one knob, easy, normal or hard, the same in every story (DEC-059, DEC-185). Nothing scales threats, the purse or the foes with the number of heroes. Because every group acts each round before the tower acts (DEC-033), Bloodtower may have the opposite tilt: four heroes get four times the actions against the same skull drop, so four could be easy and solo hard.

**Open:** [Q-302](cards/Q-302.md).

### RV-C2: Too few turns per hero at four players

A solo hero gets six turns a month; at four players each hero gets two or three, so heroes meet the threats under-equipped. (The app's v1.2.6 added more turns early in four-player games.)

Where we stand: a turn is a round, and every group acts once in it (DEC-033). There is no month of shared turns to divide, so a hero's number of turns does not fall as players are added. There is no day limit either (DEC-113).

**Fixed** by DEC-033. The trade-off moves to RV-C1: more heroes means more actions per day.

### RV-C3: Setbacks spiral

Fighting too early costs resources; spending turns to recover lets unattended enemies grow.

Where we stand: a hero at 0 hit points takes a corruption and comes back at 1 (DEC-119); one fallen hero costs no money (DEC-175); the group can run after any round (DEC-016). But the horde stays and grows when the group runs (DEC-016), and the sanctuary charges more for each corruption a hero already carries (DEC-170). That price rise is a spiral by design: the hero who most needs a cure pays the most.

**Partly.** Open: [Q-305](cards/Q-305.md).

### RV-C4: A loss can arrive before players can respond

A player can take three corruptions, the loss threshold, before their next turn.

Where we stand: a hero's 3rd corruption loses the game (DEC-043). No single random effect can lose the game (MEC-013). But the end of the day runs seven steps of threats before the loss check (DEC-086): events, skull drop, places falling, the villain, lieutenants. Several of them could each hand a hero a corruption, none of them alone a "single random effect", with no player turn in between.

**Partly.** Open: [Q-304](cards/Q-304.md).

### RV-C5: Important enemy information is easy to miss

The app lets you look at upcoming foe events, but tucks it away, so players decide badly without knowing the information was there. The place is the foe status button, the third hex on the turn screen (circled in [Bob's screenshots](../return-to-dark-tower/companion-app.md#screenshots-bob-2026-10-28)). Behind it: each foe's count, its status (panicked to lethal) and its current strike event (Rulebook v2.0, p. 11). The turn screen itself shows only the quests.

Where we stand: the horde panel shows a foe's level, traits and ability before the group picks Fight, Go around or Pay off (DEC-311); players see which of their cards match (Q-210). Nothing yet says where players see what the threats will do at the end of the day: which places are about to fall, what the villain will do, which hordes are growing.

**Partly.** Open: [Q-303](cards/Q-303.md).

### RV-C6: New players are punished for knowledge only experience gives

Knowing when to fight is learned by losing; underestimating one strong enemy can sink a game, so early losses feel unfair rather than instructive.

Where we stand: R-FUN-5 asks the app to teach each system the first time it appears. Running is allowed after any round (DEC-016), so a misjudged fight can be left. But how a new table learns is still open, and nothing tells a new player that a fight is beyond them before they start it.

**Partly.** Open: [Q-259](cards/Q-259.md), which this check feeds.

## Summary

| ID | Verdict | Next |
|---|---|---|
| RV-P1 to RV-P6 | Kept | Re-run this check on rulings that touch them |
| RV-C1 | Open | Q-302 |
| RV-C2 | Fixed | DEC-033 |
| RV-C3 | Partly | Q-305 |
| RV-C4 | Partly | Q-304 |
| RV-C5 | Partly | Q-303 |
| RV-C6 | Partly | Q-259 |
