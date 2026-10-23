import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const eventsDir = fileURLToPath(new URL(".", import.meta.url));

const sourceFiles = () =>
  readdirSync(eventsDir)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => join(eventsDir, name));

describe("append-only event store", () => {
  it("never issues UPDATE or DELETE against events or checkpoints", () => {
    const banned =
      /\b(update|delete)\s*\(\s*(events|checkpoints)\b|\bUPDATE\s+(events|checkpoints)\b|\bDELETE\s+FROM\s+(events|checkpoints)\b/i;
    for (const file of sourceFiles()) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(banned);
    }
  });
});
