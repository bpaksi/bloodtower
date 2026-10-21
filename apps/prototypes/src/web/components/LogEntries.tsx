import type { LogEntry } from "../lib/logger.ts";

export function LogEntries({
  entries,
  dropped = 0,
}: {
  entries: readonly LogEntry[];
  dropped?: number;
}) {
  if (entries.length === 0 && dropped === 0) return <p>No log entries.</p>;
  return (
    <>
      {dropped > 0 ? <p data-testid="log-dropped">{dropped} older entries dropped</p> : null}
      <LogList entries={entries} />
    </>
  );
}

function LogList({ entries }: { entries: readonly LogEntry[] }) {
  return (
    <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {entries.map((e) => (
        <li
          key={e.id}
          data-level={e.level}
          style={{ color: e.level === "error" ? "#ff8a80" : undefined }}
        >
          {e.time} {e.level.toUpperCase()} [{e.code}] {e.message}
          {e.detail ? (
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", opacity: 0.7 }}>{e.detail}</pre>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
