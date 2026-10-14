import { clientMessageSchema } from "burgomaster-funeral-poc-protocols";
import { describe, expect, it } from "vitest";
import {
  deviceFormFactor,
  helloDashboard,
  helloDevice,
  holdMessage,
  pickMessage,
  socketUrl,
  startMessage,
} from "./messages.ts";

describe("socketUrl", () => {
  it("uses the page host so a phone on the Wi-Fi reaches the same server", () => {
    expect(socketUrl({ protocol: "http:", host: "192.168.1.20:4767" })).toBe(
      "ws://192.168.1.20:4767/ws",
    );
    expect(socketUrl({ protocol: "https:", host: "play.example" })).toBe("wss://play.example/ws");
  });
});

describe("messages", () => {
  it("matches the protocol for hello, hold, start and a pick", () => {
    expect(clientMessageSchema.safeParse(helloDashboard()).success).toBe(true);
    expect(clientMessageSchema.safeParse(helloDevice("ipad", "123456")).success).toBe(true);
    expect(
      clientMessageSchema.safeParse(helloDevice("phone", undefined, "a".repeat(16))).success,
    ).toBe(true);
    expect(clientMessageSchema.safeParse(holdMessage("device-1", "agnes", "take")).success).toBe(
      true,
    );
    expect(clientMessageSchema.safeParse(startMessage()).success).toBe(true);
    expect(clientMessageSchema.safeParse(pickMessage("agnes", "examine-body")).success).toBe(true);
  });
});

describe("deviceFormFactor", () => {
  it("treats a narrow window as a phone", () => {
    expect(deviceFormFactor(390)).toBe("phone");
    expect(deviceFormFactor(820)).toBe("ipad");
  });
});
