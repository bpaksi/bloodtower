# Story toolkit

What the game engine gives a story, when and why to use each tool, and what the story pack must bring, with counts. One card per tool (DEC-256, DEC-260); this page lists them all. Written for Bob designing a story and Claude drafting the pack (DEC-257).

**How to read the counts (DEC-258).** Each count has a **floor** and a **target**, for short · standard · long games (DEC-050). Below the floor the pack lint fails the build. Below the target it warns: the story plays, but feels thin or repeats. One value means the same at every length. A floor of 0 means the tool is optional, or the engine's default plays (DEC-199).

A **line** is one talking-avatar line of at most 3 caption lines (DEC-207).

Field names point at sections of [story-pack-format.md](story-pack-format.md). Each tool card has the full what, when, why and fields.

## Plot (AREA-082, DEC-261)

| Tool | Layer | When to use it | Floor | Target |
|---|---|---|---|---|
| opening narration (MEC-040) | core | Every story, once. It names the goal, the adversary and where the heroes start. | 1 | 1 |
| chapters (MEC-041) | configurable | Always. Use more chapters for a longer game, so each act stays short and the table feels the plot move. | 2 · 3 · 3 | 3 · 4 · 5 |
| quests (MEC-042) | configurable | For every scene the plot needs the heroes to play through, not just hear. The win must depend on them (IDEA-013). | 4 · 6 · 8 | 8 · 12 · 14 |
| steps inside a quest (MEC-043) | configurable | Every quest. Use more steps for a quest that should feel like a journey (a crypt), fewer for a sharp scene. | 2 | 3-5 |
| chapter and quest narration (MEC-044) | configurable | Start of every chapter and quest at least. Add an end for each outcome (quest: won, left, failed) so each result lands its own way. | start of each | start + one end per outcome |
| trigger beats (MEC-045) | configurable | When the board should answer what the heroes do: a hint on a quest's spot, a rumour when they enter the inn, a token placed after a battle. | 0 | 1 per chapter |
| win and loss scenes (MEC-046) | core | Every story. Each loss scene names the reason, so the table knows why it lost. | 1 win + 1 per way to lose | 1 win + 1 per way to lose |

## People (AREA-083, DEC-262)

| Tool | Layer | When to use it | Floor | Target |
|---|---|---|---|---|
| building NPCs (MEC-047) | configurable | Every story. Write enough lines per role that a second and third visit sound different. The count is lines per role. | 3 | 6 · 8 · 10 |
| named NPCs (MEC-048) | story | For anyone the plot wants the heroes to come back to: a witness, a suspect, a guide. Lines each: floor 3 (meeting, talking again, the clue action), target 6. | 2 · 3 · 4 | 4 · 6 · 8 |
| companions (MEC-049) | optional | When the story wants allies with a voice: someone the heroes win over, protect or lose. Lines each: target 5 (join, loyalty up, loyalty down, leaving, the finale). | 0 | 4 · 4 · 6 |
| the adversary (MEC-050) | core | Every story, exactly one. Give it a voice the table hears through the game, not only at the end. Lines: floor 3 (introduction, a taunt, the finale), target 8. | 1 | 1 |
| lieutenants (MEC-051) | optional | In a longer game, to give the middle chapters a face and a fight that changes the finale. | 0 | 1 · 2 · 3 |
| traitor tricks (MEC-052) | optional | When the story is about trust: who to believe, who is lying. | 0 | 1 · 1 · 2 |

## Places (AREA-084, DEC-263)

| Tool | Layer | When to use it | Floor | Target |
|---|---|---|---|---|
| hero start (MEC-053) | configurable | Every story. Start together for a tight party story; one per kingdom for a world under threat everywhere. | 1 | 1 |
| chapter bounds (MEC-054) | configurable | Every chapter. Narrow bounds walk the party through the world in order; open bounds let them roam. | 1 per chapter | 1 per chapter |
| story points (MEC-055) | configurable | One for every quest. Spread them over kingdoms so the party travels. | 1 per quest | 1 per quest, over 2 · 3 · 4 kingdoms |
| leads (MEC-056) | optional | When the story wants the world to feel bigger than its plot, and to reward talking to people. | 0 | 2 · 4 · 6 |

## Threats (AREA-085, DEC-264)

| Tool | Layer | When to use it | Floor | Target |
|---|---|---|---|---|
| adversary quests (MEC-057) | optional | When the story wants a race against the adversary's plan, a choice between the plot and stopping a threat. | 0 | 1 · 2 · 3 |
| foe reskins (MEC-058) | optional | For each foe type the story's world meets often: wolves for Shadow Wolves, brides for Striga. The count is foe types reskinned. | 0 | 4 · 6 · 8 |
| corruption names (MEC-059) | optional | Whenever the story's threat has its own way of marking a hero. | 0 | 12 |
| wild event names (MEC-060) | optional | For each event type, so a storm or a plague reads as part of this story's world. The count is event types renamed. | 0 | 1 per event type |

## Rewards (AREA-086, DEC-265)

| Tool | Layer | When to use it | Floor | Target |
|---|---|---|---|---|
| story items (MEC-061) | configurable | For anything the plot needs the heroes to find, carry or spend, and for the win's keys. | what the win needs | 4 · 6 · 8 |
| clues (MEC-062) | optional | When the story has a mystery or a traitor: who did it, who lies, where the true coffin is. | 0 | 3 · 4 · 6 |
| quest rewards (MEC-063) | configurable | Every quest. Make the reward fit the scene and help the next chapter. | 1 per quest | 1 per quest |

## Voice and look (AREA-087, DEC-266)

| Tool | Layer | When to use it | Floor | Target |
|---|---|---|---|---|
| nuggets (MEC-064) | configurable | Every story. Write more for longer games, so no talk repeats and rumours stay worth chasing. The count is nuggets. | 100 | 150 · 250 · 400 |
| mood lines (MEC-065) | configurable | Every story, for each of the board's six terrains; add variants so the same road doesn't say the same thing twice. The count is lines per terrain. | 1 per terrain | 3 per terrain |
| scene pictures (MEC-066) | configurable | At least one per quest; ideally one per moment, so each beat has its own picture. | 1 per quest | 1 per moment |
| avatars (MEC-067) | configurable | For every character with lines: building NPCs, named NPCs, companions, the adversary. The count is avatars per speaker. | 1 per speaker | 1 per speaker |
| tower cues (MEC-068) | optional | For each quest, and a signature cue for the adversary the table learns to dread. | 0 | 1 per quest + the adversary's |
| place paintings (MEC-069) | optional | When the story's world looks different from the engine's default: gothic villages, a ruined citadel. The count is kinds of place painted. | 0 | 5 |
| music (MEC-070) | optional | One track per chapter, so each act has its own mood. | 0 | 1 per chapter |

## Not in the toolkit yet

- **Base treasure, gear and potion decks:** whether story items reuse or replace them is Q-012.
- **Nugget mix:** how a story's nuggets split between rumours, lore and fortunes is Q-166.
- **Heroes:** the hero pool belongs to the engine, the same in every story (DEC-045). A story supplies none.
- **Encounters:** random and the engine's (IDEA-013). A story only renames wild events (MEC-060) and marks story points (MEC-055).
