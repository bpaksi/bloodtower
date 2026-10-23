// Filtering the Sounds page's catalog (M3 step 3.3). Pure, so it is tested without React.
import type { Sound } from "@dark-tower/tower";

const fold = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * The sounds that match what the person typed and the category chosen, in catalog order. A query
 * that is a whole number matches that sound's index exactly, as well as any name containing the
 * digits ("8-bit"); otherwise it matches names and categories, ignoring case. An empty query, or
 * an undefined category, does not filter.
 */
export const filterSounds = (
  catalog: readonly Sound[],
  query: string,
  category: string | undefined,
): Sound[] => {
  const wanted = fold(query);
  const index = /^\d+$/.test(wanted) ? Number(wanted) : undefined;
  return catalog.filter((sound) => {
    if (category !== undefined && sound.category !== category) return false;
    if (wanted === "") return true;
    if (sound.index === index) return true;
    return fold(sound.name).includes(wanted) || fold(sound.category ?? "").includes(wanted);
  });
};

/** How a sound is named in the requested text: "12 Letha". */
export const describeSound = (sound: Pick<Sound, "index" | "name">) =>
  sound.name === `Sound ${sound.index}` ? sound.name : `${sound.index} ${sound.name}`;
