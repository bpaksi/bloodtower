# Return to Dark Tower — Official Companion App

State as of 13 October 2026.

## Identity

| | |
|---|---|
| Name | Return to Dark Tower ("Bring Your Tower To Life!") |
| Developer | Restoration Games, LLC; built by Björn Elíeser Jónsson / Porcelain Fortress; UI by Sam Ballard; sound by Cassini Sound |
| Engine | Unity (updated to latest Unity in v1.3.7) |
| iOS / iPadOS | App Store id1570832677 — requires iOS 13+, 289.8 MB, rated 9+, 4.6★ (59 ratings). Also listed for visionOS. Not offered on Mac |
| Android | `com.restorationgames.returntodarktower` — 10K+ downloads, 4.3★ (256 reviews), last updated 1 May 2026 |
| Price | Free, no in-app purchases noted |
| Data | iOS: usage + diagnostics, not linked to identity. Android: app activity, performance, device IDs may be shared |
| Support | help@restorationgames.com |
| Not the same as | The separate "Restoration Games" app (Stop Thief!, Downforce, Fireball Island, Thunder Road) |

No official desktop or web version was found. That gap is what our web controller fills.

## What the app does

- Pairs with the Tower over Bluetooth and drives it: rotation, lights, sounds, seal-removal indicators, calibration.
- Listens for the skull drop sensor to end a turn.
- Setup: mode (cooperative / competitive), difficulty (Heroic / Gritty), expansions, player count, main goal, adversary, foes, optional 12-character game seed.
- Runs the hidden game state: month length, events, monthly quests, foe status and strikes, adversary actions.
- Battle screen: face-down cards per foe level, Advantage arrows to improve results, critical hits, adversary 5-card fights with persistent improvements.
- Dungeon screen: room-by-room exploration with one improvement per room; remembers cleared rooms.
- Foe status screen: counts, status level, current strike event; removing foes without battle.
- Save / restore games; "game lost" button on most screens; end-game stats with seed.
- Settings: localization, performance mode, 180° rotation.
- Languages added over time: French, Japanese, Ukrainian (v1.3.4), Simplified and Traditional Chinese (v1.3.5). Store listing still says English only.

## Version history (iOS)

| Version | Date | Highlights |
|---|---|---|
| 1.0 | 10 Nov 2021 | Initial release |
| 1.2.2 | 14 Jan 2022 | Bug fixes and balance; skull sensor disabled on dungeon screens; battery % disabled (low-battery warning only); Vulkan disabled |
| 1.2.3 | 2 Mar 2022 | Performance mode; Xyr/Isa fix; graphics and audio pass |
| 1.2.5 | 26 May 2022 | Gritty made harder with a new end-of-month event; seed loading fix for Alliances; 180° rotation |
| 1.2.6 | 14 Dec 2022 | Clearer seal-removal screen; more turns early in 4-player games; adversary-specific end text |
| 1.2.7 | 25 May 2023 | New adversary monthly quests (months 2–5); fewer clustered companion events |
| 1.2.8 | 13 Sep 2023 | Lingering Rot dungeon and guild quest fixes |
| 1.3.1 | 22 Sep 2023 | **Covenant support**: new main goals, monuments, wastelands, doom skulls |
| 1.3.2 | 31 Dec 2023 | Quest fixes, text polish |
| 1.3.3 | 28 Apr 2024 | Save-game fix; localization options |
| 1.3.4 | 11 Jun 2024 | French, Japanese, Ukrainian |
| 1.3.5 | 26 Jul 2024 | Simplified and Traditional Chinese |
| 1.3.6 | 12 Jun 2025 | Fixed adversary not acting often enough; Letha/Covenant message; platform library updates |
| 1.3.7 | 7 Oct 2025 | Covenant support in Chinese; Unity upgrade |

Android's latest note (1 May 2026) is a fix for the app failing to load after switching to Ukrainian.

## Expeditions and the app

Expeditions began shipping to backers in October–November 2026. No store listing found yet mentions Expeditions support, so expect an app update around delivery. **[Check the stores before relying on it.]**

## Gaps reviewers point to

