# Dracula, Group 3: the Count's strikes, tower opening, chapter wins and seal breaks

**Status: DRAFT** (every line pending DEC-785 / OPEN RULING 6). Loremaster, 2026-11-10. Sources: D-01 "Beats Loremaster must write", D-02 §3, §4 and §10 (`/workspace/dracula/D-02/D-02-rules-deltas.md`), main's `assets/stories/dracula/scripts/tokens-and-encounters.md` (the `enc-*` source), and the C5-05 Ruined Keep masters (`/workspace/c5-05-art/voice/MANIFEST.md`).

**Speakers:** `narrator` (Charon, "slow, low, ominous storyteller") unless marked otherwise. Two lines are `count` (Algieba), heard only as a voice: the Count stays unseen and is described only by hand, mist, cold and violets. Everything is spoken to the whole table. Nothing is private, and no single hunter "hears" anything. Lenka's face is shown from chapter 1 (travelling hood, face clear). The Tome changes it; it is not unveiled (see lenka-look.md).

**Ids (DEC-856):** a base line is `<scene>.NN~vo-NN`. A goal line is `<scene>.NN~<value>.vo-NN`, with one `~` per id. The goal values are `replace-a-hero`, `win-lenka`, `destroy-the-blade` and `darkness` (D-02 `count-goal`). Event moments are `<scene>.<event>~vo-NN`.

**Strike flow (D-02 §3, DEC-858):**
1. One opening plays (`enc-*`, two per goal, played in turn). Then the iPads offer Fight / Ward / Endure.
2. Ward plays `enc-at-the-door.01`, then `count-withdraws` at once.
3. A Fight round won plays `count-withdraws`.
4. A lost fight, a retreat or Endure plays `count-strike.01~<goal>`, or the `guarded` or `lantern` event in its place.

Strikes play in chapters 2 and 3 only (Gamewright, 2026-11-10). In chapter 4 the castle rooms and traps do that job, and in chapter 1 he is only a voice. No strike line mentions the castle rooms or chapter 1's house.

**Rules applied:** a strike adds a bite, lowers Lenka's loyalty, weakens the blade (to +1, never destroyed) or puts a skull on a building. It never takes a quest object (G-1). No strike alone gives the third bite, so the guard is an event line. Lenka never turns or becomes a foe. Dracula ships Short and Standard only, so the Long-only quests are not named. Tomas is not in any line. The VO never gives instructions such as "drop a skull"; the screen and the tower cues (which fire on their own) carry those.

**Estimates:** 0.40 s per word + 4.0 s, fitted to the 13 Charon masters in C5-05 (`/workspace/c5-05-art/voice/MANIFEST.md`); expect about ±3 s. Cap 20 s (about 40 words). The short system moments aim for 7 to 10 s; the strike openings run about 10 to 11 s, since they open a scene. Captions = spoken text, word for word.

## Strike openings (enc-* scenes, two per goal)

- **D-01/D-02 beat:** `count-strike` flow (D-02 §3, DEC-858): the strike is a short plain scene. Its opening narration comes from the goal's two `enc-*` sources, played in turn. Loremaster keeps the `enc-*` ids
- **Notes:** One opening plays, then the iPads offer Fight / Ward / Endure. Each `enc-*` scene serves one goal, so it needs no `~<goal>` value. These are the old openings reworked: no lookalike, no private lines, no Marta or Tomas, and the Count is unseen. The lines set a mood and give no instructions.

