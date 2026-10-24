import {
  actMessageSchema,
  type BoardView,
  type DeviceView,
  helloPayloadSchema,
  type LogPayload,
  logMessageSchema,
  narrationEndedMessageSchema,
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

export const forgetStoredToken = (input: {
  hadStoredToken: boolean;
  welcomed: boolean;
  code: string;
}) => input.hadStoredToken && !input.welcomed && input.code === "invalid-state";

export const DEV_SESSION_WS_PORT = 4787;
export const DEV_PAGE_PORT = 3000;

const isLoopbackHostname = (hostname: string) =>
  hostname === "localhost" || hostname === "::1" || hostname.startsWith("127.");

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
  sendAct: (promptId: string, actionId: string, args?: Record<string, unknown>) => boolean;
  sendHold: (heroId: string, action: "take" | "release") => boolean;
  sendFocusStory: (storyId: string) => boolean;
  sendSetting: (settingId: string, optionId: string) => boolean;
  sendNarrationEnded: (lineId: string) => boolean;
  sendLog: (payload: LogPayload) => boolean;
  close: () => void;
}

export interface SessionOptions {
  url: string;
  hello: HelloPayload;
  onWelcome: (payload: Extract<ServerMessage, { type: "welcome" }>["payload"]) => void;
  onBoardView: (payload: BoardView) => void;
  onDeviceView: (payload: DeviceView) => void;
  onError: (payload: Extract<ServerMessage, { type: "error" }>["payload"]) => void;
  onLocalError?: (payload: Extract<ServerMessage, { type: "error" }>["payload"]) => void;
  onLogged?: (payload: Extract<ServerMessage, { type: "logged" }>["payload"]) => void;
  onLive: (live: boolean) => void;
  onReconnect?: () => void;
  createSocket?: (url: string) => WebSocket;
}

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
      if (message.data.type === "boardView") {
        options.onBoardView(message.data.payload);
        return;
      }
      if (message.data.type === "deviceView") {
        options.onDeviceView(message.data.payload);
        return;
      }
      if (message.data.type === "logged") {
        options.onLogged?.(message.data.payload);
        return;
      }
      if (message.data.type === "error") {
        options.onError(message.data.payload);
        return;
      }
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
    sendAct: (promptId, actionId, args = {}) => {
      const message = actMessageSchema.safeParse({
        v: PROTOCOL_VERSION,
        type: "act",
        payload: { promptId, actionId, args },
      });
      if (!message.success) return false;
      return sendRaw(message.data);
    },
    sendHold: (heroId, action) => {
      const message = actMessageSchema.safeParse({
        v: PROTOCOL_VERSION,
        type: "act",
        payload: { promptId: "hero-hold", actionId: action, args: { heroId } },
      });
      if (!message.success) return false;
      return sendRaw(message.data);
    },
    sendFocusStory: (storyId) => {
      const message = actMessageSchema.safeParse({
        v: PROTOCOL_VERSION,
        type: "act",
        payload: { promptId: "focus-story", actionId: "focus", args: { storyId } },
      });
      if (!message.success) return false;
      return sendRaw(message.data);
    },
    sendSetting: (settingId, optionId) => {
      const message = actMessageSchema.safeParse({
        v: PROTOCOL_VERSION,
        type: "act",
        payload: {
          promptId: "set-setting",
          actionId: "set",
          args: { settingId, optionId },
        },
      });
      if (!message.success) return false;
      return sendRaw(message.data);
    },
    sendNarrationEnded: (lineId) => {
      const message = narrationEndedMessageSchema.safeParse({
        v: PROTOCOL_VERSION,
        type: "narration-ended",
        payload: { lineId },
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
    close: () => {
      closed = true;
      if (timer) clearTimeout(timer);
      socket?.close();
    },
  };
};
