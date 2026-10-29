# Element crosswalk: RtDT, DT81 and Bloodtower

Status: **draft for Bob's review**, 2026-10-22; names updated 2026-10-23 (DEC-509 to DEC-529).

**Snapshot.** Ported on 2026-10-28 from the unmerged branch `chore/design-session-2026-10-22d`, as it stood on 2026-10-23. It uses the renamed words, which the cards do not use yet (Q-328), and it does not include design rulings made after 2026-10-23.

Every game element in *Return to Dark Tower* (RtDT, base box unless marked), *Dark Tower* 1981 (DT81) and Bloodtower (BT), lined up by what it does. It is an outer join, so a blank cell means that game has no such element. **Kind** is the class of element and **Element** is the item within it. BT cells name the deciding cards. *(proposed)* or *(open)* means the card isn't decided yet.

Sources: [component-inventory.md](../return-to-dark-tower/component-inventory.md) and [game-overview-and-rules.md](../return-to-dark-tower/game-overview-and-rules.md) for RtDT, [dark-tower-1981/NOTES.md](../dark-tower-1981/NOTES.md) for DT81, and the cards for BT.

## Board and places

| Kind | Element | RtDT | DT81 | Bloodtower | Notes |
|---|---|---|---|---|---|
| Board | Board | Circular, 4 kingdoms × 15 spaces = 60 | Circular, 4 kingdoms around the tower | The RtDT board with RtDT names (DEC-058, AST-B01) | |
| Board | Kingdom | North, South, East, West | Arisilon, Brynthia, Durnin, Zenon, each with a flag | RtDT's four. One opens per chapter and old ones stay walkable (DEC-134, DEC-146) | |
| Board | Terrain | Desert, Hills, Mountains, Lake, Forest, Grasslands | | On the board, no rule uses it yet | Covenant wastelands remove terrain |
| Board | Frontier | Rivers between kingdoms, no rule | Frontier: crossing needs that kingdom's key | A chapter opens the next kingdom (DEC-146). Keys in MEC-009 *(proposed)* | |
| Board | Wild space | Any space, nothing happens | Territory: a random event on entry | Wild: an event where a group ends its day (DEC-017, DEC-080) | |
| Board | Trade route | Caravan tokens (scenario only) | | Caravans move along their kingdom's route (DEC-090) | |
| Building | Citadel | Hero start. Reinforce: 1 potion, or 5 spirit for a virtue | Home citadel, where you start. Re-entering with 5–24 warriors doubles them | Lord's audience, a rally that heals, potions. The only seller of potions and healing (AREA-071, DEC-158, DEC-161) | DEC-161 conflicts with DEC-097, MEC-021 and MEC-022; resolved in the DEC-352 card audit, 2026-10-27 |
| Building | Sanctuary | Reinforce: 1 spirit, or 5 spirit to remove all corruptions | Tops you up when low: warriors under 5, gold under 8, food under 6 | Lore and prophecy. Removes corruptions for gold, one at a time (AREA-072, DEC-163, DEC-170, DEC-171) | |
| Building | Village | Reinforce: 6 warriors, or 1 spirit for 12 | | Street NPC gives rumours. Tavern rest heals for moves (AREA-073, DEC-172–174) | DEC-173 conflicts with DEC-008 and DEC-164; resolved in the DEC-352 card audit, 2026-10-27 |
| Building | Bazaar | Reinforce: 1 gear, or 2 spirit for a treasure | Buy warriors, food, beast, scout, healer. Haggle. It can close on you | Trade, fortune teller, fence with cursed items (AREA-074, DEC-165–168) | |
| Building | Tomb | | Treasure, a brigand battle or nothing | Tomb quest (Undead): dungeon crawl (MEC-026) | BT moved it from building to quest |
| Building | Ruin | | Treasure, a brigand battle or nothing | Ruins quest (Stealth): riddle of the keys (MEC-030) | |
| Building | Dark Tower | Tower in the centre. Competitive Tower dungeon | Final battle against the brigand guard | Adversary finale battle (DEC-051) | |
| Building | Destruction | 4th skull destroys it. Home hero takes a corruption | | Skulls shrink the menu and add danger, the 4th destroys (DEC-093). A whole kingdom lost = loss (DEC-044) | |
| Place | Sub-location | | | Tavern, merchant, chapel… inside a building (IDEA-006, MEC-019 *(proposed)*) | BT only |
| Place | NPC | | | Every building has NPCs. Met ones stay on the menu (DEC-162, DEC-181) | BT only |
| Place | Dungeon token | 6, each with a trait | | Marks a story spot in the wild (DEC-089) | |
| Place | Quest marker | 3: companion quest, adversary quest, main goal | | Lead markers only (DEC-087, IDEA-003) | DEC-001's objective/lure/hunter parked |

