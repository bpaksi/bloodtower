/** One thing wrong with a pack, in the format `pack:lint` prints: file, path, rule. */
export interface Issue {
  rule: string;
  file: string;
  path: string;
  message: string;
}

/** Rules `assets:needs` raises. Schema failures keep the pack schema's own `P2-n` rule. */
export const RULE = {
  /** A pack file or folder cannot be read, is outside the pack, or is empty. */
  file: "A1-1",
  /** A pack file does not match its shape. */
  shape: "A1-2",
  /** An id is not a valid asset-studio id. */
  id: "A1-3",
  /** Story art may only target the Story board (D1). */
  target: "A1-4",
  /** A line names a speaker the cast does not have. */
  speaker: "A1-5",
  /** A camera sidecar is wrong. */
  camera: "A1-6",
  /** A picture or sound has no source file. */
  source: "A1-7",
  /** The finished job fails asset-studio's own rules. */
  job: "A1-8",
} as const;

export const issue = (file: string, path: string, rule: string, message: string): Issue => ({
  rule,
  file,
  path,
  message: message.startsWith(`${rule}:`) ? message : `${rule}: ${message}`,
});

export const formatIssues = (issues: readonly Issue[]): string[] =>
  issues.map((i) => `file=${i.file} path=${i.path} rule=${i.rule} message=${i.message}`);

/** Thrown when the pack cannot become a job. Carries every issue found. */
export class NeedsError extends Error {
  readonly issues: readonly Issue[];
  constructor(issues: readonly Issue[]) {
    super(`The pack has ${issues.length} problem${issues.length === 1 ? "" : "s"}.`);
    this.name = "NeedsError";
    this.issues = issues;
  }
}
