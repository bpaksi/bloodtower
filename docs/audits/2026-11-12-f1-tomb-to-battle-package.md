# Tomb-to-battle repair package — draft for review

## 1. Status and scope

Design-edit proposal and local implementation handoff, not an applied patch. Covers QD-03 (duplicate stance effect), CB-01 (entry terminal handling), and QD-01 (uncleared room persistence). Fixed baseline is uploaded dark-tower-review.md; SHA-256 40f61d1613245e4ae28751f2bb94dcd1ec92c43a0e5d4f431fc732bdee869ce2. No repository code was inspected or modified; no card file was overwritten; no app or executable regression test was run.

The package addresses core Tomb behavior applicable to 1.0 onward. DEC-593 explicitly ships Tomb in 1.0. Feature-specific rewards, companions and story exceptions retain their own release gates. It does not implement general audit repairs or retune balance.

## 2. Approved rules and derived expectations

| Contract | Authority | Status |
|---|---|---|
| Bold removes one head/wound before round 1 with no card draw; On guard lands one next-card attack | DEC-607; DEC-650; DEC-533 | Explicit decision |
| Battle loop owns the added entry step | DEC-607 says MEC-038 gains it | Explicit decision |
| Tomb retreat leaves living foe uncleared, keeps count, no board token, exits to Tomb space without move cost | DEC-497; DEC-651 | Explicit decision |
| Fallen hero sits out and returns at battle end; all fallen ends battle | DEC-119 | Explicit decision |
| Third corruption immediately ends game via existing loss path | DEC-676 | Explicit decision |
| Genuine re-entry applies stance again; Continue does not | DEC-682; DEC-675 | Explicit decision |
| Entry effects must reach existing terminal results before action UI | MEC-038 exit contract; DEC-119; DEC-607 | Derived conformance repair; review routing before applying |
| A foe killed by Bold does not run its later pre-round ability | Current MEC-038 order plus early terminal gate | Derived expectation, not a separately approved new ruling |

DEC-643 is supporting precedent for early in-round spell kills, not a statement that Bold is a spell or direct authority for every entry case. If local authoritative material contradicts a derived expectation, stop that subcase and report it rather than inventing a rule.

## 3. Source-card change checklist

### MEC-026 — caller ownership

Current .16:
```text
.16 change  Free first strike: the heroes' if bold, the foe's if on guard; in the guardian room the foe is the guardian
```

Proposed replacement meaning:
```text
.16 change  Prepare the battle context: selected stance, room foe (the guardian in its room), and Tomb room identity; apply no entry cut or attack here   DEC-607 DEC-491
.17 call    The battle; MEC-038 alone applies the Tomb stance entry effect   MEC-038 DEC-607
```

Use the existing call/context mechanism; the proposed “battle context” is a conceptual contract, not a demand for a new persistent state object. If .16 only duplicates existing preparation, it may become an explicitly documented no-effect handoff rather than a redundant mutation. Preserve node references or update them through the project's existing tooling.

Add after the battle-room paragraph:
> For a battle room, the Tomb supplies the selected stance and the room’s existing foe state. It does not apply the free cut or entry attack. MEC-038 applies the stance effect once on a genuine battle entry. Continue resumes the saved battle node and does not constitute a new entry (DEC-607, DEC-675, DEC-682).

### MEC-038 — entry-stage terminal handling

Keep .37–.39 as the sole stance-effect application. After that effect, before .40, check whether the game or battle already ended. After .41, check again before the body. Reuse the existing fall handling and existing won/fallen close path rather than duplicating penalties/rewards in the caller.

Proposed explanatory paragraph:
> Entry effects resolve in the drawn order: the Tomb stance effect, then any still-applicable before-round-1 foe ability. After each entry effect, dispatch an already-triggered game loss through its existing immediate exit; otherwise end the battle if the foe is gone or every present hero has fallen. A terminal entry does not open Fight/Retreat, request round actions, consume a normal round card, or roll a normal round. Ordinary battle close owns recovery, penalties, rewards, and the battle-end hook exactly once. Continue resumes the saved node without repeating completed entry effects (DEC-119, DEC-607, DEC-675, DEC-676).

Proposed control-flow sketch (NOT parser-ready railroad syntax):
```text
existing battle Enter and presentation
  -> genuine Tomb entry? apply selected stance once
  -> entry terminal gate
       existing game loss -> existing game-loss unwind
       foe gone, heroes standing -> existing won close
       all heroes fallen, foe standing -> existing fallen close
       neither -> continue entry
       competing terminal predicates not already covered -> unresolved case; do not guess
  -> applicable before-round-1 ability, if battle remains active
  -> same entry terminal gate
  -> existing battle Body
```

