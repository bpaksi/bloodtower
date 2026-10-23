import { type CommandLifecyclePayload, END_STAGES } from "@dark-tower/tower";
import { markSent } from "./service.ts";
import { sendToService, useService } from "./store.ts";

const ended = (stages: readonly CommandLifecyclePayload[] | undefined) => {
  const last = stages?.at(-1);
  return last !== undefined && END_STAGES.includes(last.stage);
};

/** Sends one command. Undefined when the service is not reachable; nothing is kept to send later. */
export const sendCommand = (capabilityId: string, params: unknown) => {
  const id = sendToService("command", { capabilityId, params });
  if (id) useService.setState((view) => markSent(view, id), true);
  return id;
};

/** Resolves with the lifecycle once it ends, or "interrupted" if the link drops first. */
export const waitForCommand = (commandId: string) =>
  new Promise<readonly CommandLifecyclePayload[] | "interrupted">((resolve) => {
    const current = () => {
      const view = useService.getState();
      const stages = view.commands[commandId];
      if (ended(stages)) return stages;
      if (view.interrupted[commandId]) return "interrupted" as const;
      return undefined;
    };
    const immediate = current();
    if (immediate) {
      resolve(immediate);
      return;
    }
    const unsubscribe = useService.subscribe(() => {
      const next = current();
      if (!next) return;
      unsubscribe();
      resolve(next);
    });
  });

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
