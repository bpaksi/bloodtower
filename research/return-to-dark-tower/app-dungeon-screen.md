# RtDT dungeons: the app screen and the rooms

How a Return to Dark Tower dungeon plays: the app's screen, a visit step by step, and every room's text. The screen part is written from a screenshot Bob took on his iPad on 2026-10-28. Bob: "I like this a lot and is fun to play. I want the design to start here." The Tomb set piece starts from this screen (DEC-487).

The image is RtDT art, so it lives in the backup folder (see [README.md](README.md)): `screens/app-dungeon-tower-of-the-guardians.png`.

## What the screen shows

| Part | What it shows |
|---|---|
| Top bar | "Exit Dungeon" with a back arrow at the left, the dungeon's name in the middle ("Tower of the Guardians"), and a menu icon at the right |
| Map | A black framed panel with a **top-down floor plan**. Rooms are stone squares joined by short corridors. Only the rooms found so far are drawn: four here, three in a row with one below the left room |
| Current room | The room the hero stands in glows with warm torchlight. The other found rooms are dim |
| Open ways | Small gold sigils sit outside the open doorways that lead to rooms not yet found: above, left of and below the explored rooms. They are probably the next rooms to pick (not confirmed) |
| Backdrop | A dark landscape behind the map, with the Tower glowing red on the right, and the space's terrain named beside it ("Open Field") |
| Bottom line | "1 Advantage Applied", with its type, "Humanoid", under it |

## How it reads

- **One picture:** the map grows room by room, so how far the hero has come is plain at a glance. The target room is not shown until it is found.
- **The choice is spatial:** the player picks which doorway to try next, not just "deeper or leave". Leaving is always on the screen (Exit Dungeon).
- **The Advantage is visible:** the screen says how many Advantages are on the current room and of which type. In RtDT each room can be improved once ([game-overview-and-rules.md](game-overview-and-rules.md), p15–19).
- **Progress is kept:** cleared rooms stay cleared for the next visit and for other heroes ([companion-app.md](companion-app.md)).

## How a visit plays

Bob's research, 2026-10-28, from the [two-page rules](https://restorationgames.com/wp-content/uploads/2022/05/Return_to_Dark_Tower-rules-two-page.pdf) and the [rulebook on manuals.plus](https://manuals.plus/m/2a1d6166a6d21dbbf19d1ee06a98b3b7c7232187ffb504d8e7c0a96429583d2b). A dungeon is a **push-your-luck** branching map. The aim is to find and clear one target room, not to explore every room.

1. **Enter:** a quest puts the dungeon on the board. The hero takes the Quest action there and picks the dungeon in the app.
2. **Pick a room:** the app shows the rooms found so far and the unexplored ones beside them. Tapping one enters it and reveals what happens. The paths branch, as on the map above.
3. **Improve it (optional):** spend one matching Advantage to turn the room's result into a better one. The rules' example turns losing warriors into gaining a potion. Each room can be improved once, and a spent Advantage cannot be taken back.
4. **Resolve it:** apply the gains or losses to the physical pieces. A hero who cannot pay a loss in full pays what they can and gains a corruption. The room is then cleared.
5. **Go on or leave:** after a room the hero may try another or stop. Clearing the target room finishes the dungeon and its quest.

**Coming back:** cleared rooms stay cleared, even for another hero. One hero can open part of a dungeon and another can finish it later. The core choice is to keep spending now to find the target, or to keep your strength and come back better prepared.

**Feel:** a branching exploration puzzle with resource management, not a tactical crawl. The play is picking paths, revealing room outcomes and choosing where to spend Advantages. Nothing moves square by square, and no hero is positioned for a fight.

**No single meter:** each room's outcome is a gain or a loss of the hero's own resources (warriors, spirit, items). The pressure comes from those running low and from corruption when a loss can't be paid.

## The rooms

The room texts come from `ultimatedarktowerdata` 3.0.0 (`dist/dungeons.js`), a pinned dependency of this repo, and were read on 2026-10-28. Each type has one entrance and 12 rooms, 78 entries in all. Inside a dungeon only the matching Advantage type can be spent. "As found" is what the room does; "Improved" is what it does instead once one Advantage is spent on it.

**What the data shows:**

