"use client";

import { deviceStatePayloadSchema } from "bloodtower-protocols";
import { DeviceScreen } from "../../components/device/DeviceScreen";

const waiting = deviceStatePayloadSchema.parse({
  heldHunters: [],
  views: [],
  prompt: null,
  lock: null,
  won: null,
});

const tower = {
  connection: "unavailable" as const,
  battery: { state: "unavailable" as const },
  calibrated: { state: "unavailable" as const },
};

export default function DevicePage() {
  return (
    <DeviceScreen
      live={false}
      deviceId={null}
      state={waiting}
      pausePromptId={null}
      connectLock={null}
      calibrateLock={null}
      tower={tower}
    />
  );
}
