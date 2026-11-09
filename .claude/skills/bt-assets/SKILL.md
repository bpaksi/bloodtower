---
name: bt-assets
description: Make the voice and picture assets of a Bloodtower story with asset-studio. Use when Bob or a session says "render the assets", "make the assets for <story>", "assets:needs", "pack the assets", "redo <ID>: <note>", or "import the funeral voices".
---

# Bloodtower assets

Drives the root `pnpm assets:*` commands for one story. Work folder layout: spec D41. All commands take `--work-folder <dir>` and `--packs-dir <dir>`; with no work folder set (flag, `ASSET_STUDIO_WORK_FOLDER` or asset-studio's saved config) they stop with `AS-CONFIG-1` and touch nothing. Never read, copy or pass an API key: use only the keys the person has already set.

## Make a story's assets

1. **Ask once:** studio mode (no `--ai`) or AI image mode (`--ai`). Keep the answer for the whole run.
2. **Tell the person before the render:** "Rendering can spend money on a real provider." Wait for a yes. Then run, in this order:
   1. `pnpm assets:needs <story>` (add `--verbose` to see every row)
   2. `pnpm assets:render <story> [--ai] [--only voice|picture]`
   3. `pnpm assets:pack <story>`
3. **Stop on the first non-zero exit.** Show the person the command, its exit and its code (`AS-...` or `A1-...`, and every `failed <id> <code>` line). Do not run the later commands, retry, switch story or provider, or fall back to another mode.
4. `assets:pack` needs a job from an earlier render (`A1-23` otherwise). Pass `--drafts` only if the person asks for drafts in the pack. A pack that is not complete passes with a warning until `pnpm pack:lint --release`.

## Redo

"redo `<ID>`: `<note>`" becomes `pnpm assets:redo <story> <ID> "<note>"`, the exact id and the exact note, for the story the person named. An unknown story (`A1-26`) or id (`AS-ID-1`) is an error: show it, never guess the nearest name. Then offer `assets:render` for a new draft (after the money notice above). The note stays in asset-studio's notes.

## Import (one time)

`pnpm assets:import <funeral|test>` seeds the voice cache from the funeral proof of concept; it prints how many lines a voice render would still pay for. Do not run the funeral voice render unless the person says so.

## Never

- Never mark an asset final, or change an asset's status. Final is the person's decision, made in the studio.
- Never pass `--drafts` unless asked, and never use a key the person did not set.
