import type { LoopDefinition } from "../../loop/types.ts";
import { renderEnter } from "./enter.ts";
import { recordOffer, shellState } from "./shellRef.ts";

export type SessionLocal = {
  phase: "enter" | "hub" | "goodbye" | "running-game";
  awaitingPress: boolean;
  fromSessionScreen: boolean;
  childOpen: boolean;
};

export type SessionResult = { ended: boolean };

export const sessionLoop: LoopDefinition<SessionLocal, SessionResult> = {
  id: "session",
  enter: () => ({
    phase: "enter",
    awaitingPress: false,
    fromSessionScreen: false,
    childOpen: false,
  }),
  body: (local, ctx) => {
    const shell = shellState();

    if (local.phase === "enter") {
      if (shell.enter) {
        // A tower snapshot, a device change and a restart all resume this loop and clear offers.
        // The Enter step re-records its presses every pass, the same way pick-game does.
        renderEnter(shell, ctx);
        return { local: { ...local, awaitingPress: true }, passComplete: false };
      }
      local = { ...local, phase: "hub", awaitingPress: false };
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

      if (
        shell.screen === "pick-story" ||
        shell.screen === "pick-game" ||
        shell.screen === "play"
      ) {
        ctx.startChild("game");
        return {
          local: { ...local, phase: "running-game", childOpen: true, fromSessionScreen: false },
          passComplete: false,
        };
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
