"use client";
// What every capability control reads from the service: whether it may be used now, and the
// newest command for its capability from any device (D7). Shared by the generated control and the
// ones a schema needs its own component for (lights).
import { type ControlState, controlState } from "./controls.ts";
import { latestCommand } from "./service.ts";
import { useService } from "./store.ts";

export const useControlState = (capabilityId: string): ControlState => {
  const online = useService((view) => view.socket === "online");
  const connection = useService((view) => view.connection);
  const entry = useService((view) =>
    view.welcome?.inventory.find((candidate) => candidate.id === capabilityId),
  );
  return controlState({ online, connection, entry });
};

/**
 * The newest command for a capability, so every screen shows the same, and whether `commandId`
 * (this page's own command) is it.
 */
export const useLatestCommand = (capabilityId: string, commandId: string | undefined) => {
  const ownClientIds = useService((view) => view.ownClientIds);
  const stages = useService((view) => latestCommand(view.commands, capabilityId));
  const latestId = stages?.[0]?.commandId;
  const interrupted = useService((view) =>
    latestId ? view.interrupted[latestId] === true : false,
  );
  const sender: "this device" | "another device" =
    stages?.[0] && ownClientIds.includes(stages[0].clientId) ? "this device" : "another device";
  return { stages, interrupted, sender, own: latestId !== undefined && latestId === commandId };
};
