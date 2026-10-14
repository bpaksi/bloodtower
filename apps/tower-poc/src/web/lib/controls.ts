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
 * A lifecycle stage's name for the person. An `indeterminate` the service marks `written: false`
 * sent nothing (by the library's record the tower was already in that state), so it reads
 * "Not sent", not "Sent, no answer".
 */
export const stageName = (stage: CommandLifecyclePayload) =>
  stage.stage === "indeterminate" && stage.written === false
    ? "Not sent"
    : STAGE_LABELS[stage.stage];

/**
 * What the tower is known to have done with a command, kept apart from what was asked for. Only
 * `confirmed` means the tower answered; `indeterminate` was written and not answered, which is not
 * a failure (GAP-HW-010), or was not written at all (`written: false`).
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
  const label = (stage: CommandLifecyclePayload) => {
    const name = stageName(stage);
    return stage.reason ? `${name}: ${stage.reason}` : name;
  };
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
 * A field as a control shows it. An integer field may carry `names`, one per allowed number from
 * `min`, so the person picks "top" rather than 0; the number is still what is sent.
 */
export type ControlField = ParamField & { names?: readonly string[] };

/** Names for an integer field, by field key, with an optional label to replace the generated one. */
export type FieldChoices = Readonly<Record<string, { label?: string; names: readonly string[] }>>;

/**
 * The fields with their choices applied. A choice for a field that is not an integer, or with a
 * name count that does not match the field's range, is a programming error and throws, so a
 * schema change cannot leave a number unnamed or a name pointing nowhere.
 */
export const applyChoices = (
  fields: readonly ParamField[],
  choices: FieldChoices,
): ControlField[] => {
  for (const key of Object.keys(choices)) {
    if (!fields.some((field) => field.key === key)) throw new Error(`No field "${key}" to name.`);
  }
  return fields.map((field) => {
    const choice = choices[field.key];
    if (!choice) return field;
    if (field.kind !== "integer" || choice.names.length !== field.max - field.min + 1) {
      throw new Error(`The names for "${field.key}" do not match its values.`);
    }
    return { ...field, label: choice.label ?? field.label, names: choice.names };
  });
};

/**
 * What was asked for, as the person reads it: each field's label and the value sent, in the
 * form's order, by name where the field has names. A field left out (the library's default) is
 * not listed. Empty means no params.
 */
export const describeRequested = (fields: readonly ControlField[], params: unknown) => {
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
    const named =
      field.kind === "integer" && field.names && typeof value === "number"
        ? field.names[value - field.min]
        : undefined;
    parts.push(
      `${field.label} ${
        field.kind === "boolean" ? (value ? "yes" : "no") : (named ?? String(value))
      }`,
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
