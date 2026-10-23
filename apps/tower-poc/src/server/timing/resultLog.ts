import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { savedTimingResultSchema, timingResultSchema } from "@dark-tower/tower";

/** `timing-2026-10-15T12-00-00-000Z.json`, with `:` and `.` turned into `-`. */
export const timingResultFilename = (at: Date, suffix = "") => {
  const stamp = at.toISOString().replace(/[:.]/g, "-");
  const extra = suffix === "" ? "" : `-${suffix}`;
  return `timing-${stamp}${extra}.json`;
};

const SAFE_NAME = /^timing-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z(?:-\d+)?\.json$/;

export type SaveTimingResult =
  | { ok: true; file: string }
  | { ok: false; status: number; message: string };

/**
 * Validates a timing result and writes it under `dir`. The name comes from `at`, never from
 * the body, so a client cannot choose the path. `notes` is kept as sent, including empty.
 */
export const saveTimingResult = async (
  dir: string,
  body: unknown,
  at = new Date(),
): Promise<SaveTimingResult> => {
  const parsed = timingResultSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, status: 400, message: "The timing result is not valid." };
  }
  const saved = savedTimingResultSchema.parse({
    ...parsed.data,
    savedAt: at.toISOString(),
  });
  const folder = resolve(dir);
  await mkdir(folder, { recursive: true });
  const text = `${JSON.stringify(saved, null, 2)}\n`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const name = timingResultFilename(at, attempt === 0 ? "" : String(attempt + 1));
    if (!SAFE_NAME.test(name)) {
      return { ok: false, status: 500, message: "Could not name the timing result." };
    }
    const path = join(folder, name);
    if (path !== folder && !path.startsWith(`${folder}${sep}`)) {
      return { ok: false, status: 500, message: "Could not name the timing result." };
    }
    try {
      await writeFile(path, text, { flag: "wx" });
      return { ok: true, file: name };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EEXIST") continue;
      return { ok: false, status: 500, message: "The timing result was not saved." };
    }
  }
  return { ok: false, status: 500, message: "The timing result was not saved." };
};
