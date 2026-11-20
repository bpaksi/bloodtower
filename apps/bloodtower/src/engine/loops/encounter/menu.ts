import { AUTO_ADVANCE_MS } from "../../../protocols/v2/views.ts";
import { virtueName } from "../../rules/virtues/index.ts";
import { groupById, type PlayState } from "../chapter/playState.ts";
import { ensureClock, heroSheet } from "../day/clock.ts";
import { beginQuest } from "../quest/quest.ts";
import {
  cureTargets,
  ensurePicks,
  healTargets,
  loadLive,
  MAX_VIRTUE_TILES,
  type MenuEntry,
  openMenu,
  type PickKind,
  pickPrice,
  purseKnown,
} from "./picks.ts";

/*
 * The building menu as data (C3/13, UI-043). One model feeds the loop (which prompts to offer), the
 * press handler (which presses are valid) and the views (what the iPad and the board show), so they
 * cannot disagree. Words come from the Copy table in the brief (plan.md), by slot.
 */

/** Copy slots (plan.md, Loremaster 2026-11-12). */
export const COPY = {
  prompt: "What will you do here?",
  rally: "Rally",
  virtue: "Virtue",
  cure: "Cure",
  rest: "Rest",
  cleanse: "Cleanse",
  leave: "Leave",
  quest: "Quest",
  corruptionHero: "Who takes the corruption?",
  rewardHero: "Who takes the reward?",
  next: "Next",
  curePick: "Who does this?",
  restPrompt: "How many spaces will you move?",
  restResult: "You rest and recover.",
  cureResult: "The corruption is lifted.",
  giveBack: "You can hold four virtues. Give one back.",
  cleanseResult: "The skulls are cleared from this building.",
  cleanseBadge: "−1 skull · +1 day",
  fallen: "This building has fallen. No one can enter.",
} as const;

export const rallyResult = (healed: number): string => `Warriors join your ranks: +${healed}.`;
export const virtueResult = (virtue: string): string => `You gain a virtue: ${virtue}.`;
export const tileLabel = (index: number, count: number): string =>
  index === count - 1 && count > MAX_VIRTUE_TILES ? `Tile ${index + 1} (new)` : `Tile ${index + 1}`;

/** A wait the host runs for a result with no Next (EV-15, EV-16): same shape as the day's. */
export type BuildingWait = { id: string; maxMs: number; lineId: string | null };

/** What a finished pick says. The board shows it; names are filled in by the view. */
export type BuildingResult = {
  pick: PickKind;
  heroId?: string;
  /** Rally and Rest: hit points after, the most, and the points gained. */
  hp?: { hp: number; max: number; gained: number };
  corruptionId?: string;
  tile?: string;
  /** No Next: it moves on by itself when its narration or cue ends, or after 4 s (EV-15). */
  auto: boolean;
  wait: BuildingWait | null;
  waitDone: boolean;
};

export type BuildingStep =
  | { kind: "menu" }
  | { kind: "who"; pick: "rally" | "rest" | "cure" }
  | { kind: "corruption"; heroId: string }
  | { kind: "rest-moves"; heroId: string }
  | { kind: "give-back" }
  /** The open quest's options and Leave (DEC-948). C3-14 draws its scene here. */
  | { kind: "quest"; questId: string }
  /** The quest waits on a hero: who takes the corruption, or the reward. */
  | { kind: "quest-hero"; questId: string; pending: "corruption" | "item" }
  | { kind: "result"; result: BuildingResult };

/** The slice of the encounter's local the model reads. */
export type BuildingLocal = {
  groupId: string;
  movesLeft?: number;
  serial?: number;
  step?: BuildingStep;
};

export type BuildingOption = {
  promptId: string;
  actionId: "build" | "leave";
  label: string;
  /** The cost line under the label (UI-043). */
  detail?: string;
  enabled: boolean;
  /** Why a disabled pick is disabled; the iPad shows it. */
  reason?: string;
};

export type BuildingModel = {
  title: string;
  step: BuildingStep["kind"];
  prompt: string | null;
  options: BuildingOption[];
  result: BuildingResult | null;
  tiles: string[];
};

export const stepOf = (local: BuildingLocal): BuildingStep => local.step ?? { kind: "menu" };

export const movesOf = (local: BuildingLocal): number => local.movesLeft ?? 0;

const BUILDING = "bld";

/** `bld--<group>--<serial>--<verb>[--<arg>]`. Every step has its own serial, so a lock is per step. */
export const buildPromptId = (
  groupId: string,
  serial: number,
  verb: string,
  arg?: string,
): string =>
  [BUILDING, groupId, String(serial), verb, ...(arg === undefined ? [] : [arg])].join("--");

export type ParsedBuildPrompt = { groupId: string; serial: number; verb: string; arg: string };

