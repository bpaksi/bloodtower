import { readdirSync, statSync } from "node:fs";
import path from "node:path";

/** A string that changes when a file under the folders is added, removed or edited. */
export function dirStamp(dirs: string[]): string {
  const parts: string[] = [];
  const walk = (dir: string) => {
    let names: string[];
    try {
      names = readdirSync(dir).sort();
    } catch {
      parts.push(`${dir}:missing`);
      return;
    }
    for (const name of names) {
      if (name.startsWith(".") || name === "node_modules") continue;
      const file = path.join(dir, name);
      const st = statSync(file, { throwIfNoEntry: false });
      if (!st) continue;
      if (st.isDirectory()) walk(file);
      else parts.push(`${file}:${st.mtimeMs}:${st.size}`);
    }
  };
  for (const d of dirs) walk(d);
  return parts.join("\n");
}
