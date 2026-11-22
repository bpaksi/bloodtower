import { initPlayState, type PlayState } from "../chapter/playState.ts";
import { configurePicks, setHeroHp, setPurse } from "../encounter/picks.ts";
import type { PlainScene } from "../scene/scene.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { configureQuests } from "./store.ts";

export const HERALD: PlainScene = {
  id: "herald",
  options: [
    { id: "pay", label: "Ask for pay", effects: [{ kind: "gold", amount: 10 }] },
    { id: "job", label: "Take the job", effects: [{ kind: "item", item: "tomas-map" }] },
  ],
};

export const AMBUSH: PlainScene = {
  id: "ambush",
  options: [
    { id: "fight", label: "Fight them", battle: true, effects: [{ kind: "flag", flag: "fought" }] },
    {
      id: "toll",
      label: "Pay the toll",
      cost: { kind: "toll" },
      effects: [{ kind: "flag", flag: "paid" }],
    },
  ],
};

/** TEST ONLY (C3/14, EV-07): an option that costs one corruption, for a hero the group picks (DEC-693). */
export const CURSE: PlainScene = {
  id: "curse",
  options: [
    {
      id: "take-the-curse",
      label: "Take the curse",
      cost: { kind: "corruption" },
      effects: [{ kind: "gold", amount: 10 }],
    },
    { id: "walk-away", label: "Walk away", effects: [{ kind: "flag", flag: "walked" }] },
  ],
};

export const LOCK: PlainScene = {
  id: "lock",
  options: [
    {
      id: "open",
      label: "Use the Signet",
      needsItem: "signet",
      effects: [{ kind: "flag", flag: "gate-open" }],
    },
    { id: "wait", label: "Turn back", effects: [{ kind: "flag", flag: "turned-back" }] },
  ],
};

/** A play state with one group of `heroIds`, the pack's quests and a purse. */
export const questPlay = (heroIds: string[], purse = 0): { play: PlayState; groupId: string } => {
  const play = initPlayState("quest", PROVING_GROUNDS_PLAY);
  const group = play.groups[0];
  if (!group) throw new Error("no group");
  group.heroIds = heroIds;
  configurePicks(play, { chapter: 1 });
  setPurse(play, group.id, purse);
  for (const hero of heroIds) setHeroHp(play, hero, 5, 10);
  configureQuests(play, {
    defs: [
      { id: "herald", chapter: 1, scene: HERALD },
      { id: "ambush", chapter: 1, scene: AMBUSH },
      { id: "lock", chapter: 3, scene: LOCK },
    ],
  });
  return { play, groupId: group.id };
};
