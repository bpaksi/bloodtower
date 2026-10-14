// What this browser knows about the tower service, and how each server message changes it. Pure
// functions, so they can be tested without a socket or React.
import {
  type ClientSocketState,
  type CommandLifecyclePayload,
  type ConnectionPayload,
  END_STAGES,
  type ServerMessage,
  type StatePayload,
  type WelcomePayload,
} from "tower-poc-protocols";

/** An `error` the service sent, with when it arrived. */
export interface ServiceError {
  code: string;
  message: string;
  actionable?: string;
  /** The id of the message it answers, when it answers one. */
  correlationId?: string;
  at: number;
}

export interface ServiceView {
  socket: ClientSocketState;
  /** From `welcome`. Undefined until the service has answered `hello` on this socket. */
  welcome?: WelcomePayload;
  /**
   * Undefined while this browser has no live link to the service: the tower may have changed
   * since, so the last value received would be a guess (spec: unknown is shown as unavailable).
   */
  connection?: ConnectionPayload;
  state?: StatePayload;
  /**
   * Lifecycle stages per command id, oldest command first, at most `COMMAND_HISTORY`. A command
   * this page sent is here, with no stages, from the moment it is sent.
   */
  commands: Record<string, CommandLifecyclePayload[]>;
  /**
   * Commands that had not ended when the link to the service dropped. The service does not replay
   * lifecycles, so their outcome may never arrive; they are no longer treated as under way.
   */
  interrupted: Record<string, true>;
  /**
   * Ids of this page's `verify.record`s the service has saved, newest last, at most
   * `COMMAND_HISTORY`. A refusal arrives as `lastError` with the same id.
   */
  savedVerifications: readonly string[];
  /** Every client id the service has given this page: each new socket gets a new one. */
  ownClientIds: readonly string[];
  lastError?: ServiceError;
}

/** Commands whose lifecycles are kept. Enough for the dashboard; the timeline is M4's. */
export const COMMAND_HISTORY = 50;

export const initialView: ServiceView = {
  socket: "reconnecting-to-service",
  commands: {},
  interrupted: {},
  savedVerifications: [],
  ownClientIds: [],
};

const keepLatest = (commands: ServiceView["commands"]) => {
  const ids = Object.keys(commands);
  if (ids.length <= COMMAND_HISTORY) return commands;
  return Object.fromEntries(ids.slice(-COMMAND_HISTORY).map((id) => [id, commands[id] ?? []]));
};

export const applyServerMessage = (
  view: ServiceView,
  message: ServerMessage,
  now: number,
): ServiceView => {
  switch (message.type) {
    case "welcome": {
      const { clientId } = message.payload;
      const ownClientIds = view.ownClientIds.includes(clientId)
        ? view.ownClientIds
        : [...view.ownClientIds, clientId];
      return { ...view, welcome: message.payload, ownClientIds };
    }
    case "connection":
      return { ...view, connection: message.payload };
    case "state":
      return { ...view, state: message.payload };
    case "command.lifecycle": {
      const { commandId } = message.payload;
      const stages = [...(view.commands[commandId] ?? []), message.payload];
      // Re-inserting moves a command to the end only when it is new, so the order is first seen.
      const commands = { ...view.commands, [commandId]: stages };
      return { ...view, commands: keepLatest(commands) };
    }
    case "verify.changed": {
      // The overlay travels in `welcome`; this is its newer version.
      const { correlationId } = message;
      const savedVerifications = correlationId
        ? [...view.savedVerifications, correlationId].slice(-COMMAND_HISTORY)
        : view.savedVerifications;
      return {
        ...view,
        ...(view.welcome
          ? {
              welcome: {
                ...view.welcome,
                verificationOverlay: message.payload.verificationOverlay,
              },
            }
          : {}),
        savedVerifications,
      };
    }
    case "error":
      return {
        ...view,
        lastError: {
          ...message.payload,
          ...(message.correlationId ? { correlationId: message.correlationId } : {}),
          at: now,
        },
      };
  }
};

const ended = (stages: readonly CommandLifecyclePayload[] | undefined) => {
  const last = stages?.at(-1);
  return last !== undefined && END_STAGES.includes(last.stage);
};

/** Records a command this page has just sent, so it counts as under way before any stage arrives. */
export const markSent = (view: ServiceView, commandId: string): ServiceView => ({
  ...view,
  commands: keepLatest({ ...view.commands, [commandId]: view.commands[commandId] ?? [] }),
});

/**
 * The link to the service changed. Losing it forgets the tower's connection and state, which are
 * unknown until the service sends them again, and marks every command that had not ended as
 * interrupted. The command history stays, as a record.
 */
export const applySocketState = (view: ServiceView, socket: ClientSocketState): ServiceView => {
  if (socket === "online") return { ...view, socket };
  const { welcome: _w, connection: _c, state: _s, ...rest } = view;
  const interrupted = { ...view.interrupted };
  for (const [id, stages] of Object.entries(view.commands)) {
    if (!ended(stages)) interrupted[id] = true;
  }
  return { ...rest, interrupted, socket };
};

/** The latest stage of a command, if the service has reported one. */
export const latestStage = (stages: readonly CommandLifecyclePayload[] | undefined) =>
  stages?.at(-1);

/**
 * True while a sent command has not reached an end stage and the link it was sent on has not
 * dropped since.
 */
export const isPending = (
  stages: readonly CommandLifecyclePayload[] | undefined,
  interrupted = false,
) => !interrupted && !ended(stages);

/** True when the link dropped before a command ended, so its outcome is not known here. */
export const isInterrupted = (view: ServiceView, commandId: string) =>
  view.interrupted[commandId] === true && !ended(view.commands[commandId]);

/**
 * The stages of the newest command for a capability, whoever sent it (D7: every client sees every
 * lifecycle). Returns the stored array, so a selector using it is stable between renders.
 */
export const latestCommand = (commands: ServiceView["commands"], capabilityId: string) => {
  const all = Object.values(commands);
  for (let i = all.length - 1; i >= 0; i -= 1) {
    if (all[i]?.[0]?.capabilityId === capabilityId) return all[i];
  }
  return undefined;
};
