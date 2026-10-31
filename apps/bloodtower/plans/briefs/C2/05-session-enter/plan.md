Keep this a checklist; do not write a second design doc.

# Brief: C2 / 05-session-enter — Session Enter: the join, base board setup, and Connect Tower or Play without Tower

## Meta

- Plan: C2 ([plan](../../../C2-session-shell.md), feature 05). AREA-100 scene 1. G-C1 note GC1-05.
- Feature: 05-session-enter
- Owner: Claude (brief). A Wright developer builds it.
- Related AREA/docs: MEC-039 Enter (.1 to .12 and .20 to .25), DEC-273, DEC-274, DEC-152, DEC-275, DEC-104, DEC-278, SCR-022, SCR-005, SCR-006, UI-010, CUE-011; audit: `engine/loops/session` rework, `server/tower/volumeTest.ts` and `web/lib/volumeTest.ts` not wired
- Evals: ./eval.md
- Mockup: ./mockup.html
- Risk: High (session state, tower)
- Touches: `apps/bloodtower/src/engine/loops/{session,game}/**`, `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/protocols/v2/**`, `apps/bloodtower/src/server/{hub,core,tower}/**`, `apps/bloodtower/src/web/components/board/{StartupBoard,CoreStoryBoard}.tsx`, `apps/bloodtower/src/web/components/board/board.css`, `apps/bloodtower/src/web/components/device/CoreDeviceScreen.tsx`, `apps/bloodtower/src/web/lib/{startupBoard,volumeTest}.ts` and their tests, `packs/test/pack.yaml`, `apps/bloodtower/src/e2e/tests/**`, `apps/bloodtower/spec.md` (§3 v2)
- Size: may pass 400 lines. If review finds it too large, it splits into "engine and views" and "screens and e2e" before round 2.

## Cutover

Cutover: Y

- The splash's iPad pair, "Continue" and "Connect Tower", goes. The splash is app startup (DEC-273); the session starts at the join QR.
- The `tower-connect` screen leaves the game loop's setup. The tower block runs once, in the session's Enter, before the first Pick story.
- The `lay-out-board` setup step leaves `packs/test`. Base board setup (SCR-022) replaces it in the session's Enter. `place-heroes` stays a pack step.
- The setup screen id `tower-connect` is replaced by session screens (see eval EV-02). e2e specs that drove the old path are updated in this PR.

## Survival invariants

- Continue, restore, and restart must keep:
  - An autosave from before this feature still loads (its checkpoint has no session Enter state).
  - A restarted host mid-Enter starts the Enter again from the join; it never sends a tower command on restart.
  - Whether this session is playing with or without the tower. After the Enter has finished, on a host restart the session resumes with tonight's tower choice and no Enter (no tower question) (Bob 2026-10-31; EV-13).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-20 all pass (verifier table on PR).
- Not required: MEC-039 .13 to .19 (glyphs and facing). They wait for feature 10 and Bob's ruling; feature 12 adds them between calibrate and volume. Pick Game stays until feature 06.

## AREA / DEC checklist

- [ ] MEC-039: closed before coding (`decided`). Enter nodes .1 to .12 and .20 to .25 as written; .13 to .19 left out (DEC-103 placeholder).
- [ ] DEC-274: closed before coding (`decided`). The join QR stays open until every hero is claimed; the session waits only for the first iPad.
- [ ] DEC-152: closed before coding (`decided`). Tower and base board once per session.
- [ ] DEC-275: closed before coding (`decided`). One prompt: Connect Tower, or Play without Tower.
- [ ] SCR-022: closed before coding (`decided`; the card says "Not designed yet" for the step list). The three steps in eval EV-03 are the approved mockup wording (resolved; Assumptions in eval.md).
- [ ] SCR-006: closed before coding (`decided`). Dungeon Complete (#58) at volume 0, 1 and 2, each only after a press; Keep or try another.
- [ ] DEC-104: closed before coding (`decided`). The board goes down before the tower block.

## Mockup alignment (Bob 2026-10-31: the approved mockup wins)

- Base board setup steps: "Set the tower on the board." / "Lay out the board, kingdom edges matched." / "Sort the pieces: heroes, foes, skulls."
- Tower question: "Wake the tower, or play tonight without it?"
- Join QR shrinks to a corner QR from the first join (supersedes "large until every hero is claimed").
- Volume buttons "Volume 0/1/2"; Keep and Try another show with them.
- Connect failure status reads "Tower not found" (tower wording ruling).
- Restart after the Enter keeps tonight's tower choice (Bob ruling, C-3).

## Sound first on Pick story (Bob 2026-10-31 10:30 AM ET)

Bob: "Some browsers will block volume? if so then we need to prompt user on the story page to enable set volume levels. This will be the first thing to happen; enable sound, set levels."
- The first step on Pick story is an "Enable sound" prompt on each iPad: one tap unlocks that iPad's browser audio (resume the Web Audio context and play inside the tap's handler). No sound plays on that iPad before its tap.
- Locked copy (Bob 2026-10-31 10:33 ET): state 7a shows only the prompt "Tap once to turn on this iPad's sound." and one button "Enable sound", plus the chrome (bottom toolbar: "?" at the left, Menu gear at the right; feature 04); nothing else.
- During 7a the Story board shows the Pick story backdrop with no volume line; "How loud should the tower be? Press one to hear it." shows only from 7b on (Gamewright design, parent-approved 2026-10-31; EV-14, EV-10).
- Each iPad needs its own unlock; one iPad's tap never unlocks another.
- Then the player sets levels: the volume step (Volume 0/1/2, Keep, Try another; SCR-006) shows on that iPad right after its unlock, and the story list follows Keep. The volume step leaves the Enter and runs here; on the connect track a volume press also plays Dungeon Complete on the tower (still only on a press).
- Keep stays disabled until a volume has been played (no default volume is kept; this settles EV-09's "Also" line).

## Eval approval

- See ./approval.md (must be filled before coding).
