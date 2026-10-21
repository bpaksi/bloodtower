# Game workbench plan

Status: backlog, 2026-10-20. Steps 3 to 8 are proposals until Bob approves them. Tier: Experiment (one plan, one branch and PR per step).

This file is the workbench's backlog. New asks for the workbench go here as a step or under Later. Design content (cards, documents) goes in `research/game-design/`, not here.

## Goal

A local, read-only site over `research/game-design/`: the cards as a graph, the documents, and in time every numbered piece (screens, UI, cues, sounds, sketches). Changes go through a prompt pasted into Claude.

## Done

| Step | What | PR |
|---|---|---|
| 0 | Shell, documents view, prompt starter, focus graph over cards | #95 |
| — | Shared code moved to `packages/workbench` (story-workbench step 2) | #98 |
| 0a | Back and forward buttons in the top bar (Bob, 2026-10-20) | #117 |
| 0b | Card types and ID prefixes for tower outputs (`SND-`, `GLY-`, `SEAL-`, `LGT-`, `LFX-`, `LSQ-`, `DRM-`) | #119 |

## Suggested order

5 (find) and 6 (small screens) first: both are small and make every session easier on the laptop. Then 3, 4, 7, 8. Steps 1 and 2 stay as planned.

## Steps

### Step 1: Reorganise `research/game-design/`
- Chapters, catalogs, visuals, every piece numbered.
- Touches: `research/game-design/**`, `apps/game-workbench/src/web/lib/content.ts`

### Step 2: Full GDD browser
- `/id/<ID>` pages, backlinks, ID lint in `pnpm check`. (Search moved to step 5, live refresh to step 4.)
- Depends on: 1

### Step 3: "This session" view (asked for, 2026-10-20)
- Lists the cards added or changed on the current branch against `main`.
- Done when: a card edited on the branch shows in the list; an unchanged card does not.

### Step 4: Live refresh (brought forward from step 2)
- The open page updates when a file under `research/game-design/` changes, without a manual reload.

### Step 5: Find an ID or a word (Bob, 2026-10-20)
The top-bar box is there but disabled ("coming").
- Typing an exact ID (`MEC-012`, `R-ENG-6`, `SND-044`) jumps straight to it: the card in the focus graph, or the document line where a document ID is defined.
- Typing words lists matching cards (ID, title, body) and document lines, best match first, with the ID and title of each.
- Keyboard: `/` or `⌘K` focuses the box, arrows move, Enter opens, Esc closes.
- Done when: a unit test finds a card by exact ID, by a word in its title and by a word only in its body, and finds a document line by a word; the box is enabled.
- Touches: `apps/game-workbench/src/web/**`, `packages/workbench/src/**`

### Step 6: Works on a small screen (Bob, 2026-10-20)
Target: a 13-inch MacBook Air with no external monitor (about 1440 × 900 or 1470 × 956 in the browser, less the menu and tab bars).
- The left sidebar and the right detail panel each collapse to a thin rail with a button, and open again from it.
- Shortcuts: `[` toggles the left, `]` the right.
- Below about 1200 px wide, both start collapsed; the detail panel opens over the graph when a card is picked.
- The choice is remembered per browser.
- Done when: at 1280 × 800 the page has no horizontal scroll, both panels collapse and open, and with both collapsed the graph uses the full width. Screenshots at 1280 × 800 and 1470 × 956 in the PR.
- Touches: `apps/game-workbench/src/web/**`, `packages/workbench/src/components/**` (story-workbench gets the same panels)

### Step 7: Sound review tool (Bob, 2026-10-20)
Bob listens to each of the 113 tower sounds and records how it feels, so sounds can be assigned to game mechanics. Today each `SND-` card says only the name and category; lengths are "?" in [tower-sound-inventory.md](../../../research/game-design/tower-sound-inventory.md).

A `/sounds` page in the workbench:
- One row per `SND-` card, grouped by category, with its feel and length once recorded.
- **Play** sends `sound.play` for that index to the tower through tower-poc's server (`command{capabilityId, params}` on `/ws`). tower-poc must be running and connected; if it is not, the button says so. One press plays one sound once; nothing plays on its own, and there is no "play all".
- **Stopped** after Play records the length (the tower does not report when a sound ends, so Bob's press is the measure).
- For each sound Bob picks:
  - **Mood**: dread, tension, wonder, triumph, loss, calm, comic
  - **Reads as**: threat, alert, reward, failure, arrival, magic, voice, transition
  - **Strength**: soft, medium, strong
  - **Fits**: mechanics or cues it suits (`MEC-`, `CUE-` IDs), and **Avoid** for sounds tied too closely to an RtDT character
  - a few words of his own
- Filter by mood or "reads as" to choose a sound for a mechanic.
- Output: the page stays read-only. It collects Bob's picks in the browser and builds one prompt for a batch of sounds. Claude writes them to the `SND-` cards as a new `feel:` block, adds `uses` links from the mechanics, and fills the lengths in the inventory.
- Later, the same review for the 21 light sequences (`LSQ-`) and the light effects (`LFX-`).
- Done when: Play sends exactly one `sound.play` command per press (unit test against a fake socket); the prompt for a reviewed sound contains its ID, mood, reads-as, strength, length and fits; the card lint accepts a `feel:` block and rejects an unknown mood.
- Touches: `apps/game-workbench/src/web/**`, `research/game-design/cards/README.md` (the `feel:` field), `packages/workbench/src/cards.ts`
- Open for Bob:
  - Are the mood and reads-as words right? Add or cut before the first pass.
  - Is a prompt per batch fine, or should this one page write to the cards directly? That would be the first time the site writes.
  - The workbench would talk to tower-poc at run time, over its socket only, with no import across apps. Is that fine, or should playback live in tower-poc?

### Step 8: From design to requirements (Bob, 2026-10-20)
Today [requirements.md](../../../research/game-design/requirements.md) holds the `R-` requirements as a draft, and the cards hold questions, options and decisions. Nothing shows which decisions have become requirements yet. Proposal, kept small:
- **Ready view** (`/ready`): `decided` cards with no link to an `R-` requirement, grouped by area. These are the next requirements to write.
- **Draft requirement** button on a card: a prompt asking Claude to write an `R-` row (MUST/SHOULD/MAY, a test, the source card) in the right section of requirements.md, and to link the card to it with a new `becomes` link.
- **Coverage**: on the map page, per area, how many decisions have a requirement. A lint warning (not an error) for an `R-` row with no source.
- When a whole area is ready, the existing `prd-02-write` skill turns its requirements into a PRD for `apps/game`. No new tool is needed for that.
- Done when: a decided card with no `becomes` link shows in the ready view, and stops showing once it has one; the draft prompt names the card, its area and its linked decisions.
- Touches: `apps/game-workbench/src/web/**`, `research/game-design/cards/README.md` (the `becomes` link), `packages/workbench/src/graph-types.ts`
- Open for Bob: should requirements become cards (`REQ-`) in time, or stay as rows in requirements.md?

## Later

- UI pieces gallery
- Tower cue library: a simulated tower, and optional play on the real tower through tower-poc (shares the playback from step 7)
- Sketchbook
- Flows
