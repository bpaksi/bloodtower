import {
  type CapabilityId,
  type ClientType,
  type ConnectionPayload,
  END_STAGES,
  type Envelope,
  type ErrorPayload,
  type LifecyclePayload,
  PROTOCOL_VERSION,
  type WelcomePayload,
} from "./types.ts";

/** Why a call failed. `code` is what the page shows next to the control. */
export type TowerErrorCode =
  | "NOT_CONNECTED" // no open link to tower-poc; press Connect first
  | "SOCKET_FAILED" // the link did not open, or closed
  | "NO_ANSWER" // sent, and nothing came back in time
  | "BAD_MESSAGE" // the service sent something that is not a known message
  | "SERVER_ERROR"; // the service answered with an `error` message (see `detail`)

export class TowerClientError extends Error {
  constructor(
    readonly code: TowerErrorCode,
    message: string,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "TowerClientError";
  }
  /** Text for the logger and the control: `NO_ANSWER: ...`. */
  get shown() {
    return `${this.code}${this.detail ? `/${this.detail}` : ""}: ${this.message}`;
  }
}

/** How a command ended. `confirmed` and `indeterminate` are not failures (GAP-HW-010). */
export interface CommandOutcome {
  commandId: string;
  capabilityId: string;
  stage: LifecyclePayload["stage"];
  ok: boolean;
  reason?: string;
  issues?: LifecyclePayload["issues"];
}

export interface TowerClientOptions {
  /** `ws://host:port/ws` of tower-poc. */
  url: string;
  label?: string;
  /**
   * Wait this long for an answer before NO_ANSWER. Default covers tower-poc's
   * calibration limit (30 s) and queued-command timeout (35 s).
   */
  timeoutMs?: number;
  /** Test seam; defaults to the platform WebSocket. */
  WebSocketImpl?: typeof WebSocket;
  /** Called for every `connection` message from the service. */
  onConnection?: (connection: ConnectionPayload) => void;
  /** Called when the link closes; the client does not reopen it. */
  onClose?: () => void;
}

