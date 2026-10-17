import { afterEach, describe, expect, it, vi } from "vitest";
import { packStillImageUrl } from "./packAsset.ts";

const devPage = (hostname: string) => ({
  protocol: "http:",
  host: `${hostname}:3000`,
  hostname,
});

describe("packStillImageUrl", () => {
  const prior = process.env.NEXT_PUBLIC_WS_URL;

  afterEach(() => {
    if (prior === undefined) delete process.env.NEXT_PUBLIC_WS_URL;
    else process.env.NEXT_PUBLIC_WS_URL = prior;
    vi.unstubAllGlobals();
  });

  it("dev without env: points at the session host on :4787", () => {
    delete process.env.NEXT_PUBLIC_WS_URL;
    vi.stubGlobal("window", { location: devPage("localhost") });
    expect(packStillImageUrl("fx.hall")).toBe("http://localhost:4787/packs/test/asset/fx.hall");
  });

  it("dev without env on the LAN: uses the page hostname and session port", () => {
    delete process.env.NEXT_PUBLIC_WS_URL;
    vi.stubGlobal("window", { location: devPage("192.168.1.22") });
    expect(packStillImageUrl("fx.stair")).toBe(
      "http://192.168.1.22:4787/packs/test/asset/fx.stair",
    );
  });

  it("uses a relative path when no ws url is configured and the page is not on :3000", () => {
    delete process.env.NEXT_PUBLIC_WS_URL;
    expect(packStillImageUrl("fx.hall")).toBe("/packs/test/asset/fx.hall");
  });

  it("maps NEXT_PUBLIC_WS_URL to the session host http origin on the server", () => {
    process.env.NEXT_PUBLIC_WS_URL = "ws://127.0.0.1:4787/ws";
    expect(packStillImageUrl("fx.stair")).toBe("http://127.0.0.1:4787/packs/test/asset/fx.stair");
  });

  it("LAN with env: swaps loopback for the page hostname", () => {
    process.env.NEXT_PUBLIC_WS_URL = "ws://127.0.0.1:4787/ws";
    vi.stubGlobal("window", { location: devPage("192.168.1.22") });
    expect(packStillImageUrl("fx.stair")).toBe(
      "http://192.168.1.22:4787/packs/test/asset/fx.stair",
    );
  });

  it("honors the pack id", () => {
    delete process.env.NEXT_PUBLIC_WS_URL;
    expect(packStillImageUrl("fx.hall", "second")).toBe("/packs/second/asset/fx.hall");
  });
});
