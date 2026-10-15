import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CUE_IDS,
  type CUE_SCREEN_EFFECTS,
  CUE_STATUSES,
  type CueId,
  cueIdSchema,
  HUNTER_IDS,
  type HunterId,
  INVESTIGATION_ACTIONS,
  INVESTIGATION_FINDINGS,
  type InvestigationAction,
  type MomentId,
  momentIdSchema,
  privateHunterOf,
  SCENE_ID,
} from "burgomaster-funeral-poc-protocols";
import { wavDurationMs } from "./wav.ts";

/** Spoken words. The script marks emphasis with single asterisks; the caption leaves those out. */
export const spokenWords = (text: string): string =>
  text
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

export interface CatalogLine {
  speaker: string;
  text: string;
  audioPath: string;
  durationMs: number;
}

export interface CatalogCue {
  cue: CueId;
  effect: (typeof CUE_SCREEN_EFFECTS)[number];
  /** Manifest path of the fallback audio. Null only when the cue sheet names none. */
  audioPath: string | null;
  assetId: string | null;
  capability: string;
  status: (typeof CUE_STATUSES)[number];
}

export interface CatalogMoment {
  id: MomentId;
  stillPath: string;
  lines: CatalogLine[];
  musicPath: string | null;
  cue: CatalogCue | null;
}

export interface CatalogCard {
  action: InvestigationAction;
  text: string;
  imagePath: string;
}

export interface CatalogFinding {
  momentId: MomentId;
  hunter: HunterId;
  action: InvestigationAction;
  text: string;
  stillPath: string;
  audioPath: string;
  durationMs: number;
}

export interface AssetRecord {
  id: string;
  path: string;
  type: string;
  target: string;
  /** Set on a line, and on a still whose id is the moment. */
  momentId?: string;
}

export interface Catalog {
  assetsRoot: string;
  moments: ReadonlyMap<MomentId, CatalogMoment>;
  cards: readonly CatalogCard[];
  findings: readonly CatalogFinding[];
  portraits: Readonly<Record<HunterId, string>>;
  byPath: ReadonlyMap<string, AssetRecord>;
}

interface ManifestEntry {
  id?: unknown;
  type?: unknown;
  target?: unknown;
  path?: unknown;
  text?: unknown;
  speaker?: unknown;
  moment?: unknown;
  used_by?: unknown;
  status?: unknown;
  capability?: unknown;
  poster?: unknown;
}

const SCREEN_EFFECT = {
  heartbeat: "pulse",
  "dim-all": "fade-near-black",
  "seal-sequence": "seal-flicker",
  "skull-drop": "skull-prompt",
} as const satisfies Record<CueId, (typeof CUE_SCREEN_EFFECTS)[number]>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readJson = (file: string): unknown => {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read ${file}: ${message}`);
  }
};

const asEntry = (value: unknown, id: string): ManifestEntry => {
  if (!isRecord(value)) throw new Error(`Manifest entry ${id} is not an object.`);
  return value;
};

const needString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is missing.`);
  }
  return value;
};

/** Script lines under each moment header, in the order the file gives them. */
export const parseScriptLines = (
  script: string,
): Map<string, { speaker: string; text: string }[]> => {
  const lines = new Map<string, { speaker: string; text: string }[]>();
  let current: string | undefined;
  const header = /^\*\*(n2-burgomasters-funeral\.[A-Za-z0-9.~_-]+)\*\*/;
  const spoken = /^>\s+\*\*(.+?):\*\*\s*(.+)\s*$/;
  for (const raw of script.split(/\r?\n/)) {
    const found = header.exec(raw);
    if (found?.[1]) {
      current = found[1];
      if (!lines.has(current)) lines.set(current, []);
      continue;
    }
    const quote = spoken.exec(raw);
    if (!quote?.[1] || !quote[2] || !current) continue;
    const bucket = lines.get(current);
    if (!bucket) continue;
    bucket.push({ speaker: quote[1].trim(), text: spokenWords(quote[2]) });
  }
  return lines;
};

const publishPath = (byPath: Map<string, AssetRecord>, path: string, record: AssetRecord) => {
  const existing = byPath.get(path);
  if (existing && (existing.target !== record.target || existing.type !== record.type)) {
    throw new Error(`Two manifest entries use ${path} for different audiences.`);
  }
  if (!existing) byPath.set(path, record);
};

const fileOk = (root: string, relativePath: string, label: string) => {
  if (relativePath.includes("..") || relativePath.startsWith("/")) {
    throw new Error(`${label} path escapes the asset folder: ${relativePath}`);
  }
  const absolute = join(root, relativePath);
  if (!existsSync(absolute)) throw new Error(`${label} file is missing: ${relativePath}`);
};

/**
 * Loads the script, the manifest, and the cue sheet from the asset folder in place.
 * Throws when an opening moment, a finding, or a cue the scene names cannot be resolved.
 */
