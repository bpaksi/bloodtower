import { createHash } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { extname, isAbsolute, join, relative, sep } from "node:path";
import { parse as parseYaml } from "yaml";
import { type Issue, issue, RULE } from "./issues.ts";

const MAX_BYTES = 50_000_000;

const isInside = (root: string, file: string) => file === root || file.startsWith(`${root}${sep}`);

/**
 * Reads files of one pack folder, keeps the bytes of every file it read (for the source hash)
 * and collects issues instead of throwing. Nothing leaves the pack folder.
 */
export class PackFiles {
  readonly root: string;
  readonly issues: Issue[] = [];
  private readonly read = new Map<string, Buffer>();

  constructor(root: string) {
    let real = root;
    try {
      real = realpathSync(root);
    } catch (error) {
      this.issues.push(issue(root, "(file)", RULE.file, errorText(error)));
    }
    this.root = real;
  }

  /**
   * Whether an optional file is there. Only ENOENT means absent; a dangling symlink or a
   * permission error counts as present, so the read that follows reports it (decision 0003).
   */
  has(rel: string): boolean {
    try {
      lstatSync(join(this.root, rel));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      this.issues.push(issue(rel, "(file)", RULE.file, errorText(error)));
      return false;
    }
  }

  /** The bytes of one file, or undefined with an issue. The path must stay inside the pack. */
  bytes(rel: string, path = "(file)", file = rel): Buffer | undefined {
    if (isAbsolute(rel) || rel.split(/[\\/]/).includes("..")) {
      this.issues.push(issue(file, path, RULE.file, "A pack path stays inside the pack folder."));
      return undefined;
    }
    let real: string;
    try {
      real = realpathSync(join(this.root, rel));
    } catch (error) {
      this.issues.push(issue(file, path, RULE.file, errorText(error)));
      return undefined;
    }
    if (!isInside(this.root, real)) {
      this.issues.push(issue(file, path, RULE.file, "A pack path stays inside the pack folder."));
      return undefined;
    }
    try {
      const data = readFileSync(real);
      if (data.length > MAX_BYTES) {
        this.issues.push(issue(file, path, RULE.file, "The file is over the size limit."));
        return undefined;
      }
      this.read.set(relative(this.root, real).split(sep).join("/"), data);
      return data;
    } catch (error) {
      this.issues.push(issue(file, path, RULE.file, errorText(error)));
      return undefined;
    }
  }

  /** Absolute path of a file already read (a job source), or undefined. */
  absolute(rel: string): string | undefined {
    try {
      return realpathSync(join(this.root, rel));
    } catch (error) {
      this.issues.push(issue(rel, "(file)", RULE.file, errorText(error)));
      return undefined;
    }
  }

  /** A YAML or JSON file as data. Missing, unreadable, empty or malformed files add an issue. */
  data(rel: string): unknown {
    const raw = this.bytes(rel);
    if (raw === undefined) return undefined;
    try {
      const value: unknown = rel.endsWith(".json")
        ? JSON.parse(raw.toString("utf8"))
        : parseYaml(raw.toString("utf8"));
      if (value === null || value === undefined) {
        this.issues.push(issue(rel, "(file)", RULE.file, "The file is empty."));
        return undefined;
      }
      return value;
    } catch (error) {
      this.issues.push(issue(rel, "(file)", RULE.file, errorText(error)));
      return undefined;
    }
  }

  /** Names of the `.json` files in a folder of the pack, sorted. Absent folder: none. */
  jsonNames(folder: string): string[] {
    const dir = join(this.root, folder);
    if (!existsSync(dir)) return [];
    try {
      return readdirSync(dir)
        .filter((name) => extname(name).toLowerCase() === ".json")
        .sort();
    } catch (error) {
      this.issues.push(issue(folder, "(file)", RULE.file, errorText(error)));
      return [];
    }
  }

  /** `sha256:<hex>` over each file read, sorted by relative path: path, length, bytes. */
  sourceHash(): string {
    const hash = createHash("sha256");
    for (const rel of [...this.read.keys()].sort()) {
      const data = this.read.get(rel) as Buffer;
      hash.update(`${rel}\0${data.length}\0`);
      hash.update(data);
    }
    return `sha256:${hash.digest("hex")}`;
  }
}

export const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