- No tutorial or practice mode for battles, Advantages and dungeons.
- One device runs everything; no multi-device or per-player screens.
- Unclear whether saves carry across devices.
- Base game feels easy to some; adversary retreat reduces tension.
- Difficulty scales badly with player count: easy solo, hard at four (GamingTrend; see the [review design check](../game-design/design-check-rtdt-review.md)).

These line up well with things a web controller could explore: multi-screen play (Mac, iPad, phone), a sandbox for tower effects, and tutorial-style walkthroughs.

## Screenshots (Bob, 2026-10-28)

Seven screens from the app, in `app-screenshots/` in the backup folder (see [README.md](README.md#copyrighted-material-not-in-the-repo)). What each one shows:

| File | Screen | What it shows |
|---|---|---|
| `01-turn-screen-annotated.jpg` | Turn screen | Header "Month 3 · Turn 4". Three stacked panels on the left: Companion quest (gold, *Smuggler's Coin*, "Dayside · spend 1 treasure"), Adversary quest (red, *War of Words*, "Plains of Plovo · spend 3 spirit"), Main goal (*Recover Azkol's Treasures*, "Mountains of the Watchers · 4 Azkol's treasures and 5 virtues"). The Tower stands in the art on the right. Three hex buttons bottom right and an eye icon top right. The Rulebook v2.0 names the buttons: sword = **battle** (p. 16), torch = **dungeon** (p. 19), rings = **foe status** (p. 16). **Bob's red marks:** arrows from the Tower and from the sword to the torch, and an arrow down to the foe status button, which is circled. |
| `02-event-new-wares.jpg` | Event | Gold "Event" banner. *New Wares*: put any number of market treasures on the bottom of the treasure deck, then refill the market. One Continue button. |
| `03-dungeon-lady-loss.jpg` | Dungeon | Dungeon *Lady Loss*: a dark map with two lit rooms, the current one glowing. Room *Secret Altar* with its card "Lose 7 warriors." and an up-arrow (Advantage) button. Below the map: "0 Advantages Applied" and the trait "Magic". |
| `04-battle-dragon-critical-item.jpg` | Battle | Dragon battle, traits "Beast \| Melee", "Advantages Spent: 2 / 10". A red *Critical Hit!* card: "Lose 1 item.", with a sun-ray Advantage track (one of five pips filled). Three face-down battle cards at the bottom, a Confirm button, the eye icon. Rule line: resolve this card before showing the next; if you can't, take a corruption. |
| `05-battle-dragon-critical-warriors.jpg` | Battle | Same battle, "Advantages Spent: 0 / 10". *Critical Hit!*: "Lose 12 warriors. and 1 treasure." (the stray full stop is the app's), two of five pips filled. |
| `06-main-goal-azkol.jpg` | Main goal | *Recover Azkol's Treasures* (companion Zaida): bring Azkol's treasures to Zaida's Sanctum to draw the adversary from the Tower. Goal: quest in the Mountains of the Watchers while holding 4 of Azkol's treasures (cards with "Azkol" in the name) and 5 virtues. Left: companion art, an "S" compass medallion and a board-quarter map. |
| `07-confirm-setup.jpg` | Confirm setup | Four cards: Game type (Cooperative, Heroic difficulty), Main goal (Zaida), Adversary (Isa the Exile), Foes (Brigands level 2, Lemure level 3, Dragon level 4). One Continue button. |

What the screens tell Bloodtower:

- Every screen is one picture, one panel of text and one button, the same shape as our set pieces ([dungeon review](../game-design/dungeon-review.md#the-aim-one-picture)).
- A battle card names a loss in plain words, and the Advantage track shows how many steps are left to soften it. The 2/10 counter is per battle, not per card.
- The quests on the turn screen carry place and cost in one line. Nothing on that screen says what the foes will do next. That sits one tap away behind the foe status button: each foe's count, its status (panicked to lethal) and its current strike event (Rulebook p. 11). It is also where foes are removed without a battle (p. 16) (see the [review design check](../game-design/design-check-rtdt-review.md#c5-important-enemy-information-is-easy-to-miss)).

## Third-party tools

- **Return to Dark Tower Assistant** (Ben Dodson, iOS, $1.99): hero-board and phase tracker for iPad Slide Over, supports Alliances and Covenant. Unaffiliated.
- **UltimateDarkTower** library: the community Bluetooth library our POC uses. Covered in `research/tower/`.
