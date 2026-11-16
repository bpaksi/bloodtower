"use client";

import type { BoardView } from "bloodtower-protocols";
import { useEffect, useState } from "react";
import { DialogFrame } from "./DialogFrame";

type Table = NonNullable<BoardView["table"]>;
type Virtue = NonNullable<Table["virtue"]>;

/** How long the panel holds once nothing is left to ask. Display only: no press moves it on (DEC-479). */
export const VIRTUE_HOLD_MS = 8000;

/**
 * The panel hides itself after the hold, keyed on the day, the acting group and whether a choice is
 * still open: a choice keeps the panel up until it is answered, then the hold starts.
 */
function useVirtueHold(key: string, asking: boolean): boolean {
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const holdKey = `${key}|${asking ? "asking" : "shown"}`;
  useEffect(() => {
    if (asking) return;
    const timer = setTimeout(() => setDoneKey(holdKey), VIRTUE_HOLD_MS);
    return () => clearTimeout(timer);
  }, [asking, holdKey]);
  return asking || doneKey !== holdKey;
}

/**
 * UI-037: the turn-start virtue panel. One line per virtue that applies now, `{virtue}: {effect}`
 * (copy `virtue.line`); a virtue that asks a choice is named under the lines (copy
 * `virtue.choice.prompt`) and mirrors the answer. The choices are on the iPad, never here.
 */
export function VirtuePanel({ table }: { table: Table }) {
  const virtue: Virtue | null | undefined = table.virtue;
  const key = `${table.day}|${table.actingHeroId ?? ""}`;
  const visible = useVirtueHold(key, virtue?.choice != null);
  if (!virtue || !visible) return null;
  return (
    <DialogFrame
      size="compact"
      className="bt-ink-in"
      id="virtue"
      data-panel="virtue"
      data-virtue-choice={virtue.choice ? "asking" : "none"}
      role="status"
    >
      <h2 data-virtue-title="" style={{ marginTop: 0 }}>
        {virtue.title}
      </h2>
      <ul data-virtue-lines="">
        {virtue.lines.map((line) => (
          <li key={line.id} data-virtue={line.id}>
            {line.text}
          </li>
        ))}
      </ul>
      {virtue.choice ? (
        <p data-virtue-asks={virtue.choice.virtueId}>{virtue.choice.prompt}</p>
      ) : null}
      {virtue.picked.map((pick) => (
        <p key={pick.virtueId} data-virtue-picked={pick.virtueId}>
          {pick.name}: {pick.label}
        </p>
      ))}
    </DialogFrame>
  );
}
