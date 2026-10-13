// The M1 hardware spike as a list of steps and a runner (plan M1 steps 5 and 6).
// This file holds no Bluetooth code and imports nothing that loads it: the runner is handed a tower
// object, a way to ask the person at the tower, and a log. `spike.ts` supplies the real ones.
//
// Safety rules the runner keeps (CLAUDE.md, tower safety):
// - Nothing is sent until the person confirms that step. Skipping is always offered.
// - Nothing is retried. A step that fails is logged and the run moves on.
// - A step that times out ends the run. The library may still be holding that command, and
//   disconnecting is what clears its queue, so nothing confirmed earlier can be written later.
// - While the tower is calibrating the library drops every other command and still reports
//   success (D22), so the runner skips a step instead of sending it.
// - Whatever happens, the run ends by disconnecting.

export type Side = "north" | "east" | "south" | "west";

/** The part of the library's tower object that the spike uses. */
export type SpikeTower = {
  retrySendCommandMax: number;
  readonly isConnected: boolean;
  readonly isCalibrated: boolean;
  readonly performingCalibration: boolean;
  onCalibrationComplete: () => void;
  onSkullDrop: (count: number) => void;
  onBatteryLevelNotify: (millivolts: number) => void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  cleanup(): Promise<void>;
  getDeviceInformation(): Record<string, unknown>;
  calibrate(): Promise<void>;
  playSound(soundIndex: number): Promise<void>;
  playSoundStateful(soundIndex: number, loop?: boolean, volume?: number): Promise<void>;
  allLightsOn(effect?: number): Promise<void>;
  allLightsOff(): Promise<void>;
  lightOverrides(light: number, soundIndex?: number): Promise<void>;
  breakSeal(seal: { side: Side; level: "top" | "middle" | "bottom" }): Promise<void>;
  rotateWithState(top: Side, middle: Side, bottom: Side): Promise<void>;
  Rotate(top: Side, middle: Side, bottom: Side): Promise<void>;
  randomRotateLevels(level?: number): Promise<void>;
};

export type Answer = "run" | "skip" | "quit";

export type SpikeIo = {
  /** Asks whether to run a step. Must not resolve to "run" unless the person said so. */
  confirm(prompt: string): Promise<Answer>;
  /** Asks what the person saw or heard. Free text. */
  observe(question: string): Promise<string>;
  say(line: string): void;
  log(record: Record<string, unknown>): void;
  wait(ms: number): Promise<void>;
};

export type StepResult = "passed" | "failed" | "timed-out" | "skipped";

type Context = { tower: SpikeTower; io: SpikeIo; catalog: SpikeCatalog };

export type SpikeStep = {
  id: string;
  title: string;
  /** What the person is told before being asked to confirm. */
  warning: string;
  /** Spec gap this step gives evidence for, if any. */
  gap?: string;
  /** Skipped unless the tower reports calibrated, with this reason logged. */
  needsCalibration?: boolean;
  run(context: Context): Promise<void>;
  /** Questions asked after the step ran, whether or not it failed. */
  observe: string[];
  /** Questions asked once the tower is disconnected, if this step ran. */
  afterDisconnect?: string[];
};

/** Numbers the steps need from the data package, so this file does not import it. */
export type SpikeCatalog = {
  soundIndex: number;
  /** A second, different sound, so a replay can be told apart from a loop. */
  otherSoundIndex: number;
  lightEffectOn: number;
  rotationSequences: { name: string; value: number }[];
};

/**
 * Longer than the 30 seconds the library's own queue waits for a response before it rejects a
 * command. By the time this fires the library has given the command up, so none is left queued.
 */
export const COMMAND_TIMEOUT_MS = 35_000;
/** Covers sending the calibration command and waiting for the tower to finish, as one limit. */
export const CALIBRATION_TIMEOUT_MS = 120_000;
/** `randomRotateLevels(1)` turns the top drum only. */
const RANDOM_ROTATE_TOP_ONLY = 1;
/** The library's advice is 300–500 ms between commands that move drums or play long audio. */
const BETWEEN_COMMANDS_MS = 500;
export const WATCH_MS = 60_000;

class StepTimeout extends Error {}

const within = async <T>(ms: number, what: string, work: Promise<T>): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new StepTimeout(`${what} did not finish in ${ms} ms`)), ms);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

