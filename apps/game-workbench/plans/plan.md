# Game workbench plan

Status: backlog, 2026-10-20. Steps 5, 6, 9, 10 and 11 approved by Bob on 2026-10-21 (batches B1 to B5). Step 7 approved by Bob on 2026-10-21 ("let's build it"; batch B6 is 7b). Steps 3, 4 and 8 stay proposals until Bob approves them. Tier: Experiment (one plan, one branch and PR per step).

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
| 5 | Find an ID or a word | #124 |
| 6 | Works on a small screen | #128 |
| 9 | Link rules for new links | #132 |
| 10 | Gaps report | #134 |
| 11 | What points here, `pnpm graph show` and `find` (and the #136 conflict rule) | #137 |
| F1 | Graph tooling correctness: duplicate links, loop groups, conflict with a missing card, /gaps anchors, show/find text (#133, #138, #135, #139) | #140 |
| F2 | Find and panels polish: re-pick scroll, cached index, line-hit ID, unsaved overlay, Esc scope, pending flag (#125, #126, #127, #129, #130, #131) | #142 |

## Suggested order

5 (find) and 6 (small screens) first: both are small and make every session easier on the laptop. Then 9, 10 and 11 (formalizing the graph, see New direction). Then 3, 4, 7, 8. Steps 1 and 2 stay as planned.

## Batches

- B1: 5
- B2: 6 (after B1 merges)
- B3: 9
- B4: 10
- B5: 11
- B6: 7b (7a is tower-poc work and waits for Bob's intent there)

Steps 9, 10 and 11 were approved on 2026-10-21. Their `Touches` overlap in `packages/workbench/src/**`, so they run one after another.

5 and 6 both change the top bar in `layout.tsx` and the shared CSS, so their `Touches` overlap and they run one after the other. Each is small. The whole-track requirement review of steps 5, 6, 9, 10 and 11 is done (see Requirement review).

## Answers (Bob, 2026-10-21)

| Question | Answer |
|---|---|
| Step 7: mood and reads-as words | Keep them, and add two moods: **mystery** and **menace** |
| Step 7: where Play lives | In **tower-poc**, on its existing Sounds page, which already plays sounds and is the only origin `/ws` accepts (D20). The workbench does not talk to the tower. |
| Step 7: how picks reach the cards | tower-poc's page exports a **JSON file**. Claude reads it and edits the cards (no import script). |
| Step 8: requirements as `REQ-` cards? | No. They **stay as rows** in requirements.md, linked from cards with `becomes`. |
| First batch | Steps 5 and 6 |

## Requirement review (2026-10-21, steps 5, 6, 9, 10, 11)

The `requirement-review` agent read the five approved steps together against the code, and its fixes are written into the steps below. Bob's rulings:

| Question | Answer |
|---|---|
| Step 9: how strict is the first rules table? | Allow each type pair today's cards use **5 or more times**, plus `part-of` → area. About 146 of the 680 non-`part-of` links go into the baseline. |
| Step 9: may `needs` join two questions? | **Yes.** `needs` means "B must be settled or built first". (8 such links today.) |
| Steps 5 and 6: a find hit below 1200 px | The detail panel **opens over the graph**, the same as a pick in the graph. |
| Step 6: the overlay below 1200 px | A 360 px panel with **no scrim**; the graph stays clickable. Esc, its close button or `]` closes it, and picking another card keeps it open. Esc closes only this graph overlay; on a document page it does nothing to the rail (`]` or its button closes it), and Esc in the find box closes only the find list (F2, #130, #131). Stacking, bottom to top: graph, then detail overlay, then top bar and find list (top bar raised to z-index 20), then toast and prompt dialog (50). |
| Step 5: the find list at small heights | As wide as the box (up to 32 rem), as tall as the window less the top bar and 16 px, and it **scrolls inside**. Each row is ID and title on one line, then a one-line snippet, both cut with an ellipsis. All 20 hits are kept. |

Other findings, without a ruling:
- The panel already lists incoming links under their reverse verbs (`neighbours()` in `layout.ts`), so step 11 is rescoped.
- All 62 areas are `open`, so step 10's area rule reads the `part-of` subtree instead.
- Expect about 190 gaps on day one.
- `pnpm graph` lives in the app, because a package may not import an app. The engine stays in `packages/workbench`.
- Today's numbers: 1,184 links and 12 `needs`.
- Step 8, once approved, depends on 10 (`/ready` reuses the decided-card rule) and adds `becomes` to step 9's rules table.

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
- Exact ID: a query that is a whole ID (case ignored, read with the app's `IdScheme`) puts that ID first. If it is a card, the hit opens `/?focus=<ID>`. Otherwise the hit opens the line that defines the ID: the first line that starts a heading, a table row (first cell) or a list item (`- R-WIZ-5.`), at `/doc/<slug>#L<n>`. A heading wins over a table row, and a table row over a list item; after that, file order, then line. The existing `LineJump` scrolls to the section that holds the line, not to the line itself. An ID with neither a card nor a defining line falls through to the word search.
- The list follows Bob's ruling in Requirement review: up to 32 rem wide, scrolls inside, one line for the ID and title and one for the snippet. Below 1200 px a card hit opens the detail panel over the graph, the same as a pick in the graph.
- Words: every word must appear (AND, case ignored). The score ranks a match in the ID, then the title, then the body or line text. Ties go to ID order with numbers compared as numbers (`MEC-2` before `MEC-10`), then file and line.
- The search runs on the server. A route `apps/game-workbench/src/web/app/api/find/route.ts` (`GET /api/find?q=`) reads the cards and docs on each request, but rebuilds the index only when a file in the design folder or its `cards/` folder was added, removed or changed (keyed on file mtimes and sizes, F2 #126), so an edit shows on the next search. The browser never loads all 500 cards. Each hit returns `{kind, id, title, snippet, href}`. A document-line hit shows the first ID on the line in its ID column, else `file:line` (Bob, 2026-10-21, #127).
- `packages/workbench/src/components/FindBox.tsx` is the client box that replaces the disabled input. It waits about 120 ms after typing before it fetches and shows a listbox (`role="listbox"`, `aria-activedescendant`). `/` focuses the box only when no other field has focus. `⌘K` / `Ctrl+K` always focuses it. Esc closes the list and leaves the box.
- Depends on: none
- Touches: `apps/game-workbench/src/web/**`, `packages/workbench/src/**`, `packages/workbench/styles/**`
- Deps change: no
- Runs: cloud
- Model: sonnet
- Done when:
  - Unit tests in `packages/workbench` (`find.test.ts`) cover:
    - a card by exact ID (case ignored);
    - a card by a word in its title, and by a word only in its body;
    - a document line by a word;
    - ties order `MEC-2` before `MEC-10`;
    - a document-only ID defined in a table row and one defined in a list item each resolve to their defining line;
    - an ID with no card and no defining line falls through to word search.
  - A test in the app on the real folder: `R-ENG-6` resolves to `/doc/requirements#L<n>`, where line n starts with `| R-ENG-6 |`; and `GET /api/find?q=MEC-012` returns `/?focus=MEC-012` first.
  - The top-bar box is enabled. The PR has a screenshot of the open list and a note that Enter on `MEC-012` focuses that card.
  - `pnpm check` passes.
  - Viewports: 1470 × 956 and 1280 × 800 (the open list scrolls inside and is not clipped)
  - Not required: typo tolerance, stemming, highlighting inside snippets, zero-padding (`MEC-12` does not find `MEC-012`), scrolling to the exact line, wiring into story-workbench (it has no code yet)

### Step 6: Works on a small screen (Bob, 2026-10-20)
Target: a 13-inch MacBook Air with no external monitor (about 1440 × 900 or 1470 × 956 in the browser, less the menu and tab bars).
- The left sidebar and the right detail panel each collapse to a thin rail with a button, and open again from it.
- Shortcuts: `[` toggles the left, `]` the right.
- Below about 1200 px wide, both start collapsed; the detail panel opens over the graph when a card is picked.
- The choice is remembered per browser.

How it is built:
- The right panel is `.detail` on the graph page and `.rail` on a document page. Both collapse the same way.
- `packages/workbench/src/panels.ts` holds the pure state. `initialPanels(width, stored)` returns the stored choice when there is one; otherwise both panels start closed below 1200 px and open at 1200 px or more. `togglePanel(state, side)` flips one side.
- `packages/workbench/src/components/Panels.tsx` is a client component. It sets `data-left` and `data-right` (`open` or `closed`) on `.shell`, but only after a toggle or when a stored choice exists.
  - `.shell[data-left]` drives the sidebar column.
  - `.shell[data-right]` drives the right column inside `.graph-layout` (`.detail`) and `.doc-layout` (`.rail`).
  - The closed state is the CSS default below 1200 px, so the first paint does not flash.
  - The old `max-width: 1000px` rule for `.doc-layout` and `.rail` in `globals.css` is replaced.
  - A closed panel is a 36 px rail with an open button, and an open panel has a close button.
  - `/map` and `/docs` have no right panel, so `]` does nothing there.
- The choice is saved in `localStorage` (`workbench.panels`), with every read and write in try/catch. With no saved choice, or when storage is blocked, the width rule applies.
- Below 1200 px an open right panel lies over the graph instead of taking a column. Picking a card in `FocusGraph`, or opening one from find, opens it there. At 1200 px or more, picking a card leaves Bob's choice alone.
- Overlay and z-order follow Bob's ruling in Requirement review: no scrim, the graph stays clickable, Esc, close or `]` closes it, and the top bar is raised to z-index 20 so the find list stays above the overlay and the graph's verb labels.
- `[` and `]` are ignored while a field has focus, and when ⌘ or Ctrl is held, so `⌘[` and `⌘]` still go back and forward.
- Depends on: 5 (both edit the top bar and the shared CSS)
- Touches: `apps/game-workbench/src/web/**`, `packages/workbench/src/**`, `packages/workbench/styles/**` (story-workbench gets the same panels)
- Deps change: no
- Runs: cloud
- Model: sonnet
- Done when:
  - Unit tests for `initialPanels` (saved choice wins; with none, closed below 1200 px and open at 1200 px or more) and for `togglePanel`.
  - At 1280 × 800: with both panels open, the stage is 700 px wide and there is no horizontal scroll. After both are collapsed (with the buttons, and again with `[` and `]`), the stage is 1208 px wide and each rail is 36 px.
  - At 1100 × 800: both panels start closed, and picking a card opens the detail over the graph without changing the graph's width.
  - A reload keeps the choice. With storage blocked, the width rule applies.
  - `pnpm check` passes.
  - Viewports: 1100 × 800, 1280 × 800 and 1470 × 956 (screenshots in the PR with panels open and collapsed)
  - Not required: animation, drag to resize, phone widths (below 1000 px), panels on `/map` and `/docs`

### Step 7: Sound review tool (Bob, 2026-10-20)
Bob listens to each of the 113 tower sounds and records how it feels, so sounds can be assigned to game mechanics. Today each `SND-` card says only the name and category; lengths are "?" in [tower-sound-inventory.md](../../../research/game-design/tower-sound-inventory.md).

Bob ruled on 2026-10-21 (see Answers): listening and recording happen in tower-poc, and the workbench shows the results. The work is split in two.

**7a: Review on tower-poc's Sounds page (tower-poc work, Experiment tier).** This is not a workbench step. tower-poc moved to the Experiment tier on 2026-10-21: it keeps its spec and milestone plans and needs no new intent per milestone, so this is a step in a tower-poc milestone plan, and it follows the `tower-capability` skill's safety rules.
- Each sound on the existing page gets **Stopped** after Play, which records two lengths from one play: `lengthMs` from the Play press and `answerLengthMs` from the tower's answer, each to the Stopped press (Bob, 2026-10-21). The tower does not report when a sound ends, so Bob's press is the measure. Built as tower-poc M6 (`apps/tower-poc/plans/M6-sound-feel.md`, spec D25). One press plays one sound once. Nothing plays on its own, and there is no "play all".
- For each sound Bob picks one of each:
  - **Mood**: dread, tension, wonder, triumph, loss, calm, comic, mystery, menace
  - **Reads as**: threat, alert, reward, failure, arrival, magic, voice, transition
  - **Strength**: soft, medium, strong
  - a few words of his own
- Picks are saved on the tower-poc server as Bob goes, so a review can span several sittings and survives cleared browser data (Bob, 2026-10-21). **Export** downloads `sound-feel.json`:
  `{ "version": 1, "sounds": [{ "id": "SND-044", "index": 44, "lengthMs": 2300, "answerLengthMs": 2240, "mood": "dread", "readsAs": "threat", "strength": "strong", "note": "…" }] }`.
  A length that was not measured is left out, never written as 0. `SND-NNN` is the tower index, so tower-poc builds the ID without importing workbench code.
- Claude reads the file and writes each sound to its `SND-` card as a `feel:` block and fills the lengths in the inventory. There is no import script.

**7b: `/sounds` in the workbench (this plan).**
- One row per `SND-` card, grouped by category, with its feel and length once recorded, and "unavailable" when not.
- Filter by mood or reads-as to choose a sound for a mechanic. No Play button.
- The `feel:` card field, in `research/game-design/cards/README.md` and the card schema.
- Done when: the card lint accepts a `feel:` block and rejects an unknown mood (the two new moods included); `/sounds` lists a card with a `feel:` block under its category, and the mood filter hides a card with another mood.
- Touches: `apps/game-workbench/src/web/**`, `research/game-design/cards/README.md` (the `feel:` field), `packages/workbench/src/cards.ts`, `apps/game-workbench/README.md` (the page), `apps/game-workbench/plans/plan.md`
- Depends on: none
- Deps change: no
- Runs: local
- Model: opus
- 7b can be built before 7a; until then every row shows "unavailable".
- As built: `CardSchema` gets an optional `checkFields(type, data)`, and the game's `checkFeel` (`lib/feel.ts`) is the check. Every `feel:` field is optional; the block also fails on a card that is not a sound, an unknown field, or a length that is not a whole number above 0. `/sounds` groups by the card's `part-of` area under AREA-021 ("Tower sounds: <category>"), filters with `?mood=` and `?reads=` links (no client code), and is linked from the sidebar.
- Bob's ruling (2026-10-21): the review records only the feeling a sound produces. **Fits** and **Avoid** are dropped from 7a and from the `feel:` block. Linking sounds to mechanics waits until mechanics are prototyped; a mechanic's tower interaction (lights, sound and movement as one unit) is then a `CUE-` card, and the rules already allow `cue uses <tower output>`.
- Changed 2026-10-26 (Bob): the review moved out of tower-poc into `apps/sound-review-tool`, with fewer fields. The `feel:` block is now `soundsLike` (Bob's words), `tone` (good, bad, neutral) and `lengthMs`; mood, reads-as, strength, `answerLengthMs` and note are gone, and `/sounds` filters by `?tone=`. The export is `research/game-design/sound-feel.json`, version 2. The 7a and 7b text above is kept as history.
- Changed 2026-10-27 (Bob): the tool has no export. It saves to `~/Desktop/sound-feel.json` as Bob goes, and that file is the output (`apps/sound-review-tool/README.md` has its shape).
- Later, the same review for the 21 light sequences (`LSQ-`) and the light effects (`LFX-`).

### Step 8: From design to requirements (Bob, 2026-10-20)
Today [requirements.md](../../../research/game-design/requirements.md) holds the `R-` requirements as a draft, and the cards hold questions, options and decisions. Nothing shows which decisions have become requirements yet. Proposal, kept small:
- **Ready view** (`/ready`): `decided` cards with no link to an `R-` requirement, grouped by area. These are the next requirements to write.
- **Draft requirement** button on a card: a prompt asking Claude to write an `R-` row (MUST/SHOULD/MAY, a test, the source card) in the right section of requirements.md, and to link the card to it with a new `becomes` link.
- **Coverage**: on the map page, per area, how many decisions have a requirement. A lint warning (not an error) for an `R-` row with no source.
- When a whole area is ready, the existing `prd-02-write` skill turns its requirements into a PRD for `apps/game`. No new tool is needed for that.
- Done when: a decided card with no `becomes` link shows in the ready view, and stops showing once it has one; the draft prompt names the card, its area and its linked decisions.
- Touches: `apps/game-workbench/src/web/**`, `research/game-design/cards/README.md` (the `becomes` link), `packages/workbench/src/graph-types.ts`, `apps/game-workbench/src/web/lib/link-rules.ts` (a `becomes` row), `research/game-design/cards/.link-baseline.json`
- Depends on: 10 (`/ready` reuses step 10's decided-card rule)
- Requirements stay as `R-` rows in requirements.md, with no `REQ-` cards (Bob, 2026-10-21).

### Step 9: Link rules for new links (Bob, 2026-10-21)
Today 1,184 links are mostly loose (`refines` 239, `uses` 216, `affects` 138), and only 12 are `needs`.
- `research/game-design/cards/README.md` gets a rules table for each link type: which card types it may join, and whether it sets build order. `needs` means "B must be settled or built before A" and is the only link that sets build order. It may join two questions (Bob, 2026-10-21).
- The first table allows each type pair today's cards use 5 or more times, plus `part-of` → area (Bob, 2026-10-21). While building, Bob also ruled to add rules by meaning on top: `conflicts` between any two things; `answers` from anything to a question; `needs` from a buildable thing or idea to a buildable thing or question, and question → question; and screen, ui and cue may use ui, cue and tower outputs. Frequency alone would have blocked every new `needs` and `conflicts` link. Result: 52 common shapes plus the meaning rules, with 134 links in the baseline and no cycles.
- The generic checker is `packages/workbench/src/rules.ts`. It takes the rules table and the app's `kindOf`, because 109 links point at IDs that are not cards (`R-`, `E`, `AST-T`…). The table lives in the app, in `apps/game-workbench/src/web/lib/link-rules.ts`. The checker fails when `needs` or `part-of` links form a cycle.
- Old links are grandfathered. A baseline file (`research/game-design/cards/.link-baseline.json`) lists today's rule breaks, one `from|rel|to` key each, sorted.
  - The card lint fails on any break not in the baseline, so a new link must follow the rules. An old one waits for the link review (Later).
  - The lint also fails on a baseline entry that is no longer a break, so fixing an old link means removing its line.
- Depends on: none
- Touches: `research/game-design/cards/README.md`, `research/game-design/cards/.link-baseline.json`, `packages/workbench/src/**`, `apps/game-workbench/src/web/lib/**`, `apps/game-workbench/plans/plan.md` (this deviation and the Done row)
- Deps change: no
- Runs: local (it sets the rules Bob reviews)
- Model: opus (schema design)
- Done when:
  - Unit tests:
    - a link joining types its rule does not allow fails;
    - a `needs` cycle (A → B → A) fails, and so does a `part-of` cycle;
    - a break in the baseline passes, and one not in it fails;
    - a baseline entry that is no longer a break fails;
    - every rel in `RELS` has a row in both the README table and `link-rules.ts`.
  - The card lint passes on today's cards, with a baseline of at most 160 entries.
  - `pnpm check` passes.
  - Not required: fixing old links, changing the graph's look

### Step 10: Gaps report (Bob, 2026-10-21)
- `packages/workbench/src/gaps.ts` finds gaps in the graph as pure functions. Each gap carries the card ID and the rule that found it.
- First rules:
  - an open question with no `answers` link to it;
  - a mechanic with no link either way to a screen, UI piece or cue;
  - a `conflicts` link where neither card is parked. Bob's ruling (#136): a conflict between a card and a document ID (`R-`, `E…`) is settled once the card side is parked or decided; card-to-card conflicts stay settled only when either card is parked;
  - a decided card (decision, mechanic, screen, ui or cue) with no link to an `R-` ID other than `conflicts`, so step 8's `becomes` counts with no change here. Bob's ruling (#136): decided means status `decided` only, and `R2-`/`R3-` links count as requirement links, as built;
  - an area where no card in its `part-of` subtree is decided.
- A card in several areas counts once in each.
- Day one: 157 gaps (160 as first built, 157 after the conflict ruling in #136).
- Changed by step 13: the decided-card rule became "decided ruling no deliverable reaches" (DEC-355), and a conflict on an answered question no longer counts.
- A **Gaps** page (`/gaps`), linked from the sidebar, grouped by rule and then by area, with a count on the map page for each area. Each row opens the card.
- `pnpm graph gaps` prints the same list, so Claude can start a design session from it.
  - The engine is in `packages/workbench/src` and is exported from `server.ts`, so the package's `package.json` is not edited.
  - The entry point is the app's `apps/game-workbench/src/web/cli/graph.ts`. It supplies the app's card schema, ID scheme and folders, and handles the subcommands (`gaps`, `show` and `find`; `show` and `find` came with step 11).
  - The root script is `"graph": "node apps/game-workbench/src/web/cli/graph.ts"`. Node 24 strips the types, so the CLI uses erasable TypeScript only and nothing it reaches imports `next` or a `.tsx` file.
  - For now it covers the game only; later apps add `--app`.
- A gap is a warning, never an error. `pnpm check` does not fail on gaps.
- Depends on: 9
- Touches: `packages/workbench/src/**`, `apps/game-workbench/src/web/**`, `apps/game-workbench/README.md` (the command), root `package.json` (the `graph` script)
- Deps change: yes (one root `package.json` script, no new packages)
- Runs: cloud
- Model: sonnet
- Done when:
  - Unit tests on a small graph: each of the five rules finds its gap, and does not report it once the gap is fixed.
  - A test on the real cards folder: the count `pnpm graph gaps` prints (a line `N gaps`) equals the sum of the `/gaps` group counts. Both come from the same function.
  - `/gaps` is linked from the sidebar, and each row opens its card. The map page shows a count per area.
  - `pnpm check` passes and does not fail on gaps.
  - Viewports: 1470 × 956 (`/gaps`)
  - Not required: an AI review (that is the `graph-review` skill, Later), rules beyond the five above, fixing the gaps

### Step 11: What points here, and `pnpm graph show` (Bob, 2026-10-21)
- The detail panel already lists incoming links under their reverse verbs (`neighbours()` in `layout.ts`). Missing today: the links' notes, and any split between links in and links out.
- Add `backlinks(graph, id)` as a pure function in `packages/workbench/src`: the incoming links, grouped by reverse verb ("needed by", "answered by"…), with notes. The panel uses it under two headings, "Points here" and "Links from here", and shows the notes. Documents that mention the ID are already listed.
- `pnpm graph show <ID>` prints the card, its links both ways with verbs and notes, and its sources. `pnpm graph find <words>` prints step 5's search.
- Depends on: 5, 10 (the CLI)
- Touches: `packages/workbench/src/**`, `apps/game-workbench/src/web/**`
- Deps change: no (the `graph` script exists from step 10)
- Runs: cloud
- Model: sonnet
- Done when:
  - Unit tests on `backlinks`: a card that only other cards link to returns them grouped under the reverse verb, with each link's note; a card with no incoming links returns an empty list.
  - `pnpm graph show MEC-012` prints the card, its links in both directions with verbs and notes, and its sources. A test compares the output with `backlinks`.
  - `pnpm graph find <words>` prints the same hits as `GET /api/find?q=` for the same query.
  - `pnpm check` passes.
  - Viewports: 1470 × 956
  - Conflict rule per #136 (recorded deviation, see step 10): a `conflicts` link to a document ID is settled when the card is parked or decided; unit tests cover both cases.
  - Not required: an impact view across several hops (Later)

### Step 12: Engine map (Bob, 2026-10-27)
Bob: a way to visualize the game engine's loops, as designed (loops within loops) and as it will be implemented (an event model), as a design aid that names every card.
- `/engine` reads every loop card's `railroad` block (DEC-276) on each request. Four tabs: the loop stack and each railroad as designed, with a "read as events" lens; the event model from the bloodtower spec D32 to D38 (events in, `step(state, event)`, effects out; what each node kind becomes; waits per loop; the five triggers as domain events; interrupts; where the spec and the cards disagree); a walkthrough that runs the railroads as one reducer with a stack and an event log; and every idea and every card a loop names, placed on the loop nodes.
- Every ID opens its card in a side panel. The view is kept in the URL hash, so a link names a loop, a node and a card.
- Done when: all 13 loop cards read with no errors; the session walkthrough reaches the encounter's pick through six frames; an interrupt resumes at the held node; `lib/engine.test.ts` passes.
- Touches: `apps/game-workbench/src/web/{app/engine/**,lib/engine.ts,lib/engine.test.ts,components/Sidebar.tsx}`, `apps/game-workbench/{README.md,plans/plan.md}`, `.claude/launch.json`

### Step 13: Card drift and the DEC-355 gaps (IDEA-062, 2026-10-29)
Bob ruled this tooling comes before the scripted playthroughs, so the design changes they cause can be traced to code already built. Cards carry no version fields; git is the change record (DEC-505).
- `pnpm graph drift`: for each plan step's `Builds:` cards (or, until steps carry that line, the card IDs the step cites), and everything they reach by `needs`/`uses`, the cards changed in git since the step merged, plus changed cards that refine, affect or conflict with one. The case behind it: C1 step 6 built on DEC-155 on 2026-10-23, and DEC-275 reversed it on 2026-10-26.
- Gaps, no deliverable: a decided decision that no live `SCR-`, `UI-`, `CUE-`, `MEC-` or `ART-` card reaches by `needs` or `uses`, over any number of hops (DEC-355). It replaces "decided card with no requirement".
- Gaps, answered conflicts: a `conflicts` link on an answered question (status `answered`, or with an `answers` link to it) is not a gap; it records what the question was about.
- Touches: `apps/game-workbench/src/web/{cli/graph.ts,lib/drift.ts,lib/drift.test.ts}`, `packages/workbench/src/{gaps.ts,gaps.test.ts}`, `apps/game-workbench/{README.md,plans/plan.md}`
- Deps change: no
- Done when: the commands work against the current cards; vitest covers each with a small fixture (`lib/drift.test.ts`, `packages/workbench/src/gaps.test.ts`); `pnpm check` passes. Gaps went from 720 to 372: "Decided card with no requirement" (627) became "Decided ruling no deliverable reaches" (286), and "Conflict not yet settled" went from 8 to 1.
- Not required: a `replaces` verb (DEC-352, later), adding `Builds:` lines to existing plans.

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
