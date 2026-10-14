// An in-memory tower for mock mode and for tests (spec D8). It implements the library's adapter
// interface, so everything above it (the library, the session, the executor) runs unchanged.
//
// It behaves as the real tower did in the M1 spike (research/tower/spikes/2026-10-13-noble-macos.md
// and research/tower/observability.md), including where the tower stays silent. Where the spike
// did not observe something, the comment at that place says the behaviour is assumed.
import {
  BluetoothConnectionError,
  BluetoothDeviceNotFoundError,
  type DeviceInformation,
  type IBluetoothAdapter,
} from "ultimatedarktower";

const STATE_LENGTH = 20;
const TOWER_STATE = 0x00;
const RESET_COUNTER = 0x03;
const CALIBRATE = 0x04;
// Byte positions in a 20-byte state packet.
const DRUMS = [1, 2] as const;
const LIGHTS_START = 3;
const LIGHTS_END = 15;
const AUDIO = 15;
const SKULL_COUNT = 17;
const LED_SEQUENCE = 19;
/** Drum bytes the tower reports after calibrating: every drum north, calibrated. */
const CALIBRATED_DRUMS = [0x10, 0x42] as const;
/** The four rotation* light sequences. The tower plays them and sends nothing back (GAP-HW-010). */
const SILENT_SEQUENCES = new Set([15, 16, 17, 18]);
const LOOP_BIT = 0x80;

export interface MockTowerTimings {
  connectMs: number;
  /** The real tower took 20.6 s and 22.4 s. Mock mode is shorter so that it is usable. */
  calibrationMs: number;
  /** Lights and sound were echoed 25 to 64 ms after the write. */
  echoMs: number;
  /** A quarter turn of one drum reported its state about 1.1 s after the write. */
  rotationMs: number;
  /** A second state, with the sequence cleared, followed the seal sequence by 3.6 s. */
  sequenceMs: number;
  /** One battery message about every 2 s, and none while calibrating (GAP-LIB-008). */
  batteryMs: number;
  /** One differential-readings message every second, always. */
  differentialMs: number;
}

export const DEFAULT_MOCK_TIMINGS: MockTowerTimings = {
  connectMs: 300,
  calibrationMs: 3_000,
  echoMs: 40,
  rotationMs: 1_100,
  sequenceMs: 3_600,
  batteryMs: 2_000,
  differentialMs: 1_000,
};

export const MOCK_DEVICE_INFORMATION: DeviceInformation = {
  manufacturerName: "Mock tower",
  modelNumber: "ReturnToDarkTower",
  serialNumber: "MOCK-0000",
  hardwareRevision: "mock",
  firmwareRevision: "mock",
  softwareRevision: "mock",
};

export interface MockTowerOptions {
  timings?: Partial<MockTowerTimings>;
  /** Makes `connect` fail the way the real adapter does. */
  failConnect?: "not-found" | "bluetooth-unavailable";
  batteryMillivolts?: number;
}

export interface MockTower {
  adapter: IBluetoothAdapter;
  /** A skull passes the sensor: the tower sends its state with the count one higher. */
  dropSkull: () => void;
  /** The link is lost without anyone asking for it. */
  dropConnection: () => void;
  setBatteryMillivolts: (millivolts: number) => void;
  /** The state the tower holds, as it would report it. For tests. */
  heldState: () => Uint8Array;
}

