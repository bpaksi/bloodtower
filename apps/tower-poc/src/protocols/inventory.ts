import { GLYPHS, TOWER_AUDIO_LIBRARY, TOWER_LIGHT_SEQUENCES } from "ultimatedarktowerdata";
import { z } from "zod";

/**
 * Capability inventory (spec §4, decision D13): one entry per thing a user or the UI can
 * invoke on the tower or observe from it. Later milestones generate controls and command
 * validation from this module, so it is the single place that says what the app offers.
 *
 * Three rules shape it:
 *
 * 1. This module never imports `ultimatedarktower`. The protocols package is bundled into
 *    the web UI and must not pull a Bluetooth library into the browser. Library members
 *    are named as strings in `apiMapping`; the coverage test in the server package
 *    (`inventoryCoverage.test.ts`) checks those names against the installed library.
 * 2. The `params` schemas are the only validation between a client and the tower. The
 *    library's own types are loose (`style: string`, plain `number`) and at 7.1.2 it
 *    either drops a bad value silently (an invalid sound index logs and resolves) or
 *    turns it into something else (an unknown light style becomes `off`). So every
 *    schema is a strict object, every number is a bounded integer and every name is an
 *    enum.
 * 3. No schema accepts raw bytes. The library's three raw senders have no entry; they are
 *    in `exclusions` (decision D12).
 *
 * Catalog ranges (sounds, light sequences, glyphs) are read from `ultimatedarktowerdata`
 * when this module loads, so a data update changes the schemas and the tests notice.
 */

/** The library version this inventory was written against. The coverage test compares it with the installed one. */
export const LIBRARY_BASELINE = { name: "ultimatedarktower", version: "7.1.2" } as const;

// ---------------------------------------------------------------------------
// Value schemas shared by the entries
// ---------------------------------------------------------------------------

/** Drum sides in rotation order. The index is the wire position `rotateDrumStateful` takes. */
export const towerSideSchema = z.enum(["north", "east", "south", "west"]);
/** Drum levels in wire order. The index is the drum index `rotateDrumStateful` takes. */
export const towerLevelSchema = z.enum(["top", "middle", "bottom"]);
export const towerCornerSchema = z.enum(["northeast", "southeast", "southwest", "northwest"]);
/**
 * Base lights have two rows. The library also accepts `a` and `b` as aliases for
 * `bottom` and `top`; the inventory offers one name per row.
 */
export const baseLightLevelSchema = z.enum(["top", "bottom"]);
/** The six light effects in the library's `LIGHT_EFFECTS`, by name. The service maps a name to its number. */
export const lightEffectSchema = z.enum([
  "off",
  "on",
  "breathe",
  "breatheFast",
  "breathe50percent",
  "flicker",
]);

export const sealSchema = z.strictObject({ side: towerSideSchema, level: towerLevelSchema });

/** LED layers: 0 top ring, 1 middle ring, 2 bottom ring, 3 ledge, 4 base 1, 5 base 2. */
export const LED_LAYER_COUNT = 6;
/** Every LED layer has four lights. */
export const LEDS_PER_LAYER = 4;
/** Volume levels the library accepts: 0 loud, 1 medium, 2 quiet, 3 mute. */
export const VOLUME_LEVEL_COUNT = 4;
/** `randomRotateLevels` modes: 0 all, 1 top, 2 middle, 3 bottom, 4 top+middle, 5 top+bottom, 6 middle+bottom. */
export const RANDOM_ROTATE_MODE_COUNT = 7;
/**
 * The drums `randomRotateLevels` can turn, by name, with the library's number for each.
 * The service translates a name to its number; a number is never accepted from a client,
 * so an untouched numeric field cannot mean "all drums" (0).
 */
export const RANDOM_ROTATE_DRUMS = {
  all: 0,
  top: 1,
  middle: 2,
  bottom: 3,
  "top-middle": 4,
  "top-bottom": 5,
  "middle-bottom": 6,
} as const;
export const randomRotateDrumsSchema = z.enum(
  Object.keys(RANDOM_ROTATE_DRUMS) as [
    keyof typeof RANDOM_ROTATE_DRUMS,
    ...(keyof typeof RANDOM_ROTATE_DRUMS)[],
  ],
);

/** Number of sounds in the catalog. Sound indexes are 1-based and run 1..SOUND_COUNT with no gaps (tested). */
export const SOUND_COUNT = Object.keys(TOWER_AUDIO_LIBRARY).length;

export const soundIndexSchema = z.int().min(1).max(SOUND_COUNT);
export const volumeSchema = z
  .int()
  .min(0)
  .max(VOLUME_LEVEL_COUNT - 1);

type LightSequenceName = keyof typeof TOWER_LIGHT_SEQUENCES;
/** Light sequences for `lightOverrides`, by catalog name. The service maps a name to its number. */
export const lightSequenceSchema = z.enum(
  Object.keys(TOWER_LIGHT_SEQUENCES) as [LightSequenceName, ...LightSequenceName[]],
);

