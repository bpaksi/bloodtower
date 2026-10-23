import type { LoopRegistry } from "../../loop/types.ts";
import { chapterLoop } from "../chapter/loop.ts";
import { dayLoop } from "../day/loop.ts";
import { encounterLoop } from "../encounter/loop.ts";
import { gameLoop } from "../game/loop.ts";
import { groupTurnLoop } from "../group-turn/loop.ts";
import { sessionLoop } from "./loop.ts";

export const SESSION_ROOT_LOOP_ID = "session";

export const createShellRegistry = (): LoopRegistry => ({
  session: sessionLoop as LoopRegistry[string],
  game: gameLoop as LoopRegistry[string],
  chapter: chapterLoop as LoopRegistry[string],
  day: dayLoop as LoopRegistry[string],
  "group-turn": groupTurnLoop as LoopRegistry[string],
  encounter: encounterLoop as LoopRegistry[string],
});
