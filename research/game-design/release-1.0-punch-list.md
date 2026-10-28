# Release 1.0 punch list

Drafted by Claude for Bob, 2026-10-28. Design only. Part of AREA-091. It lists what is left before and during the 1.0 build, in priority order. DEC-502 stays the one list of what 1.0 keeps and what waits for 1.1 (DEC-505). This note does not add a second set.

**Where the design stands:** the loop stack is decided (MEC-032 to MEC-039), C1 is built through step 10 (core engine, event log, the Proving Grounds day slice, e2e 27/27), and the 1.0 cut is decided (DEC-502, DEC-508). Under DEC-500 the engine shows a default when data is missing, so numbers can start as placeholders in one tuning file. Only part A has to be done before C2 coding starts. Part B runs alongside C2: a step starts only when the cards it builds are decided.

## A. Before C2 coding starts

1. **Merge the open design PRs** in stack order: #300, #301, #302, #303, #304, #305, #306. Until then `main` shows Q-249, Q-266 and Q-269 as open and has no 1.0 cut.
2. **Settle the Tomb conflict.** DEC-502 puts every dungeon type in 1.1. DEC-486 to DEC-497 design the Tomb as the next build. Either the Tomb comes into 1.0 as its one dungeon (and Q-307, Q-310 to Q-314 join this list), or it is parked.
3. **Q-316 and Q-322: the type attributes.** What Type, Subtype, Class and SubClass mean, and which lists each kind of entry carries. The manifest schema (DEC-503, DEC-504) and every rule that branches on a type (DEC-499) wait on this.
4. **DEC-501: accept or change the fallback order.** It follows item 3.
5. **Virtues that use cut content.** 1.0 keeps the hero virtues, but four of them use decks DEC-502 cuts:
   - Crafty (DEC-395) and Inventive (DEC-397) use potions.
   - Callous (DEC-387) and Lucky (DEC-393) use treasures.

   Each needs a 1.0 version, or leaves the 1.0 pool.
6. **Write the C2 plan against 1.0.** This is the go signal for coding. With it:
   - Record the G-C1 sign-off. The C1 plan's Results do not show it.
   - Remove Long from `packs/dracula/pack.yaml` (DEC-502, DEC-508).
   - Each step lists the cards it builds as `Builds:` (DEC-355, DEC-505).

## B. Alongside C2, before the step that needs them

7. **Battle.** 1.0 keeps the full battle loop, and it has the most open questions:
   - Q-195: each foe type's ability
   - Q-213: the foe card deck
   - Q-201: the foe status step
   - Q-207: a guarded hit
   - Q-203: the foe's last attack on a run
   - Q-271: foe trait effects
   - Q-214: softening steps
   - Q-225: which iPad shows Strike
   - Q-197: the odds read
   - Q-049: battle pay. 1.0 needs only the money; the loot lines wait for 1.1.
8. **The Tower finale.** In 1.0 with no content yet: Q-264 (rooms and levels) and Q-265 (what makes the boss battle special).
9. **Screens.** Q-260 (the screens each loop needs) gates the UI work. It includes approving the 1.0 share of the proposed SCR, UI and CUE cards.
10. **Numbers pass.** Placeholders are fine to start:
    - Q-043: the move roll's shifts
    - Q-258: what difficulty changes
    - Q-022: the starting purse
    - Q-274 and Q-276: virtue limits and amounts
    - Q-288, Q-289, Q-292, Q-294, Q-296: single virtues
    - Q-275: Cleanse
11. **Review the corruption rulings** (DEC-466 to DEC-477), which Claude made for Bob's review. Corruption is in 1.0. The treasure and quest item rulings wait, since treasures are cut.
12. **Old-doc conflicts that touch 1.0** (roadmap step 3). 45 `conflicts` links on 26 cards. `story-engine.md`, `core-mechanics.md` and `sessions.md` still describe mana, attributes, five nights and shops, and a developer reads them.
13. **Two tower tests.** Q-032 (does a dropped skull stay trapped?) and Q-033 (does calibration put each glyph where the library says?) affect the skull loop. Both are hardware checks.
14. **Asset groundwork for A1.** Q-107 (folder layout and ID naming) first, then Q-286 (the job file) and Q-293 (camera moves). The presentation numbers (Q-110, Q-113, Q-115, Q-241, and the battle look in Q-205, Q-219, Q-227, Q-244) stay at defaults until playtest.
15. **Dracula 1.0 content.** Rewrite the pack to 3 chapters and 10 plain set pieces (DEC-508), with its nuggets (Q-166). Not blocked by the engine; needed by the playtest gate.
16. **How a new table learns the game** (Q-259). "Teach through the story" is enough for 1.0.

## C. Cleanup

- **Close Q-030 as answered.** DEC-125 dropped attributes, and the 2026-10-27 hero sessions settled the heroes.
- **Park the questions that are now 1.1:** Q-012, Q-036, Q-221, Q-250 to Q-254 and Q-256, and the Tomb questions if item 2 parks the Tomb. Leaving them open makes the 1.0 work look bigger than it is.

## How this was built

Cards were read from `main` and the six open design branches together. A question answered on one branch and still open on another was checked by hand; only Q-249, Q-266 and Q-269 were found.
