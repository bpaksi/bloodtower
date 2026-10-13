# Hardware spike, 2026-10-13: noble on macOS with the real tower

Write-up for tower-poc M1 steps 5 and 6. Bob ran `pnpm -F tower-poc-server spike` three times on his Mac with the tower nearby. The second run got as far as the first rotation light sequence and ended there, by design, when the tower did not answer. The third run covered every step the second had not reached. Between them, every step has run at least once.

## Environment

| | |
|---|---|
| Mac | macOS (`darwin`), Node v24.4.1 |
| Library | `ultimatedarktower` 7.1.2, `ultimatedarktowerdata` 3.0.0, `@stoprocent/noble` 2.8.0 (prebuilt binary, no install scripts run) |
| Tower | Restoration Games LLC `ReturnToDarkTower`, hardware 1.11, software 1.0.0, firmware `79556657694099f3ca293f534b9cc5b55bfeaa31` |
| Script | `feat/tower-poc-spike` at `4766f90` (runs 1 and 2) and `6b063b0` (run 3) |

## Logs

| Run | File | Outcome |
|---|---|---|
| 1 | `spike-2026-10-13T21-02-11-054Z.jsonl` | Connect failed after 10 s: "Bluetooth adapter not ready: Timeout waiting for Noble to be powered on". Nothing was sent. |
| 2 | `spike-2026-10-13T21-03-35-393Z.jsonl` | Eight steps passed, the ninth timed out, the run disconnected. |
| 3 | `spike-2026-10-13T21-12-24-129Z.jsonl` | Ten steps passed and Bob skipped four that run 2 had covered. The run disconnected normally. |

Times are milliseconds from the start of the run they belong to, as logged.

## Result per step (run 2)

| Step | Result | What the log shows | What Bob saw |
|---|---|---|---|
| Connect | passed | Connected in 1.75 s, device information read in 0.36 s | macOS asked for Bluetooth permission |
| Device information | passed | Fields as in the table above; serial number present, system id absent | — |
| Lights before calibration | passed | Both packets echoed by the tower within 30 ms | Lights came on and went off; no drum moved |
| Sound before calibration | passed | Echoed in 54 ms | Heard it; no drum moved |
| Break seal before calibration | passed | Echoed in 63 ms; a second state 3.6 s later with the sequence cleared | Lights and sound played; no drum moved |
| Calibrate | passed | One-byte command `04`; state with the calibrated bits arrived 20.6 s later | All three drums spun and stopped; nothing unusual |
| Sound | passed | Echoed in 57 ms | Heard it |
| Lights on, off | passed | Echoed in 37 ms and 25 ms | Came on and went off |
| Rotation sequences | **timed out** | `rotationAllDrums` (15) was written; no state came back in 44 s; the library rejected at 30 s | "Was working": the lights played |
| Rotate with state, legacy rotate, random rotate, looped sound, 60-second watch | not run | The run ends on a timeout | — |

Bob's answer to the sequence question reads "no, no, no, no", but only the first of the four sequences was sent. It is evidence for `rotationAllDrums` only.

## Result per step (run 3)

| Step | Result | What the log shows | What Bob saw |
|---|---|---|---|
| Connect | passed | Connected in 5.0 s, device information read in 0.36 s | No permission prompt this time |
| Device information, lights, sound and break seal before calibration | skipped | Bob skipped them; nothing was sent | — |
| Calibrate | passed | `04` written; state with the calibrated bits (`10 42`) arrived 22.4 s later | All three drums spun and stopped; nothing unusual |
| Sound | passed | Echoed in 62 ms | Heard it |
| Lights on, off | passed | Echoed in 35 ms and 25 ms | Came on and went off |
| Rotate with state (top to east) | passed | Lights-on packet echoed in 32 ms. Rotate packet `12 42` with the light bytes still set; state with `12 42` came 1.06 s later | Only the top drum turned; the lights stayed on |
| Legacy rotate (top to south) | passed | Lights-on packet identical to the tower's state: no echo. Rotate packet `14 42` with every light byte zero; state came 1.07 s later | Only the top drum turned; the lights went off |
| Random rotate (top drum) | passed | Lights-on packet echoed in 34 ms. Rotate packet `16 42` (top west) with every light byte zero; state came 1.15 s later | Only the top drum turned; the lights went off |
| Looped sound | passed | Written with audio byte `81` (sound 1 with the loop bit); the tower's echo 64 ms later has `01`. The lights-off packet sent to stop it got no echo | The sound did not loop. Nothing was playing afterwards, also after disconnect |
| 60-second watch | passed | Two states arrived unprompted, with the skull count byte at 1 and then 2. 30 battery messages, the last 4832 mV | Dropped two skulls |
| Rotation sequences | passed | All four written (15, 16, 17, 18), 34 to 40 s apart. No state came back for any of them | Lights played for each; no drum moved for any |
| Disconnect | passed | Clean, 28 ms | — |

