"use client";
import { useState } from "react";
import { logger } from "../lib/logger.ts";
import { useLogState } from "../lib/useLogState.ts";
import { LogEntries } from "./LogEntries.tsx";

/** In-page log panel, fixed at the bottom-left. Export downloads the log as JSON. */
export function LogPanel() {
  const { entries } = useLogState();
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const exportLog = () => {
    try {
      const url = URL.createObjectURL(
        new Blob([logger.exportText()], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `prototype-log-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setProblem(null);
    } catch (cause) {
      const entry = logger.error("Could not export the log.", cause, "LOG_EXPORT_FAILED");
      setProblem(`${entry.code}: ${entry.message}`);
    }
  };

  return (
    <div style={{ position: "fixed", left: 12, bottom: 12, zIndex: 1000, fontSize: 12 }}>
      <button type="button" onClick={() => setOpen(!open)}>
        Log ({entries.length})
      </button>
      {open ? (
        <div
          style={{
            background: "#111",
            color: "#ddd",
            padding: 8,
            width: 520,
            maxHeight: 280,
            overflow: "auto",
          }}
        >
          <button type="button" onClick={exportLog}>
            Export
          </button>{" "}
          <button type="button" onClick={() => logger.clear()}>
            Clear
          </button>
          {problem ? (
            <p role="alert" style={{ color: "#ff8a80" }}>
              {problem}
            </p>
          ) : null}
          <LogEntries entries={entries} />
        </div>
      ) : null}
    </div>
  );
}
