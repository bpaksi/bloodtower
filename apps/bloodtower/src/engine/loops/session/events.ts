import { z } from "zod";
import { pressEventV1 } from "../../events.ts";
import { towerSnapshotSchema } from "./towerSnapshot.ts";

export const startSessionEventV1 = z.object({
  kind: z.literal("start-session"),
  v: z.literal(1),
  seed: z.string(),
  sessionId: z.string(),
});

export const towerSnapshotEventV1 = z.object({
  kind: z.literal("tower-snapshot"),
  v: z.literal(1),
  tower: towerSnapshotSchema,
});

export const deviceJoinEventV1 = z.object({
  kind: z.literal("device-join"),
  v: z.literal(1),
  deviceId: z.string().min(1),
});

export const deviceDropEventV1 = z.object({
  kind: z.literal("device-drop"),
  v: z.literal(1),
  deviceId: z.string().min(1),
});

export const heroHoldEventV1 = z.object({
  kind: z.literal("hero-hold"),
  v: z.literal(1),
  deviceId: z.string().min(1),
  heroId: z.string().min(1),
  action: z.enum(["take", "release"]),
});

export const focusStoryEventV1 = z.object({
  kind: z.literal("focus-story"),
  v: z.literal(1),
  deviceId: z.string().min(1),
  storyId: z.string().min(1),
});

export const setSettingEventV1 = z.object({
  kind: z.literal("set-setting"),
  v: z.literal(1),
  deviceId: z.string().min(1),
  settingId: z.string().min(1),
  optionId: z.string().min(1),
});

/**
 * How a tower command the Enter sent ended. The host appends it after the command settles,
 * so a failed connect or calibrate loops back to the tower choice (MEC-039 .11).
 */
export const towerResultEventV1 = z.object({
  kind: z.literal("tower-result"),
  v: z.literal(1),
  capabilityId: z.enum(["tower.connect", "tower.calibrate"]),
  ok: z.boolean(),
});

// Retired (DEC-903): no iPad plays sound, so nothing sends this now. It stays parseable so an old
// saved event log still loads; stepShell ignores it in its own branch with one debug line.
export const soundUnlockEventV1 = z.object({
  kind: z.literal("sound-unlock"),
  v: z.literal(1),
  deviceId: z.string().min(1),
});

// An iPad pressed one volume. The tower plays Dungeon Complete at it only on this press (SCR-006).
export const volumePlayEventV1 = z.object({
  kind: z.literal("volume-play"),
  v: z.literal(1),
  deviceId: z.string().min(1),
  level: z.number().int().min(0).max(2),
});

// How the tower's Dungeon Complete at that volume ended. The host appends it.
export const volumeResultEventV1 = z.object({
  kind: z.literal("volume-result"),
  v: z.literal(1),
  deviceId: z.string().min(1),
  level: z.number().int().min(0).max(2),
  ok: z.boolean(),
});

// Keep the volume last played, or Try another.
export const volumeAnswerEventV1 = z.object({
  kind: z.literal("volume-answer"),
  v: z.literal(1),
  deviceId: z.string().min(1),
  answer: z.enum(["keep", "again"]),
});

export const gearEventV1 = z.object({
  kind: z.literal("gear"),
  v: z.literal(1),
  deviceId: z.string().min(1),
  action: z.enum(["open", "pick", "done", "keep-volume", "try-another", "step-back"]),
  item: z.string().min(1).max(64).optional(),
  pick: z.string().min(1).max(80).optional(),
  heroId: z.string().min(1).max(80).optional(),
  otherHeroId: z.string().min(1).max(80).optional(),
  volume: z.number().int().min(0).max(2).optional(),
});

/** The hint on the board has been up for `AUTO_ADVANCE_MS`. The host appends it from its timer. */
export const hintEndEventV1 = z.object({
  kind: z.literal("hint-end"),
  v: z.literal(1),
  hintId: z.string().min(1).max(64),
});

/**
 * The day loop's effects wait is over (C3/20). The host appends it from the narration's audio-end
 * event, or from its 4 s timer when the panel has no audio. It is logged, so a replay applies it once.
 */
export const waitEndEventV1 = z.object({
  kind: z.literal("wait-end"),
  v: z.literal(1),
  waitId: z.string().min(1).max(80),
  cause: z.enum(["audio-end", "timeout"]),
});

/**
 * TEST ONLY (C3/20). The test-seed markers set on a running game. Only a host built for tests
 * writes it, so a replay of a test game sees the same seed once; a real game's log never holds it.
 */
export const testSeedEventV1 = z.object({
  kind: z.literal("test-seed"),
  v: z.literal(1),
  markers: z.string().min(1).max(600),
});

/**
 * Continue started the piece check (C2-11). Logged so a host restart mid-check rebuilds the exact
 * step and confirmed/skipped progress from the event log (EV-12, EV-24).
 */
export const pieceCheckStartEventV1 = z.object({
  kind: z.literal("piece-check-start"),
  v: z.literal(1),
  towerInPlay: z.boolean(),
});

/**
 * How one `mechanics.rotate-drum` command during step 5 ended (DEC-716, EV-06, EV-15).
 * Appended by the host after the rotate settles so replay rebuilds exact drum positions.
 */
export const pieceCheckDrumResultEventV1 = z.object({
  kind: z.literal("piece-check-drum-result"),
  v: z.literal(1),
  drumIndex: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  position: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  ok: z.boolean(),
  deviceId: z.string().min(1).optional(),
});

export const shellEventSchema = z.discriminatedUnion("kind", [
  startSessionEventV1,
  pressEventV1,
  towerSnapshotEventV1,
  deviceJoinEventV1,
  deviceDropEventV1,
  heroHoldEventV1,
  focusStoryEventV1,
  setSettingEventV1,
  towerResultEventV1,
  soundUnlockEventV1,
  volumePlayEventV1,
  volumeResultEventV1,
  volumeAnswerEventV1,
  gearEventV1,
  hintEndEventV1,
  waitEndEventV1,
  testSeedEventV1,
  pieceCheckStartEventV1,
  pieceCheckDrumResultEventV1,
]);

export type ShellEvent = z.infer<typeof shellEventSchema>;
