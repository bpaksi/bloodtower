import { describe, expect, it } from "vitest";
import {
  CLIENT_MESSAGE_TYPES,
  clientMessageSchema,
  PROTOCOL_VERSION,
  serverMessageSchema,
} from "./index.ts";

const hello = { v: PROTOCOL_VERSION, type: "hello", payload: { clientLabel: "iPad" } };

const welcome = {
  v: PROTOCOL_VERSION,
  type: "welcome",
  correlationId: "m-1",
  payload: {
    clientId: "c-1",
    versions: { protocol: PROTOCOL_VERSION, server: "0.0.0", node: "v24.4.1" },
  },
};

describe("clientMessageSchema", () => {
  it("accepts hello", () => {
    expect(clientMessageSchema.parse(hello)).toEqual(hello);
  });

  it("rejects hello with an empty or missing clientLabel", () => {
    expect(clientMessageSchema.safeParse({ ...hello, payload: { clientLabel: "" } }).success).toBe(
      false,
    );
    expect(clientMessageSchema.safeParse({ ...hello, payload: {} }).success).toBe(false);
  });

  it("rejects extra payload keys", () => {
    const extra = { ...hello, payload: { clientLabel: "iPad", bytes: "0a0b" } };
    expect(clientMessageSchema.safeParse(extra).success).toBe(false);
  });

  it("rejects server-only and unknown types", () => {
    expect(clientMessageSchema.safeParse(welcome).success).toBe(false);
    expect(clientMessageSchema.safeParse({ ...hello, type: "raw" }).success).toBe(false);
  });

  it("lists the client message types", () => {
    expect(CLIENT_MESSAGE_TYPES).toEqual(["hello"]);
  });
});

describe("serverMessageSchema", () => {
  it("accepts welcome", () => {
    expect(serverMessageSchema.parse(welcome)).toEqual(welcome);
  });

  it("accepts error with and without actionable text", () => {
    const error = {
      v: PROTOCOL_VERSION,
      type: "error",
      payload: { code: "invalid-json", message: "Message is not valid JSON." },
    };
    expect(serverMessageSchema.safeParse(error).success).toBe(true);
    const withAction = { ...error, payload: { ...error.payload, actionable: "Send JSON." } };
    expect(serverMessageSchema.safeParse(withAction).success).toBe(true);
  });

  it("rejects an unknown error code", () => {
    const error = { v: PROTOCOL_VERSION, type: "error", payload: { code: "nope", message: "x" } };
    expect(serverMessageSchema.safeParse(error).success).toBe(false);
  });
});
