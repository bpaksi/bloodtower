# Dark Tower — Consolidated Design Audit

## Document status

Consolidated record of the entire audit conversation through November 12, 2026. Includes every registered finding, its latest disposition, corrections, repair groups, priorities, decision dependencies, verification plan and residual scenario backlog. This is one self-contained document; earlier reports/CSVs are not required to understand the findings.

Baseline: uploaded `dark-tower-review.md`. SHA-256 of uploaded file bytes: `40f61d1613245e4ae28751f2bb94dcd1ec92c43a0e5d4f431fc732bdee869ce2`.

This document consolidates the last completed source-revalidation pass; it is not a new independent audit. Previous generated documents were unavailable in this turn. Detailed candidates were reconstructed from the conversation, preserving all 30 original IDs and latest dispositions. No source-design changes made.

## 1. Executive summary

The central result is synchronization debt, not thirty newly discovered game-design defects. Most entries are later approved decisions that have not reached diagrams. One generic loss-timing specification inconsistency was verified; seven entries remain unresolved questions rather than proved defects. Two require implementation/hardware verification. One is a coverage limitation. One authority question was withdrawn.

| Latest disposition | Count |
|---|---:|
| Already-decided documentation/diagram drift | 18 |
| Test-coverage gap | 1 |
| Verified design defect (specification inconsistency) | 1 |
| Hardware or implementation verification required | 2 |
| Resolved/withdrawn | 1 |
| Unresolved design question | 7 |

All 30 registered candidates received source-targeted revalidation in the preceding consolidation. No implementation, linter, new game simulation, Bluetooth command, real-Tower experiment or human playtest was executed. “Consistent” in earlier scenario tables meant written resolution, not implementation pass. No balance, release-readiness or exhaustive correctness conclusion follows.

### Recommended approach

1. Resolve high-impact loss/casualty/combat-order fixtures.
2. Concurrently synchronize already-decided diagrams without settling unspecified behavior.
3. Inspect current implementation and run deterministic regressions.
4. Verify recovery and physical Tower behavior.
5. Rerun relevant faithful simulations, then human playtests.

## 2. Authority, scope and evidence

- DEC-610: historical documents lose to controlling cards. DEC-352: fully replaced cards are parked; partly replaced cards are trimmed.
- Later decisions must be applied within release/story scope; a higher numeric ID alone is not an override.
- Tomb ships in 1.0 under DEC-593, despite the older DEC-502 cut. True other dungeon types move to 1.2 under DEC-812. DEC-820 makes the named Ruined Keep 1.1 substitutes use Tomb bodies.
- Caravans/general moving quests remain deferred under DEC-777.
- Core 1.0+, 1.1 feature work and Dracula 1.2 applicability describe written design scope, not the user’s installed checkout.
- Unresolved means no controlling resolution established in targeted review; absence of search evidence is not proof of a missing rule.

### Existing probes and their limits

- P-001: setup, first Tomb and rewards; introduces several later rulings; approximates boss phases.
- P-002: no-Tower solo, retreat/fall, Continue mid-battle and immediate third-corruption loss; old tuning.
- P-003: persistent guardian, retreat guard, Tower retreat, reconnect, held skulls and finale desk walk; many follow-up decisions already resolved behavior.
- P-004: Long trajectory and stock question; uses older non-Tomb bodies/spell assumptions.
- P-005: no-caster policy, companion interception and corrected guarded-Sweep simulation; limited buying and omitted fence/glyph paths.
- P-006: policy-specific numbers pass. Keeps party together; omits abilities, conditional softening, several event paths, fence/glyph/Tower behavior and building-loss enforcement. Its reported results were not rerun and do not validate omitted mechanics.

## 3. Complete finding index

Priority P1 = address before trusting the affected core behavior/evidence; P2 = next or feature-gated; P3 = withdrawn/reference. Priorities are proposed consequence-based ranks, not estimates or thirty release blockers.

