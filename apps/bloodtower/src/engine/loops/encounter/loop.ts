import type { LoopDefinition } from "../../loop/types.ts";
import { groupById, playState } from "../chapter/playState.ts";
import { ensureClock, heroSheet, isGameLost } from "../day/clock.ts";
import {
  beginQuest,
  chooseOption,
  leaveQuest,
  openQuestAt,
  pickHero,
  type QuestRefusal,
  type QuestResult,
  type QuestView,
} from "../quest/quest.ts";
import { recordOffer, shellState } from "../session/shellRef.ts";
import {
  type BuildingLocal,
  type BuildingResult,
  type BuildingStep,
  buildingModel,
  isBuildPrompt,
  movesOf,
  parseBuildPrompt,
  resultWait,
  stepOf,
} from "./menu.ts";
import {
  applyPick,
  commitLive,
  cureTargets,
  endFreePick,
  endTurnAfterQuest,
  ensurePicks,
  freePickPending,
  giveBackTile,
  healTargets,
  loadLive,
  type PickKind,
  type PickRefusal,
  questPickGate,
  spendQuestMove,
} from "./picks.ts";

/**
 * The encounter: a group inside a building (DEC-220). It offers the building's menu, applies each
 * pick (UI-043, MEC-036) and ends on Leave, or when the last move is spent. The step the group is
 * on lives in `step`, so a Continue brings back the same menu and the same prices (EV-18, EV-20).
 */
export type EncounterLocal = BuildingLocal & {
  groupId: string;
  /** Set by the Leave press (and a spent last move); the body then ends the loop. */
  left?: boolean;
  /** The step's prompts are offered; cleared by a press and by a restore, so they are offered again. */
  awaitingPress?: boolean;
  /** Old saves: the Leave offer's own flag. Read as nothing; restore clears it. */
  awaitingLeave?: boolean;
  /** Words for the last press the loop could not take, for the shell to log and toast; then cleared. */
  refusal?: string | null;
};

export type EncounterResult = { left: true; movesLeft?: number };

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
    return {
      groupId: input.groupId,
      movesLeft: input.movesLeft ?? 0,
      serial: 0,
      step: { kind: "menu" },
      awaitingPress: false,
      left: false,
    };
  },
  body: (local, ctx) => {
    // DEC-676: a third corruption stops the encounter at once.
    if (isGameLost(playState())) return { local, passComplete: true };
    if (local.left) return { local, passComplete: true };

    let current = local;
    const step = stepOf(current);
    if (step.kind === "result" && step.result.auto) {
      // A result with no Next waits for the host's `wait-end`, then moves on (EV-15, EV-16).
      if (!step.result.waitDone) return { local: current, passComplete: false };
      current = afterResult(current);
      if (current.left) return { local: current, passComplete: true };
    }

    if (current.awaitingPress) return { local: current, passComplete: false };
    offerStep(current, ctx);
    return { local: { ...current, awaitingPress: true }, passComplete: false };
  },
  exit: (local) => Boolean(local.left) || isGameLost(playState()),
  resultUp: (local) => ({ left: true, movesLeft: local.movesLeft }),
};

const offerStep = (
  local: EncounterLocal,
  ctx: { offerPrompt: (promptId: string, actionId: string) => void },
): void => {
  const play = playState();
  const model = buildingModel(play, local, (id) => id);
  const shell = shellState();
  for (const option of model.options) {
    if (option.enabled) {
      ctx.offerPrompt(option.promptId, option.actionId);
      recordOffer(option.promptId, option.actionId);
    } else {
      // Offered but closed: shown, not hidden (EV-03). The view says why.
      shell.offered.push({ promptId: option.promptId, actionId: option.actionId, open: false });
    }
  }
};

export const handleEncounterLeave = (groupId: string): void => {
  const play = playState();
  const group = groupById(play, groupId);
  if (!group) return;
  group.insideBuilding = false;
  // DEC-913, DEC-945: leaving ends the pending free pick unspent.
  endFreePick(play, groupId);
};

const REFUSALS: Record<PickRefusal, string> = {
  "unknown-group": "This group is not at a building.",
  "not-inside": "This group is not inside the building.",
  fallen: "This building has fallen, so nothing can be done here.",
  "not-offered": "That pick is not offered at this building.",
  "no-moves": "There are not enough moves left for that.",
  "no-gold": "There is not enough gold for that.",
  "no-target": "No hero can take that pick now.",
  feverish: "A Feverish hero stops the Cleanse at three skulls.",
  cleansed: "Cleanse is not possible now.",
  "give-back-first": "A virtue must be given back first.",
};

