import { BluetoothPlatform, UltimateDarkTower } from "ultimatedarktower";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toHex } from "../instrumentedAdapter.ts";
import { createMockTower, DEFAULT_MOCK_TIMINGS, type MockTowerOptions } from "./mockTower.ts";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const T = DEFAULT_MOCK_TIMINGS;
const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms);
const hex = (text: string) => Uint8Array.from(Buffer.from(text.replaceAll(" ", ""), "hex"));

/** A 20-byte state packet: drums, twelve light bytes, audio, skull count, light sequence. */
const packet = (fields: { drums?: string; lights?: string; audio?: number; sequence?: number }) => {
  const bytes = new Uint8Array(20);
  bytes.set(hex(fields.drums ?? "0000"), 1);
  bytes.set(hex((fields.lights ?? "00").repeat(12)), 3);
  bytes[15] = fields.audio ?? 0;
  bytes[19] = fields.sequence ?? 0;
  return bytes;
};

/** A connected mock, with every notification it sends recorded as [ms since connect, hex]. */
const connectedMock = async (options?: MockTowerOptions) => {
  const mock = createMockTower(options);
  const received: [number, string][] = [];
  let start = 0;
  mock.adapter.onCharacteristicValueChanged((data) =>
    received.push([Date.now() - start, toHex(data)]),
  );
  const connecting = mock.adapter.connect("ReturnToDarkTower", []);
  await advance(T.connectMs);
  await connecting;
  start = Date.now();
  /** The 20-byte states and rotation messages only: no battery and no differential readings. */
  const answers = () => received.filter(([, text]) => !/^0[67]/.test(text));
  return { ...mock, received, answers };
};

describe("mock tower: connection", () => {
  it("connects after its delay, uncalibrated and dark, and reports its device information", async () => {
    const mock = createMockTower();
    const connecting = mock.adapter.connect("ReturnToDarkTower", []);
    expect(mock.adapter.isConnected()).toBe(false);
    await advance(T.connectMs);
    await connecting;
    expect(mock.adapter.isConnected()).toBe(true);
    expect(mock.adapter.isGattConnected()).toBe(true);
    expect(toHex(mock.heldState())).toBe("00".repeat(20));
    expect(await mock.adapter.readDeviceInformation()).toMatchObject({
      modelNumber: "ReturnToDarkTower",
      serialNumber: "MOCK-0000",
    });
  });

  it.each([
    ["not-found", /not found/i],
    ["bluetooth-unavailable", /Bluetooth adapter not ready/],
  ] as const)("fails to connect as the real adapter does: %s", async (failConnect, message) => {
    const mock = createMockTower({ failConnect });
    const connecting = mock.adapter.connect("ReturnToDarkTower", []);
    const outcome = expect(connecting).rejects.toThrow(message);
    await advance(T.connectMs);
    await outcome;
    expect(mock.adapter.isConnected()).toBe(false);
  });

  it("tells the library when it disconnects, asked for or not, and then sends nothing", async () => {
    for (const how of ["disconnect", "dropConnection"] as const) {
      const mock = await connectedMock();
      const gone = vi.fn();
      mock.adapter.onDisconnect(gone);
      if (how === "disconnect") await mock.adapter.disconnect();
      else mock.dropConnection();
      expect(gone).toHaveBeenCalledTimes(1);
      expect(mock.adapter.isConnected()).toBe(false);
      const before = mock.received.length;
      await advance(60_000);
      expect(mock.received.length).toBe(before);
      await expect(mock.adapter.writeCharacteristic(packet({}))).rejects.toThrow(/Not connected/);
    }
  });

  it("forgets calibration, lights and skulls when it is connected again", async () => {
    const mock = await connectedMock();
    await mock.adapter.writeCharacteristic(Uint8Array.of(0x04));
    await advance(T.calibrationMs);
    mock.dropSkull();
    expect(toHex(mock.heldState())).not.toBe("00".repeat(20));
    mock.dropConnection();
    const connecting = mock.adapter.connect("ReturnToDarkTower", []);
    await advance(T.connectMs);
    await connecting;
    expect(toHex(mock.heldState())).toBe("00".repeat(20));
  });
});

