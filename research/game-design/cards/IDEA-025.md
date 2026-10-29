---
type: idea
title: "After calibrate, orient the tower to N/S/E/W, then find each glyph by lighting a spot"
status: answered
layer: core
by: "Bob, 2026-10-20"
links:
  - { rel: part-of, to: AREA-056 }
  - { rel: refines, to: IDEA-005, note: "same hand-setup idea, now with a glyph step" }
  - { rel: refines, to: MEC-017, note: "adds identifying the glyphs" }
  - { rel: refines, to: SCR-005, note: "new steps after calibrate" }
  - { rel: uses, to: AREA-036, note: "doorway lights mark the spot" }
  - { rel: affects, to: AREA-033, note: "glyph facings would be confirmed, not assumed" }
  - { rel: raises, to: Q-033 }
sources:
  - { file: "../tower/api-surface-7.1.2.md", lines: "96", note: "glyph positions are computed from calibration plus sent rotations, not sensed" }
  - { file: "tower-effects-library.md", lines: "41", note: "drum and glyph positions are software's belief" }
---
"For startup, we have calibrate, but I'm not sure we know exacty where the glyphs are. If that is true then we could and a new step where we first orientate the tower correctly (n,s,e,w). then we identify the glyphs. We can do this by lighting a spot and ask user to tell us."

**Answered** by DEC-103 and MEC-017; Q-033 is the hardware check still open. Found in the 2026-10-29 ideas triage (DEC-612).
