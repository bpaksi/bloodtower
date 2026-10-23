import {
  type LogPayload,
  PAGE_LOG_CODE,
  PAGE_LOG_CONTEXT_MAX,
  PAGE_LOG_MESSAGE_MAX,
} from "bloodtower-protocols";
import { sessionUrl } from "./session.ts";

/**
 * Ships a page log to the Mac host (decision 0003).
 * The socket is preferred, and only after hello: until then the socket cannot stamp a role.
 * When it is down, not yet joined, or it refuses the line, the same fields go to `POST /log`.
 * The body is text and a short code only. The host does not keep `device`, `session` or
 * `source` from that body; it stamps its own session, no device, and source `server`.
 */

export const SOCKET_RECONNECT_CODE = "socket-reconnect";

export const reconnectLog = (): Pick<LogPayload, "level" | "code" | "message"> => ({
  level: "debug",
  code: SOCKET_RECONNECT_CODE,
  message: "The socket dropped. Reconnecting.",
});

const clipContext = (value: string | null): string | null => {
  if (value === null) return null;
  const text = value.trim();
  if (text === "") return null;
  return text.length > PAGE_LOG_CONTEXT_MAX ? text.slice(0, PAGE_LOG_CONTEXT_MAX) : text;
};

/** Makes a line the socket schema and `POST /log` will both accept. */
export const normalizePageLog = (input: LogPayload): LogPayload => {
  const code = PAGE_LOG_CODE.test(input.code) ? input.code : "page-error";
  let message = input.message.trim();
  if (code !== input.code) {
    message = message === "" ? input.code : `${input.code}: ${message}`;
  }
  if (message === "") message = "The page hit an error with no message.";
  if (message.length > PAGE_LOG_MESSAGE_MAX) {
    message = `${message.slice(0, PAGE_LOG_MESSAGE_MAX - 3)}...`;
  }
  return {
    level: input.level,
    source: input.source === "board" ? "board" : "device",
    device: clipContext(input.device),
    session: clipContext(input.session),
    screen: clipContext(input.screen),
    code,
    message,
  };
};

export interface PageLogTransport {
  /** True when the socket accepted the line. */
  sendSocket: (entry: LogPayload) => boolean;
  /** Used when the socket is down or refuses the line. */
  postHttp: (entry: LogPayload) => Promise<void>;
}

export const shipPageLog = async (
  entry: LogPayload,
  transport: PageLogTransport,
): Promise<"socket" | "http"> => {
  const clean = normalizePageLog(entry);
  if (transport.sendSocket(clean)) return "socket";
  await transport.postHttp(clean);
  return "http";
};

export interface PageLogContext {
  source: LogPayload["source"];
  device: string | null;
  session: string | null;
  screen: string | null;
}

export const screenFromPath = (pathname: string): string => {
  if (pathname === "/" || pathname === "") return "title";
  if (pathname.startsWith("/board")) return "board";
  if (pathname.startsWith("/device")) return "device";
  if (pathname.startsWith("/join")) return "join";
  const trimmed = pathname.replace(/^\/+|\/+$/g, "");
  return trimmed === "" ? "title" : trimmed.slice(0, PAGE_LOG_CONTEXT_MAX);
};

const defaultContext = (): PageLogContext => {
  if (typeof window === "undefined") {
    return { source: "device", device: null, session: null, screen: null };
  }
  const screen = screenFromPath(window.location.pathname);
  return {
    source: screen === "board" ? "board" : "device",
    device: null,
    session: null,
    screen,
  };
};

let contextRead: (() => Partial<PageLogContext>) | null = null;
let sendSocket: (entry: LogPayload) => boolean = () => false;

/** Pages with a session set this so later errors prefer that socket. */
export const setPageLogSocket = (send: ((entry: LogPayload) => boolean) | null): (() => void) => {
  const previous = sendSocket;
  sendSocket = send ?? (() => false);
  return () => {
    if (sendSocket === send) sendSocket = previous;
  };
};

/** The live page names its source, device and screen. Cleared when that page unmounts. */
export const setPageLogContext = (read: (() => Partial<PageLogContext>) | null): (() => void) => {
  const previous = contextRead;
  contextRead = read;
  return () => {
    if (contextRead === read) contextRead = previous;
  };
};

export const pageLogContext = (): PageLogContext => {
  const base = defaultContext();
  const extra = contextRead?.() ?? {};
  return {
    source: extra.source ?? base.source,
    device: extra.device === undefined ? base.device : extra.device,
    session: extra.session === undefined ? base.session : extra.session,
    screen: extra.screen === undefined ? base.screen : extra.screen,
  };
};

/** `POST /log` on the session host, including while `next dev` serves the page on another port. */
export const logIngestUrl = (
  location: { protocol: string; host: string },
  configured?: string,
): string => {
  const ws = new URL(sessionUrl(location, configured));
  ws.protocol = ws.protocol === "wss:" ? "https:" : "http:";
  ws.pathname = "/log";
  ws.search = "";
  ws.hash = "";
  return ws.toString();
};

type FetchLike = (
  url: string,
  init: { method: string; headers: { "content-type": string }; body: string },
) => Promise<{ ok: boolean; status: number }>;

export const postPageLog = async (
  url: string,
  entry: LogPayload,
  fetchImpl: FetchLike = fetch,
): Promise<void> => {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(normalizePageLog(entry)),
  });
  if (response.status !== 204) {
    throw new Error(`Log ingest answered ${response.status}.`);
  }
};

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Sends one page line. If the socket and `POST /log` both fail, the failure is
 * `console.error` with code `log-ship` and the result is `"unsent"`. There is no third
 * host path and no retry: the console line is the remaining record, and it is not hidden.
 */
export const reportPageLog = async (
  input: Pick<LogPayload, "level" | "code" | "message"> & Partial<PageLogContext>,
): Promise<"socket" | "http" | "unsent"> => {
  const context = pageLogContext();
  const entry = normalizePageLog({
    level: input.level,
    code: input.code,
    message: input.message,
    source: input.source ?? context.source,
    device: input.device === undefined ? context.device : input.device,
    session: input.session === undefined ? context.session : input.session,
    screen: input.screen === undefined ? context.screen : input.screen,
  });
  try {
    return await shipPageLog(entry, {
      sendSocket,
      postHttp: (body) => {
        if (typeof window === "undefined") {
          throw new Error("The page log has no browser to post from.");
        }
        return postPageLog(logIngestUrl(window.location, process.env.NEXT_PUBLIC_WS_URL), body);
      },
    });
  } catch (error) {
    const detail = errorText(error);
    console.error(
      `log-ship: ${detail.trim() === "" ? "The page log was not sent." : detail} (${entry.code})`,
    );
    return "unsent";
  }
};
