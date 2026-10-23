import { deviceStatePayloadSchema } from "bloodtower-protocols";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DeviceScreen } from "../device/DeviceScreen.tsx";
import { DeviceErrorBanner, liveDeviceBanner } from "./DeviceErrorBanner.tsx";
import { MIST_COPY, MistCard } from "./MistCard.tsx";

const waiting = deviceStatePayloadSchema.parse({
  screen: "splash",
  heldHunters: [],
  views: [],
  prompt: null,
  lock: null,
  won: null,
});

const tower = {
  connection: "unavailable" as const,
  battery: { state: "unavailable" as const },
  calibrated: { state: "unavailable" as const },
};

describe("mist card", () => {
  it("shows the error code and one Reload button, and does not reload by itself", () => {
    let reloads = 0;
    const html = renderToStaticMarkup(
      createElement(MistCard, {
        code: "page-error",
        onReload: () => {
          reloads += 1;
        },
      }),
    );
    expect(reloads).toBe(0);
    expect(html).toContain(MIST_COPY);
    expect(html).toContain("page-error");
    expect(html).toContain("Reload");
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain('data-presentation="mist"');
  });
});

describe("LiveDevice banner", () => {
  it("shows a control-adjacent banner with the error code and not the mist card", () => {
    const banner = liveDeviceBanner({
      code: "invalid-state",
      message: "That press was not accepted.",
    });
    expect(banner).toEqual({
      code: "invalid-state",
      message: "That press was not accepted.",
    });
    const alone = renderToStaticMarkup(createElement(DeviceErrorBanner, banner));
    expect(alone).toContain("invalid-state");
    expect(alone).toContain("That press was not accepted.");
    expect(alone).not.toContain(MIST_COPY);
    expect(alone).not.toContain("<button");
    expect(alone).toContain('data-presentation="banner"');

    const page = renderToStaticMarkup(
      createElement(DeviceScreen, {
        live: true,
        deviceId: "device-1",
        state: waiting,
        pausePromptId: null,
        connectLock: null,
        calibrateLock: null,
        tower,
        errorBanner: banner,
      }),
    );
    expect(page).toContain('data-presentation="banner"');
    expect(page).toContain("invalid-state");
    expect(page).toContain('data-layout="ipad"');
    expect(page).not.toContain(MIST_COPY);
  });
});
