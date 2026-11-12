# Bloodtower project audit, 2026-11-11

By Claude, at Bob's request. Read on `main` at `750b5ba3`.

**Method.** Read the code, cards, plans, git history and GitHub PR and CI data. `pnpm check`, the e2e suite and the app were not run for the audit, and nothing was changed while writing it.

**Since the audit.** The CI gate findings (top five, items 1 and 2) were fixed in [#426](https://github.com/bpaksi/bloodtower/pull/426), merged 2026-11-11. The stale-doc findings in section 0 are being fixed on branch `chore/stale-docs`. Everything else below is as found.

## Summary

The process and design tooling are strong, but three things cost the most: the test gates had holes, the engine's session shell is getting hard to change, and design is running far ahead of anything a person has played.

## Top five

1. **The e2e suite did not gate merges and was usually red.** 21 of the last 40 `e2e-main` runs failed, and #411 was a clean-up PR to green it. *Fixed in #426.*
2. **Lite CI let design and pack PRs break `main`.** #420 did so, and commit `b4b2f285` fixed it. The card lint lives in `pnpm check`, which lite CI skipped. The pre-commit hook also skipped `.md`, so a card-only change never ran the card lint. *Fixed in #426.*
3. **The 1.0 critical path has stalled.** #393 (C3-09) and #384 (C3-11) sat 3 to 5 days, green, with zero reviews, and one now conflicts. Meanwhile 109 of the commits since Oct 31 are game-design and 20 are Bloodtower features.
4. **No person has played a full game.** There are 2,129 cards and 865 decided rulings, 404 of them for 1.1 and 1.2. Balance comes from a script, and the only real playtest (G-C1) ended with "some of C1 is now incompatible".
5. **The session shell is not really pure**, and every new loop (battle, tomb, finale) will add to it.

## 0. Repo layout and docs

| Finding | Evidence | Change |
|---|---|---|
| Root README is stale | Lists `apps/game-test` and `apps/game` (neither exists); omits `bloodtower`, `Visuals`, `burgomaster-funeral-poc` | Rewrite the Apps table; point at `apps/bloodtower/plans/1.0-milestones.md` for status |
| Game-design README is stale | Dated Oct 14, "nothing decided"; no mention of `cards/`, `probes/`, `specs/` | Make it the map: cards are truth, top-level docs are history |
| Bloodtower does not follow the documented loop | No `intent/` folder; `apps/bloodtower/spec.md` is titled "R1" with a retired wire format; the real chain is cards → MEC → `plans/briefs/<M>/<feature>` | Document that chain as Bloodtower's flow; mark spec sections historical |
| One story lives in four places | `research/stories/`, `research/game-design/specs/dracula` (38 files), `assets/stories/`, `packs/` | One home per story, with the pack as the build output |
| Mocks live in five places | `research/look-and-feel`, `docs/art-direction`, `docs/ui-mocks`, `game-design/mockups`, each brief's `mockup.html` | Keep art direction and brief mockups; archive the rest |
| Dormant apps still cost every check | `burgomaster-funeral-poc` (305 files), `tv-display-poc`, `prototypes`, `Visuals`, `story-workbench` are typechecked and tested serially | Move them out of the workspace |

Docs worth creating:

- **Bloodtower architecture page:** device → hub → session → `stepShell` → effects → views.
- **Role table:** Wright, Gamewright, Warden and Illusionist appear across the docs; only Wright is defined.
- **ID index:** `D1–D48`, `DEC-`, `R-*`, `EV-`, `GC1-` and `research/decisions/000N` each live somewhere different.

## 1a. Design system

The card system is good: one idea per file, typed links with a lint, reserved IDs, release tags, and the MEC loop cards with railroad diagrams as consolidated truth.

- **Rulings churn without consolidation.** 347 of 887 decisions have been refined by a later one (DEC-509 by 21). `refines` means both "details" and "replaces", so the current rule is a chain to walk. Add a `supersedes` relation and generate a "current rules" page per area.
- **The 10-link area limit is not held.** 75 of 123 areas exceed it; AREA-008 has 125 and AREA-016 has 110. Lint it or drop it.
- **Old documents still mislead.** 54 `conflicts` links plus a 134-link baseline remain. The audit suggested an `archive/` folder; note that Bob already chose banners over archiving in DEC-610, so this one is his to reopen or not.
- **Acceptance is not in the data.** 184 decided rulings carry `by: Claude` or `by: Gamewright`; Bob's acceptance is only in the body text. Add an `accepted:` field.

## 1b. The game design

The loop stack is clear, and the design tracks RtDT's known flaws explicitly: loss guard, threat bar, scaling by hero count, comeback rules. Concerns:

- **Choices may not matter enough.** In probe P-006 a naive script (never splits, nearest quest) wins 83 to 97% on normal and 100% on easy. If a simple policy wins, the tension has to come from somewhere else.
- **Evening length has no budget.** The script needs 14 to 39 days per game, and each day's close has about eight "Done" presses. No ruling sets minutes per day or per game. Set one and derive day count from it. At a guessed 3 to 4 minutes a day, a solo Short game is 75 to 100 minutes.
- **The table may end up serving the app.** Many nodes are "move this piece, press Done". Batch the day close into one screen.
- **The tower is never load-bearing.** DEC-305 skips every tower node without it, which pulls against chief goal 2. Battle uses it only for cues. One option: make the tower the visible draw in a battle round, as the purse wheel does.
- **Gold stops mattering for big parties.** P-006 found 3 to 4 heroes end with 90 to 220 unspent.
- **Several rules exist to hit a win rate, not from play:** DEC-821, 822, 824, 826. Treat them as provisional.

Recommendation: freeze 1.1 and 1.2 design until a person has played C3 to a win and a loss.

## 2. Bloodtower architecture

Solid parts: a strict zod protocol that refuses raw bytes, the event store and checkpoints, seeded RNG, an engine purity lint, the mock tower, pack lint.

- **Hidden global state.** Loop bodies read state through a module variable in `src/engine/loops/session/shellRef.ts`, which also holds two side queues. `stepShell` shallow-copies state, then loop frames are mutated in place, so the old and new state share the stack. Pass state through the loop context instead.
- **One prompt slot, many offers.** The runtime holds one prompt, so `offered[]` and several `ensure…Offers` patch functions exist. The same five-line bind/resume/clear block repeats through the if-chain in `stepShell.ts` (675 lines). Derive offers from state in the view projection.
- **`ShellState` is a catch-all.** About 60 fields mix session, tower link, per-device sound and ten `gear*` menu fields, plus the function registry. Split it into slices and keep the registry out.
- **Three engines, wrong one exported.** `engine/index.ts` exports a `step` that only runs the test loop, so 23 server files import engine internals by relative path. Engine imports protocols without declaring it, and `server` and `assets` import each other. Export one API and ban cross-part relative imports in `check-imports`.
- **Checkpoint versions are a growing string list** (`c2-05` to `c2-08`). Use an integer schema version with migrations.
- **Web files are too large.** `CoreDeviceScreen.tsx` is 997 lines switching on every screen, and `board.css` is 2,799 lines. Prompt IDs are string conventions matched on both sides. Use one component per screen.
- **Tests are named after plan steps** (`w1-…`, `c2-…`), and some pin content counts, which is how #420 broke `main`. Name by feature and test invariants.
- **The assets test suite is slow:** 89 s for 139 tests (measured while fixing CI).

## 3. SDLC

Across 388 PRs in four weeks, feature PRs merge in a median of 0.5 hours with 1.5 reviews. Median feature size is 807 changed lines against the 400-line rule.

- **Redundant:** `pnpm check` runs on every code commit, again before the PR, again in CI, and a fourth time in the verifier's no-eval path. Make pre-commit Biome plus affected packages only.
- **Contradictory docs:**
  - `AGENTS.md` says two reviews on different models and none for docs; `docs/sdlc.md` says one adversary and a Sonnet pass for docs. *Open: Bob's ruling.*
  - sdlc.md said Claude Code merges in its intro and never merges under Local mode.
  - The verifier ran "once" in `coordinator.md` but "after each fix round" in sdlc.md.
  - `REVIEW.md` still used the old Important/Nit report format.
- **Mis-focused:**
  - The verifier runs on Haiku and makes the most subjective call, screenshot against mockup.
  - `adversary-prd` is written against the funeral POC's PRD ids, so it does nothing for Bloodtower.
  - `approval.md` per feature records batch approvals ("Approve all ten").
- **Missing:**
  - Stalled-PR detection.
  - Any venue for structural review; the blocking list excludes it by design.
  - A file where the sdlc.md metrics are actually recorded.
- **Planned too far ahead.** All 55 feature folders for C2 to C5 were written up front; plan one milestone ahead. The C3 plan still says "draft, not yet at G0" while C3-01 and C3-06 are merged.
- **Hook false positive.** `protect-intent` blocked a read-only listing because the command contained `awk` and the word "intent".
