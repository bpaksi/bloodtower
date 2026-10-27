# Sound review tool (`sound-review-tool`)

| | |
|---|---|
| Purpose | Connect and calibrate the tower, then play each sound and describe it: sounds like, tone and length, saved in the file the game design reads |
| Phase | Build |
| SDLC tier | Experiment |
| Status | Built and tried on the mock tower; awaiting Bob's use on the real one |
| Disposable? | Yes. The data file is kept; the tool is not |

Intent: [intent/0001-sound-review-tool.md](intent/0001-sound-review-tool.md). It replaces the Review feel mode that was on tower-poc's Sounds page (tower-poc spec 1.25).

## Run

From the repo root, after `pnpm install`:

```bash
pnpm --dir apps/sound-review-tool dev
```

Open http://127.0.0.1:4791. The server listens on 127.0.0.1 only. `MOCK=1` uses the mock tower; `PORT` changes the port. The tower takes one Bluetooth connection at a time, so disconnect tower-poc first.

## The two steps

1. **Tower:** Connect, then Calibrate. Nothing happens until a button is pressed: no auto-connect, no auto-calibrate, no retry. After an unexpected disconnect the page offers Reconnect.
2. **Sounds:** each of the 113 sounds, with Play and Stopped. The length runs from the Play press to the Stopped press, as the tower does not say when a sound ends. Type what it sounds like (Enter or leaving the field saves it) and pick good, bad or neutral (pick it again to clear it). "Only not reviewed" hides the sounds that have anything recorded.

## Data

- **Data file:** every change is saved at once to `~/Desktop/sound-feel.json`. That file is the output; there is no export. `DATA_FILE=<path>` saves somewhere else. A mock run keeps its own, `data/sounds.mock.json`.
- **Moving from the old place:** with no Desktop file yet, the tool copies the old `data/sounds.json` there on start. The old file is left as it was.
- **Bad data:** loading works as in the board map tool. Entries and fields the tool cannot use are dropped and listed on the page; a file that is not JSON is moved aside next to it (`sound-feel.broken-<time>.json`) and the tool starts from the seed.
- **Start:** with no draft, the tool starts from `src/seed.json`: the 14 sounds reviewed on tower-poc. The note became sounds like and the length from Play was kept. The tone was set only where the old mood and reads-as both pointed one way (triumph or reward is good; dread, menace, tension or threat is bad). `pnpm import-tower-poc [db]` rebuilds the seed from tower-poc's database.
- **Shape:** `{ "version": 1, "sounds": { "1": { "index": 1, "soundsLike": "growl", "tone": "bad", "lengthMs": 3635, "updatedAt": 1793105237656 } } }`, keyed by sound index, one entry per sound with anything recorded. A value not entered is left out, never 0 or "". Sound 1 is card `SND-001`. The card `feel:` block uses the same fields (research/game-design/cards/README.md).

## Tower safety

The page reaches the tower only through `POST /api/command` with `{capabilityId, params}`. The server refuses every capability but `sound.play` before the executor sees it, and runs it through `@dark-tower/tower`, so the inventory schema and the executor's checks hold. Calibrate is refused while a play is still running.

## Errors

Every error is logged by the server and shown on the page with its code: tower errors under step 1, refused plays and saves as a toast.

## Commands

- `pnpm dev` or `pnpm start`: run the tool.
- `pnpm test`: model and server tests (the server tests use the mock tower).
- `pnpm typecheck`.
- `pnpm import-tower-poc [path]`: rebuild `src/seed.json` from tower-poc's `sound_feel` table.
