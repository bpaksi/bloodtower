import { describe, expect, it } from "vitest";
import { serverAssetOrigin } from "./serverOrigin";

const devPage = (hostname: string) => ({
  protocol: "http:",
  host: `${hostname}:3000`,
  hostname,
});

describe("serverAssetOrigin", () => {
  it("dev without env: localhost page on :3000 uses the session host port", () => {
    expect(serverAssetOrigin(devPage("localhost"), undefined)).toBe("http://localhost:4787");
    expect(serverAssetOrigin(devPage("127.0.0.1"), undefined)).toBe("http://127.0.0.1:4787");
  });

  it("dev without env: a LAN page on :3000 uses that host and the session port", () => {
    expect(serverAssetOrigin(devPage("192.168.1.22"), undefined)).toBe("http://192.168.1.22:4787");
  });

  it("without env on another port: same origin, so the path stays relative", () => {
    expect(
      serverAssetOrigin({ protocol: "https:", host: "play.example", hostname: "play.example" }),
    ).toBe("");
    expect(
      serverAssetOrigin(
        { protocol: "http:", host: "127.0.0.1:4787", hostname: "127.0.0.1" },
        undefined,
      ),
    ).toBe("");
  });

  it("dev with env: the configured loopback host, with the server port", () => {
    expect(serverAssetOrigin(devPage("localhost"), "ws://127.0.0.1:4787/ws")).toBe(
      "http://127.0.0.1:4787",
    );
  });

  it("LAN with env: a page on the LAN host reaches the server on that host, not loopback", () => {
    expect(serverAssetOrigin(devPage("192.168.1.22"), "ws://127.0.0.1:4787/ws")).toBe(
      "http://192.168.1.22:4787",
    );
  });

  it("keeps a configured non-loopback host and maps wss to https", () => {
    expect(serverAssetOrigin(devPage("192.168.1.22"), "wss://play.example/ws")).toBe(
      "https://play.example",
    );
  });

  it("treats blank env like unset", () => {
    expect(serverAssetOrigin(devPage("localhost"), "  ")).toBe("http://localhost:4787");
  });

  it("is empty for a value that is not a url", () => {
    expect(serverAssetOrigin(undefined, "not a url")).toBe("");
  });
});
