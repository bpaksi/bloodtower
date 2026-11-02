import type { LoopDefinition } from "../../loop/types.ts";
import { renderEnter } from "./enter.ts";
import { hubOffers } from "./hub.ts";
import { recordOffer, shellState } from "./shellRef.ts";

export type SessionLocal = {
  phase: "enter" | "hub" | "over" | "running-game";
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

    if (local.phase === "enter" || local.phase === "hub") {
      if (shell.enter) {
        // A tower snapshot, a device change and a restart all resume this loop and clear offers.
        // The Enter step re-records its presses every pass. The session screen's tower block
        // (DEC-711) runs here too, from the hub.
        renderEnter(shell, ctx);
        return { local: { ...local, awaitingPress: true }, passComplete: false };
      }
      if (local.phase === "enter") local = { ...local, phase: "hub", awaitingPress: false };
    }

    if (local.phase === "hub") {
      if (shell.screen === "session") {
        for (const offer of hubOffers(shell)) {
          ctx.offerPrompt(offer.promptId, offer.actionId);
          recordOffer(offer.promptId, offer.actionId);
        }
        return { local: { ...local, awaitingPress: true, childOpen: false }, passComplete: false };
      }

      if (shell.screen === "session-over") {
        return { local: { ...local, phase: "over" }, passComplete: false };
      }

      if (local.childOpen) {
        return { local, passComplete: false };
      }

      if (shell.screen === "pick-story" || shell.screen === "play") {
        ctx.startChild("game");
        return {
          local: { ...local, phase: "running-game", childOpen: true, fromSessionScreen: false },
          passComplete: false,
        };
      }

      shell.screen = "pick-story";
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

    if (local.phase === "over") {
      shell.screen = "session-over";
      shell.sessionEnded = true;
      return { local, passComplete: true };
    }

    return { local, passComplete: false };
  },
  exit: (local) => local.phase === "over" && shellState().sessionEnded,
  resultUp: () => ({ ended: true }),
};
