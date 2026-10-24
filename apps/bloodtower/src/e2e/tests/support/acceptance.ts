import { mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { loadConfig } from "../../../server/config.ts";
import { type SessionHost, startSessionHost } from "../../../server/hub/host.ts";
import { createMockTower, type MockTower } from "../../../server/tower/mock.ts";
import { bloodtowerTowerFromMock } from "../../../server/tower/testAdapter.ts";

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
export const startAcceptanceHost = async (
  testInfo: TestInfo,
  options?: { databasePath?: string; seed?: string; graceMs?: number },
): Promise<AcceptanceHost> => {
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
  const databasePath = options?.databasePath ?? join(dir, `${run.join("-")}.sqlite`);
  if (!options?.databasePath) {
    for (const suffix of ["", "-wal", "-shm"]) rmSync(`${databasePath}${suffix}`, { force: true });
  }
  const tower = createMockTower();
  const host = await startSessionHost({
    port: 0,
    host: "127.0.0.1",
    webRoot: WEB_ROOT,
    packsDir: config.packsDir,
    databasePath,
    tower: bloodtowerTowerFromMock(tower),
    towerWatchMs: 50,
    // The volume test waits about 4 s between sounds; the e2e run does not.
    sleep: async () => undefined,
    seed: options?.seed,
    graceMs: options?.graceMs ?? 100,
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
      if (holding && typeof message === "string" && JSON.parse(message).type === "act") {
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

/** The test pack's setup steps, in order (packs/test/pack.yaml `setup`). */
export const SETUP_STEPS = ["lay-out-board", "place-hunters", "ready-decks"] as const;

/** Injects a handle to the session WebSocket before navigation (see `walkFullSetup`). */
export const installSessionSocketHook = async (page: Page) => {
  await page.addInitScript(() => {
    const Native = window.WebSocket;
    class SessionTrackingWebSocket extends Native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        if (String(url).includes("/ws")) {
          const win = window as unknown as {
            __btSessionSocket?: WebSocket;
            __btLastDeviceView?: {
              screen: string;
              actions: { promptId: string; actionId: string; open: boolean }[];
            };
          };
          win.__btSessionSocket = this;
          this.addEventListener("message", (event) => {
            try {
              const message = JSON.parse(String(event.data)) as {
                type?: string;
                payload?: {
                  screen: string;
                  actions: { promptId: string; actionId: string; open: boolean }[];
                };
              };
              if (message.type === "deviceView" && message.payload) {
                win.__btLastDeviceView = message.payload;
              }
            } catch {
              // Ignore non-JSON frames.
            }
          });
        }
      }
    }
    window.WebSocket = SessionTrackingWebSocket;
  });
};

const PLAY_PRESS_PREFERENCE = ["continue", "record", "end-turn", "leave", "enter", "walk"] as const;

const PLAY_PRESS_SKIP = new Set([
  "quit-story",
  "reconnect",
  "new-game",
  "done-for-tonight",
  "back",
  "tower-connect",
  "tower-calibrate",
]);

/** Sends one open play/setup press on the live session socket (same connection as the UI). */
export const sendPlayPressFromTest = async (page: Page): Promise<boolean> => {
  await page.waitForFunction(
    () => {
      const socket = (window as unknown as { __btSessionSocket?: WebSocket }).__btSessionSocket;
      return socket != null && socket.readyState === WebSocket.OPEN;
    },
    { timeout: 15_000 },
  );
  return page.evaluate(
    ({ prefer, skip }) => {
      const win = window as unknown as {
        __btSessionSocket?: WebSocket;
        __btLastDeviceView?: {
          screen: string;
          actions: { promptId: string; actionId: string; open: boolean }[];
        };
      };
      const socket = win.__btSessionSocket;
      const view = win.__btLastDeviceView;
      if (!socket || socket.readyState !== WebSocket.OPEN || !view) return false;
      const open = view.actions.filter((action) => action.open);
      if (open.length === 0) return false;
      let pick = null as { promptId: string; actionId: string } | null;
      for (const actionId of prefer) {
        const hit = open.find((action) => action.actionId === actionId);
        if (hit) {
          pick = { promptId: hit.promptId, actionId: hit.actionId };
          break;
        }
      }
      if (!pick) {
        const hit = open.find((action) => !skip.includes(action.actionId));
        if (hit) pick = { promptId: hit.promptId, actionId: hit.actionId };
      }
      if (!pick) return false;
      socket.send(
        JSON.stringify({
          v: 2,
          type: "act",
          payload: { promptId: pick.promptId, actionId: pick.actionId, args: {} },
        }),
      );
      return true;
    },
    { prefer: [...PLAY_PRESS_PREFERENCE], skip: [...PLAY_PRESS_SKIP] },
  );
};

/** Sends hero-hold on the page's live session socket (same connection as the UI). */
export const holdHeroesFromTest = async (page: Page, heroIds: string[]) => {
  await page.waitForFunction(
    () => {
      const socket = (window as unknown as { __btSessionSocket?: WebSocket }).__btSessionSocket;
      return socket != null && socket.readyState === WebSocket.OPEN;
    },
    { timeout: 15_000 },
  );
  await page.evaluate((heroes) => {
    const socket = (window as unknown as { __btSessionSocket?: WebSocket }).__btSessionSocket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("Session socket is not open.");
    }
    for (const heroId of heroes) {
      socket.send(
        JSON.stringify({
          v: 2,
          type: "act",
          payload: { promptId: "hero-hold", actionId: "take", args: { heroId } },
        }),
      );
    }
  }, heroIds);
  await page.waitForTimeout(250);
};

/**
 * From the first setup step to Begin: presses Done on each step once its dialog shows, so no
 * press lands on the step before.
 */
export const doneEverySetupStep = async (pad: Page) => {
  for (const step of SETUP_STEPS) {
    await expect(pad.locator(`[data-setup-step="${step}"]`)).toBeVisible();
    await pad.locator('button[data-action="continue"]').click();
  }
  await expect(pad.locator("main")).toHaveAttribute("data-screen", "begin");
};
