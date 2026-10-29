---
type: idea
title: "Card tooling for tracking: a drift check from cards to built code, and gaps checks for DEC-352 and DEC-355"
status: decided
layer: core
by: "Claude, for Bob, 2026-10-27 (card audit)"
links:
  - { rel: part-of, to: AREA-088 }
  - { rel: needs, to: DEC-352, note: "replaced cards are parked or trimmed" }
  - { rel: needs, to: DEC-355, note: "deliverable cards and Builds: lines" }
---
A game-workbench chore, its own branch and PR, not a design session. Cards keep no version fields; git is the change record.

- **`pnpm graph drift`:** for each plan step's `Builds:` cards, and the rulings they reach, list the cards changed in git since that step merged. This is how a design change finds the code it affects. The case that showed the need: C1 step 6 built the session loop on DEC-155 on 2026-10-23, and DEC-275 reversed it on 2026-10-26 with nothing to flag it.
- **Gaps: no deliverable.** Report decided rulings that no SCR-, UI-, CUE- or MEC- card reaches by `needs` or `uses` (DEC-355). It replaces "decided card with no requirement".
- **Gaps: answered conflicts.** Stop counting a `conflicts` link on an answered question; it records what the question was about (Q-116, Q-117, Q-125, Q-175, Q-179, Q-186).
- **Later:** a `replaces` link verb, if parking and trimming (DEC-352) proves too loose.

**Bob, 2026-10-29:** "Before playthrough". It's built as its own game-workbench chore, before the playthrough probes start, so the design changes they cause show the code they touch. Rejected: after the playthroughs, and dropping it.
