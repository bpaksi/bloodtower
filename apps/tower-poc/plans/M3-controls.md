# M3 — Functional coverage (Lights, Sounds, Mechanics, Tower State, Verify)

**Goal:** every inventory entry with `availability ≠ unavailable` has a UI control on its page. Every entry has `mock-tested` status, and the Verify mode records hardware results to SQLite.
**Exit condition:** coverage test plus "UI mapping" test green. Bob has run the Verify pass on hardware for each page.

Use the `tower-capability` skill for every control: inventory → protocol → executor → UI → test → gap.

## Steps (one branch each)

| Step | Branch | Scope |
|---|---|---|
| 3.1 | `feat/controls-framework` | Inventory-driven form generator from Zod params, pending lock, requested-vs-confirmed display, disabled-when-disconnected or uncalibrated rules |
| 3.2 | `feat/lights` | Doorway (side×level), ledge (corner), base, effects, all on/off, light overrides |
| 3.3 | `feat/sounds` | Catalog from `ultimatedarktowerdata` (ID plus name, numeric fallback), filter, play |
| 3.4 | `feat/mechanics` | Rotate per drum, rotate-with-state, random rotate (confirmation dialog), calibrate. Mechanics lane serialized. No stop control. |
| 3.5 | `feat/tower-state` | Drums, glyphs, seals (break/mark/restore/reset), skulls (count/reset), battery history chart. Origin, freshness and timestamp shown on every value. |
| 3.6 | `feat/verify-mode` | `verifications` table, Verify toggle on control pages, result form, runtime overlay into inventory, capability summary on Dashboard |

## Files that change (typical per step)

```text
apps/tower-poc/protocol/src/inventory.ts         # flip availability/uiLocation, mock-tested
apps/tower-poc/service/src/capabilities/<cat>.ts  # capabilityId → library call
apps/tower-poc/web/app/<page>/page.tsx, components/<cat>/*
tests: executor mapping test, component test, Playwright page test at 3 viewports
```

## Risks

- `lights` payload shape is complex. Start with the form generator for flat params and give lights a dedicated component.
- Random rotate and seal break have physical side effects. Each needs a confirmation dialog, and the reviewer checks this.
- Glyph positions are library-derived from rotation commands and may drift from reality. Label them `library-derived`, and stale after disconnect.

## Proof

- Per step: `pnpm check`, Playwright screenshots at 3 viewports, and the verifier report.
- After 3.6: Bob's Verify pass. Every capability shows `hardware-verified` (pass) or has a gap entry.
