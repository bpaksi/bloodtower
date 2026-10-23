import type { HostLogger } from "../log/hostLog.ts";
import { createMockTower } from "../tower/mock.ts";
import { createSidecarTower, diagLogPathFromEnv } from "../tower/sidecar.ts";
import type { TowerPort } from "../tower/types.ts";

export interface TowerChoice {
  tower: TowerPort;
  mode: "mock" | "sidecar";
  url?: string;
}

/**
 * Mock unless `TOWER_URL` names a tower-poc socket. A blank value stays on the mock.
 * Neither mode connects here. A winning press is the only later call.
 * `log` receives command fail, timeout and no-answer. DIAG_LOG is not copied into it.
 */
export const towerFromEnv = (env: NodeJS.ProcessEnv, log?: HostLogger): TowerChoice => {
  const url = env.TOWER_URL?.trim();
  if (url) {
    return {
      tower: createSidecarTower({ url, diagLogPath: diagLogPathFromEnv(env), log }),
      mode: "sidecar",
      url,
    };
  }
  return { tower: createMockTower({ log }), mode: "mock" };
};
