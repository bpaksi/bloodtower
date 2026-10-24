# Dark Tower (Milton Bradley, 1981): notes

**Sources used:** the Well of Souls fan site (well-of-souls.com/tower: index, dt_play, dt_board, dt_inv, dt_events, dt_loc, dt_about, dt_pepper, triumph, vectrex, fetched 2026-10-24; page last changed 01/14/20), plus the web checks marked below. Every WOS statement is the fan author's reading of the game booklet, not an official rule text. Where the site contradicts itself, see [Discrepancies](#discrepancies-and-open-questions).

## History
Dark Tower is an electronic board game for 1–4 players, released by Milton Bradley in 1981. Its centerpiece is a motorized tower with a TI TMS1400 microcontroller, a 12-key membrane keypad, a 2-digit LED readout, a rotating drum of backlit film cels (the "pictures") and a 1-bit speaker. Players cross four kingdoms, gather the brass, silver and gold keys, and then storm the Dark Tower, which is guarded by 17–64 brigands depending on the level. Orson Welles appeared in the TV ads (the commercial audio is in `sounds/`).

**Triumph and the lawsuit (WOS triumph page).** Triumph was a prototype microprocessor board game by Alan Coleman and Roger Burten (1979). They demonstrated it to Milton Bradley executives in February 1980; MB declined. In 1981 they saw Dark Tower at the New York toy fair and sued for trade-secret misappropriation. A jury awarded them $737,058.10 in lost royalties. The district court set the verdict aside, and the First Circuit reinstated it (web check: 763 F.2d 461, 1st Cir. 1985; the district court decision is 592 F. Supp. 1021, D.R.I. 1984). The WOS page calls it "an important precedent in intellectual property law". Two former MB staff wrote to the site disputing the claim. One said the Apple II game *Wilderness Campaign* (Synergistic Software, 1980, Robert C. Clardy) was the real ancestor. These are reader claims, not verified.

The old note said the game was "pulled early because of a lawsuit". The WOS page does not say that, so it is **unverified** (see Discrepancies).

Restoration Games published Return to Dark Tower (web check: Kickstarter early 2020, delivery targeted Feb 2021, retail release 2022). MAME emulates the tower (driver `mbdtower`, hh_tms1k.cpp; status "preliminary", emulation "good").

