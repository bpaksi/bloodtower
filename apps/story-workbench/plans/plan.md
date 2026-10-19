# Story workbench plan

Status: approved by Bob, 2026-10-19 (in session). Tier: Experiment (one plan, one branch and PR per step, merged in order).

## Goal

A local, read-only site like game-workbench, but for **several stories at once**:
- Each story in `research/stories/<folder>/` keeps its own cards, documents and IDs.
- An element can be **copied** from one story into another.
- As in game-workbench, every change goes through a prompt pasted into Claude, and each prompt is scoped to one story.

## Rulings (Bob, 2026-10-19)

| # | Ruling |
|---|---|
| R1 | IDs carry the story code: `DRA-CHR-004` |
| R2 | A separate app, not a mode of game-workbench |
| R3 | Copy only in v1. Borrow (a live link to another story's card) later |
| R4 | Turn the existing Dracula notes into cards |
| R5 | Merge `feat/game-workbench-shell` first, then move the shared code into `packages/workbench` |

## Steps

### Step 0: Land game-workbench (PR #96)
- Depends on: none
- Touches: `apps/game-workbench/**`
- Deps change: no
- Runs: local

### Step 1: Scaffold (PR #97)
- `new-app` README, the apps table row and this plan. Bob writes `intent/0001-story-workbench.md`.
- Depends on: none
- Touches: `apps/story-workbench/README.md`, `apps/story-workbench/plans/**`, `README.md`
- Deps change: no
- Runs: local

### Step 2: Extract `packages/workbench` (PR #98)
- `@dark-tower/workbench` holds:
  - ID schemes and the renderer
  - card parsing against a `CardSchema`, the graph with `graph.rels`, and the layout
  - prompt text from a `PromptConfig`
  - the disk loaders and the React parts
- game-workbench keeps its config and pages, and its behaviour does not change. `loadCards` reports broken files instead of throwing. Decision 0002.
- Depends on: 0
- Touches: `packages/workbench/**`, `apps/game-workbench/**`, `research/decisions/**`, `pnpm-lock.yaml`
- Deps change: yes
- Runs: local

### Step 3: story-workbench shell
- Depends on: 1 (intent accepted), 2
- Touches: `apps/story-workbench/**`, `research/stories/CARDS.md`, `pnpm-lock.yaml`
- Deps change: yes
- Runs: local

**Package.** `apps/story-workbench/src/web` (`story-workbench-web`) on port 4798.

**Registry.** Each story has `research/stories/<folder>/story.yaml` with `code` (3 capital letters, unique, never changed), `title`, `status` and `tagline`.
- A folder without one is listed as "not set up".
- A duplicate code is a lint error.

**IDs.** `<CODE>-<TYPE>-<NNN>`. The pattern is built from the registered codes only, so `GAP-HW-010`, `R-ENG-20` and `D-DRA-11` are never read as story IDs. Game-design IDs (`MEC-005`, `AREA-002`, `E19`, `R-WIZ-5`) are recognised and appear as game-design chips.

**Card types:**

| Type | Prefix |
|---|---|
| character | `CHR` |
| location | `LOC` |
| item | `ITM` |
| faction | `FAC` |
| part (an act, chapter or night; parts nest) | `PRT` |
| scene | `SCN` |
| beat | `BT` |
| line | `LN` |
| idea | `IDEA` |
| question | `Q` |
| option | `OPT` |
| decision | `DEC` |

Cards have no layers. A part, scene or beat has an `order:` number.

**Verbs.** The shared ones, plus `appears-in`, `leads-to` and `foreshadows`.

**Isolation lint:**
- A card's code matches its folder.
- A link goes to the same story or to the game design.
- No link goes to another story.

**Routes:**

| Route | What |
|---|---|
| `/` | Stories |
| `/s/[code]` | Focus graph |
| `/s/[code]/outline` | Parts → scenes → beats in order, with their cast and places |
| `/s/[code]/docs`, `/s/[code]/doc/[slug]` | The story's documents |

**Prompts** name one story: "Edit only `research/stories/<folder>/` … Never edit another story's folder or `research/game-design/`."

### Step 4: Copy between stories
- Depends on: 3
- Touches: `apps/story-workbench/**`, `research/stories/CARDS.md`
- Deps change: no
- Runs: local

**Front matter on the copy:** `copied_from: { id, hash, date }`, where `hash` is the first 8 hex characters of the sha256 of the source card file.

**Prompt starter.** A **Copy to…** mode with a target picker; the page fills in the hash.

**Card panel:**
- a "Copied from" badge
- a "source changed since copy" warning, or "source unavailable" if it has been removed

**Lint.** `copied_from.id` must be another registered story's ID, and `hash` must be 8 hex characters.

### Step 5: Dracula into cards, plus a Fellowship seed
- Depends on: 3
- Touches: `research/stories/dracula/**`, `research/stories/fellowship/story.yaml`, `research/stories/fellowship/cards/**`
- Deps change: no
- Runs: local

**Dracula (`DRA`):**

| Source | Cards |
|---|---|
| `characters.md` | The hunters and the Count |
| Overview and continuity guide | Locations and factions |
| `rulings.md` | Decisions (`decided`, since Bob ruled them) |
| `opening-scene.md` and set pieces | Nights and scenes |
| Open questions | Questions |

- Mechanics link to game-design IDs.
- Every other card Claude drafts is `proposed`.
- The documents stay where they are, as the sources.

**Fellowship (`FEL`):** `story.yaml`, plus the wizard, the heroes and Part 1, so Copy has something to work with.

## Batches

- B1: 0, 1 (independent)
- B2: 2 (stacked on 0 until #96 merges)
- G-intent: Bob writes and accepts `intent/0001-story-workbench.md`
- B3: 3 (depends on G-intent and B2)
- B4: 4, 5 (Touches do not overlap; merge order 5, then 4, so Copy is tested on real cards)

## Verification

- Every step: `pnpm check` passes.
- Step 2: before and after screenshots and the visible DOM of game-workbench match.
- Steps 3–5: drive the site on port 4798:
  - the story list
  - `DRA` graph and outline
  - game-design chips
  - a Copy prompt run on a throwaway branch, then the badge and the "changed" warning
  - a cross-story link that fails the lint

## Results

- 2026-10-19: #96 and #97 opened (B1). #98 opened (B2), with game-workbench screenshots before and after byte-identical.