| ID | Finding | Disposition | Priority | Scope |
|---|---|---|---|
| EE-01 | Forced turn termination not propagated | Already-decided documentation/diagram drift | P1 | Core 1.0+ |
| EE-02 | Cleanse omitted from encounter dispatch | Already-decided documentation/diagram drift | P1 | Core 1.0+ |
| EE-03 | Existing numbers pass does not validate all mechanics | Test-coverage gap | P1 | Existing P-006 evidence; mainly 1.1 |
| LC-01 | Terminal-loss timing is internally inconsistent | Verified design defect (specification inconsistency) | P1 | Core 1.0+; Dracula 1.2 has scoped rules |
| LC-02 | Play again skips seed-generation node | Already-decided documentation/diagram drift | P2 | Core 1.0+ |
| LC-03 | Day railroad omits approved drop-schedule gate | Already-decided documentation/diagram drift | P1 | Core schedules; Long overlay 1.1 |
| LC-04 | Exact-node recovery requires boundary verification | Hardware or implementation verification required | P1 | Core 1.0+ |
| LC-05 | Dracula chapter-order question already resolved | Resolved/withdrawn | P3 | Dracula 1.2 |
| LC-06 | Quit route absent from game result diagram | Already-decided documentation/diagram drift | P2 | Core 1.0+ |
| CB-01 | Battle entry effects bypass terminal handling | Already-decided documentation/diagram drift | P1 | Core 1.0+ |
| CB-02 | Retreat guard and Tower exception not propagated | Already-decided documentation/diagram drift | P1 | Core 1.0+ |
| CB-03 | Companion interception absent from generic fall flow | Already-decided documentation/diagram drift | P2 | Companions 1.1+; Lenka separate 1.2 |
| CB-04 | Ward cancellation order is not established | Unresolved design question | P1 | Core foe ability 1.0+ |
| CB-05 | Boss phase live-deck operation needs definition | Unresolved design question | P1 | Core boss battle 1.0+ |
| CB-06 | Final cut plus Spines can meet both terminal predicates | Unresolved design question | P1 | Core Spine Fiends 1.0+ |
| BE-01 | Haggle cancellation and stock mutation need explicit flow | Already-decided documentation/diagram drift | P2 | Shops 1.1+ |
| BE-02 | Fortunate free pick conflicts with move gate | Already-decided documentation/diagram drift | P2 | Core virtue pool 1.0+ |
| BE-03 | Quest payout and derived glyph text are stale | Already-decided documentation/diagram drift | P2 | Base reward 1.0+; Quest glyph 1.1 |
| BE-04 | Integer valuation and modifier order need fixtures | Unresolved design question | P2 | Mainly 1.1 prices/modifiers |
| BE-05 | Party purse versus present-group debit scope | Unresolved design question | P1 | Core split-group play 1.0+ |
| QD-01 | Room unconditionally cleared after retreat/fall | Already-decided documentation/diagram drift | P1 | Tomb 1.0+ |
| QD-02 | Trap draw timing conflicts with fixed construction | Already-decided documentation/diagram drift | P2 | Tomb 1.0+ |
| QD-03 | Both caller and callee apply stance effect | Already-decided documentation/diagram drift | P1 | Tomb-to-battle 1.0+ |
| QD-04 | Final stance choice precedes threshold instead of following | Already-decided documentation/diagram drift | P2 | Configured Tomb threshold 1.0+ |
| QD-05 | Trap casualty, shortfall and revival contract incomplete | Unresolved design question | P1 | Tomb 1.0+; companions 1.1 |
| QD-06 | Emergency relocation procedure not established | Unresolved design question | P1 | Required quest/building destruction 1.0+ |
| TP-01 | Obsolete increasing guard level remains in call | Already-decided documentation/diagram drift | P2 | Core Tower 1.0+ |
| TP-02 | Turn/Skip and observed-glyph correction omitted | Already-decided documentation/diagram drift | P2 | 1.1 glyph/drum workflow |
| TP-03 | Tower end hook absent from drawn exit | Already-decided documentation/diagram drift | P2 | Core finale 1.0+ |
| TP-04 | Reloading held skulls requires real-world verification | Hardware or implementation verification required | P1 | Physical Tower Continue |

## 4. Repair and root-cause groups

Groups identify shared contracts/repair surfaces, not proof that every grouped symptom is the same runtime bug. Individual IDs/reproducers remain separate; RG06 is withdrawn, leaving twelve groups with active work.

| Group | Surface | IDs |
|---|---|---|
| RG01 | Loop result propagation and effect ownership | EE-01, LC-06, CB-01, CB-06, QD-01, QD-03, QD-05, TP-03 |
| RG02 | Skull clock and loss dispatch | LC-01, LC-03 |
| RG03 | Encounter eligibility and costs | EE-02, BE-02 |
| RG04 | Replay initialization | LC-02 |
| RG05 | Persistence and physical reconciliation | LC-04, TP-04 |
| RG06 | Story-specific order (withdrawn question) | LC-05 |
| RG07 | Combat/Tower integration | CB-02, CB-03, TP-01 |
| RG08 | Spell cancellation order | CB-04 |
| RG09 | Boss live deck | CB-05 |
| RG10 | Economic ledger and derived values | BE-01, BE-03, BE-04, BE-05 |
| RG11 | Quest/Tomb content and persistence | QD-02, QD-04, QD-06 |
| RG12 | Evidence coverage | EE-03 |
| RG13 | Authorized drum/glyph workflow | TP-02 |

## 5. Detailed findings

### EE-01 — Forced turn termination not propagated

Disposition: Already-decided documentation/diagram drift  
Priority: P1  
Scope: Core 1.0+  
Group: RG01  
Authority: DEC-821; DEC-468; MEC-035; MEC-036

Reproducing scenario: Resolve a quest, or finish a building pick with Uncertain, while moves remain.

