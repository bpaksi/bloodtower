# Game workbench plan

Status: backlog, 2026-10-20. Steps 5 and 6 approved by Bob on 2026-10-21 (batches B1, B2). Steps 3, 4, 7 and 8 stay proposals until Bob approves them. Tier: Experiment (one plan, one branch and PR per step).

This file is the workbench's backlog. New asks for the workbench go here as a step or under Later. Design content (cards, documents) goes in `research/game-design/`, not here.

## Goal

A local, read-only site over `research/game-design/`: the cards as a graph, the documents, and in time every numbered piece (screens, UI, cues, sounds, sketches). Changes go through a prompt pasted into Claude.

## New direction (Bob, 2026-10-21): a knowledge-graph tool for building software

Bob's goals for the tool:
1. An easy way for Bob and Claude to work out and track a design.
2. A format that helps Claude (a) find information, (b) find dependencies, (c) find gaps and missing requirements, and (d) organise the work into segments that can be built.

Bob asked for the tool to be state of the art at designing knowledge graphs for building software. His rulings:

| Question | Answer |
|---|---|
| Scope | Every app in this repo. One engine and one schema in `packages/`. Each app keeps its own cards folder and ID families. |
| Trace depth | Through code and tests: idea → question → option → decision → requirement → plan step → code and tests. Tests cite `R-` IDs, and `pnpm check` reports which requirements are designed, built and tested. |
| Storage | Markdown cards in git, as today. The engine builds an in-memory index when it loads. |
| Editing | Claude edits through engine commands that validate before they write. The site stays read-only. Every change goes through a PR. |
| Claude's access | A CLI first: `pnpm graph find\|show\|impact\|gaps\|slices\|add\|link\|check`. A local MCP server wraps it once the commands settle. |
| Link rules | Strict. Each link type says which card types it joins, whether it sets build order (`needs`), and that it must not form a cycle. Claude reviews the 593 existing `refines`/`uses`/`affects` links once, turns the ones that mean build order into `needs`, and brings the unclear ones to Bob in batches. |
| Ready to build | A slice is ready when every card in it is decided or parked, every decision has an `R-` requirement with a test idea, no open question links to it, and everything it `needs` is in a slice that is built or ready. Ready slices go to `prd-02-write`. |
| AI review | A `graph-review` skill, run on demand or at the end of a design session. It looks for likely duplicates, contradictions between decisions and missing questions, and returns proposed cards. The tool makes no model calls. |
| Requirements | Stay as `R-` rows in requirements.md (see Answers). The engine reads each row as a node. |

Timing (Bob, 2026-10-21): most of this is already in place (cards, IDs, links, statuses, areas, the graph, the card lint), so the work is to make it more formal. It is split by what gets more expensive if it waits:
- **Now** (steps 9 to 11, at Experiment tier): link rules for new links, so the backlog of loose links stops growing; a gaps report that steers design sessions; and "what points here" backlinks with a small CLI. These come after steps 5 and 6.
- **Later**, when `apps/game` is close to starting: build slices, tracing into code and tests, the one-time review of the old links (by then smaller, since many cards will have changed or been parked), Full tier with an intent and a spec, and the MCP server. See Later.

## Done

| Step | What | PR |
|---|---|---|
| 0 | Shell, documents view, prompt starter, focus graph over cards | #95 |
| — | Shared code moved to `packages/workbench` (story-workbench step 2) | #98 |
| 0a | Back and forward buttons in the top bar (Bob, 2026-10-20) | #117 |
| 0b | Card types and ID prefixes for tower outputs (`SND-`, `GLY-`, `SEAL-`, `LGT-`, `LFX-`, `LSQ-`, `DRM-`) | #119 |

## Suggested order

5 (find) and 6 (small screens) first: both are small and make every session easier on the laptop. Then 9, 10 and 11 (formalizing the graph, see New direction). Then 3, 4, 7, 8. Steps 1 and 2 stay as planned.

## Batches

- B1: 5
- B2: 6 (after B1 merges)
- Proposed, once Bob approves steps 9 to 11: B3: 9; B4: 10; B5: 11. Their `Touches` overlap in `packages/workbench/src/**`, so they run one after another.

5 and 6 both change the top bar in `layout.tsx` and the shared CSS, so their `Touches` overlap and they run one after the other. Each is small. Before B1 starts, `requirement-review` reads steps 5 and 6 together once.

## Answers (Bob, 2026-10-21)