const refused = (local: EncounterLocal, text: string): EncounterLocal => ({
  ...local,
  awaitingPress: false,
  refusal: text,
});

const nextSerial = (local: EncounterLocal): number => (local.serial ?? 0) + 1;

/** Moves to a step with a fresh serial, so its prompts are offered anew. */
const toStep = (local: EncounterLocal, step: BuildingStep): EncounterLocal => ({
  ...local,
  step,
  serial: nextSerial(local),
  awaitingPress: false,
  refusal: null,
});

const toResult = (
  local: EncounterLocal,
  fields: Omit<BuildingResult, "wait" | "waitDone" | "auto"> & { auto: boolean },
): EncounterLocal => {
  const serial = nextSerial(local);
  const result: BuildingResult = {
    ...fields,
    wait: fields.auto
      ? resultWait(local.groupId, serial, ensureClock(playState()).buildingLine ?? null)
      : null,
    waitDone: false,
  };
  return {
    ...local,
    step: { kind: "result", result },
    serial,
    awaitingPress: false,
    refusal: null,
  };
};

/** After a result (or a give-back): the give-back if one is due, the move map if no moves are left, else the menu. */
const afterResult = (local: EncounterLocal): EncounterLocal => {
  const play = playState();
  const store = ensurePicks(play);
  if (store.giveBack[local.groupId] && stepOf(local).kind !== "give-back") {
    return toStep(local, { kind: "give-back" });
  }
  // A pending free pick keeps the menu open at 0 moves, and so does the free pick just taken (DEC-913).
  const step = stepOf(local);
  const tookFree = step.kind === "result" && step.result.free === true;
  if (movesOf(local) <= 0 && !tookFree && !freePickPending(play, local.groupId)) {
    handleEncounterLeave(local.groupId);
    return { ...local, left: true, awaitingPress: false };
  }
  return toStep(local, { kind: "menu" });
};

type Apply = {
  kind: PickKind;
  heroId?: string;
  corruptionId?: string;
  count?: number;
};

/** One pick against the live state. Gold, hit points and moves are read in and written back. */
const applyLive = (local: EncounterLocal, pick: Apply): EncounterLocal => {
  const play = playState();
  const shell = shellState();
  loadLive(play, local.groupId, movesOf(local));
  const store = ensurePicks(play);
  const hpBefore = pick.heroId ? store.hp[pick.heroId]?.hp : undefined;
  const result = applyPick(play, shell.seed, local.groupId, pick.kind, {
    ...(pick.heroId ? { heroId: pick.heroId } : {}),
    ...(pick.corruptionId ? { corruptionId: pick.corruptionId } : {}),
    ...(pick.count ? { count: pick.count } : {}),
  });
  if (!result.ok) {
    return refused(local, REFUSALS[result.reason]);
  }
  const movesLeft = commitLive(play, local.groupId);
  const moved: EncounterLocal = { ...local, movesLeft };
  const hp = pick.heroId ? heroSheet(ensureClock(play), pick.heroId).hp : undefined;
  const fields = {
    pick: pick.kind,
    ...(pick.heroId ? { heroId: pick.heroId } : {}),
    ...(hp && hpBefore !== undefined
      ? { hp: { hp: hp.hp, max: hp.max, gained: hp.hp - hpBefore } }
      : {}),
    ...(result.event.corruptionId ? { corruptionId: result.event.corruptionId } : {}),
    ...(pick.kind === "virtue-draw" && result.event.tile ? { tile: result.event.tile } : {}),
    ...(result.free ? { free: true } : {}),
  };
  const auto = pick.kind === "rally" || pick.kind === "virtue-draw" || pick.kind === "cleanse";
  return toResult(moved, { ...fields, auto });
};

/** What a pick of the menu starts: a result now, or the step that still needs a choice. */
const startPick = (local: EncounterLocal, kind: PickKind): EncounterLocal => {
  const play = playState();
  const group = local.groupId;
  if (kind === "virtue-draw" || kind === "cleanse") return applyLive(local, { kind });
  if (kind === "rally") {
    const heroes = healTargets(play, group);
    if (heroes.length === 0) return refused(local, "No hero's hit points are known.");
    const only = heroes.length === 1 ? heroes[0] : undefined;
    return only
      ? applyLive(local, { kind, heroId: only })
      : toStep(local, { kind: "who", pick: "rally" });
  }
  if (kind === "rest") {
    const heroes = healTargets(play, group);
    if (heroes.length === 0) return refused(local, "No hero's hit points are known.");
    const only = heroes.length === 1 ? heroes[0] : undefined;
    return only
      ? toStep(local, { kind: "rest-moves", heroId: only })
      : toStep(local, { kind: "who", pick: "rest" });
  }
  if (kind === "cure") {
    const heroes = cureTargets(play, group);
    if (heroes.length === 0) return refused(local, "No one here holds a corruption.");
    // The iPad always names who is cured, even when one hero holds a corruption (EV-07).
    return toStep(local, { kind: "who", pick: "cure" });
  }
  return refused(local, REFUSALS["not-offered"]);
};

