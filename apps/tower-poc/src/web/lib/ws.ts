// The browser's link to the tower service. It reconnects to the service by itself, because that is
// a network link and not a physical action. It never queues or re-sends a message: one sent while
// the link is down is refused, and the person presses the button again. The tower itself is never
// reconnected from here (D10).
import {
  type ClientSocketState,
  PROTOCOL_VERSION,
  type ServerMessage,
  serverMessageSchema,
} from "@dark-tower/tower";

/** Waits between attempts: quick at first, then every 5 s for as long as the page is open. */
export const RECONNECT_DELAYS_MS = [500, 1_000, 2_000, 5_000] as const;
/** Failed attempts in a row after which the service is reported unreachable, not reconnecting. */
export const UNREACHABLE_AFTER = 3;

export const reconnectDelay = (attempt: number) =>
  RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)] ?? 5_000;

/**
 * Where the service's `/ws` is. A page the service served reaches it on its own host. `next dev`
 * serves the page from another port, so `pnpm dev` sets `NEXT_PUBLIC_WS_URL` (M0).
 */
export const serviceUrl = (location: Pick<Location, "protocol" | "host">, configured?: string) => {
  if (configured) return configured;
  return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
};

/** A short name for this device, for `hello`. The service only records it. */
export const clientLabel = (userAgent: string, maxTouchPoints: number) => {
  // iPadOS reports itself as a Mac; touch is what tells them apart.
  if (/iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)) return "iPad";
  if (/iPhone/.test(userAgent)) return "iPhone";
  if (/Android/.test(userAgent)) return "Android";
  if (/Macintosh/.test(userAgent)) return "Mac";
  return "Browser";
};

let counter = 0;
/**
 * A message id, unique within this page. `crypto.randomUUID` is missing on a page loaded over
 * plain http from another device (an iPad on the LAN), so it is not used.
 */
export const nextMessageId = () => {
  counter += 1;
  return `w-${Date.now().toString(36)}-${counter}`;
};

export interface ServiceSocketOptions {
  url: string;
  label: string;
  onMessage: (message: ServerMessage) => void;
  onSocketState: (state: ClientSocketState) => void;
  /** For tests. */
  createSocket?: (url: string) => WebSocket;
}

export interface ServiceSocket {
  /** Sends a client message. False when the link is down; nothing is kept to send later. */
  send: (type: string, payload: unknown, id?: string) => boolean;
  /** Closes the link and stops reconnecting. */
  close: () => void;
}

export const openServiceSocket = (options: ServiceSocketOptions): ServiceSocket => {
  const create = options.createSocket ?? ((url: string) => new WebSocket(url));
  let socket: WebSocket | undefined;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const connect = () => {
    const current = create(options.url);
    socket = current;
    current.onopen = () => {
      current.send(
        JSON.stringify({
          v: PROTOCOL_VERSION,
          type: "hello",
          id: nextMessageId(),
          payload: { clientLabel: options.label },
        }),
      );
      options.onSocketState("online");
    };
    current.onmessage = (event) => {
      let json: unknown;
      try {
        json = JSON.parse(String(event.data));
      } catch {
        return;
      }
      const message = serverMessageSchema.safeParse(json);
      // The link counts as working once the service has answered hello, not when the socket opens:
      // a service that accepts and then drops every socket is unreachable, not reconnecting.
      if (message.success && message.data.type === "welcome") failures = 0;
      // A message this build does not understand comes from another version of the service.
      if (message.success) options.onMessage(message.data);
      else console.warn("Ignoring a message from the service this page does not understand.");
    };
    current.onclose = () => {
      if (closed || socket !== current) return;
      socket = undefined;
      failures += 1;
      options.onSocketState(
        failures >= UNREACHABLE_AFTER ? "service-unreachable" : "reconnecting-to-service",
      );
      timer = setTimeout(connect, reconnectDelay(failures - 1));
    };
    // `close` always follows `error`, and does the work.
    current.onerror = () => {};
  };

  options.onSocketState("reconnecting-to-service");
  connect();

  return {
    send: (type, payload, id) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) return false;
      socket.send(JSON.stringify({ v: PROTOCOL_VERSION, type, ...(id ? { id } : {}), payload }));
      return true;
    },
    close: () => {
      closed = true;
      if (timer) clearTimeout(timer);
      socket?.close();
      socket = undefined;
    },
  };
};
