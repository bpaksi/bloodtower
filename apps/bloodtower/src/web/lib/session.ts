import {
  type ControlAction,
  controlMessageSchema,
  focusStoryMessageSchema,
  helloPayloadSchema,
  holdMessageSchema,
  keeperLineEndedMessageSchema,
  type LogPayload,
  logMessageSchema,
  PROTOCOL_VERSION,
  type ServerMessage,
  serverMessageSchema,
} from "bloodtower-protocols";

/** Survives a refresh in this tab. A new tab joins again. */
export const DEVICE_TOKEN_KEY = "bloodtower.deviceToken";

/** Waits between attempts. The session socket is a network link, not a tower action. */
export const RECONNECT_DELAYS_MS = [500, 1_000, 2_000, 5_000] as const;

export const reconnectDelay = (attempt: number) =>
  RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)] ?? 5_000;

/**
 * A stored token is stale only when hello itself is refused, before welcome.
 * A later invalid-state, such as a hold the session rejected, keeps the token.
 */
export const forgetStoredToken = (input: {
  hadStoredToken: boolean;
  welcomed: boolean;
  code: string;
}) => input.hadStoredToken && !input.welcomed && input.code === "invalid-state";

/** Session socket port in `pnpm dev` while `next dev` serves the page on port 3000. */
export const DEV_SESSION_WS_PORT = 4787;

/** `next dev` serves the UI on this port; the socket stays on {@link DEV_SESSION_WS_PORT}. */
export const DEV_PAGE_PORT = 3000;

const isLoopbackHostname = (hostname: string) =>
  hostname === "localhost" || hostname === "::1" || hostname.startsWith("127.");

/**
 * Where `/ws` is. A page this host served uses its own host and port.
 * `next dev` serves the page on another port; the socket stays on {@link SESSION_WS_PORT}.
 * When the page is opened on the LAN but `NEXT_PUBLIC_WS_URL` still points at loopback,
 * the socket URL follows the page hostname so an iPad does not connect to itself.
 */
export const sessionUrl = (location: { protocol: string; host: string }, configured?: string) => {
  const page = new URL(`${location.protocol}//${location.host}`);
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";

  if (configured) {
    const ws = new URL(configured);
    if (!isLoopbackHostname(page.hostname) && isLoopbackHostname(ws.hostname)) {
      return `${scheme}//${page.hostname}:${DEV_SESSION_WS_PORT}/ws`;
    }
    return configured;
  }

  if (page.port === String(DEV_PAGE_PORT)) {
    return `${scheme}//${page.hostname}:${DEV_SESSION_WS_PORT}/ws`;
  }
  return `${scheme}//${location.host}/ws`;
};

export const storyboardHello = () =>
  helloPayloadSchema.parse({
    role: "storyboard",
    clientLabel: "Story board",
    formFactor: "mac",
  });

export const deviceHello = (input: {
  formFactor: "ipad" | "phone";
  joinCode?: string;
  token?: string;
}) =>
  helloPayloadSchema.parse({
    role: "device",
    clientLabel: input.formFactor === "phone" ? "Phone" : "iPad",
    formFactor: input.formFactor,
    ...(input.token ? { token: input.token } : {}),
    ...(input.joinCode ? { joinCode: input.joinCode } : {}),
  });

type HelloPayload = ReturnType<typeof storyboardHello> | ReturnType<typeof deviceHello>;

export interface SessionClient {
  /** False when the link is down. Nothing is kept to send later. */
  sendHold: (hunter: string, action: "take" | "release") => boolean;
  /**
   * `option` is set only for a `pick`, a `set` or a `volume-answer`; `setting` only for a `set`;
   * `note` only for the write-in `volume-answer`.
   */
  sendControl: (
    promptId: string,
    action: ControlAction,
    option?: string,
    setting?: string,
    note?: string,
  ) => boolean;
  /** Moves the highlight on Pick Story. Not a press: it takes no lock. */
  sendFocusStory: (story: string) => boolean;
  /** The story board only: the Keeper line that finished on the board (D7 exception). */
  sendKeeperLineEnded: (momentId: string, line: number) => boolean;
  /**
   * Page log (decision 0003). Text and a short code only. False when the socket is not open,
   * hello has not finished, or the payload is refused, so the caller can POST `/log` instead.
   * A socket that has not joined cannot stamp a role, so the line does not go out on it.
   */
  sendLog: (payload: LogPayload) => boolean;
  close: () => void;
}

