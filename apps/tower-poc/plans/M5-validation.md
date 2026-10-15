# M5 — POC validation

**Status:** deferred, 2026-10-15 (Bob closed the POC after M3). The first app built on the tower runs its own acceptance; see the [final report](../docs/final-report.md#what-was-not-done).

**Goal:** demonstrate every acceptance criterion (PRD §10 plus spec §8) with evidence.
**Exit condition:** acceptance table fully passed or each failure recorded as a gap. Bob signs off.

## Steps

1. **Acceptance run sheet** in `apps/tower-poc/docs/acceptance.md`: one row per criterion with environment, steps, evidence link and result.
2. **Environment matrix:** service on the Mac, with clients Mac Chrome, iPad Safari, and phone. Run connect, disconnect, reconnect, calibrate, one command per page, and the diagnostics view from each.
3. **Multi-client run:** Mac and iPad at the same time. Check state and timeline sync (≤ 1s) and attribution.
4. **Restart run:** kill the service mid-session, restart, confirm the restore prompt and `stale` flags.
5. **Error matrix** (spec §6): Bluetooth off, tower off (scan timeout), pull battery (disconnect), forced timeout (mock), invalid params.
6. **Independent check:** spawn a fresh verifier agent that has not seen the build. It reads spec.md and acceptance.md, runs `pnpm check`, `pnpm e2e`, and inventory and verification queries, and reports discrepancies only.
7. **Docs:** `apps/tower-poc/README.md` setup (Node, pnpm, macOS Bluetooth permission, `pnpm start`, LAN URL), `apps/tower-poc/docs/troubleshooting.md`, and the known limitations list (pulled from open gaps).
8. **Demo** (short screen recording): connect → calibrate → lights/sound/rotate → diagnostics filter by correlation → export → record a gap with evidence.

## Proof

- Completed `apps/tower-poc/docs/acceptance.md`, the verifier agent's report, and the demo recording path.
