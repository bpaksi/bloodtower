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
- How: `rg` check in a vitest: no file under `src/` imports `protocols/pack`, `protocols/storyCard` or `server/pack/load`.
- Pass evidence: zero matches.
- Fails if: a shim re-exports the v1 shapes under a new name.

### EV-03 — Pick story is unchanged
- Requirement: The story list shows what it showed before (SCR-007).
- Method: playwright
- How: `w3-pick-story.spec.ts`: open Pick story.
- Pass evidence: the same covers in the same order as on `main` before the change; Dracula still shows its settings without Long (C2 feature 01).
- Fails if: a story drops out, or Dracula shows as not ready when it was playable.

### EV-04 — A broken v2 pack fails loudly
- Requirement: A pack that fails lint never reaches Pick story (pack lint, error rule).
- Method: unit
- How: load a copy of `packs/test` with a missing chapter ID.
- Pass evidence: the loader returns a lint issue naming the file and the ID; the story shows as Not ready (SCR-009); no exception escapes.
- Fails if: the host crashes, or the story is listed as playable.

### EV-05 — Dead files removed
- Requirement: The C2 audit's dead files are deleted.
- Method: unit
- How: `pnpm check` and a file-exists check in the PR's verifier table.
- Pass evidence: `server/timing/log.ts`, `stats.ts`, `control/lock.ts` and their tests are absent; `pnpm check` passes.
- Fails if: a file stays with no importer.

## Survival evals (one per survival invariant in plan.md)

### EV-06 — An old autosave does not crash the host
- Requirement: The error rule; DEC-208.
- Method: unit
- How: seed the DB with an autosave written by `main` before this change; start the host.
- Pass evidence: either Continue resumes it, or Pick story shows no Continue and the host log has one line naming the old version. No exception.
- Fails if: the host throws at startup.

## Assumptions surfaced

- An autosave from the v1 path may be dropped rather than migrated. Bob: OK? (OPEN Q-C3-07)

## OPEN questions

- Q-C3-07: may a pre-C3 autosave be dropped, or must it migrate?