const send = (what: string, work: Promise<void>) => within(COMMAND_TIMEOUT_MS, what, work);

const DRUM_QUESTION = "Did any drum move? (yes/no, and which)";

export const SPIKE_STEPS: SpikeStep[] = [
  {
    id: "connect",
    title: "Connect to the tower",
    warning: "The Mac will scan for the tower and connect. Switch the tower on and keep it nearby.",
    run: async ({ tower }) => {
      await within(60_000, "connect", tower.connect());
    },
    observe: ["Did macOS ask for Bluetooth permission? Anything else on connect?"],
  },
  {
    id: "device-info",
    title: "Read device information",
    warning: "Reads the tower's device information. Nothing moves.",
    run: async ({ tower, io }) => {
      io.log({ type: "device-info", info: redactDeviceInformation(tower.getDeviceInformation()) });
    },
    observe: [],
  },
  {
    id: "pre-calibration-lights",
    title: "Lights before calibration (GAP-HW-001)",
    gap: "GAP-HW-001",
    warning: "Turns every light on, waits, then turns them off. The tower is NOT calibrated yet.",
    run: async ({ tower, io, catalog }) => {
      await send("allLightsOn", tower.allLightsOn(catalog.lightEffectOn));
      await io.wait(2_000);
      await send("allLightsOff", tower.allLightsOff());
    },
    observe: ["Did the lights come on and go off?", DRUM_QUESTION],
  },
  {
    id: "pre-calibration-sound",
    title: "Sound before calibration (GAP-HW-001)",
    gap: "GAP-HW-001",
    warning: "Plays one sound. The tower is NOT calibrated yet.",
    run: async ({ tower, catalog }) => {
      await send("playSound", tower.playSound(catalog.soundIndex));
    },
    observe: ["Did you hear the sound?", DRUM_QUESTION],
  },
  {
    id: "pre-calibration-break-seal",
    title: "Break a seal before calibration (GAP-HW-006)",
    gap: "GAP-HW-006",
    warning:
      "Sends the seal-reveal lights and sound (the tower gets the same packet for every seal). The tower is NOT calibrated yet. Watch the drums.",
    run: async ({ tower }) => {
      await send("breakSeal", tower.breakSeal({ side: "north", level: "top" }));
    },
    observe: ["Did the seal lights and sound play?", DRUM_QUESTION],
  },
  {
    id: "calibrate",
    title: "Calibrate",
    warning: "THE DRUMS WILL SPIN for several seconds. Keep hands and pieces clear of the tower.",
    run: async ({ tower }) => {
      const done = new Promise<void>((resolve) => {
        tower.onCalibrationComplete = () => resolve();
      });
      // One limit for the command and the spin together. `calibrate()` itself only resolves once
      // the tower answers, so two separate limits could report a timeout in the middle of a spin.
      await within(
        CALIBRATION_TIMEOUT_MS,
        "calibration",
        tower.calibrate().then(() => done),
      );
    },
    observe: ["Did all three drums spin and stop? Anything unusual?"],
  },
  {
    id: "sound",
    title: "Play a sound",
    warning: "Plays one sound.",
    run: async ({ tower, catalog }) => {
      await send("playSound", tower.playSound(catalog.soundIndex));
    },
    observe: ["Did you hear the sound?"],
  },
  {
    id: "lights",
    title: "All lights on, then off",
    warning: "Turns every light on, waits, then turns them off.",
    run: async ({ tower, io, catalog }) => {
      await send("allLightsOn", tower.allLightsOn(catalog.lightEffectOn));
      await io.wait(2_000);
      await send("allLightsOff", tower.allLightsOff());
    },
    observe: ["Did the lights come on and go off?"],
  },
  {
    id: "rotation-sequences",
    title: "The four rotation light sequences (GAP-HW-007)",
    gap: "GAP-HW-007",
    warning:
      "Plays four light sequences whose names mention rotation. They are believed to be lights only. Watch the drums.",
    run: async ({ tower, io, catalog }) => {
      for (const sequence of catalog.rotationSequences) {
        io.say(`  sequence ${sequence.name}`);
        io.log({ type: "sequence", name: sequence.name, value: sequence.value });
        await send(`lightOverrides ${sequence.name}`, tower.lightOverrides(sequence.value));
        await io.wait(3_000);
      }
    },
    observe: [
      "For each of the four sequences in order: did any drum move? (for example: no, no, no, no)",
    ],
  },
  {
    id: "rotate-with-state",
    title: "Rotate one drum, keeping the lights (step 5.6, GAP-HW-009)",
    gap: "GAP-HW-009",
    needsCalibration: true,
    warning:
      "Turns every light on, then THE TOP DRUM WILL TURN to east. Keep hands and pieces clear.",
    run: async ({ tower, io, catalog }) => {
      await send("allLightsOn", tower.allLightsOn(catalog.lightEffectOn));
      await io.wait(BETWEEN_COMMANDS_MS);
      await send("rotateWithState", tower.rotateWithState("east", "north", "north"));
    },
    observe: ["Did only the top drum turn?", "Did the lights stay on during and after the turn?"],
  },
  {
    id: "legacy-rotate",
    title: "Legacy rotate, to see what it does to the lights (GAP-HW-009)",
    gap: "GAP-HW-009",
    needsCalibration: true,
    warning:
      "Turns every light on, then THE TOP DRUM WILL TURN to south with the legacy command. Keep hands and pieces clear.",
    run: async ({ tower, io, catalog }) => {
      // South differs from both north and east, so the drum turns whether or not the last step ran.
      await send("allLightsOn", tower.allLightsOn(catalog.lightEffectOn));
      await io.wait(2_000);
      await send("Rotate", tower.Rotate("south", "north", "north"));
    },
    observe: ["Did the top drum turn?", "Did the lights go off when it turned?"],
  },
  {
    id: "random-rotate",
    title: "Random rotate of the top drum, and the lights (GAP-HW-009)",
    gap: "GAP-HW-009",
    needsCalibration: true,
    warning:
      "Turns every light on, then THE TOP DRUM WILL TURN to a random side (it may pick the side it is on and not move). Keep hands and pieces clear.",
    run: async ({ tower, io, catalog }) => {
      await send("allLightsOn", tower.allLightsOn(catalog.lightEffectOn));
      await io.wait(2_000);
      await send("randomRotateLevels", tower.randomRotateLevels(RANDOM_ROTATE_TOP_ONLY));
    },
    observe: ["Did the top drum turn, and did only the top drum turn?", "Did the lights go off?"],
  },
  {
    id: "looped-sound",
    title: "A looped sound, and whether it can be stopped (GAP-HW-008)",
    gap: "GAP-HW-008",
    warning:
      "Starts a sound on loop, then tries two ways to stop it. IT MAY KEEP PLAYING until you switch the tower off. Skip this step if that is not acceptable right now.",
    run: async ({ tower, io, catalog }) => {
      const ask = async (question: string) => {
        const answer = await io.observe(question);
        io.log({ type: "looped-sound", question, answer });
        return answer;
      };
      await send("playSoundStateful loop", tower.playSoundStateful(catalog.soundIndex, true));
      await ask("Listen until it has started again at least twice, or 30 seconds. Did it loop?");

      // First the state with the audio cleared, which is what "all lights off" sends.
      io.say("  trying to stop it: all lights off (sends a state with no sound)");
      await send("allLightsOff", tower.allLightsOff());
      await io.wait(3_000);
      const stopped = await ask("Did the sound stop? (yes/no)");
      if (/^y/i.test(stopped)) return;

      // Then a different sound without loop, so a replay cannot be mistaken for the loop.
      io.say("  trying to stop it: a different sound, played once");
      await send("playSound", tower.playSound(catalog.otherSoundIndex));
      await ask("Listen for 15 seconds. Did the looped sound stop after the other one played?");
    },
    observe: ["Is any sound still playing now?"],
    afterDisconnect: ["The tower is disconnected. Is any sound still playing?"],
  },
  {
    id: "watch",
    title: "Watch battery and skull notifications for 60 seconds",
    warning:
      "Listens for 60 seconds and sends nothing. Drop a skull into the tower during this time if you can.",
    run: async ({ tower, io }) => {
      let battery = 0;
      let lastMillivolts: number | undefined;
      tower.onBatteryLevelNotify = (millivolts) => {
        battery++;
        lastMillivolts = millivolts;
      };
      tower.onSkullDrop = (count) => {
        io.say(`  skull drop reported, count ${count}`);
        io.log({ type: "skull-drop", count });
      };
      await io.wait(WATCH_MS);
      io.log({ type: "battery-summary", notifications: battery, lastMillivolts });
      io.say(`  ${battery} battery notifications, last ${lastMillivolts ?? "none"} mV`);
    },
    observe: ["Did you drop a skull, and how many?"],
  },
];

