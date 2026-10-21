# Intent: record how each tower sound feels

## Why

The game needs to know what each tower sound feels like. Today the 113 sounds have only a name and a category, and the inventory's notes are guesses from the names. Nobody has listened to them all on the tower, and none of their lengths are known.

## What I want

On the existing Sounds page, I play each sound on the tower and record the feeling it produces:

- **Stopped**: I press it when the sound ends, and that records the length. The tower doesn't report when a sound ends, so my press is the measure.
- **Mood**: one of dread, tension, wonder, triumph, loss, calm, comic, mystery, menace.
- **Reads as**: one of threat, alert, reward, failure, arrival, magic, voice, transition.
- **Strength**: soft, medium or strong.
- A few words of my own.

I'm only noting the feeling. Which mechanics use a sound gets decided later, when we prototype the mechanics and build their tower interactions (lights, sound and movement as one unit).

My picks are saved on the tower-poc server as I go, so I can stop and pick up again another day. **Export** downloads `sound-feel.json` (format in the game-workbench plan, step 7a). Claude copies it into the `SND-` cards, and the workbench's `/sounds` page shows the results.

## Rules

- One press plays one sound once. Nothing plays on its own, and there's no "play all".
- I can do this in short sittings over several days without losing my picks, even if the browser's data is cleared.
- A length I didn't measure stays empty, never 0.

## Not now

- Linking sounds to mechanics or cues.
- Light sequences and light effects (the same review later).
- Writing to the cards from tower-poc. The export file is the hand-off.