export const parseBuildPrompt = (promptId: string): ParsedBuildPrompt | null => {
  const parts = promptId.split("--");
  if (parts.length < 4 || parts[0] !== BUILDING) return null;
  const serial = Number(parts[2]);
  if (!Number.isInteger(serial) || serial < 0) return null;
  return {
    groupId: parts[1] ?? "",
    serial,
    verb: parts[3] ?? "",
    arg: parts.slice(4).join("--"),
  };
};

export const isBuildPrompt = (promptId: string): boolean => parseBuildPrompt(promptId) !== null;

const buildingTitle = (building: string): string =>
  building.charAt(0).toUpperCase() + building.slice(1);

export const corruptionName = (id: string): string => id.charAt(0).toUpperCase() + id.slice(1);

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The cost line of a pick: moves first, then gold (EV-01, EV-02), then the pick's own note. */
const costLine = (kind: PickKind, moves: number, price: number | null, free: boolean): string => {
  const parts = [plural(moves, "move")];
  if (free) parts.push("free");
  else if (price !== null && price > 0) parts.push(`${price} gold`);
  if (kind === "rally") parts.push("heals to full");
  return parts.join(" · ");
};

const KIND_LABEL: Record<string, string> = {
  rally: COPY.rally,
  "virtue-draw": COPY.virtue,
  cure: COPY.cure,
  rest: COPY.rest,
  cleanse: COPY.cleanse,
};

const refusalReason = (
  entry: MenuEntry,
  movesLeft: number,
  needsMoves: number,
  purse: number,
  price: number,
): string => {
  if (movesLeft < needsMoves) return "No moves left.";
  if (purse < price) return "Not enough gold.";
  return `${entry.label} is not possible now.`;
};

/** The picks of the open menu, in order, with Leave last. Null when no menu can open (a fallen place). */
const menuOptions = (play: PlayState, local: BuildingLocal): BuildingOption[] | null => {
  const store = ensurePicks(play);
  loadLive(play, local.groupId, movesOf(local));
  const opened = openMenu(play, local.groupId);
  if (!opened.ok) return null;
  const serial = local.serial ?? 0;
  const purse = store.purse[local.groupId] ?? 0;
  const known = purseKnown(play, local.groupId);
  const options: BuildingOption[] = [];
  for (const entry of opened.entries) {
    if (entry.id === "leave") continue;
    if (entry.id === "quest") {
      options.push({
        promptId: buildPromptId(local.groupId, serial, "pick", "quest"),
        actionId: "build",
        label: COPY.quest,
        detail: plural(1, "move"),
        enabled: !entry.disabled,
        ...(entry.disabled ? { reason: "No moves left." } : {}),
      });
      continue;
    }
    const kind = entry.id as PickKind;
    const heroes =
      kind === "cure"
        ? cureTargets(play, local.groupId)
        : kind === "rally" || kind === "rest"
          ? healTargets(play, local.groupId)
          : [];
    const needsTarget = kind === "cure" || kind === "rally" || kind === "rest";
    const price =
      kind === "cure"
        ? heroes.length > 0
          ? Math.min(...heroes.map((hero) => pickPrice(play, local.groupId, kind, hero)))
          : (entry.price ?? 0)
        : (entry.price ?? 0);
    const free = kind === "cure" && heroes.length > 0 && price === 0;
    const moves =
      kind === "rally"
        ? store.tuning.rally.moves
        : kind === "cure"
          ? store.tuning.cure.moves
          : kind === "cleanse"
            ? store.tuning.cleanse.moves
            : 1;
    let enabled = !entry.disabled;
    let reason: string | undefined;
    if (needsTarget && heroes.length === 0) {
      enabled = false;
      reason =
        kind === "cure" ? "No one here holds a corruption." : "No hero's hit points are known.";
    } else if (price > 0 && !known) {
      enabled = false;
      reason = "Gold is not known.";
    } else if (entry.disabled) {
      reason =
        kind === "cleanse" && movesOf(local) >= moves && purse >= price
          ? "There are no skulls to clear."
          : refusalReason(entry, movesOf(local), moves, purse, price);
    }
    const detail = kind === "rest" ? "tavern · +3 HP per move" : costLine(kind, moves, price, free);
    options.push({
      promptId: buildPromptId(local.groupId, serial, "pick", kind),
      actionId: "build",
      label: KIND_LABEL[kind] ?? entry.label,
      detail,
      enabled,
      ...(reason ? { reason } : {}),
    });
  }
  options.push({
    promptId: `leave--${local.groupId}`,
    actionId: "leave",
    label: COPY.leave,
    enabled: true,
  });
  return options;
};

const buildingNameOf = (play: PlayState, groupId: string): string => {
  const group = groupById(play, groupId);
  const building = group ? play.content.board.spaceById.get(group.spaceId)?.building : undefined;
  return building ? buildingTitle(building) : "Building";
};

