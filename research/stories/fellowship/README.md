# Story: Fellowship — three-part saga (LOTR-style)

Status: exploring. Nothing here is decided.
Started: 2026-10-13

The shared systems this story runs on (party, shadow clock, open world, resources) are in [../../game-design/core-mechanics.md](../../game-design/core-mechanics.md). The app mockups made for this story are in [../../look-and-feel/](../../look-and-feel/README.md).

| File | What's in it |
|---|---|
| [assets/gandalf-1.mp3](assets/gandalf-1.mp3) | Audio sample |
| [assets/deckard-cain.mp3](assets/deckard-cain.mp3) | Audio sample |

## Givens (from Bob)
- Lord of the Rings style story in 3 parts, each played in a separate session

## Seed ideas (Claude, for reaction)

### Saga structure
- Part 1, "The Gathering": a small company forms, learns of the threat, flees the first hunt. Teaches the systems.
- Part 2, "The Sundering": the company splits across kingdoms. Parallel fronts, war, alliances.
- Part 3, "The Last Ascent": converge on the Tower, carry the burden to the end.
- State carries between sessions (heroes, losses, alliances, how corrupted the bearer is). Saved per campaign.

### The Burden (Ring analog) — parked: Bob wants the LOTR motif, not a replica
- One player carries a relic that must reach the Tower.
- It feeds the tower's corruption mechanic: each use grants power, each turn near the Tower costs something.
- Bearer can be passed to another player at a cost. Possible failure state: the bearer is claimed.

### The Tower as the Enemy's seat
- Tower LEDs as the "Eye": a light sweeps sides, and whatever side it faces is being watched (stealth matters there).
- Skull drops = enemy forces mustering. Where skulls land drives where war breaks out.
- Drum rotations and seals as gates or ancient doors the company must open over the saga.
- Tower sounds for big story beats, web app for ambient music and dialog.

### Original Dark Tower callbacks
- Keys found in ruins/tombs, riddle of the keys to enter the Tower.
- Bazaar haggling, brigands, the dragon, pegasus/scout/healer as allies or helpers.

## Decisions so far (brainstorm-level, not final)
- Tone: LOTR is the motif (epic journey, growing shadow, a company on the road), not something to replicate. No direct Ring analog required.
- The 4 kingdoms are fixed story realms across all 3 parts.
- The clock's authored timeline is written per part.

## Part 1 opening (working from the start, strawman for reaction)
1. Table setup: board out, tower in the center. The app picks a random kingdom, and the party's mini starts at that kingdom's village, in the inn. App shows a title card, music swells, and a narrator sets the scene. A random starting realm means each campaign opens somewhere different.
2. The party: 3 hero characters plus 1 NPC who doubles as narrator. That's 4 avatars, which matches the 4 hero minis.
   - The NPC/narrator is a wandering wizard: an old wizard who knows the keys' history, the LOTR-motif mentor. Speaks, guides, rarely fights. Voices the story, gathers the party, gives lore and riddle clues. Has a mini on the board but isn't a full playable character.
   - Only 1 hero starts in the tavern, and the NPC recruits them. Which hero is in the tavern is dealt by the app each game, so the early game plays differently each campaign. The other 2 are recruited at buildings during Part 1.
   - Recruiting: each hero has a fixed home building type: cleric at a citadel, ranger at a sanctuary, warrior at a bazaar, small hero at a village. The app deals the wizard's chosen 3 each game: 1 waits in the tavern, and the wizard tells the party where the other 2 wait. The 4th hero isn't part of this campaign's story. Replay variety: 4 possible parties x 4 starting realms x which hero is in the tavern.
   - Both recruits wait in the starting kingdom. The fellowship forms locally first, and the journey widens to the other realms after. That makes the starting realm a natural Part 1 opening chapter (tavern, then recruit at 2 of citadel/sanctuary/bazaar/village).
   - Recruiting is automatic: arrive at the building and the hero joins after a short intro scene (portrait, a voiced line, stats). Keeps the opening fast. The cost is the time on the shadow clock spent getting there.
   - The heroes are strangers to each other, but not chosen by chance. The wizard knows exactly which party he wants and went to the tavern specifically to find hero 1. Each hero's backstory includes a suspicion that something was coming, so they were half-expecting the wizard. That's why recruiting is automatic: they've been waiting.
   - The suspicion is a shared dream/omen: all the chosen heroes had the same dream or saw the same omen. It's how the wizard found them, and the dream carries riddle clues. Possible app moment: each recruit's intro replays the dream from their own angle, and together the fragments form the first clue.
   - The fellowship forms over Part 1, one recruit at a time. Recruiting is a reason to visit specific buildings and a soft tutorial for each location type.
   - Idea: the recruits' minis sit on their buildings from the start, so players can see where future companions wait. With the app dealing exactly 3 heroes, this fits the 4 minis: wizard + tavern hero together at the inn, the 2 recruits on their home buildings.
   - Pre-made heroes with set stats, each with a short intro (portrait, stats, one ability). Build-your-own can come later.
   - Hero pool: warrior, ranger/scout, cleric, small unlikely hero. Strawman roles: warrior holds the line; ranger finds paths and spots danger (helps vs. the Eye); cleric handles healing, spirit and seals; small hero is weak in a fight but tied to the central quest, with stealth and resilience.
3. Inciting moment: the wizard walks into the tavern, finds hero 1, and recruits them with a warning that something is coming, but not the whole story yet. The tower wakes for the first time (lights, sound, maybe the drums turn): the shadow has noticed.
   - Good dialog/voice moment: the wizard's opening words in the tavern are the saga's first line of narration.
4. Forming the fellowship: the party travels the starting realm to the other 2 recruits. Along the way, encounters can happen and other NPCs can interact, adding story detail (rumors, hints of the keys, signs of the shadow). This is the tutorial stretch: first move, first sub-location, first check, first clock tick.
5. Chapter end: with all three heroes gathered, the wizard delivers the quest. The opening chapter ends there.
   - The quest (delivered at chapter end): find the keys. Lost keys/relics are needed to face the Tower, a direct callback to the original game's riddle of the keys. Gives the open world a purpose: keys are hidden in sub-locations across the realms.
   - Keys plus riddle: finding the keys isn't enough. The party also has to learn the right order or combination, like the original's key riddle. Clues come from NPCs (the wandering wizard especially), lore and ruins, which gives dialog a real job. Possible tower tie-in: the riddle is solved at the Tower by turning drums or opening seals in the right sequence.

## Open questions
- The shared dream: what is in it, and which riddle clue does it hold?
- Which NPCs appear while the fellowship forms, and what do they reveal?
- What happens right after the quest is delivered: where does chapter 2 begin?
- Flavor of each of the 4 realms? (Starting realm is random, so each needs its own inn scene.)
- Familiars: who has them, what do they do?
- Does the hero not dealt this campaign appear anywhere (cameo NPC, rival), or are they simply absent?
- What does the wizard do mechanically (gives checks a bonus? a limited spell or two? only talks)? Can the wizard leave the party at story beats (Gandalf-style absences)?
- Keys: how many, and how are they split across the 3 parts?
- Riddle: are clue locations fixed or randomized per campaign?