export const loadCatalog = (assetsRoot: string): Catalog => {
  const manifestRaw = readJson(join(assetsRoot, "manifest.json"));
  if (!isRecord(manifestRaw)) throw new Error("manifest.json must be an object.");
  const script = readFileSync(join(assetsRoot, "script", `${SCENE_ID}.md`), "utf8");
  const scriptLines = parseScriptLines(script);
  const cueRaw = readJson(join(assetsRoot, "cues", "cue-sheet.json"));
  if (!isRecord(cueRaw) || !Array.isArray(cueRaw.cues)) {
    throw new Error("cue-sheet.json must have a cues array.");
  }

  const entries = new Map<string, ManifestEntry>();
  const byPath = new Map<string, AssetRecord>();
  for (const [id, value] of Object.entries(manifestRaw)) {
    const entry = asEntry(value, id);
    entries.set(id, entry);
    if (typeof entry.path !== "string" || entry.path === "") continue;
    const record: AssetRecord = {
      id,
      path: entry.path,
      type: typeof entry.type === "string" ? entry.type : "",
      target: typeof entry.target === "string" ? entry.target : "",
      ...(typeof entry.moment === "string"
        ? { momentId: entry.moment }
        : entry.type === "still" || entry.type === "clip"
          ? { momentId: id }
          : {}),
    };
    publishPath(byPath, entry.path, record);
    if (entry.type === "clip") {
      fileOk(assetsRoot, entry.path, `${id} clip`);
      const poster = typeof entry.poster === "string" ? entry.poster : "";
      if (poster !== "") {
        fileOk(assetsRoot, poster, `${id} poster`);
        publishPath(byPath, poster, {
          id,
          path: poster,
          type: "still",
          target: record.target,
          ...(record.momentId ? { momentId: record.momentId } : {}),
        });
      }
    }
  }

  const cuesByMoment = new Map<string, CatalogCue>();
  const seenCues = new Set<CueId>();
  for (const value of cueRaw.cues) {
    if (!isRecord(value)) throw new Error("A cue sheet entry is not an object.");
    const name = cueIdSchema.parse(value.name);
    const status = CUE_STATUSES.find((item) => item === value.status);
    if (!status) throw new Error(`Cue ${name} has no status the contract allows.`);
    const capability = needString(value.capability, `Cue ${name} capability`);
    let audioPath: string | null = null;
    let assetId: string | null = null;
    if (typeof value.fallback_sfx === "string" && value.fallback_sfx !== "") {
      assetId = value.fallback_sfx;
      const sfx = entries.get(assetId);
      audioPath = needString(sfx?.path, `Fallback audio for ${name}`);
      fileOk(assetsRoot, audioPath, `Fallback audio for ${name}`);
    }
    const cue: CatalogCue = {
      cue: name,
      effect: SCREEN_EFFECT[name],
      audioPath,
      assetId,
      capability,
      status,
    };
    seenCues.add(name);
    const moments = value.moments;
    if (!Array.isArray(moments)) throw new Error(`Cue ${name} has no moments array.`);
    for (const moment of moments) {
      if (typeof moment !== "string") continue;
      const parsed = momentIdSchema.safeParse(moment);
      if (!parsed.success) continue;
      cuesByMoment.set(parsed.data, cue);
    }
  }
  for (const id of CUE_IDS) {
    if (!seenCues.has(id)) throw new Error(`Cue sheet has no ${id} entry.`);
  }

  const musicFor = (momentId: string): string | null => {
    const matches: string[] = [];
    for (const entry of entries.values()) {
      if (entry.type !== "music" || typeof entry.used_by !== "string") continue;
      if (!momentId.endsWith(entry.used_by)) continue;
      matches.push(needString(entry.path, `Music for ${momentId}`));
    }
    if (matches.length > 1) throw new Error(`${momentId} has more than one music bed.`);
    const path = matches[0];
    if (!path) return null;
    fileOk(assetsRoot, path, `Music for ${momentId}`);
    return path;
  };

  const linesFor = (momentId: MomentId): CatalogLine[] => {
    const fromScript = scriptLines.get(momentId) ?? [];
    const fromManifest = [...entries.values()]
      .filter((entry) => entry.type === "line" && entry.moment === momentId)
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    if (fromScript.length === 0) throw new Error(`Script has no spoken line for ${momentId}.`);
    if (fromScript.length !== fromManifest.length) {
      throw new Error(
        `${momentId} has ${fromScript.length} script lines and ${fromManifest.length} manifest lines.`,
      );
    }
    return fromScript.map((line, index) => {
      const entry = fromManifest[index];
      if (!entry) throw new Error(`${momentId} is missing a manifest line.`);
      const manifestText = spokenWords(needString(entry.text, `${momentId} line text`));
      if (manifestText !== line.text) {
        throw new Error(`${momentId} line ${index + 1} does not match the script.`);
      }
      const audioPath = needString(entry.path, `${momentId} line audio`);
      fileOk(assetsRoot, audioPath, `${momentId} line audio`);
      const durationMs = wavDurationMs(join(assetsRoot, audioPath));
      if (durationMs <= 0) throw new Error(`${momentId} line audio has no duration.`);
      return { speaker: line.speaker, text: line.text, audioPath, durationMs };
    });
  };

  const stillFor = (momentId: string): string => {
    const entry = entries.get(momentId);
    // The current player draws an image. A clip's mp4 is the moving picture; its poster is the still.
    const poster = entry?.type === "clip" && typeof entry.poster === "string" ? entry.poster : "";
    const path = needString(poster !== "" ? poster : entry?.path, `${momentId} still`);
    fileOk(assetsRoot, path, `${momentId} still`);
    return path;
  };

  const moments = new Map<MomentId, CatalogMoment>();
  const remember = (id: MomentId) => {
    moments.set(id, {
      id,
      stillPath: stillFor(id),
      lines: linesFor(id),
      musicPath: musicFor(id),
      cue: cuesByMoment.get(id) ?? null,
    });
  };

  for (const suffix of ["01", "02", "03", "investigate"] as const) {
    remember(momentIdSchema.parse(`${SCENE_ID}.${suffix}`));
  }

  const cards: CatalogCard[] = INVESTIGATION_ACTIONS.map((action) => {
    const id = `${SCENE_ID}.investigate.${action}`;
    const entry = entries.get(id);
    if (entry?.type !== "card") throw new Error(`${id} is not a pick card in the manifest.`);
    const imagePath = needString(entry.path, `${id} card`);
    fileOk(assetsRoot, imagePath, `${id} card`);
    return { action, text: needString(entry.text, `${id} card text`), imagePath };
  });

  const findings: CatalogFinding[] = [];
  for (const action of INVESTIGATION_ACTIONS) {
    const finding = INVESTIGATION_FINDINGS[action];
    for (const hunter of HUNTER_IDS) {
      const momentId = momentIdSchema.parse(
        `${SCENE_ID}.investigate.${action}.${finding}.private.${hunter}`,
      );
      const lines = linesFor(momentId);
      const line = lines[0];
      if (!line || lines.length !== 1) throw new Error(`${momentId} should have one spoken line.`);
      findings.push({
        momentId,
        hunter,
        action,
        text: line.text,
        stillPath: stillFor(momentId),
        audioPath: line.audioPath,
        durationMs: line.durationMs,
      });
    }
  }

  const portraits = {} as Record<HunterId, string>;
  for (const hunter of HUNTER_IDS) {
    const id = `dracula.cast.${hunter}.portrait`;
    const entry = entries.get(id);
    if (entry?.type !== "portrait") throw new Error(`${id} is not a portrait in the manifest.`);
    const path = needString(entry.path, id);
    fileOk(assetsRoot, path, id);
    portraits[hunter] = path;
  }

  return { assetsRoot, moments, cards, findings, portraits, byPath };
};

