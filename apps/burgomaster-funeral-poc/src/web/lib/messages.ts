import { type HunterId, PROTOCOL_VERSION } from "burgomaster-funeral-poc-protocols";

/** WebSocket URL for the page that served this client. The host and the UI share one origin. */
export const socketUrl = (page: { protocol: string; host: string }): string =>
  `${page.protocol === "https:" ? "wss" : "ws"}://${page.host}/ws`;

export const helloDashboard = () =>
  ({
    v: PROTOCOL_VERSION,
    type: "hello",
    payload: { role: "dashboard", clientLabel: "dashboard", formFactor: "mac" },
  }) as const;

export const helloDevice = (formFactor: "ipad" | "phone", joinCode?: string, token?: string) =>
  ({
    v: PROTOCOL_VERSION,
    type: "hello",
    payload: {
      role: "device",
      clientLabel: formFactor,
      formFactor,
      ...(joinCode ? { joinCode } : {}),
      ...(token ? { token } : {}),
    },
  }) as const;

export const holdMessage = (deviceId: string, hunter: HunterId, action: "take" | "release") =>
  ({
    v: PROTOCOL_VERSION,
    type: "hold",
    payload: { deviceId, hunter, action, by: "device" },
  }) as const;

export const startMessage = () =>
  ({
    v: PROTOCOL_VERSION,
    type: "start",
    payload: {},
  }) as const;

export const pickMessage = (hunter: HunterId, action: string) =>
  ({
    v: PROTOCOL_VERSION,
    type: "investigationPick",
    payload: { hunter, action },
  }) as const;

/** A phone-width viewport uses the phone form. Wider layouts, including an iPad, use ipad. */
export const deviceFormFactor = (width: number): "ipad" | "phone" =>
  width <= 700 ? "phone" : "ipad";
