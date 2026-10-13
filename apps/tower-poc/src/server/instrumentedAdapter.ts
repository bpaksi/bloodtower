// Wraps a Bluetooth adapter and reports every packet and lifecycle call that passes through it.
// It only watches: it adds no calls of its own. In particular it never discovers services, because
// on macOS a second discovery after subscribing makes notifications go silent (research/tower/
// api-surface-7.1.2.md, finding 12).
import type { DeviceInformation, IBluetoothAdapter } from "ultimatedarktower";

export type AdapterEvent =
  | { kind: "tx"; hex: string; bytes: number }
  | { kind: "rx"; hex: string; bytes: number }
  | { kind: "lifecycle"; name: string; detail?: string };

export const toHex = (data: Uint8Array) =>
  Array.from(data, (byte) => byte.toString(16).padStart(2, "0")).join("");

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Returns an adapter that behaves exactly like `inner` and calls `emit` for what it sees. */
export const instrumentAdapter = (
  inner: IBluetoothAdapter,
  emit: (event: AdapterEvent) => void,
): IBluetoothAdapter => {
  // Reports a call's start and how it ended, and passes the result or the error through unchanged.
  const traced = async <T>(name: string, call: () => Promise<T>, detail?: string): Promise<T> => {
    emit({ kind: "lifecycle", name: `${name}:start`, detail });
    try {
      const result = await call();
      emit({ kind: "lifecycle", name: `${name}:ok` });
      return result;
    } catch (error) {
      emit({ kind: "lifecycle", name: `${name}:error`, detail: describe(error) });
      throw error;
    }
  };

  return {
    connect: (deviceName, serviceUuids) =>
      traced("connect", () => inner.connect(deviceName, serviceUuids), deviceName),
    disconnect: () => traced("disconnect", () => inner.disconnect()),
    isConnected: () => inner.isConnected(),
    isGattConnected: () => inner.isGattConnected(),
    writeCharacteristic: async (data) => {
      emit({ kind: "tx", hex: toHex(data), bytes: data.length });
      try {
        await inner.writeCharacteristic(data);
      } catch (error) {
        emit({ kind: "lifecycle", name: "write:error", detail: describe(error) });
        throw error;
      }
    },
    onCharacteristicValueChanged: (callback) =>
      inner.onCharacteristicValueChanged((data) => {
        emit({ kind: "rx", hex: toHex(data), bytes: data.length });
        callback(data);
      }),
    onDisconnect: (callback) =>
      inner.onDisconnect(() => {
        emit({ kind: "lifecycle", name: "adapter-disconnect" });
        callback();
      }),
    onBluetoothAvailabilityChanged: (callback) =>
      inner.onBluetoothAvailabilityChanged((available) => {
        emit({ kind: "lifecycle", name: "bluetooth-availability", detail: String(available) });
        callback(available);
      }),
    readDeviceInformation: (): Promise<DeviceInformation> =>
      traced("read-device-information", () => inner.readDeviceInformation()),
    cleanup: () => traced("cleanup", () => inner.cleanup()),
  };
};