Allocate new permanent node IDs using local graph/diagram conventions after inspecting the current repository. Do not renumber existing nodes blindly. DEC-680 already reserves forthcoming .42-and-up retreat work; this package deliberately does not claim unused numbers or supply an invalid drop-in railroad.

Fall detection during entry must record an individual fall/corruption once, exclude fallen heroes, and reuse the existing battle close for revival. Do not run a retreat's last attack merely because an entry defeat routes to fallen. If a normal companion is active, reuse the approved interceptor; do not implement new companion/trap rules here.

### MEC-026 — return result and clearing

Replace the unconditional battle-room behavior at .18 with explicit result handling. Preserve existing room handling for Nothing/trap outside this package; do not accidentally rewrite unresolved trap casualty semantics.

Proposed paragraph:
> A battle room is marked cleared only when its battle returns won. If the guardian’s battle is won, the Tomb returns done. A retreated battle returns left and leaves the room uncleared with its standing foe state retained. A fallen battle returns failed and likewise leaves its standing foe’s room uncleared. Immediate game loss unwinds through the game-loss route rather than being converted into an ordinary Tomb result. Leaving before entering a new room clears no room and grants no reward (DEC-151, DEC-497, DEC-651, DEC-671).

Proposed replacement meaning for .18:
```text
If a battle was called:
  won       -> clear this battle room; guardian win -> done, otherwise continue Tomb
  retreated -> do not clear; retain surviving foe; left
  fallen    -> do not clear surviving foe; failed
If Leave was selected before a room entry:
  left; no room-clearing mutation
For Nothing/trap:
  retain existing explicitly applicable resolution, outside this patch
```

This is a semantic specification, not a ready-to-parse replacement node. Split check/change nodes as required by the project diagram grammar. Keep battle-result mapping in a single place; return from battle must not repeat last attacks, status rolls, fall penalties, or rewards.

### Source links and documentation

- Ensure the edited cards point to DEC-607, DEC-119, DEC-497, DEC-651, DEC-675, DEC-682 and applicable existing result rules.
- Recheck references to edited node IDs across all Markdown and diagram fixtures.
- Update body summaries that still imply caller-owned entry damage or unconditional room clearing.
- Follow DEC-352/DEC-610 for partial replacement; do not create a new gameplay decision card merely to restate approved rules. Any genuinely new choice must be separately identified.
- Keep patches limited to these repair surfaces. If the current implementation already behaves correctly, change only stale documentation and add regression evidence.

## 4. Regression specification

All fourteen cases below are specified, not executed. Use direct fixture state for damaged foes and injected card/RNG outcomes; do not reproduce balance formulas or build another standalone simulator. A resolved 2-HP card-hit stub is an explicitly synthetic fixture, not a claim about an unknown card/foe mapping. Avoid Ward, Spines, phase changes, trap costs, group-size changes and other unresolved mechanics in this package.

Common fixture requirements:
- Own-turn Tomb visit, not day-close event.
- Corruptions zero unless explicitly set.
- No companion, active guard, conditional Advantage, item or story effect unless specified.
- Foe level/status held fixed, and status-step draw forced no-step where persistence value is asserted.
- Trace semantic effects: stance cut, entry-card consumption, ability, fall, battle result, room state, normal round, reward and relevant RNG streams.
- Cosmetic art selection or shuffle initialization may draw RNG: assert no unintended **normal round/card resolution**, not that every random stream remains globally untouched.
- Rewards are release-appropriate. Do not expect gear/potion/treasure deck loot in 1.0. Battle reward and quest reward are separate owners.