Evidence and consequence: The approved rules end the group turn; MEC-036 checks only Leave or no remaining moves. Continuing would permit unauthorized additional actions.

Smallest next action: Propagate a forced-turn-ended result through encounter and group turn. Test quest won/left/failed and Uncertain after a shopping trip.

Resolution check / limitation: Already acknowledged for quests in DEC-821. Do not decide Fortunate/forced-ending precedence implicitly.

### EE-02 — Cleanse omitted from encounter dispatch

Disposition: Already-decided documentation/diagram drift  
Priority: P1  
Scope: Core 1.0+  
Group: RG03  
Authority: DEC-377; DEC-572; UI-043; MEC-036

Reproducing scenario: Choose Cleanse at a standing building with skulls and one move.

Evidence and consequence: The action and UI are decided, but the encounter diagram dispatches only quest, talk, buy and rest.

Smallest next action: Add Cleanse routing and per-visit usage state; test cost, skull conservation and restored menu options.

Resolution check / limitation: No new Cleanse design decision needed. Same-turn re-entry remains a separate scenario question.

### EE-03 — Existing numbers pass does not validate all mechanics

Disposition: Test-coverage gap  
Priority: P1  
Scope: Existing P-006 evidence; mainly 1.1  
Group: RG12  
Authority: P-006; DEC-814; DEC-553; DEC-093

Reproducing scenario: Use P-006 win rates to infer correctness of foe abilities, skulled-building events, physical Tower or destroyed-building losses.

Evidence and consequence: P-006 states deliberate omissions and approximations, including missing building-loss enforcement. Its policy-specific results cannot close those coverage questions.

Smallest next action: Retain the results with limitations; add deterministic mechanics tests before faithful relevant simulation.

Resolution check / limitation: Not a rules defect or criticism that the probe concealed its limitations. P-001 through P-003 provide selective additional evidence.

### LC-01 — Terminal-loss timing is internally inconsistent

Disposition: Verified design defect (specification inconsistency)  
Priority: P1  
Scope: Core 1.0+; Dracula 1.2 has scoped rules  
Group: RG02  
Authority: DEC-044; DEC-559; DEC-676; DEC-686; MEC-033; DEC-885

Reproducing scenario: A seal release after chapter .11 destroys the last building in a kingdom; alternatively a battle trait consumes the last supply skull.

Evidence and consequence: DEC-676 says skull/building losses only arise at close and points to .11; DEC-559 permits mid-battle changes. Chapter-close placement occurs after .11 without another check.

Smallest next action: Explicitly settle generic loss dispatch/unwinding, remove the false only-at-close explanation, and update affected diagrams.

Resolution check / limitation: Verified textual inconsistency, not a proven app bug. Immediate checks everywhere were an audit recommendation, not an approved universal rule. Dracula timing must not be silently generalized.

### LC-02 — Play again skips seed-generation node

Disposition: Already-decided documentation/diagram drift  
Priority: P2  
Scope: Core 1.0+  
Group: RG04  
Authority: DEC-708; DEC-213; MEC-032

Reproducing scenario: Select Play again, then perform seeded setup.

Evidence and consequence: The diagram skips .14–.16 on Again; .16 draws the seed. The later rule requires a fresh seed.

Smallest next action: Put seed initialization on both New and Again paths before seeded setup; retain approved heroes/settings.

Resolution check / limitation: Replay policy already decided; prose was updated, diagram was not.

### LC-03 — Day railroad omits approved drop-schedule gate

Disposition: Already-decided documentation/diagram drift  
Priority: P1  
Scope: Core schedules; Long overlay 1.1  
Group: RG02  
Authority: DEC-699; DEC-822; DEC-824; DEC-826; MEC-034

Reproducing scenario: Run a quest-win night, solo skip night, pair skip, or multiplayer/Long schedule.

Evidence and consequence: Diagram enters real/simulated drop without an explicit due-count calculation. Pair calendar wording versus excluding quest-win nights needs an exact fixture.

Smallest next action: Define one due-drop calculation shared by real and simulated branches; first confirm counter fixtures, then test zero/one/two drops.

Resolution check / limitation: Main finding is diagram drift; a subsidiary counter question remains. Do not pick an interpretation silently.

### LC-04 — Exact-node recovery requires boundary verification

Disposition: Hardware or implementation verification required  
Priority: P1  
Scope: Core 1.0+  
Group: RG05  
Authority: DEC-675; DEC-282; DEC-683; MEC-018; MEC-032; DEC-716

Reproducing scenario: Interrupt during Close/rewards or after a physical action before confirmation; interrupt a commanded drum movement.

Evidence and consequence: Exact-node/no-replay behavior is already global. Broad intent alone does not prove crash-safe external effects, saved-phase handling or record-once behavior.

Smallest next action: Inspect and fault-test phase/stack/node recovery, state commits and physical reconciliation; separately declare pre-Begin recovery scope.

