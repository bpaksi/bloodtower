import type { LoopRegistry } from "../../loop/types.ts";
import { gameLoop } from "../game/loop.ts";
import { sessionLoop } from "./loop.ts";

export const SESSION_ROOT_LOOP_ID = "session";

export const createShellRegistry = (): LoopRegistry => ({
  session: sessionLoop as LoopRegistry[string],
  game: gameLoop as LoopRegistry[string],
});
