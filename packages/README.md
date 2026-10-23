# packages/

Shared code lives here **only once a second app needs it**. Until then it stays inside the app that owns it (for example, the tower WebSocket protocol starts life as `apps/tower-poc/src/protocols`).

Promoting code here:
1. Write a decision record in `research/decisions/` saying what moves and which apps use it.
2. Move it with `git mv` to `packages/<name>/` and name the package `@dark-tower/<name>`.
3. Update the importing apps in the same branch.

Current packages:

| Package | Used by | Decision |
|---|---|---|
| [`rng`](rng/) (`@dark-tower/rng`) | prototypes, and the bloodtower engine once C1 step 3 lands | [0005](../research/decisions/0005-seeded-rng-package.md) |
| [`workbench`](workbench/) (`@dark-tower/workbench`) | game-workbench, story-workbench | [0002](../research/decisions/0002-workbench-package.md) |

Likely next candidates: the tower protocol schemas and a tower client, once `game-test` needs to drive the tower.