Resolution check / limitation: Downgraded from apparent missing-rule claim. DEC-675 deliberately omits lower-loop Continuing nodes; their absence is not a defect.

### LC-05 — Dracula chapter-order question already resolved

Disposition: Resolved/withdrawn  
Priority: P3  
Scope: Dracula 1.2  
Group: RG06  
Authority: DEC-886; D-04 §2; MEC-033; DEC-538; DEC-542

Reproducing scenario: Complete Dracula Standard chapter 3 with hidden traitor and Tower.

Evidence and consequence: DEC-886/D-04 explicitly decide chapter-win, traitor, seal, check, next chapter. Asking the user to choose that order again is unnecessary.

Smallest next action: Withdraw the unresolved-choice claim; retain a 1.2 conformance fixture without rewriting every story’s core order.

Resolution check / limitation: Withdrawn as an unresolved authority question. Future engine integration may still need work.

### LC-06 — Quit route absent from game result diagram

Disposition: Already-decided documentation/diagram drift  
Priority: P2  
Scope: Core 1.0+  
Group: RG01  
Authority: DEC-218; MEC-071; MEC-032

Reproducing scenario: Quit from a nested battle.

Evidence and consequence: Quit is defined and propagated by the interrupt loop; the game diagram explicitly depicts won/lost rather than the quit record/session-return path.

Smallest next action: Draw quit record-once and outcome-scene bypass, retaining autosave.

Resolution check / limitation: Documentation gap, not proof the implementation loops or shows defeat.

### CB-01 — Battle entry effects bypass terminal handling

Disposition: Already-decided documentation/diagram drift  
Priority: P1  
Scope: Core 1.0+  
Group: RG01  
Authority: MEC-038; DEC-607; DEC-119; DEC-643; DEC-682

Reproducing scenario: Bold kills a foe at count one, or entry attack/ability fells all heroes.

Evidence and consequence: Entry effects precede the action picker without a terminal-result gate; existing terminal predicates define foe gone/all fallen.

Smallest next action: Route terminal results after entry effects before requesting actions or applying later enemy effects.

Resolution check / limitation: Separate from QD-03 duplicate application. Resolve ownership first or in the same patch.

### CB-02 — Retreat guard and Tower exception not propagated

Disposition: Already-decided documentation/diagram drift  
Priority: P1  
Scope: Core 1.0+  
Group: RG07  
Authority: DEC-680; DEC-687; MEC-038; P-003

Reproducing scenario: Retreat with a standing guard, or from a Tower battle with zero moves.

Evidence and consequence: Approved guard prompt and Tower no-move exception/destination are missing from generic retreat diagram.

Smallest next action: Apply the existing prompt, destination and cost exceptions; test last attack and fallback.

Resolution check / limitation: Already discovered and ruled in P-003; not a new mechanic.

### CB-03 — Companion interception absent from generic fall flow

Disposition: Already-decided documentation/diagram drift  
Priority: P2  
Scope: Companions 1.1+; Lenka separate 1.2  
Group: RG07  
Authority: DEC-800; UI-050; MEC-038; DEC-852

Reproducing scenario: A normal companion holder receives lethal battle damage.

Evidence and consequence: Approved companion sacrifice preserves hero at one HP without corruption; generic damage step goes straight to corruption/sit-out.

Smallest next action: Reference shared would-fall interception across relevant damage paths; keep story exceptions scoped.

Resolution check / limitation: P-005 exercised sacrifice. Trap interception awaits QD-05 rather than being assumed.

### CB-04 — Ward cancellation order is not established

Disposition: Unresolved design question  
Priority: P1  
Scope: Core foe ability 1.0+  
Group: RG08  
Authority: DEC-553; DEC-655; DEC-801

Reproducing scenario: Unused Ward encounters simultaneous Lightning -4 and Magic Missile -2.

Evidence and consequence: Cancel-first-spell and flat-first do not order two unequal flat spells; resulting damage differs. Targeted review located no controlling tie-break.

Smallest next action: Specify deterministic cancellation/order, then test two-versus-four surviving damage.

Resolution check / limitation: Missing controlling evidence is not proof no rule exists anywhere. Do not use tap/seat order silently.

### CB-05 — Boss phase live-deck operation needs definition

Disposition: Unresolved design question  
Priority: P1  
Scope: Core boss battle 1.0+  
Group: RG09  
Authority: DEC-567; DEC-649; DEC-658

Reproducing scenario: Cross a phase after revealing a card, with other cards already discarded.

Evidence and consequence: Added Rends and phase order are explicit; placement, reshuffle and current-card handling are not established.

Smallest next action: Define operations on draw pile/discard/revealed card; create seeded one- and two-threshold fixtures.

Resolution check / limitation: Narrowed: boss-specific rules may enlarge the ordinary deck. The unresolved part is mutation, not an eight-card prohibition.

### CB-06 — Final cut plus Spines can meet both terminal predicates

