# RtDT app: the dungeon screen

What the official Return to Dark Tower app shows while a hero explores a dungeon. It is written from a screenshot Bob took on his iPad on 2026-10-28. Bob: "I like this a lot and is fun to play. I want the design to start here." The Tomb set piece starts from this screen (DEC-487).

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

## Not known from one screenshot

- What happens on entering a room: its card, its cost in warriors and spirit, and how an Advantage improves it.
- Whether the map is fixed per dungeon or generated, and how many rooms it has. [game-overview-and-rules.md](game-overview-and-rules.md) says the room graphs are app-generated.
- What the gold sigils are exactly.

A web search on 2026-10-28 found only the general rule ("several rooms to explore, with one final room granting success upon discovery"; [Wikipedia](https://en.wikipedia.org/wiki/Return_to_Dark_Tower)), and nothing on doors or room effects.
