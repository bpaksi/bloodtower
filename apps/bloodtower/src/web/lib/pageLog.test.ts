import { afterEach, describe, expect, it, vi } from "vitest";
import {
  logIngestUrl,
  normalizePageLog,
  postPageLog,
  reconnectLog,
  reportPageLog,
  setPageLogSocket,
  shipPageLog,
} from "./pageLog.ts";

const entry = {
  level: "error" as const,
  source: "device" as const,
  device: null,
  session: null,
  screen: "play",
  code: "page-error",
  message: "The page hit an error.",
};

describe("page log shipping", () => {
  afterEach(() => {
    setPageLogSocket(null);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sends the log message on the socket when the socket accepts it", async () => {
    const sent: unknown[] = [];
    const via = await shipPageLog(entry, {
      sendSocket: (body) => {
        sent.push(body);
        return true;
      },
      postHttp: () => Promise.reject(new Error("http should not run")),
    });
    expect(via).toBe("socket");
    expect(sent).toEqual([entry]);
    expect(JSON.stringify(sent[0])).not.toContain("bytes");
  });

  it("posts /log when the socket is down", async () => {
    const posts: unknown[] = [];
    const via = await shipPageLog(entry, {
      sendSocket: () => false,
      postHttp: async (body) => {
        posts.push(body);
      },
    });
    expect(via).toBe("http");
    expect(posts).toEqual([entry]);
    expect(Object.keys(posts[0] as object).sort()).toEqual([
      "code",
      "device",
      "level",
      "message",
      "screen",
      "session",
      "source",
    ]);
  });

  it("POSTs the same JSON the socket would send", async () => {
    let called: { url: string; method: string; body: string; contentType: string } | null = null;
    await postPageLog(
      logIngestUrl({ protocol: "http:", host: "127.0.0.1:4787" }),
      entry,
      async (url, init) => {
        called = {
          url,
          method: init.method,
          body: init.body,
          contentType: init.headers["content-type"],
        };
        return { ok: true, status: 204 };
      },
    );
    expect(called).toEqual({
      url: "http://127.0.0.1:4787/log",
      method: "POST",
      body: JSON.stringify(entry),
      contentType: "application/json",
    });
    expect(logIngestUrl({ protocol: "http:", host: "localhost:3000" })).toBe(
      "http://localhost:4787/log",
    );
  });

  it("records a socket reconnect as debug, not an error", () => {
    expect(reconnectLog()).toEqual({
      level: "debug",
      code: "socket-reconnect",
      message: "The socket dropped. Reconnecting.",
    });
  });

  it("keeps a short code and clips a long message so the fallback can accept it", () => {
    const normalized = normalizePageLog({
      ...entry,
      code: "Not A Code",
      message: "x".repeat(800),
    });
    expect(normalized.code).toBe("page-error");
    expect(normalized.message.length).toBeLessThanOrEqual(500);
    expect(normalized.message.startsWith("Not A Code:")).toBe(true);
  });

  it("logs a ship failure instead of hiding it", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    setPageLogSocket(() => false);
    vi.stubGlobal("window", {
      location: { protocol: "http:", host: "127.0.0.1:4787", pathname: "/device" },
    });
    vi.stubGlobal("fetch", () => Promise.reject(new Error("network down")));
    const via = await reportPageLog({
      level: "error",
      code: "page-error",
      message: "The page hit an error.",
    });
    expect(via).toBe("unsent");
    expect(spy).toHaveBeenCalled();
    expect(String(spy.mock.calls[0]?.[0])).toContain("log-ship");
    expect(String(spy.mock.calls[0]?.[0])).toContain("page-error");
  });
});
