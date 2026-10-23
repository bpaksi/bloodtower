// The form for `lighting.set` (M3 step 3.2). Its params are lists of lights, which the generated
// form cannot hold, so this lays out every light the schema names as one choice each: doorway by
// level and side, ledge by corner, base by row and side. A light left unchosen is not sent and
// stays as it is. Pure, so it is tested without React; the service's validation still decides.
import {
  baseLightLevelSchema,
  lightEffectSchema,
  towerCornerSchema,
  towerLevelSchema,
  towerSideSchema,
} from "@dark-tower/tower";

export type LightEffect = (typeof lightEffectSchema.options)[number];
export type LightGroup = "doorway" | "ledge" | "base";

export interface LightSlot {
  /** Unique within the form, for example `doorway/top/north`. */
  key: string;
  group: LightGroup;
  /** Within the group, for example "Top north". */
  label: string;
  /** The entry this slot adds to its group's list, without its style. */
  position: Record<string, unknown>;
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const LIGHT_EFFECTS: readonly LightEffect[] = lightEffectSchema.options;

/** Every light `lighting.set` can name, in the order the form shows and the command lists them. */
export const LIGHT_SLOTS: readonly LightSlot[] = [
  ...towerLevelSchema.options.flatMap((level) =>
    towerSideSchema.options.map((side) => ({
      key: `doorway/${level}/${side}`,
      group: "doorway" as const,
      label: `${capital(level)} ${side}`,
      position: { position: side, level },
    })),
  ),
  ...towerCornerSchema.options.map((corner) => ({
    key: `ledge/${corner}`,
    group: "ledge" as const,
    label: capital(corner),
    position: { position: corner },
  })),
  ...baseLightLevelSchema.options.flatMap((level) =>
    towerSideSchema.options.map((side) => ({
      key: `base/${level}/${side}`,
      group: "base" as const,
      label: `${capital(level)} ${side}`,
      position: { position: { side, level } },
    })),
  ),
];

export const GROUPS: readonly { group: LightGroup; title: string; columns: number }[] = [
  { group: "doorway", title: "Doorway", columns: towerSideSchema.options.length },
  { group: "ledge", title: "Ledge", columns: towerCornerSchema.options.length },
  { group: "base", title: "Base", columns: towerSideSchema.options.length },
];

/** The effect chosen for each slot key. A slot not listed is left as it is. */
export type LightChoices = Readonly<Record<string, LightEffect | undefined>>;

/**
 * The `lighting.set` params for the chosen lights, in slot order, with a group only when one of
 * its lights is chosen. Nothing chosen gives `{}`, which validation refuses with its own message.
 */
export const buildLightsParams = (choices: LightChoices) => {
  const params: Partial<Record<LightGroup, Record<string, unknown>[]>> = {};
  for (const slot of LIGHT_SLOTS) {
    const style = choices[slot.key];
    if (style === undefined) continue;
    params[slot.group] ??= [];
    params[slot.group]?.push({ ...slot.position, style });
  }
  return params;
};

const GROUP_TITLES = Object.fromEntries(GROUPS.map(({ group, title }) => [group, title]));

/** The slot key of one light in a `lighting.set` list, or undefined for anything else. */
const slotKeyOf = (group: LightGroup, light: Record<string, unknown>) => {
  const { position, level } = light;
  if (group === "ledge") return `ledge/${String(position)}`;
  if (group === "doorway") return `doorway/${String(level)}/${String(position)}`;
  if (typeof position !== "object" || position === null) return undefined;
  const base = position as Record<string, unknown>;
  return `base/${String(base.level)}/${String(base.side)}`;
};

/**
 * What was asked for, as the person reads it: "Doorway top north on, Ledge northeast breathe",
 * in slot order. Read from the params sent, so it names exactly what reached the service.
 */
export const describeLights = (params: unknown) => {
  if (typeof params !== "object" || params === null) return "";
  const styles = new Map<string, unknown>();
  for (const [group, lights] of Object.entries(params)) {
    if (!GROUP_TITLES[group] || !Array.isArray(lights)) continue;
    for (const light of lights as Record<string, unknown>[]) {
      const key = slotKeyOf(group as LightGroup, light);
      if (key) styles.set(key, light.style);
    }
  }
  return LIGHT_SLOTS.flatMap((slot) =>
    styles.has(slot.key)
      ? [`${GROUP_TITLES[slot.group]} ${slot.label.toLowerCase()} ${String(styles.get(slot.key))}`]
      : [],
  ).join(", ");
};