## Heroes

| Kind | Element | RtDT | DT81 | Bloodtower | Notes |
|---|---|---|---|---|---|
| Hero | Roster | Brutal Warlord, Orphaned Scion, Relic Hunter, Spymaster | One generic player per kingdom | A pool of 6 classes: fighter, healer, magic user, scout, ranger, scholar (DEC-099, DEC-100) | DEC-100 conflicts with DEC-125; resolved in the DEC-352 card audit, 2026-10-27 |
| Hero | Party | 1–4 heroes, each on their own | 1–4 rivals | 1–4 heroes in groups that split and join (DEC-031) | |
| Hero | Hero board | Move value, banner action, slots | Pegs on the tower's inventory | None. The app tracks everything (AST-B16 *(proposed)*) | |
| Hero | Attribute | | | None (DEC-125). DEC-096 and DEC-101 parked | |
| Hero | Class number | | | Each class's fight number (DEC-130) | |
| Virtue | Hero virtue | 3 per hero. Unlock one for 5 spirit at a citadel | | 6 per class: 2 active, 4 to unlock (DEC-156, DEC-126) | |
| Virtue | Kingdom virtue | 1 per kingdom | | | Not carried over |
| Virtue | Gaining one | Citadel Reinforce only | | Bought at the citadel or earned in the story (DEC-127) | |
| Magic | Spell | Covenant: Astromancer spell cards | Wizard: curses another player | Spell virtues: Lightning, Fireball, Magic Missile (DEC-121, DEC-123) | |
| Magic | Mana | | | None. Uses per battle are the only limit (DEC-122, DEC-124) | DEC-124 conflicts with DEC-039, DEC-054, DEC-097; resolved in the DEC-352 card audit, 2026-10-27 |
| Ally | Companion | 10 cards, from quests | | One per hero at most, written by the story, with loyalty (DEC-065, DEC-066, DEC-070–072) | Loyalty is Q-036 *(open)* |
| Ally | Hired help | | Scout and healer, bought at the bazaar | Bazaar hired help in MEC-023 *(open)* | |
| Ally | Guild | Alliances: 4 guilds, raised with influence | | | |

## Resources

| Kind | Element | RtDT | DT81 | Bloodtower | Notes |
|---|---|---|---|---|---|
| Resource | Health | Warriors, 7 to start | Warriors, 10 to start | Hit points (DEC-039, IDEA-009) | Warrior tokens parked (AST-B06) |
| Resource | Falling | Can't pay a loss: corruption | Out of warriors: out of a solo game | 0 HP: a corruption, sit out, back at 1 HP (DEC-119) | |
| Resource | Spirit | Doubles a move, pays enhanced options, +2 per heroic action | | None | Spirit tokens parked (AST-B07) |
| Resource | Gold | | Gold, 30 to start | Gold (DEC-511) in one purse, shared on screen, tracked per hero (DEC-007, DEC-176) | |
| Resource | Starting gold | | Fixed 30 | Tower fortune wheel, with a floor (DEC-114, OPT-007) | |
| Resource | Carrying limit | | Each warrior carries 6 gold, the beast 50 | | |
| Resource | Food | | 25 rations, each feeds 15 warriors a turn | | |
| Resource | Influence | Alliances: shared | | | |
| Resource | Corruption | 12 cards. A 3rd loses | | Kept: a 3rd loses (DEC-043). From 0 HP and cursed items (DEC-119, DEC-169) | |
| Resource | Moves | Move value. Spirit doubles it | One space a turn | A seeded roll each day, ± virtues and corruptions. Pays for spaces and actions (DEC-034, DEC-078, DEC-102) | |

