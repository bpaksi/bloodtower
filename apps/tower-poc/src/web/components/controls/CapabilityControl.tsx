"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import {
  buildParams,
  type CommandableId,
  type CommandIssue,
  describeParams,
  findCapability,
  type ParamValues,
  validateCommand,
} from "tower-poc-protocols";
import { CommandStatus } from "@/components/controls/CommandStatus";
import { Button } from "@/components/ui/button";
import {
  applyChoices,
  type ControlField,
  describeRequested,
  errorsByField,
  type FieldChoices,
} from "@/lib/controls";
import { useCommand } from "@/lib/useCommand";
import { useControlState, useLatestCommand } from "@/lib/useControl";

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive sm:text-sm";

function Field({
  field,
  value,
  error,
  disabled,
  onChange,
}: {
  field: ControlField;
  value: string | boolean | undefined;
  error: string | undefined;
  disabled: boolean;
  onChange: (value: string | boolean) => void;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const invalid = error !== undefined;
  const described = invalid ? { "aria-invalid": true, "aria-describedby": errorId } : {};
  const hint = field.optional ? " (optional)" : "";

  if (field.kind === "boolean") {
    return (
      <div className="flex min-h-11 items-center gap-3">
        <input
          id={id}
          type="checkbox"
          className="size-5 accent-primary"
          checked={value === true}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          {...described}
        />
        <label htmlFor={id} className="text-sm">
          {field.label}
          {hint}
        </label>
        {invalid && (
          <p id={errorId} className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {field.label}
        {field.kind === "integer" && !field.names ? ` (${field.min}–${field.max})` : ""}
        {hint}
      </label>
      {field.kind === "integer" && field.names ? (
        <select
          id={id}
          className={FIELD_CLASS}
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          {...described}
        >
          <option value="">{field.optional ? "Library default" : "Choose…"}</option>
          {field.names.map((name, index) => (
            <option key={name} value={String(field.min + index)}>
              {name}
            </option>
          ))}
        </select>
      ) : field.kind === "enum" ? (
        <select
          id={id}
          className={FIELD_CLASS}
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          {...described}
        >
          {/* No value is chosen for the person: an untouched required field is an error, not a default. */}
          <option value="">{field.optional ? "Library default" : "Choose…"}</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type="number"
          inputMode="numeric"
          step={1}
          min={field.min}
          max={field.max}
          className={FIELD_CLASS}
          value={typeof value === "string" ? value : ""}
          placeholder={field.optional ? "Library default" : ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          {...described}
        />
      )}
      {invalid && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * A control generated from a capability's inventory entry (M3 step 3.1): one field per value in
 * its `params` schema, a send button, and the newest command's requested values and outcome.
 *
 * - Enabled only when the service would accept the command (`controlState`), and locked while
 *   this page's command is under way, so one press is one physical action.
 * - What the person entered is checked with the service's own validation before it is sent; the
 *   service checks again, and its field errors are shown the same way.
 * - Nothing is sent again by itself.
 * - With `confirm`, a valid command is not sent until the person confirms it here, for a command
 *   with a physical effect they might not expect (spec §5).
 */
export function CapabilityControl({
  capabilityId,
  title,
  description,
  defaults = {},
  sendLabel = "Send",
  pendingLabel = "Sending…",
  statusName,
  choices = {},
  confirm,
  hideSequences,
}: {
  capabilityId: CommandableId;
  /** Defaults to the inventory title. */
  title?: string;
  description?: ReactNode;
  /** Values the form starts with, by field key. */
  defaults?: ParamValues;
  sendLabel?: string;
  pendingLabel?: string;
  /** Names the lifecycle list; defaults to the title. */
  statusName?: string;
  /** Names for integer fields, so the person picks a name and the number is sent. */
  choices?: FieldChoices;
  /** Asked before sending, with Confirm and Cancel. */
  confirm?: ReactNode;
  /**
   * Sequence names left out of the dropdown. The service may still accept them; the timing
   * page is what sends a held one.
   */
  hideSequences?: readonly string[];
}) {
  const headingId = useId();
  const capability = findCapability(capabilityId);
  const form = capability ? describeParams(capability.params) : undefined;
  const [values, setValues] = useState<ParamValues>(defaults);
  const [localIssues, setLocalIssues] = useState<CommandIssue[]>([]);
  // The service's field errors are about the values sent; once the person edits, they are stale.
  const [editedSinceSend, setEditedSinceSend] = useState(false);
  // The validated params waiting for the person to confirm them.
  const [confirming, setConfirming] = useState<{ params: unknown }>();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);
  const command = useCommand(capabilityId);

  const state = useControlState(capabilityId);
  const latest = useLatestCommand(capabilityId, command.commandId);

  // Cancel, not Confirm, takes the focus: Enter or a stray tap should not start the action. When
  // the dialog closes, focus goes back to the send button, so the person keeps their place.
  const wasConfirming = useRef(false);
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (wasConfirming.current) sendRef.current?.focus();
    wasConfirming.current = confirming !== undefined;
  }, [confirming]);

  // A confirmation is for the tower as it was when it was asked. Once the control cannot be used
  // (the tower dropped, calibration was lost, the service went away) it is withdrawn, so it cannot
  // be confirmed later in a session the person did not choose to act in.
  useEffect(() => {
    if (!state.enabled) setConfirming(undefined);
  }, [state.enabled]);

  const name = title ?? capability?.title ?? capabilityId;
  if (!capability || !form?.ok) {
    // A schema the form cannot hold needs its own component; this is a programming error.
    throw new Error(
      `${capabilityId} needs its own control: ${form?.ok === false ? form.reason : "unknown capability"}`,
    );
  }
  const fields = applyChoices(form.fields, choices).map((field) =>
    field.kind === "enum" && field.key === "sequence" && hideSequences
      ? {
          ...field,
          options: field.options.filter((option) => !hideSequences.includes(option)),
        }
      : field,
  );

  const disabled = !state.enabled || command.pending;

  const serviceIssues = latest.own && !editedSinceSend ? (latest.stages?.at(-1)?.issues ?? []) : [];
  const errors = errorsByField(fields, localIssues.length > 0 ? localIssues : serviceIssues);

  const submit = () => {
    if (disabled) return;
    const params = buildParams(fields, values);
    const validation = validateCommand(capabilityId, params);
    if (!validation.ok) {
      setLocalIssues(
        validation.issues.length > 0 ? validation.issues : [{ path: [], message: "Not accepted." }],
      );
      return;
    }
    setLocalIssues([]);
    if (confirm) {
      setConfirming({ params: validation.command.params });
      return;
    }
    setEditedSinceSend(false);
    command.send(validation.command.params);
  };

  const confirmSend = () => {
    if (disabled || !confirming) return;
    setConfirming(undefined);
    setEditedSinceSend(false);
    command.send(confirming.params);
  };

  return (
    <section aria-labelledby={headingId} className="rounded-lg border p-4 sm:p-6">
      <h2 id={headingId} className="text-sm font-medium">
        {name}
      </h2>
      {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
      <form
        // The schema is the check, so its message is the one shown, not the browser's own.
        noValidate
        className="mt-4 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {fields.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => (
              <Field
                key={field.key}
                field={field}
                value={values[field.key]}
                error={errors[field.key]}
                disabled={disabled || confirming !== undefined}
                onChange={(value) => {
                  setValues((current) => ({ ...current, [field.key]: value }));
                  setLocalIssues([]);
                  setEditedSinceSend(true);
                }}
              />
            ))}
          </div>
        )}
        {errors[""] && (
          <p role="alert" className="text-sm text-destructive">
            {errors[""]}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            ref={sendRef}
            type="submit"
            className="h-11 px-4"
            disabled={disabled || confirming !== undefined}
          >
            {command.pending ? pendingLabel : sendLabel}
          </Button>
          {!state.enabled && <p className="text-sm text-muted-foreground">{state.reason}</p>}
        </div>
      </form>
      {confirming && (
        <div
          role="alertdialog"
          aria-label={`Confirm: ${name}`}
          aria-describedby={`${headingId}-confirm`}
          className="mt-4 flex flex-col gap-3 rounded-lg border border-amber-500/60 bg-amber-500/10 p-4"
          onKeyDown={(event) => {
            if (event.key === "Escape") setConfirming(undefined);
          }}
        >
          <div id={`${headingId}-confirm`} className="text-sm">
            {confirm}
            <p className="mt-1 text-muted-foreground">
              {describeRequested(fields, confirming.params) || "No values"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" className="h-11 px-4" disabled={disabled} onClick={confirmSend}>
              Confirm
            </Button>
            <Button
              ref={cancelRef}
              type="button"
              variant="outline"
              className="h-11 px-4"
              onClick={() => setConfirming(undefined)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {command.unsent && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Not sent: the service is not reachable.
        </p>
      )}
      {latest.stages?.[0] && (
        <div className="mt-4">
          <CommandStatus
            name={statusName ?? name}
            stages={latest.stages}
            interrupted={latest.interrupted}
            sender={latest.sender}
            requested={latest.own ? describeRequested(fields, command.requested) : undefined}
          />
        </div>
      )}
    </section>
  );
}
