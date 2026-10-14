import fs from "node:fs";
import path from "node:path";
import type { Speaker } from "./gemini.ts";

export const OUT_DIR = path.join(process.cwd(), "output");
const HIST = path.join(OUT_DIR, "history.json");

export interface HistoryEntry {
  id: number;
  file: string;
  url: string;
  model: string;
  mode: "single" | "multi";
  style: string;
  voice?: string;
  speakers?: Speaker[];
  text: string;
  seconds: number;
  ms: number;
  at: string;
}

export function readHistory(): HistoryEntry[] {
  try {
    return JSON.parse(fs.readFileSync(HIST, "utf8")) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function addHistory(e: HistoryEntry): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(HIST, JSON.stringify([e, ...readHistory()], null, 2));
}

export function saveWav(name: string, wav: Buffer): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, name), wav);
}
