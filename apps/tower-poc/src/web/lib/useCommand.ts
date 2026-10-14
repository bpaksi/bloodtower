"use client";
// Sends one capability command at a time and follows its lifecycle. While the last one is under
// way the caller's control stays locked, so a second press cannot queue a second physical action.
// A command cut off by a lost link to the service unlocks: its outcome may never arrive.
import { useState } from "react";
import { isPending, markSent } from "./service.ts";
import { sendToService, useService } from "./store.ts";

export const useCommand = (capabilityId: string) => {
  const [commandId, setCommandId] = useState<string>();
  const [unsent, setUnsent] = useState(false);
  const stages = useService((view) => (commandId ? view.commands[commandId] : undefined));
  const interrupted = useService((view) =>
    commandId ? view.interrupted[commandId] === true : false,
  );
  const pending = commandId !== undefined && isPending(stages, interrupted);

  const send = (params: unknown) => {
    if (pending) return;
    const id = sendToService("command", { capabilityId, params });
    if (id) useService.setState((view) => markSent(view, id), true);
    setUnsent(id === undefined);
    setCommandId(id);
  };

  return { send, pending, unsent };
};
