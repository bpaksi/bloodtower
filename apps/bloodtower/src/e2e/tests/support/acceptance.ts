import { mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { loadConfig } from "../../../server/config.ts";
import { type SessionHost, startSessionHost } from "../../../server/hub/host.ts";
import { createMockTower, type MockTower } from "../../../server/tower/mock.ts";

const WEB_ROOT = resolve(import.meta.dirname, "../../../web/out");

export interface AcceptanceHost {
  host: SessionHost;
  tower: MockTower;
  baseURL: string;
  databasePath: string;
}

/**
 * One session host per test, in this worker, with the mock tower the test can read.
 * It serves the export the webServer step built. The SQLite file sits under `.wt.json` `dataDir`
 * (`e2e-acceptance/<project>.sqlite`, plus the repeat or retry index), outside the folder the config clears in every worker.
 */
export const startAcceptanceHost = async (testInfo: TestInfo): Promise<AcceptanceHost> => {
  const config = loadConfig({ env: {} });
  const dir = join(config.dataDir, "e2e-acceptance");
  mkdirSync(dir, { recursive: true });
  // One file per run, so repeats and retries in parallel workers never share one.
  const run = [
    testInfo.project.name,
    testInfo.title.replace(/\W+/g, "-").slice(0, 48),
    testInfo.repeatEachIndex > 0 ? `repeat${testInfo.repeatEachIndex}` : null,
    testInfo.retry > 0 ? `retry${testInfo.retry}` : null,
  ].filter(Boolean);
  const databasePath = join(dir, `${run.join("-")}.sqlite`);
  for (const suffix of ["", "-wal", "-shm"]) rmSync(`${databasePath}${suffix}`, { force: true });
  const tower = createMockTower();
  const host = await startSessionHost({
    port: 0,
    host: "127.0.0.1",
    webRoot: WEB_ROOT,
    packsDir: config.packsDir,
    databasePath,
    tower,
    towerWatchMs: 50,
  });
  return { host, tower, baseURL: `http://127.0.0.1:${host.port}`, databasePath };
};

/** Let bt-ink-in (and other finite animations) finish before board screenshots. */
export const waitForBoardAnimationsSettled = async (page: Page) => {
  await page.waitForFunction(() => {
    const finiteStillRunning = document.getAnimations().filter((animation) => {
      if (animation.playState !== "running") return false;
      const effect = animation.effect;
      if (!effect || typeof effect.getTiming !== "function") return true;
      const timing = effect.getTiming();
      const iterations = timing.iterations ?? 1;
      return iterations !== Number.POSITIVE_INFINITY;
    });
    return finiteStillRunning.length === 0;
  });
  await page.waitForTimeout(1500);
};

/** Every text frame the page receives on any socket, from before the first navigation. */
export const captureFrames = (page: Page): string[] => {
  const frames: string[] = [];
  page.on("websocket", (socket) => {
    socket.on("framereceived", (frame) => {
      frames.push(typeof frame.payload === "string" ? frame.payload : frame.payload.toString());
    });
  });
  return frames;
};

export interface ControlGate {
  /** Hold every `control` message this page sends from now on. */
  hold: () => void;
  /** Wait until this many controls are held. */
  held: (count: number) => Promise<void>;
  /** Stop holding, and hand back the held sends without running them. */
  take: () => Array<() => void>;
  /** Every text frame the server sent this page, as it arrived. */
  received: string[];
}

/**
 * Routes the page's session socket through the test so `control` frames can be held and
 * released together, and records what the server sent. Frames are not changed.
 */
export const gateControls = async (page: Page): Promise<ControlGate> => {
  const queue: Array<() => void> = [];
  const received: string[] = [];
  let holding = false;
  await page.routeWebSocket(/\/ws$/, (socket) => {
    const server = socket.connectToServer();
    server.onMessage((message) => {
      if (typeof message === "string") received.push(message);
      socket.send(message);
    });
    socket.onMessage((message) => {
      if (holding && typeof message === "string" && JSON.parse(message).type === "control") {
        queue.push(() => server.send(message));
        return;
      }
      server.send(message);
    });
  });
  return {
    hold: () => {
      holding = true;
    },
    held: async (count) => {
      await expect.poll(() => queue.length).toBe(count);
    },
    take: () => {
      holding = false;
      return queue.splice(0);
    },
    received,
  };
};

/** Sends every held control from every gate in one synchronous loop: one tick in this process. */
export const releaseTogether = (...gates: ControlGate[]) => {
  const sends = gates.flatMap((gate) => gate.take());
  for (const send of sends) send();
  return sends.length;
};
