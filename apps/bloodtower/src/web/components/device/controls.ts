import type { ControlLock, DeviceState, TowerSnapshot } from "bloodtower-protocols";

export interface DeviceControls {
  begin: boolean;
  continue: boolean;
  pause: boolean;
  resume: boolean;
  quit: boolean;
  towerConnect: boolean;
  towerCalibrate: boolean;
  gameplayLock: string | null;
  connectLock: string | null;
  calibrateLock: string | null;
}

const verdict = (won: boolean | null): string | null => {
  if (won === null) return null;
  return won ? "Your press counted." : "Locked. Another player pressed first.";
};

const towerVerdict = (lock: ControlLock | null, deviceId: string | null): string | null => {
  if (!lock) return null;
  if (!deviceId) return "Locked. Another player pressed first.";
  return verdict(lock.winnerDeviceId === deviceId);
};

/** Which controls a joined device may press. The server still decides the winner. */
export const deviceControls = (input: {
  live: boolean;
  state: DeviceState;
  pausePromptId: string | null;
  connectLock: ControlLock | null;
  calibrateLock: ControlLock | null;
  tower: TowerSnapshot;
  deviceId: string | null;
}): DeviceControls => {
  const promptId = input.state.prompt?.id ?? "";
  const locked = input.state.lock !== null;
  return {
    begin: input.live && promptId === "begin" && !locked,
    continue: input.live && promptId.startsWith("continue-") && !locked,
    pause: input.live && input.pausePromptId !== null,
    resume: input.live && promptId.startsWith("resume-") && !locked,
    // Quit has its own prompt, so a locked step does not block it.
    quit: input.live && (input.state.quitPromptId ?? null) !== null,
    towerConnect: input.live && input.connectLock === null,
    towerCalibrate:
      input.live &&
      input.connectLock !== null &&
      input.calibrateLock === null &&
      input.tower.connection === "connected",
    gameplayLock: verdict(input.state.won),
    connectLock: towerVerdict(input.connectLock, input.deviceId),
    calibrateLock: towerVerdict(input.calibrateLock, input.deviceId),
  };
};
