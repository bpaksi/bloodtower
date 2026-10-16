import { describe, expect, it } from "vitest";
import { isAllowedOrigin, parseDevOrigins } from "./origin.ts";

describe("isAllowedOrigin", () => {
  const host = "192.168.1.20:4787";

  it("accepts the origin the request was sent to", () => {
    expect(isAllowedOrigin("http://192.168.1.20:4787", host)).toBe(true);
    expect(isAllowedOrigin("http://localhost:4787", "localhost:4787")).toBe(true);
    expect(isAllowedOrigin("http://towermac.local:4787", "towermac.local:4787")).toBe(true);
  });

  it("refuses another site, another port and another host", () => {
    expect(isAllowedOrigin("https://evil.example", host)).toBe(false);
    expect(isAllowedOrigin("http://192.168.1.20:3000", host)).toBe(false);
    expect(isAllowedOrigin("http://192.168.1.21:4787", host)).toBe(false);
    expect(isAllowedOrigin("http://192.168.1.20:4787.evil.example", host)).toBe(false);
  });

  it("refuses an origin that is not a web origin", () => {
    expect(isAllowedOrigin("null", host)).toBe(false);
    expect(isAllowedOrigin("", host)).toBe(false);
    expect(isAllowedOrigin("file://", host)).toBe(false);
    expect(isAllowedOrigin("chrome-extension://192.168.1.20:4787", host)).toBe(false);
  });

  it("accepts a request with no Origin header", () => {
    expect(isAllowedOrigin(undefined, host)).toBe(true);
  });

  it("refuses an origin when the request has no Host to compare it with", () => {
    expect(isAllowedOrigin("http://192.168.1.20:4787", undefined)).toBe(false);
  });

  it("accepts a dev origin only when it is listed, and only on an exact match", () => {
    const dev = ["http://localhost:3000"];
    expect(isAllowedOrigin("http://localhost:3000", host, dev)).toBe(true);
    expect(isAllowedOrigin("http://localhost:3000", host)).toBe(false);
    expect(isAllowedOrigin("http://localhost:3001", host, dev)).toBe(false);
    expect(isAllowedOrigin("http://localhost:3000.evil.example", host, dev)).toBe(false);
  });
});

describe("parseDevOrigins", () => {
  it("returns nothing when the variable is unset or empty", () => {
    expect(parseDevOrigins(undefined)).toEqual([]);
    expect(parseDevOrigins(" , ")).toEqual([]);
  });

  it("reduces each entry to scheme, host and port", () => {
    expect(parseDevOrigins("http://localhost:3000/, https://dev.local:3443/path?x=1")).toEqual([
      "http://localhost:3000",
      "https://dev.local:3443",
    ]);
  });

  it.each([
    "localhost:3000",
    "localhost",
    "null",
    "file:///tmp/page.html",
    "data:text/html,x",
    "*",
  ])("refuses %s instead of turning it into an origin every sandboxed page has", (entry) => {
    expect(() => parseDevOrigins(`http://localhost:3000,${entry}`)).toThrow(/DEV_ORIGINS/);
  });

  it("never yields the origin null", () => {
    expect(
      isAllowedOrigin("null", "127.0.0.1:4787", parseDevOrigins("http://localhost:3000")),
    ).toBe(false);
  });
});
