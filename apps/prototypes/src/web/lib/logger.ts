// Logger for prototypes. There is no Mac host here, so errors go to the console, to an in-page log
// panel (components/LogPanel.tsx) that can be exported, and, for errors, to a toast.
// Repeats of the same toast collapse into one toast with a count. See CLAUDE.md, Errors.

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogEntry = {
  id: number;
  time: string;
  level: LogLevel;
  code: string;
  message: string;
  detail?: string;
};

export type Toast = {
  id: number;
  level: LogLevel;
  code: string;
  message: string;
  /** How many times this same toast was raised while it was on screen. */
  count: number;
};

export type LogState = { entries: readonly LogEntry[]; toasts: readonly Toast[] };

export type ConsoleSink = Pick<Console, "debug" | "info" | "warn" | "error">;

export type EventTargetLike = Pick<EventTarget, "addEventListener" | "removeEventListener">;

const MAX_ENTRIES = 500;

/** Turns anything that was thrown into readable text, with the stack when there is one. */
export function describeError(cause: unknown): string {
  if (cause instanceof Error) return cause.stack ?? `${cause.name}: ${cause.message}`;
  if (typeof cause === "string") return cause;
  try {
    return JSON.stringify(cause) ?? String(cause);
  } catch {
    return String(cause);
  }
}

function messageOf(cause: unknown): string {
  if (cause instanceof Error) return cause.message || cause.name;
  return typeof cause === "string" ? cause : describeError(cause);
}

export function createLogger(options: { sink?: ConsoleSink; now?: () => Date } = {}) {
  const sink = options.sink ?? console;
  const now = options.now ?? (() => new Date());
  let state: LogState = { entries: [], toasts: [] };
  let nextId = 1;
  const listeners = new Set<() => void>();

  const set = (next: LogState) => {
    state = next;
    for (const l of listeners) l();
  };

  function log(
    level: LogLevel,
    message: string,
    opts: { code?: string; cause?: unknown } = {},
  ): LogEntry {
    const code = opts.code ?? (level === "error" ? "ERROR" : level.toUpperCase());
    const detail = opts.cause === undefined ? undefined : describeError(opts.cause);
    const entry: LogEntry = {
      id: nextId++,
      time: now().toISOString(),
      level,
      code,
      message,
      ...(detail === undefined ? {} : { detail }),
    };
    sink[level](`[${code}] ${message}`, ...(detail === undefined ? [] : [detail]));
    let toasts = state.toasts;
    if (level === "error") {
      const same = toasts.find(
        (t) => t.level === level && t.code === code && t.message === message,
      );
      toasts = same
        ? toasts.map((t) => (t === same ? { ...t, count: t.count + 1 } : t))
        : [...toasts, { id: entry.id, level, code, message, count: 1 }];
    }
    set({ entries: [...state.entries, entry].slice(-MAX_ENTRIES), toasts });
    return entry;
  }

  /** Log an error. `cause` is the thrown value; its message is used when `message` is left out. */
  function error(message: string | undefined, cause?: unknown, code?: string): LogEntry {
    return log("error", message ?? messageOf(cause), {
      ...(code === undefined ? {} : { code }),
      ...(cause === undefined ? {} : { cause }),
    });
  }

  /** Catches errors thrown in a page and unhandled promise rejections on `target` (the window). */
  function installGlobalHandlers(target: EventTargetLike): () => void {
    const onError = (e: { error?: unknown; message?: string }) =>
      error(e.message ?? messageOf(e.error), e.error ?? e.message, "UNCAUGHT_ERROR");
    const onRejection = (e: { reason?: unknown }) =>
      error(`Unhandled rejection: ${messageOf(e.reason)}`, e.reason, "UNHANDLED_REJECTION");
    target.addEventListener("error", onError as unknown as EventListener);
    target.addEventListener("unhandledrejection", onRejection as unknown as EventListener);
    return () => {
      target.removeEventListener("error", onError as unknown as EventListener);
      target.removeEventListener("unhandledrejection", onRejection as unknown as EventListener);
    };
  }

  return {
    log,
    debug: (message: string) => log("debug", message),
    info: (message: string) => log("info", message),
    warn: (message: string, code?: string) =>
      log("warn", message, code === undefined ? {} : { code }),
    error,
    installGlobalHandlers,
    getState: () => state,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dismissToast(id: number) {
      set({ ...state, toasts: state.toasts.filter((t) => t.id !== id) });
    },
    clear() {
      set({ entries: [], toasts: [] });
    },
    /** The whole log as JSON text, for the panel's export. */
    exportText(): string {
      return JSON.stringify(state.entries, null, 2);
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;

/** The one logger a prototype page uses. */
export const logger: Logger = createLogger();