"Passed" for the rotation sequences means the step ran to its end, not that the tower answered: `towerAnswered` is `false` for all four.

## Findings

### 1. noble works on macOS, after the permission prompt

The first run failed because macOS was still asking for Bluetooth permission for the terminal; noble never reached "powered on" within its 10 seconds. The second run, 84 seconds later, connected in under 2 seconds. The plan's main risk ("noble can't see the tower on macOS") did not happen. The service needs a clear message for this first-run case, which spec §6 already has as `bluetooth-unavailable`.

### 2. Lights, sound and the seal sequence work before calibration, and nothing moves (GAP-HW-001, GAP-HW-006)

The tower was truly uncalibrated for these steps: every state it sent before the calibrate step has drum bytes `00 00`, and after calibration they are `10 42`. All three commands worked and Bob saw no drum move. This supports spec decision D9 as written.

What it shows about the worry behind holding `seals.break` is narrower than it first looks. On a fresh connection the library's packets carried drum bytes `00 00`, and an uncalibrated tower did nothing with them. The log does not show what an uncalibrated tower does with *populated* drum bytes. That case could arise if the library still held calibrated positions from before a disconnect while the tower had been switched off and on in between. The service resets calibration on disconnect (D10), which should keep the library from sending stale positions, but that is a design intention for M2, not something this run tested. That the tower was uncalibrated is the tower's own report, not an independent check.

### 3. The tower answers a calibration with a state message

The reviewers could not tell from the code whether the tower sends a state when calibration ends. It does, 20.6 seconds after the command, and the library's `onCalibrationComplete` fired.

### 4. `rotationAllDrums` gets no answer, and that blocks the library for 30 seconds (GAP-HW-007)

Every other command in the run was echoed by the tower within 25 to 63 ms. The `rotationAllDrums` sequence was written, the lights played, and no 20-byte state came back after the write in the 44 seconds the log covers. The library holds its queue for 30 seconds waiting for that answer, then rejects the command; the other 14 seconds were Bob answering the prompt. Nothing was written to the tower in that time. No drum moved.

So the original question (do these sequences move a drum) has a first answer of "no" for one of the four, and there is a new problem: a sequence the tower does not acknowledge makes the command look failed and holds every later command for 30 seconds. The seal sequence (14) was acknowledged, so this is not true of every sequence.

### 5. Notifications are slower than the library's documents say

The documents say battery notifications arrive about every 200 ms. In this run the tower sent two kinds of 5-byte message throughout: one starting `07` every 2 seconds (78 in the run) and one starting `06 ff` every second (172). By the library's own byte formula the `07` messages are battery level, around 4.9 V (`0x1349` = 4937 mV), and the values sag while the drums move; that is the library's reading of the bytes, which this log is consistent with but does not confirm independently. The library names the `06` messages "differential voltage readings" and treats them as unsolicited, so they never count as the answer to a command. That is about 1.5 messages a second, not 5.

### 6. The command format changes once the tower is calibrated

Before calibration the stateful packets carry drum bytes `00 00`; after it they carry `10 42` (top and middle north, bottom north, calibrated). The script's instrumented adapter saw every write and every notification, and each command could be matched to the tower's echo by content and by time. This is the starting evidence for the observability assessment (step 7).

## What changed in the script after run 2

The rotation-sequence step now comes last, sends the four sequences one at a time, treats the library's 30-second rejection as "the tower did not answer" for that step only, and asks about lights and drums after each. Everything else still ends the run on a timeout. Run 3 used this version, and the changed step behaved as built: four sequences sent, `towerAnswered: false` recorded for each, the run went on to disconnect. The script sets that flag only when the library rejects with its "Command timeout after" error; run 3's log does not hold the error text itself.

## Findings from run 3

### 7. None of the four rotation sequences moves a drum, and none is answered (GAP-HW-007)

Bob saw lights and no drum motion for `rotationAllDrums`, `rotationDrumTop`, `rotationDrumMiddle` and `rotationDrumBottom`. That answers the question the hold was for, as far as watching can: no drum moved for any of the four. This was on a calibrated tower; run 2's one sample was calibrated too, so the sequences have not been played on an uncalibrated tower.

Finding 4 now holds for all four. The tower sent no state after any of them, and the library rejected each one. Run 3's log shows only that each took longer than 30 seconds from write to record (33.5 to 39.3 s, which includes Bob typing two answers); the 30 seconds itself comes from run 2's error text and the library's code. Lifting the hold as it stands would give the UI four commands that work on the tower and report failure. By the library's code they would also hold every other queued command for those 30 seconds; nothing was queued behind them in either run, so that part was not observed.

### 8. `rotateWithState` reports the new position and keeps the lights; the other two rotates turn them off (GAP-HW-009)

