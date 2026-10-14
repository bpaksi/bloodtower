# PRD: Tower Web Controller POC

## 1. Product overview

Build a **proof-of-concept** website that connects to a Return to Dark Tower tower and exposes the existing functionality of the UltimateDarkTower library through browser-based controls.

The application will also provide:

- A diagnostics page showing connection activity, commands, Bluetooth responses, parsed events, errors, and state changes.
- A feature-gap page tracking known tower capabilities that are unsupported, partially supported, unverified, or not yet exposed in the website.

UltimateDarkTower is the initial integration foundation because it provides JavaScript/TypeScript tower controls and state tracking. Its documented functionality includes lights, sounds, drum rotation, glyph positions, broken seals, skull counts, connection monitoring, and battery monitoring. Exact APIs and supported behavior must be verified against the selected library version during implementation. [github](https://github.com/ChessMess/UltimateDarkTower)

## 2. Goals and boundaries

### Goals

1. Demonstrate a reliable browser-to-tower connection.
2. Expose every supported, relevant capability of the selected library version.
3. Make hardware interactions observable and debuggable.
4. Clearly distinguish verified functionality from assumptions and unsupported features.
5. Provide a reusable foundation for a more complete controller application.

### Non-goals

- Reimplementing the official game’s battles, quests, campaigns, or rules.
- Modifying tower firmware.
- Discovering the entire undocumented Bluetooth protocol.
- Supporting multiple connected towers simultaneously.
- Providing cloud hosting, user accounts, or remote internet access.
- Claiming full hardware coverage simply because all library APIs have been exposed.

The official companion app includes gameplay systems beyond tower control, so this POC is a hardware controller and investigation tool—not an official-app replacement. [github](https://github.com/ChessMess/UltimateDarkTower)

## 3. Primary user and workflows

### Primary user

A technically comfortable tower owner or developer who wants to operate the hardware, inspect its behavior, and identify integration gaps.

### Core workflows

1. Open the local website, connect to the tower, and inspect connection status.
2. Navigate to a control page and invoke an available hardware function.
3. Observe the resulting state changes and Bluetooth activity.
4. Export a diagnostic session for troubleshooting.
5. Record an unsupported or partially working capability on the gap page.

## 4. POC architecture

### Selected approach

Use a React/TypeScript frontend with direct Web Bluetooth connectivity and an adapter around UltimateDarkTower.

```text
Local HTTPS development server
             │
             ▼
React / TypeScript application
             │
             ▼
Tower adapter + diagnostics instrumentation
             │
             ▼
UltimateDarkTower
             │
             ▼
Browser Web Bluetooth → Tower
```

The browser device must have Bluetooth access and be near the tower. Web Bluetooth requires a secure context, permission, and a user-initiated connection action. Browser compatibility is limited; the project documents Chrome and Edge among its supported options. [github](https://github.com/ChessMess/UltimateDarkTower)

### Scope decisions

- One browser tab owns the connection to one tower.
- The application is served locally; HTTPS setup for LAN access is documented.
- A server-side Bluetooth bridge is deferred.
- Hardware integration is isolated from UI components.
- A mock adapter supports UI development and tests without hardware.
- The selected library version is pinned and displayed in diagnostics.
- Missing raw-protocol visibility is recorded as a gap rather than hidden.

## 5. Navigation and pages

| Page         | Purpose                                                               |
| ------------ | --------------------------------------------------------------------- |
| Dashboard    | Connection, tower state, capability summary, and recent activity      |
| Lights       | All available lighting controls                                       |
| Sounds       | Available sound selection and playback controls                       |
| Mechanics    | Available drum/motor movement and positioning controls                |
| Tower State  | Available state inspection, tracking, and supported state operations  |
| Diagnostics  | Commands, responses, events, errors, and session export               |
| Feature Gaps | Known unsupported, partial, unverified, and unexposed capabilities    |
| Settings     | Logging preferences, application information, and local-data controls |

The final controls on each page come from the verified API inventory, not from assumptions about what the tower might support.

## 6. Functional requirements

### FR-01: Connection lifecycle

The application must:

- Provide an explicit Connect button that initiates browser device selection.
- Show connection states: unsupported environment, disconnected, selecting device, connecting, connected, disconnecting, and error.
- Display device name and browser-exposed identifier when available.
- Provide a Disconnect action.
- Handle device-selection cancellation without presenting it as a hardware failure.
- Detect unexpected disconnection and disable hardware controls.
- Provide actionable errors and a manual reconnect action.
- Never report successful connection before the adapter confirms it.

### FR-02: Capability inventory

Before implementing controls, create a version-specific inventory of the library’s public API.

Each capability must record:

| Field        | Description                                                  |
| ------------ | ------------------------------------------------------------ |
| ID           | Stable application identifier                                |
| Category     | Connection, lighting, sound, mechanics, state, or other      |
| API mapping  | Actual library method, property, or event                    |
| Parameters   | Types, accepted values, and verified constraints             |
| Availability | Available, partial, unavailable, or unknown                  |
| UI location  | Page/control exposing the capability                         |
| Verification | Untested, mock-tested, or hardware-verified                  |
| Evidence     | Library documentation, source reference, or test observation |

Every relevant public capability must either have a UI control or an explicit gap entry explaining its omission.

### FR-03: Lights

Expose every lighting operation supported by the selected library version.

Requirements:

- Provide controls generated from verified parameter definitions.
- Offer individual selection and grouped actions only where supported.
- Validate input before sending a command.
- Show command progress and result.
- Do not invent brightness, color, animation, or reset controls unless supported.
- Distinguish requested settings from confirmed hardware state.

### FR-04: Sounds

Expose every supported sound operation.

Requirements:

- Display available sound identifiers and verified names when known.
- Preserve numeric identifiers when descriptive names are unavailable.
- Provide playback and any other supported sound operations.
- Add filtering if the sound catalog is large.
- Disable volume, stop, or related controls when unsupported.
- Prevent repeated accidental submission while a command is pending.

### FR-05: Mechanics

Expose supported drum movement, rotation, positioning, calibration, or related operations only after verifying the APIs and their usage requirements.

Requirements:

- Clearly identify the target mechanism and requested action.
- Validate movement parameters.
- Show pending, completed, failed, and indeterminate results.
- Serialize commands that should not overlap.
- Require confirmation for operations identified during implementation as potentially disruptive.
- Never label an action “Stop” or “Emergency Stop” unless an actual corresponding hardware capability exists.

### FR-06: Tower state

Display all state available through the integration, including documented categories such as glyph positions, broken seals, skull counts, and battery information where exposed. [github](https://github.com/ChessMess/UltimateDarkTower)

Every value must include:

- Last-updated timestamp.
- Origin: device-reported, library-derived, application-maintained, or unknown.
- Freshness: current, stale, or unavailable.
- Verification status where interpretation remains uncertain.

Expose refresh or state-changing actions only where supported. Do not present application-maintained state as a confirmed physical measurement.

### FR-07: Command execution

All controls must use one command-execution layer.

It must:

- Assign a correlation ID to each command.
- Validate inputs.
- Record queued, started, and completed timestamps.
- Capture results and errors.
- Apply documented timeouts.
- Coordinate operations that cannot run concurrently.
- Distinguish “write completed” from “tower confirmed the action.”
- Avoid automatic retries for physical actions unless duplicate execution is known to be safe.

## 7. Diagnostics page

### FR-08: Event timeline

Provide a searchable, filterable timeline containing:

- Connection and disconnection events.
- Issued commands and parameters.
- Outgoing Bluetooth writes, when observable.
- Incoming responses and notifications, when observable.
- Parsed library events.
- State changes.
- Errors, timeouts, and warnings.

Each entry should include:

```text
Timestamp
Session ID
Correlation ID, when available
Direction: outbound / inbound / internal
Category and severity
Operation or event name
Service/characteristic identifiers, when exposed
Raw payload, when observable
Parsed representation, when available
Result or error details
```

Missing fields must be marked unavailable, not fabricated.

### FR-09: Raw and parsed inspection

- Show raw bytes in hexadecimal when accessible.
- Show structured parsed data alongside raw data.
- Allow copying an individual event.
- Preserve unknown responses without forcing an interpretation.
- Clearly identify whether an event came from the application, library, or transport.
- If the library hides raw Bluetooth traffic, instrument or wrap the accessible transport boundary where feasible.
- Record any remaining visibility limitation on the gap page.

### FR-10: Logging controls and export

Provide:

- Filters for direction, category, severity, operation, and correlation ID.
- Text search.
- Pause/resume of timeline rendering without confusing it with stopping capture.
- Clear-session action.
- Bounded in-memory retention.
- JSON export containing events, application/library version, browser information, capability inventory, and a state snapshot.
- A notice that exported diagnostics may contain device identifiers.

Raw command injection is out of scope for the initial POC. Diagnostics are observational; they must not introduce an unrestricted hardware-command console.

## 8. Feature-gap page

### FR-11: Gap register

Track these distinct gap types:

1. Known tower feature unsupported by the library.
2. Library feature not yet exposed by the website.
3. Partially working or inconsistent functionality.
4. Missing diagnostic visibility.
5. Unverified capability or protocol interpretation.
6. Browser/platform limitation.

Each entry must include:

| Field               | Description                                                                           |
| ------------------- | ------------------------------------------------------------------------------------- |
| Title and ID        | Short description and stable identifier                                               |
| Category            | Hardware, library, UI, diagnostics, or platform                                       |
| Description         | Expected versus observed behavior                                                     |
| Evidence            | Documentation, source reference, or diagnostic observation                            |
| Evidence confidence | Confirmed, inferred, or unverified                                                    |
| Status              | Unverified, confirmed gap, investigating, implemented, verified resolved, or deferred |
| Priority            | Low, medium, or high                                                                  |
| Affected version    | Library/application version                                                           |
| Reproduction steps  | When applicable                                                                       |
| Linked capability   | Related inventory entry                                                               |
| Resolution notes    | Fix, workaround, or reason for deferral                                               |

### FR-12: Gap management

- Seed entries from the implementation audit.
- Allow creating, editing, filtering, and resolving entries.
- Persist entries locally across page reloads.
- Support JSON import/export with schema validation.
- Preserve unsupported and unverified entries even when no workaround exists.
- Require evidence before labeling a feature as a confirmed tower capability.
- Do not label the inventory exhaustive unless its coverage has been independently established.

## 9. UX and operational requirements

- Persistent connection indicator on every page.
- Hardware actions disabled when disconnected.
- Clear inline errors; no silent command failures.
- Responsive layout for desktop and tablet use.
- Keyboard-accessible controls and descriptive labels.
- Explicit mock-mode banner.
- No automatic physical action on page load or reconnect.
- No remote telemetry or diagnostic upload in the POC.
- Local persistence limited to settings and gap records by default; diagnostic retention/export is user-controlled.
- A Settings action clears locally stored application data after confirmation.

## 10. Acceptance criteria

| Area                 | Acceptance criterion                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| Connection           | User can connect, disconnect, and manually reconnect on the documented target environment           |
| Coverage             | Every relevant API in the pinned-version inventory maps to a UI control or a gap entry              |
| Hardware controls    | Every claimed working control has a recorded hardware test                                          |
| State                | Values identify origin and freshness; unavailable values are not shown as zero                      |
| Diagnostics          | Every submitted command has a correlated lifecycle record                                           |
| Bluetooth visibility | Observable responses are captured; inaccessible responses are explicitly documented                 |
| Errors               | Permission rejection, cancellation, disconnect, timeout, and command failure have distinct handling |
| Gaps                 | Entries persist locally and can be imported/exported                                                |
| Export               | Diagnostic JSON includes version information, events, and a state snapshot                          |
| Mock mode            | Core navigation and workflows can be tested without a tower                                         |
| Local deployment     | Setup documentation covers the supported browser and secure local/LAN hosting                       |

## 11. Delivery plan

### Milestone 1: Integration discovery

Deliver:

- Pinned library version.
- API and event inventory.
- Initial capability matrix and gap register.
- Hardware connection spike.
- Raw-response observability assessment.

Exit condition: the team knows which controls and diagnostics are actually possible.

### Milestone 2: Application foundation

Deliver:

- Navigation and page shells.
- Real and mock adapters.
- Connection lifecycle.
- Command execution and logging.
- Local secure-hosting instructions.

### Milestone 3: Functional coverage

Deliver:

- Lights, sounds, mechanics, and tower-state pages.
- All verified library capabilities exposed.
- Hardware-test results attached to the capability inventory.

### Milestone 4: Diagnostics and gap management

Deliver:

- Filterable event timeline.
- Raw/parsed inspection where available.
- Diagnostic export.
- Persistent gap register and import/export.

### Milestone 5: POC validation

Deliver:

- Acceptance-test results.
- Known limitations.
- Setup and troubleshooting guide.
- Short demonstration covering connection, control, diagnostics, and a recorded gap.

## 12. Definition of done

The POC is complete when a user can run it locally, connect to a tower, exercise every verified capability exposed by the pinned library version, inspect the available command/response activity, and review a transparent register of everything unsupported or still unverified.

“All existing functionality” means complete coverage of the audited integration API—not an unsupported claim that every physical tower capability has been discovered or implemented.
