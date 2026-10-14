// The installed versions of the tower library and its data, for `welcome`. Read from the packages'
// own manifests, so they say what is running rather than what package.json asked for.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

/** The `version` in the manifest of the package `name` resolves to, found by walking up from its entry file. */
export const installedVersion = (name: string): string => {
  let dir = dirname(require.resolve(name));
  for (;;) {
    try {
      const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      if (manifest.name === name && typeof manifest.version === "string") return manifest.version;
    } catch {
      // No manifest here; keep walking.
    }
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`Cannot find the installed version of ${name}.`);
    dir = parent;
  }
};