describe("mock tower: what it sends on its own (GAP-LIB-008)", () => {
  it("sends a battery message every 2 s and differential readings every second", async () => {
    const mock = await connectedMock({ batteryMillivolts: 4937 });
    await advance(10_000);
    const of = (prefix: string) => mock.received.filter(([, text]) => text.startsWith(prefix));
    expect(of("07").length).toBe(5);
    expect(of("06ff").length).toBe(10);
    // 4937 mV is 0x1349, as the real tower's messages carried it.
    expect(of("07")[0]?.[1]).toBe("0700001349");
  });

  it("sends no battery message while calibrating, and keeps the differential readings going", async () => {
    const mock = await connectedMock({ timings: { calibrationMs: 19_000 } });
    await mock.adapter.writeCharacteristic(Uint8Array.of(0x04));
    await advance(18_999);
    expect(mock.received.filter(([, text]) => text.startsWith("07"))).toEqual([]);
    expect(mock.received.filter(([, text]) => text.startsWith("06")).length).toBe(18);
    // Calibration ends at 19 s; the battery messages due at 20 s and 22 s then go out.
    await advance(4_001);
    expect(mock.received.filter(([, text]) => text.startsWith("07")).length).toBe(2);
  });

  it("reports each skull drop as a state with a running count", async () => {
    const mock = await connectedMock();
    mock.dropSkull();
    mock.dropSkull();
    expect(mock.answers().map(([, text]) => text.slice(34, 36))).toEqual(["01", "02"]);
    await mock.adapter.writeCharacteristic(Uint8Array.of(0x03));
    await advance(T.echoMs);
    expect(mock.answers().at(-1)?.[1].slice(34, 36)).toBe("00");
  });
});

