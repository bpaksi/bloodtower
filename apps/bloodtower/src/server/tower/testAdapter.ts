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

/** Wraps the mock tower port for acceptance tests and hub unit tests. */
export const bloodtowerTowerFromMock = (mock: MockTower): BloodtowerTower => ({
  snapshot: () => toShell(mock.snapshot()),
  subscribe: (listener) => mock.onSnapshotChange(listener),
  runCapability: async (capabilityId, params, log) => {
    if (capabilityId === "sound.play-stateful") {
      const { soundIndex, volume } = params;
      if (typeof soundIndex !== "number" || typeof volume !== "number") {
        log.error(
          "tower-command-failed",
          "Tower command sound.play-stateful had no sound or volume.",
        );
        return "failed";
      }
      const taken = await mock.playSound(soundIndex, volume);
      if (taken === "failed") {
        log.error("tower-command-failed", "Tower command sound.play-stateful failed.");
        return "failed";
      }
      return "ok";
    }
    if (capabilityId === "lighting.sequence") {
      const { sequence, soundIndex } = params;
      if (typeof sequence !== "string") {
        log.error("tower-command-failed", "Tower command lighting.sequence had no sequence.");
        return "failed";
      }
      const taken = await mock.lightSequence(
        sequence,
        typeof soundIndex === "number" ? soundIndex : undefined,
      );
      if (taken === "failed") {
        log.error("tower-command-failed", "Tower command lighting.sequence failed.");
        return "failed";
      }
      return "ok";
    }
    if (capabilityId === "mechanics.rotate-drum") {
      const { drumIndex, position } = params;
      if (
        typeof drumIndex !== "number" ||
        !Number.isInteger(drumIndex) ||
        drumIndex < 0 ||
        drumIndex > 2 ||
        typeof position !== "number" ||
        !Number.isInteger(position) ||
        position < 0 ||
        position > 3
      ) {
        log.error(
          "tower-command-failed",
          "Tower command mechanics.rotate-drum had an invalid drumIndex or position.",
        );
        return "failed";
      }
      const taken = await mock.rotateDrum(drumIndex, position);
      if (taken === "failed") {
        log.error(
          "tower-command-failed",
          `Tower command mechanics.rotate-drum failed for drum ${drumIndex} to position ${position}.`,
        );
        return "failed";
      }
      return "ok";
    }
    if (capabilityId === "tower.connect" || capabilityId === "tower.calibrate") {
      const taken = capabilityId === "tower.connect" ? mock.connect() : mock.calibrate();
      if (taken === "failed") {
        log.error("tower-command-failed", `Tower command ${capabilityId} failed.`);
        return "failed";
      }
      return "ok";
    }
    if (capabilityId === "lighting.all-off") {
      const taken = await mock.idle();
      if (taken === "failed") {
        log.error(
          "tower-command-failed",
          mock.snapshot().connection === "connected"
            ? "Tower command lighting.all-off failed."
            : "Tower command lighting.all-off was not sent because the tower is not connected.",
        );
        return "failed";
      }
      return "ok";
    }
    return "ok";
  },
  close: async () => {},
});