Disposition: Unresolved design question  
Priority: P1  
Scope: Core Spine Fiends 1.0+  
Group: RG01  
Authority: DEC-553; DEC-119; MEC-038; DEC-671; DEC-676

Reproducing scenario: Solo hero at one HP wins the final cut and takes Spines damage; start below two corruptions.

Evidence and consequence: Foe gone and whole group fallen coincide. Retreat-specific precedence does not explicitly decide rewards/fall penalties here.

Smallest next action: Define won-round effect ordering and mutual-terminal result, including companion prevention.

Resolution check / limitation: Third-corruption variant already invokes immediate game loss; do not use it to obscure the ordinary case.

### BE-01 — Haggle cancellation and stock mutation need explicit flow

Disposition: Already-decided documentation/diagram drift  
Priority: P2  
Scope: Shops 1.1+  
Group: RG10  
Authority: DEC-760; DEC-795; UI-059; MEC-074

Reproducing scenario: Roll Hooded figure for an affordable item; separately buy one and return to stock list.

Evidence and consequence: Approved bar-this-item-for-visit rule lacks a cancellation branch in numeric price flow. Stock depletion is defined but not explicit at issuance.

Smallest next action: Add barred-item eligibility and stock-update reference; test no debit/card on cancellation.

Resolution check / limitation: Stock may already be consumed implicitly. No duplicate issuance bug demonstrated.

### BE-02 — Fortunate free pick conflicts with move gate

Disposition: Already-decided documentation/diagram drift  
Priority: P2  
Scope: Core virtue pool 1.0+  
Group: RG03  
Authority: DEC-399; DEC-548; MEC-036

Reproducing scenario: Use the last move on an ordinary nonquest pick with Fortunate unused.

Evidence and consequence: Zero-move exit and unconditional pick debit omit the approved free second pick. Later Inspiring once-per-visit overrides old repeat-heal text.

Smallest next action: Represent pending free entitlement/cost override; trim stale Inspiring wording.

Resolution check / limitation: Quest/Uncertain forced-end precedence remains a separate fixture; do not override it implicitly.

### BE-03 — Quest payout and derived glyph text are stale

Disposition: Already-decided documentation/diagram drift  
Priority: P2  
Scope: Base reward 1.0+; Quest glyph 1.1  
Group: RG10  
Authority: DEC-827; DEC-703; DEC-761; DEC-700

Reproducing scenario: Four-hero quest reward, then repeat with Quest glyph.

Evidence and consequence: Later base pays 10/group; old tuning says five/hero. Glyph says double and also old ten/hero, no longer equivalent.

Smallest next action: Synchronize base reward; explicitly reconcile multiplier with obsolete glyph amount.

Resolution check / limitation: Base is already decided. Twenty/group is multiplier-derived, not a newly user-approved exception or retuning.

### BE-04 — Integer valuation and modifier order need fixtures

Disposition: Unresolved design question  
Priority: P2  
Scope: Mainly 1.1 prices/modifiers  
Group: RG10  
Authority: DEC-760; DEC-646; DEC-681; DEC-732; DEC-761; DEC-477

Reproducing scenario: Sell 25-list treasure at half/quarter or buy fence goods quarter below list; combine legal modifiers.

Evidence and consequence: Fractional totals need valuation rounding. Allocation of leftover integer coins is not a price-rounding rule.

Smallest next action: Define valuation and modifier order/floors; separately confirm 1.1 Silver Tongue reach.

Resolution check / limitation: Known 1.0 5→4/10→8 prices and explicitly free cure are resolved; do not reopen them.

### BE-05 — Party purse versus present-group debit scope

Disposition: Unresolved design question  
Priority: P1  
Scope: Core split-group play 1.0+  
Group: RG10  
Authority: DEC-176; DEC-178; MEC-003; MEC-074; DEC-726

Reproducing scenario: Acting group holds zero; absent group holds ten; acting group attempts five-gold rally.

Evidence and consequence: Freely shared pool and present-hero debit do not provide an explicit remote shortfall/affordability fixture.

Smallest next action: Specify spendable scope and debit allocation; assert conservation and no negative balances; distinguish own-share costs.

Resolution check / limitation: MEC-003 supports present participants but does not itself define remote funding or UI affordability.

### QD-01 — Room unconditionally cleared after retreat/fall

Disposition: Already-decided documentation/diagram drift  
Priority: P1  
Scope: Tomb 1.0+  
Group: RG01  
Authority: MEC-026 .18; DEC-497; DEC-651; DEC-151

Reproducing scenario: Retreat from a living damaged room foe, or Leave before opening next room.

Evidence and consequence: Unconditional clear conflicts with retained uncleared foe state.

Smallest next action: Condition clear on successful room resolution; preserve living foe and do not clear on Leave.

Resolution check / limitation: P-002/P-003 narrate intended persistence, not a corrected diagram.