- **A room is a flat outcome, never a fight or a trap.** No room starts a battle, rolls a chance or springs anything. Almost every room is a loss: warriors, sometimes spirit, potions, gear or items. A few are softened by holding a named gear card ("unless you have longswords"), and a few offer a choice ("9 warriors or 2 gear").
- **An Advantage turns a loss into a gain.** The improved text is almost always a small reward: warriors, spirit, a potion, a gear card or the top treasure.
- **Warriors are the meter in practice.** Most of the cost is in warriors, so the hero's warrior count is what runs out.
- **Nothing in the data marks a target room.** The P-02 prototype treats The Final Guardian as the tomb's target, and that is a guess. Which room is the target, and how the map is laid out, comes from the app at play time.

### Tomb (Undead Advantage)

Entrance: "The chamber is musty and stale, a layer of dust confirms that no one has set foot here in ages."

| Room | As found | Improved by one Advantage |
|---|---|---|
| Ceremonial Ossuary | Lose 8 warriors. | Gain 1 spirit and 1 warrior. |
| Corrupted Shrine | Lose 1 spirit and 1 warrior. | You may gain 1 spirit and 1 blessed sceptres gear card. |
| Embalming Chamber | Lose 1 spirit and 2 warriors. | Gain 1 potion. |
| Foreboding Sigils | Lose 6 warriors. | Gain 1 spirit. |
| Offering Table | Lose 2 potions and 2 warriors. | Gain 2 potions. |
| Ominous Warning | Lose 5 warriors. | Gain 2 warriors. |
| Empty Sepulchre | Lose 6 warriors. | Gain 1 warrior. |
| Ritual Circle | Lose 2 spirit and 3 warriors. | Gain 2 spirit. |
| Shattered Sarcophagi | Lose 2 spirit and 2 warriors. | Spend 1 spirit to gain the top card of the treasure deck. |
| The Final Guardian | Lose 5 warriors and 1 spirit. | Gain 2 spirit. |
| The Shambling Reborn | Lose 6 warriors. | Gain 1 spirit. |
| Voracious Beetles | Lose 4 warriors. | Gain 2 warriors. |

### Cave (Beast Advantage)

Entrance: "A dank wind whistles, growing louder as you enter the gloom."

| Room | As found | Improved by one Advantage |
|---|---|---|
| Craggy Crevasse | Lose 5 warriors. | Lose 1 warrior. |
| Crimson Bat Cave | Lose 6 warriors and 1 spirit. | Lose 2 warriors. |
| Jaryx Lair | Lose 9 warriors or 2 gear. | Gain 5 warriors. |
| Moonbound Centipedes | Lose 6 warriors. | Gain 1 potion. |
| Murky Crevasse | Lose 12 warriors unless you have dusky cloaks. | Gain 2 warriors. |
| Noxious Spores | Lose 1 spirit and 1 warrior. | Gain 1 spirit. |
| Pack of Wild Rangos | Lose 12 warriors unless you have longswords. | Gain 3 warriors. |
| Tight Passageways | Lose 2 spirit and 2 warriors. | Gain 1 spirit. |
| Treasure Hunter | Lose 1 item. | Gain the top card of the treasure deck. |
| Underground River | Lose 6 warriors. | Gain 2 warriors. |
| Unstable Cavern | Lose 6 warriors. | Gain 1 warrior. |
| Widowmade Serpent | Lose 6 warriors or 2 potions. | Gain 2 potions. |

### Encampment (Humanoid Advantage)

Entrance: "You can hear rowdy song and the clang of metal through the walls of the roughly built structures surrounding the campfires."

| Room | As found | Improved by one Advantage |
|---|---|---|
| Barracks | Lose 8 warriors. | Lose 1 warrior. |
| Brig | Lose 8 warriors. | Gain 1 warrior. |
| Deep Well | No losses. | Gain 1 spirit and 1 potion. |
| Dusty Pathway | Lose 1 gear. | No losses. |
| Galley | Lose 1 spirit and 3 warriors. | No losses. |
| Garrisoned Soldiers | Lose 9 warriors. | Gain 4 warriors. |
| Lookout Tower | No losses. | Gain the top card of the treasure deck. |
| Open Field | Lose 5 warriors and 1 spirit. | No losses. |
| Quartermaster's Tent | Lose 5 warriors. | No losses. |
| Spiked Barricade | Lose 8 warriors. | Lose 2 warriors. |
| Training Grounds | Lose 6 warriors. | You may gain 1 gear. |
| Weapon Racks | Lose 6 warriors. | You may gain 1 gear. |

