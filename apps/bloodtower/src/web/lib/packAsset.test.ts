import { afterEach, describe, expect, it, vi } from "vitest";
import { packStillImageUrl, placeStillFile } from "./packAsset.ts";

describe("placeStillFile", () => {
  it("maps a place still id to its file under assets/", () => {
    expect(placeStillFile("place.village")).toBe("place-village.jpg");
    expect(placeStillFile("place.sanctuary")).toBe("place-sanctuary.jpg");
  });
});

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
    expect(packStillImageUrl("fx-hall.png")).toBe(
      "http://localhost:4787/packs/test/assets/fx-hall.png",
    );
  });

  it("dev without env on the LAN: uses the page hostname and session port", () => {
    delete process.env.NEXT_PUBLIC_WS_URL;
    vi.stubGlobal("window", { location: devPage("192.168.1.22") });
    expect(packStillImageUrl("fx-stair.png")).toBe(
      "http://192.168.1.22:4787/packs/test/assets/fx-stair.png",
    );
  });

  it("uses a relative path when no ws url is configured and the page is not on :3000", () => {
    delete process.env.NEXT_PUBLIC_WS_URL;
    expect(packStillImageUrl("fx-hall.png")).toBe("/packs/test/assets/fx-hall.png");
  });

  it("maps NEXT_PUBLIC_WS_URL to the session host http origin on the server", () => {
    process.env.NEXT_PUBLIC_WS_URL = "ws://127.0.0.1:4787/ws";
    expect(packStillImageUrl("fx-stair.png")).toBe(
      "http://127.0.0.1:4787/packs/test/assets/fx-stair.png",
    );
  });

  it("LAN with env: swaps loopback for the page hostname", () => {
    process.env.NEXT_PUBLIC_WS_URL = "ws://127.0.0.1:4787/ws";
    vi.stubGlobal("window", { location: devPage("192.168.1.22") });
    expect(packStillImageUrl("fx-stair.png")).toBe(
      "http://192.168.1.22:4787/packs/test/assets/fx-stair.png",
    );
  });

  it("honors the pack id", () => {
    delete process.env.NEXT_PUBLIC_WS_URL;
    expect(packStillImageUrl("fx-hall.png", "second")).toBe("/packs/second/assets/fx-hall.png");
  });
});
