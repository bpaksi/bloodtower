import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ShellEvent } from "../../engine/loops/session/events.ts";
import { stepShell } from "../../engine/loops/session/stepShell.ts";
import { projectShellView } from "../../engine/loops/session/view.ts";
import { project } from "../../engine/views/project.ts";
import { deserializeShellState, type SerializedShellState } from "./serialize.ts";

// CU/11 EV-02, EV-06: the Enable sound step leaves code, specs and tests. It is not hidden.
const REMOVED = [
  "sound-enable",
  "enable-sound",
  "ENABLE_SOUND_LINE",
  "turn on this iPad",
  "Enable sound",
  "volume-line-off",
  "volumeLineLive",
];

const appRoot = join(import.meta.dirname, "../../..");
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "out", "test-results"]);

const walk = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx|css|json|md|html)$/.test(name)) out.push(path);
  }
  return out;
};

describe("the removed Enable sound step (CU/11 EV-02, EV-06)", () => {
  it("no removed string survives in apps/bloodtower/src or spec.md", () => {
    const self = import.meta.filename;
    const files = [...walk(join(appRoot, "src")), join(appRoot, "spec.md")].filter(
      (file) => file !== self,
    );
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const word of REMOVED) {
        if (text.includes(word)) hits.push(`${file.slice(appRoot.length)}: ${word}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("spec.md says no iPad plays sound", () => {
    expect(readFileSync(join(appRoot, "spec.md"), "utf8")).toContain("No iPad plays sound");
  });
});

describe("an old autosave and an old sound-unlock event (CU/11 EV-12)", () => {
  it("the pre-C2/05 checkpoint restores with no unlock step; the old event is ignored with one debug line", () => {
    const fixture = JSON.parse(
      readFileSync(join(import.meta.dirname, "fixtures", "pre-c2-05-checkpoint.json"), "utf8"),
    ) as { state: SerializedShellState };
    const restored = deserializeShellState(fixture.state);
    expect(restored.sound).toEqual({});
    const old = { kind: "sound-unlock", v: 1, deviceId: "ipad-0" } as ShellEvent;
    const result = stepShell(restored, old);
    expect(result.logs).toHaveLength(1);
    expect(result.logs?.[0]?.level).toBe("debug");
    const view = projectShellView(result.state);
    expect(JSON.stringify(project(view, { kind: "device", deviceId: "ipad-0" }))).not.toMatch(
      /unlock|turn on/i,
    );
  });
});
