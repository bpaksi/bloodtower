"use client";

import { useState } from "react";
import type { ChapterBeat } from "./ChapterCard";

type Table = NonNullable<ChapterBeat["table"]>;

/**
 * Set the table on the Story board (C3/15, PT-21, DEC-929): the rows under the next chapter's
 * card, so every line the iPad shows is on the board too (SCR-014). Display only: no ticks, no
 * button.
 */
export function SetTheTableBoard({ table }: { table: Table }) {
  return (
    <section
      data-set-table=""
      aria-label={table.title}
      style={{
        position: "fixed",
        left: "50%",
        bottom: "6%",
        transform: "translateX(-50%)",
        textAlign: "center",
        textShadow: "0 1px 4px #000",
        maxWidth: "70%",
      }}
    >
      <p className="bt-label" data-table-title="">
        {table.title}
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {table.rows.map((row) => (
          <li key={row.id} data-table-row={row.id}>
            {row.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Set the table on the iPad (PT-21, DEC-929): one check per chore and one Done. A tick is an aid
 * kept on this iPad only; Done is enabled from the start and never gated on ticks (EV-24).
 */
export function SetTheTableDevice({
  table,
  live,
  offered,
  onAct,
}: {
  table: Table;
  live: boolean;
  /** Done is open in the host's offers. */
  offered: boolean;
  onAct: (promptId: string, actionId: string) => void;
}) {
  const [ticked, setTicked] = useState<string[]>([]);
  return (
    <section className="mt-4" data-set-table="" aria-label={table.title}>
      <h2 className="text-xl font-semibold" data-table-title="">
        {table.title}
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {table.rows.map((row) => {
          const on = ticked.includes(row.id);
          return (
            <li key={row.id} data-table-row={row.id}>
              <button
                type="button"
                className="bt-secondary"
                data-table-tick={row.id}
                aria-pressed={on}
                style={{ width: "100%", textAlign: "left", display: "flex", gap: "0.6em" }}
                onClick={() =>
                  setTicked((rows) =>
                    rows.includes(row.id) ? rows.filter((id) => id !== row.id) : [...rows, row.id],
                  )
                }
              >
                <span
                  aria-hidden="true"
                  style={{
                    flex: "0 0 22px",
                    width: 22,
                    height: 22,
                    border: "2px solid #c9a85a",
                    borderRadius: "50%",
                    background: on ? "#c9a85a" : "transparent",
                    boxSizing: "border-box",
                    display: "inline-block",
                  }}
                />
                <span data-table-label="">{row.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          className="bt-primary"
          data-prompt-id={table.promptId}
          data-action-id="done"
          data-action="done"
          data-table-done=""
          disabled={!live || !offered}
          onClick={() => onAct(table.promptId, "done")}
        >
          {table.done}
        </button>
      </div>
    </section>
  );
}