### QD-02 — Trap draw timing conflicts with fixed construction

Disposition: Already-decided documentation/diagram drift  
Priority: P2  
Scope: Tomb 1.0+  
Group: RG11  
Authority: DEC-602; DEC-606; MEC-026 .2/.12

Reproducing scenario: Construct Tomb then visit trap rooms in different orders.

Evidence and consequence: Exact trap fixed at first entry; room-entry node still draws trap type.

Smallest next action: Reveal preassigned trap, with no new identity draw; test order independence.

Resolution check / limitation: Generation policy is settled, not a new randomization decision.

### QD-03 — Both caller and callee apply stance effect

Disposition: Already-decided documentation/diagram drift  
Priority: P1  
Scope: Tomb-to-battle 1.0+  
Group: RG01  
Authority: DEC-607; MEC-026 .16; MEC-038 .37-.39

Reproducing scenario: Enter Bold/On guard; execute caller change then battle entry.

Evidence and consequence: Both explicitly apply the single approved cut/attack.

Smallest next action: Assign effect ownership to battle; caller passes context only; assert one application.

Resolution check / limitation: Distinct from CB-01 terminal check. Actual implementation may already avoid duplication.

### QD-04 — Final stance choice precedes threshold instead of following

Disposition: Already-decided documentation/diagram drift  
Priority: P2  
Scope: Configured Tomb threshold 1.0+  
Group: RG11  
Authority: DEC-620; DEC-587; MEC-026 .4/.7

Reproducing scenario: Guardian threshold plays; group wants Leave after learning what waits.

Evidence and consequence: Approved final stance/Leave prompt belongs after presentation; diagram selects before it without another prompt.

Smallest next action: Add conditional post-threshold choice; listened door permits On guard/Leave only.

Resolution check / limitation: No extra prompt required for every room without a threshold.

### QD-05 — Trap casualty, shortfall and revival contract incomplete

Disposition: Unresolved design question  
Priority: P1  
Scope: Tomb 1.0+; companions 1.1  
Group: RG01  
Authority: DEC-606; DEC-496; DEC-119; DEC-714; MEC-026 .15

Reproducing scenario: Pit hits exact four HP and separately three HP while peers survive.

Evidence and consequence: Exact zero, shortfall corruption and sit-out reference do not establish a complete trap-specific recovery point.

Smallest next action: Specify zero/shortfall corruption and revival timing; integrate immediate loss and applicable companion rules.

Resolution check / limitation: Do not assert double corruption or permanent zero HP. Plain-scene floor does not settle trap rules.

### QD-06 — Emergency relocation procedure not established

Disposition: Unresolved design question  
Priority: P1  
Scope: Required quest/building destruction 1.0+  
Group: RG11  
Authority: DEC-093; DEC-088; DEC-613; DEC-777; DEC-641

Reproducing scenario: Destroy unfinished required-quest building while other legal sites remain.

Evidence and consequence: Marker moves and quest survives are explicit; destination selection/bounds/confirmation not established in reviewed chain.

Smallest next action: Define/reference emergency relocation retaining quest identity/progress, separate from deferred roaming.

Resolution check / limitation: Wild marker legality supplies representation, not relocation algorithm. No claim all story-specific procedures absent.

### TP-01 — Obsolete increasing guard level remains in call

Disposition: Already-decided documentation/diagram drift  
Priority: P2  
Scope: Core Tower 1.0+  
Group: RG07  
Authority: DEC-702; MEC-076 .15

Reproducing scenario: Level-five adversary; compare guards on each level.

Evidence and consequence: Later rule makes all level three; call still increases by Tower level.

Smallest next action: Replace old expression with adversary-minus-two rule.

Resolution check / limitation: Newer probes already use fixed guards; no retuning required.

### TP-02 — Turn/Skip and observed-glyph correction omitted

Disposition: Already-decided documentation/diagram drift  
Priority: P2  
Scope: 1.1 glyph/drum workflow  
Group: RG13  
Authority: DEC-762; DEC-766; UI-058; MEC-033; DEC-103

Reproducing scenario: Chapter Turn/Skip, then wrong/Blank glyph revealed at seal break.

Evidence and consequence: Approved authorized action/correction missing; old setup sync text superseded for this release.

Smallest next action: Integrate release-gated control and correction persistence before boon use.

Resolution check / limitation: No 1.0 glyph boon; hardware map remains separately unverified.

### TP-03 — Tower end hook absent from drawn exit

Disposition: Already-decided documentation/diagram drift  
Priority: P2  
Scope: Core finale 1.0+  
Group: RG01  
Authority: DEC-689; MEC-076; DEC-664; P-003

Reproducing scenario: Defeat boss and follow Tower exit.

Evidence and consequence: Diagram ends .19; later approved .20 result-conditioned hook missing before outcome.

Smallest next action: Draw hook/handoff order; verify ending state set before selection.