type GlyphName = keyof typeof GLYPHS;
export const glyphSchema = z.enum(Object.keys(GLYPHS) as [GlyphName, ...GlyphName[]]);

const doorwayLightSchema = z.strictObject({
  position: towerSideSchema,
  level: towerLevelSchema,
  style: lightEffectSchema,
});
const ledgeLightSchema = z.strictObject({ position: towerCornerSchema, style: lightEffectSchema });
const baseLightSchema = z.strictObject({
  position: z.strictObject({ side: towerSideSchema, level: baseLightLevelSchema }),
  style: lightEffectSchema,
});

const sideCount = towerSideSchema.options.length;

const hasNoRepeat = (keys: readonly string[]) => new Set(keys).size === keys.length;

/**
 * Parameters of `lights()`. Each group is optional, but a command must name at least one
 * light, and may name each light once: the library applies a repeated light in order and
 * sends only the last, which would make the request ambiguous in the timeline.
 */
export const lightsParamsSchema = z
  .strictObject({
    doorway: z
      .array(doorwayLightSchema)
      .min(1)
      .max(sideCount * towerLevelSchema.options.length)
      .optional(),
    ledge: z.array(ledgeLightSchema).min(1).max(towerCornerSchema.options.length).optional(),
    base: z
      .array(baseLightSchema)
      .min(1)
      .max(sideCount * baseLightLevelSchema.options.length)
      .optional(),
  })
  .refine((lights) => Boolean(lights.doorway ?? lights.ledge ?? lights.base), {
    error: "Name at least one light.",
  })
  .refine(
    (lights) =>
      hasNoRepeat((lights.doorway ?? []).map((light) => `${light.level}/${light.position}`)) &&
      hasNoRepeat((lights.ledge ?? []).map((light) => light.position)) &&
      hasNoRepeat(
        (lights.base ?? []).map((light) => `${light.position.level}/${light.position.side}`),
      ),
    { error: "Each light may appear once in a command." },
  );

const rotateParamsSchema = z.strictObject({
  top: towerSideSchema,
  middle: towerSideSchema,
  bottom: towerSideSchema,
  soundIndex: soundIndexSchema.optional(),
});

const noParams = z.strictObject({});
const sealParams = z.strictObject({ seal: sealSchema });

// ---------------------------------------------------------------------------
// Entry shape
// ---------------------------------------------------------------------------

/**
 * How a capability reaches the UI.
 *
 * - `command`: a client invokes it with `command{capabilityId, params}`.
 * - `lifecycle`: a client invokes it with its own protocol message (`connect`,
 *   `disconnect`, `calibrate`; spec §3.2), not with `command`. It takes no parameters.
 * - `query`: the service reads it from the library and publishes the answer in `state`.
 *   `params` describes the library call's arguments. A client does not invoke a query
 *   through `command`.
 * - `event`: a library callback; the service turns it into `state` and `diag.event`.
 * - `property`: a read-only value on the tower object; the service publishes it in `state`.
 */
export const capabilityKindSchema = z.enum(["command", "lifecycle", "query", "event", "property"]);
export type CapabilityKind = z.infer<typeof capabilityKindSchema>;

/** The rows of the spec §4 table. `raw` is not a category: raw senders have no entry. */
export const capabilityCategorySchema = z.enum([
  "connection",
  "calibration",
  "lighting",
  "sound",
  "mechanics",
  "glyphs",
  "seals",
  "skulls",
  "battery",
  "state",
  "diagnostics",
]);
export type CapabilityCategory = z.infer<typeof capabilityCategorySchema>;

/**
 * Whether the app offers a capability. Every capability also needs a connected tower;
 * that is connection state, not availability, and is not repeated here.
 *
 * - `available`: offered as soon as the tower is connected.
 * - `requires-calibration`: offered only while the tower is connected and calibrated
 *   (decisions D9 and D10: mechanics and anything that depends on glyph or drum position).
 *   Before calibration the control is disabled and the value is shown as unavailable.
 * - `not-exposed`: the library has it and the app deliberately gives it no control and no
 *   view. `evidence` says why. It has no `uiLocation` and cannot be invoked.
 * - `unsupported`: the tower has it but the library has no method for it, so `apiMapping`
 *   is empty and it can only be reached through the raw senders, which the app never
 *   uses. It is listed so the capability summary and the generated capabilities document
 *   can account for it; it has no `uiLocation`, so the UI does not show it.
 *
 * The spec's "`availability ≠ unavailable`" (§3.2) means `available` or
 * `requires-calibration`; `isOffered` is that test.
 */
export const availabilitySchema = z.enum([
  "available",
  "requires-calibration",
  "not-exposed",
  "unsupported",
]);
export type Availability = z.infer<typeof availabilitySchema>;

/** The page (spec §5) that holds the capability's control or value. */
export const uiLocationSchema = z.enum([
  "dashboard",
  "lights",
  "sounds",
  "mechanics",
  "tower-state",
  "diagnostics",
  "settings",
]);
export type UiLocation = z.infer<typeof uiLocationSchema>;