describe("mock tower: answers to writes, as the real tower gave them", () => {
  it("reports calibrated drums when calibration ends, and nothing before", async () => {
    const mock = await connectedMock();
    await mock.adapter.writeCharacteristic(Uint8Array.of(0x04));
    await advance(T.calibrationMs - 1);
    expect(mock.answers()).toEqual([]);
    await advance(1);
    expect(mock.answers()).toEqual([[T.calibrationMs, `001042${"00".repeat(17)}`]]);
  });

  it("echoes a lights change and a sound within the echo delay", async () => {
    const mock = await connectedMock();
    const lightsOn = packet({ lights: "33" });
    await mock.adapter.writeCharacteristic(lightsOn);
    await advance(T.echoMs);
    await mock.adapter.writeCharacteristic(packet({ lights: "33", audio: 1 }));
    await advance(T.echoMs);
    expect(mock.answers()).toEqual([
      [T.echoMs, toHex(lightsOn)],
      [2 * T.echoMs, toHex(packet({ lights: "33", audio: 1 }))],
    ]);
    // The sound is not part of what the tower holds afterwards.
    expect(toHex(mock.heldState())).toBe(toHex(lightsOn));
  });

  it("echoes a looped sound without the loop bit", async () => {
    const mock = await connectedMock();
    await mock.adapter.writeCharacteristic(packet({ audio: 0x81 }));
    await advance(T.echoMs);
    expect(mock.answers().map(([, text]) => text)).toEqual([toHex(packet({ audio: 0x01 }))]);
  });

  it("stays silent for a write that changes nothing it reports (GAP-HW-010)", async () => {
    const mock = await connectedMock();
    await mock.adapter.writeCharacteristic(packet({ lights: "33" }));
    await advance(T.echoMs);
    const before = mock.answers().length;
    await mock.adapter.writeCharacteristic(packet({ lights: "33" }));
    await mock.adapter.writeCharacteristic(packet({ lights: "33" }));
    await advance(60_000);
    expect(mock.answers().length).toBe(before);
  });

  it.each([15, 16, 17, 18])(
    "plays rotation sequence %i and sends nothing back (GAP-HW-007)",
    async (sequence) => {
      const mock = await connectedMock();
      await mock.adapter.writeCharacteristic(packet({ sequence }));
      await advance(60_000);
      expect(mock.answers()).toEqual([]);
    },
  );

  it("echoes the seal sequence, then reports it cleared 3.6 s later", async () => {
    const mock = await connectedMock();
    await mock.adapter.writeCharacteristic(packet({ sequence: 14, audio: 5 }));
    await advance(T.echoMs + T.sequenceMs);
    expect(mock.answers()).toEqual([
      [T.echoMs, toHex(packet({ sequence: 14, audio: 5 }))],
      [T.echoMs + T.sequenceMs, toHex(packet({}))],
    ]);
  });

  it("reports a rotation after its travel time, with the duration message just before it", async () => {
    const mock = await connectedMock();
    await mock.adapter.writeCharacteristic(Uint8Array.of(0x04));
    await advance(T.calibrationMs);
    const turned = packet({ drums: "1242", lights: "33" });
    await mock.adapter.writeCharacteristic(turned);
    await advance(T.rotationMs - 1);
    expect(mock.answers().length).toBe(1);
    await advance(1);
    const [, duration, state] = mock.answers();
    expect(duration?.[1]).toMatch(/^040000/);
    expect(state).toEqual([T.calibrationMs + T.rotationMs, toHex(turned)]);
    expect(toHex(mock.heldState())).toBe(toHex(turned));
  });

  it("does nothing with a write that arrives while it is calibrating", async () => {
    const mock = await connectedMock();
    await mock.adapter.writeCharacteristic(Uint8Array.of(0x04));
    await mock.adapter.writeCharacteristic(packet({ lights: "33" }));
    await advance(T.calibrationMs);
    expect(mock.answers().map(([, text]) => text)).toEqual([`001042${"00".repeat(17)}`]);
  });
});

describe("mock tower under the real library", () => {
  const connectedLibrary = async () => {
    const mock = createMockTower();
    const tower = new UltimateDarkTower({
      platform: BluetoothPlatform.NONE,
      adapter: mock.adapter,
    });
    tower.retrySendCommandMax = 0;
    const connecting = tower.connect();
    await advance(T.connectMs + 1_000);
    await connecting;
    return { mock, tower };
  };

  it("connects, calibrates, plays a sound and counts a skull, with the library's own parsing", async () => {
    const { mock, tower } = await connectedLibrary();
    try {
      expect(tower.isConnected).toBe(true);
      expect(tower.isCalibrated).toBe(false);

      const calibrated = vi.fn();
      tower.onCalibrationComplete = calibrated;
      const calibrating = tower.calibrate();
      await advance(T.calibrationMs + 1_000);
      await calibrating;
      expect(calibrated).toHaveBeenCalledTimes(1);
      expect(tower.isCalibrated).toBe(true);

      const playing = tower.playSound(1);
      await advance(1_000);
      await expect(playing).resolves.toBeUndefined();

      const skulls = vi.fn();
      tower.onSkullDrop = skulls;
      mock.dropSkull();
      await advance(100);
      expect(skulls).toHaveBeenCalledWith(1);

      await advance(5_000);
      expect(tower.currentBattery).toBe(4_900);
    } finally {
      const leaving = tower.disconnect();
      await advance(1_000);
      await leaving;
    }
  });

  it("leaves a rotation sequence unanswered, so the library gives it up after 30 s", async () => {
    const { tower } = await connectedLibrary();
    try {
      const playing = tower.lightOverrides(15);
      const outcome = expect(playing).rejects.toThrow(/Command timeout after 30000ms/);
      await advance(30_001);
      await outcome;
    } finally {
      const leaving = tower.disconnect();
      await advance(1_000);
      await leaving;
    }
  });
});