Resolution check / limitation: Already ruled in P-003; not a new narrative mechanic.

### TP-04 — Reloading held skulls requires real-world verification

Disposition: Hardware or implementation verification required  
Priority: P1  
Scope: Physical Tower Continue  
Group: RG05  
Authority: DEC-717; DEC-710; MEC-018; DEC-765

Reproducing scenario: Reload five saved-held skulls after packing away; observe possible fall-through.

Evidence and consequence: Set/check procedure exists; no evidence establishes successful retention or tested mismatch handling.

Smallest next action: Perform restoration experiment; conserve all skull locations; define reconciliation if mismatch actually occurs.

Resolution check / limitation: Conditional risk, not observed failure. Distinct from LC-04 crash/acknowledgment atomicity.

## 6. Prioritized fix queue — already-decided behavior

| Package | Priority | IDs | Work | Dependency / guardrail |
|---|---|---|---|---|
| F1: Loop/effect contracts | P1 | QD-03, CB-01, QD-01, EE-01 | One stance-effect owner; terminal entry gates; uncleared retreat foe; forced-turn result. | Do not decide mutual Spines/trap outcomes in this patch. |
| F2: Encounter dispatch and move exceptions | P1/P2 | EE-02, BE-02 | Cleanse routing; pending free pick/cost override; trim stale Inspiring. | F1 result contract; forced-ending precedence fixture. |
| F3: Drop scheduling | P1 | LC-03 | Shared due-drop calculation for physical/simulated handling. | Approve exact pair/quest-win counter trace first; LC-01 timing separately. |
| F4: Combat/Tower exceptions | P1/P2 | CB-02, CB-03, TP-01 | Retreat guard, Tower free exit, normal companion interceptor, current guard levels. | Companions feature-gated; trap interception awaits QD-05. |
| F5: Initialization and outcomes | P2 | LC-02, LC-06, TP-03 | Fresh Again seed; Quit record/session bypass; Tower end hook before outcome. | State/result contract and record-once recovery. |
| F6: Tomb reveal and threshold | P2 | QD-02, QD-04 | Reveal fixed trap; informed final threshold choice. | Single stance ownership; no invented trap arithmetic. |
| F7: Shopping and reward references | P2 | BE-01, BE-03 | Cancellation/stock reference and base ten-gold/group payout. | Price valuation/glyph clarification for dependent tests. |
| F8: 1.1 drum/glyph workflow | P2 | TP-02 | Authorized Turn/Skip and confirm/correct/Blank persistence. | Physical map and actuator recovery tests; no 1.0 boon. |

Inspect current implementation before changing it. It may already match later rulings, in which case close its implementation subtask and retain documentation maintenance only. Do not smuggle balance changes into diagram cleanup.

## 7. Separate decision queue

| Decision | Priority | IDs | Boundary needing a rule |
|---|---|---|---|
| D1 | High | LC-01 | Generic terminal-loss dispatch and unwind outside existing check. |
| D2 | High | QD-05, CB-06 | Trap exact-zero/shortfall recovery and mutual-terminal Spines outcome. |
| D3 | High | CB-04, CB-05 | Ward deterministic cancellation; boss phase live-deck operation. |
| D4 | High | QD-06 | Required marker emergency destination, bounds, identity/progress and confirmation. |
| D5 | High | BE-05 | Absent-hero funding and present-group debit scope. |
| D6 | Before exact tests | LC-03, BE-02 | Pair counter through quest-win nights; Fortunate versus forced turn-end. |
| D7 | Feature gated | BE-04, BE-03 | Integer valuation/modifier order, 1.1 Silver Tongue scope, derived Quest-glyph value. |

No unsupported alternative menu is prescribed. Known decisions are constraints, not options to reconsider: quest base ten/group, ordinary Fortunate free pick, no third corruption from the already-guarded curse, explicit 1.0 Silver Tongue examples, and Dracula-specific chapter order remain settled.

## 8. Verification and acceptance plan

