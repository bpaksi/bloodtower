"use client";

import {
  SOUND_MOODS,
  SOUND_NOTE_MAX,
  SOUND_READS_AS,
  SOUND_STRENGTHS,
  type SoundFeelRecordPayload,
  type SoundFeelRow,
} from "@dark-tower/tower";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { lengthLabel, measure, type PlayTiming } from "@/lib/soundReview";
import { sendToService, useService } from "@/lib/store";

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm";

/** Sends one sound's `soundFeel.record`s and follows the newest until the service saves or refuses it. */
const useFeelSave = () => {
  // `link` is how many sockets this page had opened when it sent: the service does not replay
  // answers, so one sent on an earlier socket will never be answered.
  const [sent, setSent] = useState<{ id?: string; link: number }>();
  const online = useService((view) => view.socket === "online");
  const link = useService((view) => view.ownClientIds.length);
  const saved = useService((view) => (sent?.id ? view.savedSoundFeel.includes(sent.id) : false));
  const refusal = useService((view) => (sent?.id ? view.refusals[sent.id] : undefined));
  const linkHeld = online && sent?.link === link;
  let status: string | undefined;
  if (sent && sent.id === undefined) status = "Not sent: the service is not reachable.";
  else if (refusal !== undefined) status = `Not saved: ${refusal}`;
  else if (saved) status = "Saved";
  else if (sent?.id && !linkHeld) {
    status = "Not confirmed: the link to the service dropped. Shown is what the service has.";
  } else if (sent?.id) status = "Saving…";
  return {
    save: (payload: Omit<SoundFeelRecordPayload, "index"> & { index: number }) =>
      setSent({ id: sendToService("soundFeel.record", payload), link }),
    status,
    failed: (sent !== undefined && sent.id === undefined) || refusal !== undefined,
  };
};

const Unavailable = () => <span className="text-muted-foreground">unavailable</span>;

function Choice<T extends string>({
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T | null | undefined;
  disabled: boolean;
  onChange: (value: T | null) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      <select
        id={id}
        className={FIELD_CLASS}
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) =>
          onChange(options.find((option) => option === event.target.value) ?? null)
        }
      >
        <option value="">Not set</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * One sound's review (M6 step 6.2, spec D25): Stopped, then mood, reads as, strength and a note.
 * Each pick is saved the moment it is made; the note when the field is left. Nothing here reaches
 * the tower: Stopped only measures time on this page.
 */
export function SoundReviewRow({
  index,
  name,
  row,
  known,
  timing,
  onStopped,
}: {
  index: number;
  name: string;
  /** The saved feel; undefined when none is saved. */
  row: SoundFeelRow | undefined;
  /** False while the service is out of reach: what it has saved is not known here then. */
  known: boolean;
  /** The play being timed, when it is this sound's. */
  timing: PlayTiming | undefined;
  onStopped: () => void;
}) {
  const noteId = useId();
  const { save, status, failed } = useFeelSave();
  const [measureProblem, setMeasureProblem] = useState<string>();
  const [note, setNote] = useState(row?.note ?? "");
  const [editingNote, setEditingNote] = useState(false);
  const savedNote = row?.note ?? "";
  // A note saved here or on another device shows once this field is not being edited.
  useEffect(() => {
    if (!editingNote) setNote(savedNote);
  }, [savedNote, editingNote]);

  const stopped = () => {
    if (!timing) return;
    const measured = measure(timing, Date.now());
    onStopped();
    if (!measured.ok) {
      setMeasureProblem(measured.reason);
      return;
    }
    setMeasureProblem(undefined);
    save({ index, lengthMs: measured.lengthMs, answerLengthMs: measured.answerLengthMs });
  };

  const length = lengthLabel(row?.lengthMs);
  const fromAnswer = lengthLabel(row?.answerLengthMs);

  return (
    <fieldset className="mt-3 border-t pt-3" aria-label={`Feel of ${index} ${name}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={timing ? "default" : "outline"}
          className="h-11 px-4"
          aria-label={`Stopped ${index} ${name}`}
          disabled={!timing}
          onClick={stopped}
        >
          Stopped
        </Button>
        <dl className="grid grid-cols-[auto_auto] gap-x-2 text-sm">
          <dt className="text-muted-foreground">Length</dt>
          <dd>{known && length ? length : <Unavailable />}</dd>
          <dt className="text-muted-foreground">From answer</dt>
          <dd>{known && fromAnswer ? fromAnswer : <Unavailable />}</dd>
        </dl>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Choice
          label="Mood"
          options={SOUND_MOODS}
          value={row?.mood}
          disabled={!known}
          onChange={(mood) => save({ index, mood })}
        />
        <Choice
          label="Reads as"
          options={SOUND_READS_AS}
          value={row?.readsAs}
          disabled={!known}
          onChange={(readsAs) => save({ index, readsAs })}
        />
        <Choice
          label="Strength"
          options={SOUND_STRENGTHS}
          value={row?.strength}
          disabled={!known}
          onChange={(strength) => save({ index, strength })}
        />
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <label htmlFor={noteId} className="text-xs font-medium">
          Note
        </label>
        <input
          id={noteId}
          type="text"
          className={FIELD_CLASS}
          value={note}
          maxLength={SOUND_NOTE_MAX}
          disabled={!known}
          placeholder="A few words of your own"
          onFocus={() => setEditingNote(true)}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => {
            setEditingNote(false);
            const next = note.trim();
            if (next !== savedNote) save({ index, note: next === "" ? null : next });
          }}
        />
      </div>
      {(measureProblem || status) && (
        <p
          role={failed || measureProblem ? "alert" : "status"}
          className={`mt-2 text-sm ${failed || measureProblem ? "text-destructive" : "text-muted-foreground"}`}
        >
          {measureProblem ?? status}
        </p>
      )}
    </fieldset>
  );
}
