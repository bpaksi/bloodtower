import { describe, expect, it } from "vitest";
import { lanUrls } from "./lanUrls.ts";

describe("lanUrls", () => {
  it("returns the one URL when bound to a specific host", () => {
    expect(lanUrls("127.0.0.1", 4747)).toEqual(["http://127.0.0.1:4747"]);
  });

  it("lists localhost first, then IPv4 addresses, when bound to every interface", () => {
    const urls = lanUrls("0.0.0.0", 4747);
    expect(urls[0]).toBe("http://localhost:4747");
    for (const url of urls) expect(url).toMatch(/^http:\/\/[a-z0-9.]+:4747$/);
  });
});