/** The model of the step the encounter is on. `nameOf` turns a hero id into the name the table sees. */
export const buildingModel = (
  play: PlayState,
  local: BuildingLocal,
  nameOf: (heroId: string) => string,
): BuildingModel => {
  const step = stepOf(local);
  const serial = local.serial ?? 0;
  const group = local.groupId;
  const title = buildingNameOf(play, group);
  const tiles = [...(ensurePicks(play).tiles[group] ?? [])];
  const base = { title, step: step.kind, tiles, result: null } as const;
  const clock = ensureClock(play);

  if (step.kind === "menu") {
    const options = menuOptions(play, local) ?? [
      {
        promptId: `leave--${group}`,
        actionId: "leave" as const,
        label: COPY.leave,
        enabled: true,
      },
    ];
    return { ...base, prompt: COPY.prompt, options };
  }

  if (step.kind === "who") {
    const heroes = step.pick === "cure" ? cureTargets(play, group) : healTargets(play, group);
    return {
      ...base,
      prompt: step.pick === "rest" ? COPY.restPrompt : COPY.curePick,
      options: heroes.map((heroId) => ({
        promptId: buildPromptId(group, serial, "who", heroId),
        actionId: "build" as const,
        label: nameOf(heroId),
        // Each hero's own price: the first cure of a chapter is free per hero (DEC-700).
        ...(step.pick === "cure"
          ? (() => {
              const price = pickPrice(play, group, "cure", heroId);
              return {
                detail: costLine("cure", ensurePicks(play).tuning.cure.moves, price, price === 0),
              };
            })()
          : {}),
        enabled: true,
      })),
    };
  }

  if (step.kind === "corruption") {
    const named = heroSheet(clock, step.heroId).named ?? [];
    return {
      ...base,
      prompt: COPY.curePick,
      options: named.map((id) => ({
        promptId: buildPromptId(group, serial, "corr", id),
        actionId: "build" as const,
        label: corruptionName(id),
        enabled: true,
      })),
    };
  }

  if (step.kind === "rest-moves") {
    const most = Math.min(Math.max(0, movesOf(local)), 12);
    return {
      ...base,
      prompt: COPY.restPrompt,
      options: Array.from({ length: most }, (_, index) => ({
        promptId: buildPromptId(group, serial, "moves", String(index + 1)),
        actionId: "build" as const,
        label: String(index + 1),
        enabled: true,
      })),
    };
  }

  if (step.kind === "quest" || step.kind === "quest-hero") {
    // The buttons are the quest's own: its visible options by the pack's labels, then Leave (DEC-948).
    loadLive(play, group, movesOf(local));
    const opened = beginQuest(play, group, step.questId);
    const view = opened.ok ? opened.view : null;
    if (step.kind === "quest-hero") {
      return {
        ...base,
        prompt: step.pending === "corruption" ? COPY.corruptionHero : COPY.rewardHero,
        options: (view?.pending?.heroes ?? []).map((heroId) => ({
          promptId: buildPromptId(group, serial, "qhero", heroId),
          actionId: "build" as const,
          label: nameOf(heroId),
          enabled: true,
        })),
      };
    }
    return {
      ...base,
      prompt: null,
      options: [
        ...(view?.options ?? []).map((row) => ({
          promptId: buildPromptId(group, serial, "qopt", row.id),
          actionId: "build" as const,
          label: row.label,
          enabled: !row.disabled,
        })),
        {
          promptId: buildPromptId(group, serial, "qleave"),
          actionId: "build" as const,
          label: COPY.leave,
          enabled: true,
        },
      ],
    };
  }

  if (step.kind === "give-back") {
    return {
      ...base,
      prompt: COPY.giveBack,
      options: tiles.map((tile, index) => ({
        promptId: buildPromptId(group, serial, "tile", String(index)),
        actionId: "build" as const,
        label: tileLabel(index, tiles.length),
        detail: virtueName(tile),
        enabled: true,
      })),
    };
  }

  const result = step.result;
  return {
    ...base,
    result,
    prompt: null,
    options: result.auto
      ? []
      : [
          {
            promptId: buildPromptId(group, serial, "next"),
            actionId: "build" as const,
            label: COPY.next,
            enabled: true,
          },
        ],
  };
};

/**
 * The wait a new auto-advancing result starts with. No narration line is packed for these yet, so a
 * real game waits the 4 s; `lineId` is set only by the test seed `~test-building-line:`.
 */
export const resultWait = (
  groupId: string,
  serial: number,
  lineId: string | null = null,
): BuildingWait => ({
  id: `building-${groupId}-${serial}`.slice(0, 80),
  maxMs: AUTO_ADVANCE_MS,
  lineId,
});
