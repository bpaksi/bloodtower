# 1.1 and Dracula: the reconciliation

Claude's desk audit, 2026-11-05, for AREA-115. Bob then moved 1.1 to The Ruined Keep and Dracula to a later drop (DEC-787, DEC-788), so Part 1 is now Dracula's list. It reads the Dracula deck (IDEA-070 to IDEA-162, DEC-739 to DEC-756) against the 1.1 rulings, including the proposals in PR #371 (DEC-757 to DEC-784). It runs both ways. Nothing here is a ruling; the open questions are the Q- cards named below.

## Part 1: what Dracula asks for that the engine does not have

| Gap | Dracula asks for | The engine says | Card |
|---|---|---|---|
| Effects | Move loyalty, take a companion, weaken an item, a hero vanishes, cards on the floor, a skull on a named building, an extra drop, the foe strikes first | A hook may set a flag, open a lead or move a token, and may not ask a choice (DEC-286). A scene option may use a battle, cost, gold, item or flag (DEC-642) | Q-424 |
| Seeded story values | The seed sets his goal, the object sites, the lair picture (IDEA-084, DEC-742) | Only the traitor has a seeded pick (DEC-735). Main quest markers are fixed (MEC-055) | Q-425 |
| The Count's behaviour | Four goals, each with its own target and strike (DEC-748) | One target and one strike (DEC-775). DEC-778 says a landed strike follows DEC-775, which undoes three of Bob's four strikes | Q-426 |
| The castle's shape | The Count takes a hero's place at the basement Swap (DEC-748). The Heart of Sorrow is the top level's stair room (IDEA-098) | The adversary is always in the top level's last room (DEC-566). MEC-076 doesn't say if the top level has a stair room | Q-427 |
| A solo Swap | One hero vanishes and the group fights to get them back (DEC-751) | A solo group has nobody left. No Dracula card mentions solo | Q-427 |
| Lenka | Only his strike can lose her, and she is taken (DEC-746). Her face is hidden until IDEA-090 | A companion can fall in battle, walk out or turn into a foe (DEC-071, DEC-722). Her hero can fall too. A companion speaks through an avatar (DEC-070) | Q-428 |
| The objects | All three open the gate (DEC-749). The goal is "destroy the blade", though a strike only weakens it | Nothing says what happens at full weakening, or to an object when its carrier falls. A story must stay winnable (DEC-062) | Q-429 |
| The traitor | Marta is a suspect, first seen in chapter 4. Clues unmask the traitor (IDEA-130, IDEA-140) | A traitor springs at a chapter's end (DEC-736), and chapter 4 is the finale. Short skips the quests that give clues (DEC-753) | Q-430 |
| Companions | Five story companions, met at their buildings (IDEA-107 to IDEA-111) | RtDT's 10 are defaults (DEC-723), joined by a 20 gold tavern hire (DEC-724, DEC-774). Nothing says if they stay in Dracula. Only IDEA-123 moves loyalty, and DEC-721 expects story moments | Q-431 |

**For the probes and numbers pass, not a ruling yet:** 12 to 14 quests with two Tombs against the 24-skull clock (DEC-686), with Darkness and earth boxes adding skulls. Short's chapter 3 is one quest.

## Part 2: 1.1 features Dracula never uses

Counted by links and words in the deck. The engine rulings can stand; what's missing is a reason for the feature to appear in play.

| Feature | Dracula today | Kind |
|---|---|---|
| Cave, Encampment, Fortress, Ruins, Shrine (MEC-027 to MEC-031) | No quest uses one. "Shrine" appears only as a Tower room | Dracula would never play it |
| Leads (MEC-056), adversary quests (MEC-057) | No card | Dracula would never play it |
| Fence and cursed items (DEC-167, DEC-169) | No card | Dracula would never play it |
| Glyphs and drums (MEC-016, DEC-761, DEC-762) | IDEA-152 reads a seal break as his hold cracking. Nothing on the boon or a reskin | Works by default, needs a line |
| Bazaar shop and haggle die (MEC-023, MEC-074) | DEC-752 buys the kit "at buildings", and the Bazaar is the only shop (DEC-759). No card links them | Works by default, needs a line |
| Nuggets, mood lines, avatars, place paintings, music (MEC-064, MEC-065, MEC-067, MEC-069, MEC-070) | IDEA-112 names nuggets only. Script and assets still follow the old plot (IDEA-153) | Content not yet written |

## Part 3: stale or missing

- **Deliverables:** no SCR, UI, CUE or MEC card carries `release: "1.1"`, and 44 decided 1.1 rulings reach no deliverable.
- **Stale sources:** `dracula-asset-map.md`, `set-piece-counts.md` and `packs/dracula/script.yaml` still follow the old plot.
- **Not yet checked:** a played game. This audit only reads cards, so it can't find what a walk finds. That is what the probes are for.