| Asset id | Speaker | Spoken text | Caption | Est. s | When / intent | Status |
|---|---|---|---|---|---|---|
| `enc-wrong-face.01~vo-01` | narrator | Mist rolls across the street and back. For one breath, you cannot see your own hands. | Mist rolls across the street and back. For one breath, you cannot see your own hands. | 10.4 | goal replace-a-hero, opening A | DRAFT |
| `enc-mist-remembers.01~vo-01` | narrator | The mist comes in close and stops being weather. It knows where you have been. | The mist comes in close and stops being weather. It knows where you have been. | 10.0 | goal replace-a-hero, opening B | DRAFT |
| `enc-the-window.01~vo-01` | narrator | The mist parts on a high window. A woman in white climbs onto the sill. | The mist parts on a high window. A woman in white climbs onto the sill. | 10.0 | goal win-lenka, opening A | DRAFT |
| `enc-wine-for-no-one.01~vo-01` | narrator | A table laid for two in an empty room. Wine poured for a guest who never came. | A table laid for two in an empty room. Wine poured for a guest who never came. | 10.8 | goal win-lenka, opening B (reworked: no Marta) | DRAFT |
| `enc-brothers.01~vo-01` | narrator | Two brothers fight in the fog below the castle. One takes the other's bright sword, and uses it. | Two brothers fight in the fog below the castle. One takes the other's bright sword, and uses it. | 11.2 | goal destroy-the-blade, opening A | DRAFT |
| `enc-third-hums.01~vo-01` | narrator | In the fog a woman hums a lullaby. The tune climbs toward the castle stair. | In the fog a woman hums a lullaby. The tune climbs toward the castle stair. | 10.0 | goal destroy-the-blade, opening B | DRAFT |
| `enc-road-returns.01~vo-01` | narrator | An hour on the road out. Then the same milestone, the same shrine, the same crow. | An hour on the road out. Then the same milestone, the same shrine, the same crow. | 10.4 | goal darkness, opening A | DRAFT |
| `enc-wedding-uphill.01~vo-01` | narrator | A wedding climbs the hill in the mist. Pale women behind a veiled girl. There is no groom. | A wedding climbs the hill in the mist. Pale women behind a veiled girl. There is no groom. | 11.2 | goal darkness, opening B | DRAFT |

## Ward (enc-at-the-door)

- **D-01/D-02 beat:** D-02 §3: `enc-at-the-door` becomes the Ward option's line in every strike scene. Ward = spend holy water or the host, and he withdraws at once
- **Notes:** Plays when the group picks Ward. Then `count-withdraws` follows straight away, with no battle. The line covers either holy item without naming which one.

| Asset id | Speaker | Spoken text | Caption | Est. s | When / intent | Status |
|---|---|---|---|---|---|---|
| `enc-at-the-door.01~vo-01` | narrator | Three knocks. You raise what holy thing you carry, and the mist will not cross the sill. | Three knocks. You raise what holy thing you carry, and the mist will not cross the sill. | 10.8 | Ward picked: the nail, holy water, or the host is spent, in that order (D-02 G-12) | DRAFT |

## count-strike (landed strike, ~<goal>)

- **D-01/D-02 beat:** `count-strike.NN~<goal>` (D-02 §3, DEC-850): his landed strike for each goal: a bite, Lenka's loyalty, the blade (weakened), a skull on a building
- **Notes:** Plays when the strike lands: no Fight round won, a retreat, or Endure. The goal values come from D-02 `count-goal`. Each line describes only the harm, and the screen shows the cost. The guard and the Lantern are event moments, not state variants (DEC-856 allows only goal, lair and `~freed` variants).

| Asset id | Speaker | Spoken text | Caption | Est. s | When / intent | Status |
|---|---|---|---|---|---|---|
| `count-strike.01~replace-a-hero.vo-01` | narrator | The cold comes first. Then a hand in the mist, and teeth at your throat. | The cold comes first. Then a hand in the mist, and teeth at your throat. | 10.0 | +1 bite on the present hero with the most bites | DRAFT |
| `count-strike.01~win-lenka.vo-01` | narrator | Violets on the sill where Lenka sleeps, still wet. She keeps one, and says nothing. | Violets on the sill where Lenka sleeps, still wet. She keeps one, and says nothing. | 10.0 | Lenka's loyalty drops a step | DRAFT |
| `count-strike.01~destroy-the-blade.vo-01` | narrator | Frost creeps up Stefan's blade from the point. Its light goes thin. | Frost creeps up Stefan's blade from the point. Its light goes thin. | 8.8 | weaken: blade, one step (+3 down to a floor of +1, never destroyed; G-1, DEC-853) | DRAFT |
| `count-strike.01~darkness.vo-01` | narrator | Mist goes door to door through the parish. By morning, one more house stands dark. | Mist goes door to door through the parish. By morning, one more house stands dark. | 10.0 | 1 skull on the nearest standing building | DRAFT |
| `count-strike.guarded~vo-01` | narrator | He reaches for more than you can give, and stops. The cold takes your strength instead. | He reaches for more than you can give, and stops. The cold takes your strength instead. | 10.4 | event: the guard fires (a hero at 2 bites, or the blade at its floor), so hit points are lost instead. No strike gives the third bite (DEC-775, MEC-013) | DRAFT |
| `count-strike.lantern~vo-01` | narrator | The Lantern flares. What he meant for you breaks on its light, and only the cold gets through. | The Lantern flares. What he meant for you breaks on its light, and only the cold gets through. | 11.2 | event: the Lantern is present, so the goal's strike does not land and hit points less 2 are lost (D-02 softening) | DRAFT |

