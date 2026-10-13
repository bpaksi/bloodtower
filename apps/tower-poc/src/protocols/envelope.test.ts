import { describe, expect, it } from "vitest";
import { envelopeSchema, PROTOCOL_VERSION } from "./index.ts";

const valid = { v: PROTOCOL_VERSION, type: "hello", payload: { clientLabel: "iPad" } };

describe("envelopeSchema", () => {
  it("accepts a minimal envelope", () => {
    expect(envelopeSchema.parse(valid)).toEqual(valid);
  });

  it("accepts optional id and correlationId", () => {
    const withIds = { ...valid, id: "m-1", correlationId: "c-1" };
    expect(envelopeSchema.parse(withIds)).toEqual(withIds);
  });

  it("accepts any payload value, including null", () => {
    expect(envelopeSchema.safeParse({ ...valid, payload: null }).success).toBe(true);
  });

  it("rejects an envelope with no payload key", () => {
    const { payload: _payload, ...noPayload } = valid;
    expect(envelopeSchema.safeParse(noPayload).success).toBe(false);
  });

  it("rejects an unsupported protocol version", () => {
    expect(envelopeSchema.safeParse({ ...valid, v: 2 }).success).toBe(false);
  });

  it("rejects an empty type", () => {
    expect(envelopeSchema.safeParse({ ...valid, type: "" }).success).toBe(false);
  });

  it("rejects empty ids", () => {
    expect(envelopeSchema.safeParse({ ...valid, id: "" }).success).toBe(false);
    expect(envelopeSchema.safeParse({ ...valid, correlationId: "" }).success).toBe(false);
  });

  it("rejects unknown top-level keys", () => {
    expect(envelopeSchema.safeParse({ ...valid, bytes: "0a0b" }).success).toBe(false);
  });
});
