import { describe, expect, it } from "vitest";
import { joinHost, lanUrls } from "./lanUrls.ts";

describe("lanUrls", () => {
  it("returns the one URL when bound to a specific host", () => {
    expect(lanUrls("127.0.0.1", 4787)).toEqual(["http://127.0.0.1:4787"]);
  });

  it("lists localhost first, then IPv4 addresses, when bound to every interface", () => {
    const urls = lanUrls("0.0.0.0", 4787);
    expect(urls[0]).toBe("http://localhost:4787");
    for (const url of urls) expect(url).toMatch(/^http:\/\/[a-z0-9.]+:4787$/);
  });
});

describe("joinHost", () => {
  const lan = ["192.168.1.20", "10.0.0.5"];

  it("uses the first LAN address when bound to every interface", () => {
    expect(joinHost("0.0.0.0", lan)).toBe("192.168.1.20");
    expect(joinHost("::", lan)).toBe("192.168.1.20");
  });

  it("is undefined when bound to every interface and no LAN address exists", () => {
    expect(joinHost("0.0.0.0", [])).toBeUndefined();
  });

  it("uses a bound LAN address as it is", () => {
    expect(joinHost("192.168.1.20", [])).toBe("192.168.1.20");
  });

  it("is undefined when bound to loopback only, so the board can warn", () => {
    expect(joinHost("127.0.0.1", lan)).toBeUndefined();
    expect(joinHost("localhost", lan)).toBeUndefined();
    expect(joinHost("::1", lan)).toBeUndefined();
  });
});
