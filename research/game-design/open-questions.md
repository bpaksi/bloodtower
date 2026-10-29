# Open questions for Bob

**History (DEC-610):** written before the design cards. Where it disagrees with a card, the card wins; known stale lines say "Superseded by". Status: **draft for Bob's review**, 2026-10-14. One deduplicated list from all game-design files, most blocking first. IDs refer to [requirements.md](requirements.md).

Resolved by Bob's Dracula rulings (§0 of requirements): Dracula's structure (5 nights, keys, Tome last), corruption loss and cures, devices for Dracula (private iPad per hunter), tower cues in play (automatic), warriors/spirit (base game). Also resolved by the spike: lights and sounds work before calibration.

1. **First playable: Dracula or fellowship Part 1?** One-shot with 5 nights and rulings in hand, vs. the 3-session saga. Drives the first pack schema, save/carry-over scope and session-length target. (R-ENG-2, R-SES-6)
2. **Multi-device architecture.** Private iPads are now required (R-ENG-16). Who hosts game state: one iPad, the Mac as local server, or a hosted server? Same choice decides cross-device resume and synced stats. (R-ENG-16, R-SES-17, R-STA-8)
3. **How authored vs. procedural?** Scripted clock beats only, or random tower actions/encounters between beats, and how often (one encounter per move, or per 2–3 moves)? (R-ENG-14, R-RE-8, R-FUN-6; [core-mechanics](core-mechanics.md))
4. **How far does a pack reach into code?** Pure data + fixed engine rule modules, or packs ship TypeScript modules (e.g. fellowship riddle)? Authoring freedom vs. engine stability. Related: authored only by us in files, or a future in-app editor? (R-ENG-1, R-ENG-4)
5. **Target session length** (90 min? 2–3 h? Dracula's 5 nights in one sitting?). RtDT runs 100–120 min. Drives clock length, encounter count, big-moment spacing. (R-FUN-3, R-FUN-6)
6. **RtDT rules kept vs. replaced.** RtDT battle/dungeon/Advantage/foe status reskinned, the light D&D checks from core-mechanics, or both? Are encounters resolved by app rolls only, or sometimes the physical haggle die? (R-ASSET-7, R-RE-3)
7. **Shared resource vocabulary?** Do stories share one set (warriors, gold, food from 1981; warriors/spirit from RtDT) or define their own? Does Dracula reuse core mechanics fully? (R-ENG-3, R-ENG-25)
8. **Which expansions do you own** (Alliances, Covenant, Expeditions, Dark Horde)? Also: are Dark Horde minis placed on the board for encounters or kept as screen art? (R-ASSET-9)
9. **Tower audition pass.** OK to spend a session tagging all 113 sounds and 21 light sequences? Needed for the cue library. (R-ASSET-2)
10. **Sourced 1981 research.** Write `research/original-dark-tower/` so the 1981 catalog entries stop being general knowledge? (R-ASSET-12)
11. **Player count and modes.** Fixed 2 sharing a party, or 1–4? Any competitive/traitor mode (Dracula's "vampire's servant")? (R-FUN-8)
12. **Voices.** Gemini TTS is the plan (R-AV-1); confirm, and confirm the fellowship mp3s are reference only (not for release).
13. **Difficulty.** How many levels and what changes (clock, foe status, encounter weight)? (R-FUN-4)
14. **Visual look.** Engine default look (Shadow and Ember was strongest on iPad); does a pack override fully or only theme tokens? (R-ENG-5)
15. **Campaign failure.** Can a lost fellowship part be replayed, or does the saga continue with a setback? (R-SES-5, R-SES-12)
16. **Save model.** How many slots; move saves between devices? (R-SES-10)
17. **Stats.** Keep the raw event log forever? Live stats during play or wrap-up only? Is the fun rating welcome or one tap too many? (R-STA-2, R-SES-14)
18. **Fellowship dragon** as a recurring nemesis across the saga, like the 1981 hoard?
19. **Distribution.** Home use only, or public (IP of RtDT names, foes and art)?
