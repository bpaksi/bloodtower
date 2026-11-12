# C3-08 gate correction — docs only

- Audited main: `275ddf66c57d43ff00917bae33d5a47aa7479e9a`. All source line references below are at that commit; repo-root paths unless stated otherwise.
- Preserve `eval.md` EV-01–EV-10 byte-for-byte, its approved amounts, the nine-card C3 draw and all existing encounter hooks. `approval.md` is unchanged; no fresh product approval is claimed.
- Basis: Wright's Nov 8 relay cites Bob's verified Nov 1 rule: small tweaks to a plan whose mockups/evals were approved need no new review. This note records that relay, not an independently found Nov 1 repository approval. The existing approval records Bob's Oct 31 eval/merge approval (`approval.md:3–8`); this engine feature has no mockup.
- Mechanical additions below are **PROPOSED / UNRESOLVED** as the exact implementation Touches contract. They repair already-approved EV-01/05 only; they do not authorize a new give action, old-save migration, pricing changes or other semantics. Wright can apply the small-tweak basis to this bounded repair, not to the unresolved choices below.

## Proposed Touches repair (bounded, no implementation in this change)

Keep the existing `src/engine/rules/corruption/**` and `src/engine/loops/{day,group-turn,encounter}/**` hook-only scope under `apps/bloodtower/`. Add only:

| Proposed repo-root path | Why already-approved acceptance needs it |
| --- | --- |
| `packs/base/tuning.yaml` | EV-05: gold block at lines 115–122 has none of the five corruption amounts. The changed-Cruel-copy check needs a real key, not a local constant. |
| `apps/bloodtower/src/protocols/pack-v2/base.ts` | EV-05: strict gold object at lines 313–339 needs to admit/validate the proposed keys; `Tuning` is inferred at line 413. No unrelated protocol change. |
| `apps/bloodtower/src/server/pack/tuning.test.ts` | EV-05: typed expected tuning at lines 91–116 and equality at 150–158; copied-file loader test seam at 118–147 / 161–178. Preserve the approved 2/2/2/1/+2 values; exercise Cruel=3 only in the test copy. |
| `apps/bloodtower/src/engine/loops/quest/quest.ts` | EV-01: `pickHero` directly increments a count at 195–217, then unconditionally calls `runEffects` at 225; effects and reward completion are at 94–125. Corruption award/terminal-stop hook must be at the origin, not merely at the next day/turn boundary. |
| `apps/bloodtower/src/engine/loops/quest/quest.test.ts` | EV-01 regression at the existing quest test surface: third-corruption scene cost must not run subsequent effects/reward; no new acceptance rule. |
| `apps/bloodtower/src/engine/loops/scene/scene.ts` | Bounded scene-cost hook/type seam only if required by the quest integration. Lines 1–10 show this is data/lint, not the award implementation. Do not invent a new scene loop or change scene semantics just to use this allowance. Actual mutation remains in quest.ts. |

- Minimal certain source changes for the two audit defects: tuning YAML, strict tuning schema, tuning loader tests, quest award hook and its regression test. `scene.ts` is a conditional seam, not evidence of a second mutation site. No blanket `quest/**`, `scene/**`, server, protocol or game-loop allowance.
- `apps/bloodtower/src/server/pack/v2/load.ts:325–335,351–355` already assembles tuning and applies schema validation; lines 61–73 map tuning errors. No loader implementation edit is demonstrated necessary. Loader-test file above is the required test addition, not permission to rewrite the loader.
- Existing encounter paths stay: `loops/encounter/picks.ts:219–255` menu / Cleanse seam (EV-04), `275–339` application/price/after-pick seam (EV-02/05), `301–308` cure count seam; `loops/encounter/loop.ts:47–54` enters the quest. Existing turn/day hooks stay for end-turn effects and terminal propagation.
- Read-only supporting trace: `loops/day/roll.ts:14–19` already uses max corruption and adds helping virtues (EV-03 / DEC-684); `loops/day/clock.ts:5–8,104–120` stores only count and helping-virtue numbers (EV-06/09/10 need named-ID storage in the existing corruption/day scope). These are not new Touches expansions.
- Passing lint is not approval to build. EV-07 and compatibility/semantic questions below remain unresolved; do not claim this note makes the full gate green.

## Proposed tuning key names (amounts unchanged)