/**
 * What the repo can claim about a capability. `hardware-verified` is not a value here: it
 * comes from the `verifications` table at runtime (decision D14). `mock-tested` may be set
 * only when a test drives the capability through the mock adapter.
 */
export const verificationSchema = z.enum(["untested", "mock-tested"]);
export type Verification = z.infer<typeof verificationSchema>;

export type Capability = {
  /** Stable id used in `command{capabilityId}`, verifications and gaps. Never reuse one. */
  readonly id: string;
  /** Short label for generated controls and the capabilities document. */
  readonly title: string;
  readonly kind: CapabilityKind;
  readonly category: CapabilityCategory;
  /** Public members of `UltimateDarkTower` this entry covers. Empty only for `unsupported`. */
  readonly apiMapping: readonly string[];
  /**
   * Validation for the parameters. An empty strict object when there are none. The service
   * hands the parsed output to the library, never the input it parsed.
   */
  readonly params: z.ZodObject;
  readonly availability: Availability;
  /** `null` when the app shows nothing for it. */
  readonly uiLocation: UiLocation | null;
  readonly verification: Verification;
  /** Where the claim comes from, and what is still unknown. */
  readonly evidence: string;
};

const TYPES = "UltimateDarkTower.d.ts at 7.1.2";
const NOTE = "research/tower/api-surface-7.1.2.md";

// ---------------------------------------------------------------------------
// The inventory
// ---------------------------------------------------------------------------

