import { realSpawn, type SpawnFn } from "../render/spawn.ts";

export interface SequenceIo {
  env: Readonly<Record<string, string | undefined>>;
  cwd: string;
  out: (text: string) => void;
  err: (text: string) => void;
  /** Defaults to a real child process. */
  spawn?: SpawnFn;
}

export interface SequenceOptions {
  story: string;
  /** Studio mode (false) or AI image mode (true), asked once and passed to render only. */
  ai: boolean;
  /** Only when the person asked for drafts in the pack. */
  drafts?: boolean;
  workFolder?: string;
  packsDir?: string;
}

export interface SequenceResult {
  exitCode: number;
  /** The commands that ran, in order, each as `assets:<name>`. */
  ran: string[];
  /** The command that failed, with its first error code, when one did. */
  failed?: { command: string; exit: number; code: string | undefined };
}

const CODE = /\b(AS-[A-Z]+-\d+|A1-\d+)\b/;

/** The first error code in the output of a failed command (`AS-RENDER-1`, `A1-23`, ...). */
export const firstCode = (stdout: string, stderr: string): string | undefined =>
  CODE.exec(stderr)?.[1] ?? CODE.exec(stdout)?.[1];

/**
 * The `bt-assets` order: `assets:needs`, `assets:render`, `assets:pack` for one story. Stops at the
 * first non-zero exit and shows its code; the later commands do not run. Nothing here approves an
 * asset, picks a provider or falls back to another one: `--ai` is passed only when asked for.
 */
export const runSequence = async (
  options: SequenceOptions,
  io: SequenceIo,
): Promise<SequenceResult> => {
  const shared = [
    ...(options.workFolder === undefined ? [] : ["--work-folder", options.workFolder]),
    ...(options.packsDir === undefined ? [] : ["--packs-dir", options.packsDir]),
  ];
  const steps: { command: string; args: string[] }[] = [
    { command: "assets:needs", args: [options.story, ...shared] },
    { command: "assets:render", args: [options.story, ...(options.ai ? ["--ai"] : []), ...shared] },
    {
      command: "assets:pack",
      args: [options.story, ...(options.drafts === true ? ["--drafts"] : []), ...shared],
    },
  ];
  const ran: string[] = [];
  for (const step of steps) {
    ran.push(step.command);
    let result: Awaited<ReturnType<SpawnFn>>;
    try {
      result = await (io.spawn ?? realSpawn)("pnpm", [step.command, ...step.args], {
        env: io.env,
        cwd: io.cwd,
        onStdout: io.out,
        onStderr: io.err,
      });
    } catch (error) {
      io.err(
        `${step.command}: could not start: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      return { exitCode: 1, ran, failed: { command: step.command, exit: 1, code: undefined } };
    }
    if (result.code !== 0) {
      const code = firstCode(result.stdout, result.stderr);
      io.err(
        `stopped: ${step.command} exited ${result.code}${code === undefined ? "" : ` (${code})`}; the later commands did not run.\n`,
      );
      return {
        exitCode: result.code,
        ran,
        failed: { command: step.command, exit: result.code, code },
      };
    }
  }
  return { exitCode: 0, ran };
};
