---
type: idea
title: "Each engine loop paints its own Story board content: an outer loop gives a border, the innermost fills the middle"
status: open
layer: core
by: "Bob, 2026-10-23"
links:
  - { rel: part-of, to: AREA-069 }
  - { rel: refines, to: DEC-143, note: "one more row in the loop template: what the loop paints" }
  - { rel: affects, to: DEC-186, note: "the edge frame may be the outer loops' borders" }
---
"I want each loop of the Game engine to provides its own story board content.
1) The loop tends to manage an inner loop. In that case the outer loop only provides an border (could just be a top border, top & Bottom, or all borders.) the rest is given to the inner loop to paint.
2) if no inner loop, entire content area is filled by current loop.
3) white space is good but no content is bad. So if a loop is waiting for ipad, there should be some indicator of that."

The board becomes nested frames that follow the loop stack (session, game, chapter, day, group turn, encounter, set piece, battle). Raised while asking Q-097 about the POC's permanent panels.
