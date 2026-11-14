Keep this a checklist; do not write a second design doc.

# Brief: CU / 09-hints-and-rules — First-time hints, a Hints toggle and the Rules group in Look up

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (step 56, issue #482)
- Feature: 09-hints-and-rules
- Kind: screen
- Owner: Gamewright (brief, evals); a Wright developer (build); Loremaster (Copy table, step 45)
- Related AREA/docs: PT-16 in `research/game-design/playtests/2026-11-12-paper-playtest-v1-v1.2.md` (and design-freeze.md section H); DEC-571; DEC-229 (Look up); UI-035 (Scroll); SCR-008 (Game settings); DEC-639; DEC-708; Q-259; LQ-3
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: ./mockup.html (a Gamewright draft for the Illusionist to replace)
- Risk: Med
- Depends on: its approval.md on main; steps 43 (#469), 44 and 45 (Copy table by Loremaster, no waiver)
- Touches: `apps/bloodtower/src/engine/loops/session/{view.ts,state.ts,gear.ts}`, `apps/bloodtower/src/engine/loops/game/setupFlow.ts`, `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/server/core/serialize.ts`, `apps/bloodtower/src/web/components/board/{CoreStoryBoard.tsx,GearBoardPanel.tsx}`, `apps/bloodtower/src/web/components/device/{CoreDeviceScreen.tsx,gearMenu.ts}`, new `apps/bloodtower/src/engine/hints/**` (the registry and once-per-game record), `apps/bloodtower/src/e2e/tests/c3-hints.spec.ts` (new), `apps/bloodtower/spec.md`
- Builds: DEC-571 (hints, toggle, Rules group), UI-035 (use, not change)
- Deps change: no
- Runs: cloud

## What it does

DEC-571, never built (PT-16): the first battle, building visit, event, skull drop and day's end in a game each open with a one-sentence hint on a Scroll (UI-035) on the Story board, once per game, spoken by the narrator (Charon; LQ-3 option A, Bob, 2026-11-14, adopted; Loremaster to confirm), auto-advancing after 4 seconds. During an art hold the hint is a caption under the art, not a Scroll. A "Hints" toggle on Game settings (SCR-008), default on, switches them all off for the game. Look up (DEC-229) gains a Rules group with one page per loop, and its "A sample card" placeholder is dropped. On main today: no hint code or toggle exists; the gear's Look up holds two placeholders ("Rules of the tower", "A sample card", `LOOKUP_CARDS` in `view.ts`); `settingLevels` shows at most four setting rows.

All words are `[COPY: ...]` slots (see Copy). Gamewright writes no story copy.

## Cutover

Cutover: N

- Dies: the Look up placeholders "Rules of the tower" and "A sample card" (`LOOKUP_CARDS` in `view.ts`) are replaced by the Rules group; the sample card is dropped (Bob, 2026-11-14, adopted).

## Survival invariants

- Continue, restore, and restart must keep:
  - The Hints setting for the game, and which hints were already shown: a hint never repeats after Continue, restart or a restored checkpoint.
  - A checkpoint from before this feature loads (no hint record: Hints on, nothing shown yet).
  - Play again keeps the table's Hints choice (DEC-708) but a new game shows each hint once again.
  - The gear Menu comes back closed and the game not paused; the Rules pages are display only on the Story board (DEC-278).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-09 and EV-11 … EV-15 all pass (verifier table on PR).
- [ ] C4-02's plan checklist carries the line "wire `hint.first-battle`" (added by step 44; C4-02's eval is untouched).
- Not required: a guided first game (1.1, DEC-571); the first-battle hint wiring until the battle loop exists (C4-02 wires it); hints on the iPads.

## Copy

Every player-facing string is a slot. Loremaster fills the exact text (step 45, no waiver) before the screen builds; a build shows that text, never the sample in mockup.html.

| # | Slot | Where | Exact text |
|---|------|-------|------------|
| 1 | `hint.first-battle` | Scroll (or art-hold caption), first battle (narrator, one plain sentence) | [COPY: hint.first-battle] |
| 2 | `hint.first-building` | Scroll, first building visit | [COPY: hint.first-building] |
| 3 | `hint.first-event` | Scroll, first event | [COPY: hint.first-event] |
| 4 | `hint.first-skull-drop` | Scroll, first skull drop | [COPY: hint.first-skull-drop] |
| 5 | `hint.first-day-end` | Scroll, first day's end | [COPY: hint.first-day-end] |
| 6 | `settings.hints.label` | Game settings row label (iPad) | [COPY: settings.hints.label] |
| 7 | `settings.hints.on` | the "on" option | [COPY: settings.hints.on] |
| 8 | `settings.hints.off` | the "off" option | [COPY: settings.hints.off] |
| 9 | `lookup.rules.group` | Look up group heading | [COPY: lookup.rules.group] |
| 10 | `lookup.rules.battle` (title and page) | Rules page, battle | [COPY: lookup.rules.battle] |
| 11 | `lookup.rules.building` | Rules page, building visit | [COPY: lookup.rules.building] |
| 12 | `lookup.rules.event` | Rules page, event | [COPY: lookup.rules.event] |
| 13 | `lookup.rules.skull-drop` | Rules page, skull drop | [COPY: lookup.rules.skull-drop] |
| 14 | `lookup.rules.day-end` | Rules page, day's end | [COPY: lookup.rules.day-end] |
| 15 | `help.settings` | "?" help on Game settings, if the toggle changes its line | [COPY: help.settings] |

## AREA / DEC checklist

- [ ] PT-16 ruling recorded as a DEC by step 43 (#469); closed before coding.
- [ ] DEC-571: closed before coding (`decided`; the source of the five loops, the toggle and the Rules group).
- [ ] DEC-229: closed before coding (`decided`; Look up).
- [ ] UI-035: closed before coding (`decided`; the Scroll, optional narrator voice).
- [ ] SCR-008: closed before coding (`decided`; Game settings).
- [ ] DEC-639: closed before coding (`decided`; the engine's settings come first).
- [ ] Q-259: closed before coding (answered by DEC-571).
- [ ] Copy table filled by Loremaster (step 45): closed before coding.

## Decided (was OPEN)

All below: Bob, 2026-11-14, adopted from the Opus recommendation.

- Who speaks the hints (LQ-3): option A, the narrator (Charon), one plain sentence each. Under an art hold the hint is a caption under the art. Flagged for Loremaster to confirm.
- The first-battle hint: the registry ships with all five hint ids now; the battle trigger is tested with a synthetic loop-entered event (EV-03); C4-02's plan checklist wires `hint.first-battle`.
- The hint is the loop's first beat, on the same 4 s rule as the auto-advance: the loop's first step waits until the hint ends.
- Hints is set at setup only (DEC-571), not from the gear.
- The Hints row sits after the engine's three settings, before the story's own (DEC-639).
- Rules pages cover the five hint loops, one page each.
- A checkpoint saved before this feature loads with Hints on and nothing shown yet.
- Look up drops the "A sample card" placeholder.

## Eval approval

- See ./approval.md (must be filled before coding).