## count-withdraws

- **D-01/D-02 beat:** `count-withdraws`: Beaten, he leaves the board for the day, and he says so (IDEA-126). D-02: a Fight round won, or a Ward, sends him back to the Tower at once
- **Notes:** Plays after a Fight round is won, or straight after the Ward line. One Count line (`count`, Algieba, 'smooth, courtly, menacing'), heard as a voice from the mist and never seen, then the narrator. The wording fits both routes. Play goes on, and he walks out again at the next day's close.

| Asset id | Speaker | Spoken text | Caption | Est. s | When / intent | Status |
|---|---|---|---|---|---|---|
| `count-withdraws.01~vo-01` | count | Enough. Keep your day. I have others. | Enough. Keep your day. I have others. | 6.8 | he says so (IDEA-126). Voice only, unseen | DRAFT |
| `count-withdraws.02~vo-01` | narrator | The mist draws back up the hill, and the cold goes with it. For today, he is gone. | The mist draws back up the hill, and the cold goes with it. For today, he is gone. | 11.2 | he goes back to the Tower for the day (fight or ward) | DRAFT |

## count-takes-lenka

- **D-01/D-02 beat:** `count-takes-lenka`: His strike carries Lenka to the castle, and play goes on (DEC-746). D-02 §4: the win-lenka strike at wavering, or her hero falling with no one to pass her to, sets `lenka-taken`
- **Notes:** It says plainly that she can be won back (DEC-746). She never turns and never becomes a foe. Her face is clear; the empty travelling cloak is what remains. The Count is a voice only. "She is home now" ties to the `come-home-letter` prop without spoiling Ludmila.

| Asset id | Speaker | Spoken text | Caption | Est. s | When / intent | Status |
|---|---|---|---|---|---|---|
| `count-takes-lenka.01~vo-01` | narrator | Every lamp goes out at once. When they come back, Lenka's cloak lies empty on the floor. | Every lamp goes out at once. When they come back, Lenka's cloak lies empty on the floor. | 10.8 | lenka-taken is set | DRAFT |
| `count-takes-lenka.02~vo-01` | count | She is home now. Come and ask her yourselves. | She is home now. Come and ask her yourselves. | 7.6 | voice only, unseen | DRAFT |
| `count-takes-lenka.03~vo-01` | narrator | On the hill, one more window is lit. She can still be brought back. The hunt goes on. | On the hill, one more window is lit. She can still be brought back. The hunt goes on. | 11.2 | play goes on, and the Lantern can free her in the lair (DEC-750) | DRAFT |

## tower-opening

- **D-01/D-02 beat:** `tower-opening`: The castle doors and the first climb (as The Ruined Keep)
- **Notes:** Plays when The Drawbridge's Tower trigger fires (IDEA-147). It mirrors The Ruined Keep's "The Tower door stands open. Inside, the stairs climb into the dark." `.02` sets up The Banquet, which is always the first main-level room (IDEA-093). It works whether or not the physical tower is used.

| Asset id | Speaker | Spoken text | Caption | Est. s | When / intent | Status |
|---|---|---|---|---|---|---|
| `tower-opening.01~vo-01` | narrator | The castle doors stand open, as if you were expected. Candles burn all the way up the stair. | The castle doors stand open, as if you were expected. Candles burn all the way up the stair. | 11.2 | the castle doors and the first climb | DRAFT |
| `tower-opening.02~vo-01` | narrator | Somewhere above, a table is being laid for guests. | Somewhere above, a table is being laid for guests. | 7.6 | the first climb; sets up n5-banquet | DRAFT |

