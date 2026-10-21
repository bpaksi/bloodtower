# M6 — Drum sync and orientation prototype

**Status:** draft for Bob, 2026-10-21. Waiting on Bob's intent file (`intent/0002-drum-sync.md`) and plan approval (G-plan).

**Why:** Bloodtower's calibrate step will sync the drums by asking players which glyphs they can see, then orient the tower to the board, in one tower block right after calibrate (DEC-103, DEC-104 in `research/game-design/cards/`). The library copies a fixed glyph table in when calibration ends and never checks it against the tower ([setup-slice findings](../../../research/tower/setup-slice-findings-2026-10-21.md)). This milestone proves the prompts on the real tower before Bloodtower builds them.

**Goal:** after calibrate, a person on an iPad tells tower-poc which glyphs they see and which kingdom a lit side faces. tower-poc then holds drum positions and an orientation it can say are confirmed by a person, or says which are still unknown.

**Exit condition:** step 6.3 run on the real tower, with the prompt count and the time to sync recorded, and Bob signs off.

## Rules that hold in every step

- Every physical action is started by a press: no automatic light, rotation or retry (CLAUDE.md, Tower safety).
- A drum or the orientation the person has not confirmed stays `unknown`, never a guess. A skipped prompt leaves it unknown.
- Synced values use the StateStore's `application-maintained` origin, so they stay apart from the library's `library-derived` glyph positions (spec D24 style). The library's table is shown next to them for comparison, not used as the answer.

## Steps

### 6.1 Sync model (`feat/tower-poc-drum-sync-model`)

- Depends on: none
- Touches: apps/tower-poc/src/protocols/**
- Deps change: no
- Runs: local
- Model: opus
- Done when:
  - `drumSync.ts` exports a pure function. It takes the glyph set from `ultimatedarktowerdata`, the drum state after calibrate and the answers so far ("on the lit side, the top level shows Cleanse / blank / can't tell"). It returns either each drum's position and the orientation, or the next question to ask and why.
  - Unit tests cover each of a drum's 4 positions for all 3 drums. They cover a drum whose glyph is not on the lit side (the model asks for one more look or one rotation, and says which), an answer that contradicts an earlier one (reported, nothing set), and "can't tell" (that drum stays unknown).
  - The orientation is one of 4 sides mapped to a kingdom. Its schema is a strict object in the protocols package.

### 6.2 Sync page (`feat/tower-poc-drum-sync-page`)

- Depends on: 6.1
- Touches: apps/tower-poc/src/web/**, apps/tower-poc/src/server/**, apps/tower-poc/src/e2e/**
- Deps change: no
- Runs: local
- Model: sonnet
- Done when:
  - A `/sync` page, offered only once the tower is calibrated, walks the person through:
    1. Light a side: a press, using `lighting.set-led`.
    2. Tap the kingdom that side faces.
    3. For each level, pick the glyph seen on the lit side from pictures, or "blank" or "can't tell".
    4. If the model asks for it, rotate one drum one step, on a press.
  - The page ends on a result card showing each drum and the orientation as confirmed or unknown, next to the library's table.
  - Every prompt and answer goes on the timeline. The result is saved in the StateStore as `application-maintained`, and a new calibration or a disconnect marks it stale.
  - Playwright against the mock tower, at the three viewports:
    - a full sync where the person's answers match the library's table;
    - a sync where they differ, where the person's answer wins;
    - a skipped prompt, which leaves that drum unknown;
    - no command is sent without a press.

### 6.3 Hardware run (gate, Bob)

- Depends on: 6.2
- Touches: apps/tower-poc/docs/**, research/tower/**
- Runs: local
- Done when:
  - Chunk A from the setup-slice findings is run: whether the library's glyph table matches the tower, and which physical side `setLED` north lights.
  - Then 3 syncs, each started from a different hand-turned drum state before calibrate.
  - For each run, the results record: the prompts asked, the time to sync, and whether the result matched what was seen.
  - Bob signs off. The answers feed back into DEC-103 and MEC-017.

## Batches

| Batch | Steps | Merge order |
|---|---|---|
| 1 | 6.1 | 6.1 |
| 2 | 6.2 | 6.2 |
| 3 | 6.3 (gate) | — |

## Open questions for Bob

- Does the result stay in tower-poc only, or should 6.1's model be written so it can move to `packages/` when Bloodtower needs it (the reuse guide's path)? Recommended: write it with no tower-poc imports so it can move, but don't move it yet.
