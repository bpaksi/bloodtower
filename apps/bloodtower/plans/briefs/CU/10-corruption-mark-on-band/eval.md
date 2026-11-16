Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: CU / 10-corruption-mark-on-band — A hero one corruption from defeat gets a mark on the band

- Brief: ./plan.md
- Mockup: ./mockup.html
- Risk: Low

## Checks

### EV-01 — A hero at 2 corruptions carries the mark
- Requirement: PT-17, design-freeze section H: a hero one corruption from defeat gets a mark on the band's health mark.
- Method: playwright
- How: new `c3-corruption-mark.spec.ts`, 4 heroes in two groups, hero B at 2 corruptions, others at 0 or 1; board 1920x1080 mid-turn. The narrow test-only seed added by this step sets the corruption counts.
- Pass evidence: exactly one `[data-corruption-mark="hero-b"]` inside the band `[data-band]`, in the lead's `[data-hero-panel]` span next to hero B's own corruption text (a per-hero mark, so a non-lead hero at 2 gets its own mark in that span too, EV-10); the mark is an icon with a non-empty `aria-label` carrying the Copy table's `band.mark.label` text, and no visible words; none for the others.
- Fails if: the mark is on every hero, on the group instead of the hero, outside the band, has visible words, has no aria-label, or is missing.

### EV-02 — No mark at 0 or 1 corruption
- Requirement: PT-17: the mark is only for the hero one fall from defeat.
- Method: unit
- How: `CoreStoryBoard.test.ts`: render the band with counts 0, 1 and 2 for one hero.
- Pass evidence: no `data-corruption-mark` at 0 and at 1; one at 2.
- Fails if: the mark shows at 1 ("any corruption") or at 0.

### EV-03 — The threshold follows the loss rule
- Requirement: DEC-043 and DEC-676: a third corruption loses, so one short of it is the mark.
- Method: unit
- How: the test imports the one exported engine constant for the corruption loss limit (3; the same constant C3-08 reuses) and asserts the mark shows at limit minus 1, not at a literal 2 in the web code; a second case overrides the constant to 4.
- Pass evidence: the exported constant equals 3; with the limit set to 4 in the test fixture, the mark shows at 3 and not at 2; with 3, at 2; a grep of `apps/bloodtower/src/web` finds no literal corruption limit.
- Fails if: the web code hard-codes 2 or 3, or the engine has no single exported constant (a second copy of the limit exists).

### EV-04 — The mark moves with the count
- Requirement: the mark is derived live from the view, never stored.
- Method: playwright
- How: raise hero A from 1 to 2 mid-game, then (fixture) lower hero B to 1.
- Pass evidence: hero A gains the mark and hero B loses it on the next board view, without a reload.
- Fails if: the mark is stuck from first render.
- Deferred 2026-11-15 to the step 12 live seed hook (judgement delegated by Bob). The CU/10 seed sets counts only at game start; the spec keeps a `test.fixme` for it.

### EV-05 — Display only
- Requirement: PT-17 "Display only"; DEC-676 untouched.
- Method: playwright
- How: count frames the board sends and the host's game state before and after the mark appears; try to click the mark.
- Pass evidence: no frame sent by the board, no act, the mark is not a button (no `button`, no `data-action`); the game state is identical.
- Fails if: the mark is interactive or any act or state change follows it.

### EV-06 — The warning line and foe mark are not built here
- Requirement: those belong to C4-09 (#452).
- Method: playwright
- How: with hero B at 2, open the board during a day (no battle exists on main).
- Pass evidence: no `[data-warning]` or text of the warning line anywhere; the Touches list holds no foe-panel file.
- Fails if: this step adds the warning line or a foe-panel mark.

### EV-07 — Screenshot matches the mockup
- Requirement: the band shows the mark as drawn.
- Method: screenshot
- How: board 1920x1080, hero B at 2, hero A at 1, hero C at 0; compare the band side by side with `./mockup.html` (viewport 1920x1080). Both images attached.
- Pass evidence: same parts in the same order (hero health marks, the mark on hero B only, corruption text, chapter, Day, days left); the mark is visible without zoom and does not clip or push the band to two rows.
- Fails if: the mark is missing, on the wrong hero, hides the health mark, or the band overflows.

### EV-08 — Unknown counts show no mark and no zero
- Requirement: unknown values are shown as unavailable, never as zero (root CLAUDE.md).
- Method: unit
- How: render the band with `table.corruptions` absent.
- Pass evidence: no mark; the health mark still reads "unavailable"; no "0 corruptions" text appears.
- Fails if: absent counts render as 0 or as a mark.

## Survival evals (one per survival invariant in plan.md)

### EV-09 — Continue recomputes the mark
- Requirement: the mark follows the restored game; the Menu closed, not paused, toolbar present.
- Method: playwright
- How: hero B at 2, quit, restart the host, Continue.
- Pass evidence: after Continue the band shows the mark on hero B only; `[data-menu]` absent; `paused` false; every iPad shows the toolbar.
- Fails if: the mark is lost, shown on another hero, or the Menu or a panel comes back open.

### EV-10 — A non-lead hero gets a per-hero mark in the lead's span
- Requirement: UI-028 asks one mark per hero; Bob, 2026-11-14, adopted.
- Method: playwright
- How: one group of two heroes (lead A, member B), B at 2 corruptions and A at 0; board 1920x1080.
- Pass evidence: one `[data-corruption-mark="hero-b"]` inside A's `[data-hero-panel]` span (the lead's), none for A; with A also at 2, two marks in the span, one per hero, each with its own aria-label naming its hero.
- Fails if: B's mark shows on the lead A, or one mark stands for the whole group.

## Assumptions surfaced

- Hero corruption seed: this step adds a narrow test-only seed and lists it in Touches; step 12 owns the general seed hook (Bob, 2026-11-14, adopted); EV-01, EV-04, EV-09 use it.
- The mark is per hero in the lead's span → decided (Bob, 2026-11-14, adopted); EV-01, EV-10.
- Mark is an icon plus aria-label; words are C4-09's Fight/Retreat line (LQ-2) → decided (Bob, 2026-11-14, adopted); EV-01.
- The loss limit is one exported engine constant (3) that C3-08 reuses; a third corruption loses the game at once (ruled) → decided (Bob, 2026-11-14, adopted); EV-03; no eval for a third.
