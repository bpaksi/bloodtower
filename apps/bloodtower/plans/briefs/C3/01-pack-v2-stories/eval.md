Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 01-pack-v2-stories — Stories load from pack v2; the v1 loader goes

- Brief: ./plan.md
- Mockup: none
- Risk: High. Restore evals included.

## Checks

### EV-01 — Every story loads through the v2 loader
- Requirement: Story loading uses pack format v2 only (C2 audit, C3 lines; MEC-078).
- Method: unit
- How: server test `pack/v2/load.test.ts` "loads every shipped story": load `packs/test` and `packs/dracula` metadata.
- Pass evidence: both load through `v2/load.ts`; a spy on the v1 `load.ts` entry (or its absence from the module graph) shows zero calls.
- Fails if: any story still reaches the engine through `protocols/pack.ts` or `storyCard.ts`.

### EV-02 — No v1 import is left
- Requirement: The v1 story-card shapes are gone (C2 audit).
- Method: unit
- How: vitest: (1) `protocols/pack.ts`, `protocols/storyCard.ts` and `server/pack/load.ts` do not exist; (2) `rg` finds no file under `src/` importing `protocols/pack`, `protocols/storyCard` or `server/pack/load`; (3) `rg` finds no declaration or re-export (`export type|interface|const|function`, `export { … as … }`, `export * from`) of the v1 symbols `StoryCard`, `StoryCardV1`, `PackV1`, `PackMetaV1`, `loadPackV1`, `loadStoryCard` anywhere under `src/`, and no module re-exports from a path under `server/pack/` other than `v2/`, `assets`, `camera`, `audio`.
- Pass evidence: the three files are absent; zero import matches; zero symbol/re-export matches.
- Fails if: any of the three files exists, or a shim re-exports the v1 shapes or loader under a new name or path.

### EV-03 — Pick story is unchanged
- Requirement: The story list shows what it showed before (SCR-007).
- Method: playwright
- How: `w3-pick-story.spec.ts`: open Pick story.
- Pass evidence: the ordered pack ids and titles match a committed fixture `w3-pick-story.main.json` captured from `main` before the change; Dracula still shows its settings without Long (C2 feature 01).
- Fails if: a story drops out, or Dracula shows as not ready when it was playable.

### EV-04 — A broken v2 pack fails loudly
- Requirement: A pack that fails lint never reaches Pick story (pack lint, error rule).
- Method: unit
- How: load a copy of `packs/test` where one quest's `chapter:` is `ch-9`, which no chapter declares.
- Pass evidence: the loader returns a lint issue with `file: …/quests.yaml` and `id: ch-9`; the story shows as Not ready (SCR-009); no exception escapes.
- Fails if: the host crashes, or the story is listed as playable.

### EV-05 — Dead files removed
- Requirement: The C2 audit's dead files are deleted.
- Method: unit
- How: `pnpm check` and a file-exists check in the PR's verifier table.
- Pass evidence: `server/timing/log.ts`, `stats.ts`, `control/lock.ts` and their tests are absent; `pnpm check` passes.
- Fails if: a file stays with no importer.

### EV-06 — Asset serving works on v2 paths only
- Requirement: plan "keeps today's asset serving working on v2 paths only".
- Method: unit
- How: server test: GET one cover and one audio asset of `packs/test` by its v2 path, then by its old v1 path.
- Pass evidence: both v2 GETs return 200 with the file's bytes; both v1 GETs return 404.
- Fails if: a v2 path fails, or a v1 path still serves.

## Survival evals (one per survival invariant in plan.md)

### EV-07 — A pre-C3 autosave is dropped, without a crash
- Requirement: Q-C3-07 (Bob, 2026-10-31): pre-C3 saves are dropped; the error rule; DEC-208.
- Method: unit
- How: seed the DB with an autosave written by `main` before this change; start the host.
- Pass evidence: no Continue on the session screen (C2 06) or on Pick story; the host log has exactly one line `save skipped: pre-C3 format` with `{version}`; the row is still in the DB, unchanged (kept and ignored, Bob approved 2026-10-31); a New game starts clean. No exception, no migration.
- Fails if: the host throws at startup, Continue is offered for the old save, the log line is missing or repeated, the row is deleted or rewritten, or the save is migrated and resumed.

## Assumptions surfaced

- An autosave from the v1 path is dropped, not migrated (Q-C3-07, ruled). The row is kept and ignored, logging `save skipped: pre-C3 format` (Bob approved 2026-10-31).

## OPEN questions

- ANSWERED Q-C3-07 (Bob, 2026-10-31): yes, pre-C3 saves are dropped, not migrated.
