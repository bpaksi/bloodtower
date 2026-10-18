import { type ControlAction, controlMessageSchema, holdMessageSchema } from "bloodtower-protocols";

/** A hold from a device. The story board has no helper that builds one. */
export const holdMessage = (hunter: string, action: "take" | "release") =>
  holdMessageSchema.parse({
    v: 1,
    type: "hold",
    payload: { hunter, action },
  });

/**
 * A control press. The payload has a prompt and an action, never a tower command. A pick adds
 * its option; a set adds its setting and option; a write-in volume answer adds its text.
 */
export const controlMessage = (
  promptId: string,
  action: ControlAction,
  option?: string,
  setting?: string,
  note?: string,
) =>
  controlMessageSchema.parse({
    v: 1,
    type: "control",
    payload: {
      promptId,
      action,
      ...(option === undefined ? {} : { option }),
      ...(setting === undefined ? {} : { setting }),
      ...(note === undefined ? {} : { note }),
    },
  });
