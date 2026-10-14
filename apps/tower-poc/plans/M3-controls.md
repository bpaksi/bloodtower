# M3 — Functional coverage (Lights, Sounds, Mechanics, Tower State, Verify)

**Goal:** every inventory entry with `availability ≠ unavailable` has a UI control on its page. Every entry has `mock-tested` status, and the Verify mode records hardware results to SQLite.
**Exit condition:** coverage test plus "UI mapping" test green. Bob has run the Verify pass on hardware for each page.

Use the `tower-capability` skill for every control: inventory → protocol → executor → UI → test → gap.

## Steps (one branch each)

| Step | Branch | Scope |
|---|---|---|
| 3.1 | `feat/tower-poc-controls-framework` | Inventory-driven form generator from Zod params, pending lock, requested-vs-confirmed display, disabled-when-disconnected or uncalibrated rules |
| 3.2 | `feat/tower-poc-lights` | Doorway (side×level), ledge (corner), base, effects, all on/off, light overrides |
| 3.3 | `feat/tower-poc-sounds` | Catalog from `ultimatedarktowerdata` (ID plus name, numeric fallback), filter, play |
| 3.4 | `feat/tower-poc-mechanics` | Rotate per drum, rotate-with-state, random rotate (confirmation dialog), calibrate. Mechanics lane serialized. No stop control. |
| 3.5 | `feat/tower-poc-tower-state` | Drums, glyphs, seals (break/mark/restore/reset), skulls (count/reset), battery history chart. Origin, freshness and timestamp shown on every value. |
| 3.6 | `feat/tower-poc-verify-mode` | `verifications` table, Verify toggle on control pages, result form, runtime overlay into inventory, capability summary on Dashboard |

Branch names follow the repo convention, `feat/tower-poc-<slug>`; this table first had them without the app.

## Results

### 3.1 Controls framework (`feat/tower-poc-controls-framework`)

