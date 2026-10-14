import type { HunterId, InvestigationAction, MomentId } from "burgomaster-funeral-poc-protocols";

export interface SpokenCaption {
  speaker: string;
  text: string;
  audioUrl: string;
  elapsedMs: number;
}

export interface DashboardView {
  role: "dashboard";
  revision: number;
  stage: "join" | "scene";
  join: { code: string; url: string };
  gate: { canBegin: boolean; unheld: HunterId[] };
  roster: {
    hunter: HunterId;
    name: string;
    portraitUrl: string;
    held: boolean;
    corruption: null;
  }[];
  playback: null | {
    momentId: MomentId;
    stillUrl: string;
    caption: SpokenCaption | null;
    speaking: boolean;
    lineKey: string | null;
    musicUrl: string | null;
    cue: null | { effect: "pulse"; audioUrl: string; key: string };
  };
  ambient: { live: boolean; suppressed: boolean; reason: string | null; accent: boolean };
  choosing: boolean;
  paused: boolean;
  primeAudioUrl: string | null;
  skulls: "unavailable";
}

export interface DeviceView {
  role: "device";
  revision: number;
  held: { hunter: HunterId; name: string; portraitUrl: string; corruption: null }[];
  choosing: boolean;
  cards: { action: InvestigationAction; text: string; imageUrl: string; taken: boolean }[];
  findings: {
    hunter: HunterId;
    name: string;
    momentId: MomentId;
    text: string;
    stillUrl: string;
    audioUrl: string;
  }[];
  paused: boolean;
}

export interface PublicHunter {
  hunter: HunterId;
  name: string;
  portraitUrl: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isDashboardView = (value: unknown): value is DashboardView => {
  if (!isRecord(value) || value.role !== "dashboard" || typeof value.revision !== "number") {
    return false;
  }
  const join = value.join;
  return isRecord(join) && typeof join.url === "string" && typeof join.code === "string";
};

export const isDeviceView = (value: unknown): value is DeviceView =>
  isRecord(value) && value.role === "device" && typeof value.revision === "number";

export const isHunterList = (value: unknown): value is PublicHunter[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      isRecord(item) &&
      typeof item.hunter === "string" &&
      typeof item.name === "string" &&
      typeof item.portraitUrl === "string",
  );
