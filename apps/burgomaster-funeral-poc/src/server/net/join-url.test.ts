import { describe, expect, it } from "vitest";
import { advertiseHost, joinUrl } from "./join-url.ts";

describe("advertiseHost", () => {
  it("keeps a bound address and otherwise uses a LAN address", () => {
    const lan = [{ address: "10.0.0.8", family: "IPv4", internal: false }];
    expect(advertiseHost("127.0.0.1", lan)).toBe("127.0.0.1");
    expect(advertiseHost("0.0.0.0", lan)).toBe("10.0.0.8");
    expect(advertiseHost("0.0.0.0", [])).toBe("127.0.0.1");
  });
});

describe("joinUrl", () => {
  it("points at the join page and the numeric code", () => {
    expect(joinUrl("192.168.1.20", 4767, "004821")).toBe(
      "http://192.168.1.20:4767/join?code=004821",
    );
  });
});
