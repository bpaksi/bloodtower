# M2 hardware smoke, 2026-10-14

tower-poc M2 step 11, on the real tower (hardware revision 1.11, serial `2E:E6:DD:1D:19:D5`). The service ran with `pnpm start` and `DIAG_LOG` set, on branch `test/tower-poc-hardware-smoke`. Bob drove both parts and reported what he saw and heard.

| File | What |
|---|---|
| `2026-10-14-m2-smoke-service.jsonl` | Part 1, the service's log: adapter tx/rx, connection changes, command lifecycles |
| `2026-10-14-m2-d23-service.jsonl` | Part 2, the service's log |
| `2026-10-14-m2-d23-script.jsonl` | Part 2, what the `d23-smoke` script sent and received, with Bob's observations |

## Part 1: two devices, one tower

The Mac (browser at `localhost:4747`) and Bob's phone (browser on the LAN), open at the same time. The plan's exit condition names an iPad; a phone was used. The iPad viewport is covered on the mock by the two-device e2e test (step 10).

| Time (UTC) | Step | Result |
|---|---|---|
| 16:09:01.7 → 16:09:04.8 | Mac: Connect | `connecting` → `connected`, 3.1 s. Both devices showed it. |
| 16:10:24.4 → 16:10:43.9 | Calibrate | `calibrating` → `calibrated`, 19.5 s (M1: 20.6 s and 22.4 s). Play was disabled on both while calibrating. |
| 16:10:47.9 | Play test sound, client `cc21e1ae…` | Heard. `confirmed` 61 ms after `started`. |
| 16:11:01.0 | Play test sound, client `b9e3bf83…` | Heard. `confirmed` 62 ms after `started`. |
| 16:11:14.9 | Disconnect | `disconnecting` → `disconnected`, 40 ms. Both showed "Not connected". |

Bob: "Yes to all": each step showed on both devices as expected, with the lifecycle `Queued → Started → Sent → Confirmed` on each.

A correlated play-sound lifecycle, the first sound, from `2026-10-14-m2-smoke-service.jsonl`. The tower echoed the packet 60 ms after it was written, and the lifecycle ended `confirmed` on the echo:

```jsonl
{"at":"2026-10-14T16:10:47.862Z","source":"command","lifecycle":{"commandId":"w-mv8b3uxf-3","capabilityId":"sound.play","clientId":"cc21e1ae-64f2-4514-9083-af970a98e754","stage":"queued","at":1791994247862}}
{"at":"2026-10-14T16:10:47.862Z","source":"command","lifecycle":{"commandId":"w-mv8b3uxf-3","capabilityId":"sound.play","clientId":"cc21e1ae-64f2-4514-9083-af970a98e754","stage":"started","at":1791994247862}}
{"at":"2026-10-14T16:10:47.863Z","source":"transport","event":{"kind":"tx","hex":"0010420000000000000000000000000100000000","bytes":20}}
{"at":"2026-10-14T16:10:47.923Z","source":"transport","event":{"kind":"rx","hex":"0010420000000000000000000000000100000000","bytes":20}}
{"at":"2026-10-14T16:10:47.923Z","source":"command","lifecycle":{"commandId":"w-mv8b3uxf-3","capabilityId":"sound.play","clientId":"cc21e1ae-64f2-4514-9083-af970a98e754","stage":"write-completed","at":1791994247923}}
{"at":"2026-10-14T16:10:47.923Z","source":"command","lifecycle":{"commandId":"w-mv8b3uxf-3","capabilityId":"sound.play","clientId":"cc21e1ae-64f2-4514-9083-af970a98e754","stage":"confirmed","at":1791994247923}}
```

## Part 2: the silent light sequences (D23)

The hold on the four `rotation*` sequences was lifted in the service for this run only. `pnpm -F tower-poc-server d23-smoke` connected, calibrated (22.4 s), and then, asking before each step, sent a sequence and, after Bob had looked, the test sound.

| Sequence | Lifecycle | Bob saw and heard | Then the test sound |
|---|---|---|---|
| `rotationAllDrums` | `indeterminate` 25 ms after `started`, one packet (sequence byte `0f`) | No sound. Bottom outside lights on, all inner rotating lights on. Drums not mentioned (in M1, no drum moved). | The lights from the sequence turned off, and the sound played. |
| `rotationDrumTop` | `indeterminate` 28 ms after, byte `10` | No sound, no drum moved. Bottom outside lights on, top inner rotating lights on. | Nothing recorded (Bob pressed Enter). `confirmed`. |
| `rotationDrumMiddle` | not played (skipped at the prompt) | | |
| `rotationDrumBottom` | `indeterminate` 26 ms after, byte `12` | No sound, no drum rotated. Bottom outside lights on, bottom inner rotating lights on. | The lights from the sequence turned off, and the sound played once. |

What the packets show, for each sound after a sequence: the executor first wrote the library's state with the sequence byte at 0 (the clearing write), then, 279 to 280 ms later, the sound packet (250 ms of that is the lane's spacing); the tower echoed the sound packet, so it ended `confirmed`. The tower sent no state after a sequence, so the clearing write was always needed.

## Findings

1. **The walking skeleton works on hardware.** Connect, calibrate, play and disconnect from two devices at once, each seeing the other's actions and lifecycles.
2. **D23 works on the tower, for three of the four.** A silent sequence ends `indeterminate` within 30 ms instead of failing after 30 s, and a command after it is not delayed.
3. **A silent sequence holds its lights until the next command.** Bob looked between 45 and 80 s after each one, and the lights were still on. For AllDrums and Bottom he recorded that the next command turned them off and its sound played once, not replaying the sequence; for Top he recorded nothing after the sound. The next command is two packets 280 ms apart, the clearing write and the sound, both with every light off and the sequence byte at 0, and Bob looked after both, so which one turned the lights off was not seen. There is no command that only stops a sequence; to turn one off, a person sends another command (all lights off, for example).
4. **`rotationDrumMiddle` was not played in M2**, so its hold stays: it played in the M1 spike through the library's queue, but never through D23's write and clearing write. The hold on the other three is lifted.
5. **Not seen:** the battery reading on either device was not checked separately. The tower reported its battery (`07…` packets) about every 4 s.