| ID | Case | Setup | Action | Expected outcome | Authority |
|---|---|---|---|---|---|
| TB-01 | Bold, foe survives | Tomb room, existing foe count 5, no pre-round ability; fresh entry Bold. | Enter battle, stop before first normal round. | Remaining count 4; one Bold cut; zero round-card reveals from Bold; no normal round resolved. | DEC-607; QD-03 |
| TB-02 | Bold kills foe on entry | Non-guardian room, foe count 1, no other terminal condition; fresh Bold entry. | Enter battle and let terminal handling complete. | Foe 0, result won; room cleared; no Fight/Retreat or hero-action prompt; no Strike/round roll/landed card; normal release-appropriate reward once. | DEC-607; DEC-119; DEC-120; CB-01 |
| TB-03 | Bold kills foe with entry ability | Foe count 1 with Ambush or Fire breath; Bold. | Enter, after single cut apply terminal gate. | Foe gone routes to won before applying the dead foe’s later entry ability; HP unchanged by that ability. This is a derived terminal-gate expectation for package review, not a new source quote. | MEC-038 ordering; DEC-553; CB-01 |
| TB-04 | On guard entry is survivable | One standing hero 5 HP; no modifiers/companion; no pre-round ability. Stub next card resolution to one 2-HP hit. | Enter On guard; stop before normal round. | Hero 3 HP; one card consumed/revealed/landed; no second entry attack from caller; battle remains active. | DEC-607; DEC-650; QD-03 |
| TB-05 | On guard fells entire group | One hero 1 HP, zero corruptions, no companion/pre-round ability. Stub entry card to 2-HP hit. | Enter and allow ordinary battle close. | One fall/corruption, no action picker or normal round. Close as fallen, hero restored to 1 under DEC-119; room uncleared, foe remains. No second retreat last attack. Gold penalty uses existing rule once. | DEC-119; MEC-038; CB-01; QD-01 |
| TB-06 | Pre-round ability fells group | One hero 1 HP, zero corruptions, no companion; Dragon; Bold leaves foe alive. | Apply single Bold cut then Fire breath. | One entry cut; ability once; all-fallen gate before action UI; normal fallen close; room uncleared. | DEC-553; DEC-119; CB-01 |
| TB-07 | Entry fall reaches third corruption | One hero at 2 corruptions, own-turn Tomb entry; lethal entry damage; no companion or end-of-day guard. | Apply entry damage. | DEC-676 immediate game-loss unwind; no normal round, reward, other group turn or duplicate corruption; outcome recorded through existing game loss path. | DEC-676; LC-01 kept separate for skulls |
| TB-08 | Partial entry fall | Two heroes, first 1 HP and second 5 HP; no companions; select a single 2-HP entry hit on first; no other entry ability. | Enter On guard. | First sits out, takes one corruption; second standing. Battle continues with only standing hero eligible. Fallen hero not targeted again; restore at battle end. | DEC-119; CB-01 |
| TB-09 | Surviving retreat preserves room | Living room foe, chosen current remaining count 7; forced retreat status draw=no-step; use last-attack fixture that does not change foe count or fell heroes. | Retreat through normal existing battle close and return to Tomb. | Room uncleared; foe count 7; no external foe token; Tomb result left; group stays on Tomb board space; no move needed/spent for retreat itself. | DEC-497; DEC-651; QD-01 |
| TB-10 | Return with another group | Continue from TB-09 saved world; second group same size; same foe level, no status change; new genuine visit Bold. | Reach standing foe room and enter. | Same room/foe identity, not regenerated/refilled; one fresh Bold cut 7→6; room not pre-cleared. Avoid unresolved different-size rescaling. | DEC-151; DEC-602; DEC-651; DEC-682 |
| TB-11 | Retreat last attack fells everyone | Standing foe, one hero at 1 HP with no corruption/companion; chosen retreat card lethal; forced status no-step. | Retreat. | Existing DEC-671 classifies fallen, outside Tomb; uncleared foe remains; fall penalties once; no second last attack on returning through caller. | DEC-671; DEC-497; QD-01 |
| TB-12 | Continue after applied Bold cut | Active battle at saved node after single entry cut; remaining count 4; any required subsequent ability represented in save. | Restore, resume next pending node. | No second cut or entry cue/ability replay. Remaining count unchanged except genuinely pending future effect; preserve relevant stream/deck position. | DEC-675; DEC-682 |
| TB-13 | Continue after On guard attack | Save after entry card landed, before next entry-stage action; fixture hero 3 HP, card consumed. | Restore. | No duplicate card, damage or corruption; deck consumption preserved; only pending node executes. This specifies intended behavior, not crash-atomicity proof. | DEC-675; LC-04 |
| TB-14 | Leave and successful guardian boundaries | A: choose Leave before opening next room. B: guardian falls through entry Bold in otherwise safe fixture. | A: exit Tomb. B: return won battle to Tomb. | A: no room/foe/reward mutation. B: clear guardian, Tomb done, battle close once; quest wrapper alone owns quest reward. Existing quest turn-end rule applies upstream, not implemented anew here. | DEC-490; DEC-491; DEC-494; DEC-821; QD-01 |

## 5. Explicit limits and blocked cases

