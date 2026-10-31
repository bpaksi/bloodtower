# C5 — Finale and polish: the Tower, The Warden, the art and the 1.0 gate (build plan)

**Status:** draft for Bob, 2026-10-31. Gamewright plans only and writes no code. Not yet at G0.
**Source:** [1.0-milestones.md](1.0-milestones.md) (C5 row), [C4-battle-tomb.md](C4-battle-tomb.md), [A1-asset-adapter.md](A1-asset-adapter.md), the Tower (MEC-076, DEC-566, DEC-567, DEC-356, DEC-360), the ending (DEC-663, DEC-664), DEC-355 (deliverable cards) and DEC-696 (the 1.0 gap list).
**Goal:** the rest of 1.0: the Tower finale, The Warden and the last choice with its two endings, the art through A1, the tuning pass, then the 1.0 gate.
**Exit condition:** every feature's eval table is all-pass, and Bob signs off at G-1.0: the 1.0 playtest, and `pnpm graph gaps` shows no 1.0 gap (1.0-milestones.md).

## Who does what

As in C3 and C4. Folders are `plans/briefs/C5/NN-<feature>/`.

## Scope and why

1.0-milestones.md defines C5 as "the Tower finale (MEC-076), the art through the asset adapter (A1), the tuning pass, then the 1.0 gate". DEC-355 makes deliverable cards the build list and DEC-696 makes the 1.0 section of `pnpm graph gaps` the to-do list, so C5 ends on that list being empty (feature 10). The Tower has no screen cards yet: Q-C5-01 proposes reusing the Tomb's (DEC-583) and filing them.

## Viewports and screen rules

- Viewports: Story board 1920×1080 (Samsung TV); iPad 768×1024, portrait, locked by Bob.
- iPad bottom toolbar on every iPad screen: **?** (help) at the left, the **gear** at the right. Help text is `[COPY: help, <screen>]`.
- Gear panels display on the Story board; their picks are made on the iPad. The gear never opens a panel on the iPad alone.
- No Next-only screens: every iPad screen carries a real choice, or the board advances on its own after its beat. A lone "Next" button is a failed build.
- The board is display only and never scrolls or clips (SCR-013); every story line shows on the board (SCR-014, DEC-057). One primary button per step (SCR-016).
- All story and help text is `[COPY: ...]` until the story pass.

## Out of scope

- Everything tagged `release: "1.1"` (DEC-696): the five other dungeons, NPCs, shops, gear (DEC-502), music and the false death (DEC-567), DEC-467 and DEC-469.
- Dracula (DEC-691), Goodbye (DEC-628).

## Features

