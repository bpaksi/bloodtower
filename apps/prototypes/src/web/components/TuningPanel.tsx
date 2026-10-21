"use client";
import { useState } from "react";
import { logger } from "../lib/logger.ts";
import { fromJson, setValue, type TuningField, type TuningValues, toJson } from "../lib/tuning.ts";

/**
 * Edits a prototype's invented numbers and copies them out as JSON. The page owns the values
 * (`useState(defaultValues(fields))`) so the simulation and the play-through read the same ones.
 */
export function TuningPanel({
  title = "Tuning",
  fields,
  values,
  onChange,
}: {
  title?: string;
  fields: readonly TuningField[];
  values: TuningValues;
  onChange: (values: TuningValues) => void;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const attempt = (code: string, action: () => void) => {
    try {
      action();
      setProblem(null);
    } catch (cause) {
      const entry = logger.error(undefined, cause, code);
      setProblem(`${entry.code}: ${entry.message}`);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toJson(fields, values));
      setCopied(true);
      setProblem(null);
    } catch (cause) {
      setCopied(false);
      const entry = logger.error("Could not copy the tuning JSON.", cause, "TUNING_COPY_FAILED");
      setProblem(`${entry.code}: ${entry.message}`);
    }
  };

  const paste = () =>
    attempt("TUNING_PASTE_FAILED", () => {
      const text = window.prompt("Paste tuning JSON");
      if (text) onChange(fromJson(fields, text));
    });

  return (
    <section
      aria-label={title}
      style={{ border: "1px solid #666", padding: 12, maxWidth: 360, fontSize: 14 }}
    >
      <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>{title}</h2>
      {fields.map((f) => (
        <label
          key={f.key}
          htmlFor={`tuning-${f.key}`}
          style={{ display: "block", marginBottom: 8 }}
        >
          <span style={{ display: "block" }}>{f.label}</span>
          {f.type === "boolean" ? (
            <input
              id={`tuning-${f.key}`}
              type="checkbox"
              checked={Boolean(values[f.key])}
              onChange={(e) =>
                attempt("TUNING_EDIT_FAILED", () =>
                  onChange(setValue(fields, values, f.key, e.target.checked)),
                )
              }
            />
          ) : (
            <input
              id={`tuning-${f.key}`}
              type={f.type === "number" ? "number" : "text"}
              value={String(values[f.key] ?? f.default)}
              {...(f.type === "number" ? { min: f.min, max: f.max, step: f.step ?? 1 } : {})}
              onChange={(e) =>
                attempt("TUNING_EDIT_FAILED", () =>
                  onChange(setValue(fields, values, f.key, e.target.value)),
                )
              }
              style={{ width: "100%" }}
            />
          )}
          {f.note ? <small style={{ display: "block", opacity: 0.7 }}>{f.note}</small> : null}
        </label>
      ))}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={copy}>
          Copy as JSON
        </button>
        <button type="button" onClick={paste}>
          Paste JSON
        </button>
      </div>
      {copied ? <p role="status">Copied.</p> : null}
      {problem ? (
        <p role="alert" style={{ color: "#c0392b" }}>
          {problem}
        </p>
      ) : null}
    </section>
  );
}
