"use client";
// Sends one capability command at a time and follows its lifecycle. While the last one is under
// way the caller's control stays locked, so a second press cannot queue a second physical action.
import { useState } from "react";
import { isPending } from "./service.ts";
import { sendToService, useService } from "./store.ts";

export const useCommand = (capabilityId: string) => {
  const [commandId, setCommandId] = useState<string>();
  const [unsent, setUnsent] = useState(false);
  const stages = useService((view) => (commandId ? view.commands[commandId] : undefined));
  // A command the service never acknowledged is pending only while the link is up: a lost link
  // drops it unanswered, and holding the lock forever would leave the control dead.
  const online = useService((view) => view.socket === "online");
  const pending = commandId !== undefined && online && isPending(stages);

  const send = (params: unknown) => {
    if (pending) return;
    const id = sendToService("command", { capabilityId, params });
    setUnsent(id === undefined);
    setCommandId(id);
  };

  return { send, pending, stages: stages ?? [], unsent };
};
