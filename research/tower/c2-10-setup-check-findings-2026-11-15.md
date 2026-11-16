# Setup check on the real tower: glyphs, facing, a drum turn, and the box-up, 2026-11-15

Bob's C2-10 hardware run ([brief](../../apps/bloodtower/plans/briefs/C2/10-tower-glyph-prototype/plan.md)) on the tower-poc setup-check page (PR #349, `pnpm dev`, Mac browser), run Sunday 2026-11-15 — a day ahead of its Mon Nov 16 slot in the catch-up queue. One evening, one press per physical action, nothing automatic. Tower battery 95% (4.38 V) at connect. It answers the brief's four questions in "What the run must answer".

**Status legend** (as in [setup-slice-findings-2026-10-21.md](setup-slice-findings-2026-10-21.md)): **Verified** = seen on Bob's tower in this run. **Library** = read in the `ultimatedarktower` code, not checked here. **Unknown** = not answered by this run.

## Short answers

- **Q-033.** All 12 windows match the library's fixed glyph table exactly. **Verified.** The library's table can be trusted after calibrate on this tower.
- **Light north vs drum north.** Same side. **Verified by implication:** the glyphs were read against the *light's* north and matched a table that assumes the *drums'* north — a mirror or offset between the two conventions would have broken the asymmetric placements (Quest and Reinforce at south).
- **MEC-017.** The lit north side faces kingdom **North**, with the tower on the board in game position. **Verified.**
- **Q-402 (rotate).** A press turned the top drum to east and it **landed east**, as commanded and as the table says. **Verified.** The "a press that turns the drums" option is real.
- **Q-032 (box-up).** **0 of 83** skulls stayed inside across 10 counted box-ups, **seals off**. **Verified, scoped:** seals-off only; IDEA-024 (seals block exits) stays open.

## The run

- App: tower-poc on `main`, setup-check page. Connect and Calibrate, one press each.
- North was fixed by the page's **Light north side** press (the chunk-A method); the 12 windows were then read by eye around the tower.
- Drum turn: **Turn top drum to east**, one press, then the landing side tapped.
- Box-up: 10 tries. Tower on the board in game position, drums as calibrate plus the one turn left them (top east, middle and bottom north — Bob confirmed), all 12 seals off, every drop made over a tray.
- The east light cross-check on the Lights page (chunk A step 3, second half) was not done as a separate step. The full-table match constrains the mapping anyway: a mirrored east/west reading would have put Quest and Reinforce on the wrong sides, and it did not.

## 1. Q-033 — glyphs on each drum side vs the library's table

| Drum | Side | Expected (library table) | Seen | Match |
|---|---|---|---|---|
| top | north | Cleanse | Cleanse | yes |
| top | east | no glyph | no glyph | yes |
| top | south | Quest | Quest | yes |
| top | west | no glyph | no glyph | yes |
| middle | north | Battle | Battle | yes |
| middle | east | no glyph | no glyph | yes |
| middle | south | no glyph | no glyph | yes |
| middle | west | no glyph | no glyph | yes |
| bottom | north | Banner | Banner | yes |
| bottom | east | no glyph | no glyph | yes |
| bottom | south | Reinforce | Reinforce | yes |
| bottom | west | no glyph | no glyph | yes |

12 of 12 match. Blank faces were answered "No glyph", never left blank. The library's fixed table (`data/constants.js`, "positions based on calibrated drum orientation") is correct on this tower after calibrate.

## 2. MEC-017 — which kingdom the north side faces

One press lit the north side only. With the tower on the board in game position, that side faces kingdom **North** (the page records the compass label; the board's kingdoms are read by eye, as the rules have players do). Lighting did not choose the kingdom; the tap recorded it.

## 3. Q-402 — a press that turns a drum

`mechanics.rotate-drum` `{drumIndex: 0, position: 1}` sent on one press: the top drum turned and **landed east**, the position commanded and the position the library's table says. The button was disabled before calibrate and nothing was sent. This is the option Q-402 called "a press that turns the drums", now seen working and landing on real hardware.

## 4. Q-032 — skulls that stay inside after a box-up

| Try | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Dropped in | 24 | 5 | 7 | 11 | 5 | 7 | 5 | 5 | 5 | 9 |
| Stayed inside | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

- **10 counted tries, 83 skulls in, 0 stayed inside. Share 0.** No try was uncountable; no missing counts.
- Scope: **seals off** (they were already off for the glyph reading), drum positions fixed at top east / middle north / bottom north, box-up per the brief's definition (tower lifted and shaken over a tray; vigor not separately characterized).
- As the earlier note says, tens of drops give a rough rate only — but 0-for-83 is not a close call. With the seals off, a box-up releases everything.
- **Open:** whether seals on changes it (IDEA-024, Bob's expectation that seals block exits). A one-evening follow-up with the 12 seals on answers it.

## Gaps and notes from the run

- **No delete on a mis-entered skull try.** Try 4 was first recorded with a wrong "stayed" count; the page has no delete button, so it was corrected by editing the browser's saved run directly. A chunked hardware run should be able to drop a try. Prototype page; worth a line in its next pass.
- Calibration time was not recorded (the brief's four questions do not need it).
- Tower state at the end: connected, battery 95% (4.38 V).

## What this unblocks

- Bob's rulings, per the brief's last line: **Q-402** (the press that turns the drums works and lands — option confirmed) and the **glyph prompts for MEC-039 .13 to .15** (the table they prompt against is verified).
- **Step 58 (C2-11, the Continue piece check)** in the catch-up queue, which waits on this run and its findings note on `main`.