/** A hero who holds more than one named corruption chooses which goes (Q-C3-20). */
const afterCureHero = (local: EncounterLocal, heroId: string): EncounterLocal => {
  const named = heroSheet(ensureClock(playState()), heroId).named ?? [];
  if (named.length > 1) return toStep(local, { kind: "corruption", heroId });
  return applyLive(local, {
    kind: "cure",
    heroId,
    ...(named[0] ? { corruptionId: named[0] } : {}),
  });
};

const QUEST_REFUSALS: Record<QuestRefusal, string> = {
  "unknown-group": REFUSALS["unknown-group"],
  "unknown-quest": "There is no open quest here.",
  "already-done": "That quest is already done.",
  "not-offered": REFUSALS["not-offered"],
  disabled: REFUSALS["not-offered"],
  "not-chosen": "That press does not fit what the building is asking.",
  "nothing-to-pick": "That press does not fit what the building is asking.",
  "not-pickable": REFUSALS["no-target"],
};

/** The step a quest view asks for: a hero pick, or its options. */
const questStep = (view: QuestView): BuildingStep =>
  view.pending
    ? { kind: "quest-hero", questId: view.questId, pending: view.pending.kind }
    : { kind: "quest", questId: view.questId };

/**
 * The quest is done or left: the turn ends at once (DEC-821, DEC-948). Moves go to 0, the turn-end
 * losses run once, the gold the quest paid reaches the sheets, and the building shows its menu with
 * every pick greyed and Leave open. The quest's moves are read from the live state first.
 */
const endQuestTurn = (local: EncounterLocal): EncounterLocal => {
  const play = playState();
  endTurnAfterQuest(play, local.groupId);
  const movesLeft = commitLive(play, local.groupId);
  return toStep({ ...local, movesLeft }, { kind: "menu" });
};

/** The Quest pick (DEC-083, DEC-948): 1 move, then the quest's own step. */
const startQuest = (local: EncounterLocal): EncounterLocal => {
  const play = playState();
  loadLive(play, local.groupId, movesOf(local));
  const gate = questPickGate(play, local.groupId);
  if (!gate.ok) return refused(local, REFUSALS[gate.reason]);
  const opened = handleQuestPick(local.groupId);
  if (!opened.ok) return refused(local, QUEST_REFUSALS[opened.reason]);
  spendQuestMove(play, local.groupId);
  const movesLeft = commitLive(play, local.groupId);
  return toStep({ ...local, movesLeft }, questStep(opened.view));
};

/** One press inside the quest: `run` takes it against the live state; the step then follows the quest. */
const questPress = (
  local: EncounterLocal,
  run: (play: ReturnType<typeof playState>) => QuestResult,
): EncounterLocal => {
  const play = playState();
  loadLive(play, local.groupId, movesOf(local));
  const result = run(play);
  if (!result.ok) return refused(local, QUEST_REFUSALS[result.reason]);
  // DEC-676, DEC-905: a lost game (any reason) stops the quest; no turn-end loss runs and no step is offered.
  if (isGameLost(play)) {
    const movesLeft = commitLive(play, local.groupId);
    return { ...local, movesLeft, awaitingPress: false, refusal: null };
  }
  if (result.view.done) return endQuestTurn(local);
  const movesLeft = commitLive(play, local.groupId);
  return toStep({ ...local, movesLeft }, questStep(result.view));
};

/**
 * One press on the building's own buttons (action `build`). A press that does not fit the step it
 * names is refused, not ignored: `refusal` carries the words, and the shell logs and toasts them.
 */
