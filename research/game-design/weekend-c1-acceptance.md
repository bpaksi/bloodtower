# Weekend C1 acceptance

Locked by Bob, Blood Tower room, 2026-10-25. Design only. Wright plans the weekend from this note. The path is:

**Production-ready start → story setup → move around the board → exit / quit.**

Cards named here are the rulings. This note does not add a second set.

## Illusionist Story board mocks

Bob locked the Story board mock stack as **weekend path only**:

splash → pick → party → setup → move band → Enter place.

| Frame | Card |
|---|---|
| splash | SCR-004 |
| pick | SCR-007, with the carousel and preview art (UI-016) |
| party | SCR-010, Pick copy (DEC-232) |
| setup | SCR-011, one step at a time |
| move band | UI-028 during a move. No map, no map wash, no hero markers (DEC-189) |
| Enter place | the place still on the Story board (DEC-201, DEC-220) |

That is the whole stack. Quit, the session screen, Sound, Game settings, and Connect Tower are not frames in it. They stay in the build below. Illusionist draws these six Story board frames and no others for this weekend.

## Done when

### 1. Production-ready start

- Landing `/` shows a designed Blood Tower banner. The words "Blood Tower" alone are not the banner (SCR-002).
- Sound is a dedicated control on `/`. The first click or key on that page is the gesture that unlocks browser autoplay; until then the browser will not start audio (SCR-003).
- Every iPad screen has a bottom bar. Back, Replay and Menu are centered. Menu is a gear icon and opens a centered dialog (DEC-227, DEC-229, UI-032, UI-033).
- iPad corner frames are theme B: engraved manuscript corners (DEC-233). Illusionist keeps the mock and the asset for Wright when the chrome ships.
- Any video on the iPad stays muted (DEC-231).
- The iPad does not scroll as a full page. If a list must scroll, only the content scrolls, and Continue and Cancel stay pinned (SCR-016).
- A step shows its context and its instruction when the table needs them. A button names the action, as in "Connect Tower" and "Play without Tower" (SCR-005, SCR-016).
- Pick Story is the carousel again, with preview art on the focused story. It fits the Story board viewport. The Story board does not scroll or clip text (SCR-007, UI-016, SCR-013).
- Dracula is a door the table can select, so pick-story can be tested. It is not playable. That choice stops on the not-ready screen and binds nothing (SCR-009).

### 2. Story setup

Startup order stays Pick Story, Game settings, Connect Tower, pick heroes, setup steps, Begin.

- Proving Grounds settings include party size: how many hunters to seat from the pool of 6. The default is 4. N is not hard-coded to 4 (SCR-008, DEC-098, DEC-099, DEC-223).
- Dracula's length and difficulty stay as the second settings shape, on that not-ready door, so the dialog is the pack's own settings and not a Proving Grounds form (SCR-008).
- The tower is optional at connect. The buttons read "Connect Tower" and "Play without Tower" (SCR-005).
- Pick heroes until N are seated. The button is "Pick Hero A". The status is "N of N picked". The help is "Who this iPad speaks for at the table". Never "only this hero hears", and never Take / Claim / Hold Hero A. A hero picked on another iPad greys out (DEC-232, DEC-098, SCR-010).
- Each physical setup step is its own step and must be completed before Begin is offered (SCR-011, SCR-012).
- Begin plays the story's opening on the Story board before the first move. Reuse the talking avatar and the panning and motion stills, including the grey-stair stills from the Oct 17 playthrough. A line with no final copy may be a text placeholder (SCR-012, UI-002, UI-003, UI-005).

### 3. Move around the board

This is the next build after the startup polish.

- The acting iPad uses the move map (UI-023). The minis move on the physical board.
- The Story board shows no map, no map wash, and no hero markers (DEC-189, Bob 2026-10-24). During a move it shows the edge band and the waiting line (UI-028, UI-031).
- Enter shows the place still on the Story board only (DEC-201). In this slice the only place action is Leave (DEC-220, AREA-077).

### 4. Exit / quit

- Quit story ends the game as quit and lands on the session screen (DEC-218).
- Done for tonight leaves the session screen for Goodbye: teardown, tower to idle, session over (DEC-219, SCR-020).

## Copy

| Place | Locked text |
|---|---|
| Pick a hero | Pick Hero A |
| How many are seated | N of N picked |
| Help under the pick | Who this iPad speaks for at the table |

Do not ship "Take Hero A", "N of N taken", "Take all", "Claim", "Hold Hero A", or "only this hero hears".

## Open

Nothing here is waiting on Bob.

Closed in the room after the first pass: the party-join wording (locked as Pick, DEC-232; Take is superseded), the iPad corners (locked as theme B, DEC-233), and the Story board mock stack (weekend path only: splash → pick → party → setup → move band → Enter place).

## Still in force

- Tower optional at the connect step (SCR-005).
- Enter-place stills play on the Story board, not the iPad (DEC-201).
- The slice's only place action is Leave (AREA-077).
- UI-028 and UI-031 are what the Story board shows during a move.
- Quit story, then the session screen, then Done for tonight (DEC-218, DEC-219).
