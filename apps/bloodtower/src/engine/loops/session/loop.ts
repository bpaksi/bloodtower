import type { LoopDefinition } from "../../loop/types.ts";
import { recordOffer, shellState } from "./shellRef.ts";
import { towerReady } from "./tower.ts";

export type SessionLocal = {
  phase: "tower" | "hub" | "goodbye" | "running-game";
  towerStep: "connect" | "calibrate" | "done";
  awaitingPress: boolean;
  fromSessionScreen: boolean;
  childOpen: boolean;
};

export type SessionResult = { ended: boolean };

export const sessionLoop: LoopDefinition<SessionLocal, SessionResult> = {
  id: "session",
  enter: () => ({
    phase: "tower",
    towerStep: "connect",
    awaitingPress: false,
    fromSessionScreen: false,
    childOpen: false,
  }),
  body: (local, ctx) => {
    const shell = shellState();

    if (!shell.towerSetupDone && local.phase === "tower") {
      shell.screen = "tower-connect";
      shell.stage = "lobby";
      const connected =
        shell.tower.connection === "connected" && shell.tower.calibrated.state === "known";
      if (!connected) {
        ctx.offerPrompt("tower-connect", "tower-connect");
        recordOffer("tower-connect", "tower-connect");
        return {
          local: { ...local, awaitingPress: true, towerStep: "connect" },
          passComplete: false,
        };
      }
      if (!towerReady(shell.tower)) {
        ctx.offerPrompt("tower-calibrate", "tower-calibrate");
        recordOffer("tower-calibrate", "tower-calibrate");
        return {
          local: { ...local, awaitingPress: true, towerStep: "calibrate" },
          passComplete: false,
        };
      }
      shell.towerSetupDone = true;
      shell.screen = "pick-game";
      local = { ...local, phase: "hub", towerStep: "done", awaitingPress: false };
    }

    if (local.phase === "hub") {
      if (shell.screen === "session") {
        ctx.offerPrompt("session-new-game", "new-game");
        recordOffer("session-new-game", "new-game");
        ctx.offerPrompt("session-done-tonight", "done-for-tonight");
        recordOffer("session-done-tonight", "done-for-tonight");
        return { local: { ...local, awaitingPress: true, childOpen: false }, passComplete: false };
      }

      if (shell.screen === "goodbye") {
        return { local: { ...local, phase: "goodbye" }, passComplete: false };
      }

      if (local.childOpen) {
        return { local, passComplete: false };
      }

      if (shell.screen === "pick-story" && local.fromSessionScreen) {
        ctx.startChild("game");
        return {
          local: { ...local, phase: "running-game", childOpen: true, fromSessionScreen: false },
          passComplete: false,
        };
      }

      if (!local.childOpen && (shell.screen === "pick-game" || shell.screen === "play")) {
        ctx.startChild("game");
        return { local: { ...local, phase: "running-game", childOpen: true }, passComplete: false };
      }

      shell.screen = "pick-game";
      ctx.startChild("game");
      return { local: { ...local, phase: "running-game", childOpen: true }, passComplete: false };
    }

    if (local.phase === "running-game") {
      const childResult = ctx.getParentResult() as { outcome?: string } | undefined;
      if (childResult) {
        shell.screen = "session";
        shell.stage = "lobby";
        local = {
          phase: "hub",
          towerStep: "done",
          awaitingPress: false,
          fromSessionScreen: false,
          childOpen: false,
        };
      } else {
        return { local, passComplete: false };
      }
    }

    if (local.phase === "goodbye") {
      shell.screen = "goodbye";
      shell.sessionEnded = true;
      return { local, passComplete: true };
    }

    return { local, passComplete: false };
  },
  exit: (local) => local.phase === "goodbye" && shellState().sessionEnded,
  resultUp: () => ({ ended: true }),
};
