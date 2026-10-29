# Core mechanics (shared across stories)

**History (DEC-610):** written before the design cards. Where it disagrees with a card, the card wins; known stale lines say "Superseded by". Status: brainstorm-level, not final. Nothing here is decided.
Started: 2026-10-13

These systems were first worked out while brainstorming the [fellowship story](../stories/fellowship/README.md), but they are meant to carry over to any story the game supports. Story-specific material (characters, plot, scenes, quest) lives in `../stories/<story>/`.

## Givens (from Bob)
- Multiple games supported, like the original Dark Tower's game levels
- Cooperative, at least to start
- The app tracks almost everything (warriors, spirit, etc.)
- Use as many tower/game elements as possible
- Web layer: animations, sounds, music, maybe voiced or written dialog
- Open world feel: players move an avatar to a location and things happen there

## Table and world
- Table setup: the Return to Dark Tower board and minis plus the web app. The app tracks state and plays scenes; players move minis on the real board.
- World map: the 4 kingdoms are fixed story realms. Each board building is a hub, and the app opens sub-locations there (ruins, inns, passes, tombs). This is where the "open world" depth lives without needing more board.

## Open world
- Map of locations per kingdom (villages, sanctuaries, citadels, bazaars, ruins, dungeons).
- Moving to a location triggers an encounter, scene, shop, or quest step.
- Time pressure: each turn the shadow advances, so wandering has a cost.

## The party
- Core shape: a traveling-party game. Each character has their own attributes, D&D-style.
- Player count: likely 2 players sharing a party of 3 heroes plus 1 NPC/narrator (4 avatars total), possibly with familiars.
- Party control: shared. No character ownership; players decide together and any character can act. (Implies the party travels as one unit on the board, and solo play falls out for free.)
- Character depth: very light D&D. A handful of stats, a class, a couple of abilities. The app does the math; players shouldn't need a rulebook to resolve a check.

## Turn loop: free roam plus a shadow clock
- No strict turns; every action (move, explore, rest, trade, fight) costs time on the clock, and the tower acts when the clock ticks over. Fits the open-world feel and makes wandering a real tradeoff.
- Clock ticks are story-driven. Each tick advances an authored timeline for that part, and the tower acts on scripted beats (a skull muster, the Eye waking, a seal breaking) rather than at random. The story sets the pace.

## Tracked resources (starting list)
- Warriors, spirit, gold/provisions, gear, companions/allies, corruption, hope/morale (company-wide), the Eye's attention.

## Open questions
- How long is a session (90 min? 3 hours?)
- How much story is authored vs. procedurally generated? (Bob: unsure; revisit after working through the fellowship opening.)
- Shadow clock: what does each action cost? Are there any random tower actions between scripted beats, or is it fully authored?
