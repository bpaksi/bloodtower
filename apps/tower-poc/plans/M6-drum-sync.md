# M6 — Drum sync and orientation prototype

**Status:** draft for Bob, 2026-10-21, revised after the requirement review the same day. Waiting on plan approval. tower-poc is on the Experiment tier from 2026-10-21, so no new intent file is needed and the review loop is `adversary-bugs` only, as the tier allows.

**Why:** Bloodtower's calibrate step will sync the drums by asking players which glyphs they can see, then orient the tower to the board, in one tower block right after calibrate (DEC-103, DEC-104 in `research/game-design/cards/`). The library copies a fixed glyph table in when calibration ends and never checks it against the tower ([setup-slice findings](../../../research/tower/setup-slice-findings-2026-10-21.md)). This milestone proves the prompts on the real tower before Bloodtower builds them.

**Goal:** after calibrate, a person on an iPad tells tower-poc which glyphs they see and which kingdom a lit side faces. tower-poc then holds drum positions and an orientation it can say are confirmed by a person, or says which are still unknown.

**Exit condition:** steps 6.3a and 6.3b run on the real tower, with the prompt count and the time to sync recorded, and Bob signs off.

## Rules that hold in every step

- Every physical action is started by a press: no automatic light, rotation or retry (CLAUDE.md, Tower safety).
- A drum or the orientation the person has not confirmed stays `unknown`, never a guess. A skipped prompt leaves it unknown. A skipped prompt is not an error.
- Errors follow [decision 0003](../../../research/decisions/0003-error-logging.md):
  - No `catch` eats an error.
  - A tower command with no answer (`indeterminate` or timed out) is an error. It shows on the iPad that pressed, with its code, and goes on the timeline and in the server log.
- Synced values use the StateStore's `application-maintained` origin, so they stay apart from the library's `library-derived` glyph positions. The library's table is shown next to them for comparison, not used as the answer.
- **Calibration gate:**
  - The library treats any state message as "calibration done" (findings, `udtBleConnection.js:243-259`), so sync does not trust that flag alone.
  - `/sync` and its light and rotate presses are offered only when the tower's own state shows all three drums calibrated and no calibration running, after a settle time.
- Seals must be off for the glyphs to be visible. The sync page says so before its first prompt.

## Steps

### 6.0 Chunk A on the tower (gate, Bob)

