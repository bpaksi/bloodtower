# `@dark-tower/tower`

Tower WebSocket protocol, capability inventory, session, command executor, state store, adapters (including the mock), and diagnostics log ([decision 0004](../../research/decisions/0004-tower-package.md)).

tower-poc and Bloodtower import this package. Only one tower session may be open per process; a second `createTowerSession` throws `TowerSessionAlreadyOpenError` with code `tower-session-already-open`.

```ts
import { inventory, validateCommand } from "@dark-tower/tower";
import { createTowerSession } from "@dark-tower/tower/runtime";
```

Only one app at a time should talk to the real tower over Bluetooth. Do not run tower-poc and another host against the hardware at once.
