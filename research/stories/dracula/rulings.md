# Dracula: decided rulings

Status: decided by Bob, 2026-10-14 (via Loremaster). These configure the generic engine; see [requirements](../../game-design/requirements.md).

Bob has made these rulings. They are **Decided** for the Dracula pack.

| ID | Ruling |
|---|---|
| D-DRA-1 | Chapter 1 takes place entirely in one kingdom. After that, one kingdom per night. |
| D-DRA-2 | Finishing all of a kingdom's set pieces earns that kingdom's key. |
| D-DRA-3 | The Tome kingdom is visited last. |
| D-DRA-4 | Night 5 is the tower assault. It needs all three keys. |
| D-DRA-5 | A third corruption loses the game. Every corruption counts (none are skipped or forgiven). |
| D-DRA-6 | Corruption is cured only by holy water, the host, or resting at a Sanctuary. |
| D-DRA-7 | Each hunter has a private iPad. |
| D-DRA-8 | Tower cues fire automatically during play. Connecting and calibrating the tower are still explicit player steps (game-design R-SES-2). |
| D-DRA-9 | Warriors and spirit work as in the base game (RtDT). |

Engine implications (now requirements): multiple devices, one private iPad per player (R-ENG-16, R-SES-17); per-story chapter and night structure (R-ENG-17); key-earning rules (R-ENG-18); automatic tower cues in play (R-ENG-19); corruption and cure rules as pack config (R-ENG-3, R-ENG-4).


## Gamewright mechanics calls (2026-10-14, draft for Bob)
- Losing or retreating from the final battle: the hunters fall back and dawn breaks. Outcome **Taken** (loss: Lenka stays his). If the party retreats, the summary records how close they came.
- Permanent lookalike (objective 2): at most one at a time, and it can be unmasked by holy water or a Sanctuary rest, which ends it.
- Fly-eater's "blood" price: the party chooses. Either one hunter takes 1 corruption (not allowed for a hunter already at 2, because of the instant-loss guard), or the party gives up one story item (holy water, host, or a stake). Story mechanics never touch spirit (Bob's ruling).
- Story skull drops are capped at 2 per night. Before any story drop, if fewer than 6 skulls remain in supply, the drop becomes "+1 foe on night 5" instead (finale ledger).
- Fun fixes: the little gate is quieter but costs 1 extra visit, while the drawbridge is fast but raises the Count's attention. Turning away from the procession ghost grants a clue about the Tome order plus one holy water. Burned earth boxes rotate between 3 clip variants, and the last box gets a unique clip.