interface Waiter {
  match: (m: Envelope) => boolean;
  resolve: (m: Envelope) => void;
  reject: (e: TowerClientError) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * One link to tower-poc. Everything here happens on a call from a press: it opens only in
 * `open()`, sends only what a method is told to, and never reopens or resends on its own.
 */
export const createTowerClient = (options: TowerClientOptions) => {
  const timeoutMs = options.timeoutMs ?? 35_000;
  const Impl = options.WebSocketImpl ?? globalThis.WebSocket;
  let socket: WebSocket | undefined;
  let welcome: WelcomePayload | undefined;
  let connection: ConnectionPayload | undefined;
  let seq = 0;
  // Ids must be unique across clients: the service reports a command by its id alone.
  const session = Math.random().toString(36).slice(2, 10);
  const waiters = new Set<Waiter>();

  const failAll = (error: TowerClientError) => {
    for (const w of [...waiters]) {
      clearTimeout(w.timer);
      waiters.delete(w);
      w.reject(error);
    }
  };

  const wait = (match: Waiter["match"], what: string) =>
    new Promise<Envelope>((resolve, reject) => {
      const waiter: Waiter = {
        match,
        resolve,
        reject,
        timer: setTimeout(() => {
          waiters.delete(waiter);
          reject(new TowerClientError("NO_ANSWER", `No answer to ${what} in ${timeoutMs} ms.`));
        }, timeoutMs),
      };
      waiters.add(waiter);
    });

  const onMessage = (data: unknown) => {
    let message: Envelope;
    try {
      message = JSON.parse(String(data)) as Envelope;
    } catch (cause) {
      failAll(new TowerClientError("BAD_MESSAGE", `Not JSON: ${(cause as Error).message}`));
      return;
    }
    if (message?.v !== PROTOCOL_VERSION || typeof message.type !== "string") {
      failAll(new TowerClientError("BAD_MESSAGE", "Message is not a protocol v1 envelope."));
      return;
    }
    if (message.type === "connection") {
      connection = message.payload as ConnectionPayload;
      options.onConnection?.(connection);
    }
    for (const w of [...waiters]) {
      if (!w.match(message)) continue;
      clearTimeout(w.timer);
      waiters.delete(w);
      if (message.type === "error") {
        const e = message.payload as ErrorPayload;
        w.reject(new TowerClientError("SERVER_ERROR", e.message, e.code));
      } else w.resolve(message);
    }
  };

  const ensureOpen = (): WebSocket => {
    if (!socket || socket.readyState !== Impl.OPEN)
      throw new TowerClientError("NOT_CONNECTED", "Not connected to tower-poc.");
    return socket;
  };
  const raw = (type: ClientType, payload: unknown, id: string) => {
    const open = ensureOpen();
    const envelope: Envelope = { v: PROTOCOL_VERSION, type, id, payload };
    open.send(JSON.stringify(envelope));
  };

  const nextId = (prefix: string) => `${prefix}-${session}-${++seq}`;
  const isErrorFor = (id: string) => (m: Envelope) => m.type === "error" && m.correlationId === id;

  return {
    /** Opens the link and says hello. Call it from a press. */
    async open(): Promise<WelcomePayload> {
      if (socket) throw new TowerClientError("SOCKET_FAILED", "Already open; close it first.");
      const ws = new Impl(options.url);
      socket = ws;
      await new Promise<void>((resolve, reject) => {
        ws.addEventListener("open", () => resolve(), { once: true });
        ws.addEventListener(
          "error",
          () => reject(new TowerClientError("SOCKET_FAILED", `Could not open ${options.url}.`)),
          { once: true },
        );
      }).catch((e) => {
        socket = undefined;
        throw e;
      });
      ws.addEventListener("message", (ev) => onMessage(ev.data));
      ws.addEventListener("close", () => {
        socket = undefined;
        welcome = undefined;
        failAll(new TowerClientError("SOCKET_FAILED", "The link to tower-poc closed."));
        options.onClose?.();
      });
      const id = nextId("hello");
      const answer = wait((m) => m.type === "welcome" || isErrorFor(id)(m), "hello");
      raw("hello", { clientLabel: options.label ?? "prototypes" }, id);
      welcome = (await answer).payload as WelcomePayload;
      return welcome;
    },

    close() {
      socket?.close();
    },

    get welcome() {
      return welcome;
    },
    /** Which tower the service drives; undefined until open. Never guessed. */
    get tower() {
      return welcome?.tower;
    },
    get connection() {
      return connection;
    },

    /** The Connect / Calibrate buttons. One press, one send; resolves with the `connection` that settles it (or carries an error). */
    async press(action: "connect" | "disconnect" | "calibrate"): Promise<ConnectionPayload> {
      ensureOpen();
      const id = nextId(action);
      const settled = (c: ConnectionPayload) =>
        c.error !== undefined ||
        c.state === "error" ||
        (action === "connect" && c.state === "connected") ||
        (action === "disconnect" && c.state === "disconnected") ||
        (action === "calibrate" && c.calibration === "calibrated");
      const answer = wait(
        (m) =>
          isErrorFor(id)(m) || (m.type === "connection" && settled(m.payload as ConnectionPayload)),
        action,
      );
      raw(action, {}, id);
      return (await answer).payload as ConnectionPayload;
    },

    /**
     * Sends one command and resolves when it ends. A command that ends `failed`, `timed-out` or
     * `rejected` resolves with `ok: false`; no end stage in time throws NO_ANSWER. Never resent.
     */
    async command(capabilityId: CapabilityId, params: unknown): Promise<CommandOutcome> {
      ensureOpen();
      const id = nextId("cmd");
      const ended = wait(
        (m) =>
          isErrorFor(id)(m) ||
          (m.type === "command.lifecycle" &&
            (m.payload as LifecyclePayload).commandId === id &&
            (m.payload as LifecyclePayload).clientId === welcome?.clientId &&
            END_STAGES.includes((m.payload as LifecyclePayload).stage)),
        `command ${capabilityId}`,
      );
      raw("command", { capabilityId, params }, id);
      const p = (await ended).payload as LifecyclePayload;
      return {
        commandId: id,
        capabilityId: p.capabilityId,
        stage: p.stage,
        ok: p.stage === "confirmed" || p.stage === "indeterminate",
        reason: p.reason,
        issues: p.issues,
      };
    },
  };
};

export type TowerClient = ReturnType<typeof createTowerClient>;
