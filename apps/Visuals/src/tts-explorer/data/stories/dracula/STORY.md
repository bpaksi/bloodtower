# The Count of Vellmoor: Dracula Halloween one-shot

Source: Bob's notes in `stories/dracula/` (README, characters, opening scene). Anything the notes didn't cover was invented to fit them and Stoker's *Dracula*. The Count's lines quote Stoker directly, and so does Oskar's "The blood is the life!" (from Renfield).

**Premise:** On All Hallows' Eve, four hunters answer a letter from Father Oskar, Vellmoor's priest, who is already dead. They have six nights to solve his four-part riddle and find the Count's true coffin.

## Characters and voices

| Character | Voice | Why | Default style |
|---|---|---|---|
| Narrator | Charon | Deep and measured | slow, low, ominous storyteller |
| Sister Agnes Hallow (cleric) | Kore | Firm, austere | calm, dry, quietly stern |
| Tomas Varga (warrior) | Algenib | Gravelly old soldier | gruff, low, unhurried |
| Wren Kessel (hunter) | Erinome | Clear and clipped | flat, terse, matter-of-fact |
| Emeric Lutz (scholar) | Fenrir | Excitable, fast | nervous, fast, breathless |
| Hanne (innkeeper)* | Sulafat | Warm but weathered | wry, warm, tired |
| Father Oskar (risen priest)* | Umbriel | Gentle voice made eerie | hollow, distant, sorrowful |
| The Count* | Algieba | Smooth aristocratic menace | smooth, courtly, menacing |
| Ilka Kessel (Wren's mother, a bride)* | Achernar | Soft lullaby gone wrong | soft, dreamy, eerie |

\* Added or expanded beyond the notes. Backstories for the four heroes follow `characters.md`.

## Scenarios

1. **The Lantern & Bell** (21 lines). The opening scene from the notes: arrivals, the four letters, the margin riddle, the midnight bell, the castle doors opening. Ends with "The hunt begins."
2. **The Open Grave** (15 lines). The churchyard after midnight. The party finds Oskar's papers and a map, then faces Oskar himself, risen. Wren carves his name into a bolt. The map points to the founder's tomb.
3. **Children of the Night** (14 lines). The third night at the old guard post. The Count walks down to meet them ("Listen to them, the children of the night...", "Enter freely and of your own will") and needles each hunter's private tie: Tomas's niece, why Agnes was spared (she prayed for him), Wren's mother, Emeric's master. He leaves with "My revenge is just begun..."
4. **Dawn in the Founder's Tomb** (15 lines). The finale. "The name of the first" is Vlad. Wren faces her mother and uses the blank bolt. The party stakes the Count as All Saints' morning dawns.

Data lives in `characters.ts`, `scenarios.ts` and `index.ts`. To add a story, create `data/stories/<id>/` and register it in `data/stories/index.ts`.
