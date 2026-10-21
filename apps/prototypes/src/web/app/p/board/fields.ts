import type { TuningField } from "../../../lib/tuning.ts";

export const FIELDS: TuningField[] = [
  {
    key: "minTextPx",
    label: "Minimum text size (design px at 1920 wide)",
    type: "number",
    default: 28,
    min: 8,
    step: 1,
    note: "P-01: 28 px at 1080p, 56 px at 4K. Every size is raised to this.",
  },
  { key: "bodyPx", label: "Body text", type: "number", default: 32, min: 8, note: "invented" },
  {
    key: "headingPx",
    label: "Heading text",
    type: "number",
    default: 44,
    min: 8,
    note: "invented",
  },
  { key: "bigPx", label: "Big text", type: "number", default: 64, min: 8, note: "invented" },
];
