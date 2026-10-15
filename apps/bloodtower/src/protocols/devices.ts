import { z } from "zod";

/**
 * Device and holding types for R1.
 * Hunter ids come from the loaded pack. This module does not name a story's cast.
 * A client message does not carry the device id: the server takes it from the socket.
 */

export const hunterIdSchema = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
export type HunterId = z.infer<typeof hunterIdSchema>;

export const deviceIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
export type DeviceId = z.infer<typeof deviceIdSchema>;

/** Opaque rejoin token. The story board never receives one it can use as a device. */
export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/);

/** Six digits, shown under the QR (R-WIZ-10). */
export const joinCodeSchema = z.string().regex(/^\d{6}$/);

export const FORM_FACTORS = ["mac", "ipad", "phone"] as const;
export const formFactorSchema = z.enum(FORM_FACTORS);
export type FormFactor = z.infer<typeof formFactorSchema>;

export const ROLES = ["storyboard", "device"] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

/** UTC, so a timing report does not depend on a local zone. */
export const utcTimestampSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Expected a UTC timestamp.",
  });

const uniqueHunters = (hunters: string[], ctx: z.RefinementCtx) => {
  if (new Set(hunters).size !== hunters.length) {
    ctx.addIssue({ code: "custom", message: "A hunter is listed twice." });
  }
};

/** One device holding one hunter. Holdings change only from a joined device. */
export const holdingSchema = z.strictObject({
  deviceId: deviceIdSchema,
  hunter: hunterIdSchema,
});
export type Holding = z.infer<typeof holdingSchema>;

/** A joined iPad or phone. The story board is not a holding device. */
export const deviceRecordSchema = z
  .strictObject({
    deviceId: deviceIdSchema,
    formFactor: z.enum(["ipad", "phone"]),
    connected: z.boolean(),
    heldHunters: z.array(hunterIdSchema).max(16),
  })
  .superRefine((value, ctx) => uniqueHunters(value.heldHunters, ctx));
export type DeviceRecord = z.infer<typeof deviceRecordSchema>;