## Items

| Kind | Element | RtDT | DT81 | Bloodtower | Notes |
|---|---|---|---|---|---|
| Item | Potion | 18, any number. Free at the citadel | | Citadel sells them. Low-foe loot (DEC-161, DEC-120) | |
| Item | Gear | 18 (6 × 3), one of each | | Middle-foe loot (DEC-120) | |
| Item | Treasure | 22, max 4. Market of 3 | Treasure from a tomb or ruin | Top-foe loot (DEC-120) | |
| Item | Quest item | 20 | | The story's named items (DEC-054) | |
| Item | Key | | Brass, silver, gold, one per foreign kingdom, in that order | Kingdom keys earned by chapter quests (MEC-009 *(proposed)*) | |
| Item | Sword | | Dragonsword: drives off the dragon | | |
| Item | Pegasus | | Battle reward: a flight [unverified] | | |
| Item | Beast | | Carries 50 gold | | |
| Item | Scout | | Cancels Lost, gives an extra turn | Scout class is the counter to Lost (DEC-100, DEC-027) | DT81 item became a BT class |
| Item | Healer | | Cancels plague, +2 warriors | Healer class is the counter to plague (DEC-100, DEC-027) | DT81 item became a BT class |
| Item | Cursed item | | | Fence items. Curse hidden until used, gives a corruption (DEC-167–169) | |
| Item | Wand | Covenant: wands with charges | | | |
| Item | Card effects | Printed on the card | | Fixed effect kinds with size and timing, applied by the app (DEC-067, DEC-069) | |

## Foes

| Kind | Element | RtDT | DT81 | Bloodtower | Notes |
|---|---|---|---|---|---|
| Foe | Type | 12, e.g. Brigands, Oreks, Dragons | Brigands only | Foe cards keep RtDT traits (DEC-068) | |
| Foe | Level | 2, 3 or 4. Adversary is 5 | Game level 1–4 sets the brigand count (16–64) | Party strength vs level sets the odds (DEC-014). +1 per chapter, plus a difficulty offset (DEC-185) | |
| Foe | Numbers | One foe | A count, halved on each won round | A foe with a count; horde is one group noun (DEC-013, DEC-514) | |
| Foe | Trait / Advantage | Beast, Magic, Humanoid, Melee, Undead, Stealth, Wild | | Kept. Automatic or conditional (DEC-068, DEC-128) | |
| Foe | Status | Panicked → unsteady → ready → savage → lethal | | | |
| Foe | On the board | 65 tokens | | AST-B05 *(proposed)* | |
| Foe | Dragon | A foe type | Takes 25% of gold and warriors unless you hold the sword | Disaster: a boss-level foe (DEC-028) | |
| Adversary | Big bad | Adversary: 8, level 5, spawns after the main goal | Defenders of the Dark Tower | One adversary per story, on the board. It hunts the most-skulled building (DEC-051–053) | |
| Adversary | Lieutenant | | | The engine has them. The story places them (DEC-074) | |
| Adversary | Traitor / spy | | | Looks friendly until unmasked (DEC-076, DEC-182–184) | |
| Adversary | Adversary quest | Monthly adversary quest with a penalty | | Story writes them, engine runs the deadline (DEC-075) | |

## Fights

