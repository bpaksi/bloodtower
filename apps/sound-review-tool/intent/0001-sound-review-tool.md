# Intent: Sound review tool

## Why

Reviewing sounds on tower-poc's Sounds page takes too long. Each sound asks for a mood, a "reads as", a strength, two lengths and a note, and in practice my note says most of it. I want a small tool, like the board map tool, that does only this job.

## What I want

Two steps.

1. **Tower:** connect to the tower and calibrate it. Nothing happens until I press the button.
2. **Sounds:** the tower's sounds in a list. For each one I press Play, then Stopped when it ends, and describe it:
   - **Sounds like:** a few words of my own (growl, hound, coins, metal on metal).
   - **Tone:** good, bad or neutral.
   - **Length:** timed from my Play press to my Stopped press.

Each change is saved at once, so a review can span several sittings. A filter shows only the sounds I haven't reviewed yet.

## Rules

- Local only, run from my Mac.
- The tower safety rules hold: no auto-connect, no auto-calibrate, no retry of a physical action.
- A value I haven't entered is left out, never saved as 0 or "".

## Also

- The 14 sounds I already reviewed in tower-poc carry over: the note becomes Sounds like, and the length from Play is kept. Tone comes from the old picks only where it is clear (triumph or reward is good; dread, menace, tension or threat is bad). Otherwise it is left empty.
- tower-poc's Sounds page keeps its Play buttons. The review (Stopped, mood, reads as, strength, note, sound-feel export) is removed.
- Export writes `research/game-design/sound-feel.json`. The card `feel:` block and its lint change to the new fields: soundsLike, tone and lengthMs.

## Done when

I can connect, calibrate, play every sound, describe it in under ten seconds, and export the file.

## Not wanted

- Mood, reads as or strength.
- Any other tower control (lights, drums, seals).