All three moved only the top drum, and the tower's state afterwards carried the new position (`12`, `14`, `16` in the first drum byte for east, south, west, so each target was one side on from the last). The plan asked whether the state after `rotateWithState` shows the new position: it does.

The lights going off is visible in the packets, not only at the tower. `rotateWithState` sent the light bytes as they were (`33…`). Legacy `Rotate` and `randomRotateLevels` sent every light byte as zero, and the tower's state after each has them zero. So the hold on legacy rotate is confirmed, and the same is true of `mechanics.random-rotate`, which is not held.

A 5-byte message starting `04` arrived 1 to 2 ms before each of the three states, with values 909, 922 and 989. The library names this message "Rotation Duration". The states came 1061, 1071 and 1149 ms after the write, so the values are consistent with milliseconds of drum travel, but nothing here confirms the unit.

### 9. The sound did not loop (GAP-HW-008)

The packet carried the loop bit (`81`); the tower's echo carried `01` without it, and Bob answered "no" to "Did it loop?". Nothing was playing after the step or after disconnect. The script did not ask whether he heard the sound at all, so the log does not record that it played; the tower's echo is the only sign that it accepted the command.

The question behind the hold (can a looped sound be stopped) was therefore not tested: nothing looped, so the "did the sound stop" answer says only that a sound that had already ended was not playing. This is one sound (catalog index 1), once. It does not show that no sound loops.

### 10. Two more writes got no answer, and both matched what the tower already held

Besides the four sequences, two packets were written with no state coming back: lights-on when the lights were already on (legacy rotate step) and the all-zero state sent to stop the sound, when the lights were already off. The first was identical to the tower's last reported state. The second differed from it only in the audio byte (`00` against the `01` the tower had echoed), so it matched what the tower held only if the sound had ended and the tower no longer counted it, which the log cannot show. Leaving the four sequences aside, every other packet that changed lights or drum position or started a sound was echoed.

That suggests the tower answers a change of state rather than every write. It is a guess from two cases and the sequences do not fit it (their last byte changes and they are not answered, while the seal sequence in run 2 was). Neither write timed out. By the library's code `allLightsOn` and `allLightsOff` bypass its queue, which fits the log but is not shown by it. For M2 it means "no state came back" cannot be read as "the command failed".

### 11. Skull drops arrive as a state message with a running count

Each drop produced one unprompted 20-byte state within the watch, with byte 17 at `01` and then `02`. The library then carried that count in its own later packets (the sequence packets have `02` there). Whether the tower itself still held the count at the end is not shown: it sent no state after the second drop.

### 12. Notification rates and calibration time, second sample

Over the 441 seconds between the first and last notification of run 3 the tower sent 209 `07` messages (one every 2.1 s) and 438 `06 ff` messages (one every 1.0 s), the same rates as run 2. By the library's formula the `07` values ranged from 4400 to 4921 mV. Calibration took 22.4 s against 20.6 s in run 2.

## What this means for the holds

These are the answers the spike gives. Changing the inventory, gap seed and spec is plan step 8 and is not done here.

| Gap | Hold | Evidence | Suggested |
|---|---|---|---|
| GAP-HW-001 | — | Lights and sound work uncalibrated, nothing moves (run 2) | D9 stands |
| GAP-HW-006 | `seals.break` requires calibration | Worked uncalibrated, nothing moved (run 2, one seal, drum bytes `00 00`) | Make it `available`; the stale-positions case in finding 2 stays open for M2 |
| GAP-HW-007 | Four `rotation*` sequences held | No drum moves; the tower answers none of them and the library blocks 30 s each | Keep held until M2 (Bob's decision, 2026-10-13); expose them once the service can send them without waiting for an answer |
| GAP-HW-008 | `sound.play-stateful` has no `loop` | One sound did not loop; stopping a loop untested | Keep `loop` out; the gap changes from "may not be stoppable" to "did not loop when tried" |
| GAP-HW-009 | Legacy `mechanics.rotate` not exposed | Turns the lights off; `rotate-with-state` keeps them | Keep it not exposed; record that `random-rotate` turns the lights off too |

## Not checked

- The `06 ff` messages were counted, not decoded beyond the library's name for them.
- The library's own diagnostics exports (`*.diagnostics.local.json`, not committed) were not compared with the adapter logs; that is step 7.
- Calibration time has two samples, both on the same day. The battery readings were lower in run 3 (4400 to 4921 mV) than in run 2 (4611 to 4988 mV).
- The steps Bob skipped in run 3 (lights, sound and seal before calibration) rest on run 2 alone.
- The rotation sequences on an uncalibrated tower.
- Whether any other sound loops, and so whether a loop can be stopped.
- Every drum observation is Bob watching the tower. The log confirms position only for the top drum, and only as the tower reports it.
