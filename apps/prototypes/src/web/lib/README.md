# Shared parts for prototype pages

A prototype is one folder, `app/p/<name>/`, with a `page.tsx` (a client component) and a `FINDINGS.md`.
Import with relative paths and the `.ts`/`.tsx` extension. Run with `pnpm --dir apps/prototypes/src/web dev` (port 4777).
The root layout already mounts the log panel, the toasts, an error boundary and the global error handlers, so a page does nothing to turn them on.

## Seeded random: `lib/rng.ts`

```ts
const rng = createRng(seed);        // seed: string | number; same seed = same draws
rng.roll("2d6+1")                   // { total, dice, modifier, notation }; also "1d6", "d20", "3d4-2", "+2"
rng.int(1, 6); rng.chance(0.3); rng.pick(items); rng.shuffle(items); rng.next()
```

Every random draw on a page comes from a `createRng`. Show the seed in the page (an input, default e.g. `"1"`) and build the rng from it, so "same seed" replays a run. Bad dice text throws; do not catch it just to continue.

## Tuning panel: `lib/tuning.ts` + `components/TuningPanel.tsx`

```tsx
const fields: TuningField[] = [{ key: "floor", label: "Move floor", type: "number", default: 1, min: 0, note: "DEC-102" }];
const [values, setValues] = useState(defaultValues(fields));
<TuningPanel fields={fields} values={values} onChange={setValues} />   // has Copy as JSON and Paste JSON
```

Put every invented number in `fields`; use the card's value as the default and say which card in `note`. Read `values.floor` in the game and in the simulation. `toJson(fields, values)` gives the text FINDINGS.md records.

## Batch runner: `lib/batch.ts`

```ts
const runs = runBatch(1000, seed, (rng, i) => playOneTurn(rng, values));  // run i is seeded `${seed}:${i}`
share(runs, r => r.reachedVillage);  mean(runs, r => r.movesLeft);  tally(runs, r => r.outcome);
```

`play` must be a pure function of its rng and the tuning values. An empty batch gives `null` (show "unavailable", never 0). `runSeed(seed, i)` replays one run alone in the page.

## Placeholder box: `components/Placeholder.tsx`

`<Placeholder label="Hero portrait: Paladin" width={160} height={200} />` is a labelled grey box for art that does not exist yet. Use the real asset when it does (packs/test, apps/bloodtower/public, docs/art-direction).

## TV frame: `components/TvFrame.tsx` + `lib/tv.ts`

```tsx
<TvFrame><p style={{ fontSize: tvPx(28) }}>Waiting for heroes</p></TvFrame>
```

A 16:9 frame fills the viewport, black bars around it. Sizes are written in design px at 1920 wide: `tvPx(28)` is 28 px at 1080p and 56 px at 4K. Use `tvPx` for every size inside the frame (font, padding, gaps) so the layout scales as a whole. `scaledPx(28, frameWidth)` gives the number for a unit test.

## Logger, log panel and toasts: `lib/logger.ts`

```ts
import { logger } from "../../../lib/logger.ts";
logger.debug("expected recovery");      // console + panel
logger.info("...");  logger.warn("...", "CODE");
logger.error("Could not roll", cause, "ROLL_FAILED");   // console + panel + toast
```

- Never eat, hide or ignore an error (CLAUDE.md, Errors). No empty `catch`, no `.catch(() => {})`.
- An error thrown in a page, a render error and an unhandled rejection are caught for you and logged.
- An error from a press: `logger.error` returns the entry; show `${entry.code}: ${entry.message}` next to the control that was pressed (see how `TuningPanel` does it).
- The same error repeated shows as one toast with a count. The panel (bottom-left "Log") lists everything and has Export (JSON download).
- An outcome the code expects and fully recovers from is not an error: write a `debug` line.
- In unit tests, use `createLogger({ sink })` for a private logger.
