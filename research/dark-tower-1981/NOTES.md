# Dark Tower (Milton Bradley, 1981): notes

## History
Dark Tower is an electronic board game for 1–4 players, released by Milton Bradley in 1981. Its centerpiece is a motorized tower with a TI TMS1400 microcontroller, a 12-key membrane keypad, a 2-digit LED readout, a rotating drum of backlit film cels (the "pictures") and a 1-bit speaker. Players cross four kingdoms, gather the brass, silver and gold keys, and then storm the Dark Tower, which is guarded by 17–64 brigands depending on the level. Orson Welles appeared in the TV ads. The game was pulled early because of a lawsuit claiming the design was taken from an inventor's pitch, and it is now a cult classic. Restoration Games published Return to Dark Tower in 2022. MAME emulates the tower (driver `mbdtower`, hh_tms1k.cpp; status "preliminary", emulation "good").

## Tower events and sounds (matched to files in sounds/)
- Intro / power-up self-test: wos_intro.wav
- Safe move / clear: wos_clear.wav
- **Brigands battle**: wos_battle.wav, the "battle horn." This plays on random wilderness moves and almost always at a tomb, ruin or the Dark Tower. The display then shows the brigand count.
- Combat rounds: wos_enemy-hit.wav (you win a round, brigands halved) and wos_player-hit.wav (you lose a round, 1 warrior dies)
- Dragon attack: wos_dragon.wav (takes 25% of gold and warriors). Dragon slain with the Dragonsword: wos_dragon-kill.wav
- Lost: wos_lost.wav (go back and lose a turn; a Scout gives an extra turn instead)
- Plague: wos_plague.wav (−2 warriors; a Healer gives +2 instead)
- Cursed (another player casts it with the Wizard): there is no separate WAV in this set. Image: wos_cursed.jpg
- Pegasus reward: wos_pegasus.wav
- Bazaar: wos_bazaar.wav. Bazaar closed: wos_bazaar-closed.wav
- Tomb/ruin with nothing inside: wos_tomb-nothing.wav. Tomb/ruin with a battle: wos_tomb-battle.wav
- Sanctuary/citadel: wos_sanctuary.wav
- Frontier crossing: wos_frontier.wav (needs the kingdom's key)
- Starving (out of food): wos_starving.wav
- End of turn: wos_end-turn.wav
- Dark Tower assault/victory theme: wos_darktower.wav. Victory image: wos_victory.jpg

## Recreating the Brigands horn in code (original, not sampled)
Hardware: according to MAME, the TMS1400 drives a 1-bit speaker on output R10, gated by R4 (`level_w(~data>>4 & data>>10 & 1)`). So every sound is a software-toggled **square wave**, with no volume envelope beyond on/off. The firmware ROM defines the tones, and the driver source has no tone table. You could recover exact periods by running MAME and logging R10, but the recording is enough.

I measured wos_battle.wav (22.05 kHz, 8-bit, 1.05 s) with autocorrelation:
- note 1 ≈ 525 Hz (≈ C5) for ~0.17 s
- note 2 ≈ 788 Hz (≈ G5, a perfect fifth up) for ~0.33 s
- ~0.05 s of silence, then the pair repeats once (C–G… C–G)

The recipe: two-tone rising-fifth bugle call, 50% duty square wave, played twice. `sounds/synth/brigands_horn_synth.wav` is a generated example (44.1 kHz, ~1.1 s). For the app, synthesize it live (WebAudio `OscillatorNode` with type "square", or a JS/Swift sample generator). Then you can make an original variation: change the timbre, add an envelope, or transpose. That keeps the feel without copying the recording. The same autocorrelation pitch analysis (50 ms windows) works on the other WAVs to transcribe them.
