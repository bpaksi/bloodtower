import type { LoopDefinition } from "../../loop/types.ts";
import type { ShellScreen } from "../session/screens.ts";
import { recordOffer, shellState } from "../session/shellRef.ts";
import {
  allHeroesHeld,
  bindStoryChoice,
  screenAfterBack,
  screenAfterContinue,
} from "./setupFlow.ts";

export type GameLocal = {
  phase:
    | "pick-game"
    | "pick-story"
    | "game-settings"
    | "claim-heroes"
    | "setup"
    | "begin"
    | "play"
    | "done";
  awaitingPress: boolean;
};

export type GameResult = { outcome: "quit" | "completed" };

const syncScreen = (local: GameLocal) => {
  const shell = shellState();
  if (local.phase === "pick-game") shell.screen = "pick-game";
  else if (local.phase === "play") shell.screen = "play";
  else if (local.phase !== "done") shell.screen = local.phase;
};

const offerContinueOrBack = (
  local: GameLocal,
  ctx: { offerPrompt: (promptId: string, actionId: string) => void },
) => {
  const shell = shellState();
  local.awaitingPress = true;
  const offer = (promptId: string, actionId: string) => {
    ctx.offerPrompt(promptId, actionId);
    recordOffer(promptId, actionId);
  };
  if (shell.screen === "pick-story") {
    offer(`continue-pick-story-${shell.focusStoryId}`, "continue");
    return;
  }
  if (shell.screen === "game-settings") {
    offer("continue-game-settings", "continue");
    offer("back-game-settings", "back");
    return;
  }
  if (shell.screen === "claim-heroes") {
    offer("continue-claim-heroes", "continue");
    offer("back-claim-heroes", "back");
    return;
  }
  if (shell.screen === "setup") {
    const step = shell.setupSteps[shell.setupAt];
    if (!step) return;
    offer(`continue-setup-${step.id}`, "continue");
    offer(`back-setup-${step.id}`, "back");
    return;
  }
  if (shell.screen === "begin") {
    if (!allHeroesHeld(shell)) return;
    offer("continue-begin", "continue");
    offer("back-begin", "back");
  }
};

export const gameLoop: LoopDefinition<GameLocal, GameResult> = {
  id: "game",
  enter: () => {
    const shell = shellState();
    shell.stage = "lobby";
    if (shell.screen === "pick-story") {
      return { phase: "pick-story", awaitingPress: false };
    }
    return { phase: "pick-game", awaitingPress: false };
  },
  body: (local, ctx) => {
    const shell = shellState();

    if (local.phase === "pick-game") {
      syncScreen(local);
      if (shell.autosave) {
        ctx.offerPrompt("continue-pick-game", "continue");
        recordOffer("continue-pick-game", "continue");
      }
      ctx.offerPrompt("new-pick-game", "new-game");
      recordOffer("new-pick-game", "new-game");
      return { local: { ...local, awaitingPress: true }, passComplete: false };
    }

    if (
      local.phase === "pick-story" ||
      local.phase === "game-settings" ||
      local.phase === "claim-heroes" ||
      local.phase === "setup" ||
      local.phase === "begin"
    ) {
      syncScreen(local);
      if (!local.awaitingPress) {
        offerContinueOrBack(local, ctx);
      }
      return { local, passComplete: false };
    }

    if (local.phase === "play") {
      syncScreen(local);
      shell.stage = shell.pause ? "paused" : "playing";
      if (shell.pause) {
        if (shell.pause.cause === "tower-lost") {
          ctx.offerPrompt(`pause-${shell.pauseSerial}-reconnect`, "reconnect");
          recordOffer(`pause-${shell.pauseSerial}-reconnect`, "reconnect");
        }
        ctx.offerPrompt(`pause-${shell.pauseSerial}-quit`, "quit-story");
        recordOffer(`pause-${shell.pauseSerial}-quit`, "quit-story");
        return { local, passComplete: false };
      }
      return { local, passComplete: false };
    }

    return { local: { ...local, phase: "done" }, passComplete: true };
  },
  exit: (local) => local.phase === "done",
  resultUp: () => {
    const shell = shellState();
    return { outcome: shell.stage === "ended" ? "quit" : "completed" };
  },
};