| Kind | Element | RtDT | DT81 | Bloodtower | Notes |
|---|---|---|---|---|---|
| Battle | Loop | Face-down app cards, one per foe level | Rounds: a won one halves the brigands, a lost one costs 1 warrior | Rounds of Fight or Run, one action per hero (MEC-024, MEC-038, DEC-118) | |
| Battle | Round actions | Advantage arrows on each card | | Attack, spell, conditional Advantage, potion, guard virtue (DEC-129) | |
| Battle | Retreat | Adversary only, after one card | Costs 1 warrior | Free after any round. The foe stays and grows (DEC-016) | |
| Battle | Reward | | Gold, sword, wizard, key, pegasus or nothing | Gold plus one card by foe level (DEC-120) | Amounts are Q-049 *(open)* |
| Battle | Who fights | The active hero | The active player | Heroes on the space (DEC-010) | |
| Battle | Group falls | | | The purse loses gold set by foe level (DEC-175–179) | |

## Events

| Kind | Element | RtDT | DT81 | Bloodtower | Notes |
|---|---|---|---|---|---|
| Event | Nothing happens | | Safe move | Quiet: a mood line (DEC-030) | |
| Event | Foes | Foes spawn after a skull drop | Brigands | Foes: fight, go around or pay (DEC-023, DEC-520) | |
| Event | Strangers | | | Strangers: one offer, 2–3 choices (DEC-024, DEC-520) | |
| Event | Plague | | −2 warriors unless you have a healer | Hazard (DEC-022, DEC-027) | |
| Event | Lost | | Back to where you came from, lose a turn, unless you have a scout | Hazard (DEC-022, DEC-027) | |
| Event | Storm | | | Hazard (DEC-022) | BT only |
| Event | Dragon | | Dragon attack | Disaster (DEC-028) | |
| Event | Find | | Treasure from a tomb or ruin | Windfall (DEC-029) | |
| Event | Cursed | | Another player's wizard takes 25% | | Competitive only. IDEA-018 |
| Event | Starving | | No food: −1 warrior a turn | | |
| Event | Foe strike | Each foe type's strike event | | | |
| Event | Going around | | | Always possible, at a cost (DEC-018) | |

## Story, quests and pacing

| Kind | Element | RtDT | DT81 | Bloodtower | Notes |
|---|---|---|---|---|---|
| Time | Big unit | Months, 6 at most | | Chapters, one per kingdom, harder each time (DEC-133) | |
| Time | Turn | One hero's turn | One player's turn | A day: every group acts, then a skull drops (DEC-033, DEC-064, DEC-085) | |
| Time | Limit | Month 6 ends the game | None | None. The board shows Day N (DEC-113) | |
| Quest | Main goal | 9 in the base box | Get 3 keys, then win at the tower | The story's quests in chapters, last is the finale (DEC-040, DEC-041) | |
| Quest | Companion quest | Monthly, reward | | Story decides how companions join (DEC-065) | |
| Quest | Lead | | | An NPC reveals a quest marker for a few turns (DEC-087, DEC-180) | |
| Quest | Rumour / nugget | | | Stories write 100–500. NPCs trust levels (IDEA-016, DEC-026) | |
| Quest | Riddle of the keys | | Key order for the tower, random each game | Ruins quest on the drums (MEC-030) | |
| Quest | Dungeon | App rooms, one Advantage per room | | Six types: Tomb, Cave, Encampment, Fortress, Ruins, Shrine (DEC-063, MEC-026–031) | |
| Quest | Plain scene | | | A plain scene (DEC-063) | |
| Quest | Monument | Covenant: build with offerings | | | Generic "restore a site" in rtdt-subsystems.md |
| Rule | Win | Main goal, then beat the adversary | First to win the tower battle | Win the finale against the adversary (DEC-042, DEC-051) | |
| Rule | Lose | 3rd corruption, empty skulls, end of month 6 | | 3rd corruption, empty skulls, fallen buildings (DEC-043, DEC-044) | |
| Rule | Instant-loss guard | | | No single random effect loses the game (MEC-013 *(proposed)*) | |
| Rule | Difficulty | Heroic or Gritty | Levels 1–4 (4 is a tutorial) | Easy, normal or hard (DEC-059) | |
| Rule | Length | | | Short, standard or long (DEC-050) | |
| Rule | Seed | 12 characters | | Game seed (DEC-011) | |
| Rule | Mode | Co-op, solo or competitive | Competitive | Co-op. Competitive later (IDEA-018) | |

