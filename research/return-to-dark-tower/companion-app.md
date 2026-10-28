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
- Dungeon screen: room-by-room exploration with one improvement per room; remembers cleared rooms; see [app-dungeon-screen.md](app-dungeon-screen.md).
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

These line up well with things a web controller could explore: multi-screen play (Mac, iPad, phone), a sandbox for tower effects, and tutorial-style walkthroughs.

## Third-party tools

- **Return to Dark Tower Assistant** (Ben Dodson, iOS, $1.99): hero-board and phase tracker for iPad Slide Over, supports Alliances and Covenant. Unaffiliated.
- **UltimateDarkTower** library: the community Bluetooth library our POC uses. Covered in `research/tower/`.
