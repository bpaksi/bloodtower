# M6 — Sound feel review

**Status:** proposed, 2026-10-21. Waiting for Bob's approval (G-plan).
**Intent:** [0002-sound-feel-review.md](../intent/0002-sound-feel-review.md). Spec 1.24, D25.
**Goal:** Bob listens to each of the 113 tower sounds on the Sounds page and records the feeling it produces and its length. The record is saved on the tower service as he goes and exported as `sound-feel.json`, which Claude copies into the game design's `SND-` cards (game-workbench plan, step 7a; the workbench's `/sounds` page from step 7b shows it).
**Exit condition:** every sound Bob has reviewed is in the export, and the export is in the `SND-` cards.

This reopens the POC, which closed after M3, for this one milestone. M4 and M5 stay deferred.

## What is not changing

- No new tower capability, no inventory entry, no change to the command path. Play is the existing `sound.play` button; one press plays one sound once (spec §5). Nothing plays on its own and there is no "play all".
- **Stopped** sends nothing to the tower. It only measures time on the page.
- Fits and Avoid are not recorded (Bob, 2026-10-21): only the feeling. Which mechanics use a sound is decided later, when mechanics are prototyped.

## Steps

### Step 6.1: Feel record on the service
- `sound_feel` table: one row per sound index (1 to 113) with `mood`, `readsAs`, `strength`, `lengthMs`, `answerLengthMs`, `note` (each nullable), `updatedAt` and the client label. The newest picks replace the old ones.
- Protocol (D25): `soundFeel.record{index, mood?, readsAs?, strength?, lengthMs?, answerLengthMs?, note?}` with an envelope `id`. A field left out keeps its value; a field sent as `null` clears it. Words outside the lists are refused with `invalid-payload`, as is a length that is not a whole number from 1 to 60,000. `welcome` gains `soundFeel` (every saved row) and each change is sent to every client as `soundFeel.changed{row}`, with the `soundFeel.record` id as `correlationId`. Nothing reaches the tower or the library.
- `GET /api/sound-feel.json` returns the export, the format in spec §3.3. A field never recorded is left out, never written as 0 or "". Only the service's own origin, per D20.
- The word lists live once, in the protocols package (`soundFeel.ts`).
- Depends on: G-plan
- Touches: `apps/tower-poc/src/protocols/**`, `apps/tower-poc/src/server/**`, `apps/tower-poc/spec.md`, `apps/tower-poc/plans/M6-sound-feel.md`
- Deps change: no
- Runs: local (protocol contract)
- Model: opus (protocol and schema design)
- Done when:
  - Protocol tests: a record with an unknown mood, reads-as or strength, a length of 0 or above 60,000, or an index outside 1 to 113 is refused; `null` clears a field; no `soundFeel.*` message carries bytes for the tower (the existing raw-bytes test covers the new types).
  - Server tests: a record is saved, survives a service restart, reaches a second client as `soundFeel.changed`, and appears in `welcome`; the executor sees no command for it.
  - `GET /api/sound-feel.json` on a service with two rows returns `{ "version": 1, "sounds": [...] }` with both, by index, with unrecorded fields left out; with no rows, `"sounds": []`.
  - `pnpm check` passes.
  - Not required: editing history, undo, more than one record per sound.

### Step 6.2: Review mode on the Sounds page
- A **Review feel** toggle on the Sounds page, kept per device like Verify mode. On, each sound in the catalog shows its saved feel and a review row: Play (the existing button), **Stopped**, then mood, reads as and strength (each a choice with "not set"), and a note.
- **Stopped** is enabled from Bob's Play press for that sound until another sound is played. One press records two lengths (Bob, 2026-10-21):
  - `lengthMs`: from the Play press to the Stopped press, so the send and the tower's answer are in it;
  - `answerLengthMs`: from the moment the page receives the play's `confirmed` (the tower's answer, as the sound starts) to the Stopped press. If no `confirmed` came before the press (an `indeterminate` play, or Stopped pressed first), it is not recorded.