| # | Feature | Kind | Depends on | Screen spec |
|---|---|---|---|---|
| 01 | [The Tower: three levels, dealt rooms, stair guards, retreat keeps progress](briefs/C5/01-tower-loop/plan.md) | engine | C4 02, C4 03, C4 06 | no |
| 02 | [The Warden: his own deck and three phases](briefs/C5/02-boss-battle/plan.md) | engine | 01 | no |
| 03 | [The last choice: break the seal or swear the oath](briefs/C5/03-finale-choice/plan.md) | engine | 02, C3 07 | no |
| 04 | [The real end: the Tower won ends the game; the C4 end rule goes](briefs/C5/04-game-end-finale/plan.md) | engine | 01, 03, C4 08 | no |
| 05 | [The Ruined Keep's art and voice through the A1 adapter](briefs/C5/05-art-through-a1/plan.md) | pack | A1 plan merged, C4 09, C4 12 | no |
| 06 | [The tuning pass: placeholder numbers become 1.0 numbers](briefs/C5/06-tuning-pass/plan.md) | engine | 04 | no |
| 07 | [The Tower on screen: level map, room view, the iPad's doors](briefs/C5/07-tower-screens/plan.md) | screen | 01, C4 12 | yes |
| 08 | [The Warden on screen: phases and the tower show](briefs/C5/08-boss-screen/plan.md) | screen | 02, C4 09 | yes |
| 09 | [The last choice and the two endings on screen](briefs/C5/09-finale-and-endings/plan.md) | screen | 03, 04, C3 16 | yes |
| 10 | [The 1.0 gate: gaps zero and the 1.0 playtest](briefs/C5/10-g-1-0-gate/plan.md) | process | 01 to 09 | no |

### Feature 01: The Tower: three levels, dealt rooms, stair guards, retreat keeps progress
- Folder: [briefs/C5/01-tower-loop](briefs/C5/01-tower-loop/plan.md)
- Kind: engine
- Depends on: C4 02, C4 03, C4 06, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/tower/**` (new level), `packs/test/**` (the Tower unlock)
- Builds: MEC-076, DEC-566, DEC-363, DEC-360, DEC-356, DEC-645, DEC-702
- Done-when: EV-01 … EV-11
- Open: Q-C5-11, Q-C5-04

### Feature 02: The Warden: his own deck and three phases
- Folder: [briefs/C5/02-boss-battle](briefs/C5/02-boss-battle/plan.md)
- Kind: engine
- Depends on: 01, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/rules/battle/boss.ts` (new), `packs/test/**` (The Warden)
- Builds: DEC-567, DEC-361, DEC-549
- Done-when: EV-01 … EV-08
- Open: Q-C5-02

### Feature 03: The last choice: break the seal or swear the oath
- Folder: [briefs/C5/03-finale-choice](briefs/C5/03-finale-choice/plan.md)
- Kind: engine
- Depends on: 02, C3 07, and its `approval.md` on `main`
- Touches: `packs/test/**` (the end-hook scene), `apps/bloodtower/src/engine/loops/scene/vote.ts` (new)
- Builds: DEC-663, DEC-664
- Done-when: EV-01 … EV-04
- Open: Q-C5-03

### Feature 04: The real end: the Tower won ends the game; the C4 end rule goes
- Folder: [briefs/C5/04-game-end-finale](briefs/C5/04-game-end-finale/plan.md)
- Kind: engine
- Depends on: 01, 03, C4 08, and its `approval.md` on `main`
- Touches: `packs/base/tuning.yaml`, `apps/bloodtower/src/engine/loops/game/**`
- Builds: MEC-032, DEC-144, DEC-356
- Done-when: EV-01 … EV-05
- Open: none

### Feature 05: The Ruined Keep's art and voice through the A1 adapter
- Folder: [briefs/C5/05-art-through-a1](briefs/C5/05-art-through-a1/plan.md)
- Kind: pack
- Depends on: A1 plan merged, C4 09, C4 12, and its `approval.md` on `main`
- Touches: `packs/test/assets/**`, `packs/test/pack.yaml` (`assets[]`)
- Builds: AREA-097, DEC-593
- Done-when: EV-01 … EV-05
- Open: Q-C5-06, Q-C5-07

### Feature 06: The tuning pass: placeholder numbers become 1.0 numbers
- Folder: [briefs/C5/06-tuning-pass](briefs/C5/06-tuning-pass/plan.md)
- Kind: engine
- Depends on: 04, and its `approval.md` on `main`
- Touches: `packs/base/tuning.yaml`, `apps/bloodtower/src/sim/**` (report only)
- Builds: DEC-500, DEC-131
- Done-when: EV-01 … EV-04
- Open: Q-C5-05

### Feature 07: The Tower on screen: level map, room view, the iPad's doors
- Folder: [briefs/C5/07-tower-screens](briefs/C5/07-tower-screens/plan.md)
- Kind: screen
- Depends on: 01, C4 12, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/Tower*.tsx` (new), `apps/bloodtower/src/web/components/device/TowerPicker.tsx` (new)
- Builds: MEC-076 (screens; UI cards to be filed)
- Done-when: EV-01 … EV-12
- Open: Q-C5-01

### Feature 08: The Warden on screen: phases and the tower show
- Folder: [briefs/C5/08-boss-screen](briefs/C5/08-boss-screen/plan.md)
- Kind: screen
- Depends on: 02, C4 09, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/BossPhase.tsx` (new)
- Builds: DEC-567, DEC-327
- Done-when: EV-01 … EV-15
- Open: Q-C5-02, Q-C5-08

### Feature 09: The last choice and the two endings on screen
- Folder: [briefs/C5/09-finale-and-endings](briefs/C5/09-finale-and-endings/plan.md)
- Kind: screen
- Depends on: 03, 04, C3 16, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/device/Vote.tsx` (new), `apps/bloodtower/src/web/components/board/Outcome*.tsx`
- Builds: DEC-663, DEC-664, SCR-018
- Done-when: EV-01 … EV-14
- Open: Q-C5-03, Q-C5-07, Q-C5-09

### Feature 10: The 1.0 gate: gaps zero and the 1.0 playtest
- Folder: [briefs/C5/10-g-1-0-gate](briefs/C5/10-g-1-0-gate/plan.md)
- Kind: process
- Depends on: 01 to 09, and its `approval.md` on `main`
- Touches: `apps/bloodtower/plans/C5-finale-polish.md` (Results), `research/game-design/release-1.0-punch-list.md`
- Builds: DEC-696
- Done-when: EV-01 … EV-04
- Open: Q-C5-10

## Ownership and shared rules (Sentinel review 2026-10-31)

- C5 09 owns voting (collecting votes, the vote screen, votes surviving Continue); C5 03 owns resolving them (tie re-vote, seeded draw, the flag).
- Help: add these ids to the C2-04 help table: `tower-screens`, `boss-screen`, `finale-and-endings`. The help sheet is on the iPad and sends nothing to the host.
- Auto-advance follows Q-C4-17 (Gamewright pick, pending Bob).
- C5 05: Bob's approval of each final is a ticked line in its approval.md checklist.
- Engine, pack and process features have no screen-spec.md.

## Batches

- G0: Bob approves this plan and the questions list; a design session files the Tower's UI cards (Q-C5-01).
- B1: 01, then 02 and 03.
- B2: 04; 07, 08, 09 once their engine features are in.
- B3: 05 (after A1 is built) beside 06.
- B4: 10.
- G-1.0.

## Risks

- **A1 is approved but not built.** Feature 05 waits on it; if A1 slips, 1.0 ships on drafts (`--drafts`) only with Bob's say.
- **The Tower has no screen cards.** Q-C5-01 must be ruled before 07's mockup.
- **Tuning moves numbers under every eval.** Evals cite tuning keys, not values, where they can.

## Gaps this plan closes (`pnpm graph gaps`, 1.0)

MEC-076, DEC-566, DEC-567, DEC-663, DEC-664, the Tower's screens (to be filed), and every remaining 1.0 gap by feature 10.

## OPEN questions (consolidated)

Every pick below is used in the feature files as "(Gamewright pick, pending Bob)". **[Bob taste call]** marks the ones that are Bob's taste, not a rules call.

- OPEN Q-C5-01 **[Bob taste call]**: The Tower has no screen cards. What does the board show in the Tower (MEC-076)? Options: (a) reuse the Tomb's two halves (DEC-583): the level's room map left, the room view right; Gamewright files UI cards for it in a design session; (b) the room map only, full width. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C5 07)
- OPEN Q-C5-02 **[Bob taste call]**: The Warden's three phases (DEC-567): three paintings or one? Options: (a) three paintings, one per phase; (b) one painting, darkening at each phase. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C5 02, C5 08)
- OPEN Q-C5-03 **[Bob taste call]**: Who makes the last choice in the Tower (DEC-663)? Options: (a) each present hero votes on their iPad; a tie re-votes once, then the seeded draw (DEC-011) breaks it; (b) the hero who struck the last blow chooses; (c) the vote must be unanimous; it repeats until it is. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C5 03, C5 09)
- OPEN Q-C5-04: The Tower's retreat (DEC-360): what does it cost? Options: (a) the same as a battle retreat (C4 feature 03); the rooms stay cleared; (b) nothing beyond the moves spent. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C5 01)
- OPEN Q-C5-05: How is the tuning pass (DEC-500) run? Options: (a) 300 headless simulator games at 2, 3 and 4 heroes, then two table playtests; numbers move only on both; (b) table playtests only. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C5 06)
- OPEN Q-C5-06 **[Bob taste call]**: How is the 1.0 art made through A1? Options: (a) A1 AI mode for drafts, then Bob approves each final in the studio; (b) studio mode only, Bob directing each piece. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C5 05)
- OPEN Q-C5-07 **[Bob taste call]**: Which lines are voiced in 1.0 (DEC-349)? Options: (a) the Loremaster's lines only (chapter cards, seal breaks, the two win lines, the loss); (b) none; all text on Scrolls. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C5 05, C5 09)
- OPEN Q-C5-08: The boss's full tower show (DEC-567, DEC-327) with no tower connected: Options: (a) a board-only show: the painting change, a shake and the sound on the board speakers; (b) skip the show. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C5 08)
- OPEN Q-C5-09 **[Bob taste call]**: After a finale win line, before the outcome scene: Options: (a) nothing extra: the win line, then the outcome scene; (b) a short credits Scroll `[COPY: credits]`. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C5 09)
- OPEN Q-C5-10: What does G-1.0 need? Options: (a) two full table games of The Ruined Keep, one won (either ending) and one lost, with `pnpm graph gaps` empty for 1.0; (b) three games, one per ending and one loss. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C5 10)
- OPEN Q-C5-11: The Tower's guards and traps (DEC-566, DEC-702): fixed or dealt? Options: (a) dealt fresh on the first visit from the seed, then kept; (b) fixed by the story pack. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C5 01)

## Results

- (none yet)
