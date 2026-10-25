import { resolve } from "node:path";
import {
  createAdapterEventList,
  createCommandExecutor,
  createMockTower,
  createStateStore,
  createTowerRecords,
  createTowerSession,
  feedStateStore,
  openDiagLog,
  teeEventList,
} from "@dark-tower/tower/runtime";
import { BluetoothAdapterFactory, BluetoothPlatform } from "ultimatedarktower";
import type { TowerSnapshot as ShellTowerSnapshot } from "../../engine/loops/session/tower.ts";
import type { HostLogger } from "../log/hostLog.ts";

const mapShellTower = (status: { state: string; calibration: string }): ShellTowerSnapshot => {
  const connection =
    status.state === "connected"
      ? "connected"
      : status.state === "connecting" || status.state === "scanning"
        ? "connecting"
        : status.state === "disconnected" || status.state === "disconnecting"
          ? "disconnected"
          : "unavailable";
  const calibrated =
    status.calibration === "calibrated"
      ? { state: "known" as const, calibrated: true }
      : status.calibration === "uncalibrated" || status.calibration === "calibrating"
        ? { state: "known" as const, calibrated: false }
        : { state: "unavailable" as const };
  return { connection, calibrated };
};

export type BloodtowerTower = {
  snapshot: () => ShellTowerSnapshot;
  subscribe: (listener: () => void) => () => void;
  runCapability: (
    capabilityId: string,
    params: Record<string, unknown>,
    log: HostLogger,
  ) => Promise<"ok" | "failed">;
  close: () => Promise<void>;
};

export type TowerHostOptions = {
  mock?: boolean;
};

export const createBloodtowerTower = (options: TowerHostOptions = {}): BloodtowerTower => {
  const useMock = options.mock ?? (process.env.MOCK === "1" || process.env.VITEST === "true");
  const diagPath = process.env.DIAG_LOG?.trim();
  const events = createAdapterEventList();
  const diagLog = diagPath ? openDiagLog(resolve(diagPath)) : undefined;
  const session = createTowerSession({
    events: diagLog ? teeEventList(events, diagLog) : events,
    createAdapter: () =>
      useMock ? createMockTower().adapter : BluetoothAdapterFactory.create(BluetoothPlatform.NODE),
  });
  const store = createStateStore();
  const records = createTowerRecords(store);
  const feed = feedStateStore(session, store, { skulls: records });
  let idleOutcome: "ok" | "failed" | null = null;
  let idleReason = "";
  const executor = createCommandExecutor({
    session,
    records,
    onLifecycle: (payload) => {
      feed.refresh();
      if (payload.capabilityId !== "lighting.all-off") return;
      if (payload.stage === "confirmed") {
        idleOutcome = "ok";
        return;
      }
      if (payload.stage === "indeterminate" && payload.written === false) {
        idleOutcome = "ok";
        return;
      }
      if (
        payload.stage === "failed" ||
        payload.stage === "timed-out" ||
        payload.stage === "rejected" ||
        payload.stage === "indeterminate"
      ) {
        idleOutcome = "failed";
        idleReason =
          payload.reason ??
          (payload.stage === "indeterminate"
            ? "Tower command lighting.all-off was not answered."
            : `Tower command lighting.all-off ${payload.stage}.`);
      }
    },
  });
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  session.subscribe(() => notify());
  session.onTowerReport(() => notify());

  const snapshot = () => mapShellTower(session.status());

  const runCapability = async (
    capabilityId: string,
    params: Record<string, unknown>,
    log: HostLogger,
  ) => {
    try {
      if (capabilityId === "tower.connect") {
        await session.connect();
        notify();
        return "ok";
      }
      if (capabilityId === "tower.calibrate") {
        await session.calibrate();
        notify();
        return "ok";
      }
      if (capabilityId === "lighting.all-off") {
        idleOutcome = null;
        idleReason = "";
        await executor.submit({
          commandId: `cmd-${Date.now()}`,
          clientId: "bloodtower-host",
          capabilityId,
          params,
        });
        notify();
        if (idleOutcome !== "ok") {
          log.error(
            "tower-command-failed",
            idleReason.trim() === ""
              ? "Tower command lighting.all-off was not answered."
              : idleReason,
          );
          return "failed";
        }
        return "ok";
      }
      const commandId = `cmd-${Date.now()}`;
      await executor.submit({
        commandId,
        clientId: "bloodtower-host",
        capabilityId,
        params,
      });
      notify();
      return "ok";
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(
        "tower-command-failed",
        message.trim() === "" ? `Tower command ${capabilityId} failed.` : message,
      );
      notify();
      return "failed";
    }
  };

  return {
    snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    runCapability,
    close: async () => {
      feed.stop();
      await session.close();
    },
  };
};