- Depends on: none
- Touches: research/tower/**
- Runs: local
- Done when:
  - Bob runs chunk A from the setup-slice findings on the current tower-poc, about 12 minutes, one press per step. Each run records:
    - the glyph (or blank) at all 12 windows after calibrate;
    - which way a rotate turns each drum;
    - which physical side `setLED` north lights.
  - Bob photographs each of the 5 glyphs (and a blank face) with a phone. The photos become the 6.2b answer tiles.
  - Claude writes the results into `research/tower/` and the facts 6.1 needs into this plan, before 6.1 starts.

### 6.1 Sync model (`feat/tower-poc-drum-sync-model`)

- Depends on: 6.0
- Touches: apps/tower-poc/src/protocols/**
- Deps change: no
- Runs: local
- Model: opus
- Done when:
  - `drumSync.ts` exports a pure function.
    - **Takes:** the glyph faces 6.0 recorded, the drum state after calibrate, and the answers so far ("on the lit side, the top level shows Cleanse / blank / can't tell", "this drum was rotated one step").
    - **Returns:** each drum's position and the orientation, or the next question to ask and why.
  - It has no imports from outside the protocols package, so it can move to `packages/` when Bloodtower needs it (Bob, 2026-10-21).
  - A face that 6.0 found blank can't tell positions apart on its own. Where that happens, the model asks for one rotate-and-look and says which drum to rotate.
  - After each rotate, the model's answer is the position the person confirmed, not the library's.
  - Unit tests cover:
    - each of a drum's 4 positions, for all 3 drums;
    - a blank face that needs a rotate-and-look;
    - an answer that contradicts an earlier one (reported, nothing set);
    - "can't tell" (that drum stays unknown).
  - The orientation is one of 4 sides mapped to a kingdom. Its schema is a strict object in the protocols package.

### 6.2a Sync state and protocol (`feat/tower-poc-drum-sync-state`)

- Depends on: 6.1
- Touches: apps/tower-poc/src/protocols/**, apps/tower-poc/src/server/**, apps/tower-poc/spec.md
- Deps change: no
- Runs: local
- Model: sonnet
- Done when:
  - **New values:** synced drum positions and the orientation become StateStore values (`towerValues.ts`). They use the `application-maintained` origin and are marked stale by a new calibration or a disconnect.
  - **Protocol:** new client messages for the sync answers, and inventory entries kept in step with the inventory coverage test. No message carries raw bytes.
  - **Calibration gate:** the gate from the rules above is enforced on the server, with tests. A state message during calibration does not open it.
  - **Errors and timeline:** a light or rotate with no answer is reported to the client with its code, written to the timeline and to the server log. Tested with the mock tower.
  - **Spec:** `spec.md` gets a D24-style decision for the synced values and a version bump.

### 6.2b Sync page (`feat/tower-poc-drum-sync-page`)

- Depends on: 6.2a
- Touches: apps/tower-poc/src/web/**, apps/tower-poc/src/e2e/**, apps/tower-poc/public/**
- Deps change: no
- Runs: local
- Model: sonnet
- Done when:
  - A `/sync` page, offered only while the calibration gate is open, walks the person through:
    1. A reminder that seals must be off.
    2. Light a side: a press, using `lighting.set-led`.
    3. Tap the kingdom that side faces.
    4. For each level, pick the glyph seen on the lit side from the 6.0 photos, or "blank" or "can't tell". "Can't tell" is always visible.
    5. If the model asks for it, rotate one drum one step, on a press.
  - The page ends on a result card showing each drum and the orientation as confirmed or unknown, next to the library's table.
  - The answer tiles stay touch-sized at iPad portrait and landscape and at phone height, with no sideways scrolling.
  - A command error shows on the iPad that pressed, with its code.
  - Playwright against the mock tower, at the three viewports:
    - a full sync where the person's answers match the library's table;
    - a sync where they differ, where the person's answer wins;
    - a blank face that needs a rotate-and-look;
    - a skipped prompt, which leaves that drum unknown and shows no error;
    - a command with no answer, which shows its code;
    - no command is sent without a press.

### 6.3a Sync run 1 on the tower (gate, Bob)

- Depends on: 6.2b
- Touches: apps/tower-poc/docs/**, research/tower/**
- Runs: local
- Done when:
  - About 10 minutes:
    1. Seals off. Connect and calibrate.
    2. Turn one or more drums by hand **after** calibrate (calibrate re-homes them, so turning before it tests nothing).
    3. Run `/sync`.
  - The run is recorded on its own sheet: drums turned, prompts asked, time to sync, and whether the result matched what was seen.
  - Optional: drop one skull during calibration and record whether the calibration gate stayed shut.

### 6.3b Sync runs 2 and 3 on the tower (gate, Bob)

- Depends on: 6.3a
- Touches: apps/tower-poc/docs/**, research/tower/**
- Runs: local
- Done when:
  - Two more runs as in 6.3a, each from a different hand-turned state, with a break between them. Each run gets its own sheet.
  - Bob signs off.
  - Feeding the answers back into DEC-103 and MEC-017 is a follow-up on a game-design branch, outside this plan's Touches.

## Batches

| Batch | Steps | Merge order |
|---|---|---|
| 0 | 6.0 (gate) | — |
| 1 | 6.1 | 6.1 |
| 2 | 6.2a | 6.2a |
| 3 | 6.2b | 6.2b |
| 4 | 6.3a (gate), then 6.3b (gate) | — |

## Rulings

- Chunk A runs first, as gate 6.0 (Bob, 2026-10-21).
- 6.2 is split into 6.2a (state and protocol) and 6.2b (page) (Bob, 2026-10-21).
- The sync model stays in tower-poc, written so it can move to `packages/` later (Bob, 2026-10-21).
