import { type Issue, issue, RULE } from "./issues.ts";
import { isRecord, type PackFiles } from "./source.ts";

export const CAST_FILE = "cast.yaml";
export const SCRIPT_FILE = "script.yaml";

export interface CastEntry {
  id: string;
  name: string;
  voice?: { provider: string; voiceId: string; style?: string };
}

export interface ScriptLine {
  /** Moment id in `script.yaml`. */
  moment: string;
  /** The moment is private to one iPad (`target: ipad:<hunter>`). */
  target?: string;
  id: string;
  speaker: string;
  text: string;
  /** Where the line is, for messages: `[3].lines[1]`. */
  path: string;
}

const text = (value: unknown): value is string => typeof value === "string" && value.length > 0;

/** `cast.yaml`: a list of `{id, name, voice?: {provider, name, style?}}`. Other keys are ignored. */
export const readCast = (files: PackFiles): CastEntry[] => {
  const raw = files.data(CAST_FILE);
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    files.issues.push(issue(CAST_FILE, "(file)", RULE.shape, "cast.yaml is a list of cast."));
    return [];
  }
  const out: CastEntry[] = [];
  const seen = new Set<string>();
  raw.forEach((row: unknown, index) => {
    const at = `[${index}]`;
    if (!isRecord(row) || !text(row.id) || !text(row.name)) {
      files.issues.push(issue(CAST_FILE, at, RULE.shape, "A cast entry needs a text id and name."));
      return;
    }
    if (seen.has(row.id)) {
      files.issues.push(
        issue(CAST_FILE, `${at}.id`, RULE.shape, `Cast id ${row.id} is listed twice.`),
      );
      return;
    }
    seen.add(row.id);
    const entry: CastEntry = { id: row.id, name: row.name };
    if (row.voice !== undefined) {
      const v = row.voice;
      if (!isRecord(v) || !text(v.provider) || !text(v.name)) {
        files.issues.push(
          issue(CAST_FILE, `${at}.voice`, RULE.shape, "A voice needs a provider and a name."),
        );
        return;
      }
      entry.voice = {
        provider: v.provider,
        voiceId: v.name,
        ...(text(v.style) ? { style: v.style } : {}),
      };
    }
    out.push(entry);
  });
  return out;
};

/** `script.yaml`: a list of moments, each `{id, target?, lines: [{id, speaker, text}]}`. */
export const readScript = (files: PackFiles): ScriptLine[] => {
  const raw = files.data(SCRIPT_FILE);
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    files.issues.push(
      issue(SCRIPT_FILE, "(file)", RULE.shape, "script.yaml is a list of moments."),
    );
    return [];
  }
  const out: ScriptLine[] = [];
  const bad = (path: string, message: string): Issue =>
    issue(SCRIPT_FILE, path, RULE.shape, message);
  const lineIds = new Set<string>();
  raw.forEach((moment: unknown, m) => {
    if (!isRecord(moment) || !text(moment.id) || !Array.isArray(moment.lines)) {
      files.issues.push(bad(`[${m}]`, "A moment needs a text id and a list of lines."));
      return;
    }
    if (moment.target !== undefined && !text(moment.target)) {
      files.issues.push(bad(`[${m}].target`, "A moment target is text."));
      return;
    }
    moment.lines.forEach((line: unknown, l) => {
      const path = `[${m}].lines[${l}]`;
      if (!isRecord(line) || !text(line.id) || !text(line.speaker) || !text(line.text)) {
        files.issues.push(bad(path, "A line needs a text id, speaker and text."));
        return;
      }
      if (lineIds.has(line.id)) {
        files.issues.push(bad(`${path}.id`, `Line id ${line.id} is used twice.`));
        return;
      }
      lineIds.add(line.id);
      out.push({
        moment: moment.id as string,
        ...(typeof moment.target === "string" ? { target: moment.target } : {}),
        id: line.id,
        speaker: line.speaker,
        text: line.text,
        path,
      });
    });
  });
  return out;
};
