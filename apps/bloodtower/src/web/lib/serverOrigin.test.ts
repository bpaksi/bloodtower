import { describe, expect, it } from "vitest";
import { serverAssetOrigin } from "./serverOrigin";

describe("serverAssetOrigin", () => {
  it("dev: the configured loopback host, with the server port", () => {
    expect(serverAssetOrigin({ hostname: "localhost" }, "ws://127.0.0.1:4787/ws")).toBe(
      "http://127.0.0.1:4787",
    );
  });

  it("LAN: a page on the LAN host reaches the server on that host, not the iPad's loopback", () => {
    expect(serverAssetOrigin({ hostname: "192.168.1.22" }, "ws://127.0.0.1:4787/ws")).toBe(
      "http://192.168.1.22:4787",
    );
  });

  it("keeps a configured non-loopback host and maps wss to https", () => {
    expect(serverAssetOrigin({ hostname: "192.168.1.22" }, "wss://play.example/ws")).toBe(
      "https://play.example",
    );
  });

  it("production: unset means same origin, so the path stays relative", () => {
    expect(serverAssetOrigin({ hostname: "play.example" }, undefined)).toBe("");
    expect(serverAssetOrigin({ hostname: "play.example" }, "  ")).toBe("");
  });

  it("is empty for a value that is not a url", () => {
    expect(serverAssetOrigin(undefined, "not a url")).toBe("");
  });
});
