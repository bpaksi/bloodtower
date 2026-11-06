---
type: area
title: "1.1 numbers pass: the skull clock, lieutenant level, strike size, gold and companion numbers, set by seeded batches"
status: decided
layer: process
release: "1.1"
by: "Bob, 2026-11-06"
links:
  - { rel: part-of, to: AREA-115 }
sources:
  - { file: probes/P-006-numbers-pass.md }
---
Step 5 of DEC-785. Bob asked "what is next for v1.1". The answer is the numbers pass: the placeholders in DEC-774, DEC-775 (kept by DEC-806), DEC-776 and DEC-700, which P-004 and P-005 flagged.

**Frame:** a throwaway seeded script (DEC-814) plays 12 cells of length and party size (DEC-816) with plain play that spends (DEC-818). Normal must reach about 80% in every cell, as a floor, and a cell may run up to about 95% (DEC-815, DEC-823). Easy aims for 90% (DEC-819), and hard is a band of about 50 to 85% (DEC-829, DEC-830). The pass moves 1.1 placeholders first, and 1.0 numbers only with Bob (DEC-817).

**Rules the script found:** a quest pick ends the group's turn (DEC-821), and The Ruined Keep's five non-Tomb dungeons play as Tombs in 1.1 (DEC-820).

**Numbers:**
- A solo hero gets +2 fight and +4 hit points, with a drop every other night (DEC-822).
- A pair skips every fourth drop (DEC-824).
- The adversary walks 1 space a day (DEC-825).
- A Long game drops half the skulls (DEC-826).
- A won quest pays the group 10 gold (DEC-827).
- The lieutenant, strike and hire values stand (DEC-828).

**1.0 code to change** in its own session: DEC-821, DEC-822, DEC-824 and DEC-827 have no `release` field, so `packs/base/tuning.yaml`, the engine and their tests follow them.