export const requireMoment = (catalog: Catalog, id: MomentId): CatalogMoment => {
  const moment = catalog.moments.get(id);
  if (!moment) throw new Error(`No loaded moment for ${id}.`);
  return moment;
};

export const findingFor = (
  catalog: Catalog,
  hunter: HunterId,
  action: InvestigationAction,
): CatalogFinding => {
  const found = catalog.findings.find((item) => item.hunter === hunter && item.action === action);
  if (!found) throw new Error(`No finding for ${hunter} / ${action}.`);
  return found;
};

export type AssetActor =
  | { role: "dashboard" }
  | { role: "device"; held: readonly HunterId[]; delivered: readonly string[] };

/**
 * Who may fetch a manifest file. Portraits are the join screen (names and faces only).
 * A private still or line is served only after that finding was delivered to a device that holds the hunter.
 */
export const authorizeAsset = (
  record: AssetRecord | undefined,
  actor: AssetActor | undefined,
): { ok: true } | { ok: false; status: 403 | 404 } => {
  if (!record) return { ok: false, status: 404 };
  if (record.type === "portrait") return { ok: true };
  if (!actor) return { ok: false, status: 403 };
  if (record.target === "dashboard") {
    return actor.role === "dashboard" ? { ok: true } : { ok: false, status: 403 };
  }
  if (record.target === "ipad:all") {
    return actor.role === "device" ? { ok: true } : { ok: false, status: 403 };
  }
  const hunter = privateHunterOf(record.momentId ?? record.id) ?? privateHunterOf(record.target);
  const momentId = record.momentId ?? record.id;
  if (hunter && actor.role === "device") {
    if (!actor.held.includes(hunter)) return { ok: false, status: 403 };
    if (!actor.delivered.includes(momentId)) return { ok: false, status: 403 };
    return { ok: true };
  }
  return { ok: false, status: 403 };
};