## chapter-win.01 … .03

- **D-01/D-02 beat:** `chapter-win.01` … `.03`: The chapter is won, in one line each
- **Notes:** These mirror the C5-05 family (Ruined Keep wins run 10.7 to 12.8 s), in the same order: the chapter win, then the seal break. Chapter 4 has no chapter win, because the endings cover it. The lines are neutral on whether Lenka is still with the hunters, and they name no Long-only quests.

| Asset id | Speaker | Spoken text | Caption | Est. s | When / intent | Status |
|---|---|---|---|---|---|---|
| `chapter-win.01~vo-01` | narrator | The cards are read. For the first time since you came, you know where to go. | The cards are read. For the first time since you came, you know where to go. | 10.4 | ch1 The Mists: the Reading closes the chapter | DRAFT |
| `chapter-win.02~vo-01` | narrator | The blade and the Lantern are yours. On the hill, one lit window goes dark. | The blade and the Lantern are yours. On the hill, one lit window goes dark. | 10.0 | ch2 The Hunt: the blade and the Lantern brought back | DRAFT |
| `chapter-win.03~vo-01` | narrator | The Tome is read. You know what he wants now, and he knows that you know. | The Tome is read. You know what he wants now, and he knows that you know. | 10.4 | ch3 The Truth: the Tome names his goal (DEC-747); the call to the castle | DRAFT |

## seal-break.01 … .03

- **D-01/D-02 beat:** `seal-break.01` … `.03`: His hold on the valley cracks, once a chapter (IDEA-152)
- **Notes:** These mirror the C5-05 family (Ruined Keep seal breaks run 10.0 to 12.8 s). The `break-seal` tower cue fires on its own, so the VO gives no instructions. `.01` does not suggest the first parish stays open.

| Asset id | Speaker | Spoken text | Caption | Est. s | When / intent | Status |
|---|---|---|---|---|---|---|
| `seal-break.01~vo-01` | narrator | The mist thins at the parish edge, and the first seal breaks. His hold on Vellmoor slips. | The mist thins at the parish edge, and the first seal breaks. His hold on Vellmoor slips. | 10.8 | ch1 end; two new parishes open | DRAFT |
| `seal-break.02~vo-01` | narrator | A second seal cracks. Down in the valley, a church bell rings that has been silent since spring. | A second seal cracks. Down in the valley, a church bell rings that has been silent since spring. | 11.2 | ch2 end | DRAFT |
| `seal-break.03~vo-01` | narrator | The third seal breaks. Nothing stands between you and his door now. | The third seal breaks. Nothing stands between you and his door now. | 8.8 | ch3 end; the castle calls | DRAFT |

**Totals:** 28 lines (26 Charon, 2 Count). Est. 283.2 s. Longest line 11.2 s, shortest 6.8 s.

## Strike UI labels (DRAFT, screen only, not voiced)

| Tag | Text | Notes |
|---|---|---|
| `count-strike, option, fight` | Fight | A skirmish of up to 3 rounds. Win one, and he withdraws |
| `count-strike, option, ward` | Ward | Spend the nail, holy water, or the host. He withdraws at once |
| `count-strike, option, endure` | Endure | The strike lands at once |
| `needs a ward` | Needs the nail, holy water, or the host | The disabled-Ward reason (the funeral nail is a Ward source, Gamewright 2026-11-10; it replaces "Needs holy water or the host") (C3 disabled-with-reason). No full stop, to match the Ruined Keep's "Needs the Warden's Signet" |

## `enc-*` ids kept

`enc-wrong-face`, `enc-mist-remembers`, `enc-the-window`, `enc-wine-for-no-one`, `enc-brothers`, `enc-third-hums`, `enc-road-returns`, `enc-wedding-uphill` (openings) and `enc-at-the-door` (Ward). Per D-02, `enc-ledger-page` becomes a traitor clue and `enc-early-lantern` folds into the procession, so neither is written here. Their old costs, the skull cap and the private lines are dropped.

## Open questions (Gamewright)

All answered on 2026-11-10: event moments are OK, one shared guard line is OK, strikes play in chapters 2 and 3 only, and `lenka.saved_by` is set in time.

No questions for Bob.
