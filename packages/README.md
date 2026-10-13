# packages/

Shared code lives here **only once a second app needs it**. Until then it stays inside the app that owns it (for example, the tower WebSocket protocol starts life as `apps/tower-poc/src/protocols`).

Promoting code here:
1. Write a decision record in `research/decisions/` saying what moves and which apps use it.
2. Move it with `git mv` to `packages/<name>/` and name the package `@dark-tower/<name>`.
3. Update the importing apps in the same branch.

Likely first candidates: the tower protocol schemas and a tower client, once `game-test` needs to drive the tower.