- If the play ends `rejected` or `failed`, no sound played: Stopped turns off and nothing is measured. An `indeterminate` play may have sounded, so Stopped stays on. Pressing Stopped after a replay replaces both lengths; a replay with no `confirmed` clears the old `answerLengthMs`, so the two always come from the same play.
- Each choice is saved as soon as it is made (`soundFeel.record`); the note on leaving the field (Bob, 2026-10-21). A save the service refuses or cannot receive is shown on the row, never shown as saved.
- A count, "N of 113 with a feel", and a filter "not yet reviewed", so a sitting can pick up where the last ended. The category filter already exists.
- **Export** downloads `/api/sound-feel.json` as `sound-feel.json`.
- Anything not recorded shows "unavailable", never 0.
- Depends on: 6.1
- Touches: `apps/tower-poc/src/web/**`, `apps/tower-poc/src/e2e/**`, `apps/tower-poc/plans/M6-sound-feel.md`
- Deps change: no
- Runs: local (tower UI)
- Model: sonnet
- Done when:
  - Unit tests: Stopped is off before Play, on from the Play press, off again after another play; `lengthMs` is the time from the Play press to the Stopped press and `answerLengthMs` from `confirmed` to the press, both from one play; a play that ends `rejected` or `failed` turns Stopped off and measures nothing; one that ends `indeterminate` keeps it on and records `lengthMs` only (and clears an older `answerLengthMs`).
  - e2e on the mock: play sound 1, press Stopped, pick dread / threat / strong and type a note; reload, and the row shows the same picks; a second browser sees them without reloading; Export downloads JSON with that sound and no other.
  - The "not yet reviewed" filter hides sound 1 after its first pick.
  - `pnpm check` and `pnpm e2e` pass.
  - Viewports: 390 × 844, 820 × 1180, 1440 × 900 (screenshots in the PR with Review feel on)
  - Not required: keyboard shortcuts for Stopped, playing a sound twice to average, waveform or audio capture.

### Step 6.3: Bob's review pass (gate G-review)
- Bob reviews the sounds on the real tower in short sittings, one or two categories each (Bob, 2026-10-14: hardware passes come in chunks). Picks save as he goes.
- Claude records in Results which categories were done in each sitting, and anything the tower did that was unexpected (a dropped link, a sound that did not play) as a gap with the `gap-entry` skill.
- Owner: Bob. Done when Bob says the pass is complete (it may leave sounds out).

### Step 6.4: Copy the export into the cards
- Claude reads `sound-feel.json` and writes each sound's `feel:` block into `research/game-design/cards/SND-NNN.md`, and the measured lengths into `research/game-design/tower-sound-inventory.md`. No import script (game-workbench plan, step 7a).
- Depends on: G-review, and game-workbench step 7b merged (the card lint for `feel:`)
- Touches: `research/game-design/cards/SND-*.md`, `research/game-design/tower-sound-inventory.md`, `apps/tower-poc/plans/M6-sound-feel.md`
- Deps change: no
- Runs: local
- Model: sonnet
- Done when: every sound in the export has a `feel:` block matching it field for field (a test or a script run shown in the PR), the card lint passes, and `/sounds` in the workbench shows the counts the export has.

## Batches

- G-plan: Bob approves this plan
- B1: 6.1
- B2: 6.2 (after B1 merges)
- G-review: 6.3 (Bob)
- B3: 6.4

## Gates used

G-plan (this plan) and G-review (step 6.3, a judgement gate: only Bob can say how a sound feels). No G-signoff: the milestone ends when 6.4 merges.

## Requirement review (2026-10-21)

Done inline by Claude over all four steps against the intent, the spec and the code. Findings already written into the steps:
- The Sounds page has no way to know when a sound ends (GAP-LIB-007), so Stopped is Bob's press by design; human reaction time (about 0.2 s) is in every length.
- The only other origin rule that applies is D20; the export endpoint follows the timing endpoint's pattern.
- GAP-HW-011 (link dropped while a sound played) may recur over 113 plays. Nothing reconnects on its own; Bob reconnects by hand and carries on, and his picks are already saved.

Bob's answers (2026-10-21):

| Question | Answer |
|---|---|
| Measure length from the tower's answer (`confirmed`) or from the Play press? | **Both**, from one Stopped press: `lengthMs` from the Play press, `answerLengthMs` from the tower's answer (Bob first chose the Play press, then asked for both). The gap between them is the send and answer time (25 to 64 ms in M1, plus the LAN). A play the service refuses or that fails measures nothing. |
| Save each choice when made, or with a Save button per sound? | **Each choice when made**; the note on leaving the field. |
