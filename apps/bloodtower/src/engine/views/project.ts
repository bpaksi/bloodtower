import type { BoardView, DeviceView, OfferedAction } from "../../protocols/v2/index.ts";
import {
  boardContentRefused,
  boardViewPayloadSchema,
  deviceViewPayloadSchema,
} from "../../protocols/v2/index.ts";
import type { Audience, ViewAction, ViewState } from "./state.ts";

export type ProjectedView = BoardView | DeviceView;

const toOffered = (action: ViewAction): OfferedAction =>
  action.open
    ? {
        promptId: action.promptId,
        actionId: action.actionId,
        label: action.label,
        ...(action.slot ? { slot: action.slot } : {}),
        open: true,
      }
    : {
        promptId: action.promptId,
        actionId: action.actionId,
        label: action.label,
        ...(action.slot ? { slot: action.slot } : {}),
        open: false,
        reason: action.reason,
      };

/** Prompt ids of a virtue's options start with this (group-turn loop). */
const VIRTUE_CHOICE_PREFIX = "virtue-choice--";

/** Prompt ids of an event's choices start with this (day loop, C3/12). */
const EVENT_CHOICE_PREFIX = "event-choice--";

const offeredTo = (action: ViewAction, deviceId: string) =>
  action.deviceId === null || action.deviceId === deviceId;

/**
 * One view per audience. The board gets public levels and held flags.
 * An iPad gets private lines only for the heroes it holds.
 * Schemas live in protocol v2; this import is a relative path so the engine
 * package does not gain a dependency.
 */
export function project(state: ViewState, audience: { kind: "board" }): BoardView;
export function project(
  state: ViewState,
  audience: { kind: "device"; deviceId: string },
): DeviceView;
export function project(state: ViewState, audience: Audience): ProjectedView;
export function project(state: ViewState, audience: Audience): ProjectedView {
  const current = state.levels.at(-1);
  if (!current) throw new Error("A view needs a public level.");

  const offered = state.actions.map(toOffered);
  if (
    boardContentRefused({
      screen: state.screen,
      levels: state.levels,
      narration: state.narration,
      actions: offered,
      heroes: state.heroes.map((hero) => ({ id: hero.id, name: hero.name })),
    })
  ) {
    throw new Error("A public view field carries a private line or a tower command.");
  }

  if (audience.kind === "board") {
    return boardViewPayloadSchema.parse({
      screen: state.screen,
      levels: state.levels.map((level) => ({
        id: level.id,
        label: level.label,
        shows: level.shows,
      })),
      heroes: state.heroes.map((hero) => ({
        id: hero.id,
        name: hero.name,
        held: hero.deviceId !== null,
        ...(hero.card?.role !== undefined ? { role: hero.card.role } : {}),
        ...(hero.card?.fight !== undefined ? { fight: hero.card.fight } : {}),
        ...(hero.card?.hitPoints !== undefined ? { hitPoints: hero.card.hitPoints } : {}),
        ...(hero.card?.ability !== undefined ? { ability: hero.card.ability } : {}),
      })),
      narration: state.narration,
      actions: offered,
      table: state.table ?? null,
      place: state.place ?? null,
      ...(state.hint ? { hint: state.hint } : {}),
      ...(state.gear ? { gear: state.gear } : {}),
      ...(state.chance ? { chance: state.chance } : {}),
    });
  }

  // The disconnect pause picks as the Pick screen does (DEC-953). The view state carries no pause
  // cause, so the pause's count line ("N of N picked", set only for that cause) says which one.
  const rePick = state.screen === "pause" && /^\d+ of \d+ picked$/.test(current.shows);
  const heroesOnDevice =
    state.screen === "claim-heroes" || rePick
      ? state.heroes
      : state.screen === "begin"
        ? state.heroes.filter(
            (hero) => hero.deviceId === audience.deviceId || hero.deviceId === null,
          )
        : state.heroes.filter((hero) => hero.deviceId === audience.deviceId);

  const claimFor = (deviceId: string | null): "open" | "yours" | "taken" => {
    if (deviceId === null) return "open";
    return deviceId === audience.deviceId ? "yours" : "taken";
  };

  const doors = state.levels
    .filter((level) => level.id.startsWith("door-"))
    .map((level) => ({
      id: level.id.slice("door-".length),
      title: level.label,
      focus: level.shows.startsWith("In focus"),
    }));

  const held = state.deviceHold ?? null;
  // A virtue's choice goes to the iPads of the acting group only (CU/14, EV-03): another group's
  // iPad is not offered its buttons.
  const virtueHeroes = state.table?.virtue?.heroIds ?? [];
  const holdsActing = state.heroes.some(
    (hero) => hero.deviceId === audience.deviceId && virtueHeroes.includes(hero.id),
  );
  // An event's choice goes to the iPads of the present heroes only (DEC-019, C3/12, EV-03).
  const eventHeroes = state.table?.event?.heroIds ?? [];
  const holdsPresent = state.heroes.some(
    (hero) => hero.deviceId === audience.deviceId && eventHeroes.includes(hero.id),
  );
  const deviceActions = (held ? held.actions : state.actions).filter(
    (action) =>
      (holdsActing || !action.promptId.startsWith(VIRTUE_CHOICE_PREFIX)) &&
      (holdsPresent || !action.promptId.startsWith(EVENT_CHOICE_PREFIX)),
  );

  return deviceViewPayloadSchema.parse({
    deviceId: audience.deviceId,
    screen: state.screen,
    shows: current.shows,
    table: held ? held.table : (state.table ?? null),
    ...(held ? { held: true } : {}),
    ...(doors.length > 0 ? { doors } : {}),
    heroes: heroesOnDevice.map((hero) => ({
      id: hero.id,
      name: hero.name,
      ...(state.screen === "claim-heroes" || rePick ? { claim: claimFor(hero.deviceId) } : {}),
      lines:
        hero.deviceId === audience.deviceId
          ? hero.lines.map((line) => ({ id: line.id, text: line.text }))
          : [],
    })),
    actions: deviceActions.filter((action) => offeredTo(action, audience.deviceId)).map(toOffered),
    ...(state.settings && state.settings.length > 0 ? { settings: state.settings } : {}),
    ...(state.gear ? { gear: state.gear } : {}),
  });
}
