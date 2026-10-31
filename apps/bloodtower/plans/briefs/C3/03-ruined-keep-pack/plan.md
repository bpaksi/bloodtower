Keep this a checklist; do not write a second design doc.

# Brief: C3 / 03-ruined-keep-pack — The Ruined Keep pack: chapters, quests, scenes and endings as data

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 03-ruined-keep-pack
- Kind: engine (pack)
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099,
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no screen change)
- Risk: Med
- Depends on: C3 feature 01 merged, C3 feature 02 merged, and its `approval.md` on `main`
- Touches: `packs/test/**` (the Proving Grounds pack, DEC-666), `apps/bloodtower/src/server/pack/v2/lint.test.ts`
- Builds: AREA-097
- Deps change: no
- Runs: cloud

## What it does

The pack carries DEC-636's skeleton as DEC-662 words it: three chapters (The Roads, The Keep, The Tower), the six quests with their places and types, the three items (Tomas's Map DEC-672 from The Herald, the Signet DEC-674 from The Barrow, the oath-blade DEC-673 from The Shrine) (Bob approved 2026-10-31), the opening, the two win endings and the loss scenes (DEC-663, DEC-664, DEC-144). Every player-facing line is a `[COPY: ...]` placeholder for the story pass. The Barrow (a Tomb, MEC-026) and the Tower finale (MEC-076) are declared but their games are C4 and C5.

## Cutover

Cutover: Y

- `packs/test` stops being the AREA-077 day slice (DEC-660: v1.0 itself becomes The Ruined Keep). Its tagline and `title` change to The Ruined Keep (DEC-665, DEC-666).

## Survival invariants

- Continue, restore, and restart must keep:
  - The pack ID and folder stay `test`/Proving Grounds, so autosaves keyed by pack ID still match (DEC-666). A pre-C3 autosave is still dropped by feature 01's rule (kept and ignored, logged `save skipped: pre-C3 format`; Bob approved 2026-10-31).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-08 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] AREA-097: closed before coding (`decided`).
- [ ] DEC-636: closed before coding (`decided`).
- [ ] DEC-659: closed before coding (`decided`).
- [ ] DEC-660: closed before coding (`decided`).
- [ ] DEC-661: closed before coding (`decided`).
- [ ] DEC-662: closed before coding (`decided`).
- [ ] DEC-663: closed before coding (`decided`).
- [ ] DEC-664: closed before coding (`decided`).
- [ ] DEC-665: closed before coding (`decided`).
- [ ] DEC-666: closed before coding (`decided`).
- [ ] DEC-667: closed before coding (`decided`).
- [ ] DEC-672: closed before coding (`decided`).
- [ ] DEC-673: closed before coding (`decided`).
- [ ] DEC-674: closed before coding (`decided`).
- [ ] DEC-692: closed before coding (`decided`).
- [ ] DEC-693: closed before coding (`decided`).
- [ ] DEC-697: closed before coding (`decided`).

## OPEN questions

- ANSWERED Q-C3-09 (Bob approved 2026-10-31): keep `pack_id` `test`; Proving Grounds is only the old name. Was: DEC-666 says the pack ID is Proving Grounds, but the folder's `pack_id` is `test`. Rename to `proving-grounds`, or keep `test`?
- ANSWERED Q-C3-10 (Bob approved 2026-10-31): P-003's spaces: The Ambush in Muted Forest, The Lock in Howling Desert, The Last Stand in The Grass Sea. Was: which spaces hold The Ambush ("a wild space"), The Lock and The Last Stand? DEC-662 names the kingdom only; P-003 used Muted Forest, Howling Desert and The Grass Sea. Are the probe's spaces the ruling?
- ANSWERED Q-C3-22 (Bob approved 2026-10-31): 10 gold; a short group pays all its gold plus 2 HP per present hero, never below 1 HP, and the quest finishes. Was: with Fight hidden, The Ambush finishes only by paying the toll (DEC-662). The toll amount is not carded, and a group that cannot pay cannot win chapter 1. What is the toll, and what happens when the purse is short?
- ANSWERED Q-C3-11 (Bob approved 2026-10-31): the random level-3 foe DEC-647 draws. Was: The Last Stand's foe: DEC-647 draws a random level-3 foe. Is that the intent, or does the story name the oathsworn guard?

## Eval approval

- See ./approval.md (must be filled before coding).
