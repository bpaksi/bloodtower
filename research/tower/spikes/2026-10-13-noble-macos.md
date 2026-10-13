# Hardware spike, 2026-10-13: noble on macOS with the real tower

Interim write-up for tower-poc M1 steps 5 and 6. Bob ran `pnpm -F tower-poc-server spike` twice on his Mac with the tower nearby. The second run got as far as the first rotation light sequence and ended there, by design, when the tower did not answer. Six steps have not run yet; a third run is needed for them.

## Environment

| | |
|---|---|
| Mac | macOS (`darwin`), Node v24.4.1 |
| Library | `ultimatedarktower` 7.1.2, `ultimatedarktowerdata` 3.0.0, `@stoprocent/noble` 2.8.0 (prebuilt binary, no install scripts run) |
| Tower | Restoration Games LLC `ReturnToDarkTower`, hardware 1.11, software 1.0.0, firmware `79556657694099f3ca293f534b9cc5b55bfeaa31` |
| Script | `feat/tower-poc-spike` at `4766f90` |

## Logs

| Run | File | Outcome |
|---|---|---|
| 1 | `spike-2026-10-13T21-02-11-054Z.jsonl` | Connect failed after 10 s: "Bluetooth adapter not ready: Timeout waiting for Noble to be powered on". Nothing was sent. |
| 2 | `spike-2026-10-13T21-03-35-393Z.jsonl` | Eight steps passed, the ninth timed out, the run disconnected. |

Times below are milliseconds from the start of run 2, as logged.

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

## Findings

### 1. noble works on macOS, after the permission prompt

The first run failed because macOS was still asking for Bluetooth permission for the terminal; noble never reached "powered on" within its 10 seconds. The second run, 84 seconds later, connected in under 2 seconds. The plan's main risk ("noble can't see the tower on macOS") did not happen. The service needs a clear message for this first-run case, which spec §6 already has as `bluetooth-unavailable`.

### 2. Lights, sound and the seal sequence work before calibration, and nothing moves (GAP-HW-001, GAP-HW-006)

The tower was truly uncalibrated for these steps: every state it sent before the calibrate step has drum bytes `00 00`, and after calibration they are `10 42`. All three commands worked and Bob saw no drum move. This supports spec decision D9 as written and answers the worry behind holding `seals.break`: stateful packets do carry drum bytes, and an uncalibrated tower did not act on them.

### 3. The tower answers a calibration with a state message

The reviewers could not tell from the code whether the tower sends a state when calibration ends. It does, 20.6 seconds after the command, and the library's `onCalibrationComplete` fired.

### 4. `rotationAllDrums` gets no answer, and that blocks the library for 30 seconds (GAP-HW-007)

Every other command in the run was echoed by the tower within 25 to 63 ms. The `rotationAllDrums` sequence was written, the lights played, and no 20-byte state came back in the 44 seconds before the disconnect. The library holds its queue for 30 seconds waiting for that answer, then rejects the command. No drum moved.

So the original question (do these sequences move a drum) has a first answer of "no" for one of the four, and there is a new problem: a sequence the tower does not acknowledge makes the command look failed and holds every later command for 30 seconds. The seal sequence (14) was acknowledged, so this is not true of every sequence.

### 5. Notifications are slower than the library's documents say

The documents say battery notifications arrive about every 200 ms. In this run the tower sent two kinds of 5-byte message throughout: one starting `07` every 2 seconds, whose last two bytes read as a battery level around 4.9 V (`0x1349` = 4937), and one starting `06 ff` every second, whose meaning is not yet identified. That is about 1.5 messages a second, not 5.

### 6. The command format changes once the tower is calibrated

Before calibration the stateful packets carry drum bytes `00 00`; after it they carry `10 42` (top and middle north, bottom north, calibrated). The script's instrumented adapter saw every write and every notification, and each command could be matched to the tower's echo by content and by time. This is the starting evidence for the observability assessment (step 7).

## What changed in the script after this run

The rotation-sequence step now comes last, sends the four sequences one at a time, treats the library's 30-second rejection as "the tower did not answer" for that step only, and asks about lights and drums after each. Everything else still ends the run on a timeout.

## Still to do

A third run for: rotate with state, legacy rotate, random rotate (GAP-HW-009), the looped sound (GAP-HW-008), the 60-second watch with a skull drop, and all four rotation sequences (GAP-HW-007).

## Not checked

- The `06 ff` messages were counted, not decoded.
- The library's own diagnostics export (`*.diagnostics.local.json`, not committed) was not compared with the adapter log; that is step 7.
- Whether the 20.6-second calibration time is typical: one sample.