| Test | Type | Dependency | Procedure / acceptance |
|---|---|---|---|
| R01 | Implementation/regression | F1 | Exactly one stance effect; no actions after terminal entry; retreat room uncleared; quest/Uncertain ends turn. |
| R02 | Regression | F2 | Cleanse conservation/once-per-visit; ordinary free pick with zero moves; no unapproved forced-end override. |
| R03 | Regression | D1/F3 | Loss after trait/seal skull changes; no post-loss actions; schedule fixture across size/length/quest-win nights. |
| R04 | Regression | D2/D3 | Ward unequal spells; mutual Spines; trap exact zero/shortfall; seeded boss pile/discard traces. |
| R05 | Regression | D4 | Destroyed required site remains reachable; identity/progress kept; early quest credit once. |
| R06 | Regression | D5/D7/F7 | Price fixture, conservation, remote scope, cancellation, stock and finite physical cards. |
| R07 | Fault injection | LC-04 | Before/after roll, payment, reward, terminal record and physical confirmation: restored state/streams, no duplicates. |
| R08 | Regression | F5 | Fresh seeded Again; Quit keeps save and skips defeat; finale hook before ending selection. |
| R09 | Lint/validation | Existing slot decisions | Unknown keys; removed references; empty required/optional silence; specificity-first fallback; chapter removal of runtime-held entry. |
| H01 | Real Tower | TP-04 | Restore known held skull count after box-up; observe retention and handle mismatch; conserve totals. |
| H02 | Real Tower | DEC-716/TP-02 | Saved drum landing, actual glyph mapping and manual fallback; motor interruption only under approved safe procedure. |
| H03 | Real Tower | DEC-765 | Ten drops at each of 12/11/10 seals; record inserted/held/released. Does not replace H01. |
| P01 | Human play | After faithful mechanics | Observe battle duration, guarding, low-HP avoidance, event repetition, gold economy and confirmation burden; no desk balance verdict. |

### Practical sequence

1. Preserve baseline and references.
2. Resolve D1–D3 and prepare unambiguous F1/F2 edits in parallel.
3. Synchronize diagrams and record each change against IDs; add deterministic tests with approved expected outcomes.
4. Resolve schedule, ledger and relocation fixtures before encoding their behavior.
5. Inspect/run current implementation and fault-injection tests.
6. Run supervised Tower mapping, restore and retention checks; no automatic motor retries.
7. Only then rerun faithful relevant simulations and human sessions. Release acceptance is a separate decision.

## 9. Corrections, withdrawals and consolidation decisions

- LC-05 withdrawn as an unresolved Dracula-order question: DEC-886/D-04 already decide it. Retain story-specific conformance test.
- LC-04 downgraded to implementation/hardware verification: DEC-675 already guarantees exact node/no replay and intentionally omits extra lower-loop checks.
- TP-04 is a conditional physical risk, not observed hardware failure.
- LC-01 is a verified textual inconsistency; no specific global immediate-loss dispatcher was already approved.
- CB-05 concerns live-pile mutation, not a false requirement that the boss stay at eight cards.
- BE-01 stock depletion may already be implicit/implemented; cancellation branch remains drawing debt, not proof of duplicate issuance.
- BE-03 base payout is settled; derived glyph wording needs explicit alignment.
- QD-05 must not inherit plain-scene HP floor or assume double corruption.
- CB-02/TP-03 are P-003 decisions awaiting propagation, not newly discovered rules.
- EE-01 absorbs Uncertain turn-ending. LC-01 absorbs battle-trait skull loss. LC-04 owns physical-action interruption. TP-04 remains distinct restore feasibility.
- Weak plus Turquoise Urn capacity, hidden-curse third-corruption prevention, shop survival after accused NPC departure, fallback attribute order, early lieutenant completion and plain-scene failure effect suppression were resolved candidates, not defects.

## 10. Residual scenario backlog — not silently discarded

The register is a candidate set, not the complete list of all questions raised. These remain triage/coverage items without inventing additional verified-defect counts:

### Events and encounters
- Skulled-building probabilities.
- Fully specified two-cost hazards.
- Same-turn Cleanse re-entry.
- Nested battle-end hooks inside events.

### Combat
- Fully softened cards versus independent foe abilities.
- Stacking guard, multipliers and trait effects.
- Persistent damaged foe count after group-size/level changes.
- Siren’s Song availability/presentation timing.

### Economy and inventory
- General item-transfer permission, timing and reach.
- Finite physical card reservation across shop offers, rewards and held inventory.
- Curse-linked corruption/item cleansing.
- Free-rest-after-fall healing/consumption fixture.

### Quests and dungeons
- Completed marker suppression and reward-once behavior, including early credit.
- Trap cut, halving and softening arithmetic.
- Cleared-room traversal and listening/hint persistence.
- Map connectivity and length-specific generation fixtures.

### Physical state and overrides
- Chapter overlay removing an active/held content entry.
- Actions dependent on unconfirmed physical state.
- No-Tower reachability and story winnability; reference completeness is not proof of reachability.
- Partial authorized motor movement and observed-versus-saved position reconciliation.

## 11. Audit limits and completion statement

All 30 original registered IDs are included with their latest dispositions. This document compiles the completed source-targeted consolidation, not another independent revalidation. Earlier generated files were reconstructed from conversation; reproductions and corrections are retained here rather than reduced to titles.

No full application/code review, executable linter test, new seeded game simulation, real-Tower test or human session was performed. Sources are the fixed uploaded design snapshot and the audit conversation. Existing probe results were reviewed as reported evidence, not rerun. A question without a found resolution is not automatically a defect.

The bounded discovery/consolidation round is complete. Exhaustive game correctness, implementation conformance, physical reliability, balance, fun and release readiness remain unproven. Next work is the prioritized decision/fix/verification queue above—not another undirected broad audit.