---
type: idea
title: "The base game is data too: manifests for every foe, gear, virtue…, typed by Type, Subtype, Class and SubClass, with the story applied over them"
status: open
layer: core
by: "Bob, 2026-10-28"
links:
  - { rel: part-of, to: AREA-090 }
  - { rel: refines, to: DEC-049, note: the base game, not only the story, is data }
  - { rel: raises, to: Q-315 }
  - { rel: raises, to: Q-316 }
  - { rel: raises, to: Q-317 }
  - { rel: raises, to: Q-318 }
---
"The story has already been noted to be 100% data driven, i.e. no code changes required per story. I want to take the same technique and apply it to the base game also. I envision, 1 or many manifest files (probably JSON) describing all Foes, Gear, Virtues, ... Once a story is picked essentially the story's config is applied over the base config (full CRUD). I want each manifest to adopt a Type,Subtype,Class,SubClass approach. This will allow the game engine to be built to only referencing these attributes vs. hardcoding for specific names."