## Actions

| Kind | Element | RtDT | DT81 | Bloodtower | Notes |
|---|---|---|---|---|---|
| Action | Move | Up to move value | One space | Moves pay for spaces and building picks (DEC-078) | |
| Action | Cleanse | Heroic: clear a building's skulls | | No decided card. Only MEC-015 *(proposed)* | Gap: Q-326 |
| Action | Battle | Heroic action | Tower keypad | Starts from an encounter, event or quest (DEC-136) | |
| Action | Quest | Heroic action | | A quest marker in the encounter menu (DEC-083, DEC-524) | |
| Action | Reinforce | At any building, free or enhanced | | Each building type's own Reinforce (DEC-157, DEC-526) | |
| Action | Haggle | Die before a Reinforce | Bazaar keypad, ~50% chance per press, can close the bazaar | Die at a merchant (DEC-091) | |
| Action | Trade | Once a turn with heroes on your space | | Free: the purse is shared (DEC-176) | |
| Action | Banner | Once a turn, on the hero board | | | Gap: Q-327 |
| Action | Rest | | | Tavern: moves for hit points (DEC-174) | |
| Action | Talk | | | NPCs, with hero actions unlocked by clues (DEC-181, DEC-182) | |

## Tower

| Kind | Element | RtDT | DT81 | Bloodtower | Notes |
|---|---|---|---|---|---|
| Tower | Skull | 24. One dropped each turn | | One drop ends each day. Players pick the building (DEC-064, DEC-092) | |
| Tower | Seal | 12, removed at the app's call | | Keep or not is still open (AREA-055, Q-014, Q-032) | |
| Glyph | Cleanse | While it faces your home kingdom, that action costs 1 spirit | | GLY-001 *(open)*, MEC-016 *(proposed)* | MEC-016 still names spirit |
| Glyph | Quest | Same | | GLY-002 *(open)* | |
| Glyph | Battle | Same | | GLY-003 *(open)* | |
| Glyph | Banner | Same | | GLY-004 *(open)* | No BT banner action |
| Glyph | Reinforce | Same | | GLY-005 *(open)* | Each building's Reinforce (DEC-526) |
| Tower | Drums | 3, turn to route skulls | One drum of backlit picture cels | 3 (DRM-001–003). May turn during play (DEC-006). Synced at calibrate (DEC-103) | |
| Tower | Lights | LEDs | Backlit pictures | LGT-, LFX-, LSQ- cards | |
| Tower | Sound | Sound pack | Square-wave tones | SND- cards. A default cue for every moment (DEC-055) | |
| Tower | Input | Skull sensor | 16-key keypad | Skull sensor, plus iPad taps (MEC-018 *(proposed)*) | |
| Tower | Display | Companion app | 2-digit LED | iPads and the Story board on the TV (DEC-060) | |
| Tower | Fortune wheel | | | Spins the starting purse (OPT-007, DEC-114) | BT only |

## Terms: Bloodtower names against the originals

DEC-509: Bloodtower uses the original names where a concept matches. This lists every Bloodtower term from the glossary and the cards. **Rename?** marks a Bloodtower word that differs from an original name for the same thing, or clashes with one.