export const handleBuildingPress = (local: EncounterLocal, promptId: string): EncounterLocal => {
  const press = parseBuildPrompt(promptId);
  if (!press || press.groupId !== local.groupId) {
    return refused(local, "That press is not for this building.");
  }
  if (press.serial !== (local.serial ?? 0)) {
    return refused(local, "That press is for a step the building has moved past.");
  }
  const step = stepOf(local);

  if (press.verb === "pick" && step.kind === "menu") {
    if (press.arg === "quest") return startQuest(local);
    return startPick(local, press.arg as PickKind);
  }
  if (press.verb === "qopt" && step.kind === "quest") {
    return questPress(local, (play) => chooseOption(play, local.groupId, step.questId, press.arg));
  }
  if (press.verb === "qhero" && step.kind === "quest-hero") {
    const seed = shellState().seed;
    return questPress(local, (play) =>
      pickHero(play, local.groupId, step.questId, press.arg, seed),
    );
  }
  if (press.verb === "qleave" && step.kind === "quest") {
    // Leaving partway is a retreat: the progress stays and the turn ends (DEC-821, DEC-948).
    if (!leaveQuest(playState(), step.questId))
      return refused(local, QUEST_REFUSALS["unknown-quest"]);
    loadLive(playState(), local.groupId, movesOf(local));
    return endQuestTurn(local);
  }
  if (press.verb === "who" && step.kind === "who") {
    const heroes =
      step.pick === "cure"
        ? cureTargets(playState(), local.groupId)
        : healTargets(playState(), local.groupId);
    if (!heroes.includes(press.arg)) return refused(local, REFUSALS["no-target"]);
    if (step.pick === "rally") return applyLive(local, { kind: "rally", heroId: press.arg });
    if (step.pick === "rest") return toStep(local, { kind: "rest-moves", heroId: press.arg });
    return afterCureHero(local, press.arg);
  }
  if (press.verb === "corr" && step.kind === "corruption") {
    const named = heroSheet(ensureClock(playState()), step.heroId).named ?? [];
    if (!named.includes(press.arg)) return refused(local, REFUSALS["no-target"]);
    return applyLive(local, { kind: "cure", heroId: step.heroId, corruptionId: press.arg });
  }
  if (press.verb === "moves" && step.kind === "rest-moves") {
    const count = Number(press.arg);
    // A pending free pick waives one move, so a rest may run one move past the moves left (DEC-946).
    const most = movesOf(local) + (freePickPending(playState(), local.groupId) ? 1 : 0);
    if (!Number.isInteger(count) || count < 1 || count > most) {
      return refused(local, REFUSALS["no-moves"]);
    }
    return applyLive(local, { kind: "rest", heroId: step.heroId, count });
  }
  if (press.verb === "tile" && step.kind === "give-back") {
    const play = playState();
    const tiles = ensurePicks(play).tiles[local.groupId] ?? [];
    const tile = tiles[Number(press.arg)];
    if (tile === undefined || !giveBackTile(play, local.groupId, tile)) {
      return refused(local, "That tile cannot be given back.");
    }
    return afterResult({ ...local, step: { kind: "menu" } });
  }
  if (press.verb === "next" && step.kind === "result" && !step.result.auto) {
    return afterResult(local);
  }
  return refused(local, "That press does not fit what the building is asking.");
};

export { isBuildPrompt };

/** The wait of an auto-advancing result still open, or null. The host reads it and runs it. */
export const openBuildingWait = (
  stack: readonly { loopId: string; local: unknown }[],
): { id: string; maxMs: number; lineId: string | null } | null => {
  const frame = stack.find((row) => row.loopId === "encounter");
  const step = (frame?.local as EncounterLocal | undefined)?.step;
  if (!step || step.kind !== "result" || !step.result.auto) return null;
  if (step.result.waitDone || !step.result.wait) return null;
  return step.result.wait;
};

/** Marks the open building wait done, when `waitId` names it. False means nothing was open for it. */
export const endBuildingWait = (
  stack: readonly { loopId: string; local: unknown }[],
  waitId: string,
): boolean => {
  const frame = stack.find((row) => row.loopId === "encounter");
  const local = frame?.local as EncounterLocal | undefined;
  const step = local?.step;
  if (!frame || !local || !step || step.kind !== "result") return false;
  if (!step.result.auto || step.result.waitDone || step.result.wait?.id !== waitId) return false;
  frame.local = { ...local, step: { kind: "result", result: { ...step.result, waitDone: true } } };
  return true;
};

/** The words a refused press left on the top encounter frame, cleared once taken. */
export const takeBuildingRefusal = (stack: { loopId: string; local: unknown }[]): string | null => {
  const frame = stack.at(-1);
  if (frame?.loopId !== "encounter") return null;
  const local = frame.local as EncounterLocal;
  if (!local.refusal) return null;
  frame.local = { ...local, refusal: null };
  return local.refusal;
};

/** The Quest pick (DEC-083): enters the open quest at the group's space. The board waits (DEC-084). */
export const handleQuestPick = (groupId: string): QuestResult => {
  const play = playState();
  const group = groupById(play, groupId);
  if (!group) return { ok: false, reason: "unknown-group" };
  const questId = openQuestAt(play, group.spaceId);
  if (!questId) return { ok: false, reason: "unknown-quest" };
  return beginQuest(play, groupId, questId);
};
