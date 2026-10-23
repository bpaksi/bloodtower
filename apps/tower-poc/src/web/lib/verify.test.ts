import {
  inventory,
  toInventoryEntry,
  type VerificationOverlay,
  type VerificationRecord,
} from "@dark-tower/tower";
import { describe, expect, it } from "vitest";
import { capabilitySummary, verifyChunks, verifyStatusLabel } from "./verify.ts";

const entries = inventory.map(toInventoryEntry);

const saved = (
  capabilityId: string,
  tower: "mock" | "bluetooth",
  result: VerificationRecord["result"] = "pass",
): VerificationRecord => ({
  id: 1,
  capabilityId,
  result,
  notes: "",
  diagnosticSessionId: null,
  libraryVersion: "7.1.2",
  appVersion: "0.1.0",
  testedAt: 1,
  environment: { tower, client: "iPad" },
});

describe("verifyChunks", () => {
  it("splits a page's capabilities by category, in inventory order", () => {
    const chunks = verifyChunks(entries, {}, "dashboard");
    expect(chunks.map((chunk) => chunk.title)).toEqual(["Connection", "Calibration"]);
    expect(chunks[1]?.entries.map((entry) => entry.id)).toEqual([
      "calibration.calibrate",
      "calibration.on-complete",
      "calibration.calibrated",
      "calibration.in-progress",
    ]);
    expect(verifyChunks(entries, {}, "tower-state").map((chunk) => chunk.title)).toEqual([
      "Glyphs",
      "Seals",
      "Skulls",
      "Battery",
      "Tower state",
    ]);
  });

  it("covers every capability the app shows on a page, and nothing it does not", () => {
    const lights = verifyChunks(entries, {}, "lights").flatMap((chunk) => chunk.entries);
    expect(lights.map((entry) => entry.id)).toEqual(
      entries.filter((entry) => entry.uiLocation === "lights").map((entry) => entry.id),
    );
    const mechanics = verifyChunks(entries, {}, "mechanics").flatMap((chunk) => chunk.entries);
    expect(mechanics.map((entry) => entry.id)).not.toContain("mechanics.rotate");
    expect(mechanics.map((entry) => entry.id)).not.toContain("mechanics.unjam-drums");
  });

  it("counts what has a result, whatever the result", () => {
    const overlay: VerificationOverlay = {
      "sound.play": saved("sound.play", "bluetooth", "fail"),
    };
    expect(verifyChunks(entries, overlay, "sounds")).toEqual([
      expect.objectContaining({ title: "Sounds", recorded: 1 }),
    ]);
  });
});

describe("capabilitySummary", () => {
  it("counts every entry by availability and by verification", () => {
    const summary = capabilitySummary(entries, {});
    expect(summary.total).toBe(entries.length);
    const sum = (counts: Record<string, number>) =>
      Object.values(counts).reduce((total, count) => total + count, 0);
    expect(sum(summary.byAvailability)).toBe(entries.length);
    expect(sum(summary.byVerification)).toBe(entries.length);
    expect(summary.byAvailability.unsupported).toBe(
      entries.filter((entry) => entry.availability === "unsupported").length,
    );
    expect(summary.byVerification["mock-tested"]).toBe(
      entries.filter((entry) => entry.verification === "mock-tested").length,
    );
    expect(summary.byVerification["hardware-verified"]).toBe(0);
    // Every capability on the five control pages. Diagnostics waits for M4. The timing page
    // keeps its own notes and is not a Verify checklist.
    expect(summary.toVerify).toBe(
      entries.filter(
        (entry) =>
          entry.uiLocation !== null &&
          entry.uiLocation !== "diagnostics" &&
          entry.uiLocation !== "timing",
      ).length,
    );
    expect(summary.recorded).toBe(0);
  });

  it("moves a capability to its hardware result, and leaves a mock result out", () => {
    const before = capabilitySummary(entries, {});
    const after = capabilitySummary(entries, {
      "sound.play": saved("sound.play", "bluetooth", "pass"),
      "lighting.all-on": saved("lighting.all-on", "bluetooth", "partial"),
      "lighting.all-off": saved("lighting.all-off", "mock", "fail"),
    });
    expect(after.byVerification["hardware-verified"]).toBe(1);
    expect(after.byVerification["hardware-partial"]).toBe(1);
    expect(after.byVerification["hardware-failed"]).toBe(0);
    expect(after.byVerification["mock-tested"]).toBe(before.byVerification["mock-tested"] - 2);
    expect(after.recorded).toBe(3);
  });
});

describe("verifyStatusLabel", () => {
  const entry = entries.find((candidate) => candidate.id === "lighting.all-on");
  if (!entry) throw new Error("lighting.all-on is in the inventory");

  it("reads the newest result while the service is reachable", () => {
    expect(verifyStatusLabel(entry, undefined, true)).toBe("Mock-tested");
    expect(verifyStatusLabel(entry, saved("lighting.all-on", "bluetooth"), true)).toBe(
      "Hardware-verified",
    );
  });

  it("is unavailable while the service is out of reach, never the inventory's own claim", () => {
    expect(verifyStatusLabel(entry, undefined, false)).toBe("Unavailable");
  });
});
