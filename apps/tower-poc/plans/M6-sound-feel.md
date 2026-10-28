# M6 — Sound feel review

**Status:** retired 2026-10-26. The review moved to its own app, [`apps/sound-review-tool`](../../sound-review-tool/), with simpler fields (sounds like, tone, length). Steps 6.1 and 6.2 are removed from tower-poc (spec 1.25); the plan below is history. Approved by Bob, 2026-10-21 (G-plan).
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
- Touches: `apps/tower-poc/src/protocols/**`, `apps/tower-poc/src/server/**`, `apps/tower-poc/src/web/lib/service.ts` and its test (as built, see Results), `apps/tower-poc/spec.md`, `apps/tower-poc/plans/M6-sound-feel.md`
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

## Results

### 6.1 Feel record on the service (`feat/tower-poc-sound-feel-record`)

- **Protocol** (`src/protocols/soundFeel.ts`): the word lists, `soundFeel.record` (index from the inventory's `soundIndexSchema`, so 1 to 113 as the data has it; each length a whole number from 1 to 60,000; a note up to 500 characters), the row, `soundFeel.changed`, and the export with `buildSoundFeelExport`. The export leaves out a field never recorded and a row with nothing left in it (every field cleared).
- **Service**: migration 4 adds `sound_feel`; `createSoundFeel` (`src/server/soundFeel.ts`) applies a record (left out keeps, `null` clears, a note of only spaces is no note) and saves it. `welcome` carries the rows; each save goes to every client. `GET /api/sound-feel.json` answers with the export as a download (`content-disposition: attachment`), refuses another page's origin (D20) and any method but GET and HEAD. The mock tower keeps its own record, in its own database, as it does every other value.
- **Deviation:** the web client's message handler must handle every server message type, so adding `soundFeel.changed` meant touching `src/web/lib/service.ts`: it now keeps the rows from `welcome` up to date. No UI; that is 6.2.
- **Raw bytes:** the protocol test that lists every field a client can fill now names the three `soundFeel.record` numbers (index and the two lengths) and the note, and a new test pins the numbers' bounds. None reaches the tower.
- **Evidence:** `pnpm check` passes. New tests: 7 in `protocols/soundFeel.test.ts`, 5 in `server/db/soundFeel.test.ts` (including a restart on a file database), 13 in `server.test.ts` ("sound feel record (D25)": two clients, a late `welcome`, nine refusals, no tower write while connected, the export with and without rows, the origin check), 1 in `web/lib/service.test.ts`.

### 6.2 Review mode on the Sounds page (`feat/tower-poc-sound-feel-review`)

- **Page:** a **Review feel** toggle beside the sound count, kept per device in the browser as Verify mode is (`src/web/lib/soundReviewMode.ts`). On, the catalog is one column and each sound has a review row under its Play button (`SoundReviewRow.tsx`): Stopped, the two lengths, Mood, Reads as and Strength (native choices, "Not set" first) and a Note. Above the list: "N of 113 with a feel", "Only sounds not yet reviewed" and **Export**, a link to the service's `/api/sound-feel.json` (on the service's origin, as the Timing page posts, so it works under `next dev` too). Off, the page is as it was.
- **Timing** (`src/web/lib/soundReview.ts`): the Play press time is taken before anything else; the tower's answer is when the page receives the play's `confirmed`. `rejected` or `failed` ends the timing; `indeterminate` keeps it with no answer time, so only `lengthMs` is sent and `answerLengthMs` is cleared. A length is never 0 (a press within a millisecond counts as 1 ms), and one over a minute is not recorded: the row says so and asks for a replay.
- **Saving:** each pick sends `soundFeel.record` with only that field; the row shows "Saving…", then "Saved" once the service's `soundFeel.changed` answers that message's id, or why not ("Not saved: …", "Not sent: …", or "Not confirmed" when the link dropped). A note of only spaces is saved as no note. While the service is out of reach the choices are disabled and the lengths and count show "unavailable".
- **Refinements** (within the step's intent, recorded here):
  - Stopped turns off after one press, so a stray second press cannot replace the length; a replay turns it on again. A reload also ends the timing.
  - "Only sounds not yet reviewed" keeps the sound last played listed, even once it has a feel, so it does not vanish after the first pick while Bob makes the others. It goes when another sound is played (or the page reloads). The step's "hides sound 1 after its first pick" holds from then on.
  - A length under a second shows in ms ("40 ms"), so a short one never reads as "0.0 s".
- **`useCommand.send`** now returns the command's id (undefined when nothing was sent), so the page can tie the timing to its own play.
- **Evidence:** `pnpm check` passes; `pnpm e2e` passes (40 tests). New tests: 9 in `web/lib/soundReview.test.ts` (Stopped off before Play and after `rejected` or `failed`, on through `indeterminate` with `lengthMs` only; both lengths from one play; the 1 ms floor and the one-minute limit; the count and the filter); in `web/lib/service.test.ts`, a save answering this page's record is noted by its id, even before `welcome`; `e2e/tests/tower/sound-feel.spec.ts` on the mock with an iPad (WebKit, touch) and a Mac (Chromium): Stopped off before Play, on after it, off on other sounds and after its press; both lengths saved; dread / threat / strong and a note saved as made; a second browser sees them without a reload; a reload keeps them and the mode; clearing a pick; Export downloads `sound-feel.json` with sound 1 only (`SND-001`, no cleared field); another play moves Stopped; the filter; no sideways scroll and screenshots at 390 × 844, 820 × 1180 and 1440 × 900.
