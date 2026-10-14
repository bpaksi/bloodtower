import { z } from "zod";
import {
  availabilitySchema,
  type Capability,
  capabilityCategorySchema,
  capabilityKindSchema,
  isCommandable,
  uiLocationSchema,
  verificationSchema,
} from "./inventory.ts";

/**
 * One inventory entry as the service sends it in `welcome`: everything but the `params` schema,
 * which is code and cannot travel as JSON. A client validates and builds forms with the schemas
 * compiled into it from this same package; the list from the service says what that service
 * offers, so a UI built from another version of the repo shows the service's truth.
 */
export const inventoryEntrySchema = z.strictObject({
  id: z.string().min(1).max(64),
  title: z.string().min(1),
  kind: capabilityKindSchema,
  category: capabilityCategorySchema,
  apiMapping: z.array(z.string().min(1)),
  availability: availabilitySchema,
  uiLocation: uiLocationSchema.nullable(),
  verification: verificationSchema,
  evidence: z.string(),
  /** `isCommandable`: whether a `command` may name it. */
  commandable: z.boolean(),
});
export type InventoryEntry = z.infer<typeof inventoryEntrySchema>;

export const toInventoryEntry = (capability: Capability): InventoryEntry => ({
  id: capability.id,
  title: capability.title,
  kind: capability.kind,
  category: capability.category,
  apiMapping: [...capability.apiMapping],
  availability: capability.availability,
  uiLocation: capability.uiLocation,
  verification: capability.verification,
  evidence: capability.evidence,
  commandable: isCommandable(capability),
});