export interface SessionOptions {
  url: string;
  hello: HelloPayload;
  onWelcome: (payload: Extract<ServerMessage, { type: "welcome" }>["payload"]) => void;
  onStoryboard: (payload: Extract<ServerMessage, { type: "storyboardState" }>["payload"]) => void;
  onDevice: (payload: Extract<ServerMessage, { type: "deviceState" }>["payload"]) => void;
  onError: (payload: Extract<ServerMessage, { type: "error" }>["payload"]) => void;
  /**
   * A frame this page could not read. The host did not write it. `onError` is also called.
   * A host `error` message is not a local error: the host already logged it.
   */
  onLocalError?: (payload: Extract<ServerMessage, { type: "error" }>["payload"]) => void;
  /** An error line the host just wrote. The story board shows it as a toast. */
  onLogged?: (payload: Extract<ServerMessage, { type: "logged" }>["payload"]) => void;
  onLive: (live: boolean) => void;
  /** The socket dropped and a reconnect is scheduled. This is not an error. */
  onReconnect?: () => void;
  /** For tests. */
  createSocket?: (url: string) => WebSocket;
}

/**
 * One socket to the session host. It reconnects by itself.
 * A device reconnects with its token, not the join code, so it does not become a second device.
 * A dropped link does not retry a press or a tower action.
 */
export const openSession = (options: SessionOptions): SessionClient => {
  const create = options.createSocket ?? ((url: string) => new WebSocket(url));
  let socket: WebSocket | undefined;
  let hello = options.hello;
  let closed = false;
  let joined = false;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const sendRaw = (message: unknown) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(message));
    return true;
  };

  const connect = () => {
    const current = create(options.url);
    socket = current;
    current.onopen = () => {
      attempt = 0;
      options.onLive(true);
      sendRaw({ v: PROTOCOL_VERSION, type: "hello", payload: hello });
    };
    current.onmessage = (event) => {
      const failLocal = (code: "invalid-json" | "invalid-payload", message: string) => {
        const payload = { code, message };
        options.onLocalError?.(payload);
        options.onError(payload);
      };
      if (typeof event.data !== "string") {
        failLocal("invalid-json", "The session host sent a frame this page cannot show.");
        return;
      }
      let json: unknown;
      try {
        json = JSON.parse(event.data);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        failLocal(
          "invalid-json",
          detail.trim() === ""
            ? "The session host sent a frame this page cannot show."
            : `The session host sent a frame this page cannot show. ${detail}`,
        );
        return;
      }
      const message = serverMessageSchema.safeParse(json);
      if (!message.success) {
        failLocal("invalid-payload", "The session host sent a frame this page cannot show.");
        return;
      }
      if (message.data.type === "welcome") {
        joined = true;
        if (message.data.payload.role === "device" && hello.role === "device") {
          hello = deviceHello({
            formFactor: hello.formFactor === "phone" ? "phone" : "ipad",
            token: message.data.payload.token,
          });
        }
        options.onWelcome(message.data.payload);
        return;
      }
      if (message.data.type === "storyboardState") {
        options.onStoryboard(message.data.payload);
        return;
      }
      if (message.data.type === "deviceState") {
        options.onDevice(message.data.payload);
        return;
      }
      if (message.data.type === "logged") {
        options.onLogged?.(message.data.payload);
        return;
      }
      options.onError(message.data.payload);
    };
    current.onclose = () => {
      if (socket !== current) return;
      joined = false;
      options.onLive(false);
      if (closed) return;
      options.onReconnect?.();
      const delay = reconnectDelay(attempt);
      attempt += 1;
      timer = setTimeout(connect, delay);
    };
  };

  connect();

  return {
    sendHold: (hunter, action) => {
      const message = holdMessageSchema.safeParse({
        v: PROTOCOL_VERSION,
        type: "hold",
        payload: { hunter, action },
      });
      if (!message.success) return false;
      return sendRaw(message.data);
    },
    sendControl: (promptId, action, option, setting, note) => {
      const message = controlMessageSchema.safeParse({
        v: PROTOCOL_VERSION,
        type: "control",
        payload: {
          promptId,
          action,
          ...(option === undefined ? {} : { option }),
          ...(setting === undefined ? {} : { setting }),
          ...(note === undefined ? {} : { note }),
        },
      });
      if (!message.success) return false;
      return sendRaw(message.data);
    },
    sendFocusStory: (story) => {
      const message = focusStoryMessageSchema.safeParse({
        v: PROTOCOL_VERSION,
        type: "focus-story",
        payload: { story },
      });
      if (!message.success) return false;
      return sendRaw(message.data);
    },
    sendLog: (payload) => {
      if (!joined) return false;
      const message = logMessageSchema.safeParse({
        v: PROTOCOL_VERSION,
        type: "log",
        payload,
      });
      if (!message.success) return false;
      return sendRaw(message.data);
    },
    sendKeeperLineEnded: (momentId, line) => {
      const message = keeperLineEndedMessageSchema.safeParse({
        v: PROTOCOL_VERSION,
        type: "keeper-line-ended",
        payload: { momentId, line },
      });
      if (!message.success) return false;
      return sendRaw(message.data);
    },
    close: () => {
      closed = true;
      if (timer) clearTimeout(timer);
      socket?.close();
    },
  };
};
