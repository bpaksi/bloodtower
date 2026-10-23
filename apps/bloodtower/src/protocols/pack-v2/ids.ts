import { z } from "zod";

const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export const idSchema = z.string().regex(KEBAB);

export const semverSchema = z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);

export const kingdomIdSchema = z.enum(["N", "E", "S", "W"]);

export const heroIdSchema = z.string().regex(KEBAB);

export const spaceIdSchema = z.string().regex(/^[NESW]-[a-z0-9]+(?:-[a-z0-9]+)*$/, {
  message: "P2-1: a space id is {kingdom}-{slug} (DEC-225).",
});

export const assetIdSchema = z
  .string()
  .refine(
    (value) =>
      /^[a-z0-9][a-z0-9._@-]*$/.test(value) &&
      !value.includes("..") &&
      !value.includes("/") &&
      !value.includes("\\"),
    { message: "P2-2: an asset id is a manifest id, not a path." },
  );

export const terrainSchema = z.enum([
  "desert",
  "hills",
  "mountains",
  "lake",
  "forest",
  "grasslands",
]);

export const buildingTypeIdSchema = z.enum(["citadel", "sanctuary", "village", "bazaar"]);

export const heroRoleSchema = z.enum([
  "fighter",
  "healer",
  "magic-user",
  "scout",
  "ranger",
  "scholar",
]);

export const questTypeIdSchema = z.enum([
  "tomb",
  "cave",
  "encampment",
  "fortress",
  "ruins",
  "shrine",
]);
