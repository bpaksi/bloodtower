# Return to Dark Tower — Foes, adversaries and companions

The 12 foe types, 8 adversaries and 10 companions in the RtDT base game. Each table is read from images of Bob's own cards, front and back, and checked against his three reference lists (2026-10-27). The images and lists are in Bob's backup folder, not in the repo ([Card images](#card-images)). No code here.

## Foes

12 types, 4 at each of levels 2, 3 and 4. A foe's level is the number of battle cards drawn against it. Each type has two traits, one combat type and one foe type, and an event that plays when it strikes.

| Foe | Level | Combat type | Foe type | Event |
|---|---|---|---|---|
| Brigands | 2 | Stealth | Humanoid | Brigands make you lose items |
| Oreks | 2 | Melee | Undead | Oreks add skulls to buildings in their kingdom |
| Shadow Wolves | 2 | Stealth | Beast | Shadow wolves move to your space and make you lose warriors |
| Spine Fiend | 2 | Magic | Beast | Spine fiends make you lose warriors |
| Clan of Neuri | 3 | Magic | Humanoid | Clans of Neuri make you lose spirit |
| Frost Troll | 3 | Melee | Humanoid | Frost trolls add skulls to nearby buildings |
| Lemure | 3 | Magic | Undead | Lemures add skulls to citadels and sanctuaries |
| Widowmade Spider | 3 | Stealth | Beast | Widowmade spiders chase one hero and drain their spirit |
| Dragon | 4 | Melee | Beast | Dragons make you lose treasures |
| Mormo | 4 | Stealth | Undead | Mormos give you corruptions |
| Striga | 4 | Magic | Undead | Strigas make you lose virtues |
| Titan | 4 | Melee | Humanoid | The titans destroy buildings |

### What each trait does in battle

The back of every foe card has a "When battling" line for each of its two traits. The line belongs to the trait, not the foe, so it is the same on every card with that trait:

| Trait | When battling |
|---|---|
| Melee | Lose gear |
| Magic | Manipulates the Tower |
| Stealth | Lose potions |
| Humanoid | Adds skulls to buildings |
| Beast | Lose extra warriors |
| Undead | Lose spirit |

## Adversaries

8 adversaries, all level 5. An adversary is fought as the final battle, which draws 5 battle cards (see [game-overview-and-rules.md](game-overview-and-rules.md)). Each has two "When battling" effects of its own, plus an event.

| Adversary | Combat type | Foe type | When battling | Event |
|---|---|---|---|---|
| Ashstrider | Magic | Beast | Adds skulls to buildings; hurts heroes in the current kingdom by its skull count | Adds skulls to buildings |
| Bane of Omens | Stealth | Humanoid | Gives corruptions; targets the hero with the Black Mark | Attacks the hero with the Black Mark |
| Empress of Shades | Stealth | Undead | Takes a huge toll on warriors; targets heroes in the current kingdom | Unleashes plagues in your kingdom, making losses worse |
| Gaze Eternal | Magic | Humanoid | Makes you lose potions; turns heroes in the current kingdom by the Tower glyphs | Manipulates the Tower to cause disaster |
| Gravemaw | Melee | Beast | Makes you lose a huge number of warriors; hurts heroes by the number of foes on the board | Mutates foes, adding new battle cards to their decks |
| Isa the Exile | None | Humanoid | Makes you lose spirit; steals items from other heroes and blocks their use | Moves structures |
| Lingering Rot | Melee | Undead | Gives spore tokens; targets heroes with spore tokens | Gives spore tokens |
| Utuk-Ku the Ice Herald | Magic | Undead | Makes you lose spirit; spawns frozen in the current kingdom | Reduces the Advantages you can spend per action |

Isa's card shows one trait, Humanoid, and no combat type. Several adversaries name pieces from quest items: the Black Mark (Bane of Omens), spore tokens (Lingering Rot) and the Bezoar's Empress of Shades events (see [items-and-virtues.md](items-and-virtues.md#quest-items)).

## Companions

10 companions. Each brings Advantages and an ability, belongs to one main goal, and has an event.

| Companion | Advantages | Ability | Main goal | Event |
|---|---|---|---|---|
| Gleb the Outlaw King | +2 Humanoid | End your turn in the mountains: gain 6 warriors | Raise an Outlaw Army | Gleb provides warriors |
| Grigor the Unbreakable | +2 Melee | Spend 1 spirit for +1 Wild, up to 3 times per turn | Break Grigor's Ensorcellment | Grigor removes foes from the board |
| Hakan the Artificer | +2 Wild on spaces with buildings | Once per turn, spend 2 potions to gain the top treasure | Forge an Alchemical Solution | Hakan changes gear into potions |
| Letha the Dryad | +2 Beast | End your turn in a forest: gain 6 warriors | Assemble an Army of Trees | Letha weakens beasts |
| Miras the Horselord | +2 Wild in grasslands | End your turn in the grasslands: gain 6 warriors | Destroy the Evil Relics | Miras moves foes around the board |
| Nimet the Fathomless | +2 Magic | Once per turn, spend 3 spirit to place a seal on the Tower | A Heroic Beginning | Nimet changes treasures into spirit |
| Tomas the Scout | +2 Stealth | Doubling your move costs no spirit | Delve the Three Dungeons | Tomas moves heroes around the board |
| Vasa the Divine | +2 Undead | Glyphs facing you cost no spirit; after an action matching such a glyph, gain 1 spirit | Beseech the Gods of Light | Vasa removes corruptions |
| Yana the Assassin | +2 Wild against the adversary | Gain at most 1 corruption when you battle a level 2, 3 or 4 foe | Make a Deal with Darkness | Yana vanishes foes before they spawn |
| Zaida the Efreet | Once per turn, spend 1 treasure for +3 Wild | None | Recover Azkol's Treasures | Zaida gives treasures |

The companion cards name 10 different main goals, one each. The component inventory's earlier count of 9 main goals was unverified. *Recover Azkol's Treasures* is the recommended first game.

## Reading the cards

Bob's three lists match the card images except in two places, and the card wins:

- **Oreks**, not "Orreks". Bob corrected this himself on 2026-10-27. The images in the zip were already full-card close-ups showing "OREKS", so they are kept as they are.
- **Utuk-Ku the Ice Herald**, not "Utukku". The card shows the hyphen.

## Notes for Bloodtower

- **DEC-325 counts Brigands and the Dragon twice.** It adds the 1981 Brigands and Dragon to RtDT's 12 types, but RtDT's 12 already include both (Brigands at level 2, Dragon at level 4). Either the "plus" is only the 1981 names and sounds on RtDT's cards, or the engine has 12 types, not 14. Bob to rule.
- **One ability per foe type (DEC-311)** fits RtDT's event line: each foe card already has exactly one event.
- **Trait effects run on dropped systems.** Losing gear, potions, spirit or warriors, and the Tower manipulation, need the same translation as the items in [item-fit.md](../game-design/item-fit.md): warriors become hit points and spirit becomes money.
- **Companions hold like items.** A companion is a card a hero keeps, with Advantages and an ability, so it could follow the same physical-card behaviour as the items.

## Card images

One PNG per card face, cropped from Bob's photos. They are in `cards/` under Bob's backup folder (`~/Library/CloudStorage/OneDrive-Personal/Backups/BloodTower/reference/return-to-dark-tower/`, see [the README](README.md#copyrighted-material-not-in-the-repo)).

| Path in the backup folder | Files |
|---|---|
| `cards/foes/<Name>/` | `Front.png` and `Back.png` for each of the 12 foes, for example `cards/foes/Oreks/Front.png` |
| `cards/adversaries/<Name>/` | `Front.png` and `Back.png` for each of the 8 adversaries |
| `cards/companions/<Name>/` | `Front.png` and `Back.png` for each of the 10 companions |
| `cards/foes.csv`, `cards/adversaries.csv`, `cards/companions.csv` | Bob's reference lists, with the Oreks and Utuk-Ku spellings corrected |
| `cards/archives/` | Bob's original zips and CSVs, as he sent them |
