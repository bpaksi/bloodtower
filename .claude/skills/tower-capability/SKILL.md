---
name: tower-capability
description: Add or change one tower capability end to end in a tower app, in the fixed order inventory, protocol, executor, UI, test, gap. Use for every control added to tower-poc (lights, sounds, mechanics, seals, state) and for any change to how a command reaches the tower.
---

# Tower capability

Work on one capability at a time, in this order. Do not skip a step. If a step does not apply, say why in the commit message.

1. **Inventory.** Add or update the entry in `src/protocols/inventory.ts`: `id`, `category`, `apiMapping`, `params` (Zod), `availability`, `uiLocation`, `verification`, `evidence`. The coverage test must still pass.
2. **Protocol.** The UI sends `command{capabilityId, params}` only. Do not add a message type per capability, and never one that carries raw bytes. Add state or lifecycle fields to the protocol schemas if the capability reports something new.
3. **Executor.** Map the `capabilityId` to the library call in `src/server/capabilities/<category>.ts`. All calls go through the command executor. Validate params against the inventory schema before queueing. Never retry a physical action automatically.
4. **UI.** Generate the control from the inventory entry. Disable it while its command is pending. Disable mechanics until calibrated. Show requested and confirmed state separately, and show an unknown value as unavailable.
5. **Test.** Add unit tests for validation and the executor path, and a mock-mode test for the control. Then set `verification: mock-tested` in the inventory. `hardware-verified` is never set in code: Bob records it from the Verify mode with the real tower.
6. **Gap.** If anything is unsupported, partial, unverifiable or only inferred, add a gap entry with the `gap-entry` skill and link it to the capability.

## Before handing over

- `pnpm check` passes.
- The `verifier` agent's report is in the commit message.
- If the capability moves something physical, say so in the handover so Bob knows what to expect when he tests it on the tower.
