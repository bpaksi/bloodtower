// The sound feel record (M6, spec D25): how each tower sound came across when Bob played it, saved
// as he goes so a review can span several sittings. Nothing here reaches the tower or the library.
import {
  SOUND_FEEL_FIELDS,
  type SoundFeelRecordPayload,
  type SoundFeelRow,
} from "tower-poc-protocols";

export interface SoundFeelStorage {
  /** Saves a row, replacing the one for the same sound. */
  put: (row: SoundFeelRow) => void;
  /** Every saved row, by index, and how many could not be read. */
  all: () => { rows: SoundFeelRow[]; unusable: number };
}

export interface SoundFeel {
  /** Every saved row, by index. */
  rows: () => SoundFeelRow[];
  /** Applies a record to the sound's row and saves it. Throws only when the database does. */
  record: (payload: SoundFeelRecordPayload, client: string) => SoundFeelRow;
}

export interface SoundFeelOptions {
  storage: SoundFeelStorage;
  now?: () => number;
}

const empty = (index: number): Omit<SoundFeelRow, "updatedAt" | "client"> => ({
  index,
  mood: null,
  readsAs: null,
  strength: null,
  lengthMs: null,
  answerLengthMs: null,
  note: null,
});

export const createSoundFeel = ({ storage, now = Date.now }: SoundFeelOptions): SoundFeel => {
  const saved = new Map<number, SoundFeelRow>();
  const { rows, unusable } = storage.all();
  if (unusable > 0) {
    console.warn(`${unusable} saved sound feel row(s) could not be read and are not shown.`);
  }
  for (const row of rows) saved.set(row.index, row);

  return {
    rows: () => [...saved.values()].sort((a, b) => a.index - b.index),
    record: (payload, client) => {
      const row: SoundFeelRow = {
        ...(saved.get(payload.index) ?? empty(payload.index)),
        updatedAt: now(),
        client,
      };
      // A field left out keeps its value; null clears it.
      for (const field of SOUND_FEEL_FIELDS) {
        const value = payload[field];
        if (value !== undefined) Object.assign(row, { [field]: value });
      }
      // A note of only spaces is no note.
      if (row.note !== null) row.note = row.note.trim() || null;
      storage.put(row);
      saved.set(row.index, row);
      return row;
    },
  };
};
