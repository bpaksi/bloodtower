import {
  type ControlAction,
  controlMessageSchema,
  helloPayloadSchema,
  holdMessageSchema,
  keeperLineEndedMessageSchema,
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

/**
 * Where `/ws` is. A page this host served uses its own host.
 * `next dev` serves the page from another port, so `pnpm dev` sets `NEXT_PUBLIC_WS_URL`.
 */
export const sessionUrl = (location: { protocol: string; host: string }, configured?: string) => {
  if (configured) return configured;
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
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
  /** `option` is set only for a `pick`. */
  sendControl: (promptId: string, action: ControlAction, option?: string) => boolean;
  /** The story board only: the Keeper line that finished on the board (D7 exception). */
  sendKeeperLineEnded: (momentId: string, line: number) => boolean;
  close: () => void;
}

export interface SessionOptions {
  url: string;
  hello: HelloPayload;
  onWelcome: (payload: Extract<ServerMessage, { type: "welcome" }>["payload"]) => void;
  onStoryboard: (payload: Extract<ServerMessage, { type: "storyboardState" }>["payload"]) => void;
  onDevice: (payload: Extract<ServerMessage, { type: "deviceState" }>["payload"]) => void;
  onError: (payload: Extract<ServerMessage, { type: "error" }>["payload"]) => void;
  onLive: (live: boolean) => void;
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
      if (typeof event.data !== "string") {
        options.onError({
          code: "invalid-json",
          message: "The session host sent a frame this page cannot show.",
        });
        return;
      }
      let json: unknown;
      try {
        json = JSON.parse(event.data);
      } catch {
        options.onError({
          code: "invalid-json",
          message: "The session host sent a frame this page cannot show.",
        });
        return;
      }
      const message = serverMessageSchema.safeParse(json);
      if (!message.success) {
        options.onError({
          code: "invalid-payload",
          message: "The session host sent a frame this page cannot show.",
        });
        return;
      }
      if (message.data.type === "welcome") {
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
      options.onError(message.data.payload);
    };
    current.onclose = () => {
      if (socket !== current) return;
      options.onLive(false);
      if (closed) return;
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
    sendControl: (promptId, action, option) => {
      const message = controlMessageSchema.safeParse({
        v: PROTOCOL_VERSION,
        type: "control",
        payload: option === undefined ? { promptId, action } : { promptId, action, option },
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
