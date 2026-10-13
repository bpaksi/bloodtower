# M1 — Integration discovery

**Goal:** know exactly which controls and diagnostics are possible on the real tower from Node on Bob's Mac.
**Exit condition (PRD):** pinned versions, a complete inventory with coverage test, seeded gaps, a hardware spike result, and an observability assessment.

## Files that change

```text
apps/tower-poc/service/package.json        # ultimatedarktower@7.1.2 exact, ultimatedarktowerdata@<exact>, @stoprocent/noble
apps/tower-poc/protocol/src/inventory.ts     # typed capability entries (spec §4)
apps/tower-poc/protocol/src/inventory.test.ts# coverage test vs UltimateDarkTower public surface
apps/tower-poc/service/src/gaps/seed.ts    # spec §7 + findings
apps/tower-poc/service/scripts/spike.ts    # hardware spike (manual)
apps/tower-poc/docs/capabilities.md                   # generated
research/tower/spikes/2026-xx-noble-macos.md     # spike write-up
research/tower/observability.md                  # what raw traffic is visible and where
```

## Order of work

1. Pin versions. Record the library's `package.json` version plus the `ultimatedarktowerdata` version and sound catalog count.
2. Read the library's `API_REFERENCE.md`, `BLE_DIAGNOSTICS.md` and `TOWER_TECH_NOTES.md`, and diff them against the public surface listed in spec §4.
3. Write `inventory.ts` (Zod param schemas from the library's types: `TowerSide`, `TowerLevels`, `SealIdentifier`, `Lights`, `LIGHT_EFFECTS`, sound index range).
4. Coverage test: enumerate `Object.getOwnPropertyNames(UltimateDarkTower.prototype)` plus instance callbacks, and fail on any that are unmapped and not excluded.
5. **Hardware spike, run by Bob on the Mac with the tower nearby.** `pnpm -F tower-poc-service spike` runs these steps through `InstrumentedAdapter(NodeBluetoothAdapter)`:
   1. connect
   2. read device info
   3. calibrate
   4. playSound(1)
   5. allLightsOn / allLightsOff
   6. a single rotate
   7. watch battery and skull notifications for 60 seconds
   8. disconnect

   It dumps every tx/rx packet as hex to `spike-<ts>.jsonl`.
6. Also in the spike: test whether lights and sounds work **before** calibration (GAP-HW-001).
7. Write the observability assessment. It covers what we get from the adapter tap compared with the library recorder, and whether responses can be correlated to commands.
8. Update the gap seed and the spec decision log if anything changes.

## Risks

- **noble can't see the tower on macOS** (permissions, or the Bluetooth stack). Fallback options to bring to Bob: grant Bluetooth permission to the terminal and Node, or run the service on a Raspberry Pi. This would be a spec change, which triggers a new intent.
- Calibration requirement turns out to be global, which changes D9.

## Proof

- Spike JSONL committed (no device identifiers beyond the macOS UUID). The write-up includes pass/fail per step.
- `pnpm check` is green and the coverage test passes.
- `apps/tower-poc/docs/capabilities.md` generated.
