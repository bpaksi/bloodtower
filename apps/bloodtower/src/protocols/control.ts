import { z } from "zod";
import { deviceIdSchema, utcTimestampSchema } from "./devices.ts";

/**
 * The only controls accepted on a joined device.
 * Tower connect and calibrate are named presses. `pick` is a choice press on an iPad pick prompt,
 * and it carries the chosen option id. `set` changes one game setting on Game settings, and it
 * carries the setting id and the option id. `volume-play` starts (or repeats) the tower volume
 * test, and `volume-answer` gives its answer with an optional write-in note. There is no command
 * message and no raw bytes.
 * The server decides the winner by arrival order (step 5). This module is the record shape.
 */
export const CONTROL_ACTIONS = [
  "begin",
  "continue",
  "back",
  "pause",
  "resume",
  "quit",
  "tower-connect",
  "tower-calibrate",
  "pick",
  "set",
  "volume-play",
  "volume-answer",
] as const;
export const controlActionSchema = z.enum(CONTROL_ACTIONS);
export type ControlAction = z.infer<typeof controlActionSchema>;

/**
 * The flow screens, in order. The server holds the current one; no client sends it.
 * Splash is the first screen after load. Connect Tower follows Game settings (R3-UI-22), and a
 * story with `tower: none` skips it. The tower volume test (Proving Ground section 6a) follows
 * Connect Tower. Claim Hunters (`party-join`) is followed by one `setup` dialog per pack setup
 * step, then Begin (R3-UI-22, R2-50..52). Quit is the end once play has been quit.
 */
export const FLOW_SCREENS = [
  "splash",
  "pick-story",
  "game-settings",
  "not-playable",
  "tower-connect",
  "tower-volume-test",
  "party-join",
  "setup",
  "begin",
  "play",
  "quit",
] as const;
export const flowScreenSchema = z.enum(FLOW_SCREENS);
export type FlowScreen = z.infer<typeof flowScreenSchema>;

export const PROMPT_ID_MAX = 64;
export const promptIdSchema = z.string().regex(new RegExp(`^[A-Za-z0-9_-]{1,${PROMPT_ID_MAX}}$`));

/** The Choose prompt id on Pick Story is this prefix plus the story id. */
export const PICK_STORY_PROMPT_PREFIX = "continue-pick-story-";
/** Longest story id whose Choose prompt id still fits `promptIdSchema`. */
export const STORY_ID_MAX = PROMPT_ID_MAX - PICK_STORY_PROMPT_PREFIX.length;

/** Continue and Back on Game settings (R3-UI-22, R3-UI-37). */
export const GAME_SETTINGS_CONTINUE_ID = "continue-game-settings";
export const GAME_SETTINGS_BACK_ID = "back-game-settings";
/** Continue and Back on Connect Tower. Back never disconnects the tower. */
export const TOWER_CONNECT_CONTINUE_ID = "continue-tower-connect";
export const TOWER_CONNECT_BACK_ID = "back-tower-connect";
/** Continue and Back on Claim Hunters. Back keeps every claim. */
export const PARTY_JOIN_CONTINUE_ID = "continue-party-join";
export const PARTY_JOIN_BACK_ID = "back-party-join";
/**
 * Done and Back on a setup step dialog are these prefixes plus the step id, so each step is its
 * own first-press-wins lock (R-WIZ-6).
 */
export const SETUP_DONE_PREFIX = "continue-setup-";
export const SETUP_BACK_PREFIX = "back-setup-";
/** Longest setup step id whose Done prompt id still fits `promptIdSchema`. */
export const SETUP_STEP_ID_MAX = PROMPT_ID_MAX - SETUP_DONE_PREFIX.length;
/** Back on Begin returns to the last setup step, or to Claim Hunters when there is none. */
export const BEGIN_BACK_ID = "back-begin";
/** Continue and Back on the tower volume test. Back returns to Connect Tower. */
export const VOLUME_TEST_CONTINUE_ID = "continue-tower-volume-test";
export const VOLUME_TEST_BACK_ID = "back-tower-volume-test";
/**
 * Starting the level test is this prefix plus a serial. Each winning press moves the serial on,
 * so "Play again" is a fresh first-press-wins lock.
 */
export const VOLUME_PLAY_PROMPT_PREFIX = "volume-play-";
/** The one iPad answer to "Did the levels sound different?" (first press wins). */
export const VOLUME_ANSWER_PROMPT_ID = "volume-answer";
/** The answers to "Did the levels sound different?". Neutral wording (section 6a). */
export const VOLUME_ANSWERS = ["all-differ", "one-louder", "all-same", "write-in"] as const;
export const volumeAnswerSchema = z.enum(VOLUME_ANSWERS);
export type VolumeAnswer = z.infer<typeof volumeAnswerSchema>;
/** Longest write-in text. It is length-capped and never sent to other devices. */
export const VOLUME_NOTE_MAX = 200;
/**
 * A setting change on Game settings is this prefix plus a serial. Each winning change moves the
 * serial on, so the next change is a fresh first-press-wins lock.
 */
export const SET_PROMPT_PREFIX = "set-";

/** A pick option id from the pack's choices, such as `oil-the-hinge`. */
export const optionIdSchema = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);

const monoMs = z.number().refine((value) => Number.isFinite(value) && value >= 0, {
  message: "Expected a finite monotonic millisecond offset.",
});

/** One press, winning or losing. Both are logged, with the device and the screen it was made on. */
export const controlPressSchema = z.strictObject({
  promptId: promptIdSchema,
  action: controlActionSchema,
  deviceId: deviceIdSchema,
  atMonoMs: monoMs,
  atWall: utcTimestampSchema,
  winner: z.boolean(),
  /**
   * The screen the server held when the press arrived. A press that loses a batch to an
   * earlier press in the same batch arrives after the flow moved, so it records the new screen.
   * Null only on a press recorded before the flow state existed.
   */
  screen: flowScreenSchema.nullable(),
  /** The screen a winning press moved the flow to. Null when nothing moved. */
  nextScreen: flowScreenSchema.nullable(),
});
export type ControlPress = z.infer<typeof controlPressSchema>;

/** The locked result every screen shows after the first press. */
export const controlLockSchema = z.strictObject({
  promptId: promptIdSchema,
  action: controlActionSchema,
  winnerDeviceId: deviceIdSchema,
});
export type ControlLock = z.infer<typeof controlLockSchema>;
