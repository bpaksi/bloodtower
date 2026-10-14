# Landing and initial screens

Status: draft for Bob's review, 2026-10-14. Design only. Builds on sessions.md (R-SES) and asset-organization.md.

## Principles
- R-UI-1. The first 10 seconds sell the game: motion, sound, and the tower, before any menu.
- R-UI-2. The landing screen is engine-neutral. Each story is a "door" on it that carries its own theme. Once a story is picked, the whole UI takes on that story's theme.
- R-UI-3. Every screen has an ambient loop (music plus a subtle animation). There are no static, silent screens.
- R-UI-4. The tower joins the show early, but it is never touched until the player presses Connect (R-SES-2).
- R-UI-5. The shared screen (TV, Mac, or host iPad) shows the shared view, and each hunter's iPad shows a matching private view. Both are designed together.

## Flow
1. **Cold open (shared screen, 8–12 s, skippable).** A 1981-style title: the original Dark Tower silhouette on a starfield, then the logo forms. A nod to the 1981 box art and the classic "tower awakens" sound.
2. **Landing ("the Hall of Stories").** A dark hall with one door per installed story. Each door has a looping animated clip in that story's style, and its music hint plays when the door is focused. Below the doors: Continue (latest save), New game, Stats, Settings.
3. **Story intro (the story's theme takes over).** A key-art still, a 20–30 s intro clip in the story's clip style, the narrator's tagline, and a trailer feel.
4. **Game setup.** Choose the night/chapter (new or resume), difficulty, and seed (shown as a "fortune" card for replay).
5. **The hunters join (private iPads).** Each player scans a code or taps "join" on their iPad and picks a hunter. Their iPad shows the hunter's portrait, a voiced intro line, stats, and a private backstory hook. The shared screen shows the four portraits filling in like a party roster.
6. **Tower awakening.** The Connect and Calibrate buttons, styled as a ritual ("Wake the tower"). Calibration takes about 22 s and is covered by an animated "the castle stirs" clip with ambient app audio, since commands sent during calibration are dropped. Then comes the first tower cue: the heartbeat breathe.
7. **Board setup checklist.** An illustrated, seed-built list (minis, skulls, seals, drums) with a picture for each step, checked off on the shared screen.
8. **Opening scene.** Straight into the Lantern & Bell opening.

## Assets to create (for Illusionist)
Shared/engine:
- Cold-open clip and the "tower awakens" stinger, done as a 1981 homage.
- Hall of Stories background loop, the door frame, and UI chrome (buttons, cards, dice and fortune card).
- The engine logo plus an original typeface pairing.
Per story (each story lists its own in its folder, e.g. [Dracula screen assets](../stories/dracula/screen-assets.md)):
- door loop clip, key-art still, intro clip and tagline, theme loop and motif, menu ambient loop, hero portrait stills and join flourish, voiced hero intro lines, setup-checklist illustrations, calibration cover image, chapter/night title card, recap card style, victory and defeat clips.

## Open questions
- Shared screen: DECIDED, the Mac browser Dashboard (R-DEV-2).
- What should the engine be called on the title and cold open?
- Does a QR code to join fit the theme, or should players use a short code word instead?

## Agreed with Illusionist, 2026-10-14
- R-UI-6. Living menus: every menu, join, and checklist screen sits on a slow parallax loop (fog, candle flicker, film grain), built in code.
- R-UI-7. Hunter title cards: a Player's Handbook-style ink portrait on parchment that inks in line by line on join, then the voiced line. One still per hunter; the animation is done in code.
- R-UI-8. Tower and screen sync: screen beats (door slam, glow) align with tower cues through a sync table in the cue library. If the tower is off, the screen still plays its half.
- R-UI-9. Each story declares a four-note signature motif (`story.json` `motif`), used for its door, intro, and victory sting.
- R-UI-10. Every load or calibration pause is covered by a looping fortune card with a flavor line; there is no fixed-length cover clip. The calibration screen uses a looping "castle stirs" image under a fortune card.
- Scope cuts: one shared cold open for all stories; a 60-second theme loop plus the motif at launch.
- Build order: (1) four hunter portraits and intro lines; (2) Hall door loop, cold open, intro clip; (3) sound effects and music.

- R-UI-11: Dashboard "Join iPad" opens the R-WIZ-10 QR join screen at any time.