/**
 * Device fields that identify this one tower. The plan allows no device identifier in the committed
 * log beyond the macOS UUID, so these are recorded only as present or absent.
 */
const IDENTIFYING_FIELDS = new Set(["serialNumber", "systemId"]);

export const redactDeviceInformation = (info: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(info).map(([field, value]) => [
      field,
      IDENTIFYING_FIELDS.has(field) && value !== undefined && value !== null
        ? "(present, redacted)"
        : value instanceof Date
          ? value.toISOString()
          : value,
    ]),
  );

/**
 * Runs the steps in order and returns each step's result. It always disconnects at the end, also
 * when the person quits or a step throws.
 */
export const runSpike = async (
  tower: SpikeTower,
  io: SpikeIo,
  catalog: SpikeCatalog,
  steps: SpikeStep[] = SPIKE_STEPS,
): Promise<Record<string, StepResult>> => {
  const results: Record<string, StepResult> = {};
  const ran: SpikeStep[] = [];
  // Decision D21: the library must never re-send a command on its own.
  tower.retrySendCommandMax = 0;
  io.log({ type: "setup", retrySendCommandMax: tower.retrySendCommandMax });

  try {
    for (const step of steps) {
      io.say(`\n== ${step.title} ==`);
      const skip = (reason: string) => {
        results[step.id] = "skipped";
        io.say(`  skipped: ${reason}`);
        io.log({ type: "step", id: step.id, gap: step.gap, result: "skipped", reason });
      };

      if (step.id !== "connect" && !tower.isConnected) {
        skip("the tower is not connected");
        continue;
      }
      // Decision D22: the library would drop the command and still report success.
      if (tower.performingCalibration) {
        skip("the tower is still calibrating, so the library would drop the command");
        continue;
      }
      if (step.needsCalibration && !tower.isCalibrated) {
        skip("the tower is not calibrated");
        continue;
      }

      const answer = await io.confirm(step.warning);
      if (answer === "quit") {
        skip("the run was stopped here");
        io.log({ type: "quit", at: step.id });
        break;
      }
      if (answer !== "run") {
        skip("skipped by the person at the tower");
        continue;
      }

      // `calibrated` is what the tower has reported so far. Right after connecting it may not have
      // reported yet, and a tower can calibrate itself when it is switched on.
      io.log({ type: "step-start", id: step.id, gap: step.gap, calibrated: tower.isCalibrated });
      ran.push(step);
      let result: StepResult = "passed";
      let error: string | undefined;
      try {
        await step.run({ tower, io, catalog });
      } catch (caught) {
        result = caught instanceof StepTimeout ? "timed-out" : "failed";
        error = caught instanceof Error ? caught.message : String(caught);
        io.say(`  ${result}: ${error}`);
      }
      const observations: Record<string, string> = {};
      for (const question of step.observe) observations[question] = await io.observe(question);
      results[step.id] = result;
      io.log({
        type: "step",
        id: step.id,
        gap: step.gap,
        result,
        error,
        observations,
        calibratedAfter: tower.isCalibrated,
      });
      if (result === "timed-out") {
        // The library may still hold this command. Disconnecting clears its queue; carrying on
        // could let it reach the tower in the middle of a later step.
        io.say("  A step timed out, so the run ends here and disconnects.");
        io.log({ type: "ended-on-timeout", at: step.id });
        break;
      }
      await io.wait(BETWEEN_COMMANDS_MS);
    }
  } finally {
    io.say("\n== Disconnect ==");
    try {
      if (tower.isConnected) await within(15_000, "disconnect", tower.disconnect());
      await within(15_000, "cleanup", tower.cleanup());
      io.log({ type: "disconnect", result: "passed" });
    } catch (caught) {
      const error = caught instanceof Error ? caught.message : String(caught);
      io.say(`  disconnect failed: ${error}. Switch the tower off if it is still doing anything.`);
      io.log({ type: "disconnect", result: "failed", error });
    }
    for (const step of ran) {
      for (const question of step.afterDisconnect ?? []) {
        io.log({
          type: "after-disconnect",
          id: step.id,
          gap: step.gap,
          question,
          answer: await io.observe(question),
        });
      }
    }
  }
  return results;
};
