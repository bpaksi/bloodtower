import type { LoopDefinition } from "../../loop/types.ts";
import { groupById, playState } from "../chapter/playState.ts";
import { recordOffer } from "../session/shellRef.ts";

export type EncounterLocal = {
  groupId: string;
  awaitingLeave: boolean;
};

export type EncounterResult = { left: true };

export const encounterLoop: LoopDefinition<EncounterLocal, EncounterResult> = {
  id: "encounter",
  enter: () => {
    const play = playState();
    const input = play.childInput;
    if (!input || input.kind !== "encounter") {
      throw new Error("Encounter needs childInput from the group turn.");
    }
    play.childInput = null;
    const group = groupById(play, input.groupId);
    if (!group) throw new Error(`Unknown group ${input.groupId}.`);
    group.insideBuilding = true;
    return { groupId: input.groupId, awaitingLeave: false };
  },
  body: (local, ctx) => {
    if (!local.awaitingLeave) {
      const promptId = `leave--${local.groupId}`;
      ctx.offerPrompt(promptId, "leave");
      recordOffer(promptId, "leave");
      return { local: { ...local, awaitingLeave: true }, passComplete: false };
    }
    return { local, passComplete: true };
  },
  exit: (local) => local.awaitingLeave,
  resultUp: () => ({ left: true }),
};

export const handleEncounterLeave = (groupId: string): void => {
  const play = playState();
  const group = groupById(play, groupId);
  if (!group) return;
  group.insideBuilding = false;
};