export const handleGamePress = (
  local: GameLocal,
  promptId: string,
  actionId: string,
): GameLocal => {
  const shell = shellState();

  if (local.phase === "pick-game") {
    if (promptId === "new-pick-game" && actionId === "new-game") {
      shell.screen = "pick-story";
      shell.resumedFromAutosave = false;
      shell.autosave = null;
      shell.activeGameId = `game-${shell.eventSeq}`;
      return { phase: "pick-story", awaitingPress: false };
    }
    if (promptId === "continue-pick-game" && actionId === "continue" && shell.autosave) {
      shell.resumedFromAutosave = true;
      shell.screen = "play";
      shell.stage = "playing";
      return { phase: "play", awaitingPress: false };
    }
  }

  if (actionId === "continue") {
    if (local.phase === "pick-story" && promptId === `continue-pick-story-${shell.focusStoryId}`) {
      if (!bindStoryChoice(shell, shell.focusStoryId)) return { ...local, awaitingPress: false };
      shell.screen = "game-settings";
      return { phase: "game-settings", awaitingPress: false };
    }
    if (local.phase === "game-settings" && promptId === "continue-game-settings") {
      const next = screenAfterContinue(shell, "game-settings");
      if (!next) return local;
      shell.screen = next;
      return { phase: next as GameLocal["phase"], awaitingPress: false };
    }
    if (local.phase === "claim-heroes" && promptId === "continue-claim-heroes") {
      if (!allHeroesHeld(shell)) return local;
      const next = screenAfterContinue(shell, "claim-heroes");
      if (!next) return local;
      shell.screen = next;
      if (next === "setup") shell.setupAt = 0;
      return { phase: next as GameLocal["phase"], awaitingPress: false };
    }
    if (local.phase === "setup") {
      const step = shell.setupSteps[shell.setupAt];
      if (!step || promptId !== `continue-setup-${step.id}`) return local;
      shell.setupAt += 1;
      const next = screenAfterContinue(shell, "setup");
      if (!next) return local;
      shell.screen = next;
      return { phase: next as GameLocal["phase"], awaitingPress: false };
    }
    if (local.phase === "begin" && promptId === "continue-begin" && allHeroesHeld(shell)) {
      shell.screen = "play";
      shell.stage = "playing";
      if (!shell.activeGameId) shell.activeGameId = `game-${shell.eventSeq}`;
      return { phase: "play", awaitingPress: false };
    }
  }

  if (actionId === "back") {
    const backScreen = local.phase as ShellScreen;
    const next = screenAfterBack(shell, backScreen);
    if (!next) return { ...local, awaitingPress: false };
    shell.screen = next;
    return { phase: next as GameLocal["phase"], awaitingPress: false };
  }

  if (local.phase === "play" && shell.pause && promptId === `pause-${shell.pauseSerial}-quit`) {
    if (actionId === "quit-story") {
      shell.stage = "ended";
      shell.pause = null;
      return { phase: "done", awaitingPress: false };
    }
  }
  if (
    local.phase === "play" &&
    shell.pause &&
    promptId === `pause-${shell.pauseSerial}-reconnect` &&
    actionId === "reconnect" &&
    shell.pause.cause === "tower-lost"
  ) {
    shell.pause = null;
    shell.stage = "playing";
    return { ...local, awaitingPress: false };
  }

  return { ...local, awaitingPress: false };
};

export const handleSessionHubPress = (
  local: import("../session/loop.ts").SessionLocal,
  promptId: string,
  actionId: string,
): import("../session/loop.ts").SessionLocal => {
  const shell = shellState();
  if (shell.screen === "session" && promptId === "session-new-game" && actionId === "new-game") {
    shell.screen = "pick-story";
    shell.autosave = null;
    shell.activeGameId = `game-${shell.eventSeq}`;
    return { ...local, fromSessionScreen: true, awaitingPress: false, phase: "hub" };
  }
  if (
    shell.screen === "session" &&
    promptId === "session-done-tonight" &&
    actionId === "done-for-tonight"
  ) {
    shell.screen = "goodbye";
    return { ...local, phase: "goodbye", awaitingPress: false };
  }
  return { ...local, awaitingPress: false };
};
