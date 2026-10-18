import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// R3-UI-51: devices play no audio. Only the board pages may reach the audio module.
const WEB_ROOT = join(import.meta.dirname, "../..");

const sourcesUnder = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "out" ? [] : sourcesUnder(path);
    return name.endsWith(".tsx") || name.endsWith(".ts") ? [path] : [];
  });

const deviceSources = [
  ...sourcesUnder(join(WEB_ROOT, "app/device")),
  ...sourcesUnder(join(WEB_ROOT, "app/join")),
  ...sourcesUnder(join(WEB_ROOT, "components/device")),
];

describe("devices play no audio", () => {
  it("finds the device sources to check", () => {
    expect(deviceSources.length).toBeGreaterThan(0);
  });

  it("never imports the audio module or creates an audio element or context", () => {
    for (const file of deviceSources) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/lib\/audio|AudioContext|<audio\b|new Audio\(/);
      expect(text, file).not.toMatch(/components\/board/);
    }
  });
});
