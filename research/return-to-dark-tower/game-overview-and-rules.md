# Return to Dark Tower — Game Overview and Rules Summary

A summary in our own words of how the official game plays, written so we can compare our own design ideas against it. For exact wording, use the official rulebook (link in `sources.md`).

## At a glance

| | |
|---|---|
| Publisher | Restoration Games (Sunrise, FL) |
| Designers | Rob Daviau, Isaac Childres, Noah Cohen, Justin D. Jacobson, Brian Neff; Tower lead Tim Burrell-Saward |
| Players / time / age | 1–4 / 100–120 min / 10+ |
| Modes | Cooperative (main), competitive, solo |
| Released | 2022 (Kickstarter Jan 2020 raised $4M+; 2nd printing on BackerKit Aug 2022 raised ~$2.05M from ~17k backers) |
| Lineage | Sequel to Milton Bradley's *Dark Tower* (1981) |
| Retail price | $199 base game (publisher store) |
| Requires | The companion app on one Bluetooth device. The game cannot be played without it |

## Story

Long ago the sorcerer-king Azkol built the Tower and practiced dark sorcery there. His apprentice Nimet stole his treasures and rallied heroes of the Four Kingdoms to defeat him. Now a new adversary has taken the Tower, and the kingdoms have six months to stop it.

## Setup in brief

1. Board in the middle, each kingdom facing a player; Tower (batteries in, all 12 seals on, powered) in the center.
2. Place the 16 buildings; form the supply (warriors, spirit, exactly 24 skulls).
3. Gear in 6 face-up stacks of 3; shuffle treasures (3 face up as the market), potions and corruptions.
4. Each hero: board, 3 hero virtues inactive side up, the home-kingdom virtue, figure on their home citadel, 7 warriors and 1 spirit.
5. App: start new game, pair with the Tower, choose mode, difficulty (Heroic default, Gritty harder), expansions, player count, main goal, adversary and three foes (one each of level 2, 3, 4). Optionally enter a game seed. Then follow the app's placement steps.

## Turn structure

The game runs in **months**. Month 1: exactly one turn per player. Later months: unknown length, averaging 6 / 7 / 8 / 9 turns for 1 / 2 / 3 / 4 players (fewer on Gritty). The app announces month end. From month 2 the app issues a **companion quest** (reward) and an **adversary quest** (penalty if failed) each month.

Each turn:

1. **Start:** optional Banner action from the hero board (use it or lose it). One trade per turn with heroes on your space (no virtues or corruptions).
2. **Middle, any order, can split movement around actions:**
   - **Move** up to your move value; spend 1 spirit beforehand to double it. Nothing blocks movement.
   - **One heroic action**, then gain 2 spirit:
     - *Cleanse* — clear all skulls from a building on your space.
     - *Battle* — fight a foe on your space in the app.
     - *Quest* — complete a quest (incl. the main goal) or explore a dungeon.
   - **Reinforce** once at a building (free option or spirit-paid enhanced option), optionally rolling the haggle die first.
3. **End:** drop a skull from the supply into the Tower. The Tower may hold it, release skulls, rotate, or the app fires events. No items after the drop.

### Reinforce options

| Building | Free | Enhanced |
|---|---|---|
| Citadel | 1 potion | 5 spirit → unlock a virtue |
| Sanctuary | 1 spirit | 5 spirit → remove all corruptions |
| Village | 6 warriors | 1 spirit → 12 warriors |
| Bazaar | 1 gear | 2 spirit → 1 treasure from market |

Haggle die results: normal, +3 warriors, +1 potion, +1 gear, or the Reinforce is cancelled.

## Key systems

- **Advantages.** Six types tied to foe/dungeon traits (Beast, Magic, Humanoid, Melee, Undead, Stealth) plus Wild. Automatic ones come from items/virtues; conditional ones cost something. Up to 10 per heroic action; unused ones vanish. In battle you press an arrow on an app card to improve its result one step per Advantage; in dungeons each room can be improved once.
- **Battle.** Draw as many face-down app cards as the foe's level. Each card typically costs warriors; traits add special cards and each foe has a critical-hit card. Resolve all to defeat it.
- **Adversary battle.** Only after the main goal is done and the adversary spawns. Needs 5 cards; you may retreat after resolving at least one, and improvements persist between attempts.
- **Dungeons.** App-generated room graphs; explore toward a target room; cleared rooms stay cleared.
- **Skulls.** Emerge into a kingdom and must go on that kingdom's buildings (home player chooses; the dropper chooses for dormant kingdoms). A 4th skull destroys the building and removes it and all four skulls from the game (2nd-printing rule), and the home hero gains a corruption.
- **Glyphs.** Revealed as seals come off; while one faces your home kingdom, its action costs 1 spirit.
- **Foe status** escalates the longer foes stay on the board: panicked → unsteady → ready → savage → lethal. Each foe type has a monthly-ish strike event.
- **Corruptions.** Gained when you can't pay a loss, when skulls land on destroyed buildings, when a home building is destroyed, or by effect. Normally one per effect.
- **Items.** Potions (unlimited), gear (one of each), treasures (max 4), quest items (unlimited).
- **Virtues.** 16 tiles: 3 hero virtues per hero plus 1 kingdom virtue per kingdom. The rulebook says "You start the game with three active virtues and three inactive virtues, which you can gain during the game", but its setup places the 3 hero tiles "inactive side up" next to the home-kingdom tile, and it doesn't square the two. Gaining one: "Spend 5 spirit to gain 1 virtue" at a citadel Reinforce; you "flip one of your inactive virtues face up to its active side" and it works at once. Virtues can't be traded. Only the citadel is tied to virtues; single virtues trigger on actions or spending (*Generous* after a Cleanse, *Relic Hunter's Inventive* on spending 4 potions). Source: RulesPal rulebook transcription, checked 2026-10-22.
- **Game seeds.** A 12-character code captures mode, players, difficulty, goal, adversary, foes and events, so a setup can be replayed or shared.

## Winning and losing

- **Win:** complete the main goal, then defeat the adversary.
- **Lose immediately if:** a hero would take a 3rd corruption, a skull is needed and the supply is empty, or month 6 ends.

## Competitive mode

Based on Nimet's earlier quest. Each player gets 4 heroic test cards and an Amulet of Hope. Complete 3 tests (each lets you remove or replace a seal anywhere), then enter the Tower dungeon from a space next to the Tower and find the relic. Elimination on a 3rd corruption or empty skull supply. Monthly quest grants a companion to whoever finishes it first.

## Expansion mechanics in one line each

- **Alliances:** shared *influence* resource to sway 4 two-sided guilds; power skulls drain resources; guild companions; 2 heroes.
- **Covenant:** monuments built on foundations via offerings and a new *Build* heroic action; app-driven wasteland spread; permanent doom skulls; wands with charges; harsher corruptions; 4 heroes.
- **Expeditions:** press-your-luck caravan expeditions to four outer lands that bring back site tokens; torments (foe and global) raise difficulty; new gear and interchangeable virtues; 4 heroes.

## Notes for our design

- The app owns all hidden information (battle cards, dungeon layouts, event timing, month length, seal choice). The board holds only public state.
- The skull drop is the turn-end signal from the physical world back to the app — the one input the Tower sends without a screen tap.
- Reviewers' common complaints: base game too easy once Advantages stack up, adversary retreat removes tension, no in-app tutorial, battery drain. Gritty mode and Covenant/Expeditions torments are the publisher's answers.