export const inventory = [
  // Connection
  {
    id: "connection.connect",
    title: "Connect",
    kind: "lifecycle",
    category: "connection",
    apiMapping: ["connect"],
    params: noParams,
    availability: "available",
    uiLocation: "dashboard",
    verification: "untested",
    evidence: `${TYPES}. In Node it scans for the device name; there is no picker (${NOTE}, finding 12). Always a user action (D10).`,
  },
  {
    id: "connection.disconnect",
    title: "Disconnect",
    kind: "lifecycle",
    category: "connection",
    apiMapping: ["disconnect"],
    params: noParams,
    availability: "available",
    uiLocation: "dashboard",
    verification: "untested",
    evidence: `${TYPES}.`,
  },
  {
    id: "connection.connected",
    title: "Connected",
    kind: "property",
    category: "connection",
    apiMapping: ["isConnected"],
    params: noParams,
    availability: "available",
    uiLocation: "dashboard",
    verification: "untested",
    evidence: `${TYPES}: synchronous getter.`,
  },
  {
    id: "connection.responsive",
    title: "Connected and responsive",
    kind: "query",
    category: "connection",
    apiMapping: ["isConnectedAndResponsive"],
    params: noParams,
    availability: "available",
    uiLocation: "dashboard",
    verification: "untested",
    evidence: `${TYPES}: asynchronous check of the link.`,
  },
  {
    id: "connection.status",
    title: "Connection status",
    kind: "query",
    category: "connection",
    apiMapping: ["getConnectionStatus"],
    params: noParams,
    availability: "available",
    uiLocation: "dashboard",
    verification: "untested",
    evidence: `${TYPES}: returns ConnectionStatus, including heartbeat details.`,
  },
  {
    id: "connection.device-information",
    title: "Device information",
    kind: "query",
    category: "connection",
    apiMapping: ["getDeviceInformation"],
    params: noParams,
    availability: "available",
    uiLocation: "dashboard",
    verification: "untested",
    evidence: `${TYPES}: read from the tower's Device Information Service on connect. A field the tower did not report is unavailable, not empty.`,
  },
  {
    id: "connection.on-connect",
    title: "Tower connected",
    kind: "event",
    category: "connection",
    apiMapping: ["onTowerConnect"],
    params: noParams,
    availability: "available",
    uiLocation: "dashboard",
    verification: "untested",
    evidence: `${TYPES}: callback property.`,
  },
  {
    id: "connection.on-disconnect",
    title: "Tower disconnected",
    kind: "event",
    category: "connection",
    apiMapping: ["onTowerDisconnect"],
    params: noParams,
    availability: "available",
    uiLocation: "dashboard",
    verification: "untested",
    evidence: `${TYPES}: callback property. The library names seven causes (${NOTE}, finding 12). No automatic reconnect follows (D10).`,
  },
  {
    id: "connection.set-monitoring",
    title: "Turn connection monitoring on or off",
    kind: "command",
    category: "connection",
    apiMapping: ["setConnectionMonitoring"],
    params: z.strictObject({ enabled: z.boolean() }),
    availability: "not-exposed",
    uiLocation: null,
    verification: "untested",
    evidence: `${TYPES}. Spec §5 has no control for it; the service keeps the library default (on). Turning it off would hide a lost tower.`,
  },
  {
    id: "connection.configure-monitoring",
    title: "Configure connection monitoring",
    kind: "command",
    category: "connection",
    apiMapping: ["configureConnectionMonitoring"],
    params: z.strictObject({
      frequency: z.int().min(500).max(60_000).optional(),
      timeout: z.int().min(1_000).max(120_000).optional(),
    }),
    availability: "not-exposed",
    uiLocation: null,
    verification: "untested",
    evidence: `${TYPES}: milliseconds, library defaults 2000 and 30000. Spec §5 has no control for it. The library documents no range; the bounds here are ours and untested.`,
  },
  {
    id: "connection.configure-battery-heartbeat",
    title: "Configure battery heartbeat monitoring",
    kind: "command",
    category: "connection",
    apiMapping: ["configureBatteryHeartbeatMonitoring"],
    params: z.strictObject({
      enabled: z.boolean().optional(),
      timeout: z.int().min(1_000).max(60_000).optional(),
      verifyConnection: z.boolean().optional(),
    }),
    availability: "not-exposed",
    uiLocation: null,
    verification: "untested",
    evidence: `${TYPES}: timeout in milliseconds, library default 3000. Spec §5 has no control for it. The library documents no range; the bounds here are ours and untested.`,
  },

  // Calibration
  {
    id: "calibration.calibrate",
    title: "Calibrate",
    kind: "lifecycle",
    category: "calibration",
    apiMapping: ["calibrate"],
    params: noParams,
    availability: "available",
    uiLocation: "dashboard",
    verification: "untested",
    evidence: `${TYPES}. Moves all three drums. Always an explicit user action (D9). While it runs the library drops every other command and still resolves it (${NOTE}, finding 2).`,
  },
  {
    id: "calibration.on-complete",
    title: "Calibration complete",
    kind: "event",
    category: "calibration",
    apiMapping: ["onCalibrationComplete"],
    params: noParams,
    availability: "available",
    uiLocation: "dashboard",
    verification: "untested",
    evidence: `${TYPES}: callback property.`,
  },
  {
    id: "calibration.calibrated",
    title: "Calibrated",
    kind: "property",
    category: "calibration",
    apiMapping: ["isCalibrated"],
    params: noParams,
    availability: "available",
    uiLocation: "dashboard",
    verification: "untested",
    evidence: `${TYPES}: synchronous getter.`,
  },
  {
    id: "calibration.in-progress",
    title: "Calibration in progress",
    kind: "property",
    category: "calibration",
    apiMapping: ["performingCalibration"],
    params: noParams,
    availability: "available",
    uiLocation: "dashboard",
    verification: "untested",
    evidence: `${TYPES}: synchronous getter. The executor must read it before sending a command (${NOTE}, finding 2).`,
  },

  // Lighting
  {
    id: "lighting.set",
    title: "Set lights",
    kind: "command",
    category: "lighting",
    apiMapping: ["lights", "Lights"],
    params: lightsParamsSchema,
    availability: "available",
    uiLocation: "lights",
    verification: "untested",
    evidence: `${TYPES}: \`Lights\` is the deprecated alias of \`lights\`; the service calls \`lights\`. The library turns an unknown style into off, so style is an enum here. Whether lights work before calibration is GAP-HW-001.`,
  },
  {
    id: "lighting.all-on",
    title: "All lights on",
    kind: "command",
    category: "lighting",
    apiMapping: ["allLightsOn"],
    params: z.strictObject({ effect: lightEffectSchema.optional() }),
    availability: "available",
    uiLocation: "lights",
    verification: "untested",
    evidence: `${TYPES}: the effect defaults to on. Whether it works before calibration is GAP-HW-001. The library sends this with sendTowerState to sendTowerCommandDirect, bypassing its command queue (no 250 ms spacing, no wait for a response), so the M2 executor must serialise it with the other commands itself.`,
  },
  {
    id: "lighting.all-off",
    title: "All lights off",
    kind: "command",
    category: "lighting",
    apiMapping: ["allLightsOff"],
    params: noParams,
    availability: "available",
    uiLocation: "lights",
    verification: "untested",
    evidence: `${TYPES}. Whether it works before calibration is GAP-HW-001. The library sends this with sendTowerState to sendTowerCommandDirect, bypassing its command queue (no 250 ms spacing, no wait for a response), so the M2 executor must serialise it with the other commands itself.`,
  },
  {
    id: "lighting.sequence",
    title: "Play a light sequence",
    kind: "command",
    category: "lighting",
    apiMapping: ["lightOverrides"],
    params: z.strictObject({
      sequence: lightSequenceSchema,
      soundIndex: soundIndexSchema.optional(),
    }),
    availability: "available",
    uiLocation: "lights",
    verification: "untested",
    evidence: `${TYPES}: the library takes any number; the names come from TOWER_LIGHT_SEQUENCES in ultimatedarktowerdata. Whether it works before calibration is GAP-HW-001.`,
  },
  {
    id: "lighting.set-led",
    title: "Set one LED",
    kind: "command",
    category: "lighting",
    apiMapping: ["setLED"],
    params: z.strictObject({
      layerIndex: z
        .int()
        .min(0)
        .max(LED_LAYER_COUNT - 1),
      lightIndex: z
        .int()
        .min(0)
        .max(LEDS_PER_LAYER - 1),
      effect: lightEffectSchema,
      loop: z.boolean().optional(),
    }),
    availability: "available",
    uiLocation: "lights",
    verification: "untested",
    evidence: `${TYPES}: the library takes plain numbers. Ranges from the method's documentation (${NOTE}, finding 10). Whether it works before calibration is GAP-HW-001.`,
  },

  // Sound
  {
    id: "sound.play",
    title: "Play a sound",
    kind: "command",
    category: "sound",
    apiMapping: ["playSound"],
    params: z.strictObject({ soundIndex: soundIndexSchema }),
    availability: "available",
    uiLocation: "sounds",
    verification: "untested",
    evidence: `${TYPES}: 1-based index into TOWER_AUDIO_LIBRARY. The library logs and resolves on an invalid index, and resolves when the sound starts; there is no completion signal (GAP-LIB-007). Whether it works before calibration is GAP-HW-001.`,
  },
  {
    id: "sound.play-stateful",
    title: "Play a sound with loop and volume",
    kind: "command",
    category: "sound",
    apiMapping: ["playSoundStateful"],
    params: z.strictObject({
      soundIndex: soundIndexSchema,
      loop: z.boolean().optional(),
      volume: volumeSchema.optional(),
    }),
    availability: "available",
    uiLocation: "sounds",
    verification: "untested",
    evidence: `${TYPES}: the library clamps volume to 0..3; this schema rejects instead. What the levels do on the tower is GAP-HW-003. No way to stop a looped sound is documented.`,
  },

  // Mechanics
  {
    id: "mechanics.rotate",
    title: "Rotate drums",
    kind: "command",
    category: "mechanics",
    apiMapping: ["Rotate"],
    params: rotateParamsSchema,
    availability: "requires-calibration",
    uiLocation: "mechanics",
    verification: "untested",
    evidence: `${TYPES}. Mechanics need calibration (D9). No stop or abort exists (GAP-HW-004).`,
  },
  {
    id: "mechanics.rotate-with-state",
    title: "Rotate drums, keeping lights",
    kind: "command",
    category: "mechanics",
    apiMapping: ["rotateWithState"],
    params: rotateParamsSchema,
    availability: "requires-calibration",
    uiLocation: "mechanics",
    verification: "untested",
    evidence: `${TYPES}: the library's recommended rotate; it keeps LEDs and other state. Mechanics need calibration (D9). No stop or abort exists (GAP-HW-004).`,
  },
  {
    id: "mechanics.rotate-drum",
    title: "Rotate one drum",
    kind: "command",
    category: "mechanics",
    apiMapping: ["rotateDrumStateful"],
    params: z.strictObject({
      drumIndex: z
        .int()
        .min(0)
        .max(towerLevelSchema.options.length - 1),
      position: z
        .int()
        .min(0)
        .max(sideCount - 1),
      playSound: z.boolean().optional(),
    }),
    availability: "requires-calibration",
    uiLocation: "mechanics",
    verification: "untested",
    evidence: `${TYPES}: drumIndex is an index into the levels (top, middle, bottom) and position into the sides (north, east, south, west). Mechanics need calibration (D9). No stop or abort exists (GAP-HW-004).`,
  },
  {
    id: "mechanics.random-rotate",
    title: "Rotate drums at random",
    kind: "command",
    category: "mechanics",
    apiMapping: ["randomRotateLevels"],
    params: z.strictObject({ drums: randomRotateDrumsSchema }),
    availability: "requires-calibration",
    uiLocation: "mechanics",
    verification: "untested",
    evidence: `${TYPES}: the library takes 0 all, 1 top, 2 middle, 3 bottom, 4 top and middle, 5 top and bottom, 6 middle and bottom (RANDOM_ROTATE_DRUMS maps the names to these). The library defaults to 0; drums is a required name here so that "all drums" is never implied. The UI asks for confirmation (spec §5).`,
  },
  {
    id: "mechanics.drum-position",
    title: "Drum position",
    kind: "query",
    category: "mechanics",
    apiMapping: ["getCurrentDrumPosition"],
    params: z.strictObject({ level: towerLevelSchema }),
    availability: "requires-calibration",
    uiLocation: "mechanics",
    verification: "untested",
    evidence: `${TYPES}. Before calibration the library reports north for every drum whatever its real position, so the value is unavailable until calibrated, never north.`,
  },
  {
    id: "mechanics.long-command-in-progress",
    title: "Long command in progress",
    kind: "property",
    category: "mechanics",
    apiMapping: ["performingLongCommand"],
    params: noParams,
    availability: "available",
    uiLocation: "mechanics",
    verification: "untested",
    evidence: `${TYPES}: true while a drum rotation is under way; the library clears it on a timer, not on a tower signal.`,
  },
  {
    id: "mechanics.unjam-drums",
    title: "Unjam drums",
    kind: "command",
    category: "mechanics",
    apiMapping: [],
    params: noParams,
    availability: "unsupported",
    uiLocation: null,
    verification: "untested",
    evidence: `TOWER_COMMANDS.unjamDrums exists in udtConstants.d.ts but no public method sends it (${NOTE}, finding 6). GAP-LIB-005. A jam is still reported in tower state.`,
  },
  {
    id: "mechanics.door-reset",
    title: "Door reset",
    kind: "command",
    category: "mechanics",
    apiMapping: [],
    params: noParams,
    availability: "unsupported",
    uiLocation: null,
    verification: "untested",
    evidence: `TOWER_COMMANDS.doorReset exists in udtConstants.d.ts but no public method sends it (${NOTE}, finding 6). GAP-LIB-004. What it does on the tower is not documented.`,
  },
  {
    id: "mechanics.overwrite-drum-states",
    title: "Overwrite drum states",
    kind: "command",
    category: "mechanics",
    apiMapping: [],
    params: noParams,
    availability: "unsupported",
    uiLocation: null,
    verification: "untested",
    evidence: `TOWER_COMMANDS.overwriteDrumStates exists in udtConstants.d.ts but no public method sends it (${NOTE}, finding 6). GAP-LIB-006.`,
  },

  // Glyphs
  {
    id: "glyphs.position",
    title: "Glyph position",
    kind: "query",
    category: "glyphs",
    apiMapping: ["getGlyphPosition"],
    params: z.strictObject({ glyph: glyphSchema }),
    availability: "requires-calibration",
    uiLocation: "tower-state",
    verification: "untested",
    evidence: `${TYPES}: null until calibrated. Computed by the library from calibration and the rotations it sent, so the origin is library-derived, not device-reported (${NOTE}, finding 7).`,
  },
  {
    id: "glyphs.all-positions",
    title: "All glyph positions",
    kind: "query",
    category: "glyphs",
    apiMapping: ["getAllGlyphPositions"],
    params: noParams,
    availability: "requires-calibration",
    uiLocation: "tower-state",
    verification: "untested",
    evidence: `${TYPES}: each value is null until calibrated. Library-derived (${NOTE}, finding 7).`,
  },
  {
    id: "glyphs.facing",
    title: "Glyphs facing a side",
    kind: "query",
    category: "glyphs",
    apiMapping: ["getGlyphsFacingDirection"],
    params: z.strictObject({ direction: towerSideSchema }),
    availability: "requires-calibration",
    uiLocation: "tower-state",
    verification: "untested",
    evidence: `${TYPES}. Library-derived (${NOTE}, finding 7). An empty list before calibration means unknown, not none.`,
  },

  // Seals
  {
    id: "seals.break",
    title: "Break a seal",
    kind: "command",
    category: "seals",
    apiMapping: ["breakSeal"],
    params: z.strictObject({ seal: sealSchema }),
    availability: "available",
    uiLocation: "tower-state",
    verification: "untested",
    evidence: `${TYPES}. At 7.1.2 it plays the sealReveal light sequence and the TowerSeal sound and records the seal in software; the packet does not depend on which seal is named (udtTowerCommands.js). It moves nothing, so D9 does not gate it. There is no volume parameter: the library accepts one but overwrites the audio volume with 0 before packing, so it never reaches the wire, and it sends an extra full-state packet when the volume is 1 to 3 (udtTowerCommands.js). Volume is GAP-HW-003.`,
  },
  {
    id: "seals.mark-broken",
    title: "Mark a seal broken",
    kind: "command",
    category: "seals",
    apiMapping: ["markSealBroken"],
    params: sealParams,
    availability: "available",
    uiLocation: "tower-state",
    verification: "untested",
    evidence: `${TYPES}: software tracking only; nothing is sent to the tower (GAP-HW-002).`,
  },
  {
    id: "seals.mark-restored",
    title: "Mark a seal restored",
    kind: "command",
    category: "seals",
    apiMapping: ["markSealRestored"],
    params: sealParams,
    availability: "available",
    uiLocation: "tower-state",
    verification: "untested",
    evidence: `${TYPES}: software tracking only; nothing is sent to the tower (GAP-HW-002).`,
  },
  {
    id: "seals.reset",
    title: "Clear all broken seals",
    kind: "command",
    category: "seals",
    apiMapping: ["resetBrokenSeals"],
    params: noParams,
    availability: "available",
    uiLocation: "tower-state",
    verification: "untested",
    evidence: `${TYPES}: software tracking only; nothing is sent to the tower (GAP-HW-002).`,
  },
  {
    id: "seals.is-broken",
    title: "Seal broken",
    kind: "query",
    category: "seals",
    apiMapping: ["isSealBroken"],
    params: sealParams,
    availability: "available",
    uiLocation: "tower-state",
    verification: "untested",
    evidence: `${TYPES}. Application-maintained: the firmware does not track seals (GAP-HW-002).`,
  },
  {
    id: "seals.broken",
    title: "Broken seals",
    kind: "query",
    category: "seals",
    apiMapping: ["getBrokenSeals"],
    params: noParams,
    availability: "available",
    uiLocation: "tower-state",
    verification: "untested",
    evidence: `${TYPES}. Application-maintained: the firmware does not track seals (GAP-HW-002).`,
  },
  {
    id: "seals.random-unbroken",
    title: "Pick a random unbroken seal",
    kind: "query",
    category: "seals",
    apiMapping: ["getRandomUnbrokenSeal"],
    params: noParams,
    availability: "available",
    uiLocation: "tower-state",
    verification: "untested",
    evidence: `${TYPES}: null when every seal is broken. Reads software tracking only; it does not break the seal.`,
  },

  // Skulls
  {
    id: "skulls.reset-count",
    title: "Reset skull count",
    kind: "command",
    category: "skulls",
    apiMapping: ["resetTowerSkullCount"],
    params: noParams,
    availability: "available",
    uiLocation: "tower-state",
    verification: "untested",
    evidence: `${TYPES}: sends the firmware's resetCounter command.`,
  },
  {
    id: "skulls.on-drop",
    title: "Skull dropped",
    kind: "event",
    category: "skulls",
    apiMapping: ["onSkullDrop"],
    params: noParams,
    availability: "available",
    uiLocation: "tower-state",
    verification: "untested",
    evidence: `${TYPES}: callback with the new count.`,
  },
  {
    id: "skulls.count",
    title: "Skull count",
    kind: "property",
    category: "skulls",
    apiMapping: ["towerSkullDropCount"],
    params: noParams,
    availability: "available",
    uiLocation: "tower-state",
    verification: "untested",
    evidence: `${TYPES}: the count the firmware reports. The library holds -1 until the tower has reported one; that is unavailable, never a count.`,
  },

  // Battery
  {
    id: "battery.on-level",
    title: "Battery reading",
    kind: "event",
    category: "battery",
    apiMapping: ["onBatteryLevelNotify"],
    params: noParams,
    availability: "available",
    uiLocation: "tower-state",
    verification: "untested",
    evidence: `${TYPES}: callback with millivolts, about every 200 ms (${NOTE}, finding 12).`,
  },
  {
    id: "battery.level",
    title: "Battery level",
    kind: "property",
    category: "battery",
    apiMapping: [
      "currentBattery",
      "currentBatteryValue",
      "currentBatteryPercent",
      "currentBatteryPercentage",
    ],
    params: noParams,
    availability: "available",
    uiLocation: "tower-state",
    verification: "untested",
    evidence: `${TYPES}: millivolts and percent, each as a getter and as a plain field holding the same value. The fields start at 0 before any reading, which is unavailable, not an empty battery.`,
  },
  {
    id: "battery.previous-level",
    title: "Previous battery level",
    kind: "property",
    category: "battery",
    apiMapping: [
      "previousBattery",
      "previousBatteryValue",
      "previousBatteryPercent",
      "previousBatteryPercentage",
    ],
    params: noParams,
    availability: "available",
    uiLocation: "tower-state",
    verification: "untested",
    evidence: `${TYPES}: the reading before the current one, in the same four forms. Starts at 0 before two readings exist, which is unavailable.`,
  },

  // State
  {
    id: "state.current",
    title: "Tower state",
    kind: "query",
    category: "state",
    apiMapping: ["getCurrentTowerState"],
    params: noParams,
    availability: "available",
    uiLocation: "tower-state",
    verification: "untested",
    evidence: `${TYPES}: drums (jammed, calibrated, position), beam, audio and 24 lights (${NOTE}, finding 7). The library holds a default state before the tower reports one; that default is unavailable, not a reading.`,
  },
  {
    id: "state.on-update",
    title: "Tower state updated",
    kind: "event",
    category: "state",
    apiMapping: ["onTowerStateUpdate"],
    params: noParams,
    availability: "available",
    uiLocation: "tower-state",
    verification: "untested",
    evidence: `${TYPES}: callback with the new state, the old state and a source string that tells a tower response from a command the library sent.`,
  },
  {
    id: "state.on-response",
    title: "Tower response received",
    kind: "event",
    category: "state",
    apiMapping: ["onTowerResponse"],
    params: noParams,
    availability: "available",
    uiLocation: "diagnostics",
    verification: "untested",
    evidence: `${TYPES}: callback with the bytes of every non-battery notification. These are bytes from the tower, shown as hex in the timeline; nothing here sends bytes to it (${NOTE}, finding 11).`,
  },

  // Diagnostics
  {
    id: "diagnostics.last-incident",
    title: "Last disconnect incident",
    kind: "query",
    category: "diagnostics",
    apiMapping: ["getLastIncident"],
    params: noParams,
    availability: "available",
    uiLocation: "diagnostics",
    verification: "untested",
    evidence: `${TYPES}: null when no incident was captured since the tower object was created.`,
  },
  {
    id: "diagnostics.export",
    title: "Export library diagnostics",
    kind: "query",
    category: "diagnostics",
    apiMapping: ["exportDiagnosticsJSON"],
    params: noParams,
    availability: "available",
    uiLocation: "diagnostics",
    verification: "untested",
    evidence: `${TYPES}: the recorder's ring buffer and last incident as JSON. Embedded in the app's own export (D16).`,
  },
] as const satisfies readonly Capability[];

