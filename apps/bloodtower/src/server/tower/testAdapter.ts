import type { TowerSnapshot as ShellTowerSnapshot } from "../../engine/loops/session/tower.ts";
import type { BloodtowerTower } from "./host.ts";
import type { MockTower } from "./mock.ts";

const toShell = (snapshot: ReturnType<MockTower["snapshot"]>): ShellTowerSnapshot => ({
  connection:
    snapshot.connection === "connected"
      ? "connected"
      : snapshot.connection === "connecting"
        ? "connecting"
        : snapshot.connection === "disconnected"
          ? "disconnected"
          : "unavailable",
  calibrated:
    snapshot.calibrated.state === "known"
      ? { state: "known", calibrated: snapshot.calibrated.calibrated }
      : { state: "unavailable" },
});

/** Wraps the R1 mock tower port for host tests until they use @dark-tower/tower directly. */
export const bloodtowerTowerFromMock = (mock: MockTower): BloodtowerTower => ({
  snapshot: () => toShell(mock.snapshot()),
  subscribe: () => () => {},
  runCapability: async (capabilityId) => {
    if (capabilityId === "tower.connect") mock.connect();
    else if (capabilityId === "tower.calibrate") mock.calibrate();
  },
  close: async () => {},
});
