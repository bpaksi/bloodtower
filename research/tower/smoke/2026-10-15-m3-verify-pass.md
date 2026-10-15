# M3 Verify pass, 2026-10-15

tower-poc M3 step 3.6, on the real tower (hardware revision 1.11, serial `2E:E6:DD:1D:19:D5`), library 7.1.2, app 0.0.0, from `main` at `b61db6c`. Bob ran the service with `pnpm start` and recorded each result in Verify mode from the Mac. Results are in the service's `verifications` table, not here.

| File | What |
|---|---|
| `2026-10-15-m3-verify-service.jsonl` | The service's log for the second run (`DIAG_LOG`), 10:18:47 to 10:34:16 UTC: adapter tx/rx, connection changes, command lifecycles |

The first run had no `DIAG_LOG`, so it left only its recorded results.

## Results

All 42 capabilities on the control pages have a result from the real tower. 41 have a newest result of pass. `sound.play-stateful` is partial: "Volume only works with 0-2 (text says, 0-3)". `seals.broken`, `battery.level` and `battery.previous-level` were recorded in a short third sitting at 10:50 UTC, outside this log.

## Findings

**1. The tower dropped the link while a sound played, then could not be reconnected (first run, no log).** Bob played sound 1 from the Sounds page. He heard it, and the command ended `failed`: "The connection ended before the command finished: Command queue cleared". That is the library rejecting its queue in `onTowerDisconnect` (`dist/esm/index.mjs:2515` at 7.1.2). Reconnect then failed until Bob stopped the service, switched the tower off and on, and started the service again. No error reached the terminal: the library's warnings go to the service's event stream, which is not printed. Which check ended the link (adapter event, GATT check, battery heartbeat or response timeout) is not known. → GAP-HW-011.

**2. Volume 3 plays nothing.** `sound.play-stateful` with volume 0, 1, 2 and 3 sent the audio volume as `0x00`, `0x10`, `0x20` and `0x30` in byte 18, and the tower echoed each one. For example, sound 1 at volume 3, lines 161–162:

```text
10:20:06.066 tx 0010420000000000000000000000000100003000
10:20:06.137 rx 0010420000000000000000000000000100003000
```

Bob heard 0 to 2 and not 3. The library names 3 "mute", and so does the page; Bob read the page's "0 to 3" as four audible levels. Whether 0, 1 and 2 sound different was not recorded. → GAP-HW-003.

**3. Rotating one drum to the side it already faces, with the sound on, sends a packet the tower does not answer.** Line 481: calibration ended with the state `00 10 42 00…` (drums at north). Line 500, `rotateDrumStateful(0, 0, true)`, the top drum to north with sound:

```text
10:22:38.069 rx 0010420000000000000000000000000000000000
10:22:48.369 tx 0011420000000000000000000000000000000000
10:23:18.370 library-warn [UDT] Command timeout after 30000ms: rotateDrumStateful(0, 0, true)
10:23:18.372 mechanics.rotate-drum indeterminate
```

The only changed bit is the top drum's `playSound` (`data[0] & 1` in the library's unpack). The library skips a drum already in place only when `playSound` is false (`dist/esm/index.mjs:3088`). The tower moved nothing, played nothing Bob reported, and sent no state, so the command ended "Sent, no answer" after 30 s, and `lighting.all-on`, pressed at 10:23:03, waited behind it in the queue. The Mechanics page said "If the drum is already there, nothing is sent." The same drum to east and back with the sound, later in the run, passed. → GAP-LIB-013.

**4. A stateful packet sent before the tower's first report after a reconnect carries all-zero drum bytes, and the tower ignored them.** Bob disconnected at 10:19:53 (line 126, `disconnecting` first: asked for, not lost) and reconnected at 10:19:57, still calibrated at the tower. The first command, `sound.play-stateful` at 10:20:01, went from a new library object that had no tower state yet, lines 149–150:

```text
10:20:01.943 tx 0000000000000000000000000000000100000000
10:20:02.238 rx 0010420000000000000000000000000100000000
```

The tower answered with its own drum bytes `10 42`, not the zeros it was sent, and Bob reported no drum motion. One packet, once. → GAP-HW-006.