## Decided by Bob, 2026-10-14 10:01 ET
- D-DRA-10. Lenka Morosz is already taken by the Count when the game begins. The game is won when the hunters rescue her. This replaces the mid-game snatch. Every script and mechanic that treats her capture as a mid-game event, or her loss as a loss condition, must be revised (Loremaster), and the "saved / taken / turned" endings need reconciling with this.
- Open: are the "Count destroyed" and "Lenka rescued" goals the same thing, or can she be rescued without destroying him? What becomes of the pressed-flower dusk marker? It could become a nightly clue to where she is being held.
- Endings (Loremaster, 2026-10-14): the rescue and the Count's destruction are one confrontation. Outcomes are: **Rescued** (full win: Lenka is freed and Vlad destroyed, needs Sergiu's sword), **Endures** (lesser win, since Bob's rule is that rescue = win: Lenka is freed, but without the sword Vlad is only driven off), **Taken** (loss: the hunters fail and she stays his), and **Turned** (loss: a third corruption). The pressed flower becomes a nightly dusk clue: a private clue to one hunter's iPad and a still on the Dashboard.
- Sword loss on night 5 (Gamewright, 2026-10-14): `sergiu-blade` is a carried item held by one hunter. If that hunter is defeated during the finale, the blade falls. If the party then frees Lenka without it, the outcome is **Endures**. There's no bite or captive track for Lenka: the phase clock and corruption already supply the pressure.
- Finale guard (Gamewright, 2026-10-14): when the finale starts, the party picks one hunter on the Dashboard to guard Lenka. The guard cannot be the hunter carrying the sword, so one strike cannot cost both. The guard keeps the role for the whole finale.

- Dracula loss mapping (R-LF-9): Taken uses `~lost`, Turned uses `~plague` tune and `~cursed` slide.
- Lid choice (Gamewright, 2026-10-14, `n2-burgomasters-funeral.lid-choice`): **Nailed** spends 1 stake (only offered if a stake is held). The fight spawns 1 fewer foe (min 1), and losing it costs 1 story item, with no skull drop. **Watched** keeps the stake for a full-strength fight. Losing it costs 1 corruption (instant-loss guard applies) plus 1 skull drop (counts toward the cap of 2 per night). The stats log the choice.

- Variants rule (revised, 2026-10-14): hunters move independently, so `~no-<hunter>` variants are live (the hunter is away from the scene). Voice and render them.- Investigation advantages (Gamewright, 2026-10-14). These use the RtDT Advantage traits, and warriors still work as hit points under base rules:
  - `examine-body.two-bites`, **Ready Stake:** +1 Undead advantage for the picker in this fight.
  - `anton-coat.holy-water`: grants holy water (a story item) to the picker. It can be spent in any fight for +1 Undead advantage, or as a fly-eater or `~blocked` price.
  - `pray-over-coffins.consecrated`, **Consecrated Ground:** +1 Wild advantage for every present hunter in the first battle round only.
  - `question-mother.singing`: the mother bars the window, so the fight has 1 fewer foe. This stacks with a nailed lid, minimum 1 foe.
  - `follow-the-mourner.the-servant` (risky), **Forewarned:** the first battle card is revealed face-up before the party commits. The cost is paid by the picker, who chooses 1 corruption or sitting out the fight. A picker already at 2 corruptions must sit out.
  - Cap: story advantages are limited to +2 per hunter per fight (R-FUN-4).
  - Tower cue for the risky pick: replace `drum-top` with a seal flicker plus a sound, because drum positions carry board meaning and story cues don't move drums unless the base game would. It fires after all picks lock.

## Quest-token gaps (Gamewright, 2026-10-14, configures engine E19)
- **D-DRA-11 Hunter token start site (the Count's attention): override to a space next to the Tower in the active kingdom.** This keeps Loremaster's intent (the castle side, the same approach the drawbridge uses on night 5) in real RtDT terms. The rulebook uses "a space next to the Tower" for the main-goal relic entry. The generic default (the active kingdom's citadel) is avoided here because the night 3 objective is the K3 Citadel (`n3-fly-eaters-cell`). Uncertain: we have no source that lists the printed names of the tower-adjacent spaces, so the app should name the space by its terrain and position (or by its printed name, once the board is checked).
- **D-DRA-12 Night 4 earth-box buildings: K4 Sanctuary and K4 Village**, 3 boxes: 1 in the Sanctuary and 2 in the Village. Sanctuary: a desecrated chapel full of grave-earth (Stoker's Carfax chapel). Village: Szgany carts unloading crates in the village (mechanics-map encounter 7, Szgany hauling earth boxes). The objective token sits at one site at a time: the Sanctuary at dusk, then the Village once the Sanctuary box is destroyed. If the seeded K4 fortune building (the Tome site) is a box's building, that box moves to the **K4 Bazaar** (crates hidden among market goods) and the token follows it. The token is never on two sites, and a box is never left on the Tome's building, so the Tome stays a separate later site. The K4 Citadel is kept clear so the hunter-token default stays free if a later pack drops D-DRA-11. Jakob's night-3 finding tells the party where the boxes are, not how many. The count is 3 (n4-earth-boxes).

## Game length (Bob, 2026-10-14; provisional)
- **D-DRA-13 Game length for Dracula (R-LEN). Provisional, pending POC timing (PRD-41..43).** The night-5 tower assault (D-DRA-4) is always played. Lengths count the investigation nights before it: Short = 2 + assault (3 nights), Standard = 3 + assault (4 nights), Long = all 4 + assault (5 nights, the full game). Which nights and set pieces each length keeps is **not decided here**: Loremaster proposes, per length, which set pieces are kept, and Bob rules. Constraint: the win condition (rescue Lenka, D-DRA-10) must be reachable at every length, so each length includes the keys/finale path it needs (R-LEN-3). Hunter-token pace (E19h) and encounter frequency per length are set with the same proposal. Times per length are measured, not guessed (R-LEN-4).

## Dungeon crawl (Bob, 2026-10-14)
- **D-DRA-14 Dracula crawl location: the crypt under the night-2 church, entered right after the funeral.** It uses engine E20. 4–5 rooms: ossuary, flooded passage, old burgomaster's tomb, Szgany smugglers' cache, and the sealed door at the bottom (the target room). The exact count per game length follows E20i. **Not in the POC PRD.** It is a candidate POC extension only.
