---
type: idea
title: "No 'story' hooks: every hook is an engine slot with or without a base default; a required slot the base leaves empty must be filled by every story, checked by the story lint"
status: answered
layer: core
by: "Bob, 2026-10-29"
links:
  - { rel: part-of, to: AREA-093 }
  - { rel: refines, to: IDEA-066, note: the base config with the story config merged on top }
  - { rel: refines, to: DEC-500, note: the fallback reaches hooks and settings too }
  - { rel: refines, to: IDEA-022, note: the story lint enforces required slots }
---
Bob: "We noted previously that the base game should provide defaults but the story can override. The idea was a base config with the story config merged on top. I want to take this idea further, this could imply in the engine we don't need to call out expressly "story" hooks. They are just hooks they either have or don't have a base default. The game engine must define if a setting is required and if required and the base config doesn't define it every story is required to define it. This would/should be enforced via story lint tool."

**Answered** by DEC-535. Found in the 2026-10-29 ideas triage (DEC-612).
