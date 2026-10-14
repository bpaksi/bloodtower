// When a capability's control may be used, as the service will judge it. Pure, so it is tested
// without React. The service still decides: a control enabled here can be refused there, and the
// refusal is shown. This only spares the person a press the service would refuse anyway.
import type {
  CommandLifecyclePayload,
  ConnectionPayload,
  InventoryEntry,
  ParamField,
} from "tower-poc-protocols";
import { STAGE_LABELS } from "./labels.ts";

export interface ControlContext {
  /** The link to the service is up. Without it nothing is known about the tower. */
  online: boolean;
  connection: ConnectionPayload | undefined;
  /** The service's inventory entry, from `welcome`. Undefined until it has answered. */
  entry: InventoryEntry | undefined;
}

export type ControlState = { enabled: true } | { enabled: false; reason: string };

/**
 * Whether a command control is usable now, and if not, why, in words for the person. The order
 * matches the executor's checks: connected, not calibrating (D22), calibrated when the capability
 * needs it (D9).
 */
export const controlState = ({ online, connection, entry }: ControlContext): ControlState => {
  if (!online || !connection || !entry) {
    return { enabled: false, reason: "The service is not reachable." };
  }
  if (!entry.commandable) {
    return { enabled: false, reason: "This service does not offer it." };
  }
  if (connection.state !== "connected") {
    return { enabled: false, reason: "Connect the tower first." };
  }
  if (connection.calibration === "calibrating") {
    return { enabled: false, reason: "The tower is calibrating." };
  }
  if (entry.availability === "requires-calibration" && connection.calibration !== "calibrated") {
    return { enabled: false, reason: "Calibrate the tower first." };
  }
  return { enabled: true };
};

/**
 * What the tower is known to have done with a command, kept apart from what was asked for. Only
 * `confirmed` means the tower answered; `indeterminate` was written and not answered, which is not
 * a failure (GAP-HW-010).
 */
export type Outcome =
  | { kind: "waiting"; label: string }
  | { kind: "confirmed"; label: string }
  | { kind: "unconfirmed"; label: string }
  | { kind: "failed"; label: string }
  | { kind: "unknown"; label: string };

export const outcomeOf = (
  stages: readonly CommandLifecyclePayload[] | undefined,
  interrupted: boolean,
): Outcome => {
  const last = stages?.at(-1);
  const label = (stage: CommandLifecyclePayload) =>
    stage.reason ? `${STAGE_LABELS[stage.stage]}: ${stage.reason}` : STAGE_LABELS[stage.stage];
  switch (last?.stage) {
    case "confirmed":
      return { kind: "confirmed", label: label(last) };
    case "indeterminate":
      return { kind: "unconfirmed", label: label(last) };
    case "failed":
    case "timed-out":
    case "rejected":
      return { kind: "failed", label: label(last) };
  }
  if (interrupted) {
    return {
      kind: "unknown",
      label: "Outcome unknown: the link to the service dropped before it ended",
    };
  }
  return { kind: "waiting", label: last ? label(last) : "Sending" };
};

/**
 * What was asked for, as the person reads it: each field's label and the value sent, in the
 * form's order. A field left out (the library's default) is not listed. Empty means no params.
 */
export const describeRequested = (fields: readonly ParamField[], params: unknown) => {
  const parts: string[] = [];
  for (const field of fields) {
    let value: unknown = params;
    for (const part of field.path) {
      value =
        typeof value === "object" && value !== null
          ? (value as Record<string, unknown>)[part]
          : undefined;
    }
    if (value === undefined) continue;
    parts.push(
      `${field.label} ${field.kind === "boolean" ? (value ? "yes" : "no") : String(value)}`,
    );
  }
  return parts.join(", ");
};

/**
 * Validation issues placed where the person will see them, by field key. An issue on a field goes
 * to it. One on a nested object no field stands for (a seal left wholly empty is reported at
 * `seal`) goes to each field inside it. Anything else goes under "", shown for the whole form, so
 * no issue is ever dropped.
 */
export const errorsByField = (
  fields: readonly ParamField[],
  issues: readonly { path: readonly (string | number)[]; message: string }[],
) => {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".");
    const targets = fields.filter(
      (field) => field.key === key || (key !== "" && field.key.startsWith(`${key}.`)),
    );
    for (const target of targets.length > 0 ? targets.map((field) => field.key) : [""]) {
      errors[target] ??= issue.message;
    }
  }
  return errors;
};