| Question | Answer |
|---|---|
| Step 7: mood and reads-as words | Keep them, and add two moods: **mystery** and **menace** |
| Step 7: where Play lives | In **tower-poc**, on its existing Sounds page, which already plays sounds and is the only origin `/ws` accepts (D20). The workbench does not talk to the tower. |
| Step 7: how picks reach the cards | tower-poc's page exports a **JSON file**. Claude reads it and edits the cards (no import script). |
| Step 8: requirements as `REQ-` cards? | No. They **stay as rows** in requirements.md, linked from cards with `becomes`. |
| First batch | Steps 5 and 6 |

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

How it is built:
- `packages/workbench/src/find.ts` holds the pure parts, with no Node imports. `buildFindIndex(cards, docs, ids)` makes one entry per card (ID, title, body) and one per non-blank document line (file, line number, text). `find(index, query, limit = 20)` returns hits, best first.
- Exact ID: a query that is a whole ID (case ignored, read with the app's `IdScheme`) puts that ID first. If it is a card, the hit opens `/?focus=<ID>`. Otherwise the hit opens the line that defines the ID: the first line where it starts a heading or the first cell of a table row, at `/doc/<slug>#L<n>` (the existing `LineJump` scrolls there). An ID with neither a card nor a defining line falls through to the word search.
- Words: every word must appear (AND, case ignored). The score ranks a match in the ID, then the title, then the body or line text. Ties go to ID order with numbers compared as numbers (`MEC-2` before `MEC-10`), then file and line.
- The search runs on the server. A route `apps/game-workbench/src/web/app/api/find/route.ts` (`GET /api/find?q=`) reads cards and docs fresh on each request, like the pages do, so the browser never loads all 500 cards. Each hit returns `{kind, id, title, snippet, href}`.
- `packages/workbench/src/components/FindBox.tsx` is the client box that replaces the disabled input. It waits about 120 ms after typing before it fetches and shows a listbox (`role="listbox"`, `aria-activedescendant`). `/` focuses the box only when no other field has focus. `⌘K` / `Ctrl+K` always focuses it. Esc closes the list and leaves the box.
- Depends on: none
- Touches: `apps/game-workbench/src/web/**`, `packages/workbench/src/**`, `packages/workbench/styles/**`
- Deps change: no
- Runs: cloud
- Model: sonnet
- Done when:
  - Unit tests in `packages/workbench` (`find.test.ts`) find a card by exact ID, by a word in its title and by a word only in its body. They also find a document line by a word, and resolve a document-only ID to its defining line.
  - The top-bar box is enabled. Typing `MEC-012` and pressing Enter focuses that card in the graph.
  - `pnpm check` passes.
  - Viewports: 1470 × 956 (one screenshot of the open list in the PR)
  - Not required: typo tolerance, stemming, highlighting inside snippets, wiring into story-workbench (it has no code yet)

### Step 6: Works on a small screen (Bob, 2026-10-20)
Target: a 13-inch MacBook Air with no external monitor (about 1440 × 900 or 1470 × 956 in the browser, less the menu and tab bars).
- The left sidebar and the right detail panel each collapse to a thin rail with a button, and open again from it.
- Shortcuts: `[` toggles the left, `]` the right.
- Below about 1200 px wide, both start collapsed; the detail panel opens over the graph when a card is picked.
- The choice is remembered per browser.

How it is built:
- The right panel is `.detail` on the graph page and `.rail` on a document page. Both collapse the same way.
- `packages/workbench/src/panels.ts` holds the pure state. `initialPanels(width, stored)` returns the stored choice when there is one; otherwise both panels start closed below 1200 px and open at 1200 px or more. `togglePanel(state, side)` flips one side.
- `packages/workbench/src/components/Panels.tsx` is a client component. It sets `data-left` and `data-right` (`open` or `closed`) on `.shell`, and the grid columns in `globals.css` and `graph.css` follow those attributes. A closed panel is a 36 px rail with an open button, and an open panel has a close button.
- The choice is saved in `localStorage` (`workbench.panels`), with every read and write in try/catch. With no saved choice, or when storage is blocked, the width rule applies.
- Below 1200 px an open right panel lies over the graph instead of taking a column. Picking a card in `FocusGraph` opens it there. At 1200 px or more, picking a card leaves Bob's choice alone.
- `[` and `]` are ignored while a field has focus, and when ⌘ or Ctrl is held, so `⌘[` and `⌘]` still go back and forward.
- Depends on: 5 (both edit the top bar and the shared CSS)
- Touches: `apps/game-workbench/src/web/**`, `packages/workbench/src/**`, `packages/workbench/styles/**` (story-workbench gets the same panels)
- Deps change: no
- Runs: cloud
- Model: sonnet
- Done when:
  - At 1280 × 800 the page has no horizontal scroll, both panels collapse and open from their buttons and from `[` and `]`, and with both collapsed the graph uses the full width.
  - Unit tests for `initialPanels` (saved choice wins; with none, closed below 1200 px and open at 1200 px or more) and for `togglePanel`.
  - A reload keeps the choice.
  - `pnpm check` passes.
  - Viewports: 1280 × 800 and 1470 × 956 (screenshots in the PR with panels open and collapsed)
  - Not required: animation, drag to resize, phone widths

### Step 7: Sound review tool (Bob, 2026-10-20)
Bob listens to each of the 113 tower sounds and records how it feels, so sounds can be assigned to game mechanics. Today each `SND-` card says only the name and category; lengths are "?" in [tower-sound-inventory.md](../../../research/game-design/tower-sound-inventory.md).

Bob ruled on 2026-10-21 (see Answers): listening and recording happen in tower-poc, and the workbench shows the results. The work is split in two.

**7a: Review on tower-poc's Sounds page (tower-poc work, Full tier).** This is not a workbench step. It needs an intent from Bob in `apps/tower-poc/intent/` and a step in a tower-poc milestone plan, and it follows the `tower-capability` skill's safety rules.
- Each sound on the existing page gets **Stopped** after Play, which records the length. The tower does not report when a sound ends, so Bob's press is the measure. One press plays one sound once. Nothing plays on its own, and there is no "play all".
- For each sound Bob picks one of each:
  - **Mood**: dread, tension, wonder, triumph, loss, calm, comic, mystery, menace
  - **Reads as**: threat, alert, reward, failure, arrival, magic, voice, transition
  - **Strength**: soft, medium, strong
  - **Fits**: mechanics or cues it suits (`MEC-`, `CUE-` IDs), and **Avoid** for sounds tied too closely to an RtDT character
  - a few words of his own
- Picks are kept in the browser until exported. **Export** downloads `sound-feel.json`:
  `{ "version": 1, "sounds": [{ "id": "SND-044", "index": 44, "lengthMs": 2300, "mood": "dread", "readsAs": "threat", "strength": "strong", "fits": ["MEC-012"], "avoid": false, "note": "…" }] }`.
  A length that was not measured is left out, never written as 0. `SND-NNN` is the tower index, so tower-poc builds the ID without importing workbench code.
- Claude reads the file and writes each sound to its `SND-` card as a `feel:` block, adds `uses` links from the mechanics, and fills the lengths in the inventory. There is no import script.

**7b: `/sounds` in the workbench (this plan).**
- One row per `SND-` card, grouped by category, with its feel and length once recorded, and "unavailable" when not.
- Filter by mood or reads-as to choose a sound for a mechanic. No Play button.
- The `feel:` card field, in `research/game-design/cards/README.md` and the card schema.
- Done when: the card lint accepts a `feel:` block and rejects an unknown mood (the two new moods included); `/sounds` lists a card with a `feel:` block under its category, and the mood filter hides a card with another mood.
- Touches: `apps/game-workbench/src/web/**`, `research/game-design/cards/README.md` (the `feel:` field), `packages/workbench/src/cards.ts`
- 7b can be built before 7a; until then every row shows "unavailable".
- Later, the same review for the 21 light sequences (`LSQ-`) and the light effects (`LFX-`).

### Step 8: From design to requirements (Bob, 2026-10-20)
Today [requirements.md](../../../research/game-design/requirements.md) holds the `R-` requirements as a draft, and the cards hold questions, options and decisions. Nothing shows which decisions have become requirements yet. Proposal, kept small:
- **Ready view** (`/ready`): `decided` cards with no link to an `R-` requirement, grouped by area. These are the next requirements to write.
- **Draft requirement** button on a card: a prompt asking Claude to write an `R-` row (MUST/SHOULD/MAY, a test, the source card) in the right section of requirements.md, and to link the card to it with a new `becomes` link.
- **Coverage**: on the map page, per area, how many decisions have a requirement. A lint warning (not an error) for an `R-` row with no source.
- When a whole area is ready, the existing `prd-02-write` skill turns its requirements into a PRD for `apps/game`. No new tool is needed for that.
- Done when: a decided card with no `becomes` link shows in the ready view, and stops showing once it has one; the draft prompt names the card, its area and its linked decisions.
- Touches: `apps/game-workbench/src/web/**`, `research/game-design/cards/README.md` (the `becomes` link), `packages/workbench/src/graph-types.ts`
- Requirements stay as `R-` rows in requirements.md, with no `REQ-` cards (Bob, 2026-10-21).

### Step 9: Link rules for new links (Bob, 2026-10-21)
Today 1,200 links are mostly loose (`refines` 239, `uses` 216, `affects` 138), and only 13 are `needs`.
- `research/game-design/cards/README.md` gets a rules table for each link type: which card types it may join, and whether it sets build order. `needs` means "B must exist before A can be built" and is the only link that sets build order.
- The schema in `packages/workbench/src/cards.ts` (or a new `rules.ts` beside it) checks each link against its rule, and fails when `needs` links form a cycle.
- Old links are grandfathered. A baseline file (`research/game-design/cards/.link-baseline.json`) lists the rule breaks that exist today. The card lint fails on any break not in it, so a new link must follow the rules, while an old one waits for the link review (Later). Fixing an old link removes its line from the baseline.
- Depends on: none
- Touches: `research/game-design/cards/README.md`, `research/game-design/cards/.link-baseline.json`, `packages/workbench/src/**`, `apps/game-workbench/src/web/lib/**`
- Deps change: no
- Runs: local (it sets the rules Bob reviews)
- Model: opus (schema design)
- Done when:
  - Unit tests: a link that joins types its rule does not allow fails; a `needs` cycle (A → B → A) fails; a break listed in the baseline passes; a break not in the baseline fails.
  - The card lint passes on today's cards with the baseline in place.
  - `pnpm check` passes.
  - Not required: fixing old links, changing the graph's look

### Step 10: Gaps report (Bob, 2026-10-21)
- `packages/workbench/src/gaps.ts` finds gaps in the graph as pure functions. Each gap carries the card ID and the rule that found it.
- First rules: an open question with no `answers` link to it; a mechanic with no link to a screen, UI piece or cue; a `conflicts` link where neither card is parked; a decided card with no link to an `R-` requirement; an area with no decided card.
- A **Gaps** page (`/gaps`), grouped by rule and then by area, with a count on the map page for each area. Each row opens the card.
- `pnpm graph gaps` prints the same list, so Claude can start a design session from it.
- A gap is a warning, never an error. `pnpm check` does not fail on gaps.
- Depends on: 9
- Touches: `packages/workbench/src/**`, `apps/game-workbench/src/web/**`, root `package.json` (the `graph` script)
- Deps change: yes (a root `package.json` script, no new packages; Node 24 runs the `.ts` CLI directly)
- Runs: cloud
- Model: sonnet
- Done when:
  - Unit tests on a small graph: each rule finds its gap, and does not report a card once the gap is fixed.
  - `/gaps` lists today's gaps, and `pnpm graph gaps` prints the same count.
  - `pnpm check` passes.
  - Viewports: 1470 × 956
  - Not required: an AI review (that is the `graph-review` skill, Later), rules beyond the five above

### Step 11: What points here, and `pnpm graph show` (Bob, 2026-10-21)
- The detail panel lists every link pointing at the card, grouped by verb read in reverse ("needed by", "answered by"…), next to the links it writes itself. Documents that mention the ID are already listed.
- `pnpm graph show <ID>` prints the card, its links both ways and its sources. `pnpm graph find <words>` prints step 5's search.
- Depends on: 5, 10 (the CLI)
- Touches: `packages/workbench/src/**`, `apps/game-workbench/src/web/**`
- Deps change: no
- Runs: cloud
- Model: sonnet
- Done when:
  - A unit test: a card that only other cards link to lists those cards under the reverse verb.
  - `pnpm graph show MEC-012` prints its links both ways.
  - `pnpm check` passes.
  - Viewports: 1470 × 956
  - Not required: an impact view across several hops (Later)

## Later

When `apps/game` is close to starting (see New direction):
- **Link review:** go through the old loose links once, turn the ones that mean build order into `needs`, bring the unclear ones to Bob in batches, and empty the baseline.
- **Build slices:** `pnpm graph slices` and a view, using the "ready to build" rule in New direction. Ready slices go to `prd-02-write`. Builds on step 8.
- **Tracing into code and tests:** tests cite `R-` IDs, and `pnpm check` reports each requirement as designed, built or tested.
- **Impact:** "if this decision changes, what moves?", over several hops.
- **`graph-review` skill:** likely duplicates, contradictions and missing questions, returned as proposed cards.
- **Full tier:** an intent in Bob's words, a spec, and milestone plans. The MCP server wraps the CLI.
- UI pieces gallery
- Tower cue library: a simulated tower; playing on the real tower stays in tower-poc (as in step 7a)
- Sketchbook
- Flows
