import type { Rng } from "@dark-tower/rng";
import type { ShellState } from "../loops/session/state.ts";

export const pickPress = (
  state: ShellState,
  rng: Rng,
): { promptId: string; actionId: string } | null => {
  const open = state.offered.filter((offer) => offer.open);
  if (open.length === 0) return null;
  const choice = rng.pick(open);
  return { promptId: choice.promptId, actionId: choice.actionId };
};