### Fortress (Melee Advantage)

Entrance: "A rhythmic din echoes through the halls of this imposing structure."

| Room | As found | Improved by one Advantage |
|---|---|---|
| Armory | Lose 3 warriors. | You may gain 1 leather armor gear card. |
| Barracks | Lose 1 gear. | Gain 2 warriors. |
| Captain's Quarters | Lose 2 spirit and 1 warrior. | Gain the top card of the treasure deck. |
| Chapel | Lose 1 spirit. | Gain 1 spirit. |
| Gaol | Lose 1 spirit and 1 warrior. | Gain 2 warriors. |
| Gatehouse | Lose 8 warriors unless you have 4 virtues. | Gain 1 spirit. |
| Infirmary | Lose 1 potion. | Gain 2 warriors. |
| Latrine | Lose 1 potion. | No effect. |
| Map Room | Lose 1 gear. | You may gain 1 trusted maps gear card. |
| Smithy | Lose 2 items. | You may gain 1 Longswords gear card. |
| Training Hall | You may gain 1 leather armor gear card. | Gain 2 warriors. |
| Watchtower | No losses. | Move a foe in your current kingdom up to 2 spaces. |

### Ruins (Stealth Advantage)

Entrance: "Loose rock crunches under your feet and dust chokes your lungs."

| Room | As found | Improved by one Advantage |
|---|---|---|
| Alchemical Storeroom | Lose 2 warriors. | Gain 2 potions. |
| Antechamber | Lose 6 warriors. | Gain 2 warriors. |
| Fighting Pits | Lose 8 warriors. | No losses. |
| Guarded Greathall | Lose 7 warriors. | Lose 1 warrior. |
| Haunted Dormitory | Lose 6 warriors. | Gain 1 warrior. |
| Mysterious Pool | Lose 4 warriors. | Spend 1 potion to gain 4 spirit. |
| Obstructed Passageway | Lose 5 warriors. | Gain 2 warriors. |
| Overgrown Atrium | Lose 8 warriors if you do not have longswords. | Lose 2 warriors. |
| Rotting Larder | Lose 2 spirit and 5 warriors. | Lose 1 spirit. |
| Scriptorium | Lost 1 spirit and 2 warriors. | Spend 1 gear to gain the top card of the treasure deck. |
| Stargazing Chamber | Lose 6 warriors. | Gain 6 warriors. |
| Warded Vault | Lost 5 warriors. | Gain 1 spirit. |

### Shrine (Magic Advantage)

Entrance: "The hairs on your arms and neck stand up as the whole place is suffused with energy."

| Room | As found | Improved by one Advantage |
|---|---|---|
| Casting Hall | Lose 8 warriors. | Gain 1 spirit. |
| Chamber of Gongs | Lose 2 spirit unless you have brass talismans. | Gain 1 spirit if you have brass talismans. |
| Dark Ritual Room | Lose 2 spirit and 6 warriors. | No losses. |
| Grotto of Whispers | Lose 1 spirit unless you have brass talismans. | Gain 5 warriors. |
| Hall of Echoes | Lose 5 warriors. | Gain 5 warriors. |
| Lunar Observatory | Lose 8 warriors. | Gain 2 potions. |
| Overgrown Garden | Lose 1 gear and 3 warriors. | No losses. |
| Sacred Menagerie | Lose 2 spirit or 2 items. | Gain 1 spirit. |
| Secret Altar | Lose 7 warriors. | Lose 1 spirit. |
| Shaded Reliquary | Lose 2 spirit and 3 warriors. | Lose 3 warriors. |
| Sleeping Cells | Lose 6 warriors. | You may gain 1 gear. |
| Reflecting Pools | Lose 1 potion and 1 warrior. | Gain 1 potion. |

## Still not known

- How many of the 12 rooms one visit's map holds. [game-overview-and-rules.md](game-overview-and-rules.md) says the room graphs are app-generated.
- What the gold sigils are exactly.
- How the app picks the target room and lays out the map.

