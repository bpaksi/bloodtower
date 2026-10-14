# Draft issue for UltimateDarkTower: commands the tower never answers hold the queue for 30 s

Drafted 2026-10-14 for Bob to file at <https://github.com/ChessMess/UltimateDarkTower/issues>. Not filed. Everything below the line is the issue text. It names no serial number and nothing about this repo beyond what the library's maintainers need.

What we would want from it: a way to send a command without waiting for an answer. If that ships, tower-poc can call `lightOverrides` for the four `rotation*` sequences and drop its `sendTowerState` workaround (spec D23).

---

**Title:** `lightOverrides` with a `rotation*` sequence holds the command queue for 30 s: the tower never answers it

**Version:** `ultimatedarktower` 7.1.2, Node adapter (`@stoprocent/noble` 2.8.0), macOS, Node 24.4.1.
**Tower:** `ReturnToDarkTower`, hardware 1.11, software 1.0.0, firmware `79556657694099f3ca293f534b9cc5b55bfeaa31`.

**What happens**

On a calibrated tower, `lightOverrides(n)` with `n` = 15, 16, 17 or 18 (`rotationAllDrums`, `rotationDrumTop`, `rotationDrumMiddle`, `rotationDrumBottom` in `TOWER_LIGHT_SEQUENCES`) plays the lights, and no drum moves. The tower then sends no state message. Every other light sequence and sound we sent was echoed within 25 to 64 ms.

Because the command went through `CommandQueue`, the queue waits for an answer:

- the promise rejects after 30 s with `Command timeout after 30000ms: lightOverrides(15)`, although the command did what it should;
- by the queue's code, every command enqueued behind it waits for those 30 s. We did not have anything queued behind it, so we did not observe this part.

We saw the same silence for two other writes: `allLightsOn` when the lights were already on, and a state packet identical to the tower's current state. Those go through `sendTowerCommandDirect`, so they do not hold the queue. It looks as if the tower answers only a write that changes its state, and the rotation sequences are not reported as a change.

**Why we can't work around it from outside**

- `CommandQueue.timeoutMs` is private, and `UltimateDarkTower` has no option for it.
- Nothing marks a command as one that gets no answer.
- The public bypass, `sendTowerState`, records the sent state as current, including `led_sequence`. As the comment in `updateTowerStateFromResponse` says, the next stateful packet then re-triggers the sequence, and only a tower response resets it. So a caller using it has to send a second state with `led_sequence: 0`.

**What would help** (any one of these)

1. A per-call option to skip the wait, for example `lightOverrides(light, soundIndex, { expectResponse: false })`, or an internal list of sequences known to get no answer. The queue would resolve once the write completes, and still keep the 250 ms spacing.
2. A configurable queue timeout in the `UltimateDarkTower` config. A shorter one would make the stall smaller, but would still report the command as failed.
3. A way to send a state without recording `led_sequence`, or a public way to reset it, so that `sendTowerState` is safe to use for these four sequences.

We are happy to test a change on our tower.
