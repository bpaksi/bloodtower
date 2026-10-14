"use client";

import { useEffect, useId, useState } from "react";
import {
  effectiveVerification,
  type InventoryEntry,
  type UiLocation,
  VERIFICATION_NOTES_MAX,
  type VerificationRecord,
  type VerificationResult,
} from "tower-poc-protocols";
import { Button } from "@/components/ui/button";
import { timeLabel } from "@/lib/labels";
import { sendToService, useService } from "@/lib/store";
import { RESULT_LABELS, VERIFICATION_LABELS, verifyChunks } from "@/lib/verify";
import { loadVerifyMode, useVerifyMode } from "@/lib/verifyMode";

const RESULTS: VerificationResult[] = ["pass", "partial", "fail"];

/** Sends one `verify.record` and follows it until the service saves or refuses it. */
const useRecord = () => {
  const [sent, setSent] = useState<{ id?: string }>();
  const online = useService((view) => view.socket === "online");
  const saved = useService((view) =>
    sent?.id ? view.savedVerifications.includes(sent.id) : false,
  );
  const refusal = useService((view) =>
    sent?.id && view.lastError?.correlationId === sent.id ? view.lastError.message : undefined,
  );
  const answered = saved || refusal !== undefined;
  return {
    send: (payload: { capabilityId: string; result: VerificationResult; notes: string }) =>
      setSent({ id: sendToService("verify.record", payload) }),
    pending: sent?.id !== undefined && !answered && online,
    saved,
    refusal,
    unsent: sent !== undefined && sent.id === undefined,
    // Sent, then the link dropped with no answer: the result shown is what the service has.
    lost: sent?.id !== undefined && !answered && !online,
  };
};

function Latest({ record }: { record: VerificationRecord | undefined }) {
  if (!record) return <p className="text-xs text-muted-foreground">No result recorded.</p>;
  return (
    <div className="text-xs text-muted-foreground">
      <p>
        Last recorded:{" "}
        <span className="font-medium text-foreground">{RESULT_LABELS[record.result]}</span>
        {" · "}
        <time dateTime={new Date(record.testedAt).toISOString()}>{timeLabel(record.testedAt)}</time>
        {" · "}
        {record.environment.client}
        {" · "}
        library {record.libraryVersion}
      </p>
      {record.notes && <p className="mt-1 whitespace-pre-wrap">{record.notes}</p>}
    </div>
  );
}

function VerifyRow({
  entry,
  record,
  mock,
}: {
  entry: InventoryEntry;
  record: VerificationRecord | undefined;
  mock: boolean;
}) {
  const id = useId();
  const [result, setResult] = useState<VerificationResult>();
  const [notes, setNotes] = useState("");
  const [problem, setProblem] = useState<string>();
  const recording = useRecord();
  const status = effectiveVerification(entry.verification, record);

  // Once saved, the form is cleared for the next result; the one saved shows as the latest.
  useEffect(() => {
    if (recording.saved) {
      setResult(undefined);
      setNotes("");
    }
  }, [recording.saved]);

  const submit = () => {
    if (recording.pending) return;
    if (!result) return setProblem("Choose pass, partial or fail.");
    if (result !== "pass" && notes.trim() === "") {
      return setProblem("Say what happened: a partial or a fail needs notes.");
    }
    setProblem(undefined);
    recording.send({ capabilityId: entry.id, result, notes });
  };

  return (
    <li
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-3 border-t py-4 first:border-t-0"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p id={`${id}-title`} className="text-sm font-medium">
          {entry.title} <span className="font-mono text-xs text-muted-foreground">{entry.id}</span>
        </p>
        <p className="text-xs">{VERIFICATION_LABELS[status]}</p>
      </div>
      <Latest record={record} />
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Result for {entry.title}</legend>
          {RESULTS.map((option) => (
            <label
              key={option}
              className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm has-checked:border-primary has-checked:bg-primary/10"
            >
              <input
                type="radio"
                name={`${id}-result`}
                value={option}
                className="size-4 accent-primary"
                checked={result === option}
                disabled={recording.pending}
                onChange={() => {
                  setResult(option);
                  setProblem(undefined);
                }}
              />
              {RESULT_LABELS[option]}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-notes`} className="text-sm">
            Notes{result === "pass" || result === undefined ? " (optional for a pass)" : ""}
          </label>
          <textarea
            id={`${id}-notes`}
            rows={2}
            maxLength={VERIFICATION_NOTES_MAX}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm"
            value={notes}
            disabled={recording.pending}
            onChange={(event) => {
              setNotes(event.target.value);
              setProblem(undefined);
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" className="h-11 px-4" disabled={recording.pending}>
            {recording.pending ? "Recording…" : "Record result"}
          </Button>
          {recording.saved && (
            <p role="status" className="text-sm text-muted-foreground">
              Saved{mock ? " (mock tower)" : ""}.
            </p>
          )}
        </div>
        {(problem ?? recording.refusal) && (
          <p role="alert" className="text-sm text-destructive">
            {problem ?? recording.refusal}
          </p>
        )}
        {recording.unsent && (
          <p role="alert" className="text-sm text-destructive">
            Not recorded: the service is not reachable.
          </p>
        )}
        {recording.lost && (
          <p role="alert" className="text-sm text-destructive">
            The link to the service dropped before it answered. The last recorded result above is
            what the service has.
          </p>
        )}
      </form>
    </li>
  );
}

/**
 * A page's Verify checklist (M3 step 3.6), shown while Verify mode is on: every capability the
 * page shows, in short chunks by category, each with its newest result and a form to record one.
 * A result is saved the moment it is recorded, so the pass can stop after any chunk.
 */
export function VerifyPanel({ location }: { location: UiLocation }) {
  const on = useVerifyMode((mode) => mode.on);
  const headingId = useId();
  const welcome = useService((view) => view.welcome);
  useEffect(loadVerifyMode, []);
  if (!on) return null;

  const mock = welcome?.tower === "mock";
  const chunks = welcome
    ? verifyChunks(welcome.inventory, welcome.verificationOverlay, location)
    : [];

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-primary/40 bg-primary/5 p-4 sm:p-6"
    >
      <h2 id={headingId} className="text-sm font-medium">
        Verify on the tower
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Use the controls on this page, watch the tower, then record what it did. Each result is
        saved when you record it, so you can stop after any group and pick up later. Open one group
        at a time.
      </p>
      {mock && (
        <p className="mt-2 rounded-md bg-amber-100 p-2 text-sm text-amber-950 dark:bg-amber-900 dark:text-amber-50">
          The service drives the mock tower. Results recorded now are kept apart and never count as
          hardware-verified.
        </p>
      )}
      {!welcome ? (
        <p className="mt-3 text-sm text-muted-foreground">Unavailable until the service answers.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {chunks.map((chunk) => (
            <details key={chunk.category} className="rounded-lg border bg-background">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 text-sm font-medium">
                <span>{chunk.title}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {chunk.recorded} of {chunk.entries.length} recorded
                </span>
              </summary>
              <ul className="px-4" aria-label={`${chunk.title} to verify`}>
                {chunk.entries.map((entry) => (
                  <VerifyRow
                    key={entry.id}
                    entry={entry}
                    record={welcome.verificationOverlay[entry.id]}
                    mock={mock}
                  />
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
