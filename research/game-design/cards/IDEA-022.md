---
type: idea
title: "Every story's main file is a JSON manifest with a schema, linted at build time for completeness"
status: answered
layer: core
by: "Bob, 2026-10-20"
links:
  - { rel: part-of, to: AREA-045 }
  - { rel: refines, to: DEC-049, note: "a story is data only" }
  - { rel: refines, to: R-ENG-10, note: "pack lint" }
  - { rel: refines, to: R-LEN-3, note: "complete at every length" }
  - { rel: affects, to: DEC-050 }
sources:
  - { file: "story-pack-format.md", lines: "13", note: "today: YAML (or JSON) files plus a manifest" }
  - { file: "../../apps/bloodtower/README.md", note: "pack:lint checks packs/test today" }
---
"Every story main file is a manifest json file. The json has a schema associated to it. That schema has a linter that at build time can verify that the story is "complete"." Today's packs use YAML (`pack.yaml`) and the POC already has a `pack:lint`.

**Answered** by DEC-061. Found in the 2026-10-29 ideas triage (DEC-612).
