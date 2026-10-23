# `@dark-tower/rng`

Seeded generator and dice notation (decision 0005). The prototypes import it, and the Bloodtower engine will too. The batch runner stays in the prototypes app.

```ts
import { createRng, eventRng } from "@dark-tower/rng";

const rng = createRng("bloodtower");
rng.roll("1d6"); // same seed, same draws as before this package existed

// One event: a fresh generator. Same seed and seq, same draws, whatever was drawn before.
const event = eventRng("bloodtower", 4);
```

No I/O and no clock. There is no unseeded fallback. `createRng` is the generator the prototypes already used; its stream for a given seed is unchanged.