Under `gold` in the existing base tuning file, propose a nested `corruption` object with positive integer magnitudes:

| Proposed key | Value | Existing approval |
| --- | --- | --- |
| `gold.corruption.cruel_loss` | `2` | Q-C3-16; DEC-470 trigger |
| `gold.corruption.greedy_loss` | `2` | Q-C3-16; DEC-471 trigger |
| `gold.corruption.feral_loss` | `2` | Q-C3-16; DEC-472 trigger |
| `gold.corruption.lost_loss` | `1` | Q-C3-16; DEC-473 trigger |
| `gold.corruption.tempted_buy_extra` | `2` | Q-C3-16; DEC-477 trigger |

- Names/layout are proposals, not existing keys. Loss magnitudes mean subtract; surcharge means add. Never change the amounts or use the test-copy 3 as a shipped value.
- Numbers source: `apps/bloodtower/plans/C3-ruined-keep.md:307,326–327` and this feature's approved Q-C3-15/16; gold-loss cards explicitly left amounts to the numbers pass. `AREA-099.md:4` is still open; that does not reopen the approved feature amounts.
- EV-05's original test remains unchanged: Cruel=3 in a copied tuning file must yield −3. These names make it addressable; they add no eval.
- **RULED (DEC-895):** the five keys are required in the base tuning file, with no defaults; a missing key fails pack lint. Was unresolved: required keys versus defaults for old tuning files/saved games is not ruled by Q-C3-16. Do not silently choose fallback, re-seeding or migration behavior. Owner: Wright → Warden.

## Seventeen checklist dispositions and source authority

- The 17 checked entries in `plan.md` mean the underlying ruling is evidenced or its delivery is explicitly deferred; they do **not** assert implementation/evals pass.
- 15 ruling closures: MEC-080; DEC-019, DEC-468, DEC-470–477, DEC-676, DEC-684, DEC-718, DEC-043. Each entry links the actual card and states line evidence. DEC-476's ruling is settled but the EV-07 conflict below is not.
- 2 delivery deferrals: DEC-466 / Cursed to C4 (owner Wright; C3 EV-08 exclusion retained), DEC-170 / sanctuary cure to feature 06 (owner Wright; held pricing below). DEC-718 closes the 1.1 exclusion of DEC-467/469, not their later implementation.
- AREA-097 is decided (`research/game-design/cards/AREA-097.md:10–12`). AREA-099 remains open (`AREA-099.md:4,10`); no wholesale area closure.
- DEC-684's old body says proposal, but the acceptance at lines 22 and frontmatter `decided` settle it. DEC-552's accepted one-rise cap (lines 15–22) refines DEC-170; it supplies no approved higher amount.

## RULED 2026-11-12 (Gamewright): the three blocked calls

The three calls that blocked this gate are made. They are cards, not edits to the approved evals: [DEC-894](../../../../../../research/game-design/cards/DEC-894.md) (EV-07 and DEC-544), [DEC-895](../../../../../../research/game-design/cards/DEC-895.md) (old saves and tuning keys) and [DEC-896](../../../../../../research/game-design/cards/DEC-896.md) (several holders, Tempted and the free cure). EV-01 to EV-10 stay as approved; EV-11 to EV-13 are added in `eval.md`. Cursed stays out of C3 (Bob, 2026-10-31) and none of the three touches it. With these, C3-08 is unblocked, and C3-13 and C4-05 can unblock behind it. The sections below keep the audit as found; each UNRESOLVED mark now points at its ruling.

## EV-07 give action — NOT FOUND; RULED by DEC-894 (a guard, no give action), not added to Touches

