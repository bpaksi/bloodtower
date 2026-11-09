import { type Issue, issue } from "../needs/issues.ts";

/** Rules `assets:pack` raises. `assets:needs` uses A1-1..A1-8 and `pack:lint` A1-9..A1-20. */
export const PACK_RULE = {
  /** An exported file is not a `.webp` or `.m4a` (a WAV, say). */
  fileType: "A1-21",
  /** The export index is unreadable, unsafe or does not match its files. */
  exportIndex: "A1-22",
  /** There is no asset job for the story; `assets:render` writes it. */
  noJob: "A1-23",
  /** The `asset-studio` export bin failed; the `AS-EXPORT-n` code is passed through. */
  exportBin: "A1-24",
} as const;

export const packIssue = (file: string, path: string, rule: string, message: string): Issue =>
  issue(file, path, rule, message);

/** Thrown when the pack run must stop. Carries every issue found. */
export class PackError extends Error {
  readonly issues: readonly Issue[];
  constructor(issues: readonly Issue[]) {
    super(`assets:pack stopped with ${issues.length} problem${issues.length === 1 ? "" : "s"}.`);
    this.name = "PackError";
    this.issues = issues;
  }
}
