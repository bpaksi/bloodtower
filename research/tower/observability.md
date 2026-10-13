# Observability: what we can see of the tower's traffic

tower-poc M1 step 7. It compares two records of the same three spike runs on 2026-10-13: our adapter tap (`instrumentedAdapter.ts`, the committed `spikes/spike-*.jsonl`) and the library's own diagnostics export (`spikes/spike-*.diagnostics.local.json`, not committed because it holds the serial number). Run 3 is the main sample.

## Short answer

- The adapter tap sees every byte in both directions and every adapter call. Nothing the library sent or received in the three runs is missing from it.
- The library's recorder sees no bytes as we ran it. It adds what the tap cannot know: which library call a packet belongs to, queue timeouts, heartbeat warnings and its own log lines.
- The two clocks agree to the millisecond, so the records can be merged into one timeline without guessing.
- A response can be matched to a command when the tower echoes it. It cannot when the tower sends nothing, and the tower never names the command it is answering. GAP-DIAG-001 stays open, with a narrower description (below).

## What each source holds

| | Adapter tap | Library recorder |
|---|---|---|
| Outbound packets | Full hex of every write | `cmd_sent` with the length only |
| Inbound packets | Full hex of every notification | `cmd_response` with the message name and length only |
| Battery messages (`07`) | Every one, as hex | Not in the event list. The last 60 as millivolts and percent |
| Which call sent a packet | Not known | `cmd_enqueued` with a description such as `rotateWithState(east, north, north)` and an id |
| Timeouts | Seen only as "nothing came back" | `cmd_timeout` with the command, its age and the queue depth |
| Decoded events | None | `skull_drop` with the count, `calibration_started`, `calibration_complete`, `heartbeat_late` |
| Connection | Start, success or error of connect, read device information, disconnect, cleanup; Bluetooth availability | `connect`, `disconnect` with a cause, and an incident report |
| The library's log lines | None | Warnings, with their text |
| How long it keeps | Everything we write down | The last 450 to 500 events |
| Device identifiers | None | The serial number, in the incident report |

Run 3 in numbers: the tap logged 688 adapter records (16 writes, 662 notifications and 10 connection records). The recorder's export held 459 events and began at `calibration_complete`: the connect, the calibration start and the first 55 seconds had already been pushed out.

## Findings

### 1. The recorder has no payloads unless asked, and the spike did not ask

The spike enabled diagnostics with `{ enabled: true }`. The library has a `capturePayloads` option, off by default, which by its code adds a hex string to the sent and received events. It was not tried. With it off, the recorder cannot answer "what exactly was sent", and the tap is the only source of bytes.

### 2. The recorder forgets after about 500 events

