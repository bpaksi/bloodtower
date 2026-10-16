import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Database from "better-sqlite3";
import { activeMillis, pausedMillis } from "bloodtower-protocols";
import { desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { loadConfig } from "../config.ts";
import * as schema from "../db/schema.ts";
import { createSessionStore, type StoredRun } from "../db/store.ts";

export interface TimelineEvent {
  monoMs: number;
  wall: string;
  /** `moment start`, `cue end`, `pause start`, `press won`, … */
  what: string;
  subject: string;
  deviceId: string | null;
  cause: string | null;
  hunter: string | null;
}

/**
 * Every timing row as its start and, once closed, its end, plus every press, in monotonic order.
 * Presses carry their own monotonic and wall time in `control_presses`; PRD-41 has no press kind.
 * On a tie the stored order holds: a winning press comes before the moment it opened.
 */
export const timelineOf = (run: StoredRun): TimelineEvent[] => {
  const events: TimelineEvent[] = run.presses.map((press) => ({
    monoMs: press.atMonoMs,
    wall: press.atWall,
    what: press.winner ? "press won" : "press lost",
    subject: `${press.promptId} ${press.action}`,
    deviceId: press.deviceId,
    cause: null,
    hunter: null,
  }));
  for (const mark of run.marks) {
    const base = {
      subject: mark.subject,
      deviceId: mark.deviceId,
      cause: mark.cause,
      hunter: mark.hunter,
    };
    events.push({
      ...base,
      monoMs: mark.startMonoMs,
      wall: mark.startWall,
      what: `${mark.kind} start`,
    });
    if (mark.endMonoMs !== null && mark.endWall !== null) {
      events.push({
        ...base,
        monoMs: mark.endMonoMs,
        wall: mark.endWall,
        what: mark.result ? `${mark.kind} end ${mark.result}` : `${mark.kind} end`,
      });
    }
  }
  // Array sort is stable: on a tie the press stays before the mark it caused.
  return events.sort((a, b) => a.monoMs - b.monoMs);
};

const clockText = (ms: number) => {
  const whole = Math.round(ms);
  const minutes = Math.floor(whole / 60_000);
  const seconds = Math.floor((whole % 60_000) / 1000);
  const millis = whole % 1000;
  return `+${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
};

const millisText = (ms: number | null) => (ms === null ? "unknown" : `${Math.round(ms)} ms`);

/** The readable report: a header, one line per event, then totals. Unknown stays unknown. */
export const formatTimingReport = (run: StoredRun): string[] => {
  const events = timelineOf(run);
  const lines = [
    `Session ${run.session.id}`,
    `Pack ${run.session.packId} ${run.session.packVersion}. Started ${run.session.startedWall}. Join code ${run.session.joinCode}.`,
    `Devices ${run.devices.length === 0 ? "none" : run.devices.map((device) => `${device.deviceId} (${device.formFactor})`).join(", ")}.`,
    "",
  ];
  if (events.length === 0) lines.push("No timing rows.");
  for (const event of events) {
    const extra = [
      event.deviceId ? `device ${event.deviceId}` : null,
      event.cause ? `cause ${event.cause}` : null,
      event.hunter ? `hunter ${event.hunter}` : null,
    ].filter((part): part is string => part !== null);
    lines.push(
      [clockText(event.monoMs), event.wall, event.what.padEnd(14), event.subject, ...extra].join(
        "  ",
      ),
    );
  }
  const open = run.marks.filter((mark) => mark.endMonoMs === null);
  const last = events.reduce((max, event) => Math.max(max, event.monoMs), 0);
  const total = events.length === 0 || open.length > 0 ? null : last;
  lines.push("");
  lines.push(
    `Marks ${run.marks.length}, presses ${run.presses.length} (${run.presses.filter((press) => press.winner).length} won).`,
  );
  lines.push(
    open.length === 0
      ? "Open marks none."
      : `Open marks ${open.map((mark) => `${mark.kind} ${mark.subject}`).join(", ")}.`,
  );
  lines.push(
    `Span ${millisText(total)}. Paused ${millisText(pausedMillis(run.marks))}. Active ${millisText(total === null ? null : activeMillis(total, run.marks))}.`,
  );
  return lines;
};

export interface ReportArgs {
  sessionId?: string;
  db?: string;
}

/** `[sessionId] [--db <file>]`. Anything else is a usage error. */
export const parseReportArgs = (argv: readonly string[]): ReportArgs | null => {
  const args: ReportArgs = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--db") {
      const value = argv[index + 1];
      if (!value || args.db !== undefined) return null;
      args.db = value;
      index += 1;
      continue;
    }
    if (!arg || arg.startsWith("-") || args.sessionId !== undefined) return null;
    args.sessionId = arg;
  }
  return args;
};

/** Reads one session from a SQLite file. Opens it read-only: a wrong path is not created. */
export const readRun = (path: string, sessionId?: string): StoredRun => {
  if (!existsSync(path)) throw new Error(`No database at ${path}.`);
  const sqlite = new Database(path, { readonly: true, fileMustExist: true });
  try {
    const db = drizzle({ client: sqlite, schema });
    let id = sessionId;
    if (!id) {
      const latest = db
        .select({ id: schema.sessions.id })
        .from(schema.sessions)
        .orderBy(desc(schema.sessions.startedWall), desc(sql`rowid`))
        .limit(1)
        .get();
      if (!latest) throw new Error(`No session in ${path}.`);
      id = latest.id;
    }
    return createSessionStore(db).loadRun(id);
  } finally {
    sqlite.close();
  }
};

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(resolve(entry)).href) {
  const args = parseReportArgs(process.argv.slice(2));
  if (!args) {
    console.error("Usage: timingReport.ts [sessionId] [--db <file>]");
    process.exit(2);
  }
  const path = args.db
    ? resolve(process.cwd(), args.db)
    : join(loadConfig().dataDir, "session.sqlite");
  try {
    for (const line of formatTimingReport(readRun(path, args.sessionId))) console.log(line);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
