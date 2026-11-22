import { gainCorruption } from "../../rules/corruption/index.ts";
import type { PlayState } from "../chapter/playState.ts";
import { isGameLost } from "../day/clock.ts";
import type { BattlePorts } from "./loop.ts";

/**
 * The battle's two doors into a running game: a corruption goes through the game's own draw and
 * record (a third one sets the clock's loss, DEC-676), and any game loss already set stops the battle.
 */
export const playPorts = (play: PlayState, seed: string): BattlePorts => ({
  corrupt: (heroId) => {
    const gained = gainCorruption(play, seed, heroId);
    return { count: gained.count, lost: gained.lost };
  },
  gameLost: () => isGameLost(play),
});
