# 0005 — Seeded randomness moves to `packages/rng`
Date: 2026-10-23 · Status: accepted

## Context
Every random draw in the saga game comes from a seed: move rolls (DEC-079, DEC-102), events (MEC-005), the fortune wheel purse (DEC-114). The event log carries the game's seed (DEC-107), so a game can be replayed exactly, and the Bloodtower simulator runs many seeded games headless.

The prototypes app already has a seeded generator with `roll("1d6")`-style dice and a batch runner (`apps/prototypes/src/web/lib/rng.ts`, `batch.ts`). Bloodtower's new engine core needs the same thing. If the two copies drift, a tuned number found in a prototype stops meaning the same thing in the game.

## Decision
Bob, 2026-10-23 (architecture review): the engine core is new Bloodtower code, and only the seeded generator and dice move to `packages/`, because two apps need them.
- The seeded generator and the dice notation move with `git mv` to `packages/rng`, named `@dark-tower/rng`. The prototypes and Bloodtower's engine both import it.

Proposed by Claude in the same review. Approving this record approves them:
- **A draw depends only on the game's seed and the draw's place in the log.** Each event that draws gets a fresh generator seeded from the game seed and that event's sequence number, and draws from it in order. No generator state carries from one event to the next, so replaying from a checkpoint gives the same draws as playing straight through. The existing `hashSeed` and generator already support this, since a generator is made from any seed text.
- The package does no I/O and reads no clock. It has no `Math.random` fallback.
- The batch runner stays in the prototypes. Bloodtower's simulator is its own, built on the engine core.

## Consequences
- The prototypes change in the same branch as the move. Their seeds keep replaying the same runs, and a test pins a known seed to its known rolls, so a FINDINGS.md result stays reproducible.
- Bloodtower's engine core (spec D32) imports only `@dark-tower/rng` for randomness. A lint check in the engine part refuses `Math.random`, `Date` and `crypto` there.
