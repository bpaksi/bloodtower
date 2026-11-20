import type { PlayState } from "../chapter/playState.ts";
import type { PlainScene } from "../scene/scene.ts";
import { AMBUSH, HERALD } from "./fixtures.ts";
import { ensureQuests } from "./store.ts";

/**
 * TEST ONLY (F1/02, EV-09). The marker `~test-quest:<space>=<quest>` loads one of the quest
 * fixtures as a def and opens it at that space, so an end-to-end test can reach a Quest row before
 * quests load from the pack in a real game. A seed with no marker changes nothing.
 *
 * It is not in `TEST_SEED_MARKERS` (`loops/chapter/playState.ts`, a D1 path), so a seed that
 * carries only this marker is not a test seed; the e2e seeds also carry `~test-at:`.
 */
export const TEST_QUEST = "~test-quest:";

const FIXTURE_SCENES: Record<string, PlainScene> = { herald: HERALD, ambush: AMBUSH };

const MARKER = /~test-quest:([\w-]*)=([\w-]*)/g;

export const applyQuestTestSeed = (play: PlayState, seed: string): void => {
  for (const [, space, quest] of seed.matchAll(MARKER)) {
    if (!space || !play.content.board.spaceById.has(space)) {
      throw new Error(`The test quest seed names "${space}", which is not a space.`);
    }
    const scene = quest ? FIXTURE_SCENES[quest] : undefined;
    if (!quest || !scene) {
      throw new Error(
        `The test quest seed names "${quest}", which is not a quest fixture (${Object.keys(FIXTURE_SCENES).join(", ")}).`,
      );
    }
    const store = ensureQuests(play);
    store.defs = [
      ...store.defs.filter((def) => def.id !== quest),
      { id: quest, chapter: 1, scene },
    ];
    store.bySpace[space] = quest;
  }
};
