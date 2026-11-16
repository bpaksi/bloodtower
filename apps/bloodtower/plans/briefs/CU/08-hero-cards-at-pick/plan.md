Keep this a checklist; do not write a second design doc.

# Brief: CU / 08-hero-cards-at-pick — The Story board shows hero cards during Pick

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (step 55, #481)
- Feature: 08-hero-cards-at-pick
- Kind: screen
- Owner: Gamewright (brief, evals); a Wright developer (build); Illusionist replaces the mockup
- Related AREA/docs: PT-15 in [the playtest](../../../../../../research/game-design/playtests/2026-11-12-paper-playtest-v1-v1.2.md); [design-freeze.md](../../../catchup/design-freeze.md) section H; SCR-010, DEC-232, DEC-098, DEC-201 (AREA-049, AREA-075); C2 feature 05
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: ./mockup.html (a Gamewright draft for the Illusionist to replace)
- Risk: Low
- Depends on: its approval.md on main; step 43 (#469) PT-15 DEC; step 45 Copy table
- Touches: `apps/bloodtower/src/web/components/board/StartupBoard.tsx` (ClaimPanel), `apps/bloodtower/src/web/components/board/HeroCard.tsx` (new), `apps/bloodtower/src/web/components/board/board.css`, `apps/bloodtower/src/protocols/v2/common.ts` and `views.ts` (public hero card fields), `apps/bloodtower/src/engine/loops/session/view.ts` (fills them from the pack and tuning), `apps/bloodtower/src/web/components/board/CoreStoryBoard.test.ts`, `apps/bloodtower/src/e2e/tests/w4-party.spec.ts`; Touches amended 2026-11-15 (Bob, chat): also `apps/bloodtower/src/engine/loops/session/pack.ts` (optional `card` on each `ShellStory` hero), `apps/bloodtower/src/server/core/loadStories.ts` (fills it from the pack and tuning), `apps/bloodtower/src/engine/views/state.ts` and `apps/bloodtower/src/engine/views/project.ts` (carry it to the board payload only), and new `*.test.ts` files beside them
- Builds: PT-15 (board cards only)
- Deps change: no
- Runs: cloud

## What it does

During Pick (screen `claim-heroes`) the Story board's pool shows one card per hero: portrait, class, fight number, hit points and one line from the hero. A seated hero's card greys out (DEC-098). Art stays on the board (DEC-201): the iPad shows no portraits and no new words. The iPad words are unchanged: "Pick Hero A", "N of N picked", "Who this iPad speaks for at the table" (DEC-232).

What main does today: `ClaimPanel` in `StartupBoard.tsx` draws a roster of `PortraitCard` (initial or image, name) with "Picked" or "Open"; no class, fight number, hit points or line. The pack holds `role`, `might` ... `ability`, `portrait` per hero (`packs/base/pack.yaml`) and `packs/base/tuning.yaml` holds `fight` and `hit_points` per role. The public hero view carries only id, name and held.

The Illusionist's `mockup.html` replaces the Gamewright draft before Bob approves.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - Held heroes stay greyed from the restored game, and the iPad words stay exactly as locked.
  - No card data reaches an iPad (DEC-201); the Menu and any gear panel come back closed, the toolbar on every iPad.
  - Pick stays by iPad press only: the cards are display only (DEC-278).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-12 all pass (verifier table on PR).
- Not required: a per-iPad cap on picks; the line "Another iPad is waiting for a hero" (not built in 1.0, decided below); Look up content (PT-16).

## AREA / DEC checklist

- [ ] PT-15 ruling recorded as a DEC by step 43 (#469); closed before coding. The DEC says "Another iPad is waiting for a hero" is not built in 1.0.
- [ ] SCR-010: closed before coding (`decided`).
- [ ] DEC-232: closed before coding (`decided`); copy untouched.
- [ ] DEC-098: closed before coding (`decided`).
- [ ] DEC-201: closed before coding (`decided`).

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-15 (step 45, #471); rows 7 and 7a–7l updated the same day for DEC-936. Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `pick.button` | Pick Hero A | locked: DEC-232 (Bob 2026-10-25); unchanged, iPad |
| 2 | `pick.count` | N of N picked | locked: DEC-232; unchanged |
| 3 | `pick.help` | Who this iPad speaks for at the table | locked: DEC-232; unchanged |
| 4 | `card.class` | fighter: Fighter; healer: Healer; magic-user: Magic-user; scout: Scout; ranger: Ranger; bard: Bard | new - Loremaster; Scholar dropped (DEC-378, DEC-936: the Bard replaces the Scholar). One word per 1.0 class. Capital first letter only; the hyphen in Magic-user is kept as in the mockup. A pack follow-up (DEC-936) still has to change `role: scholar` to `bard` |
| 5 | `card.fight` | Fight {N} | new - Loremaster. The fight number from `tuning.yaml` (`fight`) |
| 6 | `card.hp` | Hit points {N} | new - Loremaster. The hit points from `tuning.yaml` (`hit_points`); "hit points" is the game's word everywhere |
| 6a | `card.unavailable` | unavailable | screen-spec States ("A field not known reads unavailable, never 0"); used after the label, for example "Fight unavailable" |
| 7 | `card.line` | fighter: Shield Wall, Weapon Master; healer: Lightning, Mend; magic-user: Magic Missile, Fireball; scout: Shadow, Slip Past; ranger: Beast Hunter, Pathfinder; bard: Silver Tongue, Rally | DEC-936 and DEC-380. The card shows that class's two intrinsic virtues, in DEC-380 order. The pack's `ability` field holds these two names (Bob's 2026-11-14 choice stands: the line is still the pack field). The C1 placeholders Duel, Heal, Glyph, Disarm, Track and Lore, and any `card.ability.<word>` ids for them, are dropped and have no lines. A pack follow-up (Wright) writes the new `ability` values |
| 7a | `card.virtue.shield-wall` | Shield Wall. Takes the foe's hit for the party, at reduced damage. | new - Loremaster (DEC-936, DEC-380, DEC-319). Fighter guard. 66 characters. DEC-556 sets the reduced hit (a seeded quarter to half, at least 1) |
| 7b | `card.virtue.weapon-master` | Weapon Master. +1 against a Melee foe. | new - Loremaster (DEC-936, DEC-380, DEC-545, DEC-324). Fighter Advantage; +1 strength on a Melee match. 38 characters |
| 7c | `card.virtue.lightning` | Lightning. A holy strike that cuts the foe 4, once a battle. | new - Loremaster (DEC-936, DEC-379, DEC-545, DEC-801). Healer spell. A dungeon counts as one battle (DEC-122). 60 characters |
| 7d | `card.virtue.mend` | Mend. Heals 3 hit points to each hero in the group, once a day. | new - Loremaster (DEC-936, DEC-380, DEC-545). Healer perk; never above full (DEC-545, in the source note so the line stays under 80). 63 characters |
| 7e | `card.virtue.magic-missile` | Magic Missile. Cuts the foe 2 every round. | new - Loremaster (DEC-936, DEC-379, DEC-545). Magic user's unlimited spell. 42 characters |
| 7f | `card.virtue.fireball` | Fireball. Cuts the foe 4, once a battle. | new - Loremaster (DEC-936, DEC-379, DEC-545, DEC-801). Magic user spell. 40 characters |
| 7g | `card.virtue.shadow` | Shadow. +1 against a Stealth foe. | new - Loremaster (DEC-936, DEC-380, DEC-545, DEC-324). Scout Advantage; +1 strength on a Stealth match. 33 characters |
| 7h | `card.virtue.slip-past` | Slip Past. Once a quest, skips one trap or one room's cost. | new - Loremaster (DEC-936, DEC-380, DEC-545). Scout perk. 59 characters |
| 7i | `card.virtue.beast-hunter` | Beast Hunter. +1 against a Beast foe. | new - Loremaster (DEC-936, DEC-380, DEC-545, DEC-324). Ranger Advantage; +1 strength on a Beast match. 37 characters |
| 7j | `card.virtue.pathfinder` | Pathfinder. +1 to the move roll in the wild. | new - Loremaster (DEC-936, DEC-380, DEC-545, DEC-102). Ranger perk. 44 characters |
| 7k | `card.virtue.silver-tongue` | Silver Tongue. A quarter off gold prices the group pays at a building. | new - Loremaster (DEC-936, DEC-681, DEC-545). Bard perk. 1.0 reach is every gold building price, rounded down, at least 1 off (DEC-681); village and bazaar wording returns in 1.1. 70 characters |
| 7l | `card.virtue.rally` | Rally. +1 Wild in battle, which matches any foe. | new - Loremaster (DEC-936, DEC-380, DEC-545, DEC-068). Bard Advantage. Wild counts as any trait (DEC-068). 48 characters |
| 8 | `card.state.seated` | Picked / Open | kept from main, not reworded: decided: Bob, 2026-11-14, adopted. "Picked" greys the card of a seated hero; "Open" is the free pool |

## Decided (was OPEN)

- "One virtue line" is still the pack's `ability` field (Bob, 2026-11-14, adopted). DEC-936: that field holds the class's two intrinsic virtues from DEC-380, and rows 7a–7l give one plain line per virtue name. The C1 ability words are dropped.
- "Another iPad is waiting for a hero" is NOT built in 1.0 (design-freeze section H omits it); step 43's DEC says so. Bob, 2026-11-14, adopted.
- The card words "Picked" and "Open" stay; Loremaster kept both words in step 45 (Copy row 8). Bob, 2026-11-14, adopted.

## Eval approval

- See ./approval.md (must be filled before coding).
