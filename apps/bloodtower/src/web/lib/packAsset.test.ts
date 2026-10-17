import { afterEach, describe, expect, it } from "vitest";
import { packStillImageUrl } from "./packAsset.ts";

describe("packStillImageUrl", () => {
  const prior = process.env.NEXT_PUBLIC_WS_URL;

  afterEach(() => {
    if (prior === undefined) delete process.env.NEXT_PUBLIC_WS_URL;
    else process.env.NEXT_PUBLIC_WS_URL = prior;
  });

  it("uses a relative path when no ws url is configured", () => {
    delete process.env.NEXT_PUBLIC_WS_URL;
    expect(packStillImageUrl("fx.hall")).toBe("/packs/test/asset/fx.hall");
  });

  it("maps NEXT_PUBLIC_WS_URL to the session host http origin", () => {
    process.env.NEXT_PUBLIC_WS_URL = "ws://127.0.0.1:4787/ws";
    expect(packStillImageUrl("fx.stair")).toBe("http://127.0.0.1:4787/packs/test/asset/fx.stair");
  });
});