**Later and related versions (WOS):**
- German release "Atlantis" (*Das Imperium kehrt zurück*): different box, manual and watery board with plastic bins, same gameplay per the site. Photos: `images/wos_atlantis1.jpg`, `wos_atlantis2.jpg`.
- Unreleased Vectrex version (c.1983). A single prototype ROM survives. It is a different game set in a forest. See [Vectrex](#vectrex-prototype-c1983).
- Java remake by Michael Bommer (v1.0.4, 2003). Flash remake by Paul J Taylor. iOS app (Floyd Resler) and Android app (Muse of Water). Tabletop Simulator mod (Steam). Working LEGO model by Don Harkness.
- Restoration Games' Return to Dark Tower: a cooperative 1–4 player game with a mechanical tower and an app. The site describes it as "much more complex" and says skulls dropped into the top come out at random board locations.

## Components (WOS dt_board)
1 plastic tower (game unit), 1 two-part cardboard gameboard, 1 interlock piece, 16 plastic buildings, 4 plastic warrior pawns, 1 plastic dragon pawn, 12 plastic keys, 5 plastic flags, 42 plastic score pegs, 4 plastic corner protectors, 4 cardboard score charts, 4 cardboard Pegasus tokens, 1 label sheet, 1 instruction booklet.

Tower display: a digital number/letter window, three light-up picture windows, 12 keyboard buttons and a power switch on the base.

## Setup and board
- **Kingdoms:** Arisilon, Brynthia, Durnin and Zenon. Each has one Citadel (a flagged territory), Sanctuary, Bazaar, Tomb and Ruin. That is 4 × 4 = 16 buildings, matching the component count, with the citadels marked by flags and crests. The Dark Tower sits at the centre.
- **Home kingdom:** each player's warrior pawn has a colour, and the home kingdom is the one whose buildings are the same colour. The site does not name the colours. `images/wos_dtflag.gif` shows one red flag with a dragon, but the site does not say which kingdom it belongs to.
- **Start:** each player gets 10 warriors, 30 bags of gold and 25 rations of food, beginning in the home Citadel.
- **Frontiers:** four long, narrow spaces between kingdoms. Crossing one is one space and always event-free.
- **Dark Tower space:** one per kingdom around the base, but you can enter it only for the siege.
- **Score sheets:** score pegs are an optional record. The tower keeps the real count internally.

## Movement
- One territory per turn. You may stay put and act (shop, buy, inventory).
- Movement is to adjacent territories. Within a kingdom you can go any way. **Between kingdoms you must cross the frontier counter-clockwise** (WOS dt_board).
- You cannot enter a foreign Citadel, or the space with the Dragon pawn.
- Two or more pawns can share a space.
- Press the FRONTIER key on every frontier crossing (and on a Pegasus crossing), so the tower knows the new kingdom.

## Magic keys
- One key per foreign kingdom, always in this order: **brass** in the first foreign kingdom, **silver** in the second, **gold** in the third. None in your home kingdom, and you never find a duplicate.
- You can't leave a foreign kingdom without its key. Entering its frontier gives the KEY MISSING picture and a sad tone, and you return to the last space.
- You must hold all three keys, have crossed all four frontiers, and be back in the home kingdom before the siege.

## Resources
- **Gold:** the medium of purchase. Warriors carry 6 bags each. A Beast adds 50. Excess gold must be left behind. Cap 99 bags (two-digit display). The site says winning Brigand battles is the only way to gain gold; Sanctuaries, Tombs and Wizards also add some (see Locations and Treasures).
- **Food:** consumed each turn, whether you move or not. The site's table: 15 or fewer warriors eat 1 ration per turn; 16–30 eat 2; 31–45 eat 3; 46–60 eat 4; 61–65 eat 5; 76–90 eat 6; 91–99 eat 7. Cap 99. One ration costs 1 bag of gold; no haggling.
- **Warriors:** the fighting force. Cap 99. Single player: the game ends in defeat if the last warrior dies. Multiplayer: you always keep at least one warrior, whatever happens to you.
- **Beast:** carries 50 extra bags of gold, is immune to combat and eats no food. One per player.

## Keyboard (WOS dt_board)
12 buttons: YES/BUY (confirm, or add to cart in a Bazaar), REPEAT (repeat last display), NO/END (decline, or end turn), HAGGLE (try to lower a Bazaar price), BAZAAR, CLEAR (cancel an illegal move; the turn is lost), TOMB/RUIN, MOVE (empty territory), SANCTUARY/CITADEL, DARK TOWER (begin the siege), FRONTIER, INVENTORY (view warriors and supplies; uses the whole turn).

## Events (WOS dt_events)
Events happen when you enter an empty territory at random, when you enter a Tomb or Ruin, or when another player casts a Curse. Most events play a tower sound and light a picture.

| Event | Effect | Sound / picture |
|---|---|---|
| Safe move | Nothing | wos_clear.wav |
| Brigands battle | Battle horn, then brigand count. Each lost round kills 1 warrior; each won round halves the brigands. Retreat costs 1 extra warrior (not allowed with only 1 warrior left). Win: gold, dragonsword, wizard, key, Pegasus or nothing. | wos_battle.wav, brigands.jpg |
| Dragon attack | Takes 25% of your gold and warriors. The Dragon pawn is placed on the territory, blocking it until the next attack. With the Dragonsword you slay the dragon and take all its hoard. You lose the sword, and the dragon is only "temporarily slain". | wos_dragon.wav, wos_dragon-kill.wav, dragon.jpg |
| Lost | Return to the space you started from and lose a turn. With a Scout, you gain an extra turn instead. | wos_lost.wav, lost.jpg |
| Plague | Kills 2 warriors. With a Healer, you gain 2 warriors instead. | wos_plague.wav, plague.jpg |
| Curse (Wizard) | Another player's Wizard takes 25% of your warriors and gold. No defence. | cursed.jpg (no separate sound in this set) |
| Starvation | Out of food. A nerve-wracking sound plays when you have under 4 turns of food. After that you lose 1 warrior per turn until you reach a Bazaar. There is no picture; the Plague music plays at the start of your turn. | wos_starving.wav |

**Battle at the Dark Tower:** a win wins the game. In multiplayer, a last warrior who loses is allowed to continue (the site's wording).

## Locations (WOS dt_loc)
- **Tomb / Ruin:** deserted (creaking door, turn over); or a Brigand battle, which you can refuse; or one of five bonus treasures without a fight (gold, key, wizard, Pegasus, dragonsword). Sounds: wos_tomb-nothing.wav, wos_tomb-battle.wav, tomb.gif, ruin.gif.
- **Sanctuary:** high-pitched trill (wos_sanctuary.wav). You qualify if you have 4 or fewer warriors, 7 or fewer bags of gold, or 5 or fewer rations. You get a bonus of whatever you are short of. Images: sanctuary.gif.
- **Citadel (siege reinforcement):** only your own home Citadel. Before the siege (all keys, all four frontiers crossed), with 5–24 warriors you **double** them. With any other count the Citadel acts as a Sanctuary. You can repeat the doubling only after visiting a Tomb, Ruin, Bazaar or the Dark Tower in your own kingdom.
- **Bazaar:** snake-charmer music (wos_bazaar.wav), then up to five items in fixed order: warriors (about 4–10 gold each), food (1 gold each), Beast, Scout, Healer (about 15–20 gold each). A Beast, Scout or Healer is never offered again once bought. Press NO/END to see the next item, YES/BUY to buy, HAGGLE for about a 50/50 chance of −1 gold. Haggle too much and the merchant closes the Bazaar (wos_bazaar-closed.wav) and ends your turn. One purchase per turn. Images: bazaar.jpg, bazaar.gif.
- **Frontier:** triumphant sound (wos_frontier.wav) when you press FRONTIER. You can only enter if you hold the kingdom's key. Pegasus crossings must also pause here.
- **Dark Tower space:** only when the siege conditions are met. On DARK TOWER the tower plays a few notes of the *1812 Overture* (the file `wos_darktower.wav`) and starts the Riddle of the Keys.

## Treasures and helpers (WOS dt_inv)
- **Dragonsword:** won in battle only. Kills the Dragon on its next attack and gives you its gold and warriors. Lost when used.
- **Pegasus:** one token per player. Fly anywhere on the board; the token is used up. You may only fly out of a kingdom if you hold its key. The game doesn't track tokens, so the site notes you can cheat. Only sound (wos_pegasus.wav) that is special. Images: pegasus.jpg.
- **Wizard:** a Curse. Choose an opponent; you take 25% of their warriors and gold. Used at once; you can't save it. Image: wizard.jpg.
- **Scout:** you can't get lost. A Lost event gives you an extra turn. Image: scout.jpg.
- **Healer:** Plague gives you 2 warriors instead of killing 2.

## Dark Tower siege
- Requirements: all three keys, all four frontiers crossed, and back in your home kingdom.
- **Riddle of the Keys:** arrange the brass, silver and gold keys in the proper numerical order. The tower shows a random key, and you guess whether it comes first. A right guess shows the next key; a wrong guess ends your turn, and you may try again later.
- **Final battle:** solving the riddle opens the gates and starts the battle horn. Brigand strength by game level: Level 1 = 17–32; Level 2 = 33–64; Level 3 = 17–64. A retreat or defeat means solving the riddle again on return. The key sequence stays the same.
- **Victory:** the "Ride of the Valkyries" signal plays and the VICTORY picture shows the Scepter held aloft (`images/wos_victory.jpg`). The Valkyries audio is not in this set.

## Challenge
The Ancient Magic Scepter has been stolen by a tyrant king. It is hidden in the Dark Tower, guarded by his Brigands. Find the three keys in three foreign kingdoms, then lay siege to the tower. The reward is a kingdom (WOS dt_play).

## Tower sounds (matched to files in sounds/)
- Intro / power-up self-test: wos_intro.wav
- Safe move / clear: wos_clear.wav
- **Brigands battle**: wos_battle.wav, the "battle horn." Plays on random wilderness moves and almost always at a tomb, ruin or the Dark Tower. The display then shows the brigand count.
- Combat rounds: wos_enemy-hit.wav (you win a round, brigands halved) and wos_player-hit.wav (you lose a round, 1 warrior dies)
- Dragon attack: wos_dragon.wav (takes 25% of gold and warriors). Dragon slain with the Dragonsword: wos_dragon-kill.wav
- Lost: wos_lost.wav (go back and lose a turn; a Scout gives an extra turn instead)
- Plague: wos_plague.wav (−2 warriors; a Healer gives +2 instead)
- Cursed (another player casts it with the Wizard): no separate WAV in this set. Image: wos_cursed.jpg
- Pegasus reward: wos_pegasus.wav
- Bazaar: wos_bazaar.wav. Bazaar closed: wos_bazaar-closed.wav
- Tomb/ruin with nothing inside: wos_tomb-nothing.wav. Tomb/ruin with a battle: wos_tomb-battle.wav
- Sanctuary/citadel: wos_sanctuary.wav
- Frontier crossing: wos_frontier.wav (needs the kingdom's key)
- Starving (out of food): wos_starving.wav
- End of turn: wos_end-turn.wav (the site's NO/END key link)
- Siege start (DARK TOWER key): wos_darktower.wav, the *1812 Overture* opening (WOS dt_loc). Earlier note called it an "assault/victory theme"; the site says the victory signal is the Ride of the Valkyries instead.
- Victory image: wos_victory.jpg. Key missing: a sad-sounding tone (no WAV in this set) plus the KEY MISSING picture, `images/wos_keymissing.jpg`.

## Recreating the Brigands horn in code (original, not sampled)
Hardware: according to MAME, the TMS1400 drives a 1-bit speaker on output R10, gated by R4 (`level_w(~data>>4 & data>>10 & 1)`). So every sound is a software-toggled **square wave**, with no volume envelope beyond on/off. The firmware ROM defines the tones, and the driver source has no tone table. You could recover exact periods by running MAME and logging R10, but the recording is enough.

I measured wos_battle.wav (22.05 kHz, 8-bit, 1.05 s) with autocorrelation:
- note 1 ≈ 525 Hz (≈ C5) for ~0.17 s
- note 2 ≈ 788 Hz (≈ G5, a perfect fifth up) for ~0.33 s
- ~0.05 s of silence, then the pair repeats once (C–G… C–G)

The recipe: two-tone rising-fifth bugle call, 50% duty square wave, played twice. `sounds/synth/brigands_horn_synth.wav` is a generated example (44.1 kHz, ~1.1 s). For the app, synthesize it live (WebAudio `OscillatorNode` with type "square", or a JS/Swift sample generator). Then you can make an original variation: change the timbre, add an envelope, or transpose. That keeps the feel without copying the recording. The same autocorrelation pitch analysis (50 ms windows) works on the other WAVs to transcribe them.

## Kingdom names and colours
The board has four kingdoms: **Arisilon, Brynthia, Durnin and Zenon** (WOS dt_board, and the four flags carry them). DT81 gives the kingdoms no compass directions, so which one is RtDT's North, South, East or West is a Bloodtower ruling, not a fact from the game. Kingdom colours are not named on the site. The home kingdom is matched by building colour to pawn colour (see Setup).

## Artwork and artist
- **Bob Pepper** painted the artwork for both Dark Tower and DragonMaster (WOS dt_pepper, dt_about). He illustrated from 1962, mainly paperback fantasy and sci-fi covers, and did only these two games. DragonMaster came first; Milton Bradley gave him the idea of the game and let him invent the tribes. For Dark Tower the brief was tighter, and he says the box and board were "pasted together with cutouts of my art". He died in January 2019 (WOS; the WOS page cites a published obituary).
- **Technique (his words):** charcoal paper, water floated into areas, dark gouache along the edges that spreads in the wet paper, then dye floated over to colour.
- Pepper images saved from the site: `images/wos_bob_pepper.jpg` is a portrait photo of him (from the Q&A page). `images/wos_pepper_sk.jpg` is the cover of *Starry Skies* (a children's peel-and-sparkle book he illustrated, written by Linda Reichlin Rosenstock). It is not a Dark Tower image.
- Credit: the site says the images are scanned from the game booklet and used without permission. Treat them as copyrighted reference, not for shipping.

## Vectrex prototype (c.1983)
A separate game, not DT81. It is a one-player forest adventure: find four keys and solve the Riddle of the Keys in the Dark Tower. The skill level sets how many keys you start with (Game 1: none; Game 2: silver; Game 3: silver and bronze; Game 4: silver, bronze and brass). Warriors, chests, fog and plague zones are on the vector display. Controls: joystick to move; buttons for possessions, arrow, fire and open chests. The site has the instructions and keeps the images `images/wos_vdt-title.gif`, `wos_vdt-forest.gif`, `wos_vdt-chest.gif`, `wos_vdt-brigand.gif`. Emulators exist; the ROM is not in this set.

## Discrepancies and open questions
1. **Food table gap (WOS dt_inv):** the table jumps from 61–65 to 76–90 and leaves out 66–75. The likely value there is 5 or 6. Check against the booklet.
2. **Building count:** WOS dt_board says "4 buildings and 1 flag" per kingdom, but also lists one Citadel, Sanctuary, Bazaar, Tomb and Ruin. Resolved: the Citadel is the flagged fifth space, which gives the 16 plastic buildings.
3. **Battle level counts:** the old note said 17–64 "depending on the level". The site gives the exact split (see Dark Tower siege).
4. **"Pulled early" (old note):** no support on the WOS page. The Triumph lawsuit verdict (1984–85) is after the 1981 release. Need a source for the early withdrawal, or delete the claim.
5. **Siege music:** the old note called `wos_darktower.wav` a victory/assault theme. The site says it is the *1812 Overture* at siege start, and the victory is Ride of the Valkyries. The Valkyries file is not in the folder.
6. **Kingdom colours and home flag:** the old note said these were not found. The site gives the rule (home buildings match pawn colour) but no colour names. The flag image is one red flag with a dragon, kingdom unknown.
7. **Restoration Games dates:** NOTES said published 2022. The web check agrees on 2022 retail with a 2020 Kickstarter; the exact retail and delivery months were not confirmed.
8. **Cursed sound:** still no WAV in the set. The site links none. Only the picture.
9. **Dragon description:** the site says the dragon "takes" 25% but also "drives off" and that the territory stays blocked until the next attack. Consistent enough, but note the Dragonsword keeps the gold and warriors only on a slay, not on a drive-off.
10. **Vectrex key names:** the site names three keys (silver, bronze, brass) for a game with four. The fourth name is not on the page. Check the screenshots or the ROM before using the names.
11. **Not downloaded (decide if wanted):** the Java source and binary zips (darktower-src.zip, darktower-bin.zip, darktower-doc.zip) and the Flash file (2_darktower.swf) are code, so they are left out; the DragonMaster pages and card art are a different game.
