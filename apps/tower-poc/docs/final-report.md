# tower-poc final report

**Closed after M3, 2026-10-15 (Bob's decision).** M4 (diagnostics timeline, gap register) and M5 (acceptance run) are deferred; see [What was not done](#what-was-not-done). Library `ultimatedarktower` 7.1.2, data `ultimatedarktowerdata` 3.0.0, one tower (hardware revision 1.11, firmware `79556657…`), driven from Node on Bob's Mac.

The POC's question was: *what can the Return to Dark Tower tower do, driven from a Mac, and what can't it do?* This report answers it with what was seen on the real tower. The full per-capability detail is generated in [capabilities.md](capabilities.md), the design decisions are in [../spec.md](../spec.md) §2, and the gaps are in spec §7.

## In one paragraph

Everything the library offers through its public API works on the real tower. All **42** capabilities with a control in the app passed a hands-on Verify pass (M3 step 3.6, 2026-10-15). The tower answers most commands in about 50 ms. Lights, 113 sounds, three drums and seals can all be driven from any browser on the LAN through one Mac service. The cost is reliability, not features. The tower does not answer a command that changes nothing, which stalls the library's queue for 30 s. Bluetooth can drop, and once it needed a power cycle to come back. Drum, glyph and seal positions are worked out by the software, not reported by the tower. Any app built on the tower has to be designed around those three facts.

## What the tower offers

54 capabilities are in the inventory: 53 at the M3 close, plus `lighting.flash` for the timing test, which has not been verified on the tower. 42 have a control and passed on the hardware. 3 are diagnostics with a page that M4 never built. 8 are not offered: 5 by design, 3 because the library has no public method for them.

### Connection and calibration: 13 passed

| Capability | What it does | Seen on the tower |
|---|---|---|
| Connect, Disconnect | Scan for the tower by name and link over Bluetooth | 1.2 to 3.1 s to connect, 40 ms to disconnect |
| Connected, status, responsive, events | Where the link stands, as a value and as events | Correct on both a requested and a lost disconnect |
| Device information | Manufacturer, model, serial, hardware, firmware and software revisions | "Restoration Games LLC", "ReturnToDarkTower", rev 1.11 |
| Calibrate, calibrated, in progress, complete | Spins each drum to find north | 19.5 to 24 s. The tower sends no battery messages meanwhile. Needed before anything moves (D9) and lost on every reconnect (D10) |

### Lights: 5 passed

| Capability | What it offers |
|---|---|
| All lights on, all off | One packet. On takes an optional effect |
| Set lights | Any of 24 lights (12 doorway: 3 levels × 4 sides; 4 ledge corners; 8 base), each `off`, `on`, `breathe`, `breatheFast`, `breathe50percent` or `flicker` |
| Set one LED | One LED by layer (6) and light (4), with an effect and a loop flag |
| Light sequence | 21 built-in sequences (twinkle, flareThenFade, angryStrobe 1–3, gloat 1–3, defeat, victory, dungeonIdle, sealReveal, monthStarted, wholeTowerBreathing, …), with an optional sound. The four `rotation*` sequences light the drums without moving them; the tower never answers them, so they are sent without waiting (D23). `rotationDrumMiddle` is still held because it was never played (GAP-HW-007) |

Lights stay as set until a later command changes them. Rotating with state keeps them; the legacy rotate and the random rotate turn them all off (GAP-HW-009). `lighting.flash` is not one of the five that passed: the timing page uses it to toggle one light, and it is unverified on the tower.

### Sounds: 2 passed

**113 sounds in 12 groups**, each played by number with an optional volume:

| Group | Count | Examples |
|---|---|---|
| Adversary | 8 | Ashstrider, Gravemaw, Utuk'Ku |
| Ally | 10 | Gleb, Grigor |
| Foe | 15 | |
| Spawn | 8 | |
| Battle | 23 | Battle Start, Battle Victory, Apply Advantage 1–5, Card Flip, Button Hold |
| Classic (1981 8-bit) | 11 | 8-bit Start Dungeon, Quest Failed, Tower Lost, Dragons, Bazaar |
| Dungeon | 12 | Tomb, Shrine, Footsteps, Caves, Escape, Fortress |
| State | 14 | Tower Idle 1–5, Gloat 1–3, Month Started/Ended, Skull Dropped |
| Glyph | 5 | Tower Angry 1–4, All Glyphs |
| Seals | 4 | Rotate Start, Loop, Exit, Tower Seal |
| Quest | 2 | |

The full list, with numbers, is on the app's Sounds page and in `ultimatedarktowerdata`.

- **Volume:** 0, 1 and 2 play, and 3 is silent ("mute", as the library names it). Whether 0 to 2 differ in loudness is still open (GAP-HW-003).
- **Timing:** the tower echoes a sound command 50 to 60 ms after it is sent. It never reports when the sound ends (GAP-LIB-007).
- **Loop:** none. The tower dropped the loop bit (GAP-HW-008).

### Drums and glyphs: 8 passed

| Capability | What it does |
|---|---|
| Rotate drums, keeping lights | Each of the three drums to a side (north, east, south, west), optionally with a sound; drums already in place don't move |
| Rotate one drum | One drum to a side, optionally with a sound |
| Rotate drums at random | Chosen drums (7 groupings) to random sides. Turns every light off; behind a confirm dialog |
| Drum position, long command in progress | Where each drum is believed to be, and whether a rotation is running |
| Glyph position, all positions, facing a side | Which of the 5 glyphs (Cleanse, Quest on top; Battle in the middle; Banner, Reinforce at the bottom) faces which side |

The tower answers a one-drum quarter turn about 1.1 s after it is sent (M1 spike). Nothing can stop a drum once it is turning (GAP-HW-004). Positions and glyphs are **library-derived**. They were right throughout the pass, but a drum turned by hand is not seen.

### Seals, skulls, battery and state: 14 passed

| Capability | What it does |
|---|---|
| Break a seal | Plays the seal reveal (lights plus sound) and records the seal as broken |
| Broken seals, seal broken, mark broken or restored, clear all | The app's own record of the 12 seals (D24). The tower does not know which seals are broken |
| Skull count, skull dropped | The tower counts skulls dropped through it and reports the count. The first report after a connect is taken as the starting point (GAP-LIB-011) |
| Reset the tower's skull counter, reset the record | Zero the tower's counter or the app's own count |
| Battery level, previous level, reading | Millivolts and percent, sent by the tower about every 2 s (about 4.7 V on fresh batteries) |
| Tower state, state updated | The whole 19-byte state the tower last reported: drums, lights, audio, beam count |

### Not offered

| Capability | Why |
|---|---|
| Legacy rotate | Turns every light off; "rotate keeping lights" replaces it (GAP-HW-009) |
| Pick a random unbroken seal | Game logic, not a tower feature; not needed for the POC |
| Connection monitoring settings (3) | Library tuning; changing them could hide a real disconnect |
| Door reset, unjam drums, overwrite drum states | Firmware commands with no public method in 7.1.2 (GAP-LIB-004 to 006) |
| Raw send commands | No UI by design: no message may carry raw bytes (D12) |

## What we learned

These are the findings any later app on the tower has to respect. Each one is backed by a gap entry.

1. **The tower answers only commands that change something.** Lights-on when the lights are already on, a drum to the side it already faces with the sound on, and the `rotation*` sequences all get no answer. The library then waits 30 s, and every queued command waits behind it (GAP-HW-010, GAP-LIB-013). *An app has to know the tower's state and skip no-ops, or send those commands without waiting.*
2. **The link can drop, and recovery is manual.** Once, during a sound, the link dropped and only a power cycle brought the tower back (GAP-HW-011; the cause is unknown and low batteries are a guess). Nothing reconnects or retries by itself; that's a safety rule, not a missing feature. *Every tower effect in an app needs a fallback, and the host needs a Reconnect button.*
3. **Calibration is slow and fragile.** It takes 19.5 to 24 s, makes noise, and is lost on every reconnect. *Calibrate once at setup, and keep drum and glyph effects optional mid-session.*
4. **Positions are the software's guess.** Drums, glyphs and seals are tracked in software. They stayed correct when every move went through the app. *Don't let players turn drums by hand during a tracked session.*
5. **Answers can be matched to the wrong command.** The tower answers with its whole state and never names the command. The library takes any state report as the answer to the command it is waiting on (GAP-LIB-010). The pass found no wrong match, but the risk stays.
6. **Fast where it answers.** Lights and sounds answer in 25 to 65 ms, so tower effects can sync closely with a screen.
7. **One Mac service, many browsers, works.** The Mac and a phone controlled the tower together and saw each other's commands (M2 hardware smoke); the iPad layout is covered on the mock by the two-device e2e test. iOS has no Web Bluetooth, so the Mac service isn't optional (GAP-PLAT-002).

## Evidence

| What | Where |
|---|---|
| Hardware spike, observability assessment | `research/tower/spikes/2026-10-13-noble-macos.md`, `research/tower/observability.md` |
| M2 hardware smoke (two devices) | `research/tower/smoke/2026-10-14-m2-hardware-smoke.md` |
| M3 Verify pass, with log | `research/tower/smoke/2026-10-15-m3-verify-pass.md` |
| Per-capability results | The service's `verifications` table in `data/tower-poc.db` (local, not in git): 48 rows, newest result per capability all `pass` |
| Gap register | `spec.md` §7: 27 gap ids |
| Tests | 586 unit tests (protocols 227, web 72, server 287) and Playwright e2e at three viewports, all green on `main` |

## What was not done

| Deferred | Why it can wait | Where it goes |
|---|---|---|
| M4 diagnostics timeline (in-app event view, saved sessions, export) | The `DIAG_LOG` file served the Verify pass; reading it took minutes | Build it if a later app needs live diagnostics. The adapter tap (`InstrumentedAdapter`) is the part to keep |
| M4 gap register as data (CRUD, import, export) | The spec §7 table worked as the register | A `packages/` gap list, if two apps need it |
| M5 acceptance run (environment matrix, restart run, error matrix) | M2's smoke covered multiple devices; the pass covered every control | The first app on the tower runs its own acceptance |
| Open questions | Volume 0 to 2 loudness (GAP-HW-003), `rotationDrumMiddle` (GAP-HW-007), the cause of the drop (GAP-HW-011), the tower's skull counter across a power cycle (GAP-LIB-011). Whether sounds and light sequences overlap, whether a skull drop makes its own sound, and the fastest clean flash are open too | `pnpm timing` (see the README) records `rotationDrumMiddle`, overlap, the skull-drop sound and flash rate under `docs/timing-results/`. Volume, the drop's cause and the skull counter across a power cycle are still open |

How to reuse the code is in [reuse-guide.md](reuse-guide.md).
