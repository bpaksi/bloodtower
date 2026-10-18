import type { ControlLock, DeviceState, TowerSnapshot } from "bloodtower-protocols";

export interface DeviceControls {
  begin: boolean;
  continue: boolean;
  /**
   * Back on a start-up screen (R3-UI-37). Only a prompt named `back-…` enables it: the step
   * prompt on Not playable yet, or `backPromptId` beside Continue on Game settings, Connect
   * Tower, Claim Hunters, a setup step and Begin.
   */
  back: boolean;
  /** The id Back is pressed under, or null when this screen has no Back. */
  backPromptId: string | null;
  /** A game setting may change: the device is on Game settings with a set prompt. */
  set: boolean;
  /** Play levels (or Play again) is live on the tower volume test. */
  volumePlay: boolean;
  /** The volume answer buttons are live: the test is asking and nothing has been answered. */
  volumeAnswer: boolean;
  /** The pick options are live on the iPad: the prompt is a pick and nothing has locked. */
  pick: boolean;
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
  // Screens with Continue name their own Back beside it; Not playable yet uses the step prompt.
  const ownBack = input.state.backPromptId ?? null;
  const stepBack = promptId.startsWith("back-") ? promptId : null;
  const backPromptId = ownBack?.startsWith("back-") ? ownBack : stepBack;
  const backLocked = ownBack ? (input.state.backLock ?? null) !== null : locked;
  return {
    begin: input.live && promptId === "begin" && !locked,
    continue: input.live && promptId.startsWith("continue-") && !locked,
    back: input.live && backPromptId !== null && !backLocked,
    backPromptId,
    set:
      input.live &&
      input.state.screen === "game-settings" &&
      (input.state.setPromptId ?? null) !== null &&
      !!input.state.gameSettings,
    volumePlay:
      input.live &&
      input.state.screen === "tower-volume-test" &&
      (input.state.volumePlayPromptId ?? null) !== null,
    volumeAnswer:
      input.live &&
      input.state.screen === "tower-volume-test" &&
      (input.state.volumeAnswerPromptId ?? null) !== null,
    pick: input.live && promptId.startsWith("pick-") && !locked,
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