- Mutual terminal effects (CB-06): do not decide a final cut plus retaliatory group fall here.
- Trap zero/shortfall recovery (QD-05): untouched.
- General skull-loss dispatch (LC-01): untouched, aside from respecting existing unambiguous third-corruption unwind.
- Persistent foe rescaling: use same-size groups and fixed status for cross-group persistence test.
- Full recovery atomicity (LC-04): these fixtures assert intended no-replay behavior; they do not certify crash-safe physical state.
- Missing retreat guard prompt (CB-02), companion propagation (CB-03), threshold stance choice (QD-04), trap draw timing (QD-02), and upstream quest turn-ending (EE-01): do not silently expand scope. Reuse already-correct infrastructure; report blockers.
- Body summaries may already implement later rulings; inspect rather than blindly replace code.

## 6. Local coding-assistant handoff prompt

```text
Implement the bounded Tomb-to-battle repair package for QD-03, CB-01 and QD-01. Treat this package as a proposed conformance change, not authority overriding the current repository.

First inspect the actual current cards, explicit later refinements, diagram tooling, implementation and test runner. Compare against the supplied snapshot. Report material drift. Do not overwrite newer work.

Required scope:
1. MEC-038 owns the Bold/On guard battle entry effect. MEC-026 passes context only.
2. After entry effects, reach the existing terminal result paths before normal round actions. Preserve approved immediate game-loss behavior.
3. MEC-026 clears a battle room only after won. Retreat/fall preserves a surviving uncleared foe. Leave does not clear a new room.
4. Continue replays no completed entry effects. A genuine new visit still applies its one entry effect.

Use existing source decisions, node-ID conventions, result types, event log and test framework. Do not introduce another simulator or assume a specific architecture. The package flow sketches are not drop-in railroad syntax; allocate IDs safely and preserve/update references. DEC-680 has pending .42-and-up work.

Implement the fourteen supplied regressions using deterministic fixtures/injected outcomes. Distinguish derived expectations from explicit decisions. Inspect the early-kill suppression expectation before applying it; if current authority contradicts it, block that subcase rather than choosing silently.

Do not retune combat, alter traps, settle mutual terminal precedence, redesign reward/quest turn rules, add physical Tower retries, or modify unrelated systems. Reuse existing release-gated reward and companion behavior. If missing infrastructure makes a scoped test impossible, report the exact blocker; do not invent behavior.

Deliver: changed-file list; per-finding explanation; exact test commands and actual results; diagram/reference checks; regression evidence for once-only effects and retained room/foe state; unresolved blockers and deviations. If code already conforms, leave it unchanged and fix documentation/test coverage only. No pass claim without executed evidence. Follow existing repository review/SDLC rules.
```

## 7. Acceptance checklist

- [ ] Current repository compared with snapshot; controlling source decisions confirmed.
- [ ] Exactly one owner for entry effect across caller/callee.
- [ ] Entry terminal cases do not request actions or apply a second entry attack.
- [ ] Existing third-corruption loss path preserved.
- [ ] Surviving retreat foe remains uncleared and count retained.
- [ ] Leave cannot clear a room accidentally.
- [ ] Continue and genuine re-entry distinguished.
- [ ] Battle and quest rewards/penalties not duplicated.
- [ ] Release gates preserved; no 1.0 deck-loot assumption.
- [ ] New diagram nodes valid and references checked without conflicting allocation.
- [ ] Fourteen tests implemented/run or specifically marked blocked with evidence.
- [ ] Existing related tests run; actual commands/results recorded.
- [ ] Derived expectations reviewed; no unresolved rule silently filled.
- [ ] Original finding IDs linked to patch/test evidence.
- [ ] No claim of physical Tower verification or overall balance.

## 8. Current delivery status

Ready for review and local handoff. Source-card changes are proposals only. No source files changed; no implementation inspected; all regression cases NOT RUN. Existing P-001/P-002/P-003 walkthroughs provide context for single cuts, entry attacks, retained foes and no-replay Continue, but do not substitute for these new executable tests.
## Gamewright confirmations (Nov 13 2026, 5:50 AM ET)
1) Entry terminal gate routing confirmed as written. MEC-038 alone applies the stance once, on a genuine entry. After each entry effect the terminal gate runs: game loss first, then foe gone = won, then all fallen = fallen close. No Fight/Retreat, round card or roll after a terminal entry. Continue replays nothing.
2) TB-03 confirmed as a Gamewright ruling (cite it as such): a foe killed by Bold never uses its later pre-round ability (Ambush, Fire breath, or any other).
Build still held until Warden relays more.
