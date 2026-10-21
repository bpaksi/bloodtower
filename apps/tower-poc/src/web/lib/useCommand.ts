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
  // What this page asked for. The lifecycle does not carry params, so only the sender knows them.
  const [requested, setRequested] = useState<unknown>();
  const stages = useService((view) => (commandId ? view.commands[commandId] : undefined));
  const interrupted = useService((view) =>
    commandId ? view.interrupted[commandId] === true : false,
  );
  const pending = commandId !== undefined && isPending(stages, interrupted);

  /** Returns the command's id, or undefined when nothing was sent. */
  const send = (params: unknown) => {
    if (pending) return undefined;
    const id = sendToService("command", { capabilityId, params });
    if (id) useService.setState((view) => markSent(view, id), true);
    setUnsent(id === undefined);
    setCommandId(id);
    setRequested(id === undefined ? undefined : params);
    return id;
  };

  return { send, pending, unsent, commandId, stages, interrupted, requested };
};
