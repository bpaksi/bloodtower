import { type ControlAction, controlMessageSchema, holdMessageSchema } from "bloodtower-protocols";

/** A hold from a device. The story board has no helper that builds one. */
export const holdMessage = (hunter: string, action: "take" | "release") =>
  holdMessageSchema.parse({
    v: 1,
    type: "hold",
    payload: { hunter, action },
  });

/** A control press. The payload has a prompt and an action, never a tower command. */
export const controlMessage = (promptId: string, action: ControlAction, option?: string) =>
  controlMessageSchema.parse({
    v: 1,
    type: "control",
    payload: option === undefined ? { promptId, action } : { promptId, action, option },
  });
