# Diagnosis: iPad door pick options missing

QA at `main` `dd5efae`, test pack + mock tower: at `grey-stair.door-choice` the pick-card targets `ipad:all`, but `/device` shows Continue, a disabled Resume, and Quit. No Oil or Force. The player cannot pick.

## Where target is matched to a device

It is not. `beatsForNight` never reads `moment.target`.

- `apps/bloodtower/src/server/session/beats.ts` line 77: every non-private moment is selected as `shared`, including `target: ipad:all`.
- Same file line 101: that shared moment is always copied onto `beat.storyboard`.
- `apps/bloodtower/src/server/session/engine.ts` line 552: `projectStoryboard` publishes `beat.storyboard`, so the board shows the placeholder `"Oil the hinge, or force it."`.
- Same file line 570: `projectDevice` maps only `beat.privates` for hunters this device holds. There is no `ipad:all` path and no pick options.

`packs/test/choices.yaml` is the stub `{id: kept, label: "not run"}`. Spec D13: choices are parsed and not executed. `deviceStatePayloadSchema` has no pick field. `CONTROL_ACTIONS` has no pick action.

## Where the device renders pick options

It does not. `DeviceScreen` (`apps/bloodtower/src/web/components/device/DeviceScreen.tsx`) `PlayDevice` (line 298) shows hunter private lines only. The control strip (line 119) is Begin / Continue / Resume / Quit.

## Not a UI-only fix

A DeviceScreen change cannot invent Oil/Force: that payload never arrives. A real fix needs engine target routing, a DeviceState pick field, a pick control action, and executing pack choices. Out of scope for web UI only.

## Proposed fix (not applied)

1. Protocol: pick options on `deviceState`; a pick control action.
2. Engine: keep `ipad:all` pick-cards off the storyboard (or as a table prompt only); send options to every joined iPad; load labels from pack choices.
3. UI: render those options as pick buttons on `/device`.
