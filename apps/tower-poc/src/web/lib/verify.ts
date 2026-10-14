// Verify mode (M3 step 3.6): what each page asks to be verified, in short chunks, and the counts
// the Dashboard's capability summary shows. Pure, so it is tested without React.
import {
  type Availability,
  type CapabilityCategory,
  EFFECTIVE_VERIFICATIONS,
  type EffectiveVerification,
  effectiveVerification,
  type InventoryEntry,
  type UiLocation,
  type VerificationOverlay,
  type VerificationResult,
} from "tower-poc-protocols";

export const RESULT_LABELS: Record<VerificationResult, string> = {
  pass: "Pass",
  partial: "Partial",
  fail: "Fail",
};

export const VERIFICATION_LABELS: Record<EffectiveVerification, string> = {
  untested: "Untested",
  "mock-tested": "Mock-tested",
  "hardware-verified": "Hardware-verified",
  "hardware-partial": "Partial on hardware",
  "hardware-failed": "Failed on hardware",
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  available: "Available",
  "requires-calibration": "Needs calibration",
  "not-exposed": "Not exposed",
  unsupported: "Unsupported",
};

const CATEGORY_LABELS: Record<CapabilityCategory, string> = {
  connection: "Connection",
  calibration: "Calibration",
  lighting: "Lights",
  sound: "Sounds",
  mechanics: "Mechanics",
  glyphs: "Glyphs",
  seals: "Seals",
  skulls: "Skulls",
  battery: "Battery",
  state: "Tower state",
  diagnostics: "Diagnostics",
};

/**
 * The pages with a Verify checklist: the five control pages. The Diagnostics page's capabilities
 * are verified once it is built (M4).
 */
export const VERIFY_LOCATIONS: readonly UiLocation[] = [
  "dashboard",
  "lights",
  "sounds",
  "mechanics",
  "tower-state",
];

/** One short, self-contained part of a page's Verify pass: the capabilities of one category. */
export interface VerifyChunk {
  category: CapabilityCategory;
  title: string;
  entries: InventoryEntry[];
  /** How many of them have a result recorded against the tower the service drives. */
  recorded: number;
}

/**
 * The capabilities a page shows, in inventory order, split by category so the pass can stop after
 * any chunk and pick up at the next (Bob, 2026-10-14: no long sessions on the tower).
 */
export const verifyChunks = (
  inventory: readonly InventoryEntry[],
  overlay: VerificationOverlay,
  location: UiLocation,
): VerifyChunk[] => {
  const chunks: VerifyChunk[] = [];
  for (const entry of inventory) {
    if (entry.uiLocation !== location) continue;
    let chunk = chunks.find((candidate) => candidate.category === entry.category);
    if (!chunk) {
      chunk = {
        category: entry.category,
        title: CATEGORY_LABELS[entry.category],
        entries: [],
        recorded: 0,
      };
      chunks.push(chunk);
    }
    chunk.entries.push(entry);
    if (overlay[entry.id]) chunk.recorded += 1;
  }
  return chunks;
};

export interface CapabilitySummary {
  total: number;
  byAvailability: Record<Availability, number>;
  byVerification: Record<EffectiveVerification, number>;
  /** Capabilities on a page with a Verify checklist, and how many of them have a result. */
  toVerify: number;
  recorded: number;
}

/** Counts for the Dashboard (spec §5): every inventory entry, by availability and verification. */
export const capabilitySummary = (
  inventory: readonly InventoryEntry[],
  overlay: VerificationOverlay,
): CapabilitySummary => {
  const byAvailability = Object.fromEntries(
    Object.keys(AVAILABILITY_LABELS).map((key) => [key, 0]),
  ) as Record<Availability, number>;
  const byVerification = Object.fromEntries(
    EFFECTIVE_VERIFICATIONS.map((key) => [key, 0]),
  ) as Record<EffectiveVerification, number>;
  let toVerify = 0;
  let recorded = 0;
  for (const entry of inventory) {
    byAvailability[entry.availability] += 1;
    byVerification[effectiveVerification(entry.verification, overlay[entry.id])] += 1;
    if (entry.uiLocation !== null && VERIFY_LOCATIONS.includes(entry.uiLocation)) {
      toVerify += 1;
      if (overlay[entry.id]) recorded += 1;
    }
  }
  return { total: inventory.length, byAvailability, byVerification, toVerify, recorded };
};
