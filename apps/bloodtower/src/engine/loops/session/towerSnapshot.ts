import { z } from "zod";

export const towerSnapshotSchema = z.object({
  connection: z.enum(["unavailable", "disconnected", "connecting", "connected"]),
  calibrated: z.union([
    z.object({ state: z.literal("unavailable") }),
    z.object({ state: z.literal("known"), calibrated: z.boolean() }),
  ]),
});
