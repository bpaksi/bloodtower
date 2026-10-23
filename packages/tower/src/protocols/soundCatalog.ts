import { TOWER_AUDIO_LIBRARY } from "ultimatedarktowerdata";
import { SOUND_COUNT } from "./inventory.ts";

/**
 * The tower's sound catalog for the Sounds page (M3 step 3.3), read from `ultimatedarktowerdata`
 * like the inventory's sound range. One entry per index the schema accepts, 1..SOUND_COUNT in
 * order. An index the data does not name, or names with an empty string, is still listed, as
 * "Sound <index>", so every sound the tower can be asked for can be played.
 */
export interface Sound {
  /** 1-based, as `playSound` takes it. */
  index: number;
  name: string;
  /** The data's category, such as "Adversary" or "Battle", or undefined when it has none. */
  category: string | undefined;
}

/** One entry of the data's audio library, read loosely: a data update may leave a field out. */
interface AudioEntry {
  value?: unknown;
  name?: unknown;
  category?: unknown;
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** The catalog for indexes 1..count from an audio library. Exported for the tests. */
export const buildSoundCatalog = (library: Record<string, AudioEntry>, count: number): Sound[] => {
  const byIndex = new Map(Object.values(library).map((entry) => [entry.value, entry]));
  return Array.from({ length: count }, (_, i) => {
    const index = i + 1;
    const entry = byIndex.get(index);
    return {
      index,
      name: text(entry?.name) || `Sound ${index}`,
      category: text(entry?.category) || undefined,
    };
  });
};

export const SOUND_CATALOG: readonly Sound[] = buildSoundCatalog(TOWER_AUDIO_LIBRARY, SOUND_COUNT);

/** The categories in the order the catalog first uses them. */
export const SOUND_CATEGORIES: readonly string[] = [
  ...new Set(SOUND_CATALOG.flatMap((sound) => (sound.category ? [sound.category] : []))),
];

/** The name shown for a sound: the catalog's, or "Sound <index>" for one it does not list. */
export const soundName = (index: number) => SOUND_CATALOG[index - 1]?.name ?? `Sound ${index}`;