export const createMockTower = (options: MockTowerOptions = {}): MockTower => {
  const timings = { ...DEFAULT_MOCK_TIMINGS, ...options.timings };
  let millivolts = options.batteryMillivolts ?? 4_900;
  let connected = false;
  let calibrating = false;
  let state = new Uint8Array(STATE_LENGTH);
  let onValue: (data: Uint8Array) => void = () => {};
  let onGone: () => void = () => {};
  const pending = new Set<ReturnType<typeof setTimeout>>();
  const repeating: ReturnType<typeof setInterval>[] = [];

  const notify = (data: Uint8Array) => {
    if (connected) onValue(data);
  };
  const later = (ms: number, run: () => void) => {
    const timer = setTimeout(() => {
      pending.delete(timer);
      if (connected) run();
    }, ms);
    pending.add(timer);
  };
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const stopTimers = () => {
    for (const timer of pending) clearTimeout(timer);
    pending.clear();
    for (const timer of repeating.splice(0)) clearInterval(timer);
  };
  const end = () => {
    if (!connected) return;
    connected = false;
    calibrating = false;
    stopTimers();
    onGone();
  };

  const sendState = () => notify(Uint8Array.from(state));
  const battery = () =>
    Uint8Array.of(0x07, 0x00, 0x00, (millivolts >> 8) & 0xff, millivolts & 0xff);

  const calibrate = () => {
    calibrating = true;
    later(timings.calibrationMs, () => {
      calibrating = false;
      state[DRUMS[0]] = CALIBRATED_DRUMS[0];
      state[DRUMS[1]] = CALIBRATED_DRUMS[1];
      sendState();
    });
  };

  const applyState = (packet: Uint8Array) => {
    const sequence = packet[LED_SEQUENCE] ?? 0;
    const audio = packet[AUDIO] ?? 0;
    const drumsChange = DRUMS.some((at) => packet[at] !== state[at]);
    const lightsChange = packet
      .subarray(LIGHTS_START, LIGHTS_END)
      .some((byte, index) => byte !== state[LIGHTS_START + index]);

    // Drum bytes that differ are taken as a rotation, also on an uncalibrated tower. What the real
    // tower does with them then is not known (GAP-HW-006); moving is the cautious thing to model.
    // The tower keeps the drums and lights it was sent. The skull count is its own: what a
    // packet says there is ignored. (Assumed: the spike never sent a count that differed.)
    state.set(packet.subarray(DRUMS[0], LIGHTS_END), DRUMS[0]);

    if (SILENT_SEQUENCES.has(sequence)) return;

    // What comes back carries the sound and the sequence once, then they are gone. The loop bit
    // does not come back: the one looped sound the spike sent was echoed without it.
    const echo = Uint8Array.from(state);
    echo[AUDIO] = audio & ~LOOP_BIT;
    echo[LED_SEQUENCE] = sequence;

    if (drumsChange) {
      later(timings.rotationMs, () => {
        // "Rotation duration", 1 to 2 ms before the state. The value is milliseconds of travel
        // as far as the spike could tell.
        const travel = Math.max(0, timings.rotationMs - 150);
        notify(Uint8Array.of(0x04, 0x00, 0x00, (travel >> 8) & 0xff, travel & 0xff));
        notify(echo);
      });
      return;
    }
    // A write that changes nothing the tower reports gets no answer (GAP-HW-010).
    if (!lightsChange && audio === 0 && sequence === 0) return;

    later(timings.echoMs, () => notify(echo));
    // Assumed for every sequence but the seal one, which is the only one the spike saw end.
    if (sequence !== 0) later(timings.echoMs + timings.sequenceMs, sendState);
  };

  const adapter: IBluetoothAdapter = {
    connect: async () => {
      if (connected) return;
      await sleep(timings.connectMs);
      if (options.failConnect === "bluetooth-unavailable") {
        throw new BluetoothConnectionError(
          "Bluetooth adapter not ready: Timeout waiting for Noble to be powered on",
        );
      }
      if (options.failConnect === "not-found") {
        throw new BluetoothDeviceNotFoundError("Tower not found (mock)");
      }
      connected = true;
      // A tower that has just been found is uncalibrated and dark, with no skulls counted.
      state = new Uint8Array(STATE_LENGTH);
      repeating.push(
        setInterval(() => {
          if (!calibrating) notify(battery());
        }, timings.batteryMs),
        setInterval(
          () => notify(Uint8Array.of(0x06, 0xff, 0x00, 0x00, 0x00)),
          timings.differentialMs,
        ),
      );
    },
    disconnect: async () => end(),
    isConnected: () => connected,
    isGattConnected: () => connected,
    writeCharacteristic: async (data) => {
      if (!connected) throw new BluetoothConnectionError("Not connected (mock)");
      // Assumed: a command sent while the drums are calibrating does nothing. The spike sent none,
      // and the library drops such a command before it gets here (D22).
      if (calibrating) return;
      if (data.length === 1 && data[0] === CALIBRATE) return calibrate();
      if (data.length === 1 && data[0] === RESET_COUNTER) {
        // Assumed: the spike never reset the counter.
        state[SKULL_COUNT] = 0;
        later(timings.echoMs, sendState);
        return;
      }
      if (data.length === STATE_LENGTH && data[0] === TOWER_STATE) applyState(data);
      // Anything else is a command the mock does not know. The real tower's answer is not known
      // either, so the mock stays silent.
    },
    onCharacteristicValueChanged: (callback) => {
      onValue = callback;
    },
    onDisconnect: (callback) => {
      onGone = callback;
    },
    onBluetoothAvailabilityChanged: () => {},
    readDeviceInformation: async () => ({ ...MOCK_DEVICE_INFORMATION, lastUpdated: new Date() }),
    cleanup: async () => stopTimers(),
  };

  return {
    adapter,
    dropSkull: () => {
      if (!connected) return;
      state[SKULL_COUNT] = ((state[SKULL_COUNT] ?? 0) + 1) & 0xff;
      sendState();
    },
    dropConnection: end,
    setBatteryMillivolts: (value) => {
      millivolts = value;
    },
    heldState: () => Uint8Array.from(state),
  };
};
