// The tower for the sound review: one session, and an executor that runs only `sound.play`.
// Nothing here acts on its own: connect, calibrate and every play happen because Bob pressed a
// button. No reconnect, no retry.
import { randomUUID } from "node:crypto";
import {
  type CommandLifecyclePayload,
  type ConnectionPayload,
  END_STAGES,
} from "@dark-tower/tower";
import {
  createAdapterEventList,
  createCommandExecutor,
  createStateStore,
  createTowerRecords,
  createTowerSession,
  type TowerSession,
} from "@dark-tower/tower/runtime";
import type { IBluetoothAdapter } from "ultimatedarktower";

/** The only capability this tool sends. */
export const PLAY = "sound.play";

export type TowerAction = "connect" | "reconnect" | "disconnect" | "calibrate";

export interface PlayResult {
  commandId: string;
  /** Every stage of the play, in order. The last is one of `END_STAGES`. */
  stages: CommandLifecyclePayload[];
}

export interface ReviewTower {
  status: () => ConnectionPayload;
  /** True while a play is waiting or running. Calibration waits for it to end. */
  busy: () => boolean;
  /** Runs one of the session's actions. Resolves once it has ended; how is in `status()`. */
  act: (action: TowerAction) => Promise<void>;
  /** Runs one command. Anything but `sound.play` is refused before it reaches the executor. */
  command: (capabilityId: string, params: unknown) => Promise<PlayResult>;
  session: TowerSession;
  close: () => Promise<void>;
}

/** A request this tool refuses. Nothing was sent to the tower. `code` is shown to Bob. */
export class TowerRequestError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "TowerRequestError";
    this.code = code;
  }
}

export const createReviewTower = (createAdapter: () => IBluetoothAdapter): ReviewTower => {
  const session = createTowerSession({ events: createAdapterEventList(), createAdapter });
  const waiting = new Map<string, CommandLifecyclePayload[]>();
  const executor = createCommandExecutor({
    session,
    // The tool sends no seal or skull commands, so this record stays empty and only in memory.
    records: createTowerRecords(createStateStore()),
    onLifecycle: (stage) => {
      waiting.get(stage.commandId)?.push(stage);
      if (stage.stage === "failed" || stage.stage === "timed-out" || stage.stage === "rejected") {
        console.error(
          `Play ${stage.commandId} ended ${stage.stage}: ${stage.reason ?? "no reason"}`,
        );
      }
    },
  });

  return {
    status: session.status,
    busy: executor.busy,
    session,
    act: async (action) => {
      if (action === "calibrate" && executor.busy()) {
        throw new TowerRequestError(
          "tower-busy",
          "A sound is still playing. Calibrate once it has ended.",
        );
      }
      await session[action]();
    },
    command: async (capabilityId, params) => {
      if (capabilityId !== PLAY) {
        throw new TowerRequestError(
          "not-offered",
          `This tool only plays sounds, not ${capabilityId}.`,
        );
      }
      const commandId = randomUUID();
      const stages: CommandLifecyclePayload[] = [];
      waiting.set(commandId, stages);
      try {
        await executor.submit({ commandId, clientId: "sound-review-tool", capabilityId, params });
      } finally {
        waiting.delete(commandId);
      }
      if (!stages.some((stage) => END_STAGES.includes(stage.stage))) {
        throw new Error(`Play ${commandId} resolved with no end stage.`);
      }
      return { commandId, stages };
    },
    close: session.close,
  };
};
