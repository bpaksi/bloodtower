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

- Variants rule (revised, 2026-10-14): hunters move independently, so `~no-<hunter>` variants are live (the hunter is away from the scene). Voice and render them.