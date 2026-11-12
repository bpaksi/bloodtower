Keep this a checklist; do not write a second design doc.

# Brief: CU / 02-a1-demo-playback — The board plays a packed line once (A1-8b-2)

## Meta

- Plan: [A1-asset-adapter.md](../../../A1-asset-adapter.md) (Step 8b-2 holds the full spec; this brief only gates it)
- Feature: 02-a1-demo-playback
- Kind: engine
- Owner: Gamewright (spec, evals); a Wright developer (build)
- Related AREA/docs: A1-asset-adapter.md Step 8b-2 and G-A1-01 and G-A1-04; DEC-201; DEC-843; A1-P2-build-runbook.md (W8)
- Evals: ./eval.md
- Screen spec: none (no new UI: a once-only controlled demo entry)
- Mockup: none (no screen change)
- Risk: Med
- Depends on: its approval.md on main; A1 steps 5, 7 and 8b-1 merged (they are: #404, #406, #413)
- Touches: as listed in A1-asset-adapter.md Step 8b-2 (`server/core/**`, `server/pack/{serve.ts,assets.ts}`, `engine/**` and `protocols/v2/**` only as needed, `web/components/board/**`, `web/lib/audio/**`, tests, one e2e spec, `spec.md`)
- Builds: A1 Step 8b-2, G-A1-01
- Deps change: no
- Runs: cloud

## What it does

After the demo line is packed (a draft is enough), the Story board plays `seal-break.01~vo-01` once from the Mac speakers with the caption below, shows `painting.cover` with `glow.cover` aligned over it when both are packed, and does it with the tower off. The trigger is a controlled once-only demo entry (G-A1-04), not new UI. This is the proof step Bob needs for G-A1.

## Copy (locked)

| Slot | Where | Text | Locked by |
|------|-------|------|-----------|
| demo-caption | Story board caption while `seal-break.01~vo-01` plays | The roads are clear, and a seal breaks like an old oath giving way. Ahead stands the Ruined Keep. | A1-asset-adapter.md Step 8b-2 "Done when" (Gamewright, 2026-11-10); the demo line row in `packs/test/pack.yaml` (A1-8b-1, #413) |

No other new text. No new button, screen or locked copy.

## Cutover

Cutover: N

- Nothing dies or is renamed. (The engine gains a `narrate` case for the demo entry; no existing effect changes.)

## Survival invariants

- Continue, restore, and restart must keep:
  - A restore or Continue does not replay the line on its own; an explicit user replay may still play it (A1 Step 8b-2).
  - The tower is optional: the same play completes with the tower off.
  - Caption-only stays legible if the audio file is missing (no failed load, no blank caption).
  - No message carries file bytes; the board fetches the packed file by asset id from the host.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-06 all pass (verifier table on PR).
- Not required: a real paid render (A1-4c, G-A1), a talking Portrait, a named camera move (Q-451), playing Dracula lines, new iPad UI.

## AREA / DEC checklist

- [ ] DEC-201: closed before coding (Mac speakers play the voice).
- [ ] DEC-843: closed before coding (0.2 serves 1.0; no talking Portrait ships in 1.0).
- [ ] DEC-384: closed before coding (a runner never marks an asset final).
- [ ] G-A1-01 / G-A1-04: closed before coding (the gate stays; this step is the proof; the trigger is a once-only demo entry).
- [ ] Q-451 (camera move): deferred, owner Bob, not needed here (out of scope).
- [ ] Charon is provisional in the A1 runbook (D48): deferred, owner Bob at G-A1; this step plays whatever voice the draft has and does not depend on the ruling (see the open question in catchup/design-freeze.md).

## Eval approval

- See ./approval.md (must be filled before coding).
