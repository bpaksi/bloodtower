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
        open: true,
      }
    : {
        promptId: action.promptId,
        actionId: action.actionId,
        label: action.label,
        open: false,
        reason: action.reason,
      };

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
      })),
      narration: state.narration,
      actions: offered,
    });
  }

  const heroesOnDevice =
    state.screen === "claim-heroes" || state.screen === "begin"
      ? state.heroes.filter((hero) => hero.deviceId === audience.deviceId || hero.deviceId === null)
      : state.heroes.filter((hero) => hero.deviceId === audience.deviceId);

  return deviceViewPayloadSchema.parse({
    deviceId: audience.deviceId,
    screen: state.screen,
    shows: current.shows,
    heroes: heroesOnDevice.map((hero) => ({
      id: hero.id,
      name: hero.name,
      lines:
        hero.deviceId === audience.deviceId
          ? hero.lines.map((line) => ({ id: line.id, text: line.text }))
          : [],
    })),
    actions: state.actions.filter((action) => offeredTo(action, audience.deviceId)).map(toOffered),
  });
}