export type CapabilityId = (typeof inventory)[number]["id"];

/** The parsed parameters of one capability, for the service's handler table. */
export type CapabilityParams<Id extends CapabilityId> = z.infer<
  Extract<(typeof inventory)[number], { id: Id }>["params"]
>;

const byId: ReadonlyMap<string, Capability> = new Map(inventory.map((entry) => [entry.id, entry]));

/** Looks up a capability by an id that came from a client, so it may not exist. */
export const findCapability = (id: string): Capability | undefined => byId.get(id);

/** True when the app offers the capability at all: the spec's "`availability ≠ unavailable`". */
export const isOffered = (capability: Capability): boolean =>
  capability.availability === "available" || capability.availability === "requires-calibration";

/**
 * True when `command{capabilityId, params}` may name this capability (spec §3.2): it is a
 * command, the app offers it and a page holds its control. Whether the tower is connected
 * and calibrated right now is the executor's check, not this one.
 */
export const isCommandable = (capability: Capability): boolean =>
  capability.kind === "command" && isOffered(capability) && capability.uiLocation !== null;

// ---------------------------------------------------------------------------
// Exclusions
// ---------------------------------------------------------------------------

/**
 * Why a public library member has no inventory entry.
 *
 * - `raw-bytes`: it sends a caller-built packet or whole state to the tower. Never offered (D12).
 * - `service-internal`: the service calls it as plumbing; it is not something a user does.
 * - `logging`: it only changes what the library writes to its log.
 * - `helper`: a pure function with no tower behind it.
 */
