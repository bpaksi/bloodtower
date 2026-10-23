"use client";

import { type CommandIssue, validateCommand } from "@dark-tower/tower";
import { useId, useState } from "react";
import { CommandStatus } from "@/components/controls/CommandStatus";
import { Button } from "@/components/ui/button";
import {
  buildLightsParams,
  describeLights,
  GROUPS,
  LIGHT_EFFECTS,
  LIGHT_SLOTS,
  type LightChoices,
  type LightEffect,
} from "@/lib/lightsForm";
import { useCommand } from "@/lib/useCommand";
import { useControlState, useLatestCommand } from "@/lib/useControl";

const CAPABILITY_ID = "lighting.set";

const SELECT_CLASS =
  "h-11 w-full rounded-lg border border-input bg-background px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 sm:text-sm";

/**
 * The control for `lighting.set` (M3 step 3.2). Its params are lists of lights, which the
 * generated form cannot hold, so every light is one choice here, grouped as on the tower. A light
 * left at "Leave as is" is not sent. Otherwise it behaves as `CapabilityControl`: enabled only
 * when the service would accept the command, locked while its command is under way, checked with
 * the service's own validation before it is sent, and never sent again by itself.
 */
export function LightsControl() {
  const headingId = useId();
  const [choices, setChoices] = useState<LightChoices>({});
  const [issues, setIssues] = useState<CommandIssue[]>([]);
  const [editedSinceSend, setEditedSinceSend] = useState(false);
  const command = useCommand(CAPABILITY_ID);
  const state = useControlState(CAPABILITY_ID);
  const latest = useLatestCommand(CAPABILITY_ID, command.commandId);

  const disabled = !state.enabled || command.pending;
  const chosen = LIGHT_SLOTS.filter((slot) => choices[slot.key] !== undefined).length;
  const serviceIssues = latest.own && !editedSinceSend ? (latest.stages?.at(-1)?.issues ?? []) : [];
  // The selects offer only what the schema allows, so an issue is about the command as a whole.
  const messages = [
    ...new Set((issues.length > 0 ? issues : serviceIssues).map((issue) => issue.message)),
  ];

  const choose = (key: string, effect: LightEffect | undefined) => {
    setChoices((current) => ({ ...current, [key]: effect }));
    setIssues([]);
    setEditedSinceSend(true);
  };

  const submit = () => {
    if (disabled) return;
    const validation = validateCommand(CAPABILITY_ID, buildLightsParams(choices));
    if (!validation.ok) {
      setIssues(
        validation.issues.length > 0 ? validation.issues : [{ path: [], message: "Not accepted." }],
      );
      return;
    }
    setIssues([]);
    setEditedSinceSend(false);
    command.send(validation.command.params);
  };

  return (
    <section aria-labelledby={headingId} className="rounded-lg border p-4 sm:p-6">
      <h2 id={headingId} className="text-sm font-medium">
        Set lights
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose an effect for any of the tower's 24 lights. Lights left at “Leave as is” are not
        sent.
      </p>
      <form
        noValidate
        className="mt-4 flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {GROUPS.map(({ group, title }) => (
          <fieldset key={group} className="flex flex-col gap-3">
            <legend className="mb-3 text-sm font-medium">{title}</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {LIGHT_SLOTS.filter((slot) => slot.group === group).map((slot) => (
                <LightSelect
                  key={slot.key}
                  label={slot.label}
                  name={`${title} ${slot.label.toLowerCase()}`}
                  value={choices[slot.key]}
                  disabled={disabled}
                  onChange={(effect) => choose(slot.key, effect)}
                />
              ))}
            </div>
          </fieldset>
        ))}
        {messages.length > 0 && (
          <ul role="alert" className="text-sm text-destructive">
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" className="h-11 px-4" disabled={disabled}>
            {command.pending ? "Setting…" : "Set lights"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 px-4"
            disabled={chosen === 0}
            onClick={() => {
              setChoices({});
              setIssues([]);
              setEditedSinceSend(true);
            }}
          >
            Leave all as is
          </Button>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {chosen === 1 ? "1 light chosen" : `${chosen} lights chosen`}
          </p>
          {!state.enabled && <p className="text-sm text-muted-foreground">{state.reason}</p>}
        </div>
      </form>
      {command.unsent && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Not sent: the service is not reachable.
        </p>
      )}
      {latest.stages?.[0] && (
        <div className="mt-4">
          <CommandStatus
            name="Set lights"
            stages={latest.stages}
            interrupted={latest.interrupted}
            sender={latest.sender}
            requested={latest.own ? describeLights(command.requested) : undefined}
          />
        </div>
      )}
    </section>
  );
}

function LightSelect({
  label,
  name,
  value,
  disabled,
  onChange,
}: {
  label: string;
  /** The accessible name, with the group: "Doorway top north". */
  name: string;
  value: LightEffect | undefined;
  disabled: boolean;
  onChange: (effect: LightEffect | undefined) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
      <select
        id={id}
        aria-label={name}
        className={SELECT_CLASS}
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => {
          const effect = LIGHT_EFFECTS.find((candidate) => candidate === event.target.value);
          onChange(effect);
        }}
      >
        <option value="">Leave as is</option>
        {LIGHT_EFFECTS.map((effect) => (
          <option key={effect} value={effect}>
            {effect}
          </option>
        ))}
      </select>
    </div>
  );
}
