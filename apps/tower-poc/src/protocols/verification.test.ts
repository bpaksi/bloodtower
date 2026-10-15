import { describe, expect, it } from "vitest";
import {
  clientMessageSchema,
  effectiveVerification,
  PROTOCOL_VERSION,
  serverMessageSchema,
  VERIFICATION_NOTES_MAX,
  type VerificationRecord,
} from "./index.ts";

const recordMessage = (payload: unknown, id: string | undefined = "v-1") => ({
  v: PROTOCOL_VERSION,
  type: "verify.record",
  ...(id ? { id } : {}),
  payload,
});

const saved = (tower: "mock" | "bluetooth", result: VerificationRecord["result"]) =>
  ({
    id: 1,
    capabilityId: "sound.play",
    result,
    notes: "",
    diagnosticSessionId: null,
    libraryVersion: "7.1.2",
    appVersion: "0.1.0",
    testedAt: 1,
    environment: { tower, client: "iPad" },
  }) satisfies VerificationRecord;

describe("verify.record", () => {
  it("accepts a pass with or without notes", () => {
    for (const notes of ["", "played"]) {
      const message = recordMessage({ capabilityId: "sound.play", result: "pass", notes });
      expect(clientMessageSchema.parse(message)).toEqual(message);
    }
  });

  it("needs notes for a partial or a fail", () => {
    for (const result of ["partial", "fail"]) {
      const bare = recordMessage({ capabilityId: "sound.play", result, notes: " \n" });
      const issues = clientMessageSchema.safeParse(bare).error?.issues ?? [];
      expect(issues.map((issue) => issue.message)).toContain(
        "Say what happened: a partial or a fail needs notes.",
      );
      const noted = recordMessage({ capabilityId: "sound.play", result, notes: "quiet" });
      expect(clientMessageSchema.safeParse(noted).success).toBe(true);
    }
  });

  it.each([
    ["no id", recordMessage({ capabilityId: "sound.play", result: "pass", notes: "" }, "")],
    ["an unknown result", recordMessage({ capabilityId: "sound.play", result: "ok", notes: "" })],
    ["no notes field", recordMessage({ capabilityId: "sound.play", result: "pass" })],
    [
      "notes too long",
      recordMessage({
        capabilityId: "sound.play",
        result: "pass",
        notes: "x".repeat(VERIFICATION_NOTES_MAX + 1),
      }),
    ],
    [
      "an extra key",
      recordMessage({ capabilityId: "sound.play", result: "pass", notes: "", sessionId: "s" }),
    ],
  ])("rejects %s", (_name, message) => {
    expect(clientMessageSchema.safeParse(message).success).toBe(false);
  });
});

describe("verify.changed", () => {
  it("carries the overlay", () => {
    const message = {
      v: PROTOCOL_VERSION,
      type: "verify.changed",
      correlationId: "v-1",
      payload: { verificationOverlay: { "sound.play": saved("bluetooth", "pass") } },
    };
    expect(serverMessageSchema.parse(message)).toEqual(message);
  });

  it("rejects a record with an unknown tower", () => {
    const record = { ...saved("mock", "pass"), environment: { tower: "web", client: "iPad" } };
    const message = {
      v: PROTOCOL_VERSION,
      type: "verify.changed",
      payload: { verificationOverlay: { "sound.play": record } },
    };
    expect(serverMessageSchema.safeParse(message).success).toBe(false);
  });
});

describe("effectiveVerification (D14)", () => {
  it("keeps the repo's claim with no result, or a result on the mock tower", () => {
    expect(effectiveVerification("untested", undefined)).toBe("untested");
    expect(effectiveVerification("mock-tested", undefined)).toBe("mock-tested");
    expect(effectiveVerification("mock-tested", saved("mock", "pass"))).toBe("mock-tested");
    expect(effectiveVerification("untested", saved("mock", "fail"))).toBe("untested");
  });

  it("takes the newest result on the real tower", () => {
    expect(effectiveVerification("untested", saved("bluetooth", "pass"))).toBe("hardware-verified");
    expect(effectiveVerification("mock-tested", saved("bluetooth", "partial"))).toBe(
      "hardware-partial",
    );
    expect(effectiveVerification("mock-tested", saved("bluetooth", "fail"))).toBe(
      "hardware-failed",
    );
  });
});