| BT term | Means in BT | RtDT name | DT81 name | Rename? | Cards |
|---|---|---|---|---|---|
| Hit points | A hero's health | Warriors | Warriors | Kept: one person, not an army (DEC-510) | DEC-039, IDEA-009 |
| Money, purse | The party's money | | Gold | Gold, kept in the purse; a story may rename it (DEC-511) | DEC-007, DEC-176 |
| Fight / battle | The round loop | Battle | Battle | Battle; Fight is only the round choice (DEC-512) | MEC-024, MEC-038 |
| Run | Leave a fight | Retreat | Retreat | Retreat: Fight or Retreat (DEC-513) | DEC-016, DEC-118 |
| Horde | The foes in one fight, as a count | Foe | Brigands | Foe; horde is one group noun (DEC-514) | DEC-013 |
| Bounty | What a won fight pays | | Reward | Reward (DEC-516) | IDEA-002, DEC-120 |
| Villain | The story's big bad | Adversary | | Adversary (DEC-515) | DEC-051 |
| Villain's quest | A quest with a deadline and a penalty | Adversary quest | | Adversary quest (DEC-515) | DEC-075 |
| Quiet | An event where nothing happens | | Safe move | Kept: events fire at day's end, not on a move (DEC-517) | DEC-030 |
| Windfall | A lucky find | | Treasure | Kept: treasure is the card type (DEC-518) | DEC-029 |
| Disaster | The dragon-sized event | | Dragon | Type kept; the Dragon is its base disaster (DEC-519) | DEC-028 |
| Cursed item | An item with a hidden curse | | *Cursed* is the wizard's attack | Kept: no wizard attack in co-op (DEC-522) | DEC-167–169 |
| Set piece | A story's own scene | Quest, dungeon | | Quest (DEC-523) | MEC-011, DEC-063 |
| Story point | Where a set piece is this turn | Quest marker's space | | Quest marker (DEC-524) | DEC-021, DEC-083 |
| Lead (marker) | An optional quest marker an NPC reveals | Quest marker | | Lead is the tip; it opens a side quest (DEC-525) | DEC-087 |
| Base action | A building's own action | Reinforce | | Reinforce (DEC-526) | DEC-157 |
| Building pick, story pick | What a group does at a place | Heroic action | | Action, with RtDT's names (DEC-527) | DEC-078 |
| Moves | How far a group goes this day | Move value | | Same idea | DEC-034, DEC-078 |
| Day | One round of every group | Turn (one hero) | Turn | Different unit | DEC-085 |
| Chapter | A story section, one kingdom | Month | | Chosen on purpose (DEC-133) | DEC-133 |
| Class | A hero's role | Hero (a named character) | | Kept: a new concept (DEC-528) | DEC-100 |
| Present heroes | Heroes on the space | Heroes on your space | | Same idea | DEC-010 |
| Event | A random thing in the wild | Event (the tower's, after a drop) | Event | Event is ours; RtDT's after-drop ones are tower events (DEC-521) | DEC-017, DEC-081 |
| Encounter | A group's visit to a place, with its menu | | | Kept for the visit; the wild event types are now foes and strangers (DEC-520) | DEC-081, IDEA-014 |
| Hazard | Plague, lost, storm | | Plague, Lost | Group word, keeps DT81 names | DEC-022 |
| Counter | What cancels a hazard | | Scout, healer | New | DEC-027 |
| Hunter | Old word for a hero (Dracula) | Hero | Player | Hero (DEC-509). Still in MEC-001, MEC-003 | MEC-001, MEC-003 |
| Lieutenant | A villain's officer | | | New | DEC-074 |
| Traitor, spy | A hidden evil NPC | | | New | DEC-076 |
| NPC | A person at a place | | | New | DEC-162 |
| Rumour, nugget, clue, lore | Pieces of information | | | Nugget inside; rumour, lore or prophecy by source; may carry a clue or lead (DEC-529) | IDEA-016, DEC-164, DEC-182, DEC-171 |
| Group | Heroes travelling together | | | New | DEC-031 |
| Party | All the heroes | | | New | |
| Engine, story, feature, seed | Framework words | Seed | | Seed matches | DEC-011, IDEA-008 |
| Loop, entry point, story beat | Engine structure | | | New | DEC-132, DEC-138 |
| Fortune wheel | Spins the starting purse | | | New | OPT-007 |
| Advantage, corruption, virtue, potion, gear, treasure, skull, seal, glyph, citadel, sanctuary, village, bazaar, haggle, foe, companion, dungeon, spell | | Same | | Same | |
