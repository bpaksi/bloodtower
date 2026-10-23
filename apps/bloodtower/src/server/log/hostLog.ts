import { appendFileSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";

/**
 * Decision 0003 host log. The Mac server writes JSON Lines under `<dataDir>/logs/`
 * (the app data folder, or a worktree's `.wt.json` `dataDir`). One file per UTC day.
 * Files older than 30 days are deleted when the logger is created, which the host does
 * on start.
 *
 * Pages POST `/log` when their socket is down. The socket `log` message is accepted by the
 * session host, which writes through this logger. A log viewer is not here. This module stays
 * in Bloodtower until a second app needs it.
 *
 * DIAG_LOG is a different file. Nothing in here copies sidecar traffic into this log.
 * Debug lines are stored only when `debug` is set (`BLOODTOWER_LOG_DEBUG=1` at startup).
 */

/** Files dated more than this many days before today are deleted on host start. */
export const LOG_RETENTION_DAYS = 30;

/** Page fallback. `POST` writes one line. There is no viewer on this path. */
export const LOG_INGEST_PATH = "/log";

export const LOG_DEBUG_ENV = "BLOODTOWER_LOG_DEBUG";

const INGEST_BODY_MAX = 8 * 1024;
const INGEST_MESSAGE_MAX = 500;
const MESSAGE_MAX = 8_000;
const CONTEXT_MAX = 120;
const CODE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const DAY_FILE = /^(\d{4})-(\d{2})-(\d{2})\.jsonl$/;
const FIELD_NAME = /^[A-Za-z0-9_-]{1,40}$/;
const ALLOWED_FIELDS = new Set([
  "level",
  "source",
  "device",
  "session",
  "screen",
  "code",
  "message",
]);

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogSource = "server" | "board" | "device";

export interface LogEntry {
  time: string;
  level: LogLevel;
  source: LogSource;
  device: string | null;
  session: string | null;
  screen: string | null;
  /** Short error code. The same slug can be read back from a toast later. */
  code: string;
  message: string;
}

export interface LogFields {
  source?: LogSource;
  device?: string | null;
  session?: string | null;
  screen?: string | null;
}

export interface HostLogger {
  /** `<dataDir>/logs`. */
  readonly dir: string;
  /** Fills `session` on later server lines that do not set one. */
  setSession(session: string | null): void;
  /** The session `setSession` stored. `POST /log` stamps this and ignores the body. */
  session(): string | null;
  /** Writes one line. A debug line is dropped when debug is off. */
  append(entry: Omit<LogEntry, "time">): void;
  /**
   * Called after a line is stored. A debug line that was dropped does not call it.
   * The listener sees the stored entry. A throw in a listener is reported and does not
   * stop the others.
   */
  subscribe(listener: (entry: LogEntry) => void): () => void;
  error(code: string, message: string, fields?: LogFields): void;
  warn(code: string, message: string, fields?: LogFields): void;
  info(code: string, message: string, fields?: LogFields): void;
  debug(code: string, message: string, fields?: LogFields): void;
}

export interface HostLoggerOptions {
  dataDir: string;
  debug?: boolean;
  /** When false, lines are not copied to the terminal. Defaults to true. */
  mirror?: boolean;
  now?: () => Date;
  retentionDays?: number;
}

export interface PruneResult {
  deleted: string[];
  failures: string[];
}

const isLogLevel = (value: unknown): value is LogLevel =>
  value === "debug" || value === "info" || value === "warn" || value === "error";

const isLogSource = (value: unknown): value is LogSource =>
  value === "server" || value === "board" || value === "device";

export const debugEnabledFromEnv = (env: NodeJS.ProcessEnv): boolean => env[LOG_DEBUG_ENV] === "1";

export const errorLogDir = (dataDir: string): string => join(dataDir, "logs");

/** `YYYY-MM-DD.jsonl` in UTC, so a line just after midnight starts the next file. */
export const dailyLogFileName = (time: Date): string => {
  const year = String(time.getUTCFullYear()).padStart(4, "0");
  const month = String(time.getUTCMonth() + 1).padStart(2, "0");
  const day = String(time.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}.jsonl`;
};

const dayNumber = (time: Date): number =>
  Math.floor(Date.UTC(time.getUTCFullYear(), time.getUTCMonth(), time.getUTCDate()) / 86_400_000);

/** UTC day number for a daily file name, or undefined when the name is not one. */
const logFileDayNumber = (name: string): number | undefined => {
  const match = DAY_FILE.exec(name);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = Date.UTC(year, month - 1, day);
  const check = new Date(utc);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return undefined;
  }
  return Math.floor(utc / 86_400_000);
};

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const errno = (error: unknown): string | undefined => {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  const code = error.code;
  return typeof code === "string" ? code : undefined;
};

/**
 * Deletes daily files whose date is more than `retentionDays` before `now`.
 * A file from exactly 30 days ago stays. Any other name stays, so a DIAG_LOG
 * dropped in this folder is not removed and is not treated as an error line.
 */
export const pruneErrorLogs = (
  dir: string,
  now: Date,
  retentionDays = LOG_RETENTION_DAYS,
): PruneResult => {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch (error) {
    if (errno(error) === "ENOENT") return { deleted: [], failures: [] };
    return { deleted: [], failures: [errorText(error)] };
  }
  const today = dayNumber(now);
  const deleted: string[] = [];
  const failures: string[] = [];
  for (const name of names) {
    const day = logFileDayNumber(name);
    if (day === undefined || today - day <= retentionDays) continue;
    try {
      unlinkSync(join(dir, name));
      deleted.push(name);
    } catch (error) {
      failures.push(`${name}: ${errorText(error)}`);
    }
  }
  return { deleted, failures };
};

const clip = (message: string): string =>
  message.length <= MESSAGE_MAX ? message : `${message.slice(0, MESSAGE_MAX - 3)}...`;

const assertContext = (value: string | null, label: string): void => {
  if (value === null) return;
  if (value.length === 0 || value.length > CONTEXT_MAX) {
    throw new Error(`${label} must be null or a short string.`);
  }
};

export const createHostLogger = (options: HostLoggerOptions): HostLogger => {
  const dir = errorLogDir(options.dataDir);
  mkdirSync(dir, { recursive: true });
  const now = options.now ?? (() => new Date());
  const debug = options.debug === true;
  const mirror = options.mirror !== false;
  const pruned = pruneErrorLogs(dir, now(), options.retentionDays ?? LOG_RETENTION_DAYS);
  let currentSession: string | null = null;
  const listeners = new Set<(entry: LogEntry) => void>();

  const notify = (entry: LogEntry): void => {
    for (const listener of listeners) {
      try {
        listener(entry);
      } catch (error) {
        console.error(`log-listen: ${errorText(error)}`);
      }
    }
  };

  const writeLine = (entry: LogEntry): void => {
    try {
      mkdirSync(dir, { recursive: true });
      const file = join(dir, dailyLogFileName(new Date(entry.time)));
      appendFileSync(file, `${JSON.stringify(entry)}\n`, "utf8");
    } catch (error) {
      console.error(`log-write: Could not write the error log: ${errorText(error)}`);
    }
  };

  const mirrorLine = (entry: LogEntry): void => {
    if (!mirror) return;
    const line = `${entry.code}: ${entry.message}`;
    if (entry.level === "error") console.error(line);
    else if (entry.level === "warn") console.warn(line);
    else if (entry.level === "info") console.info(line);
    else console.debug(line);
  };

  const append = (entry: Omit<LogEntry, "time">): void => {
    if (!CODE.test(entry.code)) {
      throw new Error(`error code must be a short slug, got ${JSON.stringify(entry.code)}.`);
    }
    if (entry.message.trim() === "") throw new Error("error log message must not be empty.");
    assertContext(entry.device, "device");
    assertContext(entry.session, "session");
    assertContext(entry.screen, "screen");
    if (entry.level === "debug" && !debug) return;
    const stored: LogEntry = {
      time: now().toISOString(),
      level: entry.level,
      source: entry.source,
      device: entry.device,
      session: entry.session,
      screen: entry.screen,
      code: entry.code,
      message: clip(entry.message),
    };
    writeLine(stored);
    mirrorLine(stored);
    notify(stored);
  };

  const emit = (level: LogLevel, code: string, message: string, fields?: LogFields): void => {
    append({
      level,
      source: fields?.source ?? "server",
      device: fields?.device ?? null,
      session: fields && "session" in fields ? (fields.session ?? null) : currentSession,
      screen: fields?.screen ?? null,
      code,
      message,
    });
  };

  const logger: HostLogger = {
    dir,
    setSession: (session) => {
      assertContext(session, "session");
      currentSession = session;
    },
    session: () => currentSession,
    append,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    error: (code, message, fields) => emit("error", code, message, fields),
    warn: (code, message, fields) => emit("warn", code, message, fields),
    info: (code, message, fields) => emit("info", code, message, fields),
    debug: (code, message, fields) => emit("debug", code, message, fields),
  };

  for (const failure of pruned.failures) {
    logger.error("log-prune", `Could not prune the error log: ${failure}`);
  }
  return logger;
};

export const isLogIngestPath = (pathname: string | undefined): boolean =>
  pathname === LOG_INGEST_PATH;

const headerValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const readLimitedBody = (req: IncomingMessage, limit: number): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const succeed = () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks).toString("utf8"));
    };
    req.on("data", (chunk: Buffer | string) => {
      if (settled) return;
      const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      size += buf.length;
      if (size > limit) {
        fail(new Error("The log body is too large."));
        return;
      }
      chunks.push(buf);
    });
    req.on("end", succeed);
    req.on("error", (error: unknown) => {
      fail(error instanceof Error ? error : new Error(errorText(error)));
    });
  });

const sendText = (res: ServerResponse, status: number, text: string) => {
  if (res.headersSent) return;
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
};

const nullableText = (
  value: unknown,
  max: number,
): { ok: true; value: string | null } | { ok: false } => {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string" || value.length === 0 || value.length > max) return { ok: false };
  return { ok: true, value };
};

const acceptIngest = (
  value: unknown,
): { ok: true; entry: Omit<LogEntry, "time"> } | { ok: false; reason: string } => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "Log ingest refused a body that is not an object." };
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (ALLOWED_FIELDS.has(key)) continue;
    const shown = FIELD_NAME.test(key) ? key : "a field";
    return { ok: false, reason: `Log ingest refused unknown field ${shown}.` };
  }
  if (!isLogLevel(record.level)) return { ok: false, reason: "Log ingest refused the level." };
  if (!isLogSource(record.source)) return { ok: false, reason: "Log ingest refused the source." };
  const device = nullableText(record.device, CONTEXT_MAX);
  const session = nullableText(record.session, CONTEXT_MAX);
  const screen = nullableText(record.screen, CONTEXT_MAX);
  if (!device.ok || !session.ok || !screen.ok) {
    return { ok: false, reason: "Log ingest refused a device, session or screen." };
  }
  if (typeof record.code !== "string" || !CODE.test(record.code)) {
    return { ok: false, reason: "Log ingest refused the error code." };
  }
  if (
    typeof record.message !== "string" ||
    record.message.trim() === "" ||
    record.message.length > INGEST_MESSAGE_MAX
  ) {
    return { ok: false, reason: "Log ingest refused the message." };
  }
  return {
    ok: true,
    entry: {
      level: record.level,
      source: record.source,
      device: device.value,
      session: session.value,
      screen: screen.value,
      code: record.code,
      message: record.message,
    },
  };
};

/**
 * `POST /log` appends one line. The host stamps the time. It also stamps identity (D12):
 * the body's `device`, `session` and `source` are ignored, because this request has no
 * joined socket. The stored line uses the logger's session, no device id, and source
 * `server`. Screen, level, code and message are the page's report. Unknown fields are
 * refused, including anything that would carry raw bytes. A debug line is accepted and
 * stored only when the logger's debug switch is on. The caller answers `OPTIONS` for dev CORS.
 */
export const handleLogIngest = async (
  req: IncomingMessage,
  res: ServerResponse,
  logger: HostLogger,
): Promise<void> => {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    sendText(res, 405, "Method not allowed.\n");
    return;
  }
  const media = headerValue(req.headers["content-type"])?.split(";")[0]?.trim().toLowerCase();
  if (media && media !== "application/json") {
    logger.error("log-ingest", "Log ingest refused a body that is not JSON.");
    sendText(res, 415, "Log entry must be JSON.\n");
    return;
  }
  let text: string;
  try {
    text = await readLimitedBody(req, INGEST_BODY_MAX);
  } catch (error) {
    const message = errorText(error);
    logger.error(
      "log-ingest",
      message.trim() === "" ? "Log ingest failed to read the body." : message,
    );
    sendText(res, message === "The log body is too large." ? 413 : 400, "Log entry was refused.\n");
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    logger.error("log-ingest", `Log ingest body is not valid JSON: ${errorText(error)}`);
    sendText(res, 400, "Log entry was refused.\n");
    return;
  }
  const accepted = acceptIngest(parsed);
  if (!accepted.ok) {
    logger.error("log-ingest", accepted.reason);
    sendText(res, 400, "Log entry was refused.\n");
    return;
  }
  logger.append({
    level: accepted.entry.level,
    source: "server",
    device: null,
    session: logger.session(),
    screen: accepted.entry.screen,
    code: accepted.entry.code,
    message: accepted.entry.message,
  });
  res.writeHead(204);
  res.end();
};