- No hero-to-hero virtue/item give action was found in main's `apps/bloodtower/src` TypeScript surfaces. Search terms: `give`, `transfer`, `trade`, `Selfish`, `selfish`; inspected the quest/encounter owners and group-turn action dispatcher.
- Closest similarly named action is `apps/bloodtower/src/engine/loops/encounter/picks.ts:342–351`, `giveBackTile`: removes a tile from the group's pool, has no recipient, and is **not** EV-07 giving. Tiles are group-keyed at lines 65,204–205,315–320. Do not repurpose this return as a transfer.
- `apps/bloodtower/src/engine/loops/quest/quest.ts:218–223` grants a scene reward item to its picked hero; `loops/quest/store.ts:30–31,77–78` holds per-hero story items. These are award/storage, not existing hero-to-hero giving.
- `apps/bloodtower/src/engine/loops/session/gear.ts:31–40` swaps device holders, not cards. `loops/group-turn/loop.ts:166–215` handles regroup refusals, end-turn, walk, enter and leave, not giving.
- Actual decision conflict: `research/game-design/cards/DEC-476.md:19–21` blocks giving wherever another rule permits it, allows receiving; `DEC-544.md:12–19` explicitly says heroes do not swap virtue tiles, and give-back is the only way to shed one. Approved EV-07 nevertheless asks virtue-tile **and** item giving, and successful receiving.
- **RULED (DEC-894):** no give API in C3; DEC-544 stands; the guard `may this hero give?` lives in `rules/corruption/` and EV-07 runs on a stand-in pass. Was unresolved: whether a real give API is intended in C3, what permits item transfer, and how the approved tile-giving eval is reconciled with DEC-544. No exact existing give-action file can be cited because none was found. Owner: Gamewright → Wright → Warden for decision. Do not invent a path/API, alter EV-07 or treat its approval as a silent repeal of DEC-544. No new give/ownership/UI paths in this repair.

## Other genuinely unresolved semantics / compatibility (not new approval)

- **RULED (DEC-895):** a save from before this feature is refused by Continue (a save-format version bump); no backfill. Was unresolved: pre-feature count-only corruption saves have no named IDs (`loops/day/clock.ts:5–8,104–120`). EV-09/10 require the new named corruptions to survive Continue/restart, but do not decide migration of earlier count-only saves. No reset or random backfill is authorized. Owner: Wright → Warden.
- **RULED (DEC-896):** price order is free cure, base, haggle, Silver Tongue, then Tempted +2 once per buy; gold losses fire per holder from that holder's own part. Was unresolved: multiple holders' same-trigger penalties / Tempted surcharges and Tempted's interaction with Silver Tongue/free cure are not quantified by Q-C3-16 or its single-holder EV-05. DEC-477 says after haggle (`DEC-477.md:20`); that does not itself specify a new discount-order rule for the current building price seam (`loops/encounter/picks.ts:182–192`). Owner: Gamewright → Wright → Warden. Do not broaden EV-05 or choose new prices in this repair.
- Already decided, not reopened: per-hero gold accounting under the pooled display (`DEC-176.md:12`; corruption cards target the holder's part); most-corrupted-hero movement (DEC-684); player chooses a named cure removal (`DEC-465.md:13–18`). Their implementation fit is Wright's issue, not permission for a purse/storage/UI refactor outside Touches.

## HELD — separate second-cure patch (NOT part of C3-08 gate)

- This note does not apply, fold in or approve a second-cure patch. No separately supplied patch artifact was available in this task.
- Main currently contains `CURE_RISEN_GOLD = 15` and the later-paid-cure interpretation at `apps/bloodtower/src/engine/loops/encounter/picks.ts:163–175`. The comment labels 15 local placeholder, not a Bob-approved amount.
- DEC-170 line 13 gives rising prices; DEC-552 lines 15–22 limits this to one rise, without a number. Feature 06 `eval.md:19–23` expects the rising price, but its restart EV-13 at lines 97–102 says the normal 10. Record the tension; do not resolve it in 08.
- Hold proposed higher-tier amount, tuning key, free-first interaction and feature-06 eval reconciliation separately with Wright → Warden. None of the five EV-05 keys above is a cure-tier key. Existing encounter allowance is not permission to slip in this held pricing patch.

## Local verification / publication handoff

- `pnpm brief:lint`: pass. Pins and cross-app imports: pass. `node --test 'scripts/*.test.mjs' '.claude/hooks/*.test.mjs'`: 295 passed, 0 failed.
- `git diff --check`: pass. All plan links resolve; exactly 17 checklist dispositions. `eval.md` and `approval.md` match audited main byte-for-byte. No implementation file changed.
- `pnpm check`: attempted, could not run the suite: `biome: not found` / no local `node_modules`. This is not an all-green full-CI result. App-folder docs are outside the current lite allowlist (`.github/workflows/check.yml:10–19,122–134`), so published CI must run the full suite.
- Local patch handoff: `/workspace/C3-08-gate.patch`; branch `chore/design-session-2026-11-08-c3-08-gate`. No implementation or eval execution is claimed.
