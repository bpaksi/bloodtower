# packages/

Shared code lives here **only once a second app needs it**. Until then it stays inside the app that owns it (for example, the tower WebSocket protocol starts life as `apps/tower-poc/src/protocols`).

Promoting code here:
1. Write a decision record in `research/decisions/` saying what moves and which apps use it.
2. Move it with `git mv` to `packages/<name>/` and name the package `@dark-tower/<name>`.
3. Update the importing apps in the same branch.

Current packages:

| Package | Used by | Decision |
|---|---|---|
| [`rng`](rng/) (`@dark-tower/rng`) | prototypes, bloodtower engine | [0005](../research/decisions/0005-seeded-rng-package.md) |
| [`tower`](tower/) (`@dark-tower/tower`) | tower-poc, prototypes drift test, bloodtower host (C1 step 9) | [0004](../research/decisions/0004-tower-package.md) |
| [`workbench`](workbench/) (`@dark-tower/workbench`) | game-workbench, story-workbench | [0002](../research/decisions/0002-workbench-package.md) |