- **Form generator**: `describeParams` and `buildParams` in `src/protocols/paramFields.ts`. It reads a capability's Zod `params` and gives one field per value: enums, bounded integers and booleans, also inside a nested object (a seal's side and level), each with a label from its name and whether it may be left out. Anything else is refused with a reason, not guessed at; of the commandable capabilities only `lighting.set` (its light lists) is refused, and a test holds that list, so 3.2 gives it its own component as the risks below already said. A form filled with each field's first allowed value passes `validateCommand` for every other commandable capability (tested). It lives in the protocols package because that is where Zod and the schemas are.
- **The form never decides what is valid**: the page builds `params` from what was entered and checks it with `validateCommand`, the service's own check, before sending; the form sets `noValidate` so the schema's message is the one shown. An empty optional field is left out (the library's default applies), an empty required one is left out and named by validation, and text that is not a whole number is passed on as text for validation to name. No enum is preselected for the person. A rejection from the service with field issues is shown on the fields the same way. From the review: an issue is never dropped. One on a nested object no field stands for (a seal left wholly empty is reported at `seal`) goes on each field inside it, and one that matches no field is shown for the whole form (`errorsByField`, tested). The service's field errors clear once the person edits.
- **Disabled rules**: `controlState` in `src/web/lib/controls.ts`, in the executor's order: service unreachable, not offered by this service (from `welcome`'s inventory, so the service's truth wins), tower not connected, calibrating (D22), not calibrated for a `requires-calibration` capability (D9). Each says why next to the button.
- **Pending lock**: `useCommand` as in M2: one command per control until it ends or the link drops.
- **Requested vs outcome**: `CommandStatus` shows the newest command for the capability from any device (D7), with "Requested" and "Outcome" apart. Only `confirmed` reads as the tower having answered; `indeterminate` reads "Sent, no answer" (GAP-HW-010), and an interrupted command reads "Outcome unknown". The values requested are shown only on the device that sent them: `command.lifecycle` does not carry params, and adding them was not needed for this step.
- **`CapabilityControl`** puts these together for one capability. The Dashboard's test sound is now one (`sound.play`, sound 1 by default, with a sound field), which is how this step is proven end to end; the control pages are left to 3.2 to 3.5. The two-clients e2e test gained the disabled reasons, a refused out-of-range value with nothing sent, and requested vs outcome on both devices.
- **Docs, from Bob's decisions of 2026-10-14**: spec §3.2 now has verifications and `verificationOverlay` in step 3.6, not M4. GAP-LIB-010 records that a late tower answer can confirm the next queued command; nothing is built for it, and if the Verify pass shows a `confirmed` the tower did not earn, it is fixed with the bugfix skill.

### 3.2 Lights (`feat/tower-poc-lights`)

- **Inventory, protocol, executor**: nothing new. The five lighting commands were already in the inventory with their schemas, and the executor already mapped each to the library (M2). No new message type or state field.
- **Lights page**: all on (optional effect), all off, set lights, light sequence (optional sound) and set one LED. Four are `CapabilityControl`s. The descriptions say what the form cannot: the rotation sequences need a calibrated tower and no sound and end as "Sent, no answer" (D23), `rotationDrumMiddle` is not offered (GAP-HW-007), and what the LED layer numbers mean.
- **`LightsControl`** for `lighting.set`, the one schema the generated form refuses: one choice per light (12 doorway by level and side, 4 ledge, 8 base), each "Leave as is" or one of the six effects. Only chosen lights are sent. Nothing chosen is refused by the service's validation ("Name at least one light."), shown on the page, with nothing sent. The params and the requested text come from `src/web/lib/lightsForm.ts`, which is pure and tested. Requested is read from the parsed params that were sent. The control has the same disabled rules, pending lock and status as `CapabilityControl`. Both now read these through `src/web/lib/useControl.ts`.
- **Requested vs confirmed**: as in 3.1, each control shows what was requested and the command's outcome. The lights the tower reports (`state.current`) are not shown here; that value is published from step 3.5.
- **Tests**: executor test "lighting on the mock" sends each lighting command to a connected tower and to a calibrated one. Each writes a packet and the mock answers. A rotation sequence is refused before calibration with nothing written, and after it ends as `indeterminate`. The e2e test `tests/tower/lights.spec.ts` runs on the iPad first. It uses every control before connecting (each shows why it is disabled) and after (each sends and shows requested vs outcome). It covers the refused empty light set and the refused rotation sequence, and takes screenshots at the three viewports with no sideways scroll. The five lighting entries are `mock-tested`. The inventory test now lists which ids may claim that and the test backing each.
- **E2E layout**: the tests that drive the shared mock tower moved to `tests/tower/` and run in their own Playwright project, `tower`, with one worker. Each expects to find the tower disconnected, so two of them must not run at once. `two-clients.spec.ts` moved there and lost its desktop-only skip.
- **On the tower**: these commands change lights only; nothing moves. Bob checks them in the Verify pass (3.6).

## Files that change (typical per step)

```text
apps/tower-poc/src/protocols/inventory.ts         # flip availability/uiLocation, mock-tested
apps/tower-poc/src/server/capabilities/<cat>.ts  # capabilityId → library call
apps/tower-poc/src/web/app/<page>/page.tsx, components/<cat>/*
tests: executor mapping test, component test, Playwright page test at 3 viewports
```

## Risks

- `lights` payload shape is complex. Start with the form generator for flat params and give lights a dedicated component.
- Random rotate and seal break have physical side effects. Each needs a confirmation dialog, and the reviewer checks this.
- Glyph positions are library-derived from rotation commands and may drift from reality. Label them `library-derived`, and stale after disconnect.

## Proof

- Per step: `pnpm check`, Playwright screenshots at 3 viewports, and the verifier report.
- After 3.6: Bob's Verify pass. Every capability shows `hardware-verified` (pass) or has a gap entry.