Its buffer holds 500 events and drops the oldest 50 when full (`RING_BUFFER_SIZE` and `RING_BUFFER_DRAIN` in the library's code). The tower sends one `06` message a second, each of which is an event, so an idle connection fills the buffer in about eight minutes. Run 3 lasted seven and a half and had already lost its start.

For the service this means an export taken at the end of a session is not a record of the session. The recorder accepts sinks with an `onEvent` callback; to keep D16 ("the library's recorder is ingested into our timeline") the service has to take events as they happen, not read the buffer afterwards. `onEvent` was not exercised in the spike.

### 3. The clocks agree

The recorder stamps events with wall-clock milliseconds. The tap's `ms` plus the `at` time in the log's first record gives the same number for 14 of the 15 writes the recorder holds, and differs by 1 ms for the other: the `playSound(1)` write in run 3 is `1791926011401` in both. So `at` is the zero of the tap's `ms` (not the time of the first record, whose `ms` is 3245), and one timeline can be built from both sources by time alone.

### 4. Matching a response to a command

What the logs support:

- **Echoed commands match by content and time.** For every sound, light and rotate command the tower sent back a 20-byte state 25 to 64 ms later for lights and sound and about 1.1 s later for a rotate. Nine of the sixteen writes in run 3 were answered this way: eight with bytes equal to what was written, and one, the looped sound, with the loop bit dropped.
- **Calibration matches by state.** The write is one byte (`04`); the answer is the first state with the calibrated bits, about 21 s later.
- **Six writes had no answer at all**: the four rotation sequences and two writes that changed nothing the tower reports (spike write-up, findings 7 and 10). For these there is nothing to match.
- **The looped sound's echo did not equal the write** (`81` sent, `01` returned), so matching by exact content fails for that one and has to allow for the tower dropping a bit.
- **The tower never identifies the command.** A state message is the tower's whole state. Two skull drops arrived as the same kind of message with no command pending.

How the library does it, from its code and not from the logs: the queue keeps one command in flight and `onResponse()` takes no argument, so it resolves whatever is in flight when a response is handled. If an unprompted state, such as a skull drop, arrived while a command was waiting, the library would by that reading count it as the answer. That did not happen in any run and was not tested. Which message types reach `onResponse()` was not traced.

So GAP-DIAG-001 can be stated more exactly: matching is reliable for a command whose effect shows in the state, when it is the only thing happening; it is a guess when the tower is silent or when an unprompted state arrives at the same time.

### 5. Some library calls bypass the queue, and the recorder shows which

In run 3 the recorder has 15 `cmd_sent` events and 9 `cmd_enqueued`. By content, the six writes without a queue entry are the four all-lights-on and two all-lights-off packets. That is consistent with what the spike write-up took from the code, that `allLightsOn` and `allLightsOff` are written directly with no 30-second timeout; the recorder shows the missing queue entries, not the reason for them. They also have no description in the recorder. The service will need to name them itself.

The recorder's 15 is one fewer than the tap's 16 writes. The missing one is the calibrate write, which is older than the export's first event.

### 6. The recorder confirms the 30-second timeout for all four sequences

It has four `cmd_timeout` events, `lightOverrides(15)` to `(18)`, each with an age of 30,001 or 30,002 ms and a queue depth of 0. The spike write-up had this for run 3 only by inference; the timing is now recorded. That the queue would block other commands is still from the code, because nothing was queued behind them.

### 7. The library's heartbeat check does not fit this tower's battery messages

The library expects a battery message about every 200 ms and warns after 3 s without one. This tower sent one about every 2.0 s, so one late or missed message is enough to trip it. In run 3 it did: the tap shows a 4.0 s gap between two `07` messages during the looped-sound step, about 26 s after the looped-sound write, and the recorder has a `heartbeat_late` and a warning that says "expected every ~200ms". The library checked the connection, found it alive and carried on.

The tower also sent no `07` messages at all while calibrating: a gap of 24.0 s in run 3 and 22.0 s in run 2, with the `06` messages still arriving every second. No disconnect followed in either run. Whether the library warned then is not in the exports (run 3's had dropped that period, and run 2's shows no warning).

This matters for M2 because the service must not treat a heartbeat warning as a lost connection, and because nothing may reconnect automatically.

### 8. A normal disconnect is recorded as an incident

After the script's own disconnect in run 3 the recorder has `disconnect` with cause `user_initiated`, then 28 ms later the warning "Tower device disconnected unexpectedly", a second `disconnect` with cause `adapter_event`, and an incident report with that cause. Run 2 shows the same. The incident report is therefore not evidence that something went wrong; the service has to know it asked for the disconnect.

### 9. What the tower sends unprompted

| First byte | Size | Library's name | Seen |
|---|---|---|---|
| `00` | 20 | Tower state | After most commands, and on each skull drop |
| `04` | 5 | Rotation duration | Once per drum move, 1 to 2 ms before the state |
| `06` | 5 | Differential readings | Every 1.0 s, always, including during calibration |
| `07` | 5 | Battery | About every 2.0 s, except during calibration |

The `06` payloads change from message to message and were not decoded. The library exports a `parseDifferentialReadings` function, which was not tried.

## What this means for M2

1. Build the diagnostics timeline on the adapter tap. It is complete and carries no identifiers.
2. Feed the library's recorder into the same timeline as events arrive, through a sink. Do not rely on its export.
3. Merge by wall-clock time. No offset is needed.
4. Give every command our own correlation id at the executor, and attach the tower's next matching state to it. Mark the match as "by echo" or "none", so the UI never shows a guess as a fact.
5. Treat "no state came back" as unknown, not failed.
6. Keep the library's exports out of anything committed or shared without the privacy notice: they hold the serial number.

## Not checked

- `capturePayloads` and the recorder's `onEvent` sink: read in the code, not run.
- The library's `BLE_DIAGNOSTICS.md` was not read; this assessment rests on the installed code and the three exports.
- The library's logger outputs (`setLoggerOutputs`) as a separate source. Only the warnings that the recorder copied were seen.
- An unprompted state arriving while a command is in flight.
- Anything on a second tower, a second Mac or a long session. All three runs were one tower, one Mac, under eight minutes.
- Read device information goes through the adapter as one call; the tap sees that it happened and how long it took, not the individual reads.
