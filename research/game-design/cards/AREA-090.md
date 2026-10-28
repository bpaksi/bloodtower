---
type: area
title: "Engine manifests: the base game as data a story overlays"
status: open
layer: core
by: "Bob, 2026-10-28"
links:
  - { rel: part-of, to: AREA-004 }
---
The base game's content (foes, gear, virtues, places, items and the rest) lives in one or more JSON manifests, like a story's. A picked story's manifests apply over the base. The engine reads entries by their type attributes, never by name.
