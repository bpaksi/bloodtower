import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Where the generated document lives, relative to this folder: `apps/tower-poc/docs/capabilities.md`. */
export const docPath = fileURLToPath(new URL("../../docs/capabilities.md", import.meta.url));

/** The exact `ultimatedarktowerdata` version this package depends on. */
export const dataVersion = (): string => {
  const manifest = JSON.parse(
    readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf8"),
  ) as { dependencies: Record<string, string> };
  const version = manifest.dependencies.ultimatedarktowerdata;
  if (version === undefined) throw new Error("ultimatedarktowerdata is not a dependency");
  return version;
};
