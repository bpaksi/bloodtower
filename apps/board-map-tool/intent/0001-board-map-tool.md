# Intent: Board map entry tool

## Why

I want to enter the board map quickly, without hand-editing the markdown. For each space I need to say which spaces touch it, where they sit on the compass, whether a river lies between, and which region the space belongs to. The game's move map needs that data.

## What I want

A small tool, separate from the game workbench, with one screen for the board.

1. **Spaces:** the 60 spaces, grouped by kingdom (N Arisilon, E Brynthia, S Durnin, W Zenon), each with its printed name and terrain.
2. **Neighbours:** for a chosen space, I pick each neighbour and set its compass slot (N, NE, E, SE, S, SW, W, NW), whether a river lies between, its terrain, and an optional note such as a special label.
3. **Two sides:** one entry fills in the neighbour's side too, so I never type a pair twice.
4. **Contested slots:** when two neighbours want one slot, I choose which takes it. The other goes to the list under the cross.
5. **Regions:** a list of regions (The Great Woods, Regal Run, Longwater, and any I add). I assign each space to exactly one region.
6. **Check:** the tool shows any space with no region, any slot used twice, and any neighbour that is not entered from both sides.
7. **Save:** writes one JSON file into the base pack, which the game reads when it is built.

## Rules

- Local only, run from my Mac. No accounts, no server.
- Only the data I enter is saved. No other settings.
- Every space must end in exactly one region before the file counts as complete.

## Done when

I can enter all 60 spaces, the neighbours, the rivers and the regions, the check shows nothing left to fix, and the saved file is in the base pack.

## Not wanted

- Any change to the cards or the game workbench.
- Editing the terrain of a space outside the entry form.
- Anything that touches the tower.

## Still open (decide before the build)

- Region IDs and their prefix (Q-148).
- Whether the four kingdoms are also regions (Q-149).
- Exact path for the JSON file. `packs-v2/base` does not exist yet.
- Spelling of Longwater (board map says Longwater, your list said Long Water).