export const exclusionKindSchema = z.enum(["raw-bytes", "service-internal", "logging", "helper"]);
export type ExclusionKind = z.infer<typeof exclusionKindSchema>;

export type Exclusion = {
  /** A public member of `UltimateDarkTower`. */
  readonly member: string;
  readonly kind: ExclusionKind;
  readonly reason: string;
  /** The gap in spec §7 that tracks it, when there is one. */
  readonly gapId?: string;
};

/**
 * Every public member of `UltimateDarkTower` that no inventory entry maps. This is the
 * answer to "why is X not in the UI". The coverage test fails when a public member is in
 * neither list, in both, or named here without existing in the library.
 */
export const exclusions: readonly Exclusion[] = [
  {
    member: "sendTowerCommandDirect",
    kind: "raw-bytes",
    reason: "Sends a caller-built packet. No message type may carry raw bytes to the tower (D12).",
    gapId: "GAP-LIB-001",
  },
  {
    member: "sendTowerCommand",
    kind: "raw-bytes",
    reason: "Sends a caller-built packet. No message type may carry raw bytes to the tower (D12).",
    gapId: "GAP-LIB-002",
  },
  {
    member: "sendTowerState",
    kind: "raw-bytes",
    reason:
      "Writes a whole caller-built tower state, which can set anything a packet can, with no per-field validation (D12).",
    gapId: "GAP-LIB-003",
  },
  {
    member: "commandToPacketString",
    kind: "helper",
    reason:
      "Formats a packet as hex for debugging. It takes a packet, and the timeline has its own hex view.",
  },
  {
    member: "milliVoltsToPercentage",
    kind: "helper",
    reason:
      "Converts millivolts to a percent string. The battery.level entry already carries the percent.",
  },
  {
    member: "cleanup",
    kind: "service-internal",
    reason:
      "Final and irreversible: the tower object cannot connect again. The service calls it on shutdown only.",
  },
  {
    member: "getDiagnosticsRecorder",
    kind: "service-internal",
    reason: "The service reads the recorder to feed the app's own timeline (D16).",
  },
  {
    member: "setDiagnosticsEnabled",
    kind: "service-internal",
    reason:
      "The service decides whether the recorder runs, because it feeds the app's timeline (D16). There is no client toggle.",
  },
  {
    member: "isDiagnosticsEnabled",
    kind: "service-internal",
    reason: "Read by the service only; see setDiagnosticsEnabled.",
  },
  {
    member: "setLoggerOutputs",
    kind: "service-internal",
    reason: "The service points the library's logger at the app's timeline (D16).",
  },
  {
    member: "retrySendCommandMax",
    kind: "service-internal",
    reason:
      "How often the library re-sends a failed write; the default is 5. A safety setting the service owns, never a client control. The service sets it to 0 (spec D21).",
  },
  {
    member: "logDetail",
    kind: "logging",
    reason: "Verbosity of the library's log. Set by the service from its logging setting.",
  },
  {
    member: "logTowerResponses",
    kind: "logging",
    reason: "Whether the library logs tower responses. Set by the service.",
  },
  {
    member: "logTowerResponseConfig",
    kind: "logging",
    reason: "Which tower responses the library logs. Set by the service.",
  },
  {
    member: "batteryLogFrequency",
    kind: "logging",
    reason:
      "How often the library logs the battery. The battery event fires regardless of this setting.",
  },
  {
    member: "batteryLogOnChangeOnly",
    kind: "logging",
    reason: "Whether the library logs the battery only when it changes.",
  },
  {
    member: "batteryLogEnabled",
    kind: "logging",
    reason: "Whether the library logs the battery at all.",
  },
];
