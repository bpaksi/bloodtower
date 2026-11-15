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

All words are in the Copy table (Loremaster, step 45, filled 2026-11-15). Gamewright writes no story copy.

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

Exact player-facing text for this screen, by Loremaster, 2026-11-15 (step 45, #471). Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `hint.first-battle` | A battle runs in rounds. Choose Fight or Retreat, then each hero picks one action. | new - Loremaster; narrator (Charon); LQ-3 A, Bob, 2026-11-14, adopted; Loremaster confirms. Gamewright ruled the narrator speaks the first-time hints. Audio plus caption: the caption equals the spoken text. Scroll on the board, or a caption under the art during an art hold; auto-advances after 4 s. First battle. Same rule as `help.round-picker` |
| 2 | `hint.first-building` | Entering a building is free. Each choice inside costs one move. | new - Loremaster; narrator (Charon); LQ-3 A, Bob, 2026-11-14, adopted; Loremaster confirms. Gamewright ruled the narrator speaks the first-time hints. Audio plus caption: the caption equals the spoken text. Scroll on the board, or a caption under the art during an art hold; auto-advances after 4 s. First building visit (DEC-220, DEC-078) |
| 3 | `hint.first-event` | Something happens where you stand. Hear it out, then choose how to answer. | new - Loremaster; narrator (Charon); LQ-3 A, Bob, 2026-11-14, adopted; Loremaster confirms. Gamewright ruled the narrator speaks the first-time hints. Audio plus caption: the caption equals the spoken text. Scroll on the board, or a caption under the art during an art hold; auto-advances after 4 s. First event |
| 4 | `hint.first-skull-drop` | Each skull that falls shrinks a building's menu, and the fourth destroys it. | new - Loremaster; narrator (Charon); LQ-3 A, Bob, 2026-11-14, adopted; Loremaster confirms. Gamewright ruled the narrator speaks the first-time hints. Audio plus caption: the caption equals the spoken text. Scroll on the board, or a caption under the art during an art hold; auto-advances after 4 s. First skull drop (DEC-093) |
| 5 | `hint.first-day-end` | The day ends when every turn is done. Night brings skulls, and the days left count down. | new - Loremaster; narrator (Charon); LQ-3 A, Bob, 2026-11-14, adopted; Loremaster confirms. Gamewright ruled the narrator speaks the first-time hints. Audio plus caption: the caption equals the spoken text. Scroll on the board, or a caption under the art during an art hold; auto-advances after 4 s. First day's end (DEC-686) |
| 6 | `settings.hints.label` | Hints | Bob, 2026-11-14, adopted (the toggle is named "Hints" in this brief and DEC-571); Game settings row label, iPad and board |
| 7 | `settings.hints.on` | On | new - Loremaster; the "on" option, selected by default |
| 8 | `settings.hints.off` | Off | new - Loremaster; the "off" option |
| 9 | `lookup.rules.group` | Rules | new - Loremaster; Look up group heading (DEC-229, DEC-571) |
| 10a | `lookup.rules.battle` title | Battle | new - Loremaster; the row on the iPad and the page title on the board |
| 10b | `lookup.rules.battle` page | A battle runs in rounds. Choose Fight or Retreat, then each hero picks Attack, Cast a spell, Spend an Advantage, Drink a potion or Guard. A foe you flee from stays and grows. A hero who falls to 0 hit points takes a corruption. A third corruption ends the game. | new - Loremaster; built from the locked `help.round-picker` (2026-10-31), DEC-016, DEC-119 and DEC-043. Board page, display only |
| 11a | `lookup.rules.building` title | Building visit | new - Loremaster |
| 11b | `lookup.rules.building` page | Entering a building is free, and so is leaving. Each choice inside costs one move. Each skull shrinks a building's menu, and the fourth destroys it. Cleanse takes a skull off. | new - Loremaster; DEC-220, DEC-078, DEC-093, DEC-377. Board page, display only |
| 12a | `lookup.rules.event` title | Event | new - Loremaster |
| 12b | `lookup.rules.event` page | An event stops you where you stand. Hear what happens, then choose how to answer. A hazard costs hit points. | new - Loremaster; a 1.0 hazard costs hit points only (Gamewright, confirmed; C3 12). Board page, display only |
| 13a | `lookup.rules.skull-drop` title | Skull drop | new - Loremaster |
| 13b | `lookup.rules.skull-drop` page | At night a skull may fall on a building. Each skull shrinks its menu, and the fourth destroys it. Four fallen buildings lose the game. Cleanse takes a skull off a building. | new - Loremaster; DEC-093, DEC-915, DEC-377. Board page, display only |
| 14a | `lookup.rules.day-end` title | Day's end | new - Loremaster |
| 14b | `lookup.rules.day-end` page | The day ends when every group has had its turn. Night effects play and a skull may fall. Each skull is a day: when the skulls run out, the game is lost. Cleanse buys a day back. | new - Loremaster; MEC-034, DEC-686 (the skull supply is the days left; Cleanse is +1 day). Board page, display only |
| 15 | `help.settings` | Choose the game length and options for tonight's story. | locked 2026-10-31 (Loremaster), `story-settings` in the C2 feature 04 help table. The Hints toggle is one of the "options", so the line is unchanged |

## AREA / DEC checklist

- [ ] PT-16 ruling recorded as a DEC by step 43 (#469); closed before coding.
- [ ] DEC-571: closed before coding (`decided`; the source of the five loops, the toggle and the Rules group).
- [ ] DEC-229: closed before coding (`decided`; Look up).
- [ ] UI-035: closed before coding (`decided`; the Scroll, optional narrator voice).
- [ ] SCR-008: closed before coding (`decided`; Game settings).
- [ ] DEC-639: closed before coding (`decided`; the engine's settings come first).
- [ ] Q-259: closed before coding (answered by DEC-571).
- [ ] Copy table filled by Loremaster (step 45): closed before coding. Filled 2026-11-15, all 15 slots; no DRAFT rows.

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
