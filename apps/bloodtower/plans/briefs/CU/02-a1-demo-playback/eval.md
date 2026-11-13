Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: CU / 02-a1-demo-playback — The board plays a packed line once (A1-8b-2)

- Brief: ./plan.md
- Mockup: none
- Risk: Med

## Checks

### EV-01 — The packed line plays once with the exact caption
- Requirement: the Story board plays `seal-break.01~vo-01` once and shows the locked caption (A1 Step 8b-2; DEC-201).
- Method: playwright
- How: new spec under `src/e2e/tests/`. Build a temp copy of `packs/test` and pack it with fake providers and `--drafts`, start the host on it, open the board, trigger the controlled demo entry once.
- Pass evidence: the audio element for that asset id starts and ends once; the caption text equals the Copy table row exactly.
- Fails if: the line plays twice, never plays, or the caption text differs by a character.

### EV-02 — Cover and glow on screen
- Requirement: `painting.cover` is shown with `glow.cover` aligned over it when both are packed; no Loremaster portrait or mouth is asked for or shown.
- Method: screenshot
- How: screenshot the board during the play at the Mac viewport; compare with the same board with no glow packed.
- Pass evidence: both images attached; the cover is visible; the glow layer sits over it with the same box; no portrait element and no request for a portrait asset.
- Fails if: the glow is offset from the cover, or any portrait request appears in the network log.

### EV-03 — The host serves a packed file by asset id
- Requirement: the board can fetch a file named by `assets/index.json` through a by-id route, without serving the index as a public dump.
- Method: unit
- How: tests beside `server/pack/serve.ts` request a packed id, an unknown id, and `index.json` itself.
- Pass evidence: the packed id returns the file with the right type; the unknown id returns 404; the index is not served as a listing.
- Fails if: an unknown id returns a file or the index is served in full.

### EV-04 — No bytes in messages, no committed assets
- Requirement: no message carries file bytes; no packed file, WAV, master or `index.json` is committed under `packs/test/assets/`.
- Method: unit
- How: a protocol test checks the schema of the view message carries only ids and text; `git status` after the e2e run on the PR shows no new file under `packs/test/assets/`.
- Pass evidence: the schema test passes; the PR's file list has no such file.
- Fails if: a message field holds base64 or a buffer, or any packed file is committed.

### EV-05 — Missing audio still shows the caption
- Requirement: caption-only stays legible if the audio file is missing.
- Method: playwright
- How: same spec as EV-01 with the packed audio file removed from the temp pack.
- Pass evidence: the caption shows; the board has no error screen; the console has no uncaught error.
- Fails if: the caption is blank or the board errors.

### EV-06 — The tower is optional
- Requirement: the same play completes with the tower off.
- Method: playwright
- How: run EV-01 with no tower connected.
- Pass evidence: the line plays and the caption shows.
- Fails if: the play waits on the tower.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — Restore does not replay
- Requirement: Continue or a restore does not replay the line by itself; an explicit replay may play it.
- Method: playwright
- How: play the line, reload the board (restore), wait 5 seconds, then use the replay entry.
- Pass evidence: no audio starts after the reload; the replay entry starts it once.
- Fails if: the line starts on reload.

## Assumptions surfaced

- The demo entry is a developer-controlled trigger, not a button → A1 Step 8b-2 "no new UI" and G-A1-04; Bob: confirm at G-A1.
- The voice on the draft is Charon, the locked Loremaster voice (DEC-902, Gamewright's rulings, 2026-11-12; Bob's lock of 2026-11-10; design-freeze question 1 asks Bob to confirm it covers the Ruined Keep). This step does not depend on the answer.
