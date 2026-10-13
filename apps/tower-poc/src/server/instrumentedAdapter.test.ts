import type { IBluetoothAdapter } from "ultimatedarktower";
import { describe, expect, it } from "vitest";
import { type AdapterEvent, instrumentAdapter, toHex } from "./instrumentedAdapter.ts";

/** An adapter that records calls and lets the test push notifications in. */
const fakeAdapter = (options: { failWrite?: boolean } = {}) => {
  const calls: string[] = [];
  let onValue: (data: Uint8Array) => void = () => {};
  let onGone: () => void = () => {};
  const inner: IBluetoothAdapter = {
    connect: async (name) => {
      calls.push(`connect ${name}`);
    },
    disconnect: async () => {
      calls.push("disconnect");
    },
    isConnected: () => true,
    isGattConnected: () => true,
    writeCharacteristic: async (data) => {
      calls.push(`write ${toHex(data)}`);
      if (options.failWrite) throw new Error("write refused");
    },
    onCharacteristicValueChanged: (callback) => {
      onValue = callback;
    },
    onDisconnect: (callback) => {
      onGone = callback;
    },
    onBluetoothAvailabilityChanged: () => {},
    readDeviceInformation: async () => ({ modelNumber: "ReturnToDarkTower" }),
    cleanup: async () => {
      calls.push("cleanup");
    },
  };
  return { inner, calls, notify: (data: Uint8Array) => onValue(data), drop: () => onGone() };
};

const setup = (options?: { failWrite?: boolean }) => {
  const fake = fakeAdapter(options);
  const events: AdapterEvent[] = [];
  const adapter = instrumentAdapter(fake.inner, (event) => events.push(event));
  return { ...fake, adapter, events };
};

describe("instrumentAdapter", () => {
  it("reports a write as hex and passes the same bytes on", async () => {
    const { adapter, calls, events } = setup();
    await adapter.writeCharacteristic(new Uint8Array([0, 1, 255]));
    expect(calls).toEqual(["write 0001ff"]);
    expect(events).toEqual([{ kind: "tx", hex: "0001ff", bytes: 3 }]);
  });

  it("reports a notification and still delivers it", () => {
    const { adapter, events, notify } = setup();
    const received: Uint8Array[] = [];
    adapter.onCharacteristicValueChanged((data) => received.push(data));
    notify(new Uint8Array([7, 16]));
    expect(events).toEqual([{ kind: "rx", hex: "0710", bytes: 2 }]);
    expect(received).toEqual([new Uint8Array([7, 16])]);
  });

  it("reports a failed write and rethrows it, without sending again", async () => {
    const { adapter, calls, events } = setup({ failWrite: true });
    await expect(adapter.writeCharacteristic(new Uint8Array([9]))).rejects.toThrow("write refused");
    expect(calls).toEqual(["write 09"]);
    expect(events).toEqual([
      { kind: "tx", hex: "09", bytes: 1 },
      { kind: "lifecycle", name: "write:error", detail: "write refused" },
    ]);
  });

  it("reports connect, device information, disconnect and cleanup", async () => {
    const { adapter, calls, events } = setup();
    await adapter.connect("ReturnToDarkTower", ["uuid"]);
    expect(await adapter.readDeviceInformation()).toEqual({ modelNumber: "ReturnToDarkTower" });
    await adapter.disconnect();
    await adapter.cleanup();
    expect(calls).toEqual(["connect ReturnToDarkTower", "disconnect", "cleanup"]);
    expect(events.map((event) => (event.kind === "lifecycle" ? event.name : event.kind))).toEqual([
      "connect:start",
      "connect:ok",
      "read-device-information:start",
      "read-device-information:ok",
      "disconnect:start",
      "disconnect:ok",
      "cleanup:start",
      "cleanup:ok",
    ]);
  });

  it("reports an unexpected disconnect and passes it on", () => {
    const { adapter, events, drop } = setup();
    let told = false;
    adapter.onDisconnect(() => {
      told = true;
    });
    drop();
    expect(told).toBe(true);
    expect(events).toEqual([{ kind: "lifecycle", name: "adapter-disconnect" }]);
  });

  it("adds no calls of its own to the adapter", async () => {
    const { adapter, calls } = setup();
    adapter.onCharacteristicValueChanged(() => {});
    adapter.onDisconnect(() => {});
    adapter.onBluetoothAvailabilityChanged(() => {});
    expect(adapter.isConnected()).toBe(true);
    expect(adapter.isGattConnected()).toBe(true);
    expect(calls).toEqual([]);
  });
});
