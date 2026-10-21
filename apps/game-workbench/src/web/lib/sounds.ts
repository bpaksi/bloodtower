/** The /sounds list: one row per `SND-` card, grouped by category, with its feel. No Node imports. */
import { type Feel, feelOf, MOODS, type Mood, READS_AS, type ReadsAs } from "./feel.ts";
import type { Card } from "./graph-types.ts";

/** The area every "Tower sounds: <category>" area is part of. */
export const SOUNDS_AREA = "AREA-021";

export type SoundRow = { id: string; index: number; name: string; feel: Feel | null };
export type SoundGroup = { area: string | null; category: string; rows: SoundRow[] };
export type SoundFilter = { mood?: Mood; readsAs?: ReadsAs };

const partOf = (c: Card) => c.links.filter((l) => l.rel === "part-of").map((l) => l.to);

/** Groups the sound cards by their category area, in area order, each by tower index. */
export function soundGroups(cards: Card[]): SoundGroup[] {
  const categories = new Map<string, string>();
  for (const c of cards) {
    if (c.type === "area" && partOf(c).includes(SOUNDS_AREA)) {
      categories.set(c.id, c.title.replace(/^Tower sounds:\s*/, ""));
    }
  }
  const groups = new Map<string | null, SoundGroup>();
  for (const area of [...categories.keys()].sort()) {
    groups.set(area, { area, category: categories.get(area) ?? area, rows: [] });
  }
  for (const c of cards) {
    if (c.type !== "sound") continue;
    const area = partOf(c).find((a) => categories.has(a)) ?? null;
    if (!groups.has(area)) groups.set(area, { area, category: "Other", rows: [] });
    groups.get(area)?.rows.push({
      id: c.id,
      index: Number(c.id.slice(4)),
      name: c.title.replace(/\s*\(sound \d+\)$/, ""),
      feel: feelOf(c),
    });
  }
  for (const g of groups.values()) g.rows.sort((a, b) => a.index - b.index);
  return [...groups.values()].filter((g) => g.rows.length > 0);
}

/** Reads the filter from the page's query; a word that is not a mood or reads-as is ignored. */
export function parseSoundFilter(q: { mood?: string; reads?: string }): SoundFilter {
  return {
    ...((MOODS as readonly string[]).includes(q.mood ?? "") ? { mood: q.mood as Mood } : {}),
    ...((READS_AS as readonly string[]).includes(q.reads ?? "")
      ? { readsAs: q.reads as ReadsAs }
      : {}),
  };
}

/** Keeps the rows whose feel matches every part of the filter; a row with no feel matches none. */
export function filterSounds(groups: SoundGroup[], f: SoundFilter): SoundGroup[] {
  if (!f.mood && !f.readsAs) return groups;
  const keep = (r: SoundRow) =>
    (!f.mood || r.feel?.mood === f.mood) && (!f.readsAs || r.feel?.readsAs === f.readsAs);
  return groups.map((g) => ({ ...g, rows: g.rows.filter(keep) })).filter((g) => g.rows.length > 0);
}

/** "2.3 s" for a measured length; null when it was not measured. */
export function formatLength(ms: number | undefined): string | null {
  return ms === undefined ? null : `${(ms / 1000).toFixed(1)} s`;
}
