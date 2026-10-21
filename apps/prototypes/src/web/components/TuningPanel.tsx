"use client";
import { useState } from "react";
import { logger } from "../lib/logger.ts";
import {
  commitNumber,
  fromJson,
  setValue,
  type TuningField,
  type TuningValues,
  toJson,
} from "../lib/tuning.ts";

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
          ) : f.type === "number" ? (
            <NumberInput
              field={f}
              value={Number(values[f.key] ?? f.default)}
              onCommit={(v) =>
                attempt("TUNING_EDIT_FAILED", () => onChange(setValue(fields, values, f.key, v)))
              }
            />
          ) : (
            <input
              id={`tuning-${f.key}`}
              type="text"
              value={String(values[f.key] ?? f.default)}
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

/**
 * Keeps the typed text locally. Nothing is checked while typing (a cleared field or a lone "-" is
 * normal mid-edit); the value is validated and clamped on blur or Enter. A value that is still
 * invalid then is shown next to the field and logged as a warning, and the old value stays.
 */
function NumberInput({
  field,
  value,
  onCommit,
}: {
  field: Extract<TuningField, { type: "number" }>;
  value: number;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);

  const commit = () => {
    if (text === null) return;
    const result = commitNumber(field, text);
    if (result.ok) {
      onCommit(result.value);
      setText(null);
      setInvalid(null);
    } else {
      logger.warn(result.reason, "TUNING_INVALID_NUMBER");
      setInvalid(`TUNING_INVALID_NUMBER: ${result.reason}`);
    }
  };

  return (
    <>
      <input
        id={`tuning-${field.key}`}
        type="text"
        inputMode="decimal"
        value={text ?? String(value)}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        style={{ width: "100%" }}
      />
      {invalid ? (
        <small role="alert" style={{ display: "block", color: "#c0392b" }}>
          {invalid}
        </small>
      ) : null}
    </>
  );
}
